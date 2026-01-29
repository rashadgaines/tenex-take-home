# Calendar Assistant

An AI-powered calendar management application that helps users schedule meetings, manage their time, and maintain work-life balance through natural language interactions.

## Features

### Core Functionality
- **Google Calendar Integration** - Full OAuth-based sync with Google Calendar for reading, creating, and managing events
- **Natural Language Chat** - AI-powered assistant that understands requests like "Schedule a meeting with Sarah tomorrow at 2pm"
- **Multi-Meeting Scheduling** - Handle batch requests: "Schedule meetings with Alice, Bob, and Charlie this week"
- **Email Draft Generation** - Automatically draft confirmation emails and follow-ups

### Smart Time Management
- **Protected Time Blocks** - Set boundaries like "Block my mornings for focus time" via chat or settings
- **Actionable Recommendations** - AI analyzes your calendar and suggests optimizations:
  - Schedule focus time in available blocks
  - Add buffers between back-to-back meetings
  - Identify meetings to decline when overloaded
- **Working Hours Enforcement** - Respects your defined working hours when scheduling

### Multi-Step Workflows
The assistant handles complex requests that combine multiple actions:
> "Schedule a meeting with Dan tomorrow and send him a confirmation email"

This triggers a workflow that:
1. Finds an available time slot
2. Creates the calendar event
3. Drafts a personalized email

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon) with Prisma ORM
- **Authentication**: NextAuth.js v5 with Google OAuth
- **AI**: OpenAI GPT-4o
- **APIs**: Google Calendar API, Gmail API
- **Styling**: Tailwind CSS v4
- **Animations**: Framer Motion
- **Testing**: Vitest + React Testing Library

## Getting Started

### Prerequisites
- Node.js 18+
- A Google Cloud project with Calendar and Gmail APIs enabled
- An OpenAI API key
- A PostgreSQL database (or Neon account)

### Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/tenex-take-home.git
cd tenex-take-home
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment template:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:

```bash
# Database (Neon Postgres recommended)
POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."

# Authentication
NEXTAUTH_URL="http://localhost:3000"
AUTH_SECRET="generate-with-openssl-rand-base64-32"

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"

# AI
OPENAI_API_KEY="sk-..."
```

### Google Cloud Setup

1. Create a project at [Google Cloud Console](https://console.cloud.google.com)
2. Enable the following APIs:
   - Google Calendar API
   - Gmail API
3. Configure OAuth consent screen (External, Testing mode is fine)
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-domain.vercel.app/api/auth/callback/google` (production)

### Database Setup

```bash
# Push schema to database
npm run db:push

# (Optional) View database in Prisma Studio
npm run db:studio
```

### Running the Application

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

Visit `http://localhost:3000` and sign in with Google.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (dashboard)/        # Authenticated routes
│   │   ├── brief/          # Daily briefing page
│   │   ├── calendar/       # Calendar view
│   │   ├── plan/           # Chat interface
│   │   ├── settings/       # User preferences
│   │   └── time/           # Time analytics
│   └── api/                # API routes
│       ├── ai/             # AI endpoints (chat, brief, recommendations)
│       ├── calendar/       # Calendar CRUD operations
│       ├── email/          # Email sending
│       └── user/           # User preferences
├── components/             # React components
│   ├── brief/              # Briefing page components
│   ├── calendar/           # Calendar components
│   ├── chat/               # Chat interface components
│   ├── layout/             # Layout components
│   ├── recommendations/    # Recommendation cards
│   ├── settings/           # Settings editors
│   └── ui/                 # Reusable UI primitives
├── lib/                    # Core libraries
│   ├── ai/                 # AI logic
│   │   └── chat/           # Modular chat handlers
│   │       ├── scheduling.ts    # Meeting scheduling
│   │       ├── workflows.ts     # Multi-step orchestration
│   │       ├── email.ts         # Email drafting
│   │       └── protected-time.ts # Time blocking
│   ├── google/             # Google API clients
│   │   ├── calendar.ts     # Calendar operations
│   │   └── gmail.ts        # Email sending
│   └── api/                # API utilities
├── types/                  # TypeScript definitions
└── hooks/                  # Custom React hooks
```

## Architecture Highlights

### Modular AI Chat System
The chat module (`src/lib/ai/chat/`) uses a pipeline architecture:
1. **Workflow Detection** - Identifies multi-step requests
2. **Specialized Handlers** - Route to scheduling, email, or preference handlers
3. **Fallback** - General conversation via OpenAI

### Timezone-Aware Design
All date/time operations are timezone-aware:
- User preferences store timezone
- Calendar operations respect user's timezone
- All displays localized appropriately

### Robust Error Handling
- Retry logic with exponential backoff for Google APIs
- Graceful degradation when services unavailable
- User-friendly error messages

## API Reference

### Chat API
```
POST /api/ai/chat
Body: { message: string, context?: { currentView, conversationHistory } }
```

### Calendar APIs
```
GET  /api/calendar/events?start=ISO&end=ISO
POST /api/calendar/events { title, start, end, attendees?, description? }
DELETE /api/calendar/events?eventId=xxx
```

### Recommendations API
```
GET  /api/ai/recommendations?period=day|week|month
POST /api/ai/recommendations/execute { recommendationId, actionType, payload }
```

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## Deployment

The application is configured for Vercel deployment:

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy

The `vercel.json` and Prisma configuration handle the serverless environment automatically.

## License

MIT
