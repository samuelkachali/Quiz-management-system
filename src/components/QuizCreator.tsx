'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Question = {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false';
  options?: string[];
  correctAnswer: number | string;
};

type QuizCreatorProps = {
  initialQuiz?: {
    id?: string;
    title?: string;
    description?: string;
    questions: Question[];
    passingScore: number;
  };
  isEditing?: boolean;
};

export default function QuizCreator({ initialQuiz, isEditing = false }: QuizCreatorProps) {
  const [title, setTitle] = useState(initialQuiz?.title || '');
  const [description, setDescription] = useState(initialQuiz?.description || '');
  const [passingScore, setPassingScore] = useState(initialQuiz?.passingScore || 60);
  const [questions, setQuestions] = useState<Question[]>(initialQuiz?.questions || []);
  const [loading, setLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  
  const handleNavigation = (path: string) => {
    if (loading || isNavigating) return;
    setIsNavigating(true);
    router.push(path);
  };
  const router = useRouter();

  const addQuestion = () => {
    if (loading) return;
    
    const newQuestion: Question = {
      id: Date.now().toString(),
      question: '',
      type: 'multiple-choice',
      options: ['', '', '', ''],
      correctAnswer: 0
    };
    
    // Add a small delay for better UX
    setLoading(true);
    setTimeout(() => {
      setQuestions([...questions, newQuestion]);
      setLoading(false);
      
      // Scroll to the newly added question
      setTimeout(() => {
        const elements = document.querySelectorAll('[data-question]');
        if (elements.length > 0) {
          elements[elements.length - 1].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 50);
    }, 150);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    setQuestions(prevQuestions => {
      const updated = [...prevQuestions];
      const currentQuestion = { ...updated[index] };
      
      if (field === 'type') {
        const newType = value as 'multiple-choice' | 'true-false';
        
        // Create a new question object with the updated type and appropriate defaults
        updated[index] = {
          ...currentQuestion,
          type: newType,
          options: newType === 'true-false' ? ['True', 'False'] : ['', '', '', ''],
          correctAnswer: newType === 'true-false' ? 'true' : 0
        };
      } else if (field === 'correctAnswer') {
        // For true/false questions, ensure we're using string comparison
        if (currentQuestion.type === 'true-false') {
          updated[index] = {
            ...currentQuestion,
            correctAnswer: String(value)
          };
        } else {
          // For multiple choice, use number for the index
          updated[index] = {
            ...currentQuestion,
            correctAnswer: Number(value)
          };
        }
      } else {
        updated[index] = {
          ...currentQuestion,
          [field]: value
        };
      }
      
      return updated;
    });
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions];
    if (updated[questionIndex].options) {
      updated[questionIndex].options![optionIndex] = value;
    }
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    if (loading) return;
    
    // Add confirmation dialog before removing
    if (window.confirm('Are you sure you want to remove this question?')) {
      setLoading(true);
      setTimeout(() => {
        setQuestions(questions.filter((_, i) => i !== index));
        setLoading(false);
      }, 100);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    if (questions.length === 0) {
      alert('Please add at least one question');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = isEditing && initialQuiz?.id 
        ? `/api/quizzes/${initialQuiz.id}` 
        : '/api/quizzes';
      
      const method = isEditing && initialQuiz?.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          questions,
          passingScore
        }),
      });

      const data = await response.json();
      if (data.success) {
        router.push('/admin/dashboard');
        router.refresh();
      } else {
        alert(data.message || `Failed to ${isEditing ? 'update' : 'create'} quiz`);
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => handleNavigation('/admin/dashboard')}
                disabled={loading || isNavigating}
                className="group flex items-center text-indigo-600 hover:text-indigo-500 mr-4 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isNavigating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1.5 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Dashboard
                  </>
                )}
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Create New Quiz</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              {isEditing ? 'Edit Quiz' : 'Create New Quiz'}
            </h2>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter quiz title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter quiz description"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Passing Score (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={passingScore}
                  onChange={(e) => setPassingScore(Number(e.target.value))}
                  className="mt-1 block w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Questions</h2>
              <button
                type="button"
                onClick={addQuestion}
                disabled={loading}
                className="inline-flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Question
              </button>
            </div>

            {questions.map((question, questionIndex) => (
              <div key={question.id} data-question={questionIndex} className="border border-gray-200 rounded-lg p-4 mb-4 transition-all duration-200 hover:shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-md font-medium text-gray-900">Question {questionIndex + 1}</h3>
                  <button
                    type="button"
                    onClick={() => removeQuestion(questionIndex)}
                    disabled={loading}
                    className="inline-flex items-center text-red-600 hover:text-red-800 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Remove
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Question Text</label>
                    <input
                      type="text"
                      required
                      value={question.question}
                      onChange={(e) => updateQuestion(questionIndex, 'question', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter your question"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Question Type</label>
                    <select
                      value={question.type}
                      onChange={(e) => {
                        const newType = e.target.value as 'multiple-choice' | 'true-false';
                        updateQuestion(questionIndex, 'type', newType);
                      }}
                      className="mt-1 block w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="multiple-choice">Multiple Choice</option>
                      <option value="true-false">True/False</option>
                    </select>
                  </div>

                  {question.type === 'multiple-choice' && question.options && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                      {question.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center space-x-2 mb-2">
                          <input
                            type="radio"
                            name={`correct-${questionIndex}`}
                            checked={question.correctAnswer === optionIndex}
                            onChange={() => updateQuestion(questionIndex, 'correctAnswer', optionIndex)}
                            className="text-indigo-600"
                          />
                          <input
                            type="text"
                            required
                            value={option}
                            onChange={(e) => updateOption(questionIndex, optionIndex, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder={`Option ${optionIndex + 1}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {question.type === 'true-false' && (
                    <div className="mt-4 space-y-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select the correct answer
                      </label>
                      <div className="flex items-center space-x-4">
                        {['True', 'False'].map((option, idx) => (
                          <label key={option} className="inline-flex items-center">
                            <input
                              type="radio"
                              className="form-radio text-indigo-600"
                              name={`tf-${question.id}`}
                              value={option.toLowerCase()}
                              checked={String(question.correctAnswer).toLowerCase() === option.toLowerCase()}
                              onChange={() => {
                                updateQuestion(questionIndex, 'correctAnswer', option.toLowerCase());
                              }}
                            />
                            <span className="ml-2">{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push('/admin/dashboard')}
              disabled={loading}
              className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-6 py-3 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-75 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isEditing ? 'Update Quiz' : 'Create Quiz'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}