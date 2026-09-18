# Baanjager — instructions for AI agents working in this repository

This is a public, MIT-licensed project. Anything committed here is visible to everyone and
stays in git history. Read this whole file before changing anything.

## What it is

A self-hosted job-search tracker for the Dutch market (Next.js 15, SQLite via Drizzle,
Tailwind, one Docker container). Its distinguishing idea: vacancies are never deleted,
because a rejection with its reason is the training data for the user's criteria. The full
product description is in `README.md`; the architecture map is in `CONTRIBUTING.md`.

## Hard rules

1. **No personal data, ever, in this repository.** No real names, employers, vacancy texts,
   application notes, CVs, addresses, or anything from a real job search — not in code, not
   in tests, not in fixtures, not in commit messages. Test data uses "Acme", "Beta",
   "Counsel". If you need a realistic example, invent one.
2. **No infrastructure details of whoever runs an instance.** No hostnames, IPs, VPN
   addresses, domains, ports of a real deployment, tokens, or secret-manager references.
   Docs use `localhost:3000` and `<your API_TOKEN>`.
3. **No delete on vacancies.** Not in the UI, not in the API, not "just for admins". If a
   request needs it, the answer is the *dropped* status.
4. **No personal-data fields in the profile model.** Name, address, phone, email, date of
   birth do not get columns. This is a design boundary, not a missing feature.
5. **Both language files stay in sync.** Every key in `messages/nl.json` exists in
   `messages/en.json` and vice versa. There's a parity check in the test suite; keep it
   green.
6. **Mobile first.** Base styles target a phone; `sm:` and up are additive. Check a new
   page at 400px before calling it done.

## Working on it

```bash
npm ci && cp .env.example .env
npm run dev              # http://localhost:3000, first visit → /setup
npm test                 # vitest
npx tsc --noEmit
npm run build            # what the Dockerfile runs
```

Schema change → edit `db/schema.ts` → `npm run db:generate` → commit the new file under
`drizzle/`. Migrations run automatically at startup.

New vacancy field → column in `db/schema.ts`, migration, zod in `lib/validation.ts`, the
form in `components/vacancy-form.tsx`, both language files, `lib/export.ts`, and the MCP
tool schema in `mcp/server.mjs`. If a CV builder needs it, also `lib/context.ts`.
`tests/migration.test.ts` runs every migration against a database that stopped at the
previous one and against a fresh one; keep migrations additive.

Anything an assistant reads back that came from a posting or free text goes through
`mcp/untrusted.mjs` (`wrapPaths`) — see `tests/context-api.test.ts` for the regression
that must keep passing. Baanjager makes no outbound requests: the CV builder integration
is composition over MCP (`docs/cv-integration.md`), never a server-side call.

## Verifying

The unit tests cover the import mapping, validation and language-file parity. The
Playwright suite (`npm run build && npm run test:e2e`) walks the real flow in Chromium on a
phone profile first, then desktop: setup → add a vacancy → verdict → rule from it →
filters → auth → API. It also asserts no page scrolls sideways at phone width. Run it after
any UI change; it needs a production build and starts its own server on port 3711 with a
throwaway database in `.e2e-data/`.

`docker compose up --build` is the real acceptance test: it must build, start, answer
`/api/health`, and show `/setup` on first visit.

Two things that cost real time once:

- **Never leave a `next start` running across a rebuild.** A stale server keeps serving the
  old HTML, whose CSS/JS hashes no longer exist after `next build` — pages render unstyled
  and it looks like a CSS bug. Before building, kill any server whose cwd is this directory
  (`ps -eo pid,args | grep next-server`, then `readlink /proc/<pid>/cwd`); `pkill -f` on the
  command line tends to kill your own shell instead.
- **CI builds arm64 natively** (`ubuntu-24.04-arm`), not under QEMU: Next's SWC compiler
  dies with SIGILL when emulated. Keep the per-platform matrix + manifest job as is.

## Style

Prose in the UI and docs sounds like a person, not a brochure. Dutch is the default UI
language; English is complete but second. Code and commit messages are in English.
