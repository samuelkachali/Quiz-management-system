import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/backend/utils/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  console.log('=== JOIN STUDY GROUP API REQUEST ===');

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

    const groupId = params.groupId;
    console.log('=== JOINING STUDY GROUP ===');
    console.log('Group ID:', groupId, 'User:', decoded.email, 'ID:', decoded.id);

    // Check if the study group exists and is active
    const { data: studyGroup, error: groupError } = await supabaseAdmin
      .from('study_groups')
      .select('id, name, max_members, is_active')
      .eq('id', groupId)
      .eq('is_active', true)
      .single();

    if (groupError || !studyGroup) {
      console.error('Study group not found or inactive');
      return NextResponse.json(
        { success: false, message: 'Study group not found or inactive' },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const { data: existingMembership, error: membershipCheckError } = await supabaseAdmin
      .from('user_study_groups')
      .select('id, role')
      .eq('group_id', groupId)
      .eq('user_id', decoded.id)
      .single();

    if (existingMembership) {
      console.log('User is already a member of this study group');
      return NextResponse.json(
        { success: false, message: 'You are already a member of this study group' },
        { status: 400 }
      );
    }

    // Check current member count
    const { count: memberCount, error: countError } = await supabaseAdmin
      .from('user_study_groups')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId);

    if (countError) {
      console.error('Error counting members:', countError);
      return NextResponse.json(
        { success: false, message: 'Failed to check group capacity' },
        { status: 500 }
      );
    }

    // Check if group is full
    if ((memberCount ?? 0) >= studyGroup.max_members) {
      console.log('Study group is full');
      return NextResponse.json(
        { success: false, message: 'Study group is full' },
        { status: 400 }
      );
    }

    // Add user to the study group
    const { data: newMembership, error: joinError } = await supabaseAdmin
      .from('user_study_groups')
      .insert({
        group_id: groupId,
        user_id: decoded.id,
        role: 'member' // Default role for new members
      })
      .select()
      .single();

    console.log('Join group result:', {
      success: !joinError,
      membershipId: newMembership?.id,
      error: joinError?.message
    });

    if (joinError) {
      console.error('Supabase insert error:', {
        code: joinError.code,
        details: joinError.details,
        hint: joinError.hint,
        message: joinError.message
      });
      throw joinError;
    }

    // Create a system message to announce the new member
    const { error: messageError } = await supabaseAdmin
      .from('study_group_messages')
      .insert({
        group_id: groupId,
        user_id: decoded.id,
        message_type: 'system',
        content: `${decoded.email} joined the study group`
      });

    if (messageError) {
      console.error('Failed to create join message:', messageError);
      // Don't fail the join operation if message creation fails
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully joined study group',
      membership: newMembership
    });

  } catch (error) {
    console.error('=== JOIN STUDY GROUP API CATCH BLOCK ===');
    console.error('Join study group API error:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to join study group',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}