<img src="assets/icon.svg" width="64" height="64" alt="">

# is-a-dev-review-dash

A fast, Material Design 3 (Expressive) web dashboard for reviewing PRs on
[is-a-dev/register](https://github.com/is-a-dev/register) — because the GitHub UI is way too slow.

## The flow

1. **Queue** — open PRs listed oldest → newest with number, title, author, and labels.
2. **Pick a PR** — the review workspace opens with smooth transitions.
3. **Review:**
   - **Overview** — requirement checkboxes parsed from the PR template (unticked ones highlighted),
     the website purpose, and a **live embedded preview** of the site from the template's
     `WEBSITE_PREVIEW` markers.
   - **Files** — full diffs with syntax-colored add/remove lines.
   - **Checks** — CI status, one-click **Approve & run** for workflows GitHub holds for
     first-time contributors, and rerun for failed jobs. Auto-polls while anything is running.
   - **Comments** — full timeline (bot/maintainer badges), reply composer, and editable
     **canned responses** seeded for every `reason:*` label.
   - **Labels** — grouped toggle editor (status / reasons / CI / other) using the repo's real labels.
   - **Actions** — Close (with reason label + canned comment), Approve, and Approve & Merge
     (merge commit or rebase — squash is disabled on the repo).
4. **Auto-advance** — after merging or closing, you land on the next newest PR.

## Auth

GitHub OAuth. After sign-in the app checks you have **push access to is-a-dev/register**
before letting you in. Tokens live in an encrypted, httpOnly cookie — nothing is stored.

## Setup

1. Create a GitHub OAuth App at <https://github.com/settings/developers>:
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback`
2. Copy `.env.local.example` → `.env.local` and fill in `GITHUB_CLIENT_ID`,
   `GITHUB_CLIENT_SECRET`, and `SESSION_SECRET` (`openssl rand -hex 32`).
3. Install & run:

   ```sh
   npm install
   npm run dev
   ```

   (This repo carries a portable Node in `.tools/` if your system has none:
   `export PATH="$PWD/.tools/node/bin:$PATH"`.)

4. Open <http://localhost:3000> and sign in.

### Dev shortcut

With `ALLOW_DEV_TOKEN=1` and `GITHUB_TOKEN=<pat>` (e.g. `gh auth token`) in `.env.local`,
visiting `/api/auth/dev` signs you in without the OAuth dance. **Never enable this in production.**

## Deployment notes

- Any Node 20.9+ host that runs Next.js 16 works. Set `NODE_ENV=production` (secure cookies) and a
  strong `SESSION_SECRET`.
- For a custom domain, update the OAuth App callback URL and set `OAUTH_REDIRECT_URL`.
- `REPO_OWNER`/`REPO_NAME` can be overridden to review a fork.
