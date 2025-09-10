'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Quiz, User, QuizAttempt } from '@/types';
import DocumentUploader from './DocumentUploader';
import IntegrityDashboard from './IntegrityDashboard';
import SmartNotifications from './SmartNotifications';
import AdvancedAnalytics from './AdvancedAnalytics';
import StudyGroupManager from './StudyGroupManager';

export default function AdminDashboard() {
  console.log('🔥 AdminDashboard component rendered!');

  const [user, setUser] = useState<User | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importedQuiz, setImportedQuiz] = useState<{ id: string; title?: string; description?: string; questions: any[] } | null>(null);
  const [activeTab, setActiveTab] = useState('quizzes'); // 'quizzes' or 'create'
  const router = useRouter();

  useEffect(() => {
    console.log('🔄 AdminDashboard: Checking authentication state');
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    console.log('🔑 Auth State:', {
      hasToken: !!token,
      tokenLength: token?.length,
      hasUserData: !!userData,
      userData: userData ? JSON.parse(userData) : null
    });

    if (!token || !userData) {
      const errorMsg = !token ? 'No authentication token found' : 'No user data found';
      console.error('❌ Authentication error:', errorMsg);
      setError(errorMsg);
      setLoading(false);
      return;
    }

    let parsedUser;
    try {
      parsedUser = JSON.parse(userData);
      console.log('👤 User info:', {
        id: parsedUser.id,
        email: parsedUser.email,
        role: parsedUser.role,
        status: parsedUser.status
      });

      if (parsedUser.role !== 'admin' && parsedUser.role !== 'super_admin') {
        const errorMsg = `Access denied. User role '${parsedUser.role}' is not authorized`;
        console.error('🚫 Authorization error:', errorMsg);
        setError(errorMsg);
        setLoading(false);
        return;
      }

      // If we get here, user is authenticated and authorized
      console.log('✅ User is authenticated and authorized');
      setUser(parsedUser);
      fetchData(token).catch(error => {
        console.error('Error in fetchData:', error);
        setError(`Failed to load dashboard data: ${error.message}`);
      });
    } catch (error) {
      console.error('❌ Error parsing user data:', error);
      setError('Invalid session data');
      setLoading(false);
    }
  }, [router]);

  const refreshQuizzes = async (quizId?: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/quizzes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setQuizzes(data.quizzes);
        if (quizId) {
          const quiz = data.quizzes.find((q: Quiz) => q.id === quizId);
          if (quiz) {
            setImportedQuiz({
              id: quiz.id,
              questions: quiz.questions || [],
            });
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing quizzes:', error);
    }
  };

  const fetchData = async (token: string) => {
    console.log('🔄 Starting data fetch...');
    setLoading(true);
    setError(null);

    try {
      const fetchOptions: RequestInit = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        credentials: 'include' as const
      };

      console.log('🌐 API Request Headers:', JSON.stringify(fetchOptions.headers, null, 2));

      // Test the token first
      console.log('🔒 Testing token with /api/auth/me...');
      const testResponse = await fetch('/api/auth/me', {
        headers: fetchOptions.headers as HeadersInit
      });

      if (!testResponse.ok) {
        const error = await testResponse.text();
        throw new Error(`Authentication failed: ${testResponse.status} ${error}`);
      }

      console.log('✅ Token is valid, fetching dashboard data...');

      // Fetch all data in parallel
      const [usersRes, quizzesRes, attemptsRes] = await Promise.all([
        fetchWithLogging('/api/admin/users', fetchOptions, 'Users'),
        fetchWithLogging('/api/quizzes', fetchOptions, 'Quizzes'),
        fetchWithLogging('/api/admin/attempts', fetchOptions, 'Attempts')
      ]);

      // Process responses
      const [usersData, quizzesData, attemptsData] = await Promise.all([
        usersRes.json(),
        quizzesRes.json(),
        attemptsRes.json()
      ]);

      console.log('📊 Fetched data:', {
        users: usersData.users?.length || 0,
        quizzes: quizzesData.quizzes?.length || 0,
        attempts: attemptsData.attempts?.length || 0
      });

      if (usersData.success) setUsers(usersData.users || []);
      if (quizzesData.success) setQuizzes(quizzesData.quizzes || []);
      if (attemptsData.success) setAttempts(attemptsData.attempts || []);

      setLoading(false);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error in fetchData:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : typeof error
      });

      setError(`Error loading dashboard: ${errorMessage}`);
      setLoading(false);
    }
  };

  // Helper function for better fetch error handling and logging
  async function fetchWithLogging(url: string, options: RequestInit, label: string) {
    console.log(`🌐 [${label}] Fetching ${url}...`);
    const response = await fetch(url, options);
    console.log(`📡 [${label}] Response:`, response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [${label}] Error:`, errorText);
      throw new Error(`[${label}] ${response.status} ${response.statusText}: ${errorText}`);
    }

    return response;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const deleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication required. Please log in again.');
        router.push('/admin/login');
        return;
      }

      const response = await fetch(`/api/quizzes/${quizId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete quiz');
      }

      if (data.success) {
        // Update the UI by removing the deleted quiz
        setQuizzes(prevQuizzes => prevQuizzes.filter(quiz => quiz.id !== quizId));
        // Show a success message
        alert('Quiz deleted successfully');
      } else {
        throw new Error(data.message || 'Failed to delete quiz');
      }
    } catch (error) {
      console.error('Error deleting quiz:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to delete quiz'}`);
    }
  };

  const getQuizStats = (quizId: string) => {
    const quizAttempts = attempts.filter(attempt => {
      return String(attempt.quiz_id) === String(quizId);
    });

    const totalAttempts = quizAttempts.length;
    const passedAttempts = quizAttempts.filter(attempt => Number(attempt.score) >= 50).length;
    const averageScore = totalAttempts > 0
      ? Math.round(quizAttempts.reduce((sum, attempt) => sum + (Number(attempt.score) || 0), 0) / totalAttempts)
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

  const generateCSVReport = () => {
    const headers = ['Name', 'Email', 'Role', 'Status', 'Joined Date', 'Quiz Attempts', 'Average Score'];
    const rows = users.map(user => {
      const userAttempts = attempts.filter(a => a.student_id === user.id);
      const avgScore = userAttempts.length > 0
        ? Math.round(userAttempts.reduce((sum, a) => sum + a.score, 0) / userAttempts.length)
        : 0;

      return [
        user.name,
        user.email,
        user.role,
        user.status,
        new Date(user.created_at).toLocaleDateString(),
        userAttempts.length.toString(),
        avgScore.toString()
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-3"></div>
          <div className="text-gray-600">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const renderSidebar = () => (
    <div className="w-72 bg-white border-r border-gray-200 shadow-sm h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-lg">Q</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Quiz Admin</h2>
            <p className="text-gray-500 text-sm">Management Panel</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">{user?.name?.charAt(0) || 'A'}</span>
          </div>
          <div>
            <p className="text-gray-800 font-medium text-sm">{user?.name}</p>
            <p className="text-gray-500 text-xs capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-6 px-3 flex-1">
        <div className="space-y-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊', desc: 'Overview & Stats' },
            { id: 'quizzes', label: 'Quiz Management', icon: '📝', desc: 'Create & Edit Quizzes' },
            { id: 'chat', label: 'Study Chat', icon: '💬', desc: 'Monitor Discussions' },
            { id: 'students', label: 'Students', icon: '👥', desc: 'Student Management' },
            { id: 'integrity', label: 'Integrity Monitor', icon: '🛡️', desc: 'Academic Integrity' },
            { id: 'notifications', label: 'Notifications', icon: '🔔', desc: 'Smart Notifications' },
            { id: 'advanced-analytics', label: 'Advanced Analytics', icon: '📊', desc: 'AI Learning Insights' },
            ...(user?.role === 'super_admin' ? [{ id: 'approvals', label: 'Approvals', icon: '✅', desc: 'Admin Requests' }] : []),
            { id: 'reports', label: 'Reports', icon: '📋', desc: 'System Reports' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`group w-full text-left p-3 rounded-lg transition-all duration-200 ${
                activeSection === item.id
                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                  activeSection === item.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                }`}>
                  <span className="text-lg">{item.icon}</span>
                </div>
                <div className="flex-1">
                  <p className={`font-medium transition-colors duration-200 ${
                    activeSection === item.id ? 'text-blue-700' : 'text-gray-800 group-hover:text-gray-900'
                  }`}>
                    {item.label}
                  </p>
                  <p className={`text-xs transition-colors duration-200 ${
                    activeSection === item.id ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-600'
                  }`}>
                    {item.desc}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </nav>

      {/* Quick stats */}
      <div className="mx-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-gray-700 font-medium text-sm mb-3">Quick Stats</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-xs">Total Quizzes</span>
            <span className="text-blue-600 font-semibold text-sm">{quizzes.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-xs">Total Attempts</span>
            <span className="text-green-600 font-semibold text-sm">{attempts.length}</span>
          </div>
          {user?.role === 'super_admin' && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-xs">Pending Approvals</span>
              <span className="text-amber-600 font-semibold text-sm">{pendingAdmins.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* Logout button */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-gray-900 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 border border-gray-200 flex items-center justify-center space-x-2"
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {renderSidebar()}

      <div className="flex-1 flex flex-col">
        <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
          <div className="px-6">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-800 capitalize">
                  {activeSection === 'dashboard' ? 'Dashboard Overview' :
                   activeSection === 'quizzes' ? 'Quiz Management' :
                   activeSection === 'chat' ? 'Study Group Chat' :
                   activeSection === 'students' ? 'Student Management' :
                   activeSection === 'integrity' ? 'Academic Integrity Monitor' :
                   activeSection === 'notifications' ? 'Smart Notifications' :
                   activeSection === 'advanced-analytics' ? 'Advanced Analytics Dashboard' :
                   activeSection === 'approvals' ? 'Admin Approvals' :
                   activeSection === 'reports' ? 'Reports & Statistics' : 'Admin Dashboard'}
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-800">{user?.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')} Access</p>
                </div>
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">{user?.name?.charAt(0) || 'A'}</span>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <div className="flex-1 p-6 overflow-auto">
          {activeSection === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <div className="p-2 rounded-lg bg-blue-50">
                      <span className="text-blue-600 text-xl">📝</span>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-600">Total Quizzes</h3>
                      <p className="text-2xl font-bold text-gray-800">{quizzes.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <div className="p-2 rounded-lg bg-green-50">
                      <span className="text-green-600 text-xl">📊</span>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-600">Total Attempts</h3>
                      <p className="text-2xl font-bold text-gray-800">{attempts.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <div className="p-2 rounded-lg bg-amber-50">
                      <span className="text-amber-600 text-xl">✅</span>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-600">Pass Rate</h3>
                      <p className="text-2xl font-bold text-gray-800">
                        {attempts.length > 0 ? Math.round((attempts.filter(a => a.score >= 50).length / attempts.length) * 100) : 0}%
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <div className="p-2 rounded-lg bg-purple-50">
                      <span className="text-purple-600 text-xl">📈</span>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-600">Avg Score</h3>
                      <p className="text-2xl font-bold text-gray-800">
                        {attempts.length > 0 ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length) : 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Recent Quiz Activity</h3>
                <div className="space-y-3">
                  {attempts.slice(-5).reverse().map((attempt) => {
                    const quiz = quizzes.find(q => q.id === attempt.quiz_id);
                    const isPassed = attempt.score >= 50;
                    const formatDate = (dateStr: string | Date) => {
                      try {
                        const date = new Date(dateStr);
                        return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
                      } catch {
                        return 'Invalid Date';
                      }
                    };
                    return (
                      <div key={attempt.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                          <p className="font-medium text-gray-800">{quiz?.title || 'Unknown Quiz'}</p>
                          <p className="text-sm text-gray-600">Student ID: {attempt.student_id}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${isPassed ? 'text-green-600' : 'text-red-600'}`}>
                            {attempt.score}% - {isPassed ? 'PASSED' : 'FAILED'}
                          </p>
                          <p className="text-sm text-gray-500">{formatDate(attempt.completed_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'quizzes' && (
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('quizzes')}
                    className={`${activeTab === 'quizzes' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    All Quizzes
                  </button>
                  <button
                    onClick={() => setActiveTab('create')}
                    className={`${activeTab === 'create' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    Create/Import Quiz
                  </button>
                </nav>
              </div>

              {activeTab === 'create' ? (
                <div className="mt-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Import Quiz from Document</h3>
                  <DocumentUploader
                    onUploadSuccess={(quizId) => {
                      refreshQuizzes(quizId);
                      setActiveTab('quizzes');
                    }}
                  />
                </div>
              ) : (
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-800">Quiz Management</h2>
                    <button
                      onClick={() => router.push('/admin/create-quiz')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                    >
                      Create New Quiz
                    </button>
                  </div>
                  {quizzes.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
                      <div className="text-gray-500 mb-1">No quizzes created yet</div>
                      <button
                        onClick={() => router.push('/admin/create-quiz')}
                        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200"
                      >
                        Create Your First Quiz
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                      {quizzes.map((quiz) => {
                        const stats = getQuizStats(quiz.id);
                        return (
                          <div key={quiz.id} className="bg-white overflow-hidden rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                            <div className="p-5">
                              <h3 className="text-lg font-medium text-gray-800 mb-2">{quiz.title}</h3>
                              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{quiz.description}</p>
                              <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 mb-4">
                                <div className="flex items-center">
                                  <span className="mr-1">📋</span>
                                  <span>{quiz.questions.length} questions</span>
                                </div>
                                <div className="flex items-center">
                                  <span className="mr-1">🎯</span>
                                  <span>Pass: {quiz.passing_score}%</span>
                                </div>
                                <div className="flex items-center">
                                  <span className="mr-1">📊</span>
                                  <span>{stats.totalAttempts} attempts</span>
                                </div>
                                <div className="flex items-center">
                                  <span className="mr-1">📈</span>
                                  <span>Avg: {stats.averageScore}%</span>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => router.push(`/admin/quizzes/edit?id=${quiz.id}`)}
                                  className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 border border-blue-200"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteQuiz(quiz.id)}
                                  className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 border border-red-200"
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
            </div>
          )}

          {activeSection === 'students' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-800">User Management</h3>
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {users.length} users
                  </span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((tableUser) => (
                        <tr key={tableUser.id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                            {tableUser.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {tableUser.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                              tableUser.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                              tableUser.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {tableUser.role.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                              tableUser.status === 'active' ? 'bg-green-100 text-green-800' :
                              tableUser.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {tableUser.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            N/A
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(tableUser.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {users.length === 0 && (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    No users found
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'integrity' && (
            <IntegrityDashboard />
          )}

          {activeSection === 'notifications' && (
            <SmartNotifications />
          )}

          {activeSection === 'advanced-analytics' && (
            <AdvancedAnalytics quizzes={quizzes} attempts={attempts} />
          )}

          {activeSection === 'chat' && (
            <StudyGroupManager />
          )}

          {activeSection === 'reports' && (
            <div className="space-y-6">
              {/* Report Header */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-800">System Reports</h3>
                    <p className="text-sm text-gray-600 mt-1">Comprehensive analytics and performance reports</p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => window.print()}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                    >
                      📄 Export PDF
                    </button>
                    <button
                      onClick={() => {
                        const csvContent = generateCSVReport();
                        const blob = new Blob([csvContent], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `quiz-system-report-${new Date().toISOString().split('T')[0]}.csv`;
                        a.click();
                        window.URL.revokeObjectURL(url);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                    >
                      📊 Export CSV
                    </button>
                  </div>
                </div>

                {/* Report Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-600">Total Users</p>
                        <p className="text-2xl font-bold text-blue-900">{users.length}</p>
                      </div>
                      <span className="text-blue-600 text-xl">👥</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600">Active Users</p>
                        <p className="text-2xl font-bold text-green-900">{users.filter(u => u.status === 'active').length}</p>
                      </div>
                      <span className="text-green-600 text-xl">✅</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-600">Total Quizzes</p>
                        <p className="text-2xl font-bold text-purple-900">{quizzes.length}</p>
                      </div>
                      <span className="text-purple-600 text-xl">📝</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-orange-600">Total Attempts</p>
                        <p className="text-2xl font-bold text-orange-900">{attempts.length}</p>
                      </div>
                      <span className="text-orange-600 text-xl">📊</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Reports */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Distribution Report */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h4 className="text-lg font-medium text-gray-800 mb-4">User Distribution</h4>
                  <div className="space-y-3">
                    {['super_admin', 'admin', 'student'].map((role) => {
                      const count = users.filter(u => u.role === role).length;
                      const percentage = users.length > 0 ? Math.round((count / users.length) * 100) : 0;
                      return (
                        <div key={role} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                              role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                              role === 'admin' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {role.replace('_', ' ').toUpperCase()}
                            </span>
                            <span className="text-sm text-gray-600">{count} users</span>
                          </div>
                          <span className="text-sm font-medium text-gray-800">{percentage}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quiz Performance Report */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h4 className="text-lg font-medium text-gray-800 mb-4">Quiz Performance</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Average Score</span>
                      <span className="text-sm font-medium text-gray-800">
                        {attempts.length > 0 ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Pass Rate</span>
                      <span className="text-sm font-medium text-gray-800">
                        {attempts.length > 0 ? Math.round((attempts.filter(a => a.score >= 50).length / attempts.length) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Highest Score</span>
                      <span className="text-sm font-medium text-gray-800">
                        {attempts.length > 0 ? Math.max(...attempts.map(a => a.score)) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Questions</span>
                      <span className="text-sm font-medium text-gray-800">
                        {quizzes.reduce((sum, q) => sum + q.questions.length, 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent Activity Report */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h4 className="text-lg font-medium text-gray-800 mb-4">Recent Activity</h4>
                  <div className="space-y-3">
                    {attempts.slice(-5).reverse().map((attempt) => {
                      const quiz = quizzes.find(q => q.id === attempt.quiz_id);
                      const isPassed = attempt.score >= 50;
                      return (
                        <div key={attempt.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{quiz?.title || 'Unknown Quiz'}</p>
                            <p className="text-xs text-gray-600">
                              {new Date(attempt.completed_at).toLocaleDateString()} at {new Date(attempt.completed_at).toLocaleTimeString()}
                            </p>
                          </div>
                          <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                            isPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {attempt.score}%
                          </span>
                        </div>
                      );
                    })}
                    {attempts.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
                    )}
                  </div>
                </div>

                {/* System Health Report */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h4 className="text-lg font-medium text-gray-800 mb-4">System Health</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Database Status</span>
                      <span className="text-sm font-medium text-green-600">✅ Connected</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Active Sessions</span>
                      <span className="text-sm font-medium text-blue-600">1 admin</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Storage Used</span>
                      <span className="text-sm font-medium text-gray-800">~2.5 MB</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Uptime</span>
                      <span className="text-sm font-medium text-green-600">99.9%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'approvals' && user?.role === 'super_admin' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-800">Pending Admin Requests</h3>
                  <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-sm font-medium">
                    {pendingAdmins.length} pending
                  </span>
                </div>

                {pendingAdmins.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    No pending admin requests
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingAdmins.map((user) => (
                      <div key={user.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center hover:bg-gray-50 transition-colors duration-200">
                        <div>
                          <h4 className="font-medium text-gray-800">{user.name}</h4>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <p className="text-xs text-gray-500">
                            Requested: {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleUserApproval(user.id, 'active')}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleUserApproval(user.id, 'rejected')}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-800 mb-4">All Users</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
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
                        <tr key={tableUser.id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                            {tableUser.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {tableUser.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                              tableUser.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                              tableUser.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {tableUser.role.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                              tableUser.status === 'active' ? 'bg-green-100 text-green-800' :
                              tableUser.status === 'pending' ? 'bg-amber-100 text-amber-800' :
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
                                className="text-blue-600 hover:text-blue-900 mr-3"
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
