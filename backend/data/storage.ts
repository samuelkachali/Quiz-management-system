import { User, Quiz, QuizAttempt } from '../../src/types';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// In-memory storage (in production, use a real database)
export const users: User[] = [
  {
    id: '1',
    email: 'admin@test.com',
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    name: 'Admin User'
  },
  {
    id: '2',
    email: 'student@test.com',
    password: bcrypt.hashSync('student123', 10),
    role: 'student',
    name: 'Student User'
  }
];

export const quizzes: Quiz[] = [
  {
    id: '1',
    title: 'JavaScript Basics',
    description: 'Test your knowledge of JavaScript fundamentals',
    questions: [
      {
        id: '1',
        question: 'What is the correct way to declare a variable in JavaScript?',
        type: 'multiple-choice',
        options: ['var x = 5;', 'variable x = 5;', 'v x = 5;', 'declare x = 5;'],
        correctAnswer: 0
      },
      {
        id: '2',
        question: 'JavaScript is a compiled language.',
        type: 'true-false',
        correctAnswer: 'false'
      },
      {
        id: '3',
        question: 'Which method is used to add an element to the end of an array?',
        type: 'multiple-choice',
        options: ['push()', 'add()', 'append()', 'insert()'],
        correctAnswer: 0
      }
    ],
    passingScore: 60,
    createdBy: '1',
    createdAt: new Date('2024-01-01')
  }
];

export const quizAttempts: QuizAttempt[] = [];

// Helper functions
export const findUserByEmail = (email: string): User | undefined => {
  return users.find(user => user.email === email);
};

export const findUserById = (id: string): User | undefined => {
  return users.find(user => user.id === id);
};

export const findQuizById = (id: string): Quiz | undefined => {
  return quizzes.find(quiz => quiz.id === id);
};

export const addQuiz = (quiz: Omit<Quiz, 'id' | 'createdAt'>): Quiz => {
  const newQuiz: Quiz = {
    ...quiz,
    id: uuidv4(),
    createdAt: new Date()
  };
  quizzes.push(newQuiz);
  return newQuiz;
};

export const addQuizAttempt = (attempt: Omit<QuizAttempt, 'id' | 'completedAt'>): QuizAttempt => {
  const newAttempt: QuizAttempt = {
    ...attempt,
    id: uuidv4(),
    completedAt: new Date()
  };
  quizAttempts.push(newAttempt);
  return newAttempt;
};

export const getQuizAttemptsByStudent = (studentId: string): QuizAttempt[] => {
  return quizAttempts.filter(attempt => attempt.studentId === studentId);
};
