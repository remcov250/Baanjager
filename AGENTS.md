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
tool schema in `mcp/server.mjs`.

## Verifying

The unit tests cover the import mapping and validation. There are no browser tests yet;
after a UI change, run `npm run dev`, go through setup → add a vacancy → set a verdict →
make a rule from it → check the criteria page, on a narrow viewport.

`docker compose up --build` is the real acceptance test: it must build, start, answer
`/api/health`, and show `/setup` on first visit.

## Style

Prose in the UI and docs sounds like a person, not a brochure. Dutch is the default UI
language; English is complete but second. Code and commit messages are in English.
