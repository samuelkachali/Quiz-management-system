'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Quiz, User, QuizAttempt } from '@/types';

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/admin/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'admin' && parsedUser.role !== 'super_admin') {
      router.push('/admin/login');
      return;
    }

    setUser(parsedUser);
    fetchData(token);
  }, [router]);

  const fetchData = async (token: string) => {
    try {
      // Fetch users data
      const usersResponse = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const usersData = await usersResponse.json();
      if (usersData.success) setUsers(usersData.users);
      
      // Fetch quizzes data
      const quizzesResponse = await fetch('/api/quizzes', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const quizzesData = await quizzesResponse.json();
      if (quizzesData.success) setQuizzes(quizzesData.quizzes);
      
      // Fetch attempts data
      const attemptsResponse = await fetch('/api/admin/attempts', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const attemptsData = await attemptsResponse.json();
      if (attemptsData.success) setAttempts(attemptsData.attempts);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      // Don't redirect on error, just set empty data
      setUsers([]);
      setQuizzes([]);
      setAttempts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const deleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return;
    setQuizzes(quizzes.filter(quiz => quiz.id !== quizId));
  };

  const getQuizStats = (quizId: string) => {
    const quizAttempts = attempts.filter(attempt => attempt.quizId === quizId);
    const totalAttempts = quizAttempts.length;
    const passedAttempts = quizAttempts.filter(attempt => attempt.passed).length;
    const averageScore = totalAttempts > 0 
      ? Math.round(quizAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / totalAttempts)
      : 0;
    
    return { totalAttempts, passedAttempts, averageScore };
  };

  const handleUserApproval = async (userId: string, status: 'active' | 'rejected') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, status }),
      });

      const data = await response.json();
      if (data.success) {
        // Refresh the users list
        fetchData(token!);
        alert(`User ${status === 'active' ? 'approved' : 'rejected'} successfully`);
      } else {
        alert('Error updating user status');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error updating user status');
    }
  };

  const handlePasswordReset = async (userId: string, userEmail: string) => {
    const newPassword = prompt(`Enter new password for ${userEmail}:`);
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/reset-password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, newPassword }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`Password reset successfully for ${userEmail}. New password: ${newPassword}`);
      } else {
        alert('Error resetting password: ' + data.message);
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Error resetting password');
    }
  };

  const pendingAdmins = users.filter(u => u.role === 'admin' && u.status === 'pending');

  const renderSidebar = () => (
    <div className="w-64 bg-white shadow-lg h-full">
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-900">Admin Panel</h2>
      </div>
      <nav className="mt-6">
        <button
          onClick={() => setActiveSection('dashboard')}
          className={`w-full text-left px-6 py-3 text-sm font-medium ${
            activeSection === 'dashboard'
              ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-700'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          📊 Dashboard
        </button>
        <button
          onClick={() => setActiveSection('quizzes')}
          className={`w-full text-left px-6 py-3 text-sm font-medium ${
            activeSection === 'quizzes'
              ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-700'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          📝 Quiz Management
        </button>
        <button
          onClick={() => setActiveSection('analytics')}
          className={`w-full text-left px-6 py-3 text-sm font-medium ${
            activeSection === 'analytics'
              ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-700'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          📈 Student Performance
        </button>
        <button
          onClick={() => setActiveSection('students')}
          className={`w-full text-left px-6 py-3 text-sm font-medium ${
            activeSection === 'students'
              ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-700'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          👥 Student Management
        </button>
        <button
          onClick={() => setActiveSection('approvals')}
          className={`w-full text-left px-6 py-3 text-sm font-medium ${
            activeSection === 'approvals'
              ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-700'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          ✅ Admin Approvals
        </button>
        <button
          onClick={() => setActiveSection('reports')}
          className={`w-full text-left px-6 py-3 text-sm font-medium ${
            activeSection === 'reports'
              ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-700'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          📋 Reports
        </button>
      </nav>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {renderSidebar()}
      
      <div className="flex-1 flex flex-col">
        <nav className="bg-white shadow-sm border-b">
          <div className="px-6">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900 capitalize">
                  {activeSection === 'dashboard' ? 'Dashboard Overview' :
                   activeSection === 'quizzes' ? 'Quiz Management' :
                   activeSection === 'analytics' ? 'Student Performance Analytics' :
                   activeSection === 'students' ? 'Student Management' :
                   activeSection === 'approvals' ? 'Admin Approvals' :
                   activeSection === 'reports' ? 'Reports & Statistics' : 'Admin Dashboard'}
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">Welcome, {user?.name}</span>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="flex-1 p-6">
          {activeSection === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-gray-900">Total Quizzes</h3>
                  <p className="text-3xl font-bold text-indigo-600">{quizzes.length}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-gray-900">Total Attempts</h3>
                  <p className="text-3xl font-bold text-green-600">{attempts.length}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-gray-900">Pass Rate</h3>
                  <p className="text-3xl font-bold text-blue-600">
                    {attempts.length > 0 ? Math.round((attempts.filter(a => a.passed).length / attempts.length) * 100) : 0}%
                  </p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-gray-900">Avg Score</h3>
                  <p className="text-3xl font-bold text-purple-600">
                    {attempts.length > 0 ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length) : 0}%
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Quiz Activity</h3>
                <div className="space-y-3">
                  {attempts.slice(-5).reverse().map((attempt) => {
                    const quiz = quizzes.find(q => q.id === attempt.quizId);
                    return (
                      <div key={attempt.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium">{quiz?.title || 'Unknown Quiz'}</p>
                          <p className="text-sm text-gray-600">Student ID: {attempt.studentId}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${attempt.passed ? 'text-green-600' : 'text-red-600'}`}>
                            {attempt.score}% - {attempt.passed ? 'PASSED' : 'FAILED'}
                          </p>
                          <p className="text-sm text-gray-500">{new Date(attempt.completedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'quizzes' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Quiz Management</h2>
                <button
                  onClick={() => router.push('/admin/create-quiz')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Create New Quiz
                </button>
              </div>

              {quizzes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-lg">No quizzes created yet</div>
                  <button
                    onClick={() => router.push('/admin/create-quiz')}
                    className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-md text-sm font-medium"
                  >
                    Create Your First Quiz
                  </button>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {quizzes.map((quiz) => {
                    const stats = getQuizStats(quiz.id);
                    return (
                      <div key={quiz.id} className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-6">
                          <h3 className="text-lg font-medium text-gray-900 mb-2">{quiz.title}</h3>
                          <p className="text-gray-600 text-sm mb-4">{quiz.description}</p>
                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-500 mb-4">
                            <span>{quiz.questions.length} questions</span>
                            <span>Pass: {quiz.passingScore}%</span>
                            <span>{stats.totalAttempts} attempts</span>
                            <span>Avg: {stats.averageScore}%</span>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => router.push(`/admin/quiz/${quiz.id}/edit`)}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteQuiz(quiz.id)}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeSection === 'analytics' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quiz Performance Overview</h3>
                <div className="space-y-4">
                  {quizzes.map((quiz) => {
                    const quizAttempts = attempts.filter(attempt => attempt.quizId === quiz.id);
                    const stats = getQuizStats(quiz.id);
                    return (
                      <div key={quiz.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">{quiz.title}</h4>
                            <p className="text-sm text-gray-600">{quiz.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Pass Rate</p>
                            <p className="text-lg font-bold text-blue-600">
                              {stats.totalAttempts > 0 ? Math.round((stats.passedAttempts / stats.totalAttempts) * 100) : 0}%
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Total Attempts</p>
                            <p className="font-semibold">{stats.totalAttempts}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Passed</p>
                            <p className="font-semibold text-green-600">{stats.passedAttempts}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Failed</p>
                            <p className="font-semibold text-red-600">{stats.totalAttempts - stats.passedAttempts}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Avg Score</p>
                            <p className="font-semibold">{stats.averageScore}%</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">All Student Attempts</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quiz</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attempts.map((attempt) => {
                        const quiz = quizzes.find(q => q.id === attempt.quizId);
                        return (
                          <tr key={attempt.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              Student {attempt.studentId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {quiz?.title || 'Unknown Quiz'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {attempt.score}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                attempt.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {attempt.passed ? 'PASSED' : 'FAILED'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(attempt.completedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'students' && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Student Performance Summary</h3>
              <div className="space-y-4">
                {Array.from(new Set(attempts.map(a => a.studentId))).map((studentId) => {
                  const studentAttempts = attempts.filter(a => a.studentId === studentId);
                  const totalScore = studentAttempts.reduce((sum, a) => sum + a.score, 0);
                  const avgScore = Math.round(totalScore / studentAttempts.length);
                  const passedCount = studentAttempts.filter(a => a.passed).length;
                  
                  return (
                    <div key={studentId} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-gray-900">Student {studentId}</h4>
                          <p className="text-sm text-gray-600">{studentAttempts.length} quiz attempts</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-600">{avgScore}% avg</p>
                          <p className="text-sm text-gray-500">{passedCount}/{studentAttempts.length} passed</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeSection === 'reports' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">System Statistics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Quizzes:</span>
                      <span className="font-semibold">{quizzes.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Questions:</span>
                      <span className="font-semibold">{quizzes.reduce((sum, q) => sum + q.questions.length, 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Attempts:</span>
                      <span className="font-semibold">{attempts.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Unique Students:</span>
                      <span className="font-semibold">{new Set(attempts.map(a => a.studentId)).size}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Overall Pass Rate:</span>
                      <span className="font-semibold text-green-600">
                        {attempts.length > 0 ? Math.round((attempts.filter(a => a.passed).length / attempts.length) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Score:</span>
                      <span className="font-semibold">
                        {attempts.length > 0 ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Highest Score:</span>
                      <span className="font-semibold text-blue-600">
                        {attempts.length > 0 ? Math.max(...attempts.map(a => a.score)) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Lowest Score:</span>
                      <span className="font-semibold text-red-600">
                        {attempts.length > 0 ? Math.min(...attempts.map(a => a.score)) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'approvals' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Pending Admin Requests</h3>
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm font-medium">
                    {pendingAdmins.length} pending
                  </span>
                </div>
                
                {pendingAdmins.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No pending admin requests
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingAdmins.map((user) => (
                      <div key={user.id} className="border rounded-lg p-4 flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-gray-900">{user.name}</h4>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <p className="text-xs text-gray-500">
                            Requested: {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleUserApproval(user.id, 'active')}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleUserApproval(user.id, 'rejected')}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">All Users</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                        {user?.role === 'super_admin' && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((tableUser) => (
                        <tr key={tableUser.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {tableUser.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {tableUser.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              tableUser.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                              tableUser.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {tableUser.role.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              tableUser.status === 'active' ? 'bg-green-100 text-green-800' :
                              tableUser.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {tableUser.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(tableUser.created_at).toLocaleDateString()}
                          </td>
                          {user?.role === 'super_admin' && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handlePasswordReset(tableUser.id, tableUser.email)}
                                className="text-indigo-600 hover:text-indigo-900 bg-indigo-100 hover:bg-indigo-200 px-3 py-1 rounded text-xs"
                              >
                                Reset Password
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
