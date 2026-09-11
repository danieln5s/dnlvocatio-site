# Copilot Instructions — dnlvocatio.com

Personal portfolio site (React + Vite + Tailwind + shadcn/ui + TypeScript). Deployed to GitHub Pages at dnlvocatio.com.

Photographs are **not** public assets. They live in a private Supabase Storage bucket and are served by an authenticated Edge Function to visitors who verified an email with a one-time code. See [docs/PHOTO-ACCESS-SETUP.md](../docs/PHOTO-ACCESS-SETUP.md).

## Key locations

- Routes: `src/App.tsx`
- Pages: `src/pages/`
- Shared components: `src/components/`
- UI primitives (shadcn): `src/components/ui/` — do not edit manually
- Design tokens: `src/index.css`
- Utilities: `src/lib/`
- Backend: `supabase/migrations/`, `supabase/functions/photo/`
- Photo originals: `private-photos/` (gitignored)
- Public static assets: `public/` — favicon, social.png, robots.txt, CNAME only

## Validated commands

```sh
npm run dev          # Dev server (port 8080)
npm run typecheck    # TypeScript
npm run lint         # ESLint
npm run build        # Production build (cross-platform)
npm run test         # Vitest
npm run check:build  # Fail if dist/ leaks photos or secrets
npm run verify       # All of the above
```

## Conventions

- Path alias `@/` → `src/`
- Tailwind utilities + `cn()` from `@/lib/utils`
- Functional components, arrow functions, default exports
- All routes in `App.tsx` above the catch-all `*`
- Journal entries live in the `entries` array at the top of `src/pages/Journal.tsx`, newest first
- Photographs: put originals in `private-photos/<gallery>/`, run `npm run photos:migrate`, render with `<ProtectedImage path="<gallery>/<file>" />`. Add `<PhotoAccessGate />` to any page showing photos.

## Constraints

- Never add a photograph to `public/` or reference one by public URL
- Enforce photo authorization server-side; CSS hiding and route guards are not access control
- Only `VITE_`-prefixed values may reach the browser; the service role key never leaves Supabase
- Do not hand-edit `src/components/ui/` files
- Do not add npm dependencies without user approval
- Validate with `npm run verify` before finishing
- Keep external links using `target="_blank"` paired with `rel="noopener noreferrer"`

## Detailed handbook

See [AGENTS.md](../AGENTS.md) for full architecture, workflows, known limitations, and maintenance rules.
