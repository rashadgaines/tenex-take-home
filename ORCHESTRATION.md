# Project Orchestration Document

> **Single source of truth for Ara, Ash, and Nova**
> Last updated: January 27, 2025

---

## Product Overview

### What We're Building

A calendar assistant web app that breaks from the traditional "calendar grid + AI sidebar" paradigm. The product is **intent-driven**, not data-driven—users come with a purpose, not to stare at time blocks.

### Core Philosophy

- **Conversation-first**: The AI assistant is central, not bolted on
- **Brief as home**: Users land on a daily briefing, not a calendar grid
- **Tell, don't ask**: Users tell others when they're available (not mutual availability finding)
- **Modest proactivity**: AI observes and suggests, but waits for instruction unless explicitly told to automate

### Primary Job-to-be-Done

Assist users with **planning and coordinating**—which means managing **time** and **people**.

---

## The Four Views

| View | Purpose | Priority |
|------|---------|----------|
| **Brief** | Daily briefing, action items, AI suggestions | PRIMARY (landing page) |
| **Plan** | Conversational scheduling flow | PRIMARY |
| **Time** | Analytics and insights about time usage | SECONDARY |
| **Calendar** | Traditional week/month grid view | SECONDARY (exists but not main product) |

---

## Team Assignments

### Ara — Frontend/UI
**Terminal 1**

Responsibilities:
- Project initialization and configuration
- Component library (primitives + composites)
- All four view layouts
- Navigation rail
- Styling system (Tailwind + design tokens)
- Responsive behavior
- Chat input interface (UI only)

### Ash — Backend/API
**Terminal 2**

Responsibilities:
- Server setup and configuration
- Database schema and ORM
- Google OAuth 2.0 authentication
- Google Calendar API integration (read events)
- Gmail API integration (send emails)
- REST or tRPC API endpoints
- Session management

### Nova — AI/Agent
**Terminal 3**

Responsibilities:
- AI prompt templates and system prompts
- Conversational state management
- Email draft generation logic
- Time analytics calculations
- Insight generation algorithms
- Integration with LLM provider (likely Claude API)
- Chat response handling

---

## Tech Stack (Agreed)

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL (via Prisma) |
| Auth | NextAuth.js with Google Provider |
| AI | Claude API (Anthropic) |
| Email | Gmail API (via Google OAuth) |
| Deployment | Vercel (planned) |

---

## Project Structure

```
tenex-take-home/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth routes (login, callback)
│   │   ├── (dashboard)/        # Main app routes
│   │   │   ├── brief/          # Brief view
│   │   │   ├── plan/           # Plan view
│   │   │   ├── time/           # Time analytics view
│   │   │   └── calendar/       # Calendar view
│   │   ├── api/                # API routes
│   │   │   ├── auth/           # NextAuth endpoints
│   │   │   ├── calendar/       # Calendar data endpoints
│   │   │   ├── email/          # Email sending endpoints
│   │   │   └── ai/             # AI chat endpoints
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/             # Ara's domain
│   │   ├── ui/                 # Primitives (Button, Card, Input, etc.)
│   │   ├── layout/             # NavRail, MainCanvas, ChatInput
│   │   ├── brief/              # Brief view components
│   │   ├── plan/               # Plan view components
│   │   ├── time/               # Time analytics components
│   │   └── calendar/           # Calendar view components
│   │
│   ├── lib/                    # Shared utilities
│   │   ├── db.ts               # Prisma client (Ash)
│   │   ├── auth.ts             # Auth config (Ash)
│   │   ├── google/             # Google API helpers (Ash)
│   │   │   ├── calendar.ts
│   │   │   └── gmail.ts
│   │   └── ai/                 # AI utilities (Nova)
│   │       ├── prompts.ts
│   │       ├── analytics.ts
│   │       └── chat.ts
│   │
│   ├── types/                  # Shared TypeScript types
│   │   ├── calendar.ts
│   │   ├── email.ts
│   │   ├── user.ts
│   │   └── ai.ts
│   │
│   └── styles/
│       └── globals.css
│
├── prisma/
│   └── schema.prisma           # Database schema (Ash)
│
├── public/
├── .env.local                  # Environment variables
├── .env.example                # Template for env vars
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── ORCHESTRATION.md            # This file
```

---

## Shared Type Definitions

All three terminals should use these types. Define in `src/types/`.

### `src/types/calendar.ts`

```typescript
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  attendees: Attendee[];
  location?: string;
  meetingLink?: string;
  isAllDay: boolean;
  category: 'meeting' | 'focus' | 'personal' | 'external';
  hasAgenda: boolean;
}

export interface Attendee {
  email: string;
  name?: string;
  responseStatus: 'accepted' | 'declined' | 'tentative' | 'needsAction';
}

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

export interface DaySchedule {
  date: Date;
  events: CalendarEvent[];
  availableSlots: TimeSlot[];
  stats: {
    meetingMinutes: number;
    focusMinutes: number;
    availableMinutes: number;
  };
}
```

### `src/types/email.ts`

```typescript
export interface EmailDraft {
  id: string;
  to: string;
  subject: string;
  body: string;
  suggestedTimes?: TimeSlot[];
  status: 'draft' | 'sent' | 'dismissed';
  createdAt: Date;
}

export interface EmailSuggestion {
  id: string;
  inReplyTo?: string;  // Original email ID if it's a reply
  recipient: string;
  recipientName?: string;
  context: string;     // Why this suggestion was generated
  draft: EmailDraft;
}
```

### `src/types/ai.ts`

```typescript
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  type: 'time_slots' | 'email_draft' | 'analytics' | 'calendar_events';
  data: unknown;
}

export interface TimeAnalytics {
  period: 'day' | 'week' | 'month';
  startDate: Date;
  endDate: Date;
  meetingPercent: number;
  focusPercent: number;
  availablePercent: number;
  bufferPercent: number;
  totalMeetingHours: number;
  longestFocusBlock: number;  // minutes
  busiestDay: string;
  insights: Insight[];
}

export interface Insight {
  id: string;
  type: 'observation' | 'warning' | 'suggestion';
  message: string;
  actionable: boolean;
  action?: {
    label: string;
    prompt: string;  // Pre-filled prompt for chat
  };
}

export interface BriefData {
  greeting: string;
  date: Date;
  summary: string;
  todaySchedule: DaySchedule;
  actionItems: ActionItem[];
  emailSuggestions: EmailSuggestion[];
  insight?: Insight;
}

export interface ActionItem {
  id: string;
  type: 'scheduling_request' | 'email_reply' | 'conflict' | 'reminder';
  title: string;
  description: string;
  from?: string;  // Person who initiated
  actions: ActionButton[];
}

export interface ActionButton {
  label: string;
  action: 'suggest_times' | 'decline' | 'send_email' | 'edit' | 'dismiss' | 'open_chat';
  payload?: unknown;
}
```

### `src/types/user.ts`

```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  googleAccessToken: string;
  googleRefreshToken: string;
  preferences: UserPreferences;
  createdAt: Date;
}

export interface UserPreferences {
  workingHours: {
    start: string;  // "09:00"
    end: string;    // "17:00"
  };
  protectedTimes: ProtectedTime[];
  defaultMeetingDuration: number;  // minutes
  timezone: string;
}

export interface ProtectedTime {
  label: string;          // "Morning workout"
  days: number[];         // [1, 2, 3, 4, 5] = Mon-Fri
  start: string;          // "06:00"
  end: string;            // "09:00"
}
```

---

## API Endpoints (Ash's Contract)

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/signin` | Initiate Google OAuth |
| GET | `/api/auth/callback/google` | OAuth callback |
| GET | `/api/auth/session` | Get current session |
| POST | `/api/auth/signout` | Sign out |

### Calendar

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| GET | `/api/calendar/events` | Get events for date range | `CalendarEvent[]` |
| GET | `/api/calendar/today` | Get today's schedule | `DaySchedule` |
| GET | `/api/calendar/week` | Get current week | `DaySchedule[]` |
| GET | `/api/calendar/availability` | Get available slots | `TimeSlot[]` |
| POST | `/api/calendar/events` | Create new event | `CalendarEvent` |

Query params for `/api/calendar/events`:
- `start`: ISO date string
- `end`: ISO date string

Query params for `/api/calendar/availability`:
- `start`: ISO date string
- `end`: ISO date string
- `duration`: number (minutes)
- `respectProtectedTime`: boolean

### Email

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| POST | `/api/email/send` | Send an email | `{ to, subject, body }` |
| GET | `/api/email/suggestions` | Get pending email suggestions | — |
| POST | `/api/email/suggestions/:id/send` | Send a suggested email | — |
| POST | `/api/email/suggestions/:id/dismiss` | Dismiss suggestion | — |

### AI (Nova integrates here)

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| POST | `/api/ai/chat` | Send message to AI | `{ message, context? }` |
| GET | `/api/ai/brief` | Get daily brief data | — |
| GET | `/api/ai/analytics` | Get time analytics | `?period=week` |
| POST | `/api/ai/draft-email` | Generate email draft | `{ recipient, purpose, times? }` |

---

## Environment Variables

Create `.env.local` with:

```bash
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-secret"

# Google OAuth
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"

# Claude API (for Nova)
ANTHROPIC_API_KEY="your-api-key"
```

---

## UI Design Specifications (For Ara)

### Color Tokens

```css
:root {
  /* Backgrounds */
  --bg-primary: #FFFFFF;
  --bg-secondary: #F9FAFB;
  --bg-tertiary: #F3F4F6;

  /* Text */
  --text-primary: #111827;
  --text-secondary: #6B7280;
  --text-tertiary: #9CA3AF;

  /* Accent */
  --accent-primary: #2563EB;
  --accent-hover: #1D4ED8;

  /* Meeting categories */
  --meeting-internal: #DBEAFE;
  --meeting-external: #FEF3C7;
  --meeting-focus: #D1FAE5;
  --meeting-personal: #F3E8FF;

  /* Status */
  --status-success: #10B981;
  --status-warning: #F59E0B;
  --status-error: #EF4444;

  /* Borders */
  --border-light: #E5E7EB;
  --border-medium: #D1D5DB;
}
```

### Typography Scale

```css
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
```

### Spacing Scale

Use Tailwind defaults (4px base unit).

### Component Specifications

**Card**
- Background: white
- Border: 1px solid `--border-light`
- Border radius: 12px
- Padding: 20px
- Shadow: `0 1px 3px rgba(0,0,0,0.1)`

**Button (Primary)**
- Background: `--accent-primary`
- Text: white
- Padding: 10px 20px
- Border radius: 8px
- Font weight: 500

**Button (Secondary)**
- Background: transparent
- Border: 1px solid `--border-medium`
- Text: `--text-primary`

**Nav Rail**
- Width: 72px
- Background: `--bg-secondary`
- Icons: 24px, centered
- Active indicator: left border accent

---

## AI Prompt Guidelines (For Nova)

### System Prompt (Base)

```
You are a calendar assistant helping a professional manage their time and coordinate with others.

Your tone is warm but professional—helpful without being overly casual or stiff. You're like a capable colleague, not a robot or an overeager assistant.

Guidelines:
- Be concise. Respect the user's time.
- When suggesting times, always respect their protected time blocks.
- Default to giving users options rather than making decisions for them.
- If you notice patterns (too many meetings, no breaks), mention them gently.
- Never invent or assume calendar data—only reference what you've been given.
- When drafting emails, match the user's likely tone (professional but personable).

You have access to:
- The user's calendar events
- Their preferences (working hours, protected time)
- The ability to draft emails
- Time analytics for their schedule
```

### Email Draft Prompt Template

```
Draft a brief, professional email for [USER_NAME] to send to [RECIPIENT].

Purpose: [PURPOSE]
Suggested times to offer: [TIMES]

Guidelines:
- Keep it short (3-5 sentences max)
- Sound natural, not templated
- Be warm but professional
- End with a clear ask or next step
- Don't use overly formal language like "I hope this email finds you well"
```

### Analytics Insight Prompt Template

```
Analyze this calendar data and provide 2-3 actionable insights.

Time period: [PERIOD]
Meeting percentage: [PERCENT]
Focus time percentage: [PERCENT]
Busiest day: [DAY]
Longest focus block: [MINUTES] minutes

Guidelines:
- Lead with the most important observation
- Be specific with numbers
- Suggest concrete actions when relevant
- Don't be preachy about "work-life balance"
- Keep insights to 1-2 sentences each
```

---

## Integration Points

### Ara ↔ Ash

1. **Auth state**: Ara checks session via NextAuth hooks
2. **Calendar data**: Ara fetches from `/api/calendar/*` endpoints
3. **Email sending**: Ara POSTs to `/api/email/send`

### Ara ↔ Nova

1. **Chat interface**: Ara sends messages to `/api/ai/chat`
2. **Brief data**: Ara fetches from `/api/ai/brief` for home view
3. **Analytics display**: Ara fetches from `/api/ai/analytics`

### Ash ↔ Nova

1. **Calendar data**: Nova's endpoints call Ash's internal calendar functions
2. **Email drafts**: Nova generates, Ash sends via Gmail API
3. **User context**: Nova needs user preferences from Ash's DB

---

## Development Workflow

### Getting Started (All Terminals)

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
# Fill in your credentials

# Start dev server
npm run dev
```

### Coordination Protocol

1. **Before starting work**: Pull latest, read this doc
2. **Shared files**: If you need to modify a shared file (types, lib), communicate in chat
3. **API changes**: Ash updates this doc when endpoints change
4. **Type changes**: Update `src/types/` and notify others
5. **Conflicts**: If you hit a merge conflict, pause and coordinate

### Stub/Mock Strategy

While waiting on dependencies:

**Ara** (waiting on Ash's APIs):
- Use mock data in `src/lib/mocks/`
- Create realistic sample calendar events
- Test UI with various states (empty, full, error)

**Nova** (waiting on Ash's calendar data):
- Develop prompts using sample calendar data
- Build analytics calculations with mock input
- Test chat flows with hardcoded context

---

## Launch Checklist

- [ ] Google OAuth working (Ash)
- [ ] Calendar events fetching (Ash)
- [ ] Email sending working (Ash)
- [ ] All four views rendering (Ara)
- [ ] Chat interface functional (Ara + Nova)
- [ ] Brief generating correctly (Nova)
- [ ] Analytics calculating (Nova)
- [ ] Email drafts generating (Nova)
- [ ] Mobile responsive (Ara)
- [ ] Error states handled (All)

---

## Questions / Decisions Log

| Date | Question | Decision | Decided By |
|------|----------|----------|------------|
| 1/27 | Web or mobile first? | Web first | User |
| 1/27 | AI tone? | Balanced professional + warm | User |
| 1/27 | Show calendar view? | Yes, but secondary | User |

---

## Contact

All three terminals (Ara, Ash, Nova) are Claude instances in separate terminal sessions, coordinated by the user.

When in doubt, ask the user to relay information between terminals or update this document.
