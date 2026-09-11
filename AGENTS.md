# Agent Handbook — dnlvocatio.com

## Project overview

Personal portfolio and life site for Daniel Nursen, a data analyst. Deployed at **dnlvocatio.com** via GitHub Pages. The site has sections for About (bio + resume), Journal (dated entries with photos), Life (hobby photo/quote galleries), and Contact.

The site has **two states**. In the public state every photograph is replaced by a neutral placeholder. A visitor who verifies an email address with a one-time code enters the verified state and sees the photographs. See [docs/PHOTO-ACCESS-SETUP.md](docs/PHOTO-ACCESS-SETUP.md).

## Architecture and directory map

```
/                         Root config (Vite, Vitest, Tailwind, TypeScript, ESLint)
├─ .github/workflows/    GitHub Actions deploy to GitHub Pages
├─ docs/                 Photo access setup + public image cleanup
├─ private-photos/       GITIGNORED. Local originals for the private bucket.
├─ public/               Static assets (favicon, social.png, robots.txt, CNAME) — no photographs
├─ scripts/              Build fallback, photo migration, build artifact scan
├─ supabase/
│  ├─ migrations/        Schema, RLS, storage policies, access-log RPCs
│  ├─ functions/photo/   Authenticated image delivery Edge Function
│  └─ templates/         OTP email template
├─ tests/                Node-environment tests (build scan, real-backend authorization)
├─ src/
│  ├─ main.tsx           React entry point
│  ├─ App.tsx            Route definitions (react-router-dom, BrowserRouter)
│  ├─ index.css          Tailwind directives + CSS custom properties (design tokens)
│  ├─ components/        Shared components (Header, Footer, NavLink, FadeInImage, FadeInQuote,
│  │                     ProtectedImage, PhotoAccessProvider/Dialog/Gate, AnalyticsConsent)
│  │  └─ ui/            shadcn/ui primitives (do not edit manually; managed by shadcn CLI)
│  ├─ context/           Photo access context + hook
│  ├─ hooks/             Custom React hooks
│  ├─ lib/               Utilities (cn helper, GA4 wrapper, consent, Supabase client, photo fetch)
│  ├─ test/              Vitest setup, harness, browser-environment tests
│  └─ pages/             Route-level page components
│     └─ hobbies/        Hobby sub-pages (Cycling, Fishing, Reading, Running, Travel)
```

This is a single-page application with client-side routing. The only backend is Supabase (Auth, private Storage, Postgres, Edge Functions), used exclusively for photo access.

## Technology stack

| Layer        | Technology                                     |
| ------------ | ---------------------------------------------- |
| Framework    | React 18 + TypeScript                          |
| Build        | Vite 5 (SWC plugin)                            |
| Styling      | Tailwind CSS 3 + shadcn/ui + CSS custom props  |
| Routing      | react-router-dom 6 (BrowserRouter)             |
| Icons        | lucide-react                                   |
| Auth/Storage | Supabase (email OTP, private bucket, Postgres) |
| Tests        | Vitest + Testing Library (jsdom)               |
| Analytics    | Google Analytics 4 (gtag.js, ID: G-QTLPC7Z0BL) |
| Font         | Radley (Google Fonts, loaded in index.html)    |
| Package mgr  | npm                                            |
| Deploy       | GitHub Actions → GitHub Pages (custom domain)  |
| Node version | 22 (CI), 24+ works locally                     |

## Local setup

```sh
npm install
cp .env.example .env.local   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev                  # Vite dev server at http://localhost:8080
```

Without Supabase configuration the site runs fine and simply stays in the public state.

## Development commands

| Command                  | Purpose                                              |
| ------------------------ | ---------------------------------------------------- |
| `npm run dev`            | Start local dev server (port 8080)                   |
| `npm run build`          | Production build → `dist/` (cross-platform)          |
| `npm run preview`        | Preview production build locally                     |
| `npm run lint`           | ESLint (flat config)                                 |
| `npm run typecheck`      | TypeScript type checking                             |
| `npm run test`           | Vitest suite                                         |
| `npm run check:build`    | Fail if `dist/` contains protected photos or secrets |
| `npm run verify`         | typecheck + lint + build + check:build + test        |
| `npm run photos:migrate` | Upload `private-photos/` into the private bucket     |
| `npm run photos:verify`  | Re-verify uploaded objects against local originals   |

## Testing and validation

```sh
npm run verify
```

This runs type checking, ESLint, the production build, the build artifact scan and the Vitest suite. Existing ESLint warnings in `src/components/ui/` and `tailwind.config.ts` come from generated code and are acceptable.

Tests in `src/test/` are mocked UI tests (jsdom). Tests in `tests/` run in Node: `buildArtifacts.test.ts` scans `dist/`, and `backendAuthorization.test.ts` exercises a **real** Supabase backend and is skipped unless the `E2E_*` variables are set. Distinguish the two when reporting results.

Also verify affected pages visually with `npm run dev`, in both the public and verified states, on desktop and mobile widths.

## Coding conventions

- **Path aliases:** Use `@/` to reference `src/` (e.g., `@/components/Footer`).
- **Components:** Functional components with arrow functions; default export per file.
- **Styling:** Tailwind utility classes; design tokens via CSS custom properties in `index.css`. Use the `cn()` helper from `@/lib/utils` to merge class names.
- **shadcn/ui components:** Located in `src/components/ui/`. Do not hand-edit these files. Add new components via the shadcn CLI (`npx shadcn-ui@latest add <component>`).
- **Page structure:** Each page is self-contained, renders `<Footer />` at the bottom (hobby sub-pages are an exception — they omit it).
- **Routing:** All routes defined in `App.tsx`. Add new routes above the catch-all `*` route. The legacy `/work*` paths redirect to their `/about*` equivalents.
- **Journal entries:** `src/pages/Journal.tsx` renders from an `entries` array at the top of the file, newest first. Add a new object to publish an entry.
- **Analytics:** Use `@/lib/ga` helpers (`pageview`, `event`) for custom tracking. `ScrollToTop` already tracks page views on route changes. Nothing is sent until the visitor accepts the consent banner, and payloads are scrubbed of identity, credentials and image references.
- **Photographs:** Never place a photograph in `public/`. Originals live in the gitignored `private-photos/<gallery>/` and are uploaded to the private Supabase bucket. Render them with `<ProtectedImage path="<gallery>/<file>" />` (or `FadeInImage` / `FadeInQuote`, which wrap it). Pass `interactive={false}` when the image sits inside a link or button. Add a `<PhotoAccessGate />` to any page that shows photographs.
- **Non-photographic assets:** `favicon.ico` and `social.png` stay in `public/`. Ordinary interface icons come from `lucide-react`.

## UI and styling conventions

- Cream/warm color palette defined as HSL CSS variables; dark mode tokens exist but no toggle is implemented.
- Radley serif is the primary font (loaded globally).
- Max content width: `max-w-4xl` for text pages, `max-w-5xl` for image galleries.
- Fade-in animations via `FadeInImage` and `FadeInQuote` using IntersectionObserver.
- Fixed header with backdrop blur; centered navigation links.

## Environment variables

See [.env.example](.env.example). Browser-safe values are prefixed `VITE_`; everything else is a server-side secret held by Supabase and must never appear in `src/` or in a `VITE_` variable.

| Variable                                                                | Where              | Secret?                    |
| ----------------------------------------------------------------------- | ------------------ | -------------------------- |
| `VITE_SUPABASE_URL`                                                     | Build / browser    | No                         |
| `VITE_SUPABASE_ANON_KEY`                                                | Build / browser    | No                         |
| `SUPABASE_SERVICE_ROLE_KEY`                                             | Edge Function only | **Yes**                    |
| `ALLOWED_ORIGINS`, `PROTECTED_PHOTOS_BUCKET`                            | Edge Function      | No                         |
| `OWNER_NOTIFICATION_EMAIL`, `RESEND_API_KEY`, `NOTIFICATION_FROM_EMAIL` | Edge Function      | **Yes** (optional feature) |

The GA4 measurement ID is hardcoded (frontend analytics; not a secret).

## Deployment

- Push to `main` triggers `.github/workflows/deploy.yml`.
- The workflow runs `npm ci`, type check, tests, `npm run build`, then `npm run check:build` before deploying `dist/` to GitHub Pages. The scan fails the build if a protected photograph or a secret ends up in the output.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are read from repository **variables**.
- Custom domain `dnlvocatio.com` is configured via `CNAME` in `public/`.
- The build copies `index.html` to `404.html` so that GitHub Pages serves the SPA for all routes.

## Security constraints

- No secrets or API keys should be committed. Only `VITE_`-prefixed values may reach the browser.
- Photographs must be authorized server-side on every request. CSS hiding, route guards and local-storage flags are not access control.
- The `protected-photos` bucket must stay private, with no permissive storage policy for `anon` or `authenticated`.
- Access records live in the `private` schema, which is not exposed through PostgREST. The writer RPCs are granted to `service_role` only.
- Authenticated image responses must stay `Cache-Control: private, no-store`.
- External links must use `rel="noopener noreferrer"` with `target="_blank"`.
- Do not add dependencies that execute code at build time without review.

## Known limitations

- Photo access verifies control of an inbox, nothing more. Verified visitors can save or share what they see.
- Photographs from before this change remain in the public Git history and in previous Pages deployments. See [docs/PUBLIC-IMAGE-CLEANUP.md](docs/PUBLIC-IMAGE-CLEANUP.md); merging this branch does **not** remove them.
- The real-backend authorization tests are skipped unless `E2E_*` variables are set.
- Owner notification is disabled until `OWNER_NOTIFICATION_EMAIL` and `RESEND_API_KEY` are configured.
- Supabase's default email sender is test-only; production needs custom SMTP.
- Many shadcn/ui components and npm packages are installed but unused (legacy from Lovable scaffold).
- Dark mode CSS variables are defined but there is no user-facing theme toggle.
- Instagram link on Contact page points to instagram.com root (no profile specified).

## Common development workflows

### Add a new page

1. Create `src/pages/NewPage.tsx`.
2. Add a `<Route>` in `App.tsx` above the catch-all.
3. Add a navigation link in `Header.tsx` if it should appear in the nav.

### Add a new hobby gallery

1. Add images to `private-photos/<hobby>/` and run `npm run photos:migrate`.
2. Add the gallery name to `PROTECTED_GALLERIES` in `supabase/functions/_shared/photoPath.ts`.
3. Create `src/pages/hobbies/HobbyName.tsx` using `FadeInImage` with `path="<hobby>/<file>"`, plus a `<PhotoAccessGate />`.
4. Add a route in `App.tsx`.
5. Add a card link in `src/pages/Life.tsx`.

### Add a shadcn/ui component

```sh
npx shadcn-ui@latest add <component-name>
```

## Rules for AI agents

- **Read this file and `.github/copilot-instructions.md` before beginning substantial work.**
- Do not add new dependencies without explicit user approval.
- Do not refactor working code unless the change is directly requested or fixes a verified issue.
- Do not modify files in `src/components/ui/` by hand.
- Keep pages simple and self-contained; avoid unnecessary abstractions.
- Validate changes with type checking (`npx tsc --noEmit`) and build (`npx vite build`).
- Do not expose secrets, tokens, or credentials in any file.
- Distinguish verified facts from assumptions.

## Documentation maintenance

Treat repository instruction and context files (`AGENTS.md`, `.github/copilot-instructions.md`) as maintained project documentation. Whenever a change makes information in these files inaccurate, incomplete, outdated, or misleading, update the relevant file as part of the same change. This includes changes to architecture, directories, commands, dependencies, environment variables, deployment, conventions, workflows, external services, and important project behavior.

- Confirm that documented commands and paths still match the repository.
- Update only the source that owns the information.
- Avoid duplicating instructions across files.
- Remove or correct stale information when discovered.
- Never record secrets, tokens, passwords, or private keys.
- Keep documentation concise enough that agents can realistically read and follow it.
