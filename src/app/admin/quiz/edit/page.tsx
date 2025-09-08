'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Quiz, Question } from '@/types';

// Move the main component logic to a separate component
function EditQuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quizId = searchParams.get('id');
  
  const [quiz, setQuiz] = useState<Quiz>({
    id: '',
    title: '',
    description: '',
    passingScore: 60,
    questions: [],
    createdBy: '',
    createdAt: new Date(),
    is_published: false
  });
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchQuiz = async () => {
      if (!quizId) return;
      
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/quizzes/${quizId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch quiz');
        }

        const data = await response.json();
        
        if (data.success) {
          // Transform the data to match the expected format
          const formattedQuiz = {
            ...data.quiz,
            questions: data.quiz.questions?.map((q: any) => ({
              ...q,
              id: q.id,
              question: q.question || q.question_text || q.text || '',
              type: (q.question_type || q.type || 'multiple-choice') as 'multiple-choice' | 'true-false',
              options: q.options || [],
              correctAnswer: q.correct_answer !== undefined ? q.correct_answer : 0,
              points: q.points || 1,
              explanation: q.explanation || ''
            })) || []
          };
          setQuiz(formattedQuiz);
        } else {
          throw new Error(data.message || 'Failed to load quiz');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [quizId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz) return;
    
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      const formattedQuiz = {
        ...quiz,
        questions: quiz.questions.map(q => ({
          id: q.id,
          question: q.question,
          type: q.type,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation
        }))
      };
      
      const response = await fetch(`/api/quizzes/${quizId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formattedQuiz),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update quiz');
      }

      if (data.success) {
        router.push('/admin?section=quizzes');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update quiz');
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuestion = () => {
    if (!quiz) return;
    
    const newQuestion: Question = {
      id: `temp-${Date.now()}`,
      question: '',
      type: 'multiple-choice',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
      points: 1
    };
    
    const updatedQuestions = [...(quiz.questions || []), newQuestion];
    
    setQuiz({
      ...quiz,
      questions: updatedQuestions
    });
    
    setEditingQuestion(newQuestion);
    setEditingQuestionIndex(updatedQuestions.length - 1);
  };

  const handleEditQuestion = (index: number) => {
    if (!quiz?.questions?.[index]) return;
    setEditingQuestionIndex(index);
    setEditingQuestion({ ...quiz.questions[index] });
  };

  const handleSaveQuestion = () => {
    if (editingQuestionIndex === null || !editingQuestion || !quiz?.questions) return;
    
    const updatedQuestions = [...quiz.questions];
    updatedQuestions[editingQuestionIndex] = editingQuestion as Question;
    
    setQuiz({
      ...quiz,
      questions: updatedQuestions
    });
    
    setEditingQuestionIndex(null);
    setEditingQuestion(null);
  };

  const handleRemoveQuestion = (index: number) => {
    if (!quiz?.questions || !confirm('Are you sure you want to remove this question?')) return;
    
    const updatedQuestions = [...quiz.questions];
    updatedQuestions.splice(index, 1);
    
    setQuiz({
      ...quiz,
      questions: updatedQuestions
    });
    
    if (editingQuestionIndex === index) {
      setEditingQuestionIndex(null);
      setEditingQuestion(null);
    } else if (editingQuestionIndex !== null && editingQuestionIndex > index) {
      setEditingQuestionIndex(editingQuestionIndex - 1);
    }
  };

  const handleAddOption = () => {
    if (!editingQuestion) return;
    setEditingQuestion({
      ...editingQuestion,
      options: [...(editingQuestion.options || []), '']
    });
  };

  const handleRemoveOption = (optionIndex: number) => {
    if (!editingQuestion?.options) return;
    
    const newOptions = [...editingQuestion.options];
    newOptions.splice(optionIndex, 1);
    
    setEditingQuestion({
      ...editingQuestion,
      options: newOptions,
      correctAnswer: (Number(editingQuestion.correctAnswer) || 0) === optionIndex ? 0 : 
                     ((Number(editingQuestion.correctAnswer) || 0) > optionIndex ? (Number(editingQuestion.correctAnswer) || 0) - 1 : (Number(editingQuestion.correctAnswer) || 0))
    });
  };

  if (loading || !quiz) {
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
              <p className="text-sm text-red-700">
                {error}. <button onClick={() => router.push('/admin?section=quizzes')} className="font-medium underline">Back to quizzes</button>
              </p>
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
              <p className="text-sm text-yellow-700">
                Quiz not found. <button onClick={() => router.push('/admin?section=quizzes')} className="font-medium underline">Back to quizzes</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Quiz</h1>
        <p className="mt-1 text-sm text-gray-500">Update the quiz details below.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Title
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="title"
                    id="title"
                    required
                    value={quiz.title}
                    onChange={(e) => setQuiz({...quiz, title: e.target.value})}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <div className="mt-1">
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    value={quiz.description || ''}
                    onChange={(e) => setQuiz({...quiz, description: e.target.value})}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="passingScore" className="block text-sm font-medium text-gray-700">
                  Passing Score (%)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    name="passingScore"
                    id="passingScore"
                    min="0"
                    max="100"
                    required
                    value={quiz.passingScore}
                    onChange={(e) => setQuiz({...quiz, passingScore: parseInt(e.target.value)})}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Questions</h3>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleAddQuestion();
                  }}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Add Question
                </button>
              </div>

              <div className="space-y-4">
                {quiz.questions?.map((question: Question, qIndex: number) => (
                  <div key={qIndex} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {question.question || 'Untitled Question'}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">
                          {question.type === 'multiple-choice' 
                            ? 'Multiple Choice' 
                            : 'True/False'}
                        </p>
                        
                        {question.type === 'multiple-choice' && question.options && (
                          <div className="mt-3 ml-4 space-y-2">
                            <p className="text-xs font-medium text-gray-500 mb-1">OPTIONS:</p>
                            <div className="space-y-2">
                              {question.options?.map((option: string, oIndex: number) => (
                                <div 
                                  key={oIndex} 
                                  className={`p-2 rounded border ${question.correctAnswer === oIndex ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}
                                >
                                  <div className="flex items-start">
                                    <div className={`flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center mr-2 mt-0.5 ${
                                      question.correctAnswer === oIndex ? 'bg-green-100 text-green-700 font-medium' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                      {String.fromCharCode(65 + oIndex)}
                                    </div>
                                    <div className="flex-1">
                                      <span className={`text-sm ${question.correctAnswer === oIndex ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                                        {option || <span className="text-gray-400 italic">[Empty option]</span>}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {question.type === 'true-false' && (
                          <div className="mt-3 ml-4">
                            <p className="text-sm">
                              <span className={`${question.correctAnswer === 1 ? 'font-medium text-green-700' : 'text-gray-700'}`}>
                                {question.correctAnswer === 1 ? 'True' : 'False'}
                                {question.correctAnswer !== undefined && (
                                  <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                    Correct Answer
                                  </span>
                                )}
                              </span>
                            </p>
                          </div>
                        )}
                        
                        {question.explanation && (
                          <div className="mt-2 ml-4">
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Explanation:</span>{' '}
                              {question.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-4 flex space-x-2">
                        <button
                          type="button"
                          onClick={() => handleEditQuestion(qIndex)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(qIndex)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {(!quiz.questions || quiz.questions.length === 0) && (
                  <div className="text-center py-6 text-gray-500 bg-gray-50 rounded border-2 border-dashed border-gray-300">
                    <p>No questions added yet.</p>
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="mt-2 inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Add First Question
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-8 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.push('/admin/dashboard')}
                className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Quiz'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function EditQuizPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <EditQuizContent />
    </Suspense>
  );
}
