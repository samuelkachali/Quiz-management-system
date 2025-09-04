'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Quiz, Question } from '@/types';

interface QuizTakerProps {
  quizId: string;
}

export default function QuizTaker({ quizId }: QuizTakerProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<{ [questionId: string]: string | number }>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(2 * 60 * 60); // 2 hours in seconds
  const [timerExpired, setTimerExpired] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const hasSubmittedRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/student/login');
      return;
    }

    fetchQuiz(token);
  }, [quizId, router]);

  // Timer effect
  useEffect(() => {
    if (timeLeft <= 0 && !result && !timerExpired) {
      setTimerExpired(true);
      handleAutoSubmit('timer_expired');
      return;
    }

    if (result || timerExpired) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, result, timerExpired]);

  // Auto-submit on page unload/exit
  useEffect(() => {
    if (!quiz || result || hasSubmittedRef.current) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (quizStarted && !result && !hasSubmittedRef.current) {
        // Submit quiz silently before page unloads
        submitQuizOnExit();
        e.preventDefault();
        e.returnValue = '';
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && quizStarted && !result && !hasSubmittedRef.current) {
        submitQuizOnExit();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [quiz, quizStarted, result]);

  // Mark quiz as started when user first interacts
  useEffect(() => {
    if (quiz && !loading && !quizStarted) {
      setQuizStarted(true);
    }
  }, [quiz, loading, quizStarted]);

  const submitQuizOnExit = async () => {
    if (hasSubmittedRef.current || !quiz) return;
    
    hasSubmittedRef.current = true;
    
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/quiz-attempts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          quizId, 
          answers,
          exitedEarly: true 
        }),
        keepalive: true // Ensures request completes even if page is closing
      });
    } catch (error) {
      console.error('Exit submit error:', error);
    }
  };

  const fetchQuiz = async (token: string) => {
    try {
      const response = await fetch(`/api/quizzes/${quizId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        const quiz = {
          ...data.quiz,
          passingScore: data.quiz.passing_score || data.quiz.passingScore,
          createdBy: data.quiz.created_by || data.quiz.createdBy,
          createdAt: data.quiz.created_at || data.quiz.createdAt
        };
        setQuiz(quiz);
      } else {
        alert('Quiz not found');
        router.push('/student/dashboard');
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId: string, answer: string | number) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleAutoSubmit = async (reason: string = 'auto') => {
    if (!quiz || hasSubmittedRef.current) return;
    
    hasSubmittedRef.current = true;
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/quiz-attempts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          quizId, 
          answers,
          autoSubmitted: true,
          reason 
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResult(data);
      } else {
        alert(data.message || 'Failed to submit quiz');
      }
    } catch (error) {
      console.error('Auto-submit error:', error);
      alert('An error occurred during auto-submit.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!quiz || hasSubmittedRef.current) return;

    // Check if all questions are answered
    const unanswered = quiz.questions.filter(q => !(q.id in answers));
    if (unanswered.length > 0) {
      alert(`Please answer all questions. ${unanswered.length} question(s) remaining.`);
      return;
    }

    hasSubmittedRef.current = true;
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/quiz-attempts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ quizId, answers }),
      });

      const data = await response.json();
      if (data.success) {
        setResult(data);
      } else {
        alert(data.message || 'Failed to submit quiz');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToDashboard = async () => {
    if (quizStarted && !result && !hasSubmittedRef.current) {
      const confirmed = confirm('Are you sure you want to exit? Your quiz will be automatically submitted with current answers.');
      if (confirmed) {
        await handleAutoSubmit('user_exit');
        // Don't navigate immediately, let the result state update first
        // Navigation will happen automatically when result is set
        return;
      }
    } else {
      router.push('/student/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading quiz...</div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Quiz not found</div>
      </div>
    );
  }

  // Auto-navigate after user exit submission
  useEffect(() => {
    if (result && result.autoSubmitted && result.reason === 'user_exit') {
      const timer = setTimeout(() => {
        router.push('/student/dashboard');
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [result, router]);

  if (result) {
    const isPassed = result.attempt.score >= 50;
    const isUserExit = result.autoSubmitted && result.reason === 'user_exit';
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className={`text-6xl mb-4 ${isPassed ? 'text-green-500' : 'text-red-500'}`}>
            {isPassed ? '✅' : '❌'}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isPassed ? 'Congratulations!' : 'Try Again Next Time'}
          </h2>
          <p className="text-gray-600 mb-4">
            You scored {result.attempt.score}% on "{result.quiz.title}"
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Passing score: {result.quiz.passingScore}%
          </p>
          {timerExpired && (
            <p className="text-sm text-red-600 mb-4">
              ⏰ Time expired - Quiz was automatically submitted
            </p>
          )}
          {isUserExit && (
            <div className="mb-4">
              <p className="text-sm text-orange-600 mb-2">
                📤 Quiz was submitted when you exited
              </p>
              <p className="text-xs text-gray-500">
                Returning to dashboard in 2 seconds...
              </p>
            </div>
          )}
          <div className="space-y-3">
            {!isUserExit && (
              <button
                onClick={() => router.push('/student/dashboard')}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium"
              >
                Back to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const currentQ = quiz.questions[currentQuestion];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={handleBackToDashboard}
                className="text-indigo-600 hover:text-indigo-500 mr-4"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-xl font-semibold text-gray-900">{quiz.title}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`px-3 py-1 rounded-lg text-sm font-medium ${
                timeLeft <= 300 ? 'bg-red-100 text-red-800' : 
                timeLeft <= 900 ? 'bg-yellow-100 text-yellow-800' : 
                'bg-green-100 text-green-800'
              }`}>
                ⏰ {formatTime(timeLeft)}
              </div>
              <span className="text-gray-700">
                Question {currentQuestion + 1} of {quiz.questions.length}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {currentQ.question}
            </h3>

            {currentQ.type === 'multiple-choice' && currentQ.options && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-3">Select one answer:</p>
                {currentQ.options.map((option, index) => (
                  <label 
                    key={index} 
                    className="flex items-start space-x-4 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200"
                  >
                    <input
                      type="radio"
                      name={`question-${currentQ.id}`}
                      value={index}
                      checked={answers[currentQ.id] === index}
                      onChange={() => handleAnswerChange(currentQ.id, index)}
                      className="mt-1 w-4 h-4 text-indigo-600 focus:ring-indigo-500 focus:ring-2"
                    />
                    <span className="text-gray-800 font-medium flex-1 leading-relaxed">
                      {String.fromCharCode(65 + index)}. {option}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {currentQ.type === 'true-false' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-3">Select True or False:</p>
                <label className="flex items-start space-x-4 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200">
                  <input
                    type="radio"
                    name={`question-${currentQ.id}`}
                    value="true"
                    checked={answers[currentQ.id] === 'true'}
                    onChange={() => handleAnswerChange(currentQ.id, 'true')}
                    className="mt-1 w-4 h-4 text-indigo-600 focus:ring-indigo-500 focus:ring-2"
                  />
                  <span className="text-gray-800 font-medium flex-1 leading-relaxed">✓ True</span>
                </label>
                <label className="flex items-start space-x-4 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200">
                  <input
                    type="radio"
                    name={`question-${currentQ.id}`}
                    value="false"
                    checked={answers[currentQ.id] === 'false'}
                    onChange={() => handleAnswerChange(currentQ.id, 'false')}
                    className="mt-1 w-4 h-4 text-indigo-600 focus:ring-indigo-500 focus:ring-2"
                  />
                  <span className="text-gray-800 font-medium flex-1 leading-relaxed">✗ False</span>
                </label>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {currentQuestion === quiz.questions.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestion(Math.min(quiz.questions.length - 1, currentQuestion + 1))}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}