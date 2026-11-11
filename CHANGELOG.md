# Changelog — Arman's Devspace

All notable milestones and changes to **Arman's Devspace** are documented in this file.

## [0.1.0] — Initial Platform Release

### Foundation & Branding (Phase 1)
- Established consistent **Arman's Devspace** identity, tagline (*"Explore. Build. Break. Rebuild."*), metadata template, SVG favicon, theme tokens, loading, error, and 404 boundaries.
- Implemented dark-first theme palette (`#0B0D12` / `#11151D` / `#151B26` / `#8B5CF6` / `#38BDF8`) alongside Light and System theme switching (`next-themes` + `useSyncExternalStore`).
- Built accessible sticky navigation (`Navbar` with skip link, mobile `Sheet`, `aria-current="page"`, account menu) and global Command Palette (`Ctrl+K` / `⌘K`) indexing all 100 projects.

### Core Interface & Canonical Collection (Phase 2)
- Encoded all 100 canonical project positions (`src/data/projects.ts`) in strict numerical order `#001–#100`: 73 specified GitHub repositories with verbatim source URLs and discrepancy tracking plus 27 explicitly reserved slots (`#51–59`, `#66–74`, `#85–93`).
- Built 10-section Homepage with real persisted statistics inside Next.js 16 `<Suspense>` boundaries.
- Implemented Project Explorer (`/projects`) with search, difficulty/category/technology/status/verification/bookmark filters, sorting, pagination, Grid view, and accessible sortable Data Table (`List` view).
- Implemented Learning Paths (`/paths`, `/paths/beginner`, `/paths/intermediate`, `/paths/advanced`), Technology Tracker (`/technologies`), and 15-section interactive Project Workspaces (`/projects/[slug]`).

### Persistence, Auth, Kanban, Journal & Intelligence (Phases 3–5)
- Designed 13-model relational PostgreSQL Prisma schema (`prisma/schema.prisma`), `docker-compose.yml`, `.env.example`, and idempotent seed script (`prisma/seed.ts`).
- Built persistent Data Access Layer (`src/services/devspace-store.ts`) + Zod validation schemas (`src/lib/validations.ts`) + REST Route Handlers (`/api/*`).
- Implemented scrypt + `jose` JWT session auth + optional Supabase Google OAuth + `src/proxy.ts` route protection (`/dashboard`, `/kanban`, `/journal`, `/analytics`).
- Implemented Developer Dashboard, 7-column accessible Kanban board, Engineering Journal (`/journal`), Development Analytics (`/analytics`), and live GitHub REST API repository verification (`/api/github/verify`).

### Production Hardening, SEO, CI/CD & Testing (Phase 6)
- Configured `robots.ts` and `sitemap.ts` with `noindex, nofollow` enforcement on private workspace routes.
- Added architecture, development, and deployment documentation, CI workflow (`.github/workflows/ci.yml`), Vitest unit/component suites, and Playwright E2E suite.

