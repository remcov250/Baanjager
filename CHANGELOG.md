# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versies volgen
[SemVer](https://semver.org/).

## [Unreleased]

### Toegevoegd

- **Werken met AI**: een pagina met hoe je een assistent aansluit (Claude Code, Claude
  Desktop, andere MCP-clients), wat hij kan, en hoe een goede sessie eruitziet.
- **Bronnen zijn bewerkbaar** (UI en `PATCH`/`DELETE /api/v1/sources/:id`).
- Criteria en Bronnen tonen alleen een samenvattingsregel per item en klappen uit op
  klik; toevoegen staat bovenaan. Het vacaturedetail doet hetzelfde: op de telefoon
  staan alleen Oordeel en Status open, de rest heeft een samenvatting; uitlegtekst
  verschijnt alleen op een groter scherm.
- **Dashboard** als startpagina: wat er van jou nodig is (beoordelen, stille sollicitaties,
  ontbrekende terugkoppeling), pijplijn, afgevallen per laag, laatste regels.
- **Dark mode**: volgt het systeem, of vast licht/donker via de schakelaar (sidebar en
  Instellingen). Alle kleuren zijn nu één set tokens.
- Nieuwe schil: sidebar op desktop, tabbalk en zwevende plus-knop op de telefoon. Eigen
  typografie (Bricolage Grotesque + Instrument Sans, self-hosted).
- Vacaturedetail in twee kolommen met een verloop-tijdlijn en een chip-keuze voor het
  oordeel; de lijst kreeg filter-chips en toont randvoorwaarden in de tabel.

### Gewijzigd

- De vacaturelijst is verhuisd van `/` naar `/vacancies`.
- Alles naar de laatste stabiele versies: Next 16 (Turbopack, `proxy.ts`), React 19.3,
  Tailwind 4 (config in CSS), zod 4, better-sqlite3 13, drizzle-orm 0.45 / drizzle-kit 0.31,
  vitest 5 + vite 8, TypeScript 7, Playwright 1.63. Geen schemawijziging; `npm audit` zonder
  high/critical.
- CSV-import loopt in één transactie (één commit voor het hele bestand, niets half).
- CSV-export beschermt tegen formule-injectie: cellen die met `=`, `+`, `-` of `@`
  beginnen krijgen een apostrof, zodat een spreadsheet ze als tekst leest.
- Datums moeten echt bestaan (`2026-02-30` werd stilzwijgend maart).
- `PATCH /api/v1/rules/:id` geeft 404 voor een regel die niet bestaat.
- De MCP-tools `add_vacancy` en `update_vacancy` kennen nu ook de terugkoppelvelden
  (`feedbackCorrect`, `feedbackMissed`, `feedbackInsight`).
- `TZ` in `docker-compose.yml` en `.env.example`, zodat "vandaag" en de begroeting
  niet op UTC lopen. `APP_PASSWORD` (bestond niet) is uit `.env.example`.

### Gefixt

- Open redirect na inloggen: `?next=/\host` werd door browsers als `//host` gelezen.
- Bronnen was op de telefoon onbereikbaar (geen tab, geen link); staat nu bovenaan
  Instellingen.
- Import zette een lege kolom `kantoordagen` om in 0 kantoordagen.
- De teller "wacht op jou" op het dashboard bleef op 6 staan, de lengte van de lijst.
- `/settings?password=__proto__` liet de pagina crashen.
- Criteria, Profiel, Bronnen, Instellingen, Inloggen en Setup gebruikten nog vaste
  stone-kleuren, onleesbaar in dark mode; alles loopt nu via de tokens.
- Toetsenbordfocus is zichtbaar op de chip-keuzes (oordeel, terugkoppeling, filter).
- Het vacaturetekst-veld heeft weer een naam voor schermlezers.
- De login-redirect bewaart nu ook de querystring van de oorspronkelijke URL.

## [0.1.0] — 2026-09-17

Eerste versie.

### Toegevoegd

- Vacatures met laag, oordeel + reden, randvoorwaarden (uren, kantoordagen, contractvorm,
  reistijd, salaris, taaleis), status met toelichting, terugkoppeling en volledige
  vacaturetekst. Nooit verwijderen; *Afgevallen* is een status.
- Criteria in vier soorten (knock-out, zwaarwegend negatief, zwaarwegend positief,
  openstaande twijfel), koppelbaar aan de vacature die de regel leerde; buiten gebruik
  stellen in plaats van verwijderen.
- Gepseudonimiseerd profiel (vaardigheden, ervaring, opleiding, harde eisen, voorkeuren)
  en thuisbasis.
- Bronnen per laag met frequentie en opmerking: het zoekplan.
- CSV-import (Engelse en Nederlandse kolomnamen, vrije statustekst blijft bewaard) en
  -export.
- Account bij eerste start, scrypt-hashing, database-sessies, wachtwoord wijzigen,
  login rate-limiting, security-headers.
- REST-API (`/api/v1`) achter een bearer-token, inclusief `/summary` om bij te praten.
- MCP-server (`mcp/server.mjs`) met tools voor scannen, toevoegen, beoordelen, status en
  criteria.
- Nederlands en Engels.
- Dockerfile (multi-stage, non-root, healthcheck) en docker-compose.
