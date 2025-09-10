'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminDashboard from '@/components/AdminDashboard';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('📄 AdminDashboardPage: Component mounted');
    setLoading(true);

    // Check if we're running in the browser
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    console.log('📄 AdminDashboardPage: Auth check', {
      hasToken: !!token,
      tokenLength: token?.length,
      hasUserData: !!userData
    });

    if (!token || !userData) {
      console.log('📄 AdminDashboardPage: No token or user data, redirecting to login');
      setError('session_expired');
      setLoading(false);
      // Redirect to login with a return URL
      router.push(`/admin/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role !== 'admin' && parsedUser.role !== 'super_admin') {
        console.log('📄 AdminDashboardPage: User is not an admin, redirecting to login');
        setError('access_denied');
        // Clear invalid user data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/admin/login?error=access_denied');
        return;
      }
      // If we get here, user is authenticated and authorized
      setLoading(false);
    } catch (error) {
      console.error('Error parsing user data:', error);
      setError('invalid_session');
      setLoading(false);
      // Clear invalid data and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/admin/login?error=invalid_session');
    }
  }, [router]);

  // If we're still loading, show a loading spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If there's an error, show the error message
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-6">
            {error === 'session_expired' 
              ? 'Your session has expired. Please log in again.'
              : 'You need to be logged in to access this page.'}
          </p>
          <a 
            href="/admin/login"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container">
      <AdminDashboard />
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 p-4 bg-yellow-100 border border-yellow-300 rounded-lg text-sm text-yellow-800 max-w-xs">
          <div className="font-bold mb-1">Debug Info</div>
          <div>Check browser console for detailed logs</div>
        </div>
      )}
    </div>
  );
}
