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
   // Auto-navigate after user exit submission
   useEffect(() => {
    if (result && result.autoSubmitted && result.reason === 'user_exit') {
      const timer = setTimeout(() => {
        router.push('/student/dashboard');
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [result, router]);

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

  const handleAnswerChange = (questionId: string, answer: string | number, questionType: 'multiple-choice' | 'true-false') => {
    // Convert answer to appropriate type based on question type
    const formattedAnswer = questionType === 'true-false' 
      ? String(answer).toLowerCase() 
      : Number(answer);
    
    setAnswers(prev => ({ 
      ...prev, 
      [questionId]: formattedAnswer 
    }));
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
      const shouldSubmit = window.confirm(
        `You have ${unanswered.length} unanswered question(s). Are you sure you want to submit?`
      );
      
      if (!shouldSubmit) return;
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
      if (window.confirm('Are you sure you want to exit? Your quiz will be automatically submitted with current answers.')) {
        try {
          await handleAutoSubmit('user_exit');
        } catch (error) {
          console.error('Error during auto-submit:', error);
          // Still allow navigation even if submit fails
          router.push('/student/dashboard');
        }
        return;
      }
    } else {
      router.push('/student/dashboard');
    }
  };
  
  // Render question based on type
  const renderQuestion = (question: Question, index: number) => {
    if (question.type === 'true-false') {
      return (
        <div key={question.id} className="space-y-3">
          <div className="flex items-start">
            <span className="mr-2 font-medium text-indigo-700">{index + 1}.</span>
            <p className="text-gray-800">{question.question}</p>
          </div>
          <div className="ml-6 space-y-2">
            {['True', 'False'].map((option) => (
              <label 
                key={option} 
                className={`flex items-center p-3 rounded-lg border transition-all cursor-pointer hover:bg-gray-50 ${
                  answers[question.id] === option.toLowerCase() 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option.toLowerCase()}
                  checked={answers[question.id] === option.toLowerCase()}
                  onChange={() => handleAnswerChange(question.id, option, 'true-false')}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <span className="ml-3 text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }
    
    // Default to multiple choice
    return (
      <div key={question.id} className="space-y-3">
        <div className="flex items-start">
          <span className="mr-2 font-medium text-indigo-700">{index + 1}.</span>
          <p className="text-gray-800">{question.question}</p>
        </div>
        <div className="ml-6 space-y-2">
          {question.options?.map((option, optionIndex) => (
            <label 
              key={optionIndex} 
              className={`flex items-center p-3 rounded-lg border transition-all cursor-pointer hover:bg-gray-50 ${
                answers[question.id] === optionIndex 
                  ? 'border-indigo-500 bg-indigo-50' 
                  : 'border-gray-200'
              }`}
            >
              <input
                type="radio"
                name={`question-${question.id}`}
                value={optionIndex}
                checked={answers[question.id] === optionIndex}
                onChange={() => handleAnswerChange(question.id, optionIndex, 'multiple-choice')}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
              />
              <span className="ml-3 text-gray-700">{option}</span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Loading Quiz...</p>
          <p className="text-sm text-gray-500 mt-1">Please wait while we prepare your test</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-xl shadow-md text-center max-w-md w-full">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Quiz Not Found</h3>
          <p className="text-gray-500 mb-6">The requested quiz could not be found or you don't have permission to access it.</p>
          <button
            onClick={() => router.push('/student/dashboard')}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

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
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={handleBackToDashboard}
                disabled={submitting}
                className="group inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg 
                  className={`-ml-1 mr-2 h-5 w-5 text-indigo-500 group-hover:text-indigo-600 transition-transform group-hover:-translate-x-0.5 ${submitting ? 'opacity-50' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {submitting ? 'Submitting...' : 'Back to Dashboard'}
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                timeLeft < 300 
                  ? 'bg-red-100 text-red-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                ⏱️ {formatTime(timeLeft)}
              </div>
              <div className="text-sm text-gray-500">
                Question {currentQuestion + 1} of {quiz.questions.length}
              </div>
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
              <div className="space-y-6">
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
                      onChange={() => handleAnswerChange(currentQ.id, index, 'multiple-choice')}
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
                    onChange={() => handleAnswerChange(currentQ.id, 'true', 'true-false')}
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
                    onChange={() => handleAnswerChange(currentQ.id, 'false', 'true-false')}
                    className="mt-1 w-4 h-4 text-indigo-600 focus:ring-indigo-500 focus:ring-2"
                  />
                  <span className="text-gray-800 font-medium flex-1 leading-relaxed">✗ False</span>
                </label>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <button
              type="button"
              onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
              disabled={currentQuestion === 0 || submitting}
              className="inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous Question
            </button>
            
            {currentQuestion < quiz.questions.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  // Smooth scroll to top of next question
                  window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                  });
                  // Small delay for smooth experience
                  setTimeout(() => {
                    setCurrentQuestion(prev => prev + 1);
                  }, 150);
                }}
                disabled={submitting}
                className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next Question
                <svg className="ml-2 -mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-75 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Submit Quiz
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}