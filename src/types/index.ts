export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'student' | 'super_admin';
  status: 'active' | 'pending' | 'rejected';
  created_at: string;
}

export interface Question {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false';
  options?: string[];
  correctAnswer: string | number;
  explanation?: string;
  points?: number;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  passing_score: number; // percentage (e.g., 60 for 60%)
  created_by: string;
  created_at: string;
  updated_at?: string;
  is_published?: boolean; // Added to match the API response
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  answers: { [questionId: string]: string | number };
  score: number;
  passed: boolean;
  completed_at: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}
