import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Quiz Management System</h1>
          <p className="text-gray-600 mb-8">Choose your role to get started</p>
        </div>
        
        <div className="space-y-4">
          <Link 
            href="/admin/login" 
            className="w-full flex justify-center py-4 px-6 border border-transparent rounded-lg shadow-lg text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-200"
          >
            Admin Login
          </Link>
          
          <Link 
            href="/student/login" 
            className="w-full flex justify-center py-4 px-6 border border-gray-300 rounded-lg shadow-lg text-lg font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-200"
          >
            Student Login
          </Link>
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
