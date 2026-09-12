# STREAK - Small actions. Every day.

STREAK is a production-quality premium habit and personal-growth application designed as a personal operating system for consistency, discipline, routines, goals, and self-improvement.

## Features

- **Premium UI:** "Liquid Glass" design language optimized for OLED displays.
- **Habit Tracking:** Configurable habits (Binary, Count, Duration) with detailed streak calculations.
- **Calendar & History:** Visualize daily completions and consistency metrics.
- **AI Coach:** Gemini-powered personal coach for habit analysis and insights.
- **Goals System:** Long-term objectives linked to daily actions.
- **Cloud Sync:** Firebase Firestore persistence across multiple devices.
- **Authentication:** Secure Firebase Auth integration.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS v4, Motion (Framer), Lucide React
- **Backend:** Express.js proxy for secure AI operations
- **Database:** Firebase Firestore
- **Authentication:** Firebase Authentication
- **AI Provider:** Google Gemini API (`@google/genai`)

## Local Development

1. Clone the repository
2. Run `npm install` to install dependencies
3. Set up your `.env` file (see `.env.example`)
4. Start the full stack dev server: `npm run dev`

### Environment Variables

See `.env.example` for required keys.

- `GEMINI_API_KEY`: Required for the AI Coach to function.
- Firebase config is pre-configured for the managed project instance.

## Deployment

The application is configured to build into a static bundle with an accompanying Express server. 

- Build: `npm run build`
- Start Production Server: `npm start`

## Future Roadmap

- Deep wearable integration (Apple Health, Google Fit)
- Widgets (iOS / Android)
- Extended AI capabilities (Natural Language Habit Creation)
- Advanced Analytics & Charts
- Social accountability tools
