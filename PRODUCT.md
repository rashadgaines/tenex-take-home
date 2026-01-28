# Calendar Assistant

AI-powered calendar companion that helps users plan and coordinate their time.

## Core Concept

Intent-driven interface—users come with a purpose, not to stare at a calendar grid. The AI assistant is central, not bolted on.

## Four Views

1. **Brief** (Home) — Daily briefing with action items, schedule summary, AI observations
2. **Plan** — Conversational scheduling ("Find time for Joe, Dan, and Sally this week")
3. **Time** — Analytics showing meeting %, focus time, insights
4. **Calendar** — Traditional week view (secondary, not primary)

## Key Features

- Google Calendar sync via OAuth
- AI drafts emails with suggested availability
- Smart reply suggestions for scheduling emails
- Time analytics with actionable insights
- User tells others when they're available (not mutual availability finding)

## AI Behavior

- Mostly reactive, waits for instructions
- Modestly proactive only when asked to automate
- Tone: professional but warm

## Tech Stack

Next.js 14, TypeScript, Tailwind, Prisma, NextAuth, Claude API, Gmail API
