# Give Lewy 2020

Independent fan-led petition asking the Ballon d'Or organisers to consider an exceptional, explicitly retrospective **“Ballon d'Or 2020”** recognition for Robert Lewandowski.

## Current stack

- **Vercel** serves the public site and thin proxy routes under `/api/*`.
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
- anti-abuse risk buckets and Turnstile verification counts.

The dashboard never returns a signer list, names, email addresses or IP addresses. The raw admin token is not stored in GitHub; Supabase stores only its SHA-256 hash.

## Repository layout

- `index.html`, `styles.css`, `script.js` — public site core
- `season.css`, `season.js` — 2019/20 documentary section
- `launch.css`, `launch.js` — PL/DE, attribution, referral and viral post-sign flow
- `admin.html`, `admin.js` — private aggregate dashboard
- `press.html`, `PRESS-KIT.md` — press / creator kit
- `api/` — Vercel proxy routes only; no database admin secret
- `supabase/functions/petition-api/` — privileged signing API
- `db/schema.sql` — fresh-install base schema
- `db/migrations/` — incremental production migrations

## Production QA

The production database currently contains **2 accepted real signatures**.

A controlled prelaunch integration / abuse test ran against the production Edge Function and database using temporary sessions:

1. five rapid signatures from the same synthetic IP/User-Agent were accepted;
2. the sixth was automatically moved to `pending` as risk increased;
3. re-signing from the same session returned `409 already_signed`;
4. a personal referral generated a recorded referral conversion;
5. the authenticated aggregate admin endpoint returned the expected source / referral / risk metrics;
6. all six temporary test signatures were deleted;
7. the counter returned exactly from 2 → test traffic → **2**, with zero pending test rows remaining.

## External services still to activate

The application is ready for these services, but they are intentionally **not active yet**:

- `RESEND_API_KEY` + `PETITION_FROM_EMAIL` — confirmation and deletion emails;
- `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` — adaptive Cloudflare Turnstile challenges.

These secrets belong in the Supabase Edge Function environment, never in frontend code or GitHub.

## Before public launch

- Add the real campaign operator identity and contact address to `privacy.html`.
- Activate Resend and Turnstile.
- Add the final campaign domain and campaign email addresses.
- Replace the temporary prelaunch identity/contact placeholders in the press and privacy pages.
- Run a final mobile / Safari / Android smoke test after the domain is connected.

## Factual basis

- Ballon d'Or history: https://ballondor.com/winners?category=history-text
- UEFA 2019/20 recognition: https://www.uefa.com/news/0262-1081df1ad49c-10605b589d53-1000--lewandowski-named-player-of-the-year/
- FIFA The Best 2020: https://inside.fifa.com/en/media-releases/en/news/lucy-bronze-and-robert-lewandowski-are-the-best-of-2020
