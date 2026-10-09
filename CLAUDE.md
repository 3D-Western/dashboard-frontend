# Frontend (Next.js member dashboard)

Part of the monorepo. Read the root `CLAUDE.md` first; it has the workflow, docs and decision rules.

- Stack: Next.js 16, React 19, TypeScript, Tailwind 4 + shadcn, Vitest + MSW, Playwright. pnpm 11, Node 24 (`mise install` at the repo root).
- Commands (run in `frontend/`): `pnpm dev`, `pnpm run lint:ci`, `pnpm exec prettier --check .`, `pnpm run test:run`, `pnpm run test:coverage`, `pnpm run build`.
- Talks only to the backend, through `API_URL`. Browser calls go through the proxy at `src/app/api/[...path]/route.ts`; server-side calls go direct and forward the session cookies.
- Some screens use **mock endpoints that don't exist in the backend**. The list is in `docs/repos/dashboard-frontend.md`. When you build a feature, implement the backend endpoint and remove the mock in the same change.

## Legacy docs: verify before trusting

`AGENTS.md`, `README.md`, `docs/FEATURES.md`, `docs/ARCHITECTURE.md` and `.env.example` came over from the old repo and are partly **stale** (Next 15, npm/Node 20, invite codes, routes that no longer exist). `docs/LAUNCH_SCOPE.md` and `docs/IAM.md` are the most accurate. Prefer the code, and fix a stale doc when you touch its area.
