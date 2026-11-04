# Contributing to is-a.dev Review Dash

Thank you for your interest in contributing to `review-dash`! We welcome contributions from the community.

## Development Setup

### Prerequisites

- Node.js 20 or later
- pnpm 9 or later
- A GitHub OAuth application (for testing authentication) or a GitHub Personal Access Token (for local dev mode)

### Getting Started

1. Fork and clone the repository:
   ```sh
   git clone https://github.com/your-username/review-dash.git
   cd review-dash
   ```

2. Install dependencies:
   ```sh
   pnpm install
   ```

3. Set up environment variables:
   ```sh
   cp .env.local.example .env.local
   ```
   Configure your GitHub OAuth credentials or dev token in `.env.local`.

4. Start the development server:
   ```sh
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Code Standards

- **Type Safety**: All TypeScript code must pass strict type checking without errors (`pnpm typecheck`).
- **Linting**: Code must follow the repository linting rules (`pnpm lint`).
- **Build**: Ensure the production build succeeds before submitting (`pnpm build`).
- **UI & Styling**: Use Material Design 3 (Expressive) components from `@mui/material` via the `sx` prop. Keep component transitions smooth with Framer Motion.
- **Security**: Never expose server-side tokens or secrets to the client. All GitHub API requests from the frontend must go through the `/api/*` proxies.

## Submitting Pull Requests

1. Create a feature branch:
   ```sh
   git checkout -b feature/your-feature-name
   ```
2. Commit your changes with clear, descriptive commit messages.
3. Verify all checks pass:
   ```sh
   pnpm lint
   pnpm typecheck
   pnpm build
   ```
4. Push to your fork and submit a Pull Request to `main`.
