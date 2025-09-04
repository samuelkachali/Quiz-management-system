'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Quiz, User, QuizAttempt } from '@/types';

export default function StudentDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'home' | 'available' | 'history'>('home');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/student/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'student') {
      router.push('/student/login');
      return;
    }

    setUser(parsedUser);
    fetchData(token);
  }, [router]);

  const fetchData = async (token: string) => {
    try {
      console.log('Fetching student data...');
      
      // Fetch available quizzes
      const quizzesResponse = await fetch('/api/quizzes', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Quizzes response status:', quizzesResponse.status);
      
      if (quizzesResponse.ok) {
        const quizzesData = await quizzesResponse.json();
        console.log('Quizzes data received:', quizzesData);
        
        // Transform database format to frontend format
        const transformedQuizzes = (quizzesData.quizzes || []).map((quiz: any) => ({
          ...quiz,
          passingScore: quiz.passing_score || quiz.passingScore,
          createdBy: quiz.created_by || quiz.createdBy,
          createdAt: quiz.created_at || quiz.createdAt,
          updatedAt: quiz.updated_at || quiz.updatedAt,
        }));
        
        console.log('Transformed quizzes:', transformedQuizzes);
        setQuizzes(transformedQuizzes);
      } else {
        const errorData = await quizzesResponse.json();
        console.error('Failed to fetch quizzes:', errorData);
        setQuizzes([]);
      }

      // Fetch quiz attempts
      const attemptsResponse = await fetch('/api/quiz-attempts', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Attempts response status:', attemptsResponse.status);

      if (attemptsResponse.ok) {
        const attemptsData = await attemptsResponse.json();
        console.log('Attempts data received:', attemptsData);
        setAttempts(attemptsData.attempts || []);
      } else {
        const errorData = await attemptsResponse.json();
        console.error('Failed to fetch attempts:', errorData);
        setAttempts([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
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

  const getQuizAttempt = (quizId: string) => {
    const quizAttempts = attempts.filter(attempt => (attempt.quizId || attempt.quizId) === quizId);
    if (quizAttempts.length === 0) return undefined;
    
    return quizAttempts.sort((a, b) => {
      const dateA = new Date(a.completedAt || (a as any).completed_at);
      const dateB = new Date(b.completedAt || (b as any).completed_at);
      return dateB.getTime() - dateA.getTime();
    })[0];
  };

  const isQuizUpdatedAfterAttempt = (quiz: Quiz, attempt: QuizAttempt | undefined) => {
    if (!attempt || !quiz.updatedAt) return false;
    
    const quizUpdatedAt = new Date(quiz.updatedAt);
    const attemptCompletedAt = new Date(attempt.completedAt || (attempt as any).completed_at);
    
    return quizUpdatedAt > attemptCompletedAt;
  };

  const getAvailableQuizzes = () => {
    return quizzes.filter(quiz => {
      const attempt = getQuizAttempt(quiz.id);
      return !attempt || isQuizUpdatedAfterAttempt(quiz, attempt);
    });
  };

  const getAttemptedQuizzes = () => {
    return quizzes.filter(quiz => {
      const attempt = getQuizAttempt(quiz.id);
      return attempt && !isQuizUpdatedAfterAttempt(quiz, attempt);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-700">Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  const renderHomeView = () => (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl mb-6 shadow-lg">
          <span className="text-white text-3xl font-bold">Q</span>
        </div>
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome back, <span className="text-indigo-600">{user?.name}</span>!
        </h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Ready to test your knowledge? Choose what you'd like to explore today.
        </p>
      </div>

      {/* Navigation Cards */}
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Available Quizzes Card */}
        <div 
          onClick={() => setActiveView('available')}
          className="group bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 cursor-pointer hover:-translate-y-2 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-indigo-600 transition-colors">
              Available Quizzes
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Discover new quizzes and test your knowledge on fresh topics
            </p>
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>{getAvailableQuizzes().length} Available</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span>Start Learning</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quiz History Card */}
        <div 
          onClick={() => setActiveView('history')}
          className="group bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 cursor-pointer hover:-translate-y-2 hover:bg-gradient-to-br hover:from-emerald-50 hover:to-teal-50"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-emerald-600 transition-colors">
              Quiz History
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Review your past attempts and track your learning progress
            </p>
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>{attempts.length} Attempts</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span>View Results</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-12">
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20">
          <div className="text-3xl font-bold text-indigo-600 mb-2">{quizzes.length}</div>
          <div className="text-gray-600">Total Quizzes</div>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20">
          <div className="text-3xl font-bold text-emerald-600 mb-2">{attempts.length}</div>
          <div className="text-gray-600">Completed</div>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20">
          <div className="text-3xl font-bold text-purple-600 mb-2">
            {attempts.length > 0 ? Math.round(attempts.reduce((acc, att) => acc + att.score, 0) / attempts.length) : 0}%
          </div>
          <div className="text-gray-600">Average Score</div>
        </div>
      </div>
    </div>
  );

  const renderAvailableQuizzes = () => {
    const availableQuizzes = getAvailableQuizzes();
    
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Available Quizzes</h2>
            <p className="text-gray-600">Ready to challenge yourself? Start a new quiz!</p>
          </div>
          <button
            onClick={() => setActiveView('home')}
            className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Dashboard</span>
          </button>
        </div>

        {availableQuizzes.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No available quizzes</h3>
            <p className="text-gray-500">All quizzes have been completed or check back later for new ones!</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {availableQuizzes.map((quiz) => {
              const attempt = getQuizAttempt(quiz.id);
              const isUpdated = isQuizUpdatedAfterAttempt(quiz, attempt);
              return (
                <div key={quiz.id} className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg rounded-xl border border-white/20 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{quiz.title}</h3>
                        {isUpdated && (
                          <div className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 mb-2">
                            🔄 Updated Quiz
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{quiz.description}</p>
                    <div className="flex justify-between items-center text-sm text-gray-500 mb-6">
                      <div className="flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{quiz.questions.length} questions</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        <span>Pass: {quiz.passingScore}%</span>
                      </div>
                    </div>
                    
                    {attempt && isUpdated && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-sm text-blue-800">
                          <div className="font-semibold">Quiz has been updated!</div>
                          <div>Previous Score: <span className="font-semibold">{attempt.score}%</span></div>
                          <div className="text-xs mt-1">You can retake this quiz</div>
                        </div>
                      </div>
                    )}
                    
                    <button
                      onClick={() => router.push(`/student/quiz/${quiz.id}`)}
                      className="w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
                    >
                      {isUpdated ? 'Retake Updated Quiz' : 'Start Quiz'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderQuizHistory = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Quiz History</h2>
          <p className="text-gray-600">Track your progress and review past attempts</p>
        </div>
        <button
          onClick={() => setActiveView('home')}
          className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Dashboard</span>
        </button>
      </div>

      {attempts.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No quiz history yet</h3>
          <p className="text-gray-500">Complete some quizzes to see your progress here!</p>
        </div>
      ) : (
        <div className="bg-white/70 backdrop-blur-sm shadow-lg overflow-hidden rounded-xl border border-white/20">
          <ul className="divide-y divide-gray-200/50">
            {attempts.map((attempt) => {
              const quiz = quizzes.find(q => q.id === (attempt.quizId || attempt.quizId));
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
                <li key={attempt.id} className="px-6 py-5 hover:bg-gray-50/50 transition-colors duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-base font-semibold text-gray-900">
                            {quiz?.title || 'Unknown Quiz'}
                          </p>
                          <p className="text-sm text-gray-500 flex items-center space-x-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>Completed: {formatDate(attempt.completedAt || attempt.completedAt)}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          {attempt.score}%
                        </div>
                        <div className="text-xs text-gray-500">Score</div>
                      </div>
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                        isPassed 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {isPassed ? '✓ PASSED' : '✗ FAILED'}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">Q</span>
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Student Dashboard
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block">
                <span className="text-gray-600 text-sm">Welcome back,</span>
                <span className="text-gray-900 font-semibold ml-1">{user?.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="transition-all duration-500 ease-in-out">
            {activeView === 'home' && renderHomeView()}
            {activeView === 'available' && renderAvailableQuizzes()}
            {activeView === 'history' && renderQuizHistory()}
          </div>
        </div>
      </div>
    </div>
  );
}