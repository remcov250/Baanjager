import type { Locale } from "@/lib/i18n";

// The "working with AI" guide, one block per language. Prose lives here rather
// than in the message files: it is long, structured, and reads as a page.

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-surface-2 p-3 text-[13px] leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

const TOOLS = [
  ["get_summary", "Wat er speelt: aantallen, wat wacht op jou, laatste wijzigingen.", "What is going on: counts, what waits on you, recent changes."],
  ["list_rules", "De criteria — lees deze vóór elke beoordeling.", "The criteria — read these before assessing anything."],
  ["get_scan_plan", "De bronnen per laag, met frequentie en opmerkingen.", "The sources per layer, with cadence and notes."],
  ["list_vacancies / get_vacancy", "Zoeken en lezen; get_vacancy geeft de volledige tekst.", "Search and read; get_vacancy returns the full text."],
  ["add_vacancy / update_vacancy", "Toevoegen en beoordelen — altijd mét reden.", "Add and assess — always with a reason."],
  ["set_status", "Status doorgeven met een notitie: verzonden, reactie, afwijzing.", "Update the status with a note: sent, reply, rejection."],
  ["add_rule", "Van een afwijzing een regel maken, gekoppeld aan de vacature.", "Turn a rejection into a rule, linked to the vacancy."],
  ["get_profile / update_profile_section", "Het gepseudonimiseerde profiel lezen en bijwerken.", "Read and update the pseudonymised profile."],
  ["get_cv_context", "Alles wat een CV-bouwer nodig heeft voor één vacature, plus of er al een CV aan hangt.", "Everything a CV builder needs for one vacancy, plus whether a CV is already linked."],
  ["link_cv", "Onthouden welk CV in de CV-bouwer bij deze vacature hoort.", "Remember which CV in the CV builder belongs to this vacancy."],
] as const;

export function AiGuide({ locale, origin }: { locale: Locale; origin: string }) {
  const nl = locale === "nl";
  const claudeCmd = `git clone https://github.com/remcov250/Baanjager.git && cd Baanjager && npm ci
claude mcp add baanjager \\
  -e BAANJAGER_URL=${origin} \\
  -e BAANJAGER_TOKEN=<API_TOKEN> \\
  -- node mcp/server.mjs`;
  const desktopJson = `{
  "mcpServers": {
    "baanjager": {
      "command": "node",
      "args": ["/pad/naar/Baanjager/mcp/server.mjs"],
      "env": { "BAANJAGER_URL": "${origin}", "BAANJAGER_TOKEN": "<API_TOKEN>" }
    }
  }
}`;
  const curl = `curl -H "Authorization: Bearer <API_TOKEN>" ${origin}/api/v1/summary`;

  return (
    <div className="flex flex-col gap-4">
      <section className="card flex flex-col gap-3">
        <h2>{nl ? "Wat de bedoeling is" : "The idea"}</h2>
        {nl ? (
          <>
            <p className="text-sm">
              Baanjager is gebouwd om <strong>samen met een assistent</strong> te gebruiken. De assistent doet het
              zoekwerk en het voorwerk: bronnen aflopen, vacatures toevoegen, toetsen aan de criteria, een oordeel
              met reden voorstellen, de status bijhouden. Jij houdt het oordeel: elke beoordeling is een voorstel
              dat jij bevestigt of corrigeert — en die correctie wordt een regel.
            </p>
            <p className="text-sm">
              Dat gaat via <strong>MCP</strong> (Model Context Protocol): een kleine server die met de assistent
              praat en met deze app via de API. Hij draait op de machine waar de assistent draait; de app kan ergens
              anders staan. Er zit geen AI ín de app en er is geen API-sleutel van een AI-aanbieder nodig.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm">
              Baanjager is built to be used <strong>together with an assistant</strong>. The assistant does the
              legwork: walking the sources, adding vacancies, checking them against the criteria, proposing a
              verdict with a reason, keeping the status up to date. You keep the judgement: every assessment is a
              proposal you confirm or correct — and the correction becomes a rule.
            </p>
            <p className="text-sm">
              This works through <strong>MCP</strong> (Model Context Protocol): a small server that talks to the
              assistant on one side and to this app's API on the other. It runs where the assistant runs; the app
              can live elsewhere. There is no AI inside the app and no AI-provider key is needed.
            </p>
          </>
        )}
      </section>

      <section className="card flex flex-col gap-3">
        <h2>{nl ? "Aansluiten: Claude Code" : "Connecting: Claude Code"}</h2>
        <p className="text-sm">
          {nl
            ? "Het token is de waarde van API_TOKEN in de omgeving van deze app (Instellingen zegt of hij aanstaat). Behandel het als een wachtwoord: wie het heeft kan alles wat de app kan."
            : "The token is the value of API_TOKEN in this app's environment (Settings tells you whether it is on). Treat it as a password: whoever has it can do everything the app can."}
        </p>
        <Code>{claudeCmd}</Code>
        <h2 className="mt-2">{nl ? "Aansluiten: Claude Desktop en andere MCP-clients" : "Connecting: Claude Desktop and other MCP clients"}</h2>
        <p className="text-sm">
          {nl
            ? "Elke client die MCP-servers via stdio start, werkt. Voor Claude Desktop is dit het blok in de configuratie:"
            : "Any client that launches MCP servers over stdio works. For Claude Desktop this is the block in its configuration:"}
        </p>
        <Code>{desktopJson}</Code>
      </section>

      <section className="card flex flex-col gap-3">
        <h2>{nl ? "Wat de assistent kan" : "What the assistant can do"}</h2>
        <ul className="flex flex-col divide-y divide-line-soft text-sm">
          {TOOLS.map(([name, descNl, descEn]) => (
            <li key={name} className="grid gap-1 py-2 sm:grid-cols-[16rem_1fr] sm:gap-4">
              <code className="text-[13px] font-medium">{name}</code>
              <span className="text-muted">{nl ? descNl : descEn}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">
          {nl
            ? "Verwijderen bestaat niet — ook niet voor de assistent. Afgevallen is een status, en de reden blijft staan."
            : "There is no delete — not for the assistant either. Dropped is a status, and the reason stays."}
        </p>
      </section>

      <section className="card flex flex-col gap-3">
        <h2>{nl ? "Een goede sessie" : "A good session"}</h2>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
          {nl ? (
            <>
              <li><strong>Bijpraten:</strong> get_summary en list_rules. De assistent weet dan wat er loopt en wat de grenzen zijn.</li>
              <li><strong>Scannen:</strong> get_scan_plan aflopen, alleen nieuwe vacatures behandelen, elke vondst eerst op de eigen site van de werkgever controleren.</li>
              <li><strong>Toevoegen met oordeel:</strong> add_vacancy met laag, randvoorwaarden, oordeel én reden — niet "past niet", maar welke regel botst.</li>
              <li><strong>Jij beslist:</strong> in de app bevestig of corrigeer je het oordeel. Vul de terugkoppeling in als de assistent ernaast zat.</li>
              <li><strong>Status bijhouden:</strong> set_status bij verzenden, reactie, gesprek, afwijzing — met een notitie en datum.</li>
              <li><strong>Leren:</strong> na een afwijzing add_rule, gekoppeld aan de vacature. Dat is waar het systeem scherper van wordt.</li>
            </>
          ) : (
            <>
              <li><strong>Catch up:</strong> get_summary and list_rules, so the assistant knows what is in play and where the boundaries are.</li>
              <li><strong>Scan:</strong> walk get_scan_plan, handle only new vacancies, verify every find on the employer's own site first.</li>
              <li><strong>Add with a verdict:</strong> add_vacancy with layer, conditions, verdict and reason — not "doesn't fit", but which rule it clashes with.</li>
              <li><strong>You decide:</strong> confirm or correct the verdict in the app. Fill in the feedback when the assistant was off.</li>
              <li><strong>Keep status current:</strong> set_status when sending, hearing back, interviewing, being rejected — with a note and a date.</li>
              <li><strong>Learn:</strong> after a rejection, add_rule linked to the vacancy. That is what sharpens the system.</li>
            </>
          )}
        </ol>
      </section>

      <section className="card flex flex-col gap-3">
        <h2>{nl ? "Een CV uit een match" : "A CV from a match"}</h2>
        {nl ? (
          <>
            <p className="text-sm">
              Baanjager maakt geen CV's; dat doet een CV-bouwer. Met <strong>Reactive Resume</strong> (5.3 of
              nieuwer, heeft een eigen MCP-server) gaat het zo: jij vraagt om een CV voor een vacature, de
              assistent haalt met <code>get_cv_context</code> het oordeel, het bewijs per eis en je profiel op,
              maakt of bewerkt het CV in Reactive Resume, en koppelt het met <code>link_cv</code> terug — dan
              staat er een knop <em>CV</em> op de vacature. Bestaat er al een CV, dan wordt dát bijgewerkt.
            </p>
            <p className="text-sm">
              De regels reizen mee met de data: alleen bewijs uit je profiel, verwante ervaring heet verwant,
              onbekend is geen tekortkoming, en niets wordt verzonnen. Baanjager zelf praat nooit met de
              CV-bouwer; de sleutel daarvan blijft bij de assistent.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm">
              Baanjager doesn't build CVs; a CV builder does. With <strong>Reactive Resume</strong> (5.3+, which
              has its own MCP server) it goes like this: you ask for a CV for a vacancy, the assistant pulls the
              verdict, the evidence per requirement and your profile with <code>get_cv_context</code>, builds or
              edits the CV in Reactive Resume, and links it back with <code>link_cv</code> — a <em>CV</em> button
              then appears on the vacancy. If a CV already exists, that one is updated.
            </p>
            <p className="text-sm">
              The rules travel with the data: evidence from your profile only, related experience is called
              related, unknown is not a gap, nothing is invented. Baanjager itself never talks to the CV builder;
              its key stays with the assistant.
            </p>
          </>
        )}
        <Code>{`claude mcp add --transport http reactive-resume https://<reactive-resume>/mcp \\
  --header "x-api-key: <RR_API_KEY>"`}</Code>
      </section>

      <section className="card flex flex-col gap-3">
        <h2>{nl ? "Zonder MCP: de API" : "Without MCP: the API"}</h2>
        <p className="text-sm">
          {nl
            ? "Alles wat de MCP-server doet, gaat over de REST-API op /api/v1 met hetzelfde token. Handig voor scripts of een andere agent."
            : "Everything the MCP server does goes over the REST API at /api/v1 with the same token. Useful for scripts or another agent."}
        </p>
        <Code>{curl}</Code>
      </section>

      <section className="card flex flex-col gap-2">
        <h2>{nl ? "Wat de assistent ziet" : "What the assistant sees"}</h2>
        <p className="text-sm">
          {nl
            ? "Alles in deze app: vacatures, oordelen, status-notities, criteria en het profiel. Daarom bevat het profiel bewust geen naam, adres, telefoonnummer of e-mail — voor het matchen voegen die niets toe. Vacatureteksten zijn openbaar en mogen integraal."
            : "Everything in this app: vacancies, verdicts, status notes, criteria and the profile. That is why the profile deliberately has no name, address, phone number or email — they add nothing to matching. Vacancy texts are public and may be stored in full."}
        </p>
        <p className="text-sm">
          {nl
            ? "Vacatureteksten komen van internet. De MCP-server zet ze, en alle andere vrije tekst, in een blok dat als 'untrusted data' gemarkeerd is: inhoud om te beoordelen, geen instructies aan de assistent."
            : "Vacancy texts come from the internet. The MCP server fences them, and every other free-text field, in a block marked as untrusted data: content to assess, not instructions to the assistant."}
        </p>
      </section>
    </div>
  );
}
