# Baanjager

**Vacatures zoeken en bijhouden zoals dat in Nederland werkt — met een assistent die het zoekwerk doet.**

*(English below.)*

[![CI](https://github.com/remcov250/Baanjager/actions/workflows/ci.yml/badge.svg)](https://github.com/remcov250/Baanjager/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Bij ons thuis liep een zoektocht naar een nieuwe baan, en ik wilde daar een systeem voor in
plaats van een spreadsheet die steeds langer werd. Elke tracker die ik vond was Amerikaans:
een salarisrange, remote of onsite, klaar. Maar of een vacature in Nederland kans maakt, hangt
af van heel andere dingen — hoeveel dagen je op kantoor moet zijn, hoeveel uur, wat voor
contract, en hoe ver het rijden is. Dus heb ik het zelf gebouwd. Dit is het.

**In het kort**

- Een self-hosted app (één Docker-container) om vacatures te beoordelen en te volgen, gebouwd
  op de Nederlandse arbeidsmarkt.
- Een assistent zoals Claude kan het zoekwerk doen en de app vullen; jij houdt het oordeel.
- Het doel is een match. Van afwijzingen leer je wat je wél zoekt, zodat de volgende match
  sneller komt.
- Telefoon eerst, Nederlands en Engels, dark mode.

## Wat het doet

**Vacatures bijhouden.** Per vacature: hoe ver het is (lokaal, medium, ver of remote), de
voorwaarden (uren, kantoordagen, contractvorm, salaris, taaleis), je oordeel met de reden
erbij, en waar het staat — van nieuw tot gesolliciteerd, gesprek of aanbod.

**Criteria die meegroeien.** Knock-outs, dingen die zwaar wegen, en open twijfels. Een regel
kan gekoppeld zijn aan de vacature waar je 'm van leerde, zodat je later terugleest waarom.

**Een assistent doet het werk.** Via MCP loopt een assistent je bronnen af, voegt vacatures
toe, toetst ze aan je criteria en stelt een oordeel voor. Jij bevestigt of corrigeert, en die
correctie wordt weer een regel.

**Bronnen.** Waar je zoekt, per laag, met hoe vaak. Dat is het zoekplan dat jij of de
assistent volgt.

**Dashboard.** Wat er van jou nodig is (beoordelen, een sollicitatie die stil is gevallen,
terugkoppeling die ontbreekt), de pijplijn, en de laatste regels.

## Waarom een Nederlandse versie

Omdat de velden anders zijn. Een Amerikaanse tracker kent "salary range" en "remote". Hier
beslissen kantoordagen per week, 32 of 36 of 40 uur, onbepaalde tijd of detachering, en
reistijd vanaf huis — vaak over de grens naar Duitsland of België. Baanjager heeft daar
gewoon velden voor, en de lagen (lokaal / medium / ver) volgen je eigen reistijd.

## Match is het doel

Je gebruikt dit om een baan te vinden, niet om afwijzingen te verzamelen. Maar de afwijzingen
zijn wel waar je van leert: elke keer dat iets afvalt en je opschrijft waaróm, wordt je lijst
criteria scherper — en zie je de volgende keer sneller welke vacature wél kansrijk is. Daarom
gooit Baanjager niets weg. Afgevallen is een status, de reden blijft staan.

## Zo werkt de lus

1. Vul je profiel: vaardigheden, ervaring, harde eisen, voorkeuren. Zonder naam of adres —
   dat heeft de assistent niet nodig.
2. Een vacature komt binnen (zelf, via CSV, of door de assistent).
3. Er komt een oordeel mét reden: niet "past niet", maar welke regel botst.
4. Jij beslist. Zat het oordeel ernaast, dan vul je de terugkoppeling in.
5. Status bijhouden: verzonden, reactie, gesprek, aanbod, afwijzing.
6. Een afwijzing die iets leert, wordt een regel. Terug naar 2.

## Installeren

Alleen Docker nodig.

```bash
git clone https://github.com/remcov250/Baanjager.git
cd Baanjager
docker compose up -d
```

Open <http://localhost:3000>. De eerste keer maak je een account aan. De data staat in een
Docker-volume; er is één account en het wachtwoord wordt gehasht opgeslagen.

Wil je de API en MCP gebruiken, zet dan een token in `docker-compose.yml`:

```bash
openssl rand -hex 32   # dit wordt je API_TOKEN
```

## De app vullen

Drie manieren, die je kunt combineren:

- **Zelf**, met de plus-knop.
- **Uit een spreadsheet** (Instellingen → CSV importeren). Kolommen: `employer, title, url,
  source, found_on, layer, verdict, verdict_reason, status, applied_on, closed_on`, of de
  Nederlandse namen `werkgever, titel, bron, datum_gevonden, laag, oordeel, reden_kort,
  gesolliciteerd, datum_sollicitatie, vervallen_op`. Vrije tekst in de statuskolom blijft
  bewaard als toelichting. Dezelfde import kan via `POST /api/v1/import`.
- **Door de assistent.** Geef 'm je oude lijst, of laat 'm de bronnen aflopen — hij vult
  vacatures, profiel, criteria en bronnen via MCP. Hoe je dat opzet staat hieronder.

## Een AI-agent die de zoektocht doet

Dit is waar Baanjager voor gebouwd is. De app zelf bevat geen AI en heeft geen API-sleutel
van een AI-aanbieder nodig. Wat je nodig hebt is een assistent die MCP spreekt — voor nu
betekent dat een **AI-abonnement** zoals Claude Code of Claude Desktop, niet een API-token.
(Bring-your-own-key voor gebruikers zonder zo'n abonnement staat op de lijst, zie onderaan.)

**1. Koppel de assistent.** Op de machine waar de assistent draait:

```bash
git clone https://github.com/remcov250/Baanjager.git && cd Baanjager && npm ci
claude mcp add baanjager \
  -e BAANJAGER_URL=http://localhost:3000 \
  -e BAANJAGER_TOKEN=<je API_TOKEN> \
  -- node mcp/server.mjs
```

Andere MCP-clients werken ook; de pagina *Werken met AI* in de app heeft het blok voor
Claude Desktop.

**2. Geef de agent een opdracht.** Dit is het instructieblok dat ik zelf gebruik (zet het in
de projectinstructies van je assistent, bijvoorbeeld `CLAUDE.md`):

```markdown
Je beheert mijn vacaturezoektocht in Baanjager via de MCP-tools.

Bij het begin van elke sessie:
1. get_summary — wat loopt er, wat wacht op mij.
2. list_rules — dit zijn de grenzen. Toets elke vacature hieraan, in deze volgorde:
   knock-outs, dan randvoorwaarden per laag, dan pas de inhoud.
3. get_profile — wie ik ben en wat ik zoek.

Bij een scan ("vacature-check"):
- Loop get_scan_plan af. Behandel alleen vacatures die nog niet in de app staan.
- Controleer een vondst altijd op de eigen site van de werkgever, niet op een vacaturebank.
- Voeg elke beoordeelde vacature toe met add_vacancy: laag, locatie, uren, kantoordagen,
  contractvorm, taaleis, oordeel én reden. De reden noemt de regel die botst of past.
- Sluit af met een korte samenvatting: nieuw, afgevallen, en wat er van mij nodig is.

Verder:
- Status wijzigen alleen met set_status, met een notitie en datum.
- Na een afwijzing: vraag mij naar de reden en maak er met add_rule een regel van,
  gekoppeld aan de vacature.
- Je verwijdert nooit iets. Afgevallen is een status.
```

**3. Laat 'm draaien.** Een sessie op je laptop werkt. Wil je dat de agent altijd aan staat
(zodat je 'm vanaf je telefoon iets kunt vragen), draai de assistent dan op een server in
een `tmux`-sessie, met de app op dezelfde machine of ergens in je netwerk. De MCP-server
praat alleen met de app-URL die je opgeeft, dus de app hoeft niet op internet te staan.

## Beveiliging

- Account bij eerste start, wachtwoord gehasht (scrypt), sessies in de database en dus
  intrekbaar; wachtwoord wijzigen logt de rest uit.
- Rate-limiting op de login, security-headers op elke pagina, container zonder root.
- De API staat uit tot je `API_TOKEN` zet. Wie het token heeft, kan alles wat de app kan:
  behandel het als een wachtwoord.
- Er is bewust geen delete, ook niet via de API.
- Zet 'm niet open op internet zonder reverse proxy met HTTPS; een VPN is de bedoeling.
  Achter een proxy: `TRUST_PROXY=true`.

Meer in [SECURITY.md](SECURITY.md).

## Ontwikkelen

```bash
npm ci
cp .env.example .env
npm run dev          # http://localhost:3000
npm test             # unit tests
npm run test:e2e     # Playwright, telefoon en desktop (na npm run build)
```

Next.js 16, SQLite via Drizzle, Tailwind 4. Eén container, geen losse database. Zie
[CONTRIBUTING.md](CONTRIBUTING.md).

## Wat er nog niet in zit

- Bring-your-own-key: een oordeel laten genereren zonder AI-abonnement, met je eigen sleutel
  van OpenAI, Anthropic of een lokaal model.
- Koppelingen met Nederlandse ATS'en (Recruitee, Homerun) om vacatures automatisch op te
  halen.
- Meer dan één account.

Baanjager is geïnspireerd door [JobSync](https://github.com/Gsync/jobsync), een goede
self-hosted tracker voor de Amerikaanse markt. Dit is de Nederlandse variant, van de grond
af gebouwd.

---

## English

**Find and track vacancies the way it works in the Netherlands — with an assistant doing
the legwork.**

I built this for a job search at home, after finding that every tracker out there was
American: salary range, remote or onsite, done. In the Netherlands an application is decided
by office days per week, hours, contract type and travel time — often across the border into
Germany or Belgium. Baanjager has fields for exactly that.

The goal is a match. Rejections are what you learn from: write down why something dropped,
and your criteria get sharper, so the next match comes faster. Nothing is ever deleted;
dropped is a status and the reason stays.

It is one Docker container, phone-first, Dutch and English with dark mode. An assistant
connects over MCP (`mcp/server.mjs`) and can scan your sources, add and assess vacancies,
update status and turn rejections into rules. For now that needs an AI subscription that
speaks MCP (Claude Code, Claude Desktop); there is no API key inside the app. The
*Working with AI* page in the app has the setup, and the agent instructions above translate
directly.

Quick start, security and development are the same as above. Questions and contributions in
English are welcome.

## Licentie / License

MIT — zie [LICENSE](LICENSE).
