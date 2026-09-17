# Security

## Iets melden / Reporting

Liever geen publiek issue voor een kwetsbaarheid. Gebruik GitHub's private reporting op
deze repository, of mail de maintainer. Dit is een zij-project, dus ik beloof geen
reactietijd, maar ik kijk ernaar zodra ik het zie.

Please don't open a public issue for a vulnerability; use GitHub's private vulnerability
reporting on this repository instead.

## Wat de app doet en niet doet

- **Eén account**, aangemaakt bij de eerste start. Wachtwoord gehasht met scrypt
  (N=16384). Sessies zijn rijen in de database met een vervaldatum; wachtwoord wijzigen
  verwijdert ze allemaal.
- **Login rate-limiting**: 10 pogingen per 15 minuten, per IP als `TRUST_PROXY=true`,
  anders globaal. In-memory, dus per container.
- **Cookies**: `HttpOnly`, `SameSite=Lax`, `Secure` als de proxy `X-Forwarded-Proto: https`
  meestuurt of `COOKIE_SECURE=true` gezet is.
- **Security-headers** op elke response: CSP (alleen eigen origin, `frame-ancestors 'none'`),
  `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
  `script-src` staat `'unsafe-inline'` toe omdat Next.js dat nodig heeft voor hydratie.
- **API** staat uit tenzij `API_TOKEN` gezet is. Bearer-token, vergelijking in constante
  tijd. Wie het token heeft, kan alles wat de UI kan, behalve accounts beheren. Behandel het
  als een wachtwoord.
- **Geen delete** op vacatures, niet in de UI en niet in de API. Wat je kwijt wilt, krijgt
  status *Afgevallen*.
- **Invoer** wordt server-side gevalideerd met zod; formulierdata en API-body's gaan door
  dezelfde schema's. Tekstvelden hebben maxima; CSV-import maximaal 10 MB.
- **Container** draait als uid 1001, geen root. De database staat in `/data`.

## Wat je zelf moet regelen

- **Zet 'm niet open op internet zonder reverse proxy met HTTPS.** Een VPN (Tailscale,
  WireGuard) of een proxy met TLS is de bedoeling. Dan ook `TRUST_PROXY=true`.
- **Back-ups** van het `/data`-volume. Het is één SQLite-bestand; kopiëren terwijl de app
  draait is veilig dankzij WAL, maar `sqlite3 baanjager.db ".backup out.db"` is netter.
- **Encryptie at rest** is de verantwoordelijkheid van de schijf/het volume, niet van de
  app. Het profiel is gepseudonimiseerd, maar vacaturebeoordelingen en status-notities zijn
  persoonlijk genoeg om zuinig op te zijn.
- **Het API-token** hoort in je compose-bestand of een `.env` met beperkte rechten, niet in
  git.
