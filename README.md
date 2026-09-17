# Baanjager

**Een vacaturetracker voor de Nederlandse markt, die van elke afwijzing leert wat je wilt.**

*(English below.)*

Baanjager is de Nederlandse variant van een self-hosted vacaturetracker, geïnspireerd door
[JobSync](https://github.com/Gsync/jobsync) — een prima project, maar gebouwd op de
Amerikaanse markt: salary range, remote/onsite, klaar. Hier draait het om de dingen waar
een sollicitatie in Nederland écht op valt of staat: **kantoordagen**, **uren**,
**contractvorm**, **reistijd** vanaf je thuisbasis (ook over de grens), en of de vacature
nog wel open is op de eigen site van de werkgever in plaats van op een verlopen aggregator.

En één principe dat je nergens anders vindt: **vacatures worden nooit verwijderd.** Een
afwijzing mét reden is waardevoller dan een match — het is de trainingsdata van je criteria.
Na tien beoordeelde vacatures heb je geen stapel oordelen, maar een lijst regels waarmee je
zelf al ziet wat kansloos is voordat je er tijd in steekt.

Gebouwd voor de telefoon eerst, omdat je een vacature meestal in de trein ziet.

## Wat erin zit

- **Vacatures** met laag (Lokaal / Medium / Ver / Remote), oordeel (Match / Mogelijk / Zwak /
  Geen match) en status (Nieuw → Bezig → Gesolliciteerd → Gesprek → Aanbod, of On hold /
  Afgewezen / Afgevallen). Het veld dat telt is de **reden** bij het oordeel.
- **Criteria**: knock-outs, zwaarwegend negatief/positief en openstaande twijfels. Een regel
  kan gekoppeld worden aan de vacature die 'm leerde, zodat je later terugleest waarom.
- **Terugkoppeling** per vacature: klopte het oordeel, wat is er gemist, en welk inzicht hoort
  bij de criteria. Van daaruit maak je met één klik een regel.
- **Profiel**, gepseudonimiseerd: vaardigheden, ervaring, harde eisen, voorkeuren. Geen
  naam, adres of telefoonnummer — voor het matchen voegen die niets toe.
- **Bronnen**: waar je zoekt, per laag, met frequentie. Het zoekplan dat jij of een
  assistent afloopt.
- **CSV-import en -export**, inclusief Nederlandse kolomnamen als je uit een spreadsheet komt.
- **REST-API en MCP-server**, zodat een assistent zoals Claude Code een scan kan doen,
  vacatures kan toevoegen en beoordelen en de status kan bijwerken.
- **Nederlands en Engels**, per browser te wisselen.

## Snel starten

Je hebt Docker nodig, verder niets.

```bash
git clone <deze repository>
cd baanjager
docker compose up -d
```

Open <http://localhost:3000>. De eerste keer maak je een account aan; daarna log je daarmee
in. Er is één account, het wachtwoord wordt gehasht opgeslagen, en de data staat in een
Docker-volume (`baanjager-data`).

Wil je de API en MCP gebruiken, zet dan een token in `docker-compose.yml`:

```bash
openssl rand -hex 32   # dit wordt je API_TOKEN
```

## Een assistent aansluiten (MCP)

De MCP-server praat via stdio met de assistent en via de REST-API met de app. Hij draait
dus op de machine waar de assistent draait, en de app mag ergens anders staan.

```bash
git clone <deze repository> && cd baanjager && npm ci
claude mcp add baanjager \
  -e BAANJAGER_URL=http://localhost:3000 \
  -e BAANJAGER_TOKEN=<je API_TOKEN> \
  -- node mcp/server.mjs
```

Daarna kan de assistent: `get_summary` (bijpraten), `list_vacancies`, `add_vacancy`,
`update_vacancy`, `set_status`, `list_rules`, `add_rule`, `get_profile`,
`update_profile_section` en `get_scan_plan`. Een goede sessie begint met `get_summary` en
`list_rules`, en loopt daarna `get_scan_plan` af.

## Importeren uit een spreadsheet

Instellingen → CSV importeren. Kolommen die herkend worden: `employer, title, url, source,
found_on, layer, verdict, verdict_reason, status, applied_on, closed_on` — en de Nederlandse
namen `werkgever, titel, bron, datum_gevonden, laag, oordeel, reden_kort, gesolliciteerd,
datum_sollicitatie, vervallen_op`. Vrije tekst in de statuskolom blijft bewaard als
toelichting; `Lokaal (Zwolle)` wordt laag *Lokaal* met locatie *Zwolle*. Bestaande
vacatures (zelfde werkgever + titel) worden overgeslagen, niet overschreven.

## Beveiliging

- Account aanmaken bij eerste start; wachtwoord gehasht met scrypt; sessies in de database,
  dus intrekbaar. Wachtwoord wijzigen logt alle andere sessies uit.
- Rate-limiting op de login (10 pogingen per kwartier).
- Security-headers (CSP, geen framing, nosniff) op elke pagina.
- Container draait als een gebruiker zonder rechten, met een healthcheck.
- API alleen aan als `API_TOKEN` gezet is; vergelijking in constante tijd.
- Er is bewust geen delete. Afgevallen is een status, niet een verwijderknop.
- Zet `TRUST_PROXY=true` achter een reverse proxy met HTTPS, zodat de cookie de
  Secure-vlag krijgt en rate-limiting per echt IP werkt.

Zie [SECURITY.md](SECURITY.md) voor hoe je iets meldt.

## Ontwikkelen

```bash
npm ci
cp .env.example .env
npm run dev          # http://localhost:3000
npm test             # vitest
npm run db:generate  # na een schema-wijziging in db/schema.ts
```

Next.js 15 (App Router, server actions), SQLite via Drizzle, Tailwind. Eén container, geen
losse database. Zie [CONTRIBUTING.md](CONTRIBUTING.md).

## Wat er nog niet in zit

- Ingebouwde AI-beoordeling (bring your own key). Nu gaat dat via MCP, met de assistent die
  je al hebt — dat is bewust: geen API-keys in de app tot het echt nodig is.
- Koppelingen met Nederlandse ATS'en (Recruitee, Homerun) om vacatures automatisch op te
  halen.
- Meer dan één account.

---

## English

**A job-search tracker for the Dutch market that learns what you want from every rejection.**

The Dutch counterpart of a self-hosted job tracker, inspired by
[JobSync](https://github.com/Gsync/jobsync). Where JobSync is built around the US market
(salary range, remote/onsite), Baanjager tracks what actually decides an application in the
Netherlands: office days per week, hours, contract type, travel time from your home base
(including across the border into Germany and Belgium), and whether the posting is still
live on the employer's own site rather than a stale aggregator.

One principle you won't find elsewhere: vacancies are never deleted. A rejection with its
reason is worth more than a match — it's the training data for your criteria.

The interface is available in English (switch in the top right), the docs above are in
Dutch because that's the market. Everything else — quick start, MCP setup, security — works
the same. Questions and contributions in English are very welcome.

## Licentie / License

MIT — zie [LICENSE](LICENSE).
