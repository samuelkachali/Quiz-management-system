import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/backend/utils/auth';
import { sendEmail, generateAdminApprovalEmail } from '@/lib/email';

// Simple test endpoint to verify database connection
export async function HEAD(request: NextRequest) {
  try {
    console.log('=== DATABASE CONNECTION TEST ===');
    console.log('Testing Supabase connection...');

    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    console.log('Connection test result:', { success: !error, error: error?.message });
    return new NextResponse(null, { status: error ? 500 : 200 });
  } catch (error) {
    console.error('Connection test failed:', error);
    return new NextResponse(null, { status: 500 });
  }
}


export async function GET(request: NextRequest) {
  console.log('=== USERS API REQUEST ===');
  console.log('Request URL:', request.url);
  console.log('Request method:', request.method);
  
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
        role: decoded?.role,
        exp: decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : 'N/A'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Token verification failed:', errorMessage);
      return NextResponse.json(
        { success: false, message: 'Invalid token', error: errorMessage },
        { status: 401 }
      );
    }
    
    if (!decoded || (decoded.role !== 'admin' && decoded.role !== 'super_admin')) {
      console.error('Insufficient permissions:', { role: decoded?.role });
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    console.log('=== ADMIN DASHBOARD DEBUG ===');
    console.log('Fetching users for:', decoded.email);
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('Token decoded successfully:', !!decoded);
    console.log('User role:', decoded?.role);

    // Get all users
    console.log('Querying users from Supabase...');
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('Users query result:', { 
      count: users?.length, 
      error: error?.message,
      data: users?.map(u => ({ id: u.id, email: u.email, role: u.role }))
    });
    
    if (error) {
      console.error('Supabase query error:', {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message
      });
    }

    if (error) {
      console.error('=== DATABASE ERROR DETAILS ===');
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
    }

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      users: users || []
    });
  } catch (error) {
    console.error('=== USERS API CATCH BLOCK ===');
    console.error('Users API error:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch users',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      },
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
    const { data: userData, error: fetchError } = await supabaseAdmin
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
    const { error } = await supabaseAdmin
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
