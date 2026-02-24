# AGENTS.md

## Cursor Cloud specific instructions

### Overview

SmartZap is a single Next.js 16 (App Router) application — not a monorepo. All frontend + API routes live in one codebase. External services (Supabase, Upstash, Meta WhatsApp API) are hosted and accessed via env vars. See `CLAUDE.md` for full architecture, patterns, and environment variable reference.

### Running the app

- `npm run dev` starts the Turbopack dev server on port 3000.
- The app requires a `.env.local` file (copy from `.env.example`). Supabase clients gracefully return `null` when env vars are placeholders, so the app starts without real credentials.
- Set `SETUP_COMPLETE=true` in `.env.local` to skip the install wizard and go directly to the login page.
- Login uses `MASTER_PASSWORD` env var (plain text or SHA-256 hash); it requires a real Supabase database to create sessions.
- **Env var override gotcha:** If Supabase/auth secrets are injected as system environment variables, dotenv will NOT override them from `.env.local` (dotenv v17 default behavior). You must either export the desired values before `npm run dev` or use `MASTER_PASSWORD=xxx NEXT_PUBLIC_SUPABASE_URL=xxx npm run dev`.

### Testing

- **Unit tests (Vitest):** `npm run test` — no external services needed, uses jsdom. See `CLAUDE.md` for single-file and watch commands.
- **E2E tests (Playwright):** `npm run test:e2e` — auto-starts the dev server; requires Chromium installed via `npx playwright install --with-deps chromium`.
- **Lint:** `npm run lint`
- There are 5 pre-existing test failures in `lib/installer/__tests__/machine.test.ts` related to the install wizard state machine. These are not environment issues.

### Local Supabase with Docker

For full login/auth testing, you can run Supabase locally:

1. Clone the Supabase docker setup: `git clone --depth 1 https://github.com/supabase/supabase.git /tmp/supabase-docker`
2. Start services: `cd /tmp/supabase-docker/docker && cp .env.example .env && docker compose up -d db rest kong`
3. Apply migrations: `cat /workspace/supabase/migrations/00000000000000_init.sql | docker compose exec -T db psql -U postgres -d postgres`
4. Grant PostgREST access: `docker compose exec -T db psql -U postgres -d postgres -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticator; NOTIFY pgrst, 'reload schema';"`
5. Restart PostgREST: `docker compose restart rest`
6. Use URL `http://localhost:8000` with the default keys from `.env.example`

### Key gotchas

- The `.env.local` file is git-ignored and must be created manually on each new environment. Use `.env.example` as a template.
- **System env vars override `.env.local`** — dotenv v17 does NOT override existing env vars. If Cursor Cloud injects Supabase secrets, you must explicitly set them when starting the dev server.
- The health endpoint `/api/health` is public (no auth) and useful for verifying the server is running.
- Tailwind CSS v4 is used — no `tailwind.config.js`; configuration is in the CSS layer.
- `package-lock.json` is the lockfile — always use `npm` (not pnpm/yarn).
