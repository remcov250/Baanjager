# Bijdragen / Contributing

Fijn dat je kijkt. Issues en PR's mogen in het Nederlands of Engels.

## Opzetten

```bash
git clone <deze repository>
cd baanjager
npm ci
cp .env.example .env
npm run dev
```

Node 22. De database wordt bij de eerste start aangemaakt in `./data/`.

```bash
npm test              # unit tests (vitest)
npx tsc --noEmit      # typecheck
npm run build         # productie-build, doet Docker ook
npm run test:e2e      # Playwright: mobiel én desktop, tegen de build hierboven
                      # (eerste keer: npx playwright install chromium)
```

## Hoe het in elkaar zit

| Pad | Wat |
|---|---|
| `db/schema.ts` | Het datamodel (Drizzle). Wijzig je iets: `npm run db:generate` maakt de migratie |
| `lib/validation.ts` | zod-schema's. Formulieren én API gebruiken dezelfde |
| `lib/auth.ts` | Wachtwoorden, sessies, rate-limiting, API-token |
| `lib/import.ts` | CSV → vacature. Pure functies, goed getest — hier zit de NL-spreadsheet-logica |
| `lib/vacancies.ts`, `rules.ts`, `profile.ts`, `sources.ts` | Queries |
| `app/(app)/` | De pagina's achter de login; elke map heeft een `actions.ts` met server actions |
| `app/(auth)/` | Login en eerste-keer-setup |
| `app/api/v1/` | REST-API (bearer-token) |
| `mcp/server.mjs` | MCP-server, praat met de REST-API |
| `messages/nl.json`, `en.json` | Alle UI-teksten. Beide bestanden moeten dezelfde keys hebben |

## Afspraken

- **Mobile first.** Basisstijl is de telefoon; `sm:` en groter zijn de uitzondering. Test
  een nieuwe pagina op 400px breed voordat je 'm op desktop bekijkt.
- **Geen delete op vacatures.** Ook niet "voor het gemak". Status *Afgevallen* is het
  antwoord.
- **Geen persoonsgegevens in het profiel-model.** Geen velden voor naam, adres, telefoon,
  e-mail of geboortedatum. Dat is een bewuste grens, geen vergeten feature.
- **Alle tekst via `t()`.** Geen hardcoded strings in componenten; voeg keys toe aan beide
  taalbestanden.
- **Formulierdata via zod.** Nieuwe velden: schema in `lib/validation.ts`, kolom in
  `db/schema.ts`, migratie genereren, formulier, en de export in `lib/export.ts`.

## Wat welkom is

- Bugs, met stappen om ze te herhalen.
- Nederlandse ATS-koppelingen (Recruitee, Homerun) om vacatures automatisch op te halen.
- Verbeteringen aan de CSV-import voor spreadsheets die er nét anders uitzien.
- Vertalingen — de structuur is er, een derde taal is een JSON-bestand.

## Wat niet in scope is

Multi-user met rollen, een ingebouwde LLM-chat, of een tweede database-backend. Het moet
één container blijven die iemand in vijf minuten draaiend heeft.
