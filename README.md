# Quiz Management System

A comprehensive quiz management system built with Next.js and Tailwind CSS.

## Features

### Admin Panel
- Admin login and authentication
- Create, edit, and delete quizzes
- Set passing criteria for quizzes
- Manage multiple-choice and true/false questions
- View quiz statistics

### Student Panel
- Student login and authentication
- View available quizzes
- Take quizzes with interactive interface
- Instant pass/fail feedback
- View quiz history and scores

## Demo Credentials

### Admin
- Email: `admin@test.com`
- Password: `admin123`

### Student
- Email: `student@test.com`
- Password: `student123`

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── src/
│   ├── app/                 # Next.js app router pages
│   │   ├── admin/          # Admin routes
│   │   ├── student/        # Student routes
│   │   └── api/            # API endpoints
│   ├── components/         # React components
│   └── types/              # TypeScript type definitions
├── backend/                # Backend logic
│   ├── data/              # Data storage
│   └── utils/             # Utility functions
```

## Technologies Used

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Authentication**: JWT tokens, bcrypt
- **Storage**: In-memory (for demo purposes)

## Production Notes

For production deployment:
- Replace in-memory storage with a real database (PostgreSQL, MongoDB, etc.)
- Use environment variables for JWT secrets
- Implement proper error handling and logging
- Add input validation and sanitization
- Consider implementing rate limiting
