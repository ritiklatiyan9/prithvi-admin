# RewardHub Admin

React + Vite admin dashboard for RewardHub, fully wired to the backend API.

## Stack

React 18, Vite, TypeScript, TailwindCSS, shadcn/ui (Radix primitives), TanStack Query, React Hook Form + Zod, Axios, React Router, Zustand, Recharts, Heroicons, sonner.

## Setup

```bash
cp .env.example .env    # set VITE_API_BASE_URL and the VITE_FIREBASE_* keys
npm install
npm run dev             # http://localhost:5173
```

Production: `npm run build` → static output in `dist/` (serve with any static host or `npm run preview`).

The backend must be running (default `http://localhost:4000/api/v1`) — see [../backend/README.md](../backend/README.md).

## Authentication

**Firebase Authentication** (Google provider) via the Firebase Web SDK. Clicking "Continue with Google" opens a Firebase `signInWithPopup`; the resulting Firebase ID token is exchanged at `POST /auth/firebase` for the app's JWT + rotating refresh token, persisted in localStorage (Zustand). A response interceptor transparently refreshes expired access tokens (single-flight) and signs out on refresh failure. Only `ADMIN` / `SUPER_ADMIN` accounts get past the route guard.

Setup: create a Firebase **web app**, enable Google as a sign-in provider, add your admin domain (and `localhost`) to Firebase Auth → **Authorized domains**, and fill the `VITE_FIREBASE_*` values in `.env`.

## Features

| Page | What it does |
|---|---|
| Dashboard | Stat cards (users, campaigns, claims, wallet liability), 30-day events chart, recent claims |
| Campaigns | Paginated table, status filter + title search, create/edit dialogs (RHF + Zod), activate/pause/end |
| Claims | Pending-first queue, review dialog — approve (credits wallet) or reject with note |
| Users | Server-side search, role filter, promote/demote roles, activate/deactivate with confirmation |
| Wallet | Own balance, platform liability, paginated transaction ledger |
| Notifications | Inbox with unread filter/badge, mark read/all-read, send-notification dialog with user picker |
| Analytics | Date-range filter, totals, events bar chart (dataviz-validated palette), full table view |
| Settings | Profile form with drag-and-drop avatar upload, dark-mode toggle, sign-out-everywhere |

Responsive layout: fixed sidebar ≥ lg, drawer below; dark mode is class-based and persisted.

> `POST /notifications/send` is wired in the UI but not yet implemented in the backend — the dialog surfaces the API error until that endpoint ships.

## Structure

```
src/
├── pages/        Route-level pages (one folder per feature)
├── components/
│   ├── ui/       shadcn/ui primitives (button, dialog, table, select, …)
│   └── shared/   StatCard, Pagination, SearchInput, ImageUpload, charts, …
├── layouts/      DashboardLayout, Sidebar, Topbar
├── hooks/        useAuth, useDebounce
├── services/     Axios client (auth interceptors) + one service per API domain
├── store/        Zustand: auth (persisted tokens), theme
├── routes/       Router + ProtectedRoute (RBAC guard)
├── types/        API envelope + domain DTOs mirrored from the backend
└── utils/        cn, formatters
```
