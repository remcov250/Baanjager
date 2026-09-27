# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versies volgen
[SemVer](https://semver.org/).

## [Unreleased]

### Beveiliging

- **Alles wat een MCP-tool over een vacature teruggeeft is nu omheind.** Voorheen alleen
  `get_vacancy`; nu ook `add_vacancy`, `update_vacancy`, `set_status`, `add_check_note`,
  `list_vacancies` en `get_summary`. Titel, werkgever, locatie en de remote-notitie staan
  voortaan ook op de lijst. `get_cv_context` gebruikt een vaste lijst aan de MCP-kant en
  vertrouwt niet meer alleen op de lijst die de server meestuurt.
- **CSV-export ontsmet ook formules in teksten van meerdere regels.** Papaparse' eigen
  controle sloeg elke waarde met een regeleinde over, dus een vacaturetekst die met `=`
  begon, ging ongewijzigd de spreadsheet in.
- **Login-rate-limiting per gebruikersnaam.** Eén gedeelde teller liet iedereen die `/login`
  kon bereiken de eigenaar buitensluiten. Achter een proxy (`TRUST_PROXY=true`) telt nu het
  adres dat de proxy zelf toevoegde, niet het eerste dat de client kan verzinnen; verlopen
  tellers worden opgeruimd. Wachtwoord wijzigen heeft dezelfde grens.
- Het eerste account aanmaken is één transactie: twee gelijktijdige `/setup`-posts maken
  niet meer twee accounts. De API-token-vergelijking lekt de lengte van het token niet meer.

### Verbeterd

- **CSV-import.** Bestanden tot 10 MB komen nu echt door (Next weigerde alles boven 1 MB).
  Een open aanhalingsteken breekt de import af in plaats van de rest van het bestand in één
  veld te stoppen; er wordt dan niets toegevoegd. Dubbelen worden herkend zoals bij de API:
  op link, en zonder link op werkgever + functie, dus twee echte vacatures met dezelfde titel
  komen allebei binnen. Elke rij gaat door dezelfde validatie als het formulier, datums die
  niet bestaan vallen weg, en de pagina zegt per overgeslagen rij waarom. De `'` die de
  export voor een formule zet, gaat er bij het inlezen weer af. `POST /api/v1/import` leest
  nooit meer dan 10 MB in. De import is voor een bestaande spreadsheet; een back-up is de map
  `data/` (README).

- **Dubbele-vacaturecheck houdt de job-id in de query aan.** `viewjob?jk=…` (Indeed en
  vergelijkbare sites) telde als één vacature voor de hele site. Alleen trackingparameters
  (`utm_*`, `trk`, `refId`, …) vallen weg; LinkedIn-links met `?currentJobId=` worden
  herkend.
- **Filters op de vacaturelijst volgen de URL.** Na Terug of een tik op "Vacatures" toonden
  de keuzelijsten nog het oude filter terwijl de lijst ongefilterd was.
- **De vacaturelijst toont 100 rijen per keer** met "Toon meer"; de teller blijft het totaal.
  De bronvacature-keuze bij criteria toont de 200 laatst bijgewerkte.
- **Formulieren houden je invoer vast.** Een link die niet met http(s) begint of een veld met
  alleen spaties wordt in de browser al tegengehouden, in plaats van na versturen alles te
  wissen. Foutmeldingen zien er anders uit dan "Opgeslagen".
- Een bron verwijderen vraagt eerst om bevestiging. Een mislukte bewerking van een bron opent
  die bron weer, niet het toevoegformulier.
- Zoeken behandelt `%` en `_` als gewone tekens. Een regel koppelen aan een vacature-id dat
  niet bestaat geeft een melding (API: `400`) in plaats van een serverfout.
- Taalknoppen zijn op de telefoon een volwaardig tikdoel en melden welke taal actief is; het
  tabblad "Meer" licht op bij Instellingen, Bronnen en AI. Hulpteksten zijn aan hun veld
  gekoppeld voor schermlezers. De paginabeschrijving volgt de taal.

### Toegevoegd

- **Motivatiebrief bij de vacature.** Een nieuw veld `coverLetter` (migratie `0004`, alleen
  een kolom erbij) voor de brief zoals je hem verstuurde, zodat je hem de volgende keer kunt
  hergebruiken. In het formulier, in de export (`cover_letter`), in de MCP-tools en in
  `get_cv_context` als `application.coverLetter`. Alleen de brief zelf: naam en
  contactgegevens horen er niet in.
- **Geen dubbele vacatures meer.** `POST /api/v1/vacancies` (MCP `add_vacancy`) weigert een
  tweede rij voor dezelfde vacature met `409` en het id van de bestaande. Een LinkedIn-job
  telt als dezelfde bij hetzelfde job-id, welke URL-variant er ook gebruikt wordt;
  andere links worden vergeleken zonder trackingparameters, `www.` en afsluitende `/`.
  `?allowDuplicate=1` (MCP `allowDuplicate`) voor een pagina die echt twee rollen noemt.
  Zoeken (`q`) vindt nu ook op URL of LinkedIn-job-id.
- **MCP `add_check_note`.** Zet "Check JJJJ-MM-DD: …" bovenaan de statusnotitie en laat de
  rest staan, zodat een assistent bij een controle niet de hele notitie hoeft terug te
  sturen. Dezelfde controle op dezelfde dag twee keer verandert niets.

- **Een CV uit een match.** `GET /api/v1/vacancies/:id/context` (MCP `get_cv_context`)
  geeft alles wat een CV-bouwer nodig heeft: vacature, oordeel als `matchLevel`, bewijs
  per eis, de drie profielsecties, een eventueel al gekoppeld CV, een `untrusted`-lijst en
  een `policy` (alleen bewijs, niets verzinnen, onbekend is geen nee). `PUT
  /api/v1/vacancies/:id/cv` (MCP `link_cv`) onthoudt welk CV in de CV-bouwer erbij hoort;
  idempotent. Werkt met Reactive Resume's eigen MCP-server; Baanjager belt zelf nooit
  naar buiten. Zie `docs/cv-integration.md`.
- **Oordeel "Onzeker"** naast match, mogelijk, zwak en geen match: gekeken, maar de tekst
  zegt te weinig. Het dashboard zet die onder "Navragen"; import kent "onzeker"/"uncertain".
- **Bewijs per eis** (`analysis`): sterk / verwant / deels / onbekend / ontbreekt, plus de
  termen die de vacature zelf gebruikt. De assistent schrijft het via de API of MCP; het
  detail toont het boven de reden. Nieuwe migratie (`0001`, alleen kolommen erbij), met een
  test die 'm op een bestaande én een verse database draait.
- **Vacaturetekst als untrusted data.** De MCP-server zet alle vrije tekst van een vacature
  in een gemarkeerd blok dat van binnenuit niet te sluiten is, zodat een instructie in een
  vacature inhoud blijft. Regressietest inbegrepen.

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

- URL's van vacatures, bronnen en CV-koppelingen moeten `http(s)` zijn; andere schema's
  worden geweigerd in plaats van als link gerenderd.
- De export heeft vier kolommen erbij: `analysis` (JSON), `cv_resume_id`, `cv_url`,
  `cv_linked_at`.
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
