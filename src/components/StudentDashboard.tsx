'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Quiz, User, QuizAttempt } from '@/types';
import StudyGroupManager from './StudyGroupManager';

export default function StudentDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'home' | 'available' | 'history' | 'chat'>('home');
  const router = useRouter();
  const [oldHistoryPage, setOldHistoryPage] = useState(0);

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
          passing_score: quiz.passing_score,
          created_by: quiz.created_by,
          created_at: quiz.created_at,
          updated_at: quiz.updated_at,
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
    const quizAttempts = attempts.filter(attempt => attempt.quiz_id === quizId);
    if (quizAttempts.length === 0) return undefined;

    return quizAttempts.sort((a, b) => {
      const dateA = new Date(a.completed_at);
      const dateB = new Date(b.completed_at);
      return dateB.getTime() - dateA.getTime();
    })[0];
  };

  const isQuizUpdatedAfterAttempt = (quiz: Quiz, attempt: QuizAttempt | undefined) => {
    if (!attempt || !quiz.updated_at) return false;

    const quizUpdatedAt = new Date(quiz.updated_at);
    const attemptCompletedAt = new Date(attempt.completed_at);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-xl text-gray-700">Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  const renderHomeView = () => (
    <div className="relative">
      {/* Hero Section */}
      <div className="relative bg-white overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
          <div className="absolute top-8 right-8 w-4 h-4 bg-blue-500 rounded-full"></div>
          <div className="absolute top-16 right-16 w-2 h-2 bg-green-500 rounded-full"></div>
          <div className="absolute top-24 right-24 w-3 h-3 bg-pink-500 rounded-full"></div>
          <div className="absolute top-32 right-32 w-2 h-2 bg-yellow-500 rounded-full"></div>
        </div>
        
        <div className="absolute bottom-0 left-0 w-64 h-64 opacity-10">
          <div className="absolute bottom-8 left-8 w-3 h-3 bg-purple-500 rounded-full"></div>
          <div className="absolute bottom-16 left-16 w-2 h-2 bg-indigo-500 rounded-full"></div>
          <div className="absolute bottom-24 left-24 w-4 h-4 bg-red-500 rounded-full"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Welcome Back</span>
                </div>
                
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                  ARE YOU READY?
                  <br />
                  <span className="text-blue-600">BACK TO SCHOOL</span>
                </h1>
                
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-lg">
                  Welcome back, <span className="font-semibold text-gray-900">{user?.name}</span>! 
                  Ready to test your knowledge and continue your learning journey? 
                  Explore quizzes, track your progress, and achieve your goals.
                </p>
              </div>

              <button
                onClick={() => setActiveView('available')}
                className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-full text-base sm:text-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                START LEARNING
                <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Learning Progress</span>
                  <span>{attempts.length > 0 ? Math.round(attempts.reduce((acc, att) => acc + att.score, 0) / attempts.length) : 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${attempts.length > 0 ? Math.round(attempts.reduce((acc, att) => acc + att.score, 0) / attempts.length) : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Right Image */}
            <div className="relative">
              <div className="relative bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl p-8 shadow-2xl">
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center space-y-4">
                      <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">Ready to Learn?</h3>
                      <p className="text-gray-600">Start your quiz journey today</p>
                    </div>
                  </div>
                </div>
                
                {/* Floating Elements */}
                <div className="absolute -top-4 -right-4 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold">+</span>
                </div>
                <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center hover:shadow-xl transition-shadow duration-300">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{quizzes.length}</div>
              <div className="text-gray-600 font-medium">Total Quizzes</div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg text-center hover:shadow-xl transition-shadow duration-300">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{attempts.length}</div>
              <div className="text-gray-600 font-medium">Completed</div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg text-center hover:shadow-xl transition-shadow duration-300">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {attempts.length > 0 ? Math.round(attempts.reduce((acc, att) => acc + att.score, 0) / attempts.length) : 0}%
              </div>
              <div className="text-gray-600 font-medium">Average Score</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Quick Actions</h2>
            <p className="text-base sm:text-lg text-gray-600">Choose what you'd like to do next</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div 
              onClick={() => setActiveView('available')}
              className="group bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-blue-100"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">Take a Quiz</h3>
                <p className="text-gray-600 mb-6">Start learning with available quizzes</p>
                <div className="text-sm text-blue-600 font-medium">
                  {getAvailableQuizzes().length} Available →
                </div>
              </div>
            </div>

            <div 
              onClick={() => setActiveView('history')}
              className="group bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-green-100"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">View Progress</h3>
                <p className="text-gray-600 mb-6">Review your quiz history and results</p>
                <div className="text-sm text-green-600 font-medium">
                  {attempts.length} Attempts →
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAvailableQuizzes = () => {
    const availableQuizzes = quizzes; // Show ALL quizzes, not just filtered ones
    
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Available Quizzes</h2>
              <p className="text-gray-600">Ready to challenge yourself? Start a new quiz!</p>
            </div>
            <button
              onClick={() => setActiveView('home')}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Dashboard</span>
            </button>
          </div>
    
          {availableQuizzes.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No quizzes available</h3>
              <p className="text-gray-500">Check back later for new quizzes!</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {availableQuizzes.map((quiz) => {
                const attempt = getQuizAttempt(quiz.id);
                const isUpdated = isQuizUpdatedAfterAttempt(quiz, attempt);
                const isCompleted = attempt && !isUpdated;
                
                return (
                  <div key={quiz.id} className="bg-white overflow-hidden shadow-lg rounded-2xl border hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">{quiz.title}</h3>
                          {isUpdated && (
                            <div className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 mb-2">
                              🔄 Updated Quiz
                            </div>
                          )}
                          {isCompleted && (
                            <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              attempt.score >= 50
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {attempt.score >= 50 ? '✓ PASSED' : '✗ FAILED'}
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
                          <span>Pass: {quiz.passing_score}%</span>
                        </div>
                      </div>
                      
                      {isCompleted && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm text-gray-600">
                            Last Score: <span className="font-semibold text-gray-900">{attempt.score}%</span>
                          </div>
                        </div>
                      )}
                      
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
                        disabled={isCompleted}
                        className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg ${
                          isCompleted
                            ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                            : isUpdated
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white'
                            : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white'
                        }`}
                      >
                        {isCompleted ? 'Already Attempted' : 
                         isUpdated ? 'Retake Updated Quiz' : 'Start Quiz'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderQuizHistory = () => {
    const cutoffDate = new Date('2025-09-03'); // 03/09/2025
    const itemsPerPage = 3;
  
    // Separate attempts into recent and old
    const recentAttempts = attempts.filter(attempt => {
      const attemptDate = new Date(attempt.completed_at);
      return attemptDate > cutoffDate;
    });

    const oldAttempts = attempts.filter(attempt => {
      const attemptDate = new Date(attempt.completed_at);
      return attemptDate <= cutoffDate;
    });
  
    const totalOldPages = Math.ceil(oldAttempts.length / itemsPerPage);
    const paginatedOldAttempts = oldAttempts.slice(
      oldHistoryPage * itemsPerPage,
      (oldHistoryPage + 1) * itemsPerPage
    );
  
    const formatDate = (dateStr: string | Date) => {
      try {
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
      } catch {
        return 'Invalid Date';
      }
    };
  
    const renderAttemptCard = (attempt: any) => {
      const quiz = quizzes.find(q => q.id === attempt.quiz_id);
      const isPassed = attempt.score >= 50;

      return (
        <li key={attempt.id} className="px-6 py-5 hover:bg-gray-50/50 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <span>Completed: {formatDate(attempt.completed_at)}</span>
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
    };
  
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Quiz History</h2>
              <p className="text-gray-600">Track your progress and review past attempts</p>
            </div>
            <button
              onClick={() => setActiveView('home')}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Dashboard</span>
            </button>
          </div>
    
          {attempts.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No quiz history yet</h3>
              <p className="text-gray-500">Complete some quizzes to see your progress here!</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Recent History Section */}
              {recentAttempts.length > 0 && (
                <div>
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                      Recent History ({recentAttempts.length} attempts)
                    </h3>
                    <p className="text-gray-600">Your latest quiz attempts</p>
                  </div>
                  <div className="bg-white shadow-lg overflow-hidden rounded-2xl border">
                    <ul className="divide-y divide-gray-200">
                      {recentAttempts.map(renderAttemptCard)}
                    </ul>
                  </div>
                </div>
              )}
    
              {/* Old History Section */}
              {oldAttempts.length > 0 && (
                <div>
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center">
                      <div className="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                      Old History ({oldAttempts.length} attempts)
                    </h3>
                    <p className="text-gray-600">Quiz attempts from before September 3rd, 2025</p>
                  </div>
                  <div className="bg-white shadow-lg overflow-hidden rounded-2xl border">
                    <ul className="divide-y divide-gray-200">
                      {paginatedOldAttempts.map(renderAttemptCard)}
                    </ul>
                    
                    {/* Pagination Controls */}
                    {totalOldPages > 1 && (
                      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600">
                            Showing {oldHistoryPage * itemsPerPage + 1} to {Math.min((oldHistoryPage + 1) * itemsPerPage, oldAttempts.length)} of {oldAttempts.length} attempts
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setOldHistoryPage(Math.max(0, oldHistoryPage - 1))}
                              disabled={oldHistoryPage === 0}
                              className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                oldHistoryPage === 0
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                              }`}
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                              Previous
                            </button>
                            
                            <div className="flex items-center space-x-1">
                              {Array.from({ length: totalOldPages }, (_, i) => (
                                <button
                                  key={i}
                                  onClick={() => setOldHistoryPage(i)}
                                  className={`w-8 h-8 text-sm font-medium rounded-lg transition-colors ${
                                    i === oldHistoryPage
                                      ? 'bg-blue-600 text-white'
                                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                                  }`}
                                >
                                  {i + 1}
                                </button>
                              ))}
                            </div>
                            
                            <button
                              onClick={() => setOldHistoryPage(Math.min(totalOldPages - 1, oldHistoryPage + 1))}
                              disabled={oldHistoryPage === totalOldPages - 1}
                              className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                oldHistoryPage === totalOldPages - 1
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                              }`}
                            >
                              Next
                              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="block">
                  <nav className="flex space-x-4 overflow-x-auto sm:space-x-8">
                    <button
                      onClick={() => setActiveView('home')}
                      className={`px-3 py-2 text-xs sm:text-sm whitespace-nowrap font-medium transition-colors ${
                        activeView === 'home'
                          ? 'text-gray-900 border-b-2 border-blue-500'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      HOME
                    </button>
                    <button
                      onClick={() => setActiveView('available')}
                      className={`px-3 py-2 text-xs sm:text-sm whitespace-nowrap font-medium transition-colors ${
                        activeView === 'available'
                          ? 'text-gray-900 border-b-2 border-blue-500'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      QUIZZES
                    </button>
                    <button
                      onClick={() => setActiveView('history')}
                      className={`px-3 py-2 text-xs sm:text-sm whitespace-nowrap font-medium transition-colors ${
                        activeView === 'history'
                          ? 'text-gray-900 border-b-2 border-blue-500'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      HISTORY
                    </button>
                    <button
                      onClick={() => setActiveView('chat')}
                      className={`px-3 py-2 text-xs sm:text-sm whitespace-nowrap font-medium transition-colors ${
                        activeView === 'chat'
                          ? 'text-gray-900 border-b-2 border-blue-500'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      STUDY CHAT
                    </button>
                  </nav>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block">
                <span className="text-gray-600 text-sm">Welcome,</span>
                <span className="text-gray-900 font-semibold ml-1">{user?.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="transition-all duration-500 ease-in-out">
        {activeView === 'home' && renderHomeView()}
        {activeView === 'available' && renderAvailableQuizzes()}
        {activeView === 'history' && renderQuizHistory()}
        {activeView === 'chat' && (
          <div className="bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white">Study Groups & Chat</h2>
                      <p className="text-indigo-100">Collaborate with your peers in real-time</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => setActiveView('home')}
                        className="text-indigo-100 hover:text-white transition-colors flex items-center space-x-1 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span>Back to Dashboard</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Unified Study Groups & Chat */}
                <div className="p-6">
                  <div className="max-w-7xl mx-auto">
                    <div className="bg-white rounded-xl">
                      <StudyGroupManager embedded showDebug={false} />
                    </div>

                    {/* Why Join Study Groups? */}
                    <div className="mt-10 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-100">
                      <div className="text-center max-w-4xl mx-auto">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Why Join Study Groups?</h3>
                        <p className="text-gray-600 mb-8 max-w-2xl mx-auto">Enhance your learning experience through collaboration and shared knowledge</p>
                        <div className="grid md:grid-cols-3 gap-6">
                          <div className="bg-white p-6 rounded-xl border border-gray-100 hover:border-indigo-100 hover:shadow-sm transition-all">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                              <span className="text-white text-xl">🤝</span>
                            </div>
                            <h4 className="font-semibold text-gray-900 mb-2">Collaborative Learning</h4>
                            <p className="text-gray-600 text-sm leading-relaxed">Engage in real-time discussions, share insights, and learn from diverse perspectives with your peers.</p>
                          </div>
                          <div className="bg-white p-6 rounded-xl border border-gray-100 hover:border-green-100 hover:shadow-sm transition-all">
                            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                              <span className="text-white text-xl">📚</span>
                            </div>
                            <h4 className="font-semibold text-gray-900 mb-2">Better Preparation</h4>
                            <p className="text-gray-600 text-sm leading-relaxed">Clarify doubts, discuss complex topics, and access shared resources for comprehensive exam preparation.</p>
                          </div>
                          <div className="bg-white p-6 rounded-xl border border-gray-100 hover:border-purple-100 hover:shadow-sm transition-all">
                            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                              <span className="text-white text-xl">🎯</span>
                            </div>
                            <h4 className="font-semibold text-gray-900 mb-2">Higher Success</h4>
                            <p className="text-gray-600 text-sm leading-relaxed">Studies show that collaborative learning leads to better retention and higher academic performance.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}