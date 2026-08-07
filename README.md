# Give Lewy 2020

Independent fan-led petition asking the Ballon d'Or organisers to consider an exceptional, explicitly retrospective **“Ballon d'Or 2020”** recognition for Robert Lewandowski.

## Production

- Public site: `https://give-lewy-2020.vercel.app`
- Private aggregated dashboard: `/admin`
- Press / creator kit: `/press`
- Public healthcheck: `/api/health`
- Current backend family: `prelaunch-2026-08-08.x`

The healthcheck exposes only operational state: backend version, database reachability, accepted counter and whether optional email / Turnstile services are configured. It exposes no secret, email, name or IP.

## Architecture

- **Vercel** serves static HTML/CSS/JS from CDN and thin Node proxy routes under `/api/*`.
- Static output is materialised into `dist/` by `build.js`; when source files are already present it copies them locally, otherwise it can fetch a pinned GitHub source revision for connector-driven deployments.
- **Supabase Edge Function `petition-api`** owns privileged database access. No Supabase admin key is exposed to the browser or committed to GitHub.
- **Supabase Postgres** stores signatures. RLS is enabled and direct `anon` / `authenticated` table access is denied.
- The public counter is O(1), backed by `petition_stats` and maintained by a trigger.

## Public experience

- FR / EN / PL / DE language support.
- Documentary 2019/20 season section with verified stats, Creative Commons photography and official UEFA / FC Bayern archive links.
- Name, email and country are optional; no account or password is required.
- Post-sign viral flow generates a personal referral link and offers native share, WhatsApp, X and copy-link actions.
- Campaign source attribution supports `utm_source`, `source`, external referrers and personal `?ref=` codes without installing an advertising tracker.
- `/press` contains the press / creator kit.

## Signing and anti-abuse model

- Random `HttpOnly`, `Secure`, `SameSite=Lax` session cookie.
- Only an HMAC of the session is stored.
- Raw IP addresses are never stored; a daily rotating HMAC is used as one anti-abuse signal.
- User-Agent HMAC + request velocity + optional email contribute to a risk score.
- Repetition from the same IP + browser is weighted more strongly than shared-IP traffic alone.
- Statuses are `accepted`, `pending` and `rejected`; only `accepted` signatures appear in the public counter.
- A partial unique database index prevents two active signatures from the same session, including concurrent requests.
- Adaptive Cloudflare Turnstile support is implemented server-side. It activates only when both Turnstile secrets are configured.
- Campaign updates require a separate opt-in and are never implied by providing an email.

## Private campaign dashboard

`/admin` exposes **aggregate metrics only** after bearer-token authentication:

- accepted / pending / rejected;
- last hour / last 24 hours;
- email provided / verified / campaign-update opt-in;
- source, country and language breakdowns;
- referral conversions;
- anti-abuse risk buckets and Turnstile verification counts;
- backend health/version status.

The dashboard never returns a signer list, names, email addresses or IP addresses. The raw admin token is not stored in GitHub; Supabase stores only its SHA-256 hash.

## Production QA

The production database currently contains **2 accepted signatures**.

The latest controlled abuse regression test used nine independent temporary sessions from one synthetic IP + User-Agent:

1. five requests were accepted;
2. the next three were automatically moved to `pending` as repetition increased;
3. the ninth was rejected with HTTP `429 risk_rejected`;
4. all eight written test rows were deleted;
5. the public counter returned exactly from **2 → test traffic → 2**.

Temporary QA Vercel projects are neutralised after testing; former test routes return 404 and the QA aliases are `noindex, nofollow`.

## SEO / indexing

- `/robots.txt` allows the public petition and excludes `/admin` + `/api/`.
- `/sitemap.xml` lists the public petition and privacy page.
- `/admin` is `noindex, nofollow` and `private, no-store`.
- The current canonical URL is the Vercel domain and must be changed when the final campaign domain is attached.

## External services still to activate

The application is ready for these services, but they are intentionally **not active yet**:

- `RESEND_API_KEY` + `PETITION_FROM_EMAIL` — confirmation and deletion emails;
- `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` — adaptive Cloudflare Turnstile challenges.

If Turnstile is not configured, suspicious traffic is not falsely treated as verified: the risk engine can move it to `pending` or reject it.

## Before public launch

- Add the real campaign operator identity and contact address to `privacy.html`.
- Activate Resend if email confirmation is desired at launch.
- Activate Turnstile before very high-volume promotion if possible.
- Add the final campaign domain and campaign email addresses.
- Replace the temporary prelaunch contact placeholders in the press and privacy pages.
- Update canonical, sitemap and robots URLs to the final domain.
- Run the checklist in `OPERATIONS.md`.

## Repository layout

- `index.html`, `styles.css`, `script.js` — public site core
- `season.css`, `season.js` — 2019/20 documentary section
- `launch.css`, `launch.js` — PL/DE, attribution, referral and viral post-sign flow
- `admin.html`, `admin.js` — private aggregate dashboard
- `press.html`, `PRESS-KIT.md` — press / creator kit
- `api/` — Vercel proxy / health routes; no database admin secret
- `supabase/functions/petition-api/` — privileged signing API
- `db/schema.sql` — fresh-install base schema
- `db/migrations/` — incremental production migrations
- `build.js`, `package.json`, `vercel.json` — reproducible Vercel build configuration
- `OPERATIONS.md` — launch and incident runbook

## Factual basis

- Ballon d'Or history: https://ballondor.com/winners?category=history-text
- UEFA 2019/20 recognition: https://www.uefa.com/news/0262-1081df1ad49c-10605b589d53-1000--lewandowski-named-player-of-the-year/
- FIFA The Best 2020: https://inside.fifa.com/en/media-releases/en/news/lucy-bronze-and-robert-lewandowski-are-the-best-of-2020
