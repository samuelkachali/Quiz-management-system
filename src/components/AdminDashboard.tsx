'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Quiz, User, QuizAttempt } from '@/types';
import DocumentUploader from './DocumentUploader';

export default function AdminDashboard() {
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
    try {
      setLoading(true);
      setError('');
      
      // Create fetch options with authorization header
      const fetchOptions = {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      // Fetch all data in parallel
      const [usersRes, quizzesRes, attemptsRes] = await Promise.all([
        fetch('/api/admin/users', fetchOptions).catch(err => {
          console.error('Failed to fetch users:', err);
          return { 
            ok: false, 
            status: 500, 
            statusText: 'Network error',
            json: async () => ({
              success: false,
              message: 'Failed to fetch users',
              error: err.message
            })
          };
        }),
        fetch('/api/quizzes', fetchOptions).catch(err => {
          console.error('Failed to fetch quizzes:', err);
          return { 
            ok: false, 
            status: 500, 
            statusText: 'Network error',
            json: async () => ({
              success: false,
              message: 'Failed to fetch quizzes',
              error: err.message
            })
          };
        }),
        fetch('/api/admin/attempts', fetchOptions).catch(err => {
          console.error('Failed to fetch attempts:', err);
          return { 
            ok: false, 
            status: 500, 
            statusText: 'Network error',
            json: async () => ({
              success: false,
              message: 'Failed to fetch attempts',
              error: err.message
            })
          };
        })
      ]);

      // Process users response
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        if (usersData?.success) {
          setUsers(usersData.users || []);
        } else {
          console.error('Failed to fetch users:', usersData?.message);
          setError(`Failed to load users: ${usersData?.message || 'Unknown error'}`);
        }
      } else {
        console.error('Users API error:', usersRes.status, usersRes.statusText);
        setError(`Failed to load users: ${usersRes.status} ${usersRes.statusText}`);
      }

      // Process quizzes response
      if (quizzesRes.ok) {
        const quizzesData = await quizzesRes.json();
        if (quizzesData?.success) {
          setQuizzes(quizzesData.quizzes || []);
        } else {
          console.error('Failed to fetch quizzes:', quizzesData?.message);
          setError(`Failed to load quizzes: ${quizzesData?.message || 'Unknown error'}`);
        }
      } else {
        console.error('Quizzes API error:', quizzesRes.status, quizzesRes.statusText);
        setError(`Failed to load quizzes: ${quizzesRes.status} ${quizzesRes.statusText}`);
      }

      // Process attempts response
      if (attemptsRes.ok) {
        const attemptsData = await attemptsRes.json();
        if (attemptsData?.success) {
          setAttempts(attemptsData.attempts || []);
        } else {
          console.error('Failed to fetch attempts:', attemptsData?.message);
          setError(`Failed to load attempts: ${attemptsData?.message || 'Unknown error'}`);
        }
      } else {
        console.error('Attempts API error:', attemptsRes.status, attemptsRes.statusText);
        setError(`Failed to load attempts: ${attemptsRes.status} ${attemptsRes.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('An unexpected error occurred while loading data');
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
    // Handle both quizId and quiz_id properties
    const quizAttempts = attempts.filter(attempt => {
      const attemptQuizId = attempt.quizId || (attempt as any).quiz_id;
      return String(attemptQuizId) === String(quizId);
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
            { id: 'analytics', label: 'Performance', icon: '📈', desc: 'Student Analytics' },
            { id: 'students', label: 'Students', icon: '👥', desc: 'Student Management' },
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
                   activeSection === 'analytics' ? 'Student Performance Analytics' :
                   activeSection === 'students' ? 'Student Management' :
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
                      // If you need to set the imported quiz, you'll need to fetch it first
                      // For now, just refresh the quizzes list with the new quiz ID
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
                                  <span>Pass: {quiz.passingScore}%</span>
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
                    const quiz = quizzes.find(q => q.id === (attempt.quizId || (attempt as any).quiz_id));
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
                          <p className="text-sm text-gray-600">Student ID: {attempt.studentId || (attempt as any).student_id}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${isPassed ? 'text-green-600' : 'text-red-600'}`}>
                            {attempt.score}% - {isPassed ? 'PASSED' : 'FAILED'}
                          </p>
                          <p className="text-sm text-gray-500">{formatDate(attempt.completedAt || (attempt as any).completed_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'analytics' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Quiz Performance Overview</h3>
                <div className="space-y-4">
                  {quizzes.map((quiz) => {
                    const stats = getQuizStats(quiz.id);
                    const passRate = stats.totalAttempts > 0 
                      ? Math.round((stats.passedAttempts / stats.totalAttempts) * 100)
                      : 0;
                    
                    return (
                      <div key={quiz.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium text-gray-900">{quiz.title}</h4>
                          <span className="text-sm text-gray-500">
                            {stats.totalAttempts} attempt{stats.totalAttempts !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-sm text-gray-500">Avg. Score</p>
                            <p className="text-lg font-semibold">{stats.averageScore}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Pass Rate</p>
                            <p className="text-lg font-semibold">
                              {passRate}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Passed</p>
                            <p className="text-lg font-semibold">
                              {stats.passedAttempts} / {stats.totalAttempts}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-800 mb-4">All Student Attempts</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
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
                        const quiz = quizzes.find(q => q.id === (attempt.quizId || (attempt as any).quiz_id));
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
                          <tr key={attempt.id} className="hover:bg-gray-50 transition-colors duration-150">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                              Student {attempt.studentId || (attempt as any).student_id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {quiz?.title || 'Unknown Quiz'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                              {attempt.score}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                                isPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {isPassed ? 'PASSED' : 'FAILED'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(attempt.completedAt || (attempt as any).completed_at)}
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
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Student Performance Summary</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from(new Set(attempts.map(a => a.studentId || (a as any).student_id))).map((studentId) => {
                  const studentAttempts = attempts.filter(a => (a.studentId || (a as any).student_id) === studentId);
                  const totalScore = studentAttempts.reduce((sum, a) => sum + a.score, 0);
                  const avgScore = Math.round(totalScore / studentAttempts.length);
                  const passedCount = studentAttempts.filter(a => a.score >= 50).length;
                  
                  return (
                    <div key={studentId} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors duration-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-gray-800">Student {studentId}</h4>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">System Statistics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">Total Quizzes:</span>
                      <span className="font-semibold text-gray-800">{quizzes.length}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">Total Questions:</span>
                      <span className="font-semibold text-gray-800">{quizzes.reduce((sum, q) => sum + q.questions.length, 0)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">Total Attempts:</span>
                      <span className="font-semibold text-gray-800">{attempts.length}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">Unique Students:</span>
                      <span className="font-semibold text-gray-800">{new Set(attempts.map(a => a.studentId || (a as any).student_id)).size}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Performance Metrics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">Overall Pass Rate:</span>
                      <span className="font-semibold text-green-600">
                        {attempts.length > 0 ? Math.round((attempts.filter(a => a.score >= 50).length / attempts.length) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">Average Score:</span>
                      <span className="font-semibold text-gray-800">
                        {attempts.length > 0 ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">Highest Score:</span>
                      <span className="font-semibold text-blue-600">
                        {attempts.length > 0 ? Math.max(...attempts.map(a => a.score)) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">Lowest Score:</span>
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
