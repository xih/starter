# LiveKit Guest Sessions

The guest LiveKit flow lets unauthenticated visitors try the portfolio voice
agent once for 30 seconds. It is intentionally separate from the protected
`/api/livekit/token` QA/admin route.

## Routes

- `POST /api/livekit/guest-session`
  - Public route used by the guest UI.
  - Generates the session id, room name, participant identity, and agent
    dispatch server-side.
  - Ignores caller-supplied room, participant, agent, and dispatch fields.
  - Returns `server_url` and `participant_token` for LiveKit, plus
    `session_id`, `room_name`, `expires_at`, `duration_seconds`, and
    `signup_url`.
- `POST /api/livekit/guest-session/expire`
  - QStash-only route.
  - Verifies the QStash signature.
  - Deletes the LiveKit room and releases the active-session lock.

Guest policy constants live in
`apps/web/src/server/livekit/guest-session-config.ts`:

```ts
LIVEKIT_GUEST_SESSION_SECONDS = 30;
LIVEKIT_GUEST_TOKEN_TTL_SECONDS = 45;
LIVEKIT_GUEST_ACTIVE_TTL_SECONDS = 60;
LIVEKIT_GUEST_CLEANUP_ENABLED =
  process.env.LIVEKIT_GUEST_CLEANUP_ENABLED === "true";
LIVEKIT_GUEST_COOLDOWN_ENABLED = false;
LIVEKIT_GUEST_COOLDOWN_SECONDS = 3_600;
LIVEKIT_GUEST_SIGNUP_URL = "/api/auth/signin";
```

These are product policy values, not secrets. `LIVEKIT_GUEST_CLEANUP_ENABLED`
is read from the environment so deployments can enable QStash cleanup without
code changes. It controls whether QStash forcibly expires the room after
`LIVEKIT_GUEST_SESSION_SECONDS`. Leave it unset or set to `false` for local QA
so conversations can run longer. Set it to `true` when you want the 30-second
cap.
`LIVEKIT_GUEST_COOLDOWN_ENABLED` controls whether a browser/IP is limited to
one completed guest trial per cooldown window. It is currently off for local
QA, while the active-session lock still prevents parallel guest sessions from
the same browser/IP.

## Required Secrets

These values must be present in Infisical for each environment that should run
guest sessions:

```text
LIVEKIT_URL
LIVEKIT_API_KEY
LIVEKIT_API_SECRET
LIVEKIT_AGENT_NAME
LIVEKIT_ALLOWED_ORIGINS
LIVEKIT_GUEST_RATE_LIMIT_SALT
LIVEKIT_GUEST_CLEANUP_ENABLED
UPSTASH_REDIS_REST_TOKEN
UPSTASH_REDIS_REST_URL
```

When `LIVEKIT_GUEST_CLEANUP_ENABLED` is enabled, also configure:

```text
QSTASH_CURRENT_SIGNING_KEY
QSTASH_NEXT_SIGNING_KEY
QSTASH_TOKEN
QSTASH_URL
```

`LIVEKIT_GUEST_RATE_LIMIT_SALT` should be a long random secret. Generate one
per environment:

```sh
openssl rand -base64 32
```

Keep `LIVEKIT_TOKEN_AUTH_SECRET` configured too. It is still used by the
protected QA/admin `/api/livekit/token` route, not by guest sessions.

## Upstash Setup

Create one Upstash Redis database and one QStash project per environment, or
use one shared Upstash account with separate Redis databases named clearly:

```text
starter-livekit-dev
starter-livekit-staging
starter-livekit-prod
```

For each Redis database:

1. Open the Upstash console.
2. Create a Redis database in the region closest to the Vercel deployment.
3. Copy `UPSTASH_REDIS_REST_URL`.
4. Copy `UPSTASH_REDIS_REST_TOKEN`.
5. Store both in the matching Infisical environment.

For QStash:

1. Open Upstash QStash.
2. Copy `QSTASH_URL` from the Quickstart block. It is region-specific, for
   example `https://qstash-us-east-1.upstash.io`.
3. Copy `QSTASH_TOKEN`.
4. Copy both signing keys:
   - `QSTASH_CURRENT_SIGNING_KEY`
   - `QSTASH_NEXT_SIGNING_KEY`
5. Store all four in the matching Infisical environment.

QStash calls the public expire route after 30 seconds. The route must be
reachable from the internet, so full cleanup cannot be validated through a
plain `localhost:3000` URL unless you expose it with a tunnel.

## Infisical to Vercel Sync

For each environment:

1. Add the required secrets to Infisical at path `/`.
2. Confirm the Vercel integration points to the correct Vercel project and
   environment:
   - Development -> Vercel Development or Preview, depending on your workflow.
   - Staging -> Vercel Preview/Staging.
   - Production -> Vercel Production.
3. Trigger the Infisical secret sync.
4. Redeploy Vercel. Runtime env changes are only guaranteed after a new
   deployment/function instance.

Expected production values for the current prod app:

```text
LIVEKIT_ALLOWED_ORIGINS=https://www.dennisxing.fm
LIVEKIT_AGENT_NAME=dennis-portfolio-agent
```

Production allows only the canonical portfolio origin. The public guest-session
route also requires the browser to send an `Origin` header in production, because
normal portfolio calls should come from `https://www.dennisxing.fm` and do not
need curl or server-to-server token minting. The LiveKit routes use the shared
code defaults for Vercel Production and do not expand the production allowlist
from `LIVEKIT_ALLOWED_ORIGINS`. Keep the Vercel/Infisical value aligned with the
code default for operator clarity.

Vercel Preview, Development, and staging-like deployments run with
`NODE_ENV=production`, but they are not the canonical production environment.
For those deployments, set `LIVEKIT_ALLOWED_ORIGINS` to the exact preview or
tunnel origins that should be able to request LiveKit tokens. For example:

```text
LIVEKIT_ALLOWED_ORIGINS=https://<preview-host>.vercel.app,https://<tunnel-host>
```

## Production Domain and HTTPS

The canonical portfolio URL is:

```text
https://www.dennisxing.fm
```

Vercel should have both domains attached to the same production project:

```text
www.dennisxing.fm
dennisxing.fm
```

DNS expectations:

1. Point `www` at the Vercel-provided target.
2. Add the apex/root `dennisxing.fm` record Vercel requests.
3. Wait for Vercel to issue certificates for both hostnames.
4. Keep the repo-level Vercel redirect from `dennisxing.fm/:path*` to
   `https://www.dennisxing.fm/:path*`.

Validation commands:

```sh
curl -I -L https://www.dennisxing.fm/livekit-agent
curl -I -L http://www.dennisxing.fm/livekit-agent
curl -I -L https://dennisxing.fm/livekit-agent
curl -i -X OPTIONS https://www.dennisxing.fm/api/livekit/guest-session \
  -H 'Origin: https://www.dennisxing.fm'
```

Expected LiveKit CORS result after redeploy:

```text
HTTP/2 204
access-control-allow-origin: https://www.dennisxing.fm
```

If Chrome still labels the page "Not secure" while the certificate is valid,
open DevTools -> Security and check the specific reason. The most likely
remaining causes are unresolved apex DNS, stale browser state, or mixed content
from an `http://` or `ws://` runtime URL. `LIVEKIT_URL` must use `wss://`.

## Local Development

Local token issuance and rate limiting can be tested with Infisical:

```sh
infisical run \
  --projectId 87922978-15ad-4880-add7-5ae10dbff217 \
  --env=dev \
  --path=/ \
  -- corepack pnpm dev
```

To test QStash cleanup locally, expose the local app with a public HTTPS tunnel
and call the tunnel URL. Without a tunnel, QStash cannot reach
`localhost:3000`.

## Validation Scenarios

Guest happy path:

1. Open `/livekit-agent?tokenEndpoint=/api/livekit/guest-session`.
2. Leave Optional endpoint auth empty.
3. Start voice session.
4. Expected: LiveKit connection succeeds and the room contains the browser
   participant plus an `agent-*` participant.
5. Expected while `LIVEKIT_GUEST_CLEANUP_ENABLED = false`: the room remains
   connected until the user ends it.
6. Expected after turning `LIVEKIT_GUEST_CLEANUP_ENABLED = true`: after 30
   seconds, QStash calls expire and the room is deleted.

Guest retry while active:

1. Start a guest session.
2. Immediately start another guest session from the same browser/IP.
3. Expected: `409 active_session_exists`.

Guest retry after trial:

1. Complete or expire a guest session.
2. Request another guest session from the same browser/IP.
3. Expected while `LIVEKIT_GUEST_COOLDOWN_ENABLED = false`: a new guest session
   can start.
4. Expected after turning `LIVEKIT_GUEST_COOLDOWN_ENABLED = true`:
   `429 guest_trial_used` with `signup_url: "/api/auth/signin"` until the
   one-hour cooldown expires.

Admin QA route still protected:

1. POST `/api/livekit/token` without `LIVEKIT_TOKEN_AUTH_SECRET`.
2. Expected in production: `401 Unauthorized LiveKit token request`.
3. POST with the correct secret.
4. Expected: token is issued.

Bad origin:

1. POST `/api/livekit/guest-session` with an origin not present in
   `LIVEKIT_ALLOWED_ORIGINS`.
2. Expected: `403 Origin is not allowed to request LiveKit guest sessions`.

Missing infrastructure env:

1. Remove or unset an Upstash/QStash env var in a non-production test
   deployment.
2. POST `/api/livekit/guest-session`.
3. Expected: `500 LiveKit guest sessions are not configured`.
