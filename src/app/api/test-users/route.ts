import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  console.log('=== SIMPLE USERS TEST ===');

  try {
    // Test simple query that should work with admin client
    console.log('Testing simple users query...');
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, name, email, role')
      .limit(5);

    console.log('Users query result:', {
      success: !error,
      count: users?.length,
      error: error?.message
    });

    if (users) {
      console.log('Sample users:', users.map(u => ({ id: u.id, name: u.name, role: u.role })));
    }

    return NextResponse.json({
      success: !error,
      users: users || [],
      error: error?.message
    });

  } catch (error) {
    console.error('Test failed with exception:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}