import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Storage bucket names
const BUCKET_NAMES = {
  CHAT_FILES: 'chat-files',
  USER_AVATARS: 'user-avatars',  // For future use
};

// MIME types for different file categories
const MIME_TYPES = {
  IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENTS: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ],
  AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac'],
  VIDEO: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
};

// File size limits in bytes (10MB for images, 20MB for other files)
const FILE_SIZE_LIMITS = {
  IMAGE: 10 * 1024 * 1024, // 10MB
  DEFAULT: 20 * 1024 * 1024, // 20MB
};

async function setupStorage() {
  try {
    console.log('🚀 Setting up Supabase Storage...');

    // Create buckets if they don't exist
    for (const [bucketName, bucketId] of Object.entries(BUCKET_NAMES)) {
      console.log(`\n🔧 Setting up bucket: ${bucketName} (${bucketId})`);
      
      const { data: bucket, error: bucketError } = await supabase.storage
        .createBucket(bucketId, {
          public: true,
          allowedMimeTypes: [
            ...MIME_TYPES.IMAGES,
            ...MIME_TYPES.DOCUMENTS,
            ...MIME_TYPES.AUDIO,
            ...MIME_TYPES.VIDEO,
          ],
          fileSizeLimit: FILE_SIZE_LIMITS.DEFAULT,
        });

      if (bucketError && bucketError.message !== 'Bucket already exists') {
        throw new Error(`Error creating bucket ${bucketId}: ${bucketError.message}`);
      }

      if (bucket) {
        console.log(`✅ Created bucket: ${bucketId}`);
      } else {
        console.log(`ℹ️ Bucket already exists: ${bucketId}`);
      }

      // Set bucket policies
      await setBucketPolicies(bucketId);
    }

    console.log('\n🎉 Storage setup completed successfully!');
  } catch (error) {
    console.error('❌ Error setting up storage:', error);
    process.exit(1);
  }
}

async function setBucketPolicies(bucketId: string) {
  // Define the policy SQL template
  const policies = [
    {
      name: 'Allow public read access',
      policy: `
        CREATE POLICY "Public Access" ON storage.objects FOR SELECT 
        USING (bucket_id = '${bucketId}');
      `,
    },
    {
      name: 'Allow authenticated uploads',
      policy: `
        CREATE POLICY "Authenticated uploads" ON storage.objects FOR INSERT 
        TO authenticated 
        WITH CHECK (
          bucket_id = '${bucketId}' AND 
          (auth.role() = 'authenticated')
        );
      `,
    },
    {
      name: 'Allow users to update their own files',
      policy: `
        CREATE POLICY "Users can update their own files" ON storage.objects FOR UPDATE 
        TO authenticated 
        USING (auth.uid() = owner) 
        WITH CHECK (auth.uid() = owner);
      `,
    },
    {
      name: 'Allow users to delete their own files',
      policy: `
        CREATE POLICY "Users can delete their own files" ON storage.objects FOR DELETE 
        TO authenticated 
        USING (auth.uid() = owner);
      `,
    },
  ];

  // Enable RLS on the storage.objects table
  const { error: rlsError } = await supabase.rpc('enable_rls_on_storage_objects');
  if (rlsError && !rlsError.message.includes('already enabled')) {
    console.error(`Error enabling RLS on storage.objects: ${rlsError.message}`);
  }

  // Apply each policy
  for (const { name, policy } of policies) {
    try {
      const { error } = await supabase.rpc('pg_temp.execute_sql', {
        sql: policy,
      });

      if (error) {
        if (error.message.includes('already exists')) {
          console.log(`ℹ️ Policy already exists: ${name}`);
        } else {
          throw new Error(`Error applying policy "${name}": ${error.message}`);
        }
      } else {
        console.log(`✅ Applied policy: ${name}`);
      }
    } catch (error) {
      console.error(`❌ Error applying policy "${name}":`, error);
    }
  }
}

// Run the setup
setupStorage();
