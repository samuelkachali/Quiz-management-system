'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import QuizCreator from '@/components/QuizCreator';

type Quiz = {
  id: string;
  title: string;
  description: string;
  questions: Array<{
    id: string;
    question: string;
    type: 'multiple-choice' | 'true-false';
    options?: string[];
    correctAnswer: number | string;
  }>;
  passingScore: number;
};

export default function EditQuizPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Transform API response to match QuizCreator's expected format
  const transformQuizData = (apiQuiz: any): Quiz | null => {
    if (!apiQuiz) return null;
    
    return {
      id: apiQuiz.id,
      title: apiQuiz.title,
      description: apiQuiz.description,
      passingScore: apiQuiz.passing_score || apiQuiz.passingScore || 60,
      questions: Array.isArray(apiQuiz.questions) ? apiQuiz.questions.map((q: any) => ({
        id: q.id || `temp-${Math.random().toString(36).substr(2, 9)}`,
        question: q.question || q.question_text || '',
        type: q.type || (q.question_type === 'true_false' ? 'true-false' : 'multiple-choice'),
        options: Array.isArray(q.options) 
          ? q.options 
          : (q.type === 'multiple-choice' ? ['', '', '', ''] : undefined),
        correctAnswer: q.correctAnswer || 0
      })) : []
    };
  };

  const quizId = searchParams.get('id');

  useEffect(() => {
    const fetchQuiz = async () => {
      if (!quizId) {
        setError('No quiz ID provided');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      try {
        const response = await fetch(`/api/quizzes/${quizId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch quiz');
        }

        const data = await response.json();
        if (data.success && data.quiz) {
          const transformedQuiz = transformQuizData(data.quiz);
          if (!transformedQuiz) {
            throw new Error('Invalid quiz data format');
          }
          setQuiz(transformedQuiz);
        } else {
          throw new Error(data.message || 'Failed to load quiz data');
        }
      } catch (err) {
        console.error('Error fetching quiz:', err);
        setError('Failed to load quiz. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [quizId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">No quiz data available. Please try again or contact support.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Edit Quiz: {quiz.title}</h1>
        <button
          onClick={() => router.push('/admin/dashboard')}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Back to Dashboard
        </button>
      </div>
      <div className="bg-white shadow rounded-lg p-6">
        <QuizCreator initialQuiz={quiz} isEditing={true} />
      </div>
    </div>
  );
}
