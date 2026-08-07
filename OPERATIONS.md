# Give Lewy 2020 — Operations Runbook

This runbook is for launch-day checks and incident response. Do not place secrets, raw signer data, admin tokens or provider API keys in this file.

## 1. Pre-launch gate

Do not start broad promotion until all required checks below pass.

### Public site

- `https://give-lewy-2020.vercel.app/` returns HTTP 200.
- `https://give-lewy-2020.vercel.app/launch.js` returns HTTP 200.
- `https://give-lewy-2020.vercel.app/robots.txt` returns HTTP 200.
- `https://give-lewy-2020.vercel.app/sitemap.xml` returns HTTP 200.
- FR / EN / PL / DE language switching works on mobile and desktop.
- One normal signature works and a refresh/re-sign from the same browser is rejected as already signed.

### Backend

Open `/api/health` and require:

- `ok: true`
- `database: "ok"`
- a non-empty backend `version`
- a `count` matching the public counter

`emailConfigured` and `turnstileConfigured` may be false during prelaunch, but their state must be intentional and documented before promotion.

### Private dashboard

- `/admin` is reachable.
- The admin token opens the dashboard.
- Accepted / pending / rejected totals look plausible.
- No unexpected acquisition source or referral spike is present before launch.
- `/admin` sends `noindex, nofollow` and `private, no-store`.

### Privacy / identity

Before a real public launch, replace every operator/contact placeholder in the privacy page and press kit with genuine campaign information.

## 2. Launch sequence

1. Run the pre-launch gate above.
2. Record the accepted counter at launch time.
3. Publish the first campaign link with an explicit source, for example `?utm_source=tiktok_launch` or `?utm_source=x_launch`.
4. Watch `/admin` after the first traffic spike.
5. Compare accepted vs pending vs rejected, not just raw traffic.
6. Do not manually inflate or seed the public counter.

## 3. Healthy traffic pattern

A normal launch can create bursts from shared networks. One IP is not treated as one person.

Expected behaviour:

- independent browser sessions can sign;
- the same session cannot create a second active signature;
- repeated IP + browser combinations progressively increase risk;
- suspicious requests can move to `pending`;
- clearly automated repetition can return HTTP 429;
- only accepted signatures affect the public counter.

## 4. If the public counter looks wrong

1. Check `/api/health`.
2. Check `/api/count` directly.
3. Check the aggregate dashboard accepted total.
4. If the dashboard and `/api/count` agree but the page does not, suspect frontend/CDN caching.
5. If the dashboard and `/api/count` disagree, stop promotion and inspect Supabase before making any manual data change.
6. Never edit `petition_stats` by hand unless the trigger logic has been reviewed and a backup exists.

## 5. If duplicate signatures are reported

Reproduce with the simplest case first:

1. Sign once in a normal browser.
2. Refresh the same page.
3. Attempt to sign again without clearing cookies.
4. Expected result: HTTP 409 / `already_signed`.

If the second signature is accepted, investigate the `give_lewy_session` cookie propagation through Vercel before changing risk thresholds.

## 6. If bot traffic spikes

Signs of abuse include a rapid rise in pending/rejected traffic, repeated IP + User-Agent patterns, or a source producing implausible acceptance velocity.

Response order:

1. Keep the accepted counter as the source of truth.
2. Check the dashboard risk buckets and sources.
3. Do not block a whole shared IP merely because many people use it.
4. Prefer stronger checks on repeated IP + browser patterns.
5. If Turnstile is configured, require it for higher-risk requests.
6. If abuse overwhelms application-level controls, add a Vercel WAF/rate-limit rule for `POST /api/signatures` and stage it conservatively before hard enforcement.

## 7. If the API is down

- `/api/health` returning 503 means the frontend should not be treated as launch-ready.
- Check the current Vercel production deployment state.
- Check Supabase Edge Function status.
- Avoid publishing a new campaign push while writes are failing.
- Do not accept signatures client-side and promise to store them later; the counter must represent durable accepted rows only.

## 8. Rollback

If a new Vercel deployment breaks the public flow:

1. identify the last known-good production deployment;
2. promote / restore that deployment in Vercel;
3. verify `/`, `/api/count`, `/api/health`, `/admin` and the signing flow;
4. confirm the Supabase database was not changed by the frontend rollback.

If an Edge Function release breaks signing, deploy the last known-good `supabase/functions/petition-api/index.ts` version and re-run a controlled signature + cleanup test.

## 9. Controlled regression test rules

Any automated production-data test must:

- use clearly labelled source `regression-test`;
- record the counter before the test;
- use temporary sessions only;
- delete every row created by the test;
- verify the counter returns exactly to the original value;
- neutralise any temporary QA endpoint after the test.

The latest prelaunch abuse regression test verified the progression accepted → pending → HTTP 429 and returned the counter to its exact initial value.

## 10. Domain cutover

When the final domain is purchased:

1. attach it to the existing Vercel project;
2. verify HTTPS and canonical redirect behaviour;
3. update `DEFAULT_SITE` / allowed-origin logic where necessary;
4. update canonical URL headers;
5. update `robots.txt` sitemap URL;
6. update `sitemap.xml` locations;
7. update share/referral URLs and press kit links;
8. configure campaign email addresses;
9. run the full pre-launch gate again on the new domain before promotion.
