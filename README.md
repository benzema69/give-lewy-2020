# Give Lewy 2020

Fan-led petition asking the Ballon d'Or organisers to consider retroactively awarding the unawarded 2020 edition to Robert Lewandowski.

## Architecture

- **Vercel** serves the FR/EN landing page and thin proxy routes under `/api/*`.
- **Supabase Edge Function `petition-api`** owns privileged database access. Supabase injects its secret API key into the function; no database admin key is stored in GitHub or Vercel.
- **Supabase Postgres** stores signatures. RLS is enabled and `anon` / `authenticated` are explicitly denied direct table access.
- The public counter is O(1), backed by `petition_stats` and maintained by a trigger.

## Signing model

Signing is deliberately low-friction without making the counter meaningless:

- name, email and country are optional;
- no account or password;
- random `HttpOnly`, `Secure`, `SameSite=Lax` session cookie;
- only an HMAC of the session is stored;
- raw IP addresses are never stored; a daily rotating HMAC is used as one anti-abuse signal;
- User-Agent HMAC + request velocity + optional email contribute to a risk score;
- `accepted`, `pending` and rejected attempts are treated separately;
- the public counter includes only `accepted` signatures;
- campaign updates require a separate opt-in and are never implied by providing an email.

## Repository layout

- `index.html`, `styles.css`, `script.js` — public site
- `api/` — Vercel proxy routes only; no Supabase admin secret
- `supabase/functions/petition-api/` — privileged signing API
- `supabase/migrations/` — migrations already applied to the production Supabase project
- `db/schema.sql` — convenience entrypoint for a fresh psql install

## Production state

Supabase project: `give-lewy-2020` (`tnbxlcumokajylirydvu`, `eu-central-2`).

The database starts at **0 accepted signatures**. A real integration test was run: the first controlled signature was accepted, a duplicate from the same session was rejected with `409 already_signed`, the counter trigger incremented to 1, and the test row was then deleted so the counter returned to 0.

## Optional services

The core petition works without these integrations. To enable them, add secrets to the **Supabase Edge Function**, not to the browser:

- `RESEND_API_KEY` + `PETITION_FROM_EMAIL` for email confirmation/deletion links;
- `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` for adaptive Cloudflare Turnstile challenges.

Supabase automatically injects `SUPABASE_URL` and `SUPABASE_SECRET_KEYS`. Never commit or expose those secret keys.

## Privacy / launch checklist

Before broad public promotion, complete `privacy.html` with the real campaign operator identity/contact, choose a retention policy, and decide whether to enable email delivery. Add monitoring and abuse-review tooling before sustained high traffic.

## Factual basis

- Ballon d'Or history: https://ballondor.com/winners?category=history-text
- UEFA 2019/20 season: https://www.uefa.com/uefachampionsleague/news/0261-1065a2b7cf1c-c4b22a7d12f9-1000--men-s-player-of-the-year/
- FIFA The Best 2020: https://inside.fifa.com/en/media-releases/en/news/lucy-bronze-and-robert-lewandowski-are-the-best-of-2020
