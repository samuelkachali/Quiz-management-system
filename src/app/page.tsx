import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Quiz Management System</h1>
          <p className="text-gray-600 mb-8">Choose your role to get started</p>
        </div>
        
        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 text-center">Admin Access</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link 
                href="/admin/login" 
                className="flex justify-center py-3 px-4 border border-transparent rounded-lg shadow text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition duration-200"
              >
                Login
              </Link>
              <Link 
                href="/admin/signup" 
                className="flex justify-center py-3 px-4 border border-indigo-600 rounded-lg shadow text-sm font-medium text-indigo-600 bg-white hover:bg-indigo-50 transition duration-200"
              >
                Request Access
              </Link>
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 text-center">Student Access</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link 
                href="/student/login" 
                className="flex justify-center py-3 px-4 border border-transparent rounded-lg shadow text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition duration-200"
              >
                Login
              </Link>
              <Link 
                href="/student/signup" 
                className="flex justify-center py-3 px-4 border border-green-600 rounded-lg shadow text-sm font-medium text-green-600 bg-white hover:bg-green-50 transition duration-200"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
        
        <div className="text-center text-sm text-gray-500">
          <p>Demo credentials:</p>
          <p>Admin: admin@test.com / admin123</p>
          <p>Student: student@test.com / student123</p>
        </div>
      </div>
    </div>
  )
}
