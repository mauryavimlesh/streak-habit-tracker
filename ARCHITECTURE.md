# STREAK Architecture Proposal

## 1. Technology Stack
- **Frontend:** React 19, TypeScript, Vite.
- **Styling:** Tailwind CSS v4, Motion (Framer Motion) for micro-interactions, Lucide React for premium icons.
- **Backend/API:** Express server serving as a proxy (BFF - Backend For Frontend) running on Node.js to securely manage AI interactions.
- **Database:** Firebase Firestore (NoSQL Document database) for real-time sync, offline resilience, and multi-device support.
- **Authentication:** Firebase Authentication (Google, Email/Password) integrated via Supabase/Firebase Auth abstractions.
- **AI Integration:** Google Gemini API (`@google/genai`) invoked securely from the Express backend.

## 2. Folder Architecture
```
/src
  /assets         # Static assets, fonts
  /components     # Reusable design system components (GlassCard, ProgressRing, etc.)
  /features       # Domain-specific modules (habits, goals, analytics)
  /hooks          # Custom React hooks (useStreak, useHabit)
  /lib            # Core utilities, API clients, Firebase init
  /pages          # Main route components (Home, Calendar, More, Auth)
  /services       # Backend service calls
  /styles         # Global CSS, Tailwind extensions (index.css)
  /types          # Global TypeScript interfaces
  /utils          # Helper functions (date formatting, math)
/server           # Express backend for secure API endpoints
  server.ts       # Entry point for backend
```

## 3. Database Schema (Firestore)
- **users/{userId}:** Profile, preferences, overall stats.
- **habits/{habitId}:** Definition of habits (frequency, targets, category, styling).
- **habit_logs/{logId}:** Daily completion records (date, status: completed/partial/missed/skipped, progressValue).
- **goals/{goalId}:** Long term objectives linked to habits.

## 4. Authentication Architecture
- **Firebase Auth** initialized on the client for easy popups and token management.
- Protected routes using a `RequireAuth` wrapper.
- JWT tokens passed to the Express backend for any secure server-side operations.

## 5. AI Architecture
- Express API route `/api/ai/coach` configured with `@google/genai`.
- The server maintains the `GEMINI_API_KEY` securely.
- An abstraction class `AIProvider` will be implemented on the server to allow switching or routing requests between Gemini and other models in the future.

## 6. Design Token System
- Defined entirely within Tailwind CSS.
- **Colors:** Base (`#07090C`, `#101318`), Accents (Lime, Cyan).
- **Glassmorphism:** Reusable utilities like `backdrop-blur-xl bg-white/5 border border-white/10 shadow-glass`.
- **Typography:** `font-sans` globally set to Inter, with distinct hierarchical utility classes.

## 7. Technical Risks
- **Complex Streak Logic:** Calculating streaks for non-daily habits requires checking past logs against a dynamic schedule schedule. We will isolate this logic into testable pure functions.
- **Glassmorphism Performance:** Excessive backdrop blurs can cause frame drops on older mobile devices. We will use `will-change-transform` and limit deep nesting of blurred layers.

## 8. Implementation Roadmap
- **Stage 1 (Current):** Setup Architecture, Design Tokens, & Database Schema.
- **Stage 2:** Provision Firebase & Setup Authentication.
- **Stage 3:** Build Base UI Components (GlassCard, Nav, Buttons).
- **Stage 4:** Implement Home Dashboard (Static Layout).
- **Stage 5:** Integrate Habit CRUD and Streak Engine logic.
- **Stage 6:** Implement Calendar & Goals views.
- **Stage 7:** Add Backend Express Server and Gemini AI Coach integration.
