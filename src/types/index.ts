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
  passingScore: number; // percentage (e.g., 60 for 60%)
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
  is_published?: boolean; // Added to match the API response
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  answers: { [questionId: string]: string | number };
  score: number;
  passed: boolean;
  completedAt: Date;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}
