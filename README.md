# Give Lewy 2020

Fan-led petition website asking the Ballon d'Or organisers to consider retroactively awarding the unawarded 2020 edition to Robert Lewandowski.

## Product principle

Signing should feel almost frictionless **without making the public counter meaningless**.

- A visitor can sign with one click: name, email and country are optional.
- No account or password is required.
- The browser receives a random `HttpOnly`, `Secure`, `SameSite=Lax` session cookie.
- Only an HMAC of that session identifier is stored server-side.
- Raw IP addresses are never stored. A daily rotating HMAC of the IP is used as one anti-abuse signal.
- User-Agent HMAC, request velocity and optional email confirmation contribute to a risk score.
- Medium-risk traffic can be challenged with Cloudflare Turnstile only when needed.
- High-risk traffic is rejected or held out of the public counter.
- Email is optional. Campaign-update consent is a separate, unchecked opt-in.

## What is included

- Responsive FR/EN landing page
- 100,000,000 signature goal
- Low-friction one-click signing
- Optional name, email and country
- Optional email confirmation
- Separate campaign-updates opt-in
- Session-cookie duplicate protection
- Daily rotating IP HMAC; no raw IP storage
- User-Agent HMAC + velocity-based risk scoring
- Adaptive Cloudflare Turnstile hook
- `accepted` / `pending` / `rejected` moderation states
- Public counter that counts only `accepted` signatures
- O(1) public counter backed by an aggregate stats row maintained by a PostgreSQL trigger
- Email deletion link + same-device session deletion
- Honeypot bot field
- Privacy policy starter
- X / WhatsApp sharing
- Vercel serverless API with no npm dependencies
- Supabase database + optional Resend confirmation email

## Verified factual basis

- Official Ballon d'Or history lists 2020 as “No Ballon d'Or”:
  https://ballondor.com/winners?category=history-text
- UEFA records 55 goals in 47 Bayern matches in 2019/20, including 15 Champions League goals, as Bayern won the treble:
  https://www.uefa.com/uefachampionsleague/news/0261-1065a2b7cf1c-c4b22a7d12f9-1000--men-s-player-of-the-year/
- FIFA named Lewandowski The Best FIFA Men's Player 2020:
  https://inside.fifa.com/en/media-releases/en/news/lucy-bronze-and-robert-lewandowski-are-the-best-of-2020

## Launch setup

1. Create a Supabase project and run `db/schema.sql`. If the original prototype schema was already installed, run `db/migrate-v1-to-v2.sql` instead.
2. Add the variables from `.env.example` to Vercel.
3. Generate a long random `HASH_SALT` and never expose it to browser code.
4. If email confirmation is wanted, configure Resend and set `RESEND_API_KEY` + `PETITION_FROM_EMAIL`.
5. If adaptive bot challenges are wanted, create a Cloudflare Turnstile widget and set `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`.
6. Set `SITE_URL` to the final production URL.
7. Complete `privacy.html` with the campaign operator's real identity/contact details before public collection.
8. Deploy to Vercel.

## Counter integrity

The counter starts at **0**. It counts only rows with `status='accepted'`.

Email confirmation is a strong trust signal, but it is deliberately **not mandatory**. This avoids the mental friction of an email gate while keeping abuse controls server-side.

## Risk model

The current implementation combines request velocity, daily IP HMAC, session HMAC, User-Agent HMAC and optional email/Turnstile verification. Treat the numeric thresholds as a starting point, not permanent truth. At scale, review false positives and tune them from real traffic.

## Before a large launch

Add monitoring, database backups, a public methodology page, abuse-review tooling, retention rules, a real campaign contact/legal entity, and dashboards that compare accepted, pending, rejected and email-confirmed signatures. At sustained high request volume, move velocity/rate-limit counters from Postgres to Redis or an edge/WAF layer; Postgres should remain the durable source of truth, not the hot-path rate limiter.
