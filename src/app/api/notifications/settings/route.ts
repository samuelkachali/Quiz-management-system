import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/backend/utils/auth';

export async function GET(request: NextRequest) {
  console.log('=== GET NOTIFICATION SETTINGS API REQUEST ===');

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

    console.log('=== FETCHING NOTIFICATION SETTINGS ===');
    console.log('User ID:', decoded.id);

    // Get user notification settings
    const { data: settings, error } = await supabaseAdmin
      .from('notification_settings')
      .select('*')
      .eq('user_id', decoded.id)
      .single();

    console.log('Settings query result:', {
      found: !!settings,
      error: error?.message
    });

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Supabase query error:', {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message
      });
      throw error;
    }

    // If no settings exist, return defaults
    const defaultSettings = {
      email_notifications: true,
      push_notifications: true,
      quiz_completion_alerts: true,
      study_group_notifications: true,
      integrity_alerts: true,
      admin_messages: true,
      system_updates: false
    };

    return NextResponse.json({
      success: true,
      settings: settings || defaultSettings
    });

  } catch (error) {
    console.error('=== GET NOTIFICATION SETTINGS API CATCH BLOCK ===');
    console.error('Get notification settings API error:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch notification settings',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  console.log('=== UPDATE NOTIFICATION SETTINGS API REQUEST ===');

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
    const { settings } = body;

    console.log('=== UPDATING NOTIFICATION SETTINGS ===');
    console.log('User ID:', decoded.id);
    console.log('New settings:', settings);

    if (!settings) {
      return NextResponse.json(
        { success: false, message: 'Settings object is required' },
        { status: 400 }
      );
    }

    // Upsert notification settings
    const { data: updatedSettings, error } = await supabaseAdmin
      .from('notification_settings')
      .upsert({
        user_id: decoded.id,
        ...settings,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    console.log('Settings update result:', {
      success: !error,
      settingsId: updatedSettings?.id,
      error: error?.message
    });

    if (error) {
      console.error('Supabase upsert error:', {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message
      });
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Notification settings updated successfully',
      settings: updatedSettings
    });

  } catch (error) {
    console.error('=== UPDATE NOTIFICATION SETTINGS API CATCH BLOCK ===');
    console.error('Update notification settings API error:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update notification settings',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}