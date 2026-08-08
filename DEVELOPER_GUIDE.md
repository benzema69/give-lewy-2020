# Give Lewy 2020 — Developer Handoff & Architecture Guide

> **Purpose:** this document is the technical handoff for the Give Lewy 2020 petition. It explains what was built, why it was built that way, the bugs and fixes encountered during development, the production architecture, the database and anti-abuse model, the referral/analytics system, deployment and rollback procedures, and the remaining pre-launch work.
>
> **Do not put secrets, raw signer exports, API keys, admin tokens, or private signer data in this document or in Git.**

---

## 1. Project goal and product constraints

Give Lewy 2020 is an independent fan-led petition asking the Ballon d'Or organisers to consider an exceptional, explicitly retrospective **“Ballon d'Or 2020”** recognition for Robert Lewandowski.

The campaign framing is intentionally narrow:

- it does **not** ask for a later winner to lose a trophy;
- it does **not** claim an official 2020 Ballon d'Or vote took place;
- it asks for an exceptional retrospective recognition for the edition that was not awarded;
- the public campaign should remain factual and positive rather than attack other players or winners.

The product has two competing goals that shaped the architecture:

1. **Very low signing friction** — no account, no password, name/email/country optional.
2. **A credible public count** — the site must make automated duplication and obvious abuse harder, keep rejected/pending traffic out of the public count, and preserve an audit trail without invasive tracking.

The long-term campaign target is 100 million signatures, so the architecture tries to keep the public read path cheap and the write path defensible.

---

## 2. Current production state

### Public production

- Site: `https://give-lewy-2020.vercel.app`
- Dashboard: `https://give-lewy-2020.vercel.app/admin`
- Press/creator kit: `https://give-lewy-2020.vercel.app/press`
- Healthcheck: `https://give-lewy-2020.vercel.app/api/health`
- Supabase project ref: `tnbxlcumokajylirydvu`
- Supabase Edge Function: `petition-api`
- Vercel project ID: `prj_2KBdYDXo05EPHU8SEx1ARNP8JkUi`
- Vercel team slug: `bills-projects-f10aa84c`

### Last verified pre-launch state

At the time of this handoff:

- database health: OK;
- accepted public signatures: **2**;
- email provider integration: **not configured**;
- Cloudflare Turnstile: **not configured**;
- site-wide pre-launch indexing protection: **`noindex, nofollow` is still active**.

These states are intentional pre-launch safety controls, not launch-ready defaults.

### Production readiness warning

Do **not** call the site legally or operationally launch-ready until the following are completed:

- replace privacy/contact placeholders with the real campaign operator identity/contact;
- attach the final campaign domain;
- decide whether to activate Resend email confirmation;
- activate Turnstile before major traffic if possible;
- run the full launch checklist in `OPERATIONS.md`;
- deliberately remove pre-launch `noindex, nofollow` only when the public launch is approved.

---

## 3. High-level architecture

```text
┌──────────────────────────────────────────────────────────────┐
│ Browser                                                      │
│                                                              │
│ index.html / CSS / JS                                        │
│  ├─ script.js        core form + counter + FR/EN             │
│  ├─ season.js        documentary content + loads launch.js   │
│  ├─ launch.js        PL/DE + referrals + post-sign modal     │
│  ├─ viral.js         milestone momentum + milestone shares   │
│  └─ attribution.js   share-channel attribution               │
└───────────────────────┬──────────────────────────────────────┘
                        │ same-origin /api/*
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ Vercel                                                       │
│                                                              │
│ Static build: build.js → dist/                               │
│ Thin Node proxy routes                                       │
│  ├─ /api/signatures                                          │
│  ├─ /api/count                                               │
│  ├─ /api/config                                              │
│  ├─ /api/verify                                              │
│  ├─ /api/delete                                              │
│  ├─ /api/admin                                               │
│  ├─ /api/health                                              │
│  └─ /api/og                                                  │
│                                                              │
│ api/_edge.js owns the petition session cookie and forwards   │
│ a constrained request to Supabase Edge.                      │
└───────────────────────┬──────────────────────────────────────┘
                        │ x-site-origin
                        │ x-client-ip
                        │ x-petition-session
                        │ user-agent
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ Supabase Edge Function: petition-api                          │
│                                                              │
│ - input validation                                           │
│ - duplicate checks                                           │
│ - HMAC pseudonymisation                                      │
│ - risk scoring                                               │
│ - optional Turnstile verification                            │
│ - optional Resend email                                      │
│ - referral/source handling                                   │
│ - privileged DB calls                                        │
└───────────────────────┬──────────────────────────────────────┘
                        │ secret server-side API key only
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ Supabase Postgres                                            │
│                                                              │
│ signatures                                                   │
│ petition_stats                                               │
│ petition_internal                                            │
│ aggregate admin function                                     │
│ triggers / indexes / RLS                                     │
└──────────────────────────────────────────────────────────────┘
```

### Core trust boundary

The browser **never** receives a Supabase secret/service-role key. The browser talks to Vercel. Vercel forwards to the Supabase Edge Function. The Edge Function is the privileged application layer that can read/write protected tables.

---

## 4. Repository map

### Public frontend

- `index.html` — public landing page and petition form.
- `styles.css` — core visual system.
- `script.js` — core FR/EN translations, public count fetch, base form submission, optional Turnstile loader, base sharing.
- `season.css` — 2019/20 documentary section styles.
- `season.js` — FR/EN season translations and current dynamic loader for `launch.css` + `launch.js`.
- `launch.css` — post-sign modal and launch-language styles.
- `launch.js` — PL/DE translations, language selector, acquisition/referral payload, capture-phase form submit override, post-sign personal referral flow.
- `viral.css` — milestone progress UI.
- `viral.js` — next-milestone state and milestone-aware share links.
- `attribution.js` — channel-level source tagging for X, WhatsApp, copied links and native share.
- `privacy.html` — privacy information; operator/contact placeholders must be replaced before launch.
- `thanks.html` — email verification/deletion result flow.
- `press.html` / `PRESS-KIT.md` — media and creator kit.

### Admin

- `admin.html` — private aggregate dashboard UI.
- `admin.js` — bearer-token dashboard client.

The dashboard is designed to expose aggregates only, never a raw public signer list.

### Vercel/API

- `api/_edge.js` — common proxy, session cookie owner, forwarding headers.
- route files under `api/` — small wrappers selecting Edge Function actions.
- `api/health.js` — operational health.
- `api/og.js` — dynamic social-card endpoint.
- `build.js` — reproducible static materialisation + build-time injection.
- `vercel.json` — output directory, rewrites, headers and pre-launch indexing policy.
- `package.json` — build/runtime dependency configuration.

### Supabase/database

- `supabase/functions/petition-api/index.ts` — privileged Edge Function.
- `db/schema.sql` — fresh-install base schema.
- `db/migrations/` — incremental production changes.

### Operations/documentation

- `README.md` — short project orientation.
- `OPERATIONS.md` — launch-day and incident runbook.
- `DEVELOPER_GUIDE.md` — this document.
- `PRESS-KIT.md` — campaign messaging/media notes.

---

## 5. Frontend execution order and a subtle coupling to understand

The current frontend evolved incrementally. It is not a monolithic SPA.

The intended runtime order is effectively:

1. `script.js`
2. `season.js`
3. `viral.js`
4. `attribution.js`
5. `season.js` dynamically injects `launch.js` after loading `launch.css`

### Why this matters

`script.js` contains the original form submit handler.

`launch.js` adds a **capture-phase** `submit` listener and calls `stopImmediatePropagation()`. That means the launch handler becomes the effective production submit path and adds:

- `source`;
- `referrerCode`;
- `locale`;
- personal referral modal behavior;
- PL/DE support.

This layering works, but it is technical debt. A future cleanup should merge the two submit implementations into one application module so there is no need for capture-phase interception.

### Another fragile coupling

`season.js` currently injects `launch.js`. This means “launch/referral behavior” is coupled to the “season documentary module”. It was done to add the launch layer without a broad rewrite.

**Recommended cleanup:** load `launch.css` and `launch.js` directly from `index.html`/`build.js`, then remove the dynamic injection from `season.js`.

Do not perform that cleanup immediately before a major launch without an end-to-end regression test, because form submission order is security-relevant.

---

## 6. Public signing flow

### User-facing form

The petition deliberately allows a signature with no account.

Fields:

- name — optional;
- email — optional;
- country — optional;
- consent for public name — only meaningful if a name is supplied;
- campaign updates opt-in — only meaningful if an email is supplied;
- hidden honeypot field `website`.

### Browser payload

The production launch layer sends roughly:

```json
{
  "name": "...",
  "email": "...",
  "country": "...",
  "publicName": false,
  "updatesOptIn": false,
  "website": "",
  "source": "direct",
  "referrerCode": "",
  "locale": "fr"
}
```

If a Turnstile challenge is required, a second request includes `turnstileToken`.

### Edge response states

Common outcomes:

- `200 accepted` — counted immediately.
- `200 pending` — stored, but not in public count until later acceptance.
- `409 already_signed` — same petition session already has an active signature.
- `409 email_duplicate` — same email already associated with an active signature.
- `403 challenge_required` — Turnstile is configured and higher-risk traffic needs a challenge.
- `403 challenge_failed` — challenge verification failed.
- `429 risk_rejected` — request crossed the rejection threshold.

Only **accepted** rows affect the public count.

---

## 7. Session model and the duplicate-signature bug post-mortem

This is the most important historical incident in the project.

### Symptom

During testing, the same browser was able to sign several times simply by refreshing the page and submitting again.

Four consecutive POST requests returned success.

### Root cause

The original proxy behavior did not provide a stable application-owned session cookie. Upstream `Set-Cookie` behavior from Supabase/Cloudflare was being relayed in a way that prevented the petition session from being consistently persisted and reused.

As a result, the backend saw different session identifiers and treated each request as a new signer.

### Fix

`api/_edge.js` was changed so Vercel explicitly owns the petition cookie:

```text
give_lewy_session=<random UUID>
Path=/
Max-Age=15552000
HttpOnly
Secure
SameSite=Lax
```

Key rules:

- parse the incoming petition cookie at Vercel;
- reuse it when valid;
- create a random UUID when a signing/deletion session needs one;
- forward it to Supabase through `x-petition-session` and a constrained `Cookie` header;
- **do not relay arbitrary upstream Supabase/Cloudflare Set-Cookie headers**;
- clear only the application cookie on same-device deletion.

### Database defense in depth

A partial unique index prevents more than one active `accepted`/`pending` signature for the same `session_hash`.

This protects against races/concurrent requests even if two writes reach the database at almost the same time.

### Regression result

A controlled test verified:

1. first request from a fresh petition session: accepted;
2. second request with the same session cookie: `409 already_signed`;
3. test row removed;
4. public count restored.

The four duplicate test rows created during the original investigation were removed.

### Important limitation

A cookie is not identity.

A determined person can still clear cookies, use incognito mode, another browser, another device, or a network-changing strategy. The project intentionally avoids pretending it has perfect “one human = one signature” identity proof.

The goal is to make casual/automated abuse difficult and visible, not to claim cryptographic proof of unique humans.

---

## 8. Privacy-preserving anti-abuse model

### What is stored

The database can contain:

- optional supplied name;
- optional supplied email;
- optional country;
- consent flags;
- status/risk;
- timestamps;
- token hashes;
- session HMAC;
- daily IP HMAC;
- user-agent HMAC;
- acquisition source;
- referral codes;
- locale;
- Turnstile verification timestamp.

### What is intentionally not stored

- raw IP address;
- plaintext verification token;
- plaintext deletion token;
- Supabase secret keys in the browser;
- advertising identifiers;
- cross-site fingerprinting IDs.

### HMAC pseudonymisation

The Edge Function obtains an internal HMAC salt from `petition_internal`.

It HMACs:

- petition session;
- IP address, with the UTC day included in the HMAC label;
- User-Agent.

The daily IP label means the same raw IP does not produce one permanent identifier forever.

### Current risk features

The risk engine considers:

- signatures from the same daily IP within ten minutes;
- signatures from the same daily IP within one hour;
- repeated IP + User-Agent combinations;
- anonymous signatures with no optional identifying fields;
- presence of email/name/country;
- referral context;
- verified Turnstile challenge.

The precise thresholds live in `supabase/functions/petition-api/index.ts`. Treat that file as the source of truth rather than copying thresholds into marketing material.

### Design principle

Do not treat one shared IP as one person. Schools, workplaces, mobile carriers, stadiums, public Wi-Fi and NAT can legitimately produce many users behind one public IP.

Repeated **IP + browser pattern** is therefore weighted more strongly than IP alone.

### Controlled abuse regression

A later pre-launch test used nine independent temporary sessions with the same synthetic IP + User-Agent:

- first five accepted;
- next three moved to pending as repeated traffic accumulated;
- ninth returned `429 risk_rejected`;
- all eight inserted QA rows were deleted;
- the accepted public counter returned exactly to its pre-test value.

This test demonstrated escalation instead of a simplistic one-IP-one-vote block.

---

## 9. Turnstile integration

Cloudflare Turnstile support is implemented in both frontend and Edge Function.

### Frontend

`script.js` can lazily load:

```text
https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit
```

It requests `/api/config`, obtains the public site key if configured, renders the challenge, and resubmits with `turnstileToken`.

### Server

The Edge Function calls Cloudflare siteverify with:

- secret key;
- response token;
- remote IP when available.

A client-supplied token is never trusted without server verification.

### Adaptive behavior

If Turnstile secrets exist and calculated risk is high enough, the server can return `challenge_required`.

A successful challenge lowers the risk score and records `turnstile_verified_at`.

### Current live state

Implementation exists, but production currently reports `turnstileConfigured: false`.

Required secrets:

- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

Do not claim Turnstile is protecting live traffic until `/api/health` confirms it is configured and a real challenge has been tested end to end.

---

## 10. Optional email confirmation and deletion flow

The Edge Function supports optional email verification through Resend.

### User experience

Email is not required to sign.

If supplied and email delivery is configured:

- a verification token is generated;
- only the SHA-256 token hash is stored;
- an email contains a verification URL;
- the email also provides a deletion link.

### Verification behavior

When a valid verification token is used:

- `email_verified_at` is set;
- a pending signature can be promoted to accepted when its risk score remains below the hard rejection threshold.

### Deletion

Deletion is supported through:

- a tokenized email link;
- same-device/session deletion flow.

### Current live state

Production currently reports `emailConfigured: false`.

Expected secrets:

- `RESEND_API_KEY`
- `PETITION_FROM_EMAIL`

The privacy page and campaign email identity should be finalized before enabling bulk campaign communications.

Providing an email is **not** the same as opting into campaign updates. The separate `updates_opt_in` checkbox controls that consent.

---

## 11. Database model

### `public.signatures`

Base purpose: durable petition records.

Important fields include:

- `id`
- `name`
- `email`
- `country`
- `public_name`
- `updates_opt_in`
- `status`
- `risk_score`
- `email_verified_at`
- `verify_token_hash`
- `delete_token_hash`
- `session_hash`
- `ip_hash`
- `user_agent_hash`
- `source`
- `referral_code`
- `referrer_code`
- `locale`
- `turnstile_verified_at`
- `created_at`
- `accepted_at`

### `public.petition_stats`

Small aggregate table containing the public counters.

The count endpoint does not run `COUNT(*)` over the full signatures table on every page view.

A trigger updates:

- `accepted_count`;
- `email_verified_count`.

This keeps the public count read path O(1) and is important for high traffic.

### `public.petition_internal`

Internal configuration only.

Currently used for:

- HMAC salt;
- hashed admin token.

This table must never be exposed to anonymous browser access.

---

## 12. RLS and privilege model

All sensitive public-schema tables have RLS enabled.

Direct `anon` / `authenticated` access is revoked and explicit deny policies are used as defense in depth.

The browser does not query `signatures` directly.

The privileged Edge Function uses a server-side secret key to access the Data API.

### Admin aggregate function

`get_petition_admin_stats()` is a privileged aggregate function used to generate dashboard statistics.

Important security property:

- public/anon/authenticated execution is revoked.

The raw admin token is **not** stored in Git. Only a SHA-256 hash is stored in `petition_internal`.

---

## 13. Public counter model

`/api/count` returns the aggregate `accepted_count`.

The client fetches the count with `cache: no-store`, while the API can still expose a small CDN-friendly cache window and stale-while-revalidate behavior.

The public UI shows only accepted signatures.

Never display:

```text
accepted + pending + rejected
```

as “signatures”.

That would destroy the meaning of the anti-abuse system.

---

## 14. Acquisition attribution model

The project intentionally avoids installing an advertising tracker.

Attribution is stored on the signature itself.

### `source`

`source` answers:

> “Which acquisition/share channel brought this signer?”

Examples:

- `direct`
- `tiktok_launch`
- `x_launch`
- `reddit`
- `share_whatsapp`
- `share_x`
- `share_copy`
- `share_native`
- `qr_poster`
- `qr_stadium`

The backend sanitizes source into a conservative lowercase token.

### Acquisition precedence

`launch.js` currently determines the incoming source in this order:

1. `utm_source`
2. `source`
3. if a personal `ref` exists → `referral`
4. external `document.referrer` hostname
5. `direct`

Therefore explicit campaign parameters are preferred.

### Recommended campaign URLs

```text
/?utm_source=tiktok_launch
/?source=x_launch
/?source=reddit_bayern
/?source=qr_poster
/?source=qr_stadium
```

For a QR code, encode a URL containing a specific source. The site does not need a third-party QR analytics script.

---

## 15. Referral model

There are two separate referral fields.

### `referral_code`

A random public referral code owned by the signer.

After a successful signature the backend returns this code to the browser.

The post-sign modal creates a link such as:

```text
https://give-lewy-2020.vercel.app/?ref=AbC123...
```

### `referrer_code`

The code found in the incoming visitor’s `?ref=` parameter.

If that visitor signs, the new signature stores the original signer’s code in `referrer_code`.

That allows the aggregate dashboard to answer:

> “How many accepted signatures did this referral code generate?”

without tracking the referred friend across the web.

### Privacy property

The public referral link identifies the campaign referral relationship, not the friend’s identity.

Do not expose a public endpoint that maps a referral code to a name or email.

---

## 16. Share-channel attribution added after the milestone system

`attribution.js` adds a second attribution dimension to shared URLs without replacing personal referrals or milestone URLs.

It distinguishes:

- X/Twitter → `source=share_x`
- WhatsApp → `source=share_whatsapp`
- copied link → `source=share_copy`
- Web Share API/native share → `source=share_native`

### Parameter preservation

The helper preserves existing parameters.

For example:

```text
/?goal=10k
```

becomes:

```text
/?goal=10k&source=share_x
```

A personal referral:

```text
/?ref=ABC123
```

becomes:

```text
/?ref=ABC123&source=share_whatsapp
```

This is important because `ref` and `source` answer different questions:

- `ref` = **who inspired the signature?**
- `source` = **through which channel did the link travel?**

### No additional database migration

The existing `source` column is generic, so channel attribution requires no new column.

---

## 17. Post-sign viral loop

After a successful signature, `launch.js` opens a modal encouraging the signer to bring three more people.

It offers:

- native share;
- WhatsApp;
- X/Twitter;
- copy personal link.

The message is localized for FR/EN/PL/DE.

The returned personal `referralCode` is reused if the same session attempts to sign again and receives `already_signed`, so a genuine signer can still access/share their referral link instead of being stuck at an error.

This loop is one of the primary growth mechanisms for the campaign.

---

## 18. Milestone momentum system

`viral.js` manages major campaign milestones:

- 10K
- 100K
- 1M
- 10M
- 100M

It reads the live public counter, identifies:

- last reached milestone;
- next milestone;
- signatures remaining;
- progress within the current milestone band.

It updates the UI and share copy accordingly.

### Milestone share URL

Milestone links add:

```text
?goal=10k
?goal=100k
?goal=1m
...
```

This gives social platforms a cache-busting campaign URL dimension so milestone preview cycles can be refreshed rather than permanently using one old share URL.

### Dynamic OG card

`/api/og` generates a 1200×630 PNG social card.

Before the first large milestone, the card uses the core narrative around the 2019/20 season.

As the campaign reaches major thresholds, the visual/copy can become milestone-driven.

The public HTML receives Open Graph/Twitter metadata during `build.js`.

---

## 19. Internationalization

Current campaign languages:

- French;
- English;
- Polish;
- German.

### Architecture

FR/EN core strings live in `script.js`.

Season FR/EN additions live in `season.js`.

PL/DE and viral post-sign copy live in `launch.js`.

This was an incremental implementation and is functional, but the translations are fragmented across modules.

### Recommended future refactor

Move translations into one data module per language:

```text
i18n/fr.js
i18n/en.js
i18n/pl.js
i18n/de.js
```

Then have every UI module consume the same locale store.

Do this after launch stabilization rather than immediately before launch.

---

## 20. Documentary 2019/20 section

The “season” section was added to make the campaign’s factual basis visible instead of presenting only a petition form.

It includes:

- 55 goals in 47 Bayern matches in 2019/20;
- 34 Bundesliga goals;
- 15 Champions League goals;
- 6 German Cup goals;
- treble;
- top-scorer context;
- UEFA Player of the Year context;
- historical timeline moments;
- official UEFA/Bayern archive links.

Images use Wikimedia Commons material with visible attribution.

When changing a statistic, archive link, image or license, re-verify the source before deploying.

Do not silently replace Creative Commons imagery with arbitrary copyrighted editorial photography.

---

## 21. Admin dashboard

`/admin` is a private aggregate dashboard.

Authentication:

```text
Authorization: Bearer <admin token>
```

The raw admin token is held by the operator and is not committed.

The dashboard stores the token only in browser `sessionStorage`, not localStorage.

### Aggregate metrics

Current dashboard can show:

- accepted;
- pending;
- rejected;
- accepted last hour/day;
- email provided;
- email verified;
- campaign updates opt-in;
- source breakdown;
- country breakdown;
- locale breakdown;
- referral conversion counts;
- risk buckets;
- Turnstile verified count;
- backend health/version.

### Data minimization

The dashboard must not return:

- signer emails;
- signer names;
- raw IPs;
- session hashes;
- raw user-agent hashes.

If a future moderation interface needs row-level data, build a separate access-controlled tool rather than broadening the existing aggregate endpoint casually.

---

## 22. Health endpoint

`/api/health` exists to answer operational questions without exposing private data.

Expected fields include:

- `ok`
- backend version
- database state
- accepted count
- `emailConfigured`
- `turnstileConfigured`
- latency/check timestamp

It should not expose secret values.

Use it before and during launch.

---

## 23. Build architecture

The project originally needed a temporary deployment workaround because connector-driven deployments could not reliably ship the static tree.

An early production phase used a static proxy that fetched pinned GitHub assets.

That workaround was later replaced by the current reproducible build pipeline.

### Current build

`build.js`:

1. creates `dist/`;
2. materializes every required static asset;
3. prefers local source files when present;
4. otherwise can fetch a pinned/current GitHub source revision;
5. injects social metadata;
6. injects milestone assets;
7. injects `attribution.js`.

Vercel uses:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

### Why the fallback materializer exists

It makes connector-driven deployments more reproducible when a deployment system has the project config but not a complete local checkout.

For a conventional Git-linked Vercel project with a normal checkout, local copies are used.

---

## 24. Vercel routing and headers

`vercel.json` maps:

- `/merci` → `thanks.html`
- `/confidentialite` → `privacy.html`
- `/admin` → `admin.html`
- `/press` → `press.html`

Security headers include:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- restrictive `Permissions-Policy`

### Pre-launch indexing

There is currently a global:

```text
X-Robots-Tag: noindex, nofollow
```

This was added deliberately to prevent a half-configured pre-launch site being indexed.

**Public launch requires an intentional change.**

Do not accidentally remove this while still using placeholder privacy/contact information.

---

## 25. SEO, robots and sitemap

The repo contains:

- `robots.txt`
- `sitemap.xml`
- canonical header behavior
- Open Graph/Twitter metadata

The current canonical points to the Vercel domain.

When the custom domain is attached:

1. update canonical URL;
2. update OG URL;
3. update OG image absolute URL if needed;
4. update sitemap locations;
5. update robots sitemap reference;
6. update Edge allowed-origin/default-site logic;
7. update referral/share base URLs;
8. retest verification/deletion redirects;
9. only then remove global noindex for public launch.

---

## 26. API proxy responsibilities

`api/_edge.js` should remain intentionally thin.

It is responsible for:

- selecting the Supabase Edge endpoint;
- preserving/generating petition session;
- setting the application cookie;
- passing selected origin/IP/UA/session information;
- forwarding authorization for admin;
- returning status/body/content type;
- forwarding only selected response headers such as location/cache-control.

It should **not** become a second business-logic implementation.

Risk scoring, database rules and validation belong in the Edge Function/database.

This reduces the chance that Vercel and Supabase enforce different rules.

---

## 27. Supabase Edge Function responsibilities

`petition-api` is the central application backend.

It handles actions including:

- count;
- config;
- sign;
- verify;
- delete;
- same-session delete;
- admin aggregate statistics;
- health-related configuration/state.

It owns:

- source/referral sanitization;
- email validation;
- duplicate checks;
- HMACs;
- velocity counts;
- risk score;
- Turnstile verification;
- optional email sending;
- insert/update/delete calls.

### Backend version

The function exposes a version string through config/health paths.

Increment it when deploying behaviorally meaningful backend changes so operators can tell which Edge release is live.

---

## 28. Secret management

Never commit any of these values:

- Supabase secret/service-role key;
- `SUPABASE_SECRET_KEYS`;
- `RESEND_API_KEY`;
- `PETITION_FROM_EMAIL` credentials if sensitive;
- `TURNSTILE_SECRET_KEY`;
- Vercel API token;
- raw admin dashboard token;
- HMAC salt;
- private signer export.

Public/non-secret identifiers such as project refs and public site keys can be documented, but secrets must stay in provider secret stores.

---

## 29. Production migrations

The project began with a base schema and then added incremental protections/features.

Important migration themes include:

- initial petition schema;
- internal signing salt;
- explicit denial of public Data API access;
- unique active-session enforcement;
- pre-launch attribution/referral/admin columns and indexes.

### Fresh install vs production history

`db/schema.sql` is the base model, but production may include later migration columns/functions that are not represented in the oldest base fragment.

A new developer must always inspect both:

```text
db/schema.sql
db/migrations/
```

Do not assume `schema.sql` alone describes current production.

---

## 30. Aggregate statistics function

The pre-launch migration added `get_petition_admin_stats()`.

It builds JSON containing:

- global counts;
- last-hour/day counts;
- daily history;
- sources;
- countries;
- locales;
- referral conversions;
- risk buckets.

It is a SQL `SECURITY DEFINER` aggregate function, which makes privilege control especially important.

Public execution is revoked.

If modifying it:

- keep `search_path` constrained;
- keep execution revoked from public/anon/authenticated;
- do not accidentally add raw signer fields to the returned JSON;
- rerun security review.

---

## 31. Testing philosophy

The project uses three types of verification.

### A. Structural/static checks

Examples:

- required asset exists;
- correct MIME type;
- build output contains required scripts;
- security/noindex headers present;
- public HTML contains social metadata.

### B. Live API checks

Examples:

- `/api/count` returns expected accepted count;
- `/api/health` database state is OK;
- `/api/config` reflects optional services;
- duplicate session returns `409`.

### C. Controlled production-data tests

Only when necessary.

Rules:

- label test source, e.g. `regression-test`;
- record accepted count before test;
- use temporary sessions;
- delete every test row;
- confirm accepted count returns exactly to baseline;
- neutralize temporary QA endpoints/projects.

Never leave fake signatures in the campaign to make the number look bigger.

---

## 32. Browser QA status

HTTP/build/API behavior has been verified repeatedly.

At one point automated screenshot/browser CLI verification was unavailable in the execution environment, so visual QA was performed structurally/live rather than claiming screenshot coverage that had not occurred.

Before public promotion, a human/browser pass should explicitly cover:

- iPhone Safari;
- Android Chrome;
- desktop Chrome/Safari/Firefox;
- mobile keyboard/form behavior;
- language selector;
- share modal;
- copy/native share;
- WhatsApp/X outbound URLs;
- refresh + duplicate sign;
- incognito behavior;
- network switch Wi-Fi → cellular;
- Turnstile if activated.

---

## 33. Referral and channel QA checklist

For each share path, inspect the outbound campaign URL.

Expected examples:

```text
X milestone:
https://.../?goal=10k&source=share_x

WhatsApp personal referral:
https://.../?ref=<code>&source=share_whatsapp

Copied personal referral:
https://.../?ref=<code>&source=share_copy

Native share:
https://.../?ref=<code>&source=share_native
```

Then sign from a fresh controlled session and verify the admin dashboard source/referral aggregates.

Clean up any controlled test rows and confirm the public count returns to baseline.

---

## 34. QR campaign tracking

QR does not require a special database feature.

Generate QR codes from explicit URLs such as:

```text
https://give-lewy-2020.vercel.app/?source=qr_poster
https://give-lewy-2020.vercel.app/?source=qr_stadium
https://give-lewy-2020.vercel.app/?source=qr_presskit
```

If using a signer’s referral code in a QR:

```text
https://give-lewy-2020.vercel.app/?ref=<code>&source=qr
```

Use stable, human-readable source tokens because they appear in aggregate admin reports.

---

## 35. Press and creator flow

`/press` and `PRESS-KIT.md` exist so creators/media can get:

- campaign framing;
- verified season facts;
- official/source links;
- suggested campaign wording;
- campaign URL.

Before public outreach:

- replace temporary contact placeholders;
- verify every media asset license;
- provide a campaign press email;
- use source-tagged links per outreach channel.

Example:

```text
/?source=press_poland
/?source=creator_tiktok_01
```

Avoid putting a creator’s private personal information in the source token.

---

## 36. Known limitations and technical debt

### Identity uniqueness

Perfect one-person-one-signature is not guaranteed without stronger identity verification.

Current protections are anti-abuse controls, not identity proof.

### Browser-layer duplication

Core submit logic exists in `script.js`, while launch logic intercepts it in `launch.js`.

Refactor after stabilization.

### Dynamic module loading

`season.js` loads `launch.js`, which couples unrelated concerns.

Refactor after stabilization.

### Huge-scale rate limiting

Current velocity checks use Postgres count queries.

That is acceptable for pre-launch/moderate load, but a 100M-scale campaign should move hot-path rate limiting toward:

- Vercel WAF/rate limiting;
- Redis/edge rate store;
- another low-latency counter layer.

Keep Postgres as durable signature storage, not the only burst-control engine.

### Optional services are off

Turnstile and email code exist but are not live until secrets are configured.

### Privacy/legal placeholders

The privacy page still requires a real operator identity/contact.

### Pre-launch noindex

Search engines are deliberately blocked globally until launch.

### Final domain

The Vercel domain is temporary campaign infrastructure, not necessarily the final public brand URL.

---

## 37. Scaling roadmap toward very large traffic

### Phase 1 — current pre-launch

- Vercel CDN static frontend;
- Supabase Edge write API;
- Postgres durable storage;
- aggregate counter table;
- session + velocity anti-abuse;
- private aggregate dashboard.

### Phase 2 — public launch

- custom domain;
- Turnstile active;
- Resend if desired;
- WAF/rate limiting around `POST /api/signatures`;
- source-tagged launch links;
- alerts/monitoring;
- operator privacy/contact complete.

### Phase 3 — sustained large traffic

- external/edge rate store;
- background/queue path for non-critical email work;
- more efficient aggregate pipelines;
- database index review;
- partitioning/archival strategy only when evidence justifies it;
- load testing using non-production infrastructure;
- automated anomaly alerts on pending/rejected/source spikes.

### Phase 4 — extreme global campaign

At tens of millions of durable writes, architecture should be re-evaluated using real observed load, not guessed thresholds.

Important metrics:

- write latency;
- rejection/pending rate;
- DB CPU/IO;
- Edge invocation rate;
- source conversion;
- referral coefficient;
- email confirmation rate;
- cost per accepted signature.

---

## 38. Incident response principles

See `OPERATIONS.md` for step-by-step actions.

General rules:

1. accepted count is the public source of truth;
2. do not manually inflate it;
3. if API health fails, stop promotion rather than “accepting locally”;
4. if duplicates appear, inspect cookie/session propagation first;
5. if bot traffic spikes, inspect aggregate risk/source patterns;
6. do not punish an entire shared IP by default;
7. rollback frontend and backend independently when possible;
8. after rollback, verify count and signing before resuming promotion.

---

## 39. Rollback model

### Vercel/frontend regression

Restore/promote the last known-good deployment, then verify:

- `/`
- `/api/count`
- `/api/health`
- `/admin`
- `/api/og`
- signing flow

A frontend rollback does not itself roll back the Supabase database.

### Supabase Edge regression

Deploy the last known-good `petition-api` source, then run:

- health/config check;
- one controlled signature test;
- same-session duplicate test;
- cleanup;
- accepted count comparison.

### Database migration regression

Treat database rollback as a separate operation.

Do not casually reverse a migration containing accepted signer data. Prefer additive/repair migrations unless a rollback has been explicitly designed and tested.

---

## 40. Development chronology

This is the condensed project history visible in Git.

### Foundation

- repository initialized;
- config template and gitignore added;
- server utilities and public config endpoint created;
- scalable counter endpoint created;
- deletion and email verification endpoints added;
- low-friction signing endpoint added;
- production database schema added;
- v1→v2 migration added.

### First public frontend

- petition landing page;
- privacy page;
- client signing logic;
- core styling;
- verification result page;
- Vercel configuration.

### Backend consolidation

- signing backend moved to Supabase Edge;
- docs/schema aligned with production;
- persistent petition-session cookie bug fixed;
- unique active-session database migration added.

### Documentary campaign layer

- 2019/20 season section added;
- documentary styles added;
- bilingual season content added;
- assets wired into landing page;
- Bayern archive link replaced with a verified official link.

### Pre-launch growth/admin

- admin auth forwarding;
- aggregate admin endpoint;
- viral flow styles;
- PL/DE + personal referrals;
- launch module loaded after season translations;
- private aggregate dashboard;
- press kit/page;
- acquisition/referral/database metrics;
- server-side Turnstile verification;
- attribution documentation;
- email-confirmation result sharing;
- admin/press routes;
- pre-launch architecture documentation.

### Abuse hardening and operations

- risk scoring hardened;
- health endpoint;
- robots/sitemap;
- backend health surfaced in admin;
- security/SEO headers;
- reproducible Vercel build;
- static materializer;
- Vercel build config alignment;
- production/QA documentation;
- launch/incident runbook;
- language selector styling fix;
- explicit pre-launch noindex.

### Social/milestone growth

- dynamic social preview image;
- image renderer;
- build-time Open Graph/Twitter metadata;
- milestone progress UI;
- milestone-aware share goals;
- milestone assets wired into build;
- milestone-aware social card.

### Channel attribution

- added `attribution.js`;
- share URLs can now distinguish X, WhatsApp, copy and native share while preserving referral and milestone parameters.

---

## 41. Important commits for incident archaeology

A few commits are especially useful when debugging history:

```text
cf1c1e0  Move signing backend to Supabase Edge
fed73db  Fix persistent petition session cookie
3de6c53  Record unique active session migration
9cefa0c  Add 2019/20 season documentary section
1b39cf4  Add viral referrals and Polish German launch languages
d846577  Track launch attribution and add aggregate admin metrics
b258068  Add referrals admin metrics and server verified anti bot flow
91b8390  Harden anti-abuse scoring before launch
3b8aeef  Add production healthcheck endpoint
c4c4c72  Add launch and incident operations runbook
fb07bdd  Add dynamic social preview image
470b5e1  Add milestone momentum UI
cac4169  Make social card milestone-aware
```

Use `git log --oneline --all` for the full chronology.

---

## 42. Pre-launch developer checklist

### Identity/privacy

- [ ] real operator identity filled in;
- [ ] real contact email/address as legally appropriate;
- [ ] privacy copy reviewed for actual production behavior;
- [ ] campaign-update consent wording matches email behavior.

### Domain

- [ ] custom domain attached;
- [ ] HTTPS valid;
- [ ] canonical updated;
- [ ] sitemap/robots updated;
- [ ] Edge allowed origins updated;
- [ ] email links redirect to new domain;
- [ ] referral/share links use new domain.

### Abuse protection

- [ ] same browser cannot sign twice;
- [ ] unique active-session index present;
- [ ] Turnstile secrets configured if launch plan requires them;
- [ ] server-side Turnstile verified with a real challenge;
- [ ] WAF/rate limit staged for large promotion;
- [ ] pending/rejected metrics visible.

### Growth

- [ ] WhatsApp share has `source=share_whatsapp`;
- [ ] X share has `source=share_x`;
- [ ] copied link has `source=share_copy`;
- [ ] native share has `source=share_native`;
- [ ] personal referral `ref` survives channel tagging;
- [ ] milestone `goal` survives channel tagging;
- [ ] launch links use explicit source labels;
- [ ] QR links use explicit source labels.

### Email

- [ ] if enabled, sender domain verified;
- [ ] verification email arrives;
- [ ] deletion link works;
- [ ] no email is sent to a user who did not provide one;
- [ ] update opt-in remains separate.

### Public site

- [ ] FR;
- [ ] EN;
- [ ] PL;
- [ ] DE;
- [ ] mobile layout;
- [ ] form;
- [ ] counter;
- [ ] season content;
- [ ] social card;
- [ ] privacy page;
- [ ] press page.

### Search launch

- [ ] placeholder content removed;
- [ ] final domain set;
- [ ] only then remove global `noindex, nofollow`;
- [ ] verify with response headers, not just robots.txt.

---

## 43. New-developer first hour

A developer taking over should do the following in order.

1. Read:
   - `README.md`
   - this file
   - `OPERATIONS.md`
2. Inspect:
   - `vercel.json`
   - `build.js`
   - `api/_edge.js`
   - `supabase/functions/petition-api/index.ts`
   - `db/schema.sql`
   - all `db/migrations/`
3. Check production:
   - `/api/health`
   - `/api/count`
4. Check current Vercel deployment and aliases.
5. Check Supabase Edge Function version.
6. Confirm optional service state.
7. Run a local/static build.
8. Do **not** run a destructive production signature test until the cleanup path and baseline count are known.

---

## 44. Rules for future changes

### When changing signing

Always test:

- first sign;
- same-session second sign;
- optional email;
- pending path;
- count change;
- cleanup.

### When changing cookies/proxy

Treat it as high risk.

The historical multi-signature bug was caused in this layer.

### When changing database indexes/status logic

Verify the public `petition_stats` trigger remains consistent through:

- insert;
- pending→accepted;
- accepted→deleted;
- email verification.

### When changing referral/share code

Preserve both:

- `ref`;
- `goal`.

Then add/update `source`.

### When changing domain

Search the entire repo for the old Vercel URL and review each occurrence. Not every absolute URL should be blindly replaced; some may be historical documentation.

### When adding analytics

Prefer aggregate first-party data.

Do not add a third-party advertising pixel by default.

---

## 45. Data export and backups

If the campaign publishes count evidence or provides a third-party audit:

- export only what is necessary;
- prefer aggregate/anonymized datasets;
- do not publish emails;
- do not publish IP/session/UA hashes as if they were harmless — hashes can still be sensitive;
- timestamp exports;
- record methodology;
- keep immutable backup copies before large moderation/data cleanup operations.

The campaign’s credibility depends more on a defensible counting method than on the largest possible headline number.

---

## 46. Product principles to preserve

1. **Accepted count means accepted signatures.**
2. **Email stays optional unless the campaign explicitly changes product policy.**
3. **Updates require separate consent.**
4. **Raw IP is not stored.**
5. **No secret reaches the browser.**
6. **No fake/seed signatures.**
7. **No claim of perfect human identity proof.**
8. **No public exposure of signer private data.**
9. **Campaign framing stays retrospective, not punitive toward other winners.**
10. **Before extreme scale, move burst controls out of Postgres hot paths.**

---

## 47. Final handoff summary

The project is no longer just a static petition page. It now has:

- a live durable signature backend;
- an O(1) accepted-signature counter;
- session-based duplicate prevention;
- a layered privacy-preserving risk engine;
- optional email verification;
- server-verified adaptive Turnstile support;
- a four-language public experience;
- a documentary factual section;
- a post-sign personal referral loop;
- first-party source/referral attribution;
- per-share-channel attribution;
- milestone momentum and social cards;
- an aggregate private admin dashboard;
- a press/creator kit;
- health, deployment and incident procedures;
- pre-launch crawler blocking;
- reproducible Vercel build behavior.

The highest-priority remaining work before a real public launch is operational rather than feature-heavy:

1. real campaign operator/contact;
2. final domain;
3. Turnstile activation;
4. email provider decision/activation;
5. browser/device regression test;
6. source/referral verification;
7. final privacy review;
8. deliberate removal of `noindex`;
9. launch monitoring.

Keep feature creep under control after those items. The next engineering work should be driven by observed launch data: conversion, referral coefficient, abuse patterns, latency and cost.
