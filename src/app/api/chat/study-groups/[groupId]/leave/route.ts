import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/backend/utils/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  console.log('=== LEAVE STUDY GROUP API REQUEST ===');

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
    console.log('=== LEAVING STUDY GROUP ===');
    console.log('Group ID:', groupId);
    console.log('User:', decoded.email, 'ID:', decoded.id);

    // Check if user is a member of the group
    const { data: membership, error: memberCheckError } = await supabaseAdmin
      .from('user_study_groups')
      .select('*')
      .eq('user_id', decoded.id)
      .eq('group_id', groupId)
      .single();

    if (memberCheckError || !membership) {
      console.error('User is not a member of this group:', memberCheckError?.message);
      return NextResponse.json(
        { success: false, message: 'You are not a member of this group' },
        { status: 400 }
      );
    }

    // Check if user is the creator/admin - they can't leave
    if (membership.role === 'admin') {
      // Check if there are other admins
      const { count: adminCount, error: adminCountError } = await supabaseAdmin
        .from('user_study_groups')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .eq('role', 'admin');

      if (adminCountError) {
        console.error('Error counting admins:', adminCountError);
        return NextResponse.json(
          { success: false, message: 'Failed to check group admin status' },
          { status: 500 }
        );
      }

      if (adminCount && adminCount <= 1) {
        return NextResponse.json(
          { success: false, message: 'You cannot leave the group as you are the only admin. Transfer admin rights to another member first.' },
          { status: 400 }
        );
      }
    }

    // Remove user from the group
    const { error: leaveError } = await supabaseAdmin
      .from('user_study_groups')
      .delete()
      .eq('user_id', decoded.id)
      .eq('group_id', groupId);

    if (leaveError) {
      console.error('Failed to leave group:', leaveError);
      return NextResponse.json(
        { success: false, message: 'Failed to leave study group' },
        { status: 500 }
      );
    }

    console.log('Successfully left group:', groupId);

    return NextResponse.json({
      success: true,
      message: 'Successfully left study group'
    });

  } catch (error) {
    console.error('=== LEAVE STUDY GROUP API CATCH BLOCK ===');
    console.error('Leave study group API error:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to leave study group',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}