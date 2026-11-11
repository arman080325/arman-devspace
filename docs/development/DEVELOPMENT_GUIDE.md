# Development Guide — Arman's Devspace

## Prerequisites

- **Node.js** `22.x` or later
- **npm** `10.x` or later
- **Optional:** Docker / PostgreSQL 16 or a Supabase project for relational storage + Google OAuth

---

## 1. Local Setup

```bash
npm install
cp .env.example .env
```

Key environment variables (`.env`):

- `SESSION_SECRET`: Cryptographic secret used to sign `arman_devspace_session` cookies (auto-falls back to a dev secret outside production).
- `GITHUB_TOKEN`: Optional Personal Access Token raising GitHub API verification quota from 60 to 5,000 requests/hour.
- `DATABASE_URL` & `DIRECT_URL`: Optional PostgreSQL connection strings.
- `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Optional Supabase OAuth keys.

> Even without Postgres running, Arman's Devspace persists user accounts, project statuses, checklists, notes, roadmaps, and GitHub verification metadata atomically in `data/devspace-store.json`.

---

## 2. Database Workflow (PostgreSQL + Prisma)

To run PostgreSQL locally via Docker:

```bash
docker compose up -d
npx prisma generate
npx prisma db push
npm run db:seed
```

The seed script (`prisma/seed.ts`) populates all **100 canonical positions** (73 specified repositories + 27 placeholder positions) idempotently using Prisma upserts.

---

## 3. Running & Verification Commands

| Command                | Purpose                                                          |
| ---------------------- | ---------------------------------------------------------------- |
| `npm run dev`          | Start Next.js 16 Turbopack dev server on `http://localhost:3000` |
| `npm run typecheck`    | Run strict TypeScript validation (`tsc --noEmit`)                |
| `npm run lint`         | Run ESLint with Next Core Web Vitals & React 19 rules            |
| `npm run format:check` | Verify formatting with Prettier                                  |
| `npm test`             | Run Vitest unit & component tests                                |
| `npm run test:e2e`     | Run Playwright end-to-end tests                                  |
| `npm run build`        | Compile production build with Cache Components                   |
