# AGENTS.md

## Cursor Cloud specific instructions

### Overview

SmartZap is a single Next.js 16 (App Router) application — not a monorepo. All frontend + API routes live in one codebase. External services (Supabase, Upstash, Meta WhatsApp API) are hosted and accessed via env vars. See `CLAUDE.md` for full architecture, patterns, and environment variable reference.

### Running the app

- `npm run dev` starts the Turbopack dev server on port 3000.
- The app requires a `.env.local` file (copy from `.env.example`). Supabase clients gracefully return `null` when env vars are placeholders, so the app starts without real credentials.
- Set `SETUP_COMPLETE=true` in `.env.local` to skip the install wizard and go directly to the login page.
- Login uses `MASTER_PASSWORD` env var with bcrypt comparison; it will fail with placeholder Supabase credentials since the login API route needs a real database to create a session.

### Testing

- **Unit tests (Vitest):** `npm run test` — no external services needed, uses jsdom. See `CLAUDE.md` for single-file and watch commands.
- **E2E tests (Playwright):** `npm run test:e2e` — auto-starts the dev server; requires Chromium installed via `npx playwright install --with-deps chromium`.
- **Lint:** `npm run lint`
- There are 5 pre-existing test failures in `lib/installer/__tests__/machine.test.ts` related to the install wizard state machine. These are not environment issues.

### Key gotchas

- The `.env.local` file is git-ignored and must be created manually on each new environment. Use `.env.example` as a template.
- The health endpoint `/api/health` is public (no auth) and useful for verifying the server is running.
- Tailwind CSS v4 is used — no `tailwind.config.js`; configuration is in the CSS layer.
- `package-lock.json` is the lockfile — always use `npm` (not pnpm/yarn).
