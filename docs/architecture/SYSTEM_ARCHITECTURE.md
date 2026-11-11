# System Architecture — Arman's Devspace

**Tagline:** _"Explore. Build. Break. Rebuild."_  
**Supporting Statement:** _"A hundred projects. One continuous engineering journey."_

---

## 1. Architectural Overview

**Arman's Devspace** is a centralized software engineering workspace built with **Next.js 16 (App Router, Cache Components, Partial Prefetching)** and **TypeScript (strict mode)** designed to curate, audit, modernize, document, and test 100 individual software repositories independently of their target frameworks.

### Key Architectural Principles

1. **Workspace Independence**: Each of the 100 project slots (`#001` through `#100`) tracks its own source URL, local clone path reference, original vs. modernized stack diagrams, 7-phase roadmap, task checklist, notes, screenshots, deployments, and testing logs without coupling to the host application.
2. **Canonical Data Fidelity**: Exact project numbering (`1–100`) is preserved in `src/data/projects.ts` and `prisma/seed.ts`. The 73 supplied repository URLs remain verbatim alongside normalized audit flags (`discrepancyNotes`), and the 27 reserved slots (`#51–59`, `#66–74`, `#85–93`) explicitly report `"Awaiting Source Information"` with zero fabricated data.
3. **Dual Persistence Layer**:
   - **PostgreSQL + Prisma ORM** (`prisma/schema.prisma`): Normalized 13-model relational schema ready for local Docker Postgres (`docker-compose.yml`) or managed Supabase Postgres.
   - **Local Persistent Store Fallback** (`src/services/devspace-store.ts`): Atomic JSON persistence (`data/devspace-store.json`) enabling full CRUD, authentication, Kanban transitions, notes, tasks, and GitHub metadata caching immediately when `DATABASE_URL` is absent.

---

## 2. Authentication & Security Boundaries

- **Session Signing**: Uses `jose` (`HS256` JWT in `HttpOnly`, `SameSite=Lax` cookie `arman_devspace_session`) and Node `crypto.scryptSync` timing-safe password hashing in `src/lib/auth.ts`.
- **Optional OAuth**: Supports Google OAuth via `@supabase/ssr` + `/api/auth/callback` when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured.
- **Next.js 16 Proxy (`src/proxy.ts`)**: Enforces authentication before loading `/dashboard`, `/kanban`, `/journal`, and `/analytics`, attaches defensive HTTP security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`), and marks private workspace routes `X-Robots-Tag: noindex, nofollow`.
- **Server-Only Guardrails**: Database clients, password verification, session cookies, and GitHub token handling strictly enforce `import "server-only"`.
- **Input Validation**: All Route Handlers parse and sanitize requests with Zod (`src/lib/validations.ts`) and reject unsafe URL schemes (`javascript:`, `data:`).

---

## 3. Route & API Map

### Public Showcase & Exploration Routes

- `/` — 10-section product landing page with live persisted workspace statistics
- `/projects` — Canonical 100-project Explorer (search, filters, Grid/List sortable views, pagination)
- `/projects/[slug]` — 15-section project specification & interactive independent workspace
- `/paths` & `/paths/[level]` — Structured tracks (`beginner`, `intermediate`, `advanced`)
- `/technologies` — Ecosystem index computed from canonical project stacks

### Protected Developer Workspace Routes

- `/dashboard` — Personalized engineering KPI dashboard, cadence, streak, notes, milestones
- `/kanban` — 7-column workflow pipeline (`Backlog` → `Completed`) with drag-and-drop & keyboard selectors
- `/journal` — Global Engineering Journal across all 100 repositories
- `/analytics` — Track mastery, verification audits, status funnel, and 7-day cadence

### Route Handlers (`src/app/api/*`)

- `/api/health` — System health, canonical count (`100`), storage mode
- `/api/auth/{register,login,logout,me,callback}` — Account & session lifecycle
- `/api/projects` & `/api/projects/[slug]` — Filtered listing & detailed workspace payloads
- `/api/projects/[slug]/{progress,tasks,notes,roadmap,milestones,deployments,screenshots}` — Authenticated CRUD mutations
- `/api/notes` — Journal cross-project notes API
- `/api/github/verify` — Live GitHub REST API repository inspector & discrepancy verifier
