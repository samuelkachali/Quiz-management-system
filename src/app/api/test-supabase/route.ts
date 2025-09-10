import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  console.log('=== SUPABASE CONNECTION TEST ===');

  try {
    // Test basic connection with regular client
    console.log('Testing regular Supabase client...');
    const { data: regularData, error: regularError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    console.log('Regular client result:', {
      success: !regularError,
      data: regularData,
      error: regularError?.message
    });

    // Test admin client
    console.log('Testing admin Supabase client...');
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('users')
      .select('count')
      .limit(1);

    console.log('Admin client result:', {
      success: !adminError,
      data: adminData,
      error: adminError?.message
    });

    return NextResponse.json({
      success: true,
      regular: {
        success: !regularError,
        data: regularData,
        error: regularError?.message
      },
      admin: {
        success: !adminError,
        data: adminData,
        error: adminError?.message
      }
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