import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: 'No authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      );
    }

    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    return NextResponse.json({
      success: true,
      user: decoded
    });
    
  } catch (error) {
    console.error('Auth me error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return NextResponse.json(
        { success: false, message: 'Token expired' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Authentication failed' },
      { status: 401 }
    );
  }
}
