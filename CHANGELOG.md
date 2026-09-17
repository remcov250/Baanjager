# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versies volgen
[SemVer](https://semver.org/).

## [Unreleased]

### Toegevoegd

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
