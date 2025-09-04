import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qbxusidgwovqqnghmvox.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFieHVzaWRnd292cXFuZ2htdm94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjgzNzc4NywiZXhwIjoyMDcyNDEzNzg3fQ.7FZ1U66vfHGLrSOT6EpMim6k0o3Yw6PRpbxwJB8xTxU';

// Server-side validation functions
const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return { isValid: errors.length === 0, errors };
};

const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  // Valid email domains
  const validDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'edu', 'org', 'gov'];
  const domain = email.split('@')[1]?.toLowerCase();
  
  const isValidDomain = validDomains.some(validDomain => 
    domain === validDomain || domain?.endsWith('.' + validDomain)
  );
  
  if (!isValidDomain) {
    return { 
      isValid: false, 
      error: 'Please use a valid email domain (gmail.com, yahoo.com, outlook.com, .edu, .org, .gov, etc.)' 
    };
  }
  
  return { isValid: true };
};

const validateName = (name: string): { isValid: boolean; error?: string } => {
  if (name.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters long' };
  }
  
  if (/\d/.test(name)) {
    return { isValid: false, error: 'Name cannot contain numbers' };
  }
  
  if (!/^[a-zA-Z\s'-]+$/.test(name)) {
    return { isValid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
  }
  
  return { isValid: true };
};

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role } = await request.json();

    // Basic field validation
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['admin', 'student'].includes(role)) {
      return NextResponse.json(
        { success: false, message: 'Invalid role specified' },
        { status: 400 }
      );
    }

    // Validate name
    const nameValidation = validateName(name.trim());
    if (!nameValidation.isValid) {
      return NextResponse.json(
        { success: false, message: nameValidation.error },
        { status: 400 }
      );
    }

    // Validate email
    const emailValidation = validateEmail(email.toLowerCase().trim());
    if (!emailValidation.isValid) {
      return NextResponse.json(
        { success: false, message: emailValidation.error },
        { status: 400 }
      );
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { success: false, message: `Password requirements not met: ${passwordValidation.errors.join(', ')}` },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();

    console.log('Signup attempt:', { email: cleanEmail, name: cleanName, role });

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('email', cleanEmail)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: { name: cleanName, role }
    });

    console.log('Auth creation result:', { success: !!authData?.user, error: authError?.message });

    if (authError) {
      return NextResponse.json(
        { success: false, message: authError.message },
        { status: 400 }
      );
    }

    // Insert user into our users table
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_id: authData.user.id,
        email: cleanEmail,
        name: cleanName,
        role,
        status: role === 'admin' ? 'pending' : 'active'
      });

    console.log('Database insert result:', { error: dbError?.message });

    if (dbError) {
      // Clean up auth user if database insert fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { success: false, message: 'Failed to create user profile' },
        { status: 500 }
      );
    }

    console.log('Signup successful for:', cleanEmail);

    return NextResponse.json({
      success: true,
      message: role === 'admin' 
        ? 'Admin account request submitted for approval'
        : 'Account created successfully',
      requiresApproval: role === 'admin'
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}