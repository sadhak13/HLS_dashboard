# HLS Dashboard

An internal management dashboard for **Hyderabad Little Stars (HLS) Soccer Academy** — a youth soccer academy operating across multiple branch locations in Hyderabad, India. The platform enables administrators and coaches to manage players, track attendance, handle fee collection, and oversee day-to-day academy operations through a role-based interface.

## Features

- **Role-Based Access** — Separate dashboards and permissions for Admins and Coaches
- **Player Management** — Registration, enrollment tracking, status management (active/inactive/dropped)
- **Coach Management** — Account provisioning, branch & batch assignment, transfers
- **Branch & Batch Management** — Multiple locations with configurable training time slots and days
- **Attendance Tracking** — Daily present/absent marking with calendar view and filters
- **Fee Management** — Monthly fee generation, payment tracking (paid/pending), bulk operations
- **Analytics Dashboard** — KPIs, charts, and stats for academy-wide or branch-level performance

## Tech Stack & Versions

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.2.9 | React framework (App Router) |
| React | 19.2.4 | UI library |
| TypeScript | ^5 | Type safety |
| Supabase JS | ^2.108.2 | Backend, database & authentication |
| Supabase SSR | ^0.12.0 | Server-side Supabase client |
| Tailwind CSS | ^4 | Utility-first styling |
| Recharts | ^3.9.2 | Data visualization & charts |
| Zod | ^4.4.3 | Schema validation |
| date-fns | ^4.4.0 | Date utilities |
| Lucide React | ^1.24.0 | Icon library |
| Radix UI | ^1.3.0 | Accessible UI primitives |
| class-variance-authority | ^0.7.1 | Component variant styling |
| Vitest | ^4.1.10 | Unit testing framework |
| Testing Library | ^16.3.2 | Component testing utilities |
| ESLint | ^9 | Code linting |

## Prerequisites

- **Node.js** >= 18.x
- **npm** (or yarn/pnpm/bun)
- A **Supabase** project with the required database schema

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd HLS_dashboard
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |

### 4. Run the development server

```bash
npm run dev
```

On Windows (PowerShell):

```powershell
cmd.exe /c npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for production

```bash
npm run build
npm start
```

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Dev | `npm run dev` | Start development server |
| Build | `npm run build` | Create production build |
| Start | `npm run start` | Run production server |
| Lint | `npm run lint` | Run ESLint |
| Test | `npm run test` | Run tests in watch mode |
| Test (CI) | `npm run test:run` | Run tests once |

## Project Structure

```
app/
├── (auth)/              # Authentication pages (login, change-password)
├── (admin)/             # Admin-only pages (dashboard, players, coaches, branches, attendance, fees)
├── (coach)/             # Coach-only pages (coach-dashboard, my-players, my-attendance, my-fees)
├── layout.tsx           # Root layout with AuthProvider & ToastProvider
└── page.tsx             # Root redirect to /login

components/              # Reusable UI components
lib/                     # Utilities, Supabase clients, types
```

## Roles

| Role | Access |
|------|--------|
| **ADMIN** | Full access — manage all branches, coaches, players, attendance, and fees |
| **COACH** | Scoped access — manage players, attendance, and fees for assigned branches/batches |
