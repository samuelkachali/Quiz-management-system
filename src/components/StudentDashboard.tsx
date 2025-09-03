'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Quiz, User, QuizAttempt } from '@/types';

export default function StudentDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
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
      // Set empty arrays for now until quiz APIs are implemented
      setQuizzes([]);
      setAttempts([]);
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
    return attempts.find(attempt => attempt.quizId === quizId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Student Dashboard</h1>
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

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Quizzes</h2>

          {quizzes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg">No quizzes available</div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {quizzes.map((quiz) => {
                const attempt = getQuizAttempt(quiz.id);
                return (
                  <div key={quiz.id} className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">{quiz.title}</h3>
                      <p className="text-gray-600 text-sm mb-4">{quiz.description}</p>
                      <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                        <span>{quiz.questions.length} questions</span>
                        <span>Pass: {quiz.passingScore}%</span>
                      </div>
                      
                      {attempt ? (
                        <div className="space-y-2">
                          <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            attempt.passed 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {attempt.passed ? 'PASSED' : 'FAILED'}
                          </div>
                          <div className="text-sm text-gray-600">
                            Score: {attempt.score}%
                          </div>
                          <button
                            onClick={() => router.push(`/student/quiz/${quiz.id}`)}
                            className="w-full bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm font-medium"
                          >
                            Retake Quiz
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => router.push(`/student/quiz/${quiz.id}`)}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded text-sm font-medium"
                        >
                          Take Quiz
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {attempts.length > 0 && (
            <div className="mt-12">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Quiz History</h3>
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {attempts.map((attempt) => {
                    const quiz = quizzes.find(q => q.id === attempt.quizId);
                    return (
                      <li key={attempt.id} className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {quiz?.title || 'Unknown Quiz'}
                            </p>
                            <p className="text-sm text-gray-500">
                              Completed: {new Date(attempt.completedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-900">
                              Score: {attempt.score}%
                            </span>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              attempt.passed 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {attempt.passed ? 'PASSED' : 'FAILED'}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
