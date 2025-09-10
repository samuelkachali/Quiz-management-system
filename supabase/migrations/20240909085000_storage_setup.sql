-- Enable RLS on storage.objects if not already enabled
create or replace function enable_rls_on_storage_objects()
returns void as $$
begin
  if not exists (
    select 1 
    from pg_policies 
    where tablename = 'objects' 
    and schemaname = 'storage'
  ) then
    alter table storage.objects enable row level security;
  end if;
end;
$$ language plpgsql security definer;

-- Function to check if a user has access to a file
create or replace function storage.can_access_file(bucket_id text, object_path text, user_id uuid)
returns boolean as $$
begin
  -- Allow public access to all files in public buckets
  if exists (
    select 1 
    from storage.buckets 
    where id = bucket_id 
    and public = true
  ) then
    return true;
  end if;
  
  -- Allow access if user is the owner of the file
  if exists (
    select 1 
    from storage.objects 
    where name = object_path 
    and bucket_id = $1 
    and owner = user_id
  ) then
    return true;
  end if;
  
  -- Add additional access rules here as needed
  
  -- Default deny
  return false;
end;
$$ language plpgsql security definer;

-- Function to get a signed URL for a file
create or replace function storage.get_signed_url(bucket_id text, object_path text, expires_in_seconds int default 3600)
returns text as $$
declare
  signed_url text;
  file_owner uuid;
  file_bucket text;
  is_public boolean;
begin
  -- Get file metadata
  select 
    o.owner, 
    o.bucket_id,
    b.public as is_public
  into file_owner, file_bucket, is_public
  from storage.objects o
  left join storage.buckets b on o.bucket_id = b.id
  where o.name = object_path 
  and o.bucket_id = $1;
  
  -- Check if file exists
  if file_owner is null then
    raise exception 'File not found';
  end if;
  
  -- Check access
  if not is_public and (auth.uid() is null or auth.uid() != file_owner) then
    raise exception 'Not authorized to access this file';
  end if;
  
  -- Generate signed URL
  select 
    storage.get_presigned_url(
      bucket_id, 
      object_path, 
      (now() + (expires_in_seconds || ' seconds')::interval)::timestamptz
    ) into signed_url;
    
  return signed_url;
exception when others then
  raise exception 'Error generating signed URL: %', sqlerrm;
end;
$$ language plpgsql security definer;

-- Function to clean up orphaned files
create or replace function storage.cleanup_orphaned_files()
returns trigger as $$
begin
  -- Delete files that are no longer referenced in the database
  delete from storage.objects
  where id in (
    select o.id
    from storage.objects o
    left join chat_messages cm on cm.attachments @> jsonb_build_array(o.id::text)
    left join user_profiles up on up.avatar_url = o.id::text
    where 
      o.created_at < (now() - interval '24 hours') and
      cm.id is null and
      up.id is null
  );
  
  return null;
end;
$$ language plpgsql;

-- Schedule the cleanup function to run daily
create or replace function schedule_orphaned_files_cleanup()
returns void as $$
begin
  perform pg_catalog.pg_extension_oid('pg_cron');
  perform cron.schedule(
    'cleanup-orphaned-files',
    '0 3 * * *', -- Every day at 3 AM
    'select storage.cleanup_orphaned_files()'
  );
exception when others then
  -- pg_cron extension not available
  raise notice 'pg_cron extension not available, skipping schedule setup';
end;
$$ language plpgsql;

-- Create a trigger to automatically set the owner when a file is uploaded
create or replace function storage.set_owner()
returns trigger as $$
begin
  new.owner = auth.uid();
  return new;
end;
$$ language plpgsql security definer;

-- Create the trigger
create or replace trigger set_owner_trigger
before insert on storage.objects
for each row
execute function storage.set_owner();

-- Create a function to check if a user can upload to a bucket
create or replace function storage.can_upload_to_bucket(bucket_id text)
returns boolean as $$
begin
  -- Allow uploads to public buckets
  if exists (
    select 1 
    from storage.buckets 
    where id = bucket_id 
    and public = true
  ) then
    return true;
  end if;
  
  -- Add additional access rules here as needed
  
  -- Default deny
  return false;
end;
$$ language plpgsql security definer;
