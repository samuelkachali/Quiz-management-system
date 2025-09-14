import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/backend/utils/auth';

export async function GET(request: NextRequest) {
  console.log('=== STUDY GROUPS API REQUEST ===');

  try {
    const authHeader = request.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('No or invalid authorization header');
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    console.log('Token received (first 10 chars):', token.substring(0, 10) + '...');

    let decoded;
    try {
      decoded = verifyToken(token);
      console.log('Token decoded successfully:', {
        id: decoded?.id,
        email: decoded?.email,
        role: decoded?.role
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Token verification failed:', errorMessage);
      return NextResponse.json(
        { success: false, message: 'Invalid token', error: errorMessage },
        { status: 401 }
      );
    }

    if (!decoded) {
      console.error('No decoded user data');
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    console.log('=== FETCHING STUDY GROUPS ===');
    console.log('User:', decoded.email, 'Role:', decoded.role);

    // Fetch study groups
    const { data: studyGroups, error } = await supabaseAdmin
      .from('study_groups')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    console.log('Study groups query result:', {
      count: studyGroups?.length,
      error: error?.message
    });

    if (error) {
      console.error('Supabase query error:', {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message
      });
      throw error;
    }

    // Get member counts and creator info for each group
    const transformedGroups = await Promise.all(
      (studyGroups || []).map(async (group) => {
        // Get member count
        const { count: memberCount } = await supabaseAdmin
          .from('user_study_groups')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', group.id);

        // Get creator info
        const { data: creator } = await supabaseAdmin
          .from('users')
          .select('id, name, email')
          .eq('id', group.created_by)
          .single();

        // Check if current user is a member
        const { data: membership } = await supabaseAdmin
          .from('user_study_groups')
          .select('role')
          .eq('group_id', group.id)
          .eq('user_id', decoded.id)
          .single();

        return {
          ...group,
          creator: creator || null,
          member_count: memberCount || 0,
          is_member: !!membership,
          is_creator: group.created_by === decoded.id,
          user_role: membership?.role || null
        };
      })
    );

    console.log('Transformed groups:', transformedGroups.length);

    return NextResponse.json({
      success: true,
      groups: transformedGroups,
      total: transformedGroups.length
    });

  } catch (error) {
    console.error('=== STUDY GROUPS API CATCH BLOCK ===');
    console.error('Study groups API error:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch study groups',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('=== CREATE STUDY GROUP API REQUEST ===');

  try {
    const authHeader = request.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('No or invalid authorization header');
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    console.log('Token received (first 10 chars):', token.substring(0, 10) + '...');

    let decoded;
    try {
      decoded = verifyToken(token);
      console.log('Token decoded successfully:', {
        id: decoded?.id,
        email: decoded?.email,
        role: decoded?.role
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Token verification failed:', errorMessage);
      return NextResponse.json(
        { success: false, message: 'Invalid token', error: errorMessage },
        { status: 401 }
      );
    }

    if (!decoded) {
      console.error('No decoded user data');
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, quizId, maxMembers } = body;

    console.log('=== CREATING STUDY GROUP ===');
    console.log('Group data:', { name, description, quizId, maxMembers });
    console.log('Creator:', decoded.email, 'ID:', decoded.id);

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, message: 'Group name is required' },
        { status: 400 }
      );
    }

    // Create the study group
    const { data: newGroup, error } = await supabaseAdmin
      .from('study_groups')
      .insert({
        name: name.trim(),
        description: description?.trim() || '',
        quiz_id: quizId || null,
        created_by: decoded.id,
        max_members: maxMembers || 50,
        is_active: true
      })
      .select('*')
      .single();

    console.log('Create group result:', {
      success: !error,
      groupId: newGroup?.id,
      error: error?.message
    });

    if (error) {
      console.error('Supabase insert error:', {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message
      });
      throw error;
    }

    // Add creator as a member with admin role
    const { error: memberError } = await supabaseAdmin
      .from('user_study_groups')
      .insert({
        user_id: decoded.id,
        group_id: newGroup.id,
        role: 'admin'
      });

    if (memberError) {
      console.error('Failed to add creator as member:', memberError);
      // Don't fail the whole operation, but log the error
    }

    // Get creator info
    const { data: creator } = await supabaseAdmin
      .from('users')
      .select('id, name, email')
      .eq('id', decoded.id)
      .single();

    return NextResponse.json({
      success: true,
      message: 'Study group created successfully',
      group: {
        ...newGroup,
        creator: creator || null,
        member_count: 1,
        is_member: true,
        is_creator: true,
        user_role: 'admin'
      }
    });

  } catch (error) {
    console.error('=== CREATE STUDY GROUP API CATCH BLOCK ===');
    console.error('Create study group API error:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create study group',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}