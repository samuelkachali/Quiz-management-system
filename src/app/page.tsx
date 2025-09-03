'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 relative overflow-hidden">
      {/* Subtle background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 right-10 w-80 h-80 bg-blue-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-indigo-200/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
        {/* Header Section */}
        <div className="text-center mb-12 max-w-3xl">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-xl mb-6 shadow-md">
            <span className="text-white text-2xl font-bold">Q</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
            Quiz Management System
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            A modern platform for creating, managing, and taking quizzes. 
            Designed for educators and students to enhance the learning experience.
          </p>
        </div>

        {/* Main Cards */}
        <div className="grid lg:grid-cols-2 gap-6 max-w-4xl w-full mb-12">
          {/* Admin Portal */}
          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="text-center">
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-3">Admin Portal</h2>
              <p className="text-slate-600 mb-6">
                Create and manage quizzes, monitor student performance, and oversee the learning ecosystem.
              </p>
              <div className="space-y-3">
                <Link
                  href="/admin/login"
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-colors"
                >
                  Sign In as Admin
                </Link>
                <Link
                  href="/admin/signup"
                  className="block w-full border border-gray-300 text-slate-700 hover:border-blue-500 hover:text-blue-600 font-medium py-3 px-6 rounded-xl transition-colors"
                >
                  Request Admin Access
                </Link>
              </div>
            </div>
          </div>

          {/* Student Portal */}
          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="text-center">
              <div className="w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-3">Student Portal</h2>
              <p className="text-slate-600 mb-6">
                Access your quizzes, track your progress, and enhance your learning journey.
              </p>
              <div className="space-y-3">
                <Link
                  href="/student/login"
                  className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-xl transition-colors"
                >
                  Sign In as Student
                </Link>
                <Link
                  href="/student/signup"
                  className="block w-full border border-gray-300 text-slate-700 hover:border-indigo-500 hover:text-indigo-600 font-medium py-3 px-6 rounded-xl transition-colors"
                >
                  Create Student Account
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Credentials */}
        <div className="max-w-3xl w-full">
          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-slate-800 mb-2">Demo Credentials</h3>
              <p className="text-slate-600">Use these credentials to explore the platform</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg mb-3 mx-auto">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-bold text-slate-800 mb-3 text-center">Super Admin</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                    <span className="text-sm text-slate-700">Email:</span>
                    <code className="bg-blue-100 px-2 py-1 rounded text-blue-800 text-sm">admin@quiz.com</code>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                    <span className="text-sm text-slate-700">Password:</span>
                    <code className="bg-blue-100 px-2 py-1 rounded text-blue-800 text-sm">admin123</code>
                  </div>
                </div>
              </div>
              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                <div className="flex items-center justify-center w-10 h-10 bg-indigo-600 rounded-lg mb-3 mx-auto">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h4 className="font-bold text-slate-800 mb-3 text-center">Student</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                    <span className="text-sm text-slate-700">Email:</span>
                    <code className="bg-indigo-100 px-2 py-1 rounded text-indigo-800 text-sm">student@quiz.com</code>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                    <span className="text-sm text-slate-700">Password:</span>
                    <code className="bg-indigo-100 px-2 py-1 rounded text-indigo-800 text-sm">student123</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}