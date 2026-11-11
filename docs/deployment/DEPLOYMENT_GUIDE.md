# Deployment Guide — Arman's Devspace

## Target Platform: Vercel + Supabase (PostgreSQL & Auth)

### 1. Provision Supabase PostgreSQL

1. Create a new Supabase project and obtain:
   - Pooled connection string (`DATABASE_URL` with `?pgbouncer=true`)
   - Direct connection string (`DIRECT_URL`)
   - `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY` (if enabling Google OAuth)
2. Run schema push and seed from a trusted environment:
   ```bash
   npx prisma db push
   npm run db:seed
   ```
3. In **Supabase Authentication → Providers → Google**, configure your Client ID / Secret and whitelist `<PRODUCTION_URL>/api/auth/callback`.

---

### 2. Configure Vercel Environment Variables

Set the following encrypted variables in Vercel Project Settings (Production & Preview):

| Variable                        | Required in Prod       | Notes                                             |
| ------------------------------- | ---------------------- | ------------------------------------------------- |
| `SESSION_SECRET`                | **Yes**                | Generate with `openssl rand -base64 32`           |
| `NEXT_PUBLIC_SITE_URL`          | **Yes**                | Canonical URL (`https://devspace.yourdomain.com`) |
| `DATABASE_URL`                  | Optional (Recommended) | Pooled PostgreSQL URL                             |
| `DIRECT_URL`                    | Optional (Recommended) | Direct PostgreSQL URL for migrations              |
| `GITHUB_TOKEN`                  | Recommended            | Prevents unauthenticated GitHub rate limits       |
| `NEXT_PUBLIC_SUPABASE_URL`      | Optional               | Enables Supabase Google OAuth                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional               | Enables Supabase Google OAuth                     |

---

### 3. Production Build Verification Checklist

Before promoting a release:

1. `npx prisma validate` exits 0
2. `npm run typecheck` exits 0
3. `npm run lint` exits 0
4. `npm test` passes all unit/component assertions
5. `npm run build` compiles `/`, `/projects`, `/paths/[level]`, all 100 `/projects/[slug]` shells, `/robots.txt`, `/sitemap.xml`, and `src/proxy.ts` cleanly
6. Verify `/api/health` returns `200 OK` (`projectsCount: 100`)
