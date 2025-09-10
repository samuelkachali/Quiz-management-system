'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Simple function to validate redirect URLs to prevent open redirects
const getSafeRedirect = (path: string | null): string => {
  if (!path) return '/';
  // Only allow relative paths
  if (!path.startsWith('/')) return '/';
  // Add more validation if needed
  return path;
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isClient, setIsClient] = useState(false);
  const redirect = searchParams.get('redirect') || '/';
  
  // Check if user is already logged in
  useEffect(() => {
    setIsClient(true);
    
    const checkAuth = async () => {
      if (typeof window === 'undefined') return;
      
      const token = localStorage.getItem('token');
      const safeRedirect = getSafeRedirect(redirect);
      
      if (token) {
        try {
          // Verify the token is valid before redirecting
          const userData = localStorage.getItem('user');
          if (userData) {
            console.log('User is already logged in, redirecting to:', safeRedirect);
            router.push(safeRedirect);
          }
        } catch (error) {
          console.error('Error checking auth:', error);
          // Clear invalid token
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
    };
    
    checkAuth();
  }, [router, redirect]);

  // Show loading state while checking auth
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-gray-600">Please select your login method</p>
          </div>
          
          <div className="space-y-4">
            <Link
              href={`/admin/login?redirect=${encodeURIComponent(redirect || '/admin/dashboard')}`}
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg text-center transition-colors"
              onClick={(e) => {
                console.log('Admin login clicked, redirecting to:', redirect);
              }}
            >
              Admin Login
            </Link>
            
            <Link
              href={`/student/login?redirect=${encodeURIComponent(redirect || '/student/dashboard')}`}
              className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg text-center transition-colors"
              onClick={(e) => {
                console.log('Student login clicked, redirecting to:', redirect);
              }}
            >
              Student Login
            </Link>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue as guest</span>
              </div>
            </div>
            
            <Link
              href={getSafeRedirect(redirect)}
              className="block w-full border border-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg text-center hover:bg-gray-50 transition-colors"
              onClick={(e) => {
                console.log('Continue as guest, going to:', getSafeRedirect(redirect));
              }}
            >
              Continue without logging in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}