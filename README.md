# Personal Growth Feedback App

A mobile-first application for collecting anonymous 360-degree feedback to support personal growth and self-awareness.

## Features

- **Anonymous Feedback Collection**: Request and receive honest feedback from friends, colleagues, and mentors
- **12 Personal Characteristics**: Rate across key traits like empathy, reliability, communication, and more
- **Privacy-First**: Individual responses remain anonymous; insights shown only after 10+ responses
- **Mobile-Optimized**: Works seamlessly on all devices with shareable feedback links
- **AI-Powered Summaries**: Get encouraging, growth-focused insights from aggregated feedback
- **Verification System**: Secure feedback submission with verification codes

## Tech Stack

- **Frontend**: React Native with Expo Router
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Auth**: Supabase Email/Password Authentication
- **Serverless**: Supabase Edge Functions (Deno)
- **Deployment**: Netlify (Web) / Expo (Mobile)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Netlify account (for deployment)

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd personal-growth-feedback
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env` and add your Supabase credentials
   - Update `EXPO_PUBLIC_APP_URL` with your deployed URL

4. Run the development server:
   ```bash
   npm run dev
   ```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions on deploying to Netlify.

Quick deploy:
1. Push code to GitHub
2. Connect to Netlify
3. Add environment variables
4. Deploy!

## Project Structure

```
app/
├── (auth)/          # Authentication screens
├── (tabs)/          # Main app tabs (Home, Feedback, Growth, Profile)
├── feedback/        # Anonymous feedback submission
├── _layout.tsx      # Root layout
└── index.tsx        # Entry point

contexts/            # React contexts (Auth)
lib/                 # Supabase client
supabase/
├── functions/       # Edge functions
└── migrations/      # Database migrations
```

## License

MIT
