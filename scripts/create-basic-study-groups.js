const { createClient } = require('@supabase/supabase-js');

// Use service role key for admin operations
const supabaseUrl = 'https://qbxusidgwovqqnghmvox.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFieHVzaWRnd292cXFuZ2htdm94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjgzNzc4NywiZXhwIjoyMDcyNDEzNzg3fQ.7FZ1U66vfHGLrSOT6EpMim6k0o3Yw6PRpbxwJB8xTxU';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createBasicStudyGroupsTables() {
  try {
    console.log('🔧 Creating basic study groups tables...');

    // First, let's check if the tables already exist by trying to query them
    console.log('Checking if study_groups table exists...');
    const { data: existingGroups, error: checkError } = await supabase
      .from('study_groups')
      .select('id')
      .limit(1);

    if (checkError && checkError.message.includes('does not exist')) {
      console.log('❌ study_groups table does not exist');
      console.log('📋 Please create the tables manually by running this SQL in Supabase SQL Editor:');

      const sql = `
-- Create study_groups table
CREATE TABLE IF NOT EXISTS public.study_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  max_members INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_study_groups table
CREATE TABLE IF NOT EXISTS public.user_study_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, group_id)
);

-- Enable RLS
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_study_groups ENABLE ROW LEVEL SECURITY;

-- Create basic policies
CREATE POLICY "Anyone can view active study groups" ON public.study_groups
  FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can create study groups" ON public.study_groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view their group memberships" ON public.user_study_groups
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can join groups" ON public.user_study_groups
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role policies
CREATE POLICY "Service role can manage all study groups" ON public.study_groups
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all memberships" ON public.user_study_groups
  FOR ALL USING (auth.role() = 'service_role');
      `;

      console.log(sql);
      return;
    }

    if (existingGroups !== null) {
      console.log('✅ study_groups table already exists');
    }

    // Check user_study_groups table
    console.log('Checking if user_study_groups table exists...');
    const { data: existingMemberships, error: membershipError } = await supabase
      .from('user_study_groups')
      .select('id')
      .limit(1);

    if (membershipError && membershipError.message.includes('does not exist')) {
      console.log('❌ user_study_groups table does not exist');
      console.log('📋 Please create this table manually in Supabase SQL Editor');
      return;
    }

    if (existingMemberships !== null) {
      console.log('✅ user_study_groups table already exists');
    }

    console.log('🎉 Basic study groups tables are ready!');

    // Try to create a test study group
    console.log('Creating a test study group...');
    const { data: testGroup, error: createError } = await supabase
      .from('study_groups')
      .insert({
        name: 'Welcome Study Group',
        description: 'A place to discuss quizzes and study together',
        created_by: 'e2b98acf-d1eb-4eab-b7b1-6f8f13eec40c', // Use existing admin user ID
        max_members: 50,
        is_active: true
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating test group:', createError.message);
    } else {
      console.log('✅ Test study group created:', testGroup.name);

      // Add the creator as a member
      const { error: memberError } = await supabase
        .from('user_study_groups')
        .insert({
          user_id: 'e2b98acf-d1eb-4eab-b7b1-6f8f13eec40c',
          group_id: testGroup.id,
          role: 'admin'
        });

      if (memberError) {
        console.error('❌ Error adding creator as member:', memberError.message);
      } else {
        console.log('✅ Creator added as group admin');
      }
    }

  } catch (error) {
    console.error('❌ Error in setup:', error);
  }
}

createBasicStudyGroupsTables();