import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { verifyToken } from '../../../../../backend/utils/auth';
import { sendEmail, generateAdminApprovalEmail } from '../../../../lib/email';


export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded || (decoded.role !== 'admin' && decoded.role !== 'super_admin')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    console.log('Fetching users for:', decoded.email);

    // Get all users
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('Users query result:', { count: users?.length, error: error?.message });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      users: users || []
    });
  } catch (error) {
    console.error('Users API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    // Only super admins can approve/reject admin requests
    if (!decoded || decoded.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, message: 'Only super administrators can approve admin requests' },
        { status: 403 }
      );
    }

    const { userId, status } = await request.json();
    
    if (!userId || !status || !['active', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Invalid request data' },
        { status: 400 }
      );
    }

    console.log('Updating user status:', { userId, status, by: decoded.email });

    // Get user details before updating for email notification
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('email, name, role')
      .eq('id', userId)
      .single();

    if (fetchError || !userData) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Only send email for admin role approvals
    const shouldSendEmail = userData.role === 'admin' && status === 'active';

    // Update user status
    const { error } = await supabase
      .from('users')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', userId);

    console.log('Update result:', { error: error?.message });

    if (error) {
      throw error;
    }

    // Send email notification for admin approvals
    if (shouldSendEmail) {
      try {
        const emailHtml = generateAdminApprovalEmail(userData.name, userData.email);
        const emailSent = await sendEmail({
          to: userData.email,
          subject: 'Admin Access Approved - Quiz Management System',
          html: emailHtml
        });

        console.log('Email notification sent:', { 
          to: userData.email, 
          sent: emailSent 
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the approval if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `User ${status === 'active' ? 'approved' : 'rejected'} successfully${shouldSendEmail ? ' and notification email sent' : ''}`
    });
  } catch (error) {
    console.error('User update API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
