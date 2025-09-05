'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Question } from '@/types';

export default function EditQuizPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [passingScore, setPassingScore] = useState(60);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const params = useParams();
  const quizId = params.id as string;

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

    fetchQuiz(token);
  }, [quizId, router]);

  const fetchQuiz = async (token: string) => {
    try {
      const response = await fetch(`/api/quizzes/${quizId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        const quiz = data.quiz;
        setTitle(quiz.title);
        setDescription(quiz.description);
        setPassingScore(quiz.passing_score || quiz.passingScore || 60);
        setQuestions(quiz.questions || []);
      } else {
        alert('Quiz not found');
        router.push('/admin/dashboard');
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
      alert('Error loading quiz');
      router.push('/admin/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    if (saving) return;
    
    const newQuestion: Question = {
      id: Date.now().toString(),
      question: '',
      type: 'multiple-choice',
      options: ['', '', '', ''],
      correctAnswer: 0
    };
    
    setQuestions(prev => [...prev, newQuestion]);
    
    // Scroll to the newly added question after a short delay
    setTimeout(() => {
      const elements = document.querySelectorAll('[data-question]');
      if (elements.length > 0) {
        elements[elements.length - 1].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    setQuestions(prevQuestions => {
      const updated = [...prevQuestions];
      const currentQuestion = { ...updated[index] };
      
      if (field === 'type') {
        const newType = value as 'multiple-choice' | 'true-false';
        updated[index] = {
          ...currentQuestion,
          type: newType,
          options: newType === 'true-false' ? ['True', 'False'] : (currentQuestion.options?.length ? currentQuestion.options : ['', '', '', '']),
          correctAnswer: newType === 'true-false' ? 'true' : 0
        };
      } else if (field === 'correctAnswer') {
        if (currentQuestion.type === 'true-false') {
          updated[index] = {
            ...currentQuestion,
            correctAnswer: String(value)
          };
        } else {
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
    if (saving) return;
    
    if (window.confirm('Are you sure you want to remove this question?')) {
      setQuestions(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (questions.length === 0) {
      alert('Please add at least one question');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/quizzes/${quizId}`, {
        method: 'PUT',
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
        alert('Quiz updated successfully');
        router.push('/admin/dashboard');
      } else {
        alert(data.message || 'Failed to update quiz');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-3"></div>
          <div className="text-gray-600">Loading quiz...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/admin/dashboard')}
                disabled={saving}
                className="group inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg 
                  className={`-ml-1 mr-2 h-5 w-5 text-indigo-500 group-hover:text-indigo-600 transition-transform group-hover:-translate-x-0.5 ${saving ? 'opacity-50' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {saving ? 'Saving...' : 'Back to Dashboard'}
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Edit Quiz</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quiz Details</h2>
            
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
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
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
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
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
                        const type = e.target.value as 'multiple-choice' | 'true-false';
                        updateQuestion(questionIndex, 'type', type);
                        if (type === 'true-false') {
                          updateQuestion(questionIndex, 'options', undefined);
                          updateQuestion(questionIndex, 'correctAnswer', 'true');
                        } else {
                          updateQuestion(questionIndex, 'options', ['', '', '', '']);
                          updateQuestion(questionIndex, 'correctAnswer', 0);
                        }
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer</label>
                      <div className="flex space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name={`tf-${questionIndex}`}
                            value="true"
                            checked={question.correctAnswer === 'true'}
                            onChange={(e) => updateQuestion(questionIndex, 'correctAnswer', e.target.value)}
                            className="text-indigo-600"
                          />
                          <span className="ml-2">True</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name={`tf-${questionIndex}`}
                            value="false"
                            checked={question.correctAnswer === 'false'}
                            onChange={(e) => updateQuestion(questionIndex, 'correctAnswer', e.target.value)}
                            className="text-indigo-600"
                          />
                          <span className="ml-2">False</span>
                        </label>
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
              className="px-6 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Update Quiz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
