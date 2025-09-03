# Quiz Management System - Deployment Guide

## Architecture
This is a **Next.js full-stack application** with:
- Frontend: React/Next.js pages
- Backend: API routes (serverless functions)
- Database: Supabase (cloud-hosted)

## Scripts
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run start` - Production server
- `npm run lint` - Code linting

## Deployment Options

### Option 1: Single Vercel Deployment (Recommended)

**Advantages:**
- Simplest setup
- API routes become serverless functions automatically
- Single domain for frontend and backend
- Built-in CI/CD with GitHub

**Steps:**
1. Connect GitHub repo to Vercel
2. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
3. Deploy automatically on push to main

### Option 2: Split Architecture

**Frontend (Vercel):**
- Deploy only frontend pages
- Configure API base URL to point to Render backend

**Backend (Render):**
- Extract API routes to Express.js server
- Deploy as Node.js service on Render

## Environment Variables

Create these in your deployment platform:

```env
NEXT_PUBLIC_SUPABASE_URL=https://qbxusidgwovqqnghmvox.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

## Database
- Supabase is already cloud-hosted
- No additional database deployment needed
- Tables: users, quizzes, quiz_attempts

## Authentication
- Supabase Auth handles user authentication
- JWT tokens for API authorization
- Role-based access control (student, admin, super_admin)

## Recommended: Single Vercel Deployment
Since your project is already a Next.js full-stack app, deploying everything to Vercel is the simplest and most efficient approach.
