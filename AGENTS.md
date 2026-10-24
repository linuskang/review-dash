# is-a-dev-review-dash

Next.js 16 (App Router, Turbopack) + MUI v9 themed as Material Design 3 Expressive. PR review dashboard
for is-a-dev/register maintainers, authed via GitHub OAuth (push access to the repo required).

## Layout

- `src/lib/session.ts` — AES-256-GCM sealed httpOnly cookie session (`SESSION_SECRET` env).
- `src/lib/github.ts` — GitHub API helpers; repo owner/name from `REPO_OWNER`/`REPO_NAME`.
- `src/lib/parse.ts` — parses the is-a.dev PR template (checkboxes, preview link, purpose). Pure/shared.
- `src/lib/canned.ts` — canned response defaults + localStorage persistence.
- `src/app/api/*` — thin proxies to the GitHub API, all wrapped in `withAuth` (`src/lib/api.ts`).
  OAuth flow: `/api/auth/login` → `/api/auth/callback`. `/api/auth/dev` is a PAT shortcut gated
  behind `ALLOW_DEV_TOKEN=1` — never enable in production.
- `src/components/*` — dashboard UI. Theme lives in `theme-registry.tsx` (MD3 palettes +
  custom palette tokens like `surfaceContainer*`, `tonal` Button variant).

## Run

No system Node required — a portable one lives in `.tools/node`:

```sh
export PATH="$PWD/.tools/node/bin:$PATH"
npm run dev   # or: npm run build && npm start
```

Env: copy `.env.local.example` → `.env.local`.

## Test

- `npx tsc --noEmit` and `npm run build` must pass.
- Headless UI smoke test (needs the dev server running and dev-token auth enabled):
  `node .tools/e2e/smoke.js` — screenshots land in the opencode tmp dir.

## Conventions

- MUI only, no other CSS framework; keep the MD3 Expressive look (28px cards, pill buttons,
  tonal surfaces, emphasized easing). Framer Motion for transitions.
- MUI v9: system props (`p`, `mt`, `alignItems`, `bgcolor`, ...) do NOT exist on
  Box/Stack/Typography/Link — always style through `sx`.
- Never call GitHub from the client directly — go through `/api/*` so tokens stay server-side.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
