'use client';

import { useState, useEffect, useRef } from 'react';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  isEditing?: boolean;
  tempQuestion?: string;
  tempOptions?: string[];
  tempCorrectAnswer?: string;
}

interface DocumentUploaderProps {
  initialQuiz?: {
    id?: string;
    title?: string;
    description?: string;
    questions?: any[];
  };
  onUploadSuccess?: (quizId: string) => void;
}

export default function DocumentUploader({ initialQuiz, onUploadSuccess }: DocumentUploaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<QuizQuestion[]>([]);
  const [showParsedQuestions, setShowParsedQuestions] = useState(true);
  const [passingScore, setPassingScore] = useState<number>(70); // Default passing score
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Initialize with existing quiz data if provided
  useEffect(() => {
    if (initialQuiz?.questions && initialQuiz.questions.length > 0) {
      const questionsWithEditState = initialQuiz.questions.map(q => {
        // Ensure the question object has all required fields
        const questionObj = {
          question: q.question || '',
          options: Array.isArray(q.options) ? [...q.options] : [],
          correctAnswer: q.correctAnswer || '',
          isEditing: false,
          tempQuestion: q.question || '',
          tempOptions: Array.isArray(q.options) ? [...q.options] : [],
          tempCorrectAnswer: q.correctAnswer || ''
        };
        return questionObj;
      });
      setParsedQuestions(questionsWithEditState);
      setShowParsedQuestions(true);
    } else {
      // Reset if no questions
      setParsedQuestions([]);
    }
  }, [initialQuiz]);

  const parseQuestions = (text: string): QuizQuestion[] => {
    const questions: QuizQuestion[] = [];
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    let currentQuestion: Partial<QuizQuestion> = {};
    let isReadingQuestion = false;
    let hasSeenHeader = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip the header line if present
      if (!hasSeenHeader && /quiz.*questions/i.test(trimmedLine)) {
        hasSeenHeader = true;
        continue;
      }
      
      // Check if line starts with a number followed by a dot (e.g., "1. Question text")
      if (/^\d+\.\s+.+/.test(trimmedLine)) {
        hasSeenHeader = true;
        if (currentQuestion.question) {
          // Save the previous question if exists
          if (currentQuestion.options && currentQuestion.options.length > 0 && currentQuestion.correctAnswer) {
            questions.push(currentQuestion as QuizQuestion);
          }
        }
        // Start a new question
        currentQuestion = {
          question: trimmedLine.replace(/^\d+\.\s*/, '').trim(),
          options: [],
          correctAnswer: ''
        };
        isReadingQuestion = true;
      } 
      // Check for answer options (lines starting with a letter and parenthesis, case insensitive)
      else if (/^[a-z]\)\s+.+/i.test(trimmedLine) && isReadingQuestion) {
        currentQuestion.options = currentQuestion.options || [];
        const option = trimmedLine.trim();
        // Convert to uppercase for consistency
        const normalizedOption = option[0].toUpperCase() + option.slice(1);
        currentQuestion.options.push(normalizedOption);
      }
      // Check for answer line (supports both 'Answer: c' and 'Answer: c) Paris' formats)
      else if (/^answer:\s*[a-z]\s*(?:\)\s*.+)?$/i.test(trimmedLine) && isReadingQuestion) {
        const match = trimmedLine.match(/answer:\s*([a-z])/i);
        if (match && match[1]) {
          currentQuestion.correctAnswer = match[1].toUpperCase() + ')';
        }
      }
    }

    // Add the last question if it's complete
    if (currentQuestion.question && currentQuestion.options && currentQuestion.options.length > 0 && currentQuestion.correctAnswer) {
      questions.push(currentQuestion as QuizQuestion);
    }

    return questions;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Clear any existing preview and error
    setPreview('');
    setError('');

    // Check file type and size
    const validTypes = ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type) && !file.name.match(/\.(txt|pdf|docx)$/i)) {
      setError('Please upload a valid file (TXT, PDF, or DOCX)');
      return;
    }

    if (file.size > maxSize) {
      setError('File size exceeds 5MB limit');
      return;
    }

    // For text files, show preview and parse questions
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      try {
        const text = await file.text();
        setPreview(text.slice(0, 500) + (text.length > 500 ? '...' : ''));
        const questions = parseQuestions(text);
        setParsedQuestions(questions);
      } catch (err) {
        setError('Failed to read file. Please try another file.');
      }
    } else {
      // For PDF and DOCX, just show the file name
      setPreview(`File ready for processing: ${file.name}`);
    }
  };

  const handleEditQuestion = (index: number) => {
    const updatedQuestions = [...parsedQuestions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      isEditing: true,
      tempQuestion: updatedQuestions[index].question,
      tempOptions: [...updatedQuestions[index].options],
      tempCorrectAnswer: updatedQuestions[index].correctAnswer
    };
    setParsedQuestions(updatedQuestions);
  };

  const handleSaveQuestion = (index: number) => {
    const updatedQuestions = [...parsedQuestions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      isEditing: false,
      question: updatedQuestions[index].tempQuestion || updatedQuestions[index].question,
      options: updatedQuestions[index].tempOptions || [...updatedQuestions[index].options],
      correctAnswer: updatedQuestions[index].tempCorrectAnswer || updatedQuestions[index].correctAnswer
    };
    setParsedQuestions(updatedQuestions);
  };

  const handleCancelEdit = (index: number) => {
    const updatedQuestions = [...parsedQuestions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      isEditing: false
    };
    setParsedQuestions(updatedQuestions);
  };

  const handleQuestionChange = (index: number, value: string) => {
    const updatedQuestions = [...parsedQuestions];
    updatedQuestions[index].tempQuestion = value;
    setParsedQuestions(updatedQuestions);
  };

  const handleOptionChange = (qIndex: number, optIndex: number, value: string) => {
    const updatedQuestions = [...parsedQuestions];
    if (!updatedQuestions[qIndex].tempOptions) {
      updatedQuestions[qIndex].tempOptions = [...updatedQuestions[qIndex].options];
    }
    updatedQuestions[qIndex].tempOptions![optIndex] = value;
    setParsedQuestions(updatedQuestions);
  };

  const handleCorrectAnswerChange = (qIndex: number, value: string) => {
    const updatedQuestions = [...parsedQuestions];
    updatedQuestions[qIndex].tempCorrectAnswer = value;
    setParsedQuestions(updatedQuestions);
  };

  const addNewQuestion = () => {
    const newQuestion: QuizQuestion = {
      question: 'New Question',
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
      correctAnswer: 'A',
      isEditing: true,
      tempQuestion: 'New Question',
      tempOptions: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
      tempCorrectAnswer: 'A'
    };
    setParsedQuestions([...parsedQuestions, newQuestion]);
  };

  const removeQuestion = (index: number) => {
    const updatedQuestions = parsedQuestions.filter((_, i) => i !== index);
    setParsedQuestions(updatedQuestions);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (parsedQuestions.length === 0) {
      setError('No questions to upload');
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);
    const title = formData.get('title')?.toString() || 'Untitled Quiz';
    const description = formData.get('description')?.toString() || '';
    const passingScore = Number(formData.get('passingScore')) || 70;

    // Ensure all questions are saved before submitting
    const questionsToSubmit = parsedQuestions.map(q => ({
      question: q.tempQuestion || q.question,
      options: q.tempOptions || [...q.options],
      correctAnswer: q.tempCorrectAnswer || q.correctAnswer
    }));

    setIsLoading(true);
    setError('');

    try {
      const url = initialQuiz?.id
        ? `/api/quizzes/${initialQuiz.id}`
        : '/api/quizzes';

      const method = initialQuiz?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          title,
          description,
          questions: questionsToSubmit,
          passingScore: Number(passingScore)
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create quiz');
      }

      // Call the success callback with the new quiz ID
      if (onUploadSuccess && data.quiz?.id) {
        onUploadSuccess(data.quiz.id);
      }

    } catch (err) {
      console.error('Error creating quiz:', err);
      setError(`Failed to create quiz: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Import Quiz</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Quiz Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            defaultValue={initialQuiz?.title || ''}
            className="w-full p-2 border rounded-md"
            placeholder="Enter quiz title"
            required
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            id="description"
            name="description"
            defaultValue={initialQuiz?.description || ''}
            className="w-full p-2 border rounded-md"
            rows={3}
            placeholder="Enter quiz description"
          />
        </div>
        
        <div>
          <label htmlFor="passingScore" className="block text-sm font-medium text-gray-700 mb-1">
            Passing Score (%)
          </label>
          <input
            type="number"
            id="passingScore"
            name="passingScore"
            min="1"
            max="100"
            defaultValue={passingScore}
            className="w-full p-2 border rounded-md"
            placeholder="Enter passing score (1-100)"
            required
          />
        </div>

        {preview && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Preview:</h3>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap">
              {preview}
            </pre>
          </div>
        )}

        {error && (
          <div className="p-3 text-red-700 bg-red-100 rounded-md">
            {error}
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={isLoading || !preview}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : 'Process Document'}
          </button>
        </div>
      </form>

{(showParsedQuestions || parsedQuestions.length > 0) && (
        <div className="mt-6">
          {initialQuiz?.id && (
            <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400">
              <p className="text-sm text-yellow-700">
                Editing quiz: <span className="font-medium">{initialQuiz.title || 'Untitled Quiz'}</span>
              </p>
            </div>
          )}
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
            >
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                className="hidden"
                accept=".txt,.pdf,.docx"
                onChange={handleFileChange}
                ref={fileInputRef}
              />
              <svg
                className="w-8 h-8 mb-4 text-gray-500"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 20 16"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                />
              </svg>
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">
                {initialQuiz?.id ? 'Upload a new file to update questions' : 'TXT, DOCX, or PDF (MAX. 5MB)'}
              </p>
            </label>
          </div>

          <div className="space-y-4">
            <div className="space-y-4">
            {parsedQuestions.map((question, index) => (
              <div key={index} className="p-4 border rounded-lg bg-white shadow-sm">
                {question.isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Question {index + 1}
                      </label>
                      <input
                        type="text"
                        value={question.tempQuestion || ''}
                        onChange={(e) => handleQuestionChange(index, e.target.value)}
                        className="w-full p-2 border rounded-md"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Options
                      </label>
                      {question.tempOptions?.map((option, optIndex) => (
                        <div key={optIndex} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name={`correct-${index}`}
                            checked={question.tempCorrectAnswer === String.fromCharCode(65 + optIndex)}
                            onChange={() => handleCorrectAnswerChange(index, String.fromCharCode(65 + optIndex))}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => handleOptionChange(index, optIndex, e.target.value)}
                            className="flex-1 p-2 border rounded-md"
                            placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                          />
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex justify-end space-x-2 mt-4">
                      <button
                        type="button"
                        onClick={() => handleCancelEdit(index)}
                        className="px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveQuestion(index)}
                        className="px-3 py-1 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-gray-800">{index + 1}. {question.question}</h4>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditQuestion(index)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => removeQuestion(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <ul className="mt-2 space-y-1 pl-4">
                      {question.options.map((option, optIndex) => (
                        <li
                          key={optIndex}
                          className={`text-sm ${option.startsWith(question.correctAnswer + ')') ? 'text-green-600 font-medium' : 'text-gray-600'}`}
                        >
                          {option}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
            
            <button
              type="button"
              onClick={addNewQuestion}
              className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors"
            >
              + Add New Question
            </button>
          </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          <h3 className="font-medium mb-2">How to format your text file:</h3>
        <pre className="bg-gray-50 p-3 rounded text-xs font-mono">
          {`1. What is the capital of France?
   A) London
   B) Paris
   C) Berlin
   Answer: B

2. What is 2+2?
   A) 3
   B) 4
   C) 5
   Answer: B`}
        </pre>
        </div>
        <button
          type="button"
          onClick={() => setShowParsedQuestions(!showParsedQuestions)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showParsedQuestions ? 'Hide Questions' : 'Show Questions'}
        </button>
      </div>
    </div>
  );
}
