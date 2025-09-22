# Quiz Management System — Repo Overview

- **Framework**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, tailwindcss-animate
- **UI Kit**: shadcn/ui (Radix primitives)
- **Notifications/Toasts**: shadcn `use-toast` + custom `toaster.tsx`, and optional `sonner`
- **Auth/Backend**: Supabase (auth-helpers, JS SDK), custom API routes
- **Build/Run**:
  - Dev: `npm run dev`
  - Build: `npm run build`
  - Start: `npm start`

## Project Structure
- `src/app/` — Next.js App Router pages and layout
  - `layout.tsx` — wraps app with providers (NotificationProvider, Toaster)
- `src/components/` — React components
  - `ui/` — shadcn ui primitives, `use-toast`, `toast.tsx`, `toaster.tsx`, `sonner.tsx`
- `src/contexts/` — React contexts (e.g., `NotificationContext`)
- `src/lib/` — utilities (supabase client, notifications, utils, emails, file upload)
- `src/types/` — shared types (e.g., `supabase.ts`)
- `supabase/migrations/` — SQL migrations for schema
- `scripts/` — helper scripts for migrations/tests

## Aliases
- `@/*` -> `./src/*`
- `@/backend/*` -> `./backend/*`

Configured in `tsconfig.base.json` with `baseUrl` set to project root.

## Toasts
- The app uses shadcn `use-toast` internally (e.g., `NotificationContext`).
- To render these, mount `Toaster` from `src/components/ui/toaster.tsx` near the root (e.g., in `layout.tsx`).
- Alternatively, `sonner.tsx` provides a Sonner-based `Toaster` component; switch imports if using Sonner-style toasts.

## Environment
Create a `.env` from `.env.example`. Typical variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Other project-specific values for APIs if required.

## Common Tasks
- Run dev: `npm run dev`
- Apply migrations: see scripts in `scripts/` or `supabase/migrations`

## Notes
- Strict TypeScript settings enabled (strict, noImplicitAny).
- If TS cannot resolve module paths, restart TS Server in VS Code (Ctrl/Cmd+Shift+P → "TypeScript: Restart TS server").
- If using toasts, ensure only one Toaster is mounted globally.