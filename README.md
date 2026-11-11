# Arman's Devspace

> **"Explore. Build. Break. Rebuild."**  
> *A hundred projects. One continuous engineering journey.*

**Arman's Devspace** is a personal software engineering workspace designed to discover, inspect, modernize, document, test, and ship **100 software engineering projects** cleanly—with each project workspace strictly isolated from the central application's own stack.

---

## Core Capabilities

- **Canonical 100-Project Explorer (`/projects`)**: Strict numerical ordering (`#001`–`#100`) preserving 73 supplied repository URLs verbatim (alongside audit discrepancy metadata) and 27 reserved slots (`#51–59`, `#66–74`, `#85–93`) marked awaiting source data. Supports Grid and sortable Table (`List`) views, search, filters, bookmarks, and pagination.
- **15-Section Project Workspace (`/projects/[slug]`)**: Independent workspace per project featuring original/modernized architecture editors, local clone path reference tracking, 7-phase modernization roadmap, milestone planner, task checklist (auto-updating completion %), personal notes, deployment records, screenshots registry, testing summary editor, and live GitHub API sync.
- **GitHub Repository Intelligence (`/api/github/verify`)**: Verifies upstream repository existence, flags subtree/whitespace/mismatch anomalies (`#18`, `#24`, `#28`, `#49`, `#61`, `#78`, etc.), handles GitHub rate limits gracefully, and caches live stars/forks/issues/language metadata without fabricating missing stats.
- **Protected Engineering Suite (`/dashboard`, `/kanban`, `/journal`, `/analytics`)**:
  - **Dashboard**: Persisted KPIs, 7-day engineering activity, active & recently accessed projects, streak, notes, and upcoming milestones.
  - **7-Column Kanban**: `Backlog → Cloned → Analyzing → Planning → In Development → Testing → Completed` with drag-and-drop and keyboard stage controls.
  - **Engineering Journal**: Filterable technical log across `general`, `architecture`, `bug`, `solution`, and `learning` entries.
  - **Analytics & Technologies**: Track mastery (`Beginner 1–30`, `Intermediate 31–50`, `Advanced 51–100`), repository audit counts, and technology distribution (`/technologies`).

---

## Technology Stack

- **Framework**: Next.js 16 (App Router, Cache Components, Partial Prefetching, `src/proxy.ts`)
- **Language**: TypeScript (`strict: true`)
- **UI & Styling**: React 19, Tailwind CSS v4, shadcn (`base-nova` / `@base-ui/react`), Lucide Icons, `next-themes`, `cmdk`
- **Forms & Validation**: React Hook Form + Zod
- **Data & Auth**: PostgreSQL, Prisma ORM, Supabase SSR Auth (optional Google OAuth), `jose` JWT sessions, `scrypt` password hashing, and atomic disk persistence fallback (`data/devspace-store.json`)
- **Testing & Quality**: Vitest, Testing Library, Playwright, ESLint, Prettier

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env

# 3. Start development server
npm run dev
```

Visit `http://localhost:3000`. Register an account on `/register` to initialize workspace owner permissions—or configure `DATABASE_URL` and run Postgres:

```bash
docker compose up -d
npx prisma generate
npx prisma db push
npm run db:seed
```

---

## Available Scripts

- `npm run dev` — Start development server
- `npm run build` — Build optimized production bundle
- `npm run start` — Serve production build
- `npm run typecheck` — Run `tsc --noEmit`
- `npm run lint` — Run ESLint
- `npm run format:check` — Verify Prettier formatting
- `npm test` — Run Vitest unit & component tests
- `npm run test:e2e` — Run Playwright end-to-end tests
- `npm run db:validate` / `npm run db:seed` — Validate Prisma schema & seed 100 canonical positions

---

## Documentation

- [System Architecture](docs/architecture/SYSTEM_ARCHITECTURE.md)
- [Development Guide](docs/development/DEVELOPMENT_GUIDE.md)
- [Deployment Guide](docs/deployment/DEPLOYMENT_GUIDE.md)
- [Changelog](CHANGELOG.md)
