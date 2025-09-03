import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '../../../../../backend/utils/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qbxusidgwovqqnghmvox.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFieHVzaWRnd292cXFuZ2htdm94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjgzNzc4NywiZXhwIjoyMDcyNDEzNzg3fQ.7FZ1U66vfHGLrSOT6EpMim6k0o3Yw6PRpbxwJB8xTxU';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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
    
    console.log('Token decoded:', decoded);
    
    if (!decoded || decoded.role !== 'super_admin') {
      console.log('Role check failed:', { decoded: !!decoded, role: decoded?.role });
      return NextResponse.json(
        { success: false, message: 'Only super admin can reset passwords' },
        { status: 403 }
      );
    }

      const { userId, newPassword } = await request.json();
      
      if (!userId || !newPassword || newPassword.length < 6) {
        return NextResponse.json(
          { success: false, message: 'User ID and password (min 6 chars) are required' },
          { status: 400 }
        );
      }

    console.log('Resetting password for user:', userId, 'by:', decoded.email);

    // First, get the user's auth_id from our users table
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('auth_id, email')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Update the password in Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userData.auth_id,
      { password: newPassword }
    );

    if (authError) {
      console.error('Auth password update error:', authError);
      return NextResponse.json(
        { success: false, message: 'Failed to update password' },
        { status: 500 }
      );
    }

    console.log('Password reset successful for:', userData.email);

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Password reset API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
