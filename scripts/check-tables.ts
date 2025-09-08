import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qbxusidgwovqqnghmvox.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFieHVzaWRnd292cXFuZ2htdm94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjgzNzc4NywiZXhwIjoyMDcyNDEzNzg3fQ.7FZ1U66vfHGLrSOT6EpMim6k0o3Yw6PRpbxwJB8xTxU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  try {
    console.log('=== Starting Database Check ===');
    console.log(`Connecting to Supabase URL: ${supabaseUrl}`);
    
    // Check connection by listing all tables in the public schema
    const { data: tables, error: tablesError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
      
    console.log('\n=== Available Tables ===');
    console.log(tables?.map(t => t.tablename).join(', ') || 'No tables found');
    
    if (tablesError) {
      console.error('Error listing tables:', tablesError);
    }
    
    // Check quizzes table
    console.log('\n=== Checking quizzes table ===');
    const { data: quizzes, error: quizzesError } = await supabase
      .from('quizzes')
      .select('*')
      .limit(1);
    
    if (quizzesError) {
      console.error('Quizzes table error:', {
        message: quizzesError.message,
        code: quizzesError.code,
        details: quizzesError.details,
        hint: quizzesError.hint
      });
    } else {
      console.log('Quizzes table check: OK');
      console.log('Sample quiz:', quizzes[0] || 'No quizzes found');
    }
    
    // Check questions table
    console.log('\n=== Checking questions table ===');
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .limit(1);
      
    if (questionsError) {
      console.error('Questions table error:', {
        message: questionsError.message,
        code: questionsError.code,
        details: questionsError.details,
        hint: questionsError.hint
      });
    } else {
      console.log('Questions table check: OK');
      console.log('Sample question:', questions[0] || 'No questions found');
    }
    
    // Check answers table
    console.log('\n=== Checking answers table ===');
    const { data: answers, error: answersError } = await supabase
      .from('answers')
      .select('*')
      .limit(1);
      
    if (answersError) {
      console.error('Answers table error:', {
        message: answersError.message,
        code: answersError.code,
        details: answersError.details,
        hint: answersError.hint
      });
    } else {
      console.log('Answers table check: OK');
      console.log('Sample answer:', answers[0] || 'No answers found');
    }
    
    // Check quiz_attempts table
    console.log('\n=== Checking quiz_attempts table ===');
    const { data: attempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select('*')
      .limit(1);
    
    if (attemptsError) {
      console.error('Quiz_attempts table error:', {
        message: attemptsError.message,
        code: attemptsError.code,
        details: attemptsError.details,
        hint: attemptsError.hint
      });
    } else {
      console.log('Quiz_attempts table check: OK');
      console.log('Sample attempt:', attempts[0] || 'No attempts found');
    }
    
    // Check users table
    console.log('\n=== Checking users table ===');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.error('Users table error:', {
        message: usersError.message,
        code: usersError.code,
        details: usersError.details,
        hint: usersError.hint
      });
    } else {
      console.log('Users table check: OK');
      console.log('Sample user:', users[0] ? { ...users[0], password: '***' } : 'No users found');
    }
    
    console.log('\n=== Database Check Complete ===');
    
  } catch (error) {
    console.error('Error checking tables:', error);
  }
}

checkTables();
