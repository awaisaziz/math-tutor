# AI-Powered Interactive Math Tutor — Grade 1

Prototype: a voice-to-voice AI tutor that teaches a Grade 1 math curriculum to a child,
tracks daily progress, and revises past lessons before starting new ones.

## Stack

- **Frontend**: Next.js (TypeScript, App Router, Tailwind)
- **Backend**: Node.js + Express (TypeScript), WebSocket for real-time voice streaming
- **Database**: PostgreSQL via Prisma ORM (works with pgAdmin 4)
- **AI**: Grok's realtime **Voice Agent API** (`grok-voice-latest`, speech-to-speech
  over `wss://api.x.ai/v1/realtime`) powers live tutoring sessions; Grok's text chat
  completions endpoint generates the end-of-session summary used for next-day recall.
  Nothing calls a real API until `GROK_API_KEY` is set in `.env`; until then a mock
  voice agent is used so the app is fully runnable without a key.
- **Local runtime**: Docker Compose (postgres + backend + frontend)

## Why these choices

- **Node/Express over Python/FastAPI**: the frontend is already TypeScript, so sharing
  one language end-to-end (and eventually shared types) avoids context-switching, and
  Node's event loop is a strong fit for the bidirectional audio streaming this app
  needs. Python would earn its cost if we ran ML models directly in-process, but all AI
  here goes through Grok's hosted API, so that advantage doesn't apply.
- **Prisma**: type-safe query builder + migrations that map cleanly to pgAdmin-visible
  tables, good fit for a small relational schema (parents, students, curriculum,
  progress).

## Getting started

1. Copy env templates and fill in secrets:
   ```
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   ```
   Leave `GROK_API_KEY` blank for now — the app runs with a mock AI provider until you
   add it.

2. Start everything:
   ```
   docker compose up --build
   ```
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000
   - Postgres: localhost:5432 (connect with pgAdmin 4 using credentials in `.env`)

3. Run database migrations + seed the Grade 1 curriculum (first time only):
   ```
   docker compose exec backend npx prisma migrate dev
   docker compose exec backend npx prisma db seed
   ```

## Project structure

```
backend/    Express + TypeScript API, Prisma schema, AI provider abstraction, WebSocket voice endpoint
frontend/   Next.js app: parent auth, student profile setup, voice tutor interface
```

## Adding the Grok API key

Set these in `backend/.env`:
```
GROK_API_KEY=...
GROK_LLM_MODEL=grok-4.5
GROK_VOICE_MODEL=grok-voice-latest   # xAI's realtime speech-to-speech voice agent
GROK_VOICE_NAME=eve                  # one of: eve (default), ara, rex, sal, leo
```
Once `GROK_API_KEY` is set, `backend/src/services/ai/index.ts` automatically swaps
the mock voice agent for `GrokVoiceAgentFactory`, which bridges the browser's mic
audio to xAI's realtime WebSocket
(`wss://api.x.ai/v1/realtime?model=grok-voice-latest`) and streams the spoken reply
back. See `backend/src/services/ai/grokProviders.ts` and
`backend/src/ws/voiceSession.ts`.
