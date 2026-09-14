# Task & Engagement Management — Frontend

React single-page application for the FastAPI service in `../backend`.

## Requirements

- Node.js 20 or newer
- The backend running and reachable (see `../backend/README.md`)

## Setup

```bash
cd frontend
npm install
cp .env.example .env
```

`.env` holds one variable:

```
VITE_API_BASE_URL=http://localhost:8000
```

## Running

```bash
npm run dev
```

The app is served on http://localhost:5173. That port is not arbitrary: the
backend's `CORS_ORIGINS` lists it, so a different port produces requests the
API refuses.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run test` | Vitest — the task action rules |
| `npm run typecheck` | `tsc --noEmit` |

## Demo accounts

Every seeded account uses the password `Demo1234!`. The sign-in screen lists
one account per role as a one-click button.

| Role | Email |
|---|---|
| Admin | admin@example.com |
| Manager | priya.manager@example.com |
| Team member | sara.member@example.com |

## What is where

| Path | Responsibility |
|---|---|
| `src/api/` | HTTP only: typed endpoints, bearer token, refresh on 401, error normalization |
| `src/auth/` | Who is signed in, and the route guards |
| `src/reference/` | Cached lookup tables for users, clients, service types and engagements |
| `src/hooks/` | `useApi`, the one data-fetching hook every screen uses |
| `src/domain/` | Task action rules, labels, date helpers, list views |
| `src/components/` | The shared presentational pieces: buttons, badges, fields, modal, banners |
| `src/layout/` | The signed-in shell: role-filtered sidebar and header |
| `src/pages/` | One file per screen |


