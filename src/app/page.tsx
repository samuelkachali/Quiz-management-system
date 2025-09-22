'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function HomeContent() {
  const [selectedRole, setSelectedRole] = useState<'admin' | 'student' | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  
  // Handle redirects and authentication state
  useEffect(() => {
    console.log('Root page mounted with redirect:', redirect);
    
    const checkAuthAndRedirect = () => {
      if (typeof window === 'undefined') return;
      
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      // If we have a valid token and user data
      if (token && userData) {
        try {
          const user = JSON.parse(userData);
          const targetPath = redirect || (user.role === 'admin' || user.role === 'super_admin' 
            ? '/admin/dashboard' 
            : '/student/dashboard');
          
          // Only redirect if we're not already on the target path
          if (window.location.pathname !== targetPath) {
            console.log(`User is logged in as ${user.role}, redirecting to:`, targetPath);
            router.replace(targetPath);
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
          // Clear invalid data
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } else if (redirect && redirect !== '/') {
        // If we have a redirect but no token, go to login with the redirect
        console.log('No valid session, redirecting to login with return URL:', redirect);
        router.replace(`/login?redirect=${encodeURIComponent(redirect)}`);
      }
    };
    
    checkAuthAndRedirect();
  }, [redirect, router]);

  const resetSelection = () => {
    setSelectedRole(null);
  };

  if (selectedRole === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          {/* Header Section */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-blue-600 rounded-xl mb-3 sm:mb-4 shadow-lg">
              <span className="text-white text-xl sm:text-2xl font-bold">Q</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800 mb-2 sm:mb-3">
              Quiz Management System
            </h1>
            <p className="text-slate-600 max-w-xl mx-auto mb-6 sm:mb-8 text-sm sm:text-base">
              Create, manage, and take quizzes with our modern platform designed for educators and students.
            </p>
          </div>

          {/* Role Selection */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <h2 className="text-xl font-bold text-slate-800 mb-4 text-center">Choose Your Role</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setSelectedRole('admin')}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 group"
              >
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform sm:w-14 sm:h-14">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-slate-800 mb-1">Admin</h3>
                <p className="text-sm text-slate-600">Create & manage quizzes</p>
              </button>
              
              <button
                onClick={() => setSelectedRole('student')}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all duration-300 group"
              >
                <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform sm:w-14 sm:h-14">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="font-bold text-slate-800 mb-1">Student</h3>
                <p className="text-sm text-slate-600">Take quizzes & track progress</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-xl mb-4 shadow-lg">
            <span className="text-white text-2xl font-bold">Q</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">
            {selectedRole === 'admin' ? 'Admin Portal' : 'Student Portal'}
          </h1>
          <p className="text-slate-600 text-sm mb-4">
            {selectedRole === 'admin'
              ? 'Create quizzes and manage student performance'
              : 'Take quizzes and track your learning progress'
            }
          </p>
          <button
            onClick={resetSelection}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            ← Change Role
          </button>
        </div>

        {/* Login/Signup Card */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="text-center">
            <div className={`w-12 h-12 ${selectedRole === 'admin' ? 'bg-blue-600' : 'bg-indigo-600'} rounded-lg flex items-center justify-center mx-auto mb-4`}>
              {selectedRole === 'admin' ? (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              )}
            </div>

            <div className="space-y-3">
              <Link
                href={`${selectedRole === 'admin' ? '/admin/login' : '/student/login'}${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
                className={`block w-full ${selectedRole === 'admin' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-medium py-3 px-4 rounded-lg transition-colors`}
              >
                {selectedRole === 'admin' ? 'Admin Login' : 'Student Login'}
              </Link>
              <Link
                href={selectedRole === 'admin' ? '/admin/signup' : '/student/signup'}
                className={`block w-full border ${selectedRole === 'admin' ? 'border-blue-200 text-blue-600 hover:bg-blue-50' : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50'} font-medium py-3 px-4 rounded-lg transition-colors`}
              >
                {selectedRole === 'admin' ? 'Request Access' : 'Create Account'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-xl mb-4 shadow-lg">
              <span className="text-white text-2xl font-bold">Q</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3">
              Quiz Management System
            </h1>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mt-4"></div>
          </div>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}

export default Home;