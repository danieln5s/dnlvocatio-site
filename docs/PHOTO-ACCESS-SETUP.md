# Email-verified photo access — setup and operations

Photographs on dnlvocatio.com are no longer public files. They live in a private
Supabase Storage bucket and are streamed by an authenticated Edge Function that
records every request against a verified email address.

- **Public state** — all text, navigation and layout as before, with neutral
  placeholders where photographs used to be, and a "View pictures" action.
- **Verified state** — the visitor enters an email, receives a one-time code,
  and the photographs appear in their original locations.

Any working inbox can gain access. This verifies control of an inbox, nothing
more, and verified visitors can still save or share what they see.

---

## 1. How it fits together

```
Browser                          Supabase
───────                          ────────
signInWithOtp(email)  ─────────► Auth  ──► emails a 6-digit code
verifyOtp(email, code) ────────► Auth  ──► access token (1 h) + refresh token
                                       └─► trigger writes private.auth_event_log

fetch("/functions/v1/photo?path=…")
  Authorization: Bearer <token> ► Edge Function "photo"
                                   1. auth.getUser(token)        (validates)
                                   2. parsePhotoPath(path)       (allow-list)
                                   3. storage.download()         (service role)
                                   4. record_photo_access()      (private log)
                                   5. optional owner notification
                                 ◄─ image bytes, Cache-Control: private, no-store
  → URL.createObjectURL(blob) → <img src="blob:…">
```

The bucket is private and **no storage policy grants `anon` or `authenticated`
any access to it**, so the Edge Function is the only path to the bytes. Two
`RESTRICTIVE` policies additionally guarantee that a future permissive policy
cannot accidentally open the bucket.

Photos are handed to the browser as in-memory blobs. The access token travels in
a request header, never in a URL, so there is no shareable link to copy, log or
cache.

### Key files

| Path | Purpose |
| --- | --- |
| `supabase/migrations/20260911090000_email_verified_photos.sql` | Tables, RLS, RPCs, auth trigger, bucket, storage policies |
| `supabase/functions/photo/index.ts` | Authenticated delivery path + access logging |
| `supabase/functions/_shared/photoPath.ts` | Path allow-list (shared with the tests) |
| `supabase/functions/_shared/notify.ts` | Optional owner notification |
| `src/components/PhotoAccessProvider.tsx` | Session state |
| `src/components/PhotoAccessDialog.tsx` | Email + code UI |
| `src/components/ProtectedImage.tsx` | Photo or neutral placeholder |
| `src/components/PhotoAccessGate.tsx` | "View pictures" / signed-in banner |
| `src/lib/protectedPhotos.ts` | Authenticated fetch + in-memory blob cache |
| `scripts/migrate-photos.js` | Upload local originals into the private bucket |
| `scripts/checkBuildArtifacts.js` | Fail the build if photos or secrets leak into `dist/` |

---

## 2. One-time backend setup

### 2.1 Create the project and apply the schema

```sh
npm install -g supabase          # or use npx supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push                 # applies supabase/migrations/
```

This creates the `private` schema, the log tables, the service-role-only RPCs,
the `auth.users` trigger, the private `protected-photos` bucket and its
restrictive storage policies.

### 2.2 Turn the magic link into a numeric code

Supabase sends a magic **link** by default. In
**Authentication → Emails → Magic Link**, replace the template with one that
includes `{{ .Token }}`. The version used here is in
`supabase/templates/magic_link.html`.

### 2.3 Code expiry and rate limits

**Authentication → Sign In / Providers → Email**

| Setting | Value | Why |
| --- | --- | --- |
| Email OTP expiration | `600` (10 minutes) | Short-lived codes |
| Email OTP length | `6` | Matches the UI |
| Confirm email | off | Codes already prove inbox control |

**Authentication → Rate Limits**

| Limit | Suggested |
| --- | --- |
| Emails sent per hour | `30` |
| Token verifications (per 5 min, per IP) | `30` |
| Minimum interval between OTP requests | `60s` |

Codes are single-use: Supabase invalidates the OTP once it has been verified.
The UI enforces a matching 60-second resend cooldown.

### 2.4 Production email delivery

Supabase's built-in sender is **for testing only** — it is heavily rate limited
and only delivers to members of your project. Before going live, configure your
own SMTP provider under **Project Settings → Authentication → SMTP Settings**,
following <https://supabase.com/docs/guides/auth/auth-smtp>.

Set sender name, sender address, host, port, username and password. Use a domain
you control with SPF/DKIM configured, or codes will land in spam.

### 2.5 Deploy the Edge Function

```sh
supabase functions deploy photo

supabase secrets set `
  PROTECTED_PHOTOS_BUCKET=protected-photos `
  ALLOWED_ORIGINS=https://dnlvocatio.com,https://www.dnlvocatio.com
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected
automatically by the Edge Runtime. **Never** put the service role key in a
`VITE_*` variable or anywhere in `src/`.

### 2.6 Optional owner notification

Disabled unless **both** values are set:

```sh
supabase secrets set `
  OWNER_NOTIFICATION_EMAIL=you@yourdomain.com `
  RESEND_API_KEY=re_xxx `
  NOTIFICATION_FROM_EMAIL=notifications@yourdomain.com
```

One email per verified session, sent on the **first photo request** of that
session. Requesting a code or signing in does not trigger it. De-duplication is
a primary key on the session in `private.photo_access_notification`, so a retry
storm cannot produce duplicates.

---

## 3. Migrating the photographs

The 38 photographs have already been moved out of `public/` into
`private-photos/`, which is gitignored. **Nothing has been deleted** — those are
still your originals.

```sh
$env:SUPABASE_URL="https://<ref>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<service role key>"

npm run photos:migrate -- --dry-run   # list what would be uploaded
npm run photos:migrate                # upload, then verify
npm run photos:verify                 # re-verify at any time
```

The script refuses to run if the bucket is public, uploads each file, then
downloads every object back and compares SHA-256 digests against the local
originals. It exits non-zero on any mismatch and never deletes anything.

**Keep `private-photos/` until `npm run photos:verify` passes.** Back it up
somewhere off this machine before you consider the migration done.

Adding new photographs later: drop the file into `private-photos/<gallery>/`,
run `npm run photos:migrate`, and reference it as `<gallery>/<file>` in the page.

---

## 4. Frontend configuration

Create `.env.local` (gitignored) from `.env.example`:

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable / anon key>
```

Both are browser-safe and end up in the JavaScript bundle by design.

For the GitHub Pages build, add the same two as **repository variables**
(Settings → Secrets and variables → Actions → **Variables**, not Secrets — they
are not secret and Actions masks secrets in ways that break the build output).
`.github/workflows/deploy.yml` already reads them.

If they are missing, the site still builds and runs; it simply stays in the
public state and says pictures are unavailable.

---

## 5. Local testing

### Mocked UI tests (no backend)

```sh
npm run test
```

Covers the public state, the code flow, error/expiry handling, sign-out,
analytics scrubbing and the path allow-list.

### Real backend authorization tests

```sh
supabase start
supabase functions serve photo --env-file supabase/functions/.env.local

# upload at least one photo first
$env:SUPABASE_URL="http://127.0.0.1:54321"
$env:SUPABASE_SERVICE_ROLE_KEY="<local service role key>"
npm run photos:migrate

$env:E2E_SUPABASE_URL="http://127.0.0.1:54321"
$env:E2E_SUPABASE_ANON_KEY="<local anon key>"
$env:E2E_SUPABASE_SERVICE_ROLE_KEY="<local service role key>"
npx vitest run tests/backendAuthorization.test.ts
```

These are skipped automatically when the `E2E_*` variables are absent.

Local OTP emails are captured by Inbucket at <http://localhost:54324>.

---

## 6. Inspecting the access records

Open the **Supabase dashboard → SQL Editor** (it runs as `postgres`). Visitors
cannot reach any of this: the `private` schema is not exposed through PostgREST,
and the writer functions are granted to `service_role` only.

```sql
-- Most recent photo access requests
select * from private.photo_access_recent limit 100;

-- Per-visitor rollup
select * from private.photo_access_by_visitor;

-- Successful inbox verifications (separate from photo access)
select * from private.auth_events_recent limit 100;

-- Everyone who has looked at the wedding gallery
select email, count(*) as requests, max(occurred_at) as last_request
from private.photo_access_log
where gallery = 'wedding' and outcome = 'allowed'
group by email
order by last_request desc;

-- Owner notifications and their delivery status
select * from private.photo_access_notification order by claimed_at desc;
```

### What the records actually mean

Each row in `private.photo_access_log` means **the file was requested over an
authenticated session and the bytes were served**. It is not evidence that a
person looked at the image, and it is not a read receipt. A browser may request
a photo that is never scrolled into view, and a visitor may look at an image for
a long time without generating a second row (delivered photos are cached in
memory for the page session and discarded on sign-out).

Every field is derived server-side:

| Field | Source |
| --- | --- |
| `user_id` | The validated access token |
| `email` | Looked up from `auth.users` inside the RPC, never taken from the request |
| `occurred_at` | Database `now()` |
| `event_type`, `outcome` | Set by the Edge Function |
| `gallery`, `photo_path` | The allow-listed path that was served |

---

## 7. Sessions

| Behaviour | Value |
| --- | --- |
| Access token lifetime | 1 hour |
| Renewal | Automatic while the tab is open (refresh token rotation) |
| Refresh token lifetime | Supabase default (inactivity-based); re-verification needed after a long gap |
| Persistence | `localStorage` key `dnlvocatio.photo-access`, managed by supabase-js |
| Sign-out | Revokes the session, revokes every blob URL, clears the in-memory cache |

During loading, expiry or any error the UI falls back to the **public** state:
placeholders and a "View pictures" action, never a broken page.

---

## 8. Privacy and analytics

- Google Analytics uses **Consent Mode v2 with everything denied by default**.
  Nothing is measured or stored until the visitor clicks "Allow".
- Declining analytics has **no effect** on requesting a code, verifying it, or
  viewing photographs. Email verification is never treated as consent to
  analytics.
- `src/lib/ga.ts` scrubs every payload: keys matching identity/credential/image
  patterns are dropped, as are any values containing `@` or starting with
  `blob:`, and query strings and fragments are stripped from paths.
- The access log lives entirely in the backend and does not depend on GA4 or on
  any browser analytics.

---

## 9. Production rollout checklist

1. `supabase db push` — schema, policies, bucket.
2. Magic Link template replaced with the `{{ .Token }}` version.
3. OTP expiry `600s`, rate limits set.
4. **Custom SMTP configured** (the default sender will not reach your visitors).
5. `supabase functions deploy photo`; `ALLOWED_ORIGINS` set.
6. `npm run photos:migrate` — all objects verified.
7. `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` added as repository variables.
8. `npm run verify` passes locally.
9. Work through `docs/PUBLIC-IMAGE-CLEANUP.md` — **hiding the current files does
   not remove older public copies.**
10. Merge the branch; the workflow builds, tests, scans `dist/` and deploys.
11. Sign in as a stranger would and confirm the photos appear, then check
    `private.photo_access_recent`.
