# Frontend (Next.js member dashboard)

Part of the monorepo. Read the root `CLAUDE.md` first; it has the workflow, docs and decision rules.

- Stack: Next.js 16, React 19, TypeScript, Tailwind 4 + shadcn, Vitest + MSW, Playwright. pnpm 11, Node 24 (`mise install` at the repo root).
- Commands (run in `frontend/`): `pnpm dev`, `pnpm run lint:ci`, `pnpm exec prettier --check .`, `pnpm run test:run`, `pnpm run test:coverage`, `pnpm run build`.
- Talks only to the backend, through `API_URL`. Browser calls go through the proxy at `src/app/api/[...path]/route.ts`; server-side calls go direct and forward the session cookies.
- Some screens use **mock endpoints that don't exist in the backend**. The list is in `docs/repos/dashboard-frontend.md`. When you build a feature, implement the backend endpoint and remove the mock in the same change.

## Training (learner UI)

- Routes: `/dashboard/training` (list) and `/dashboard/training/attempt/[id]` (player). Components are in `src/components/Training/`. The agreements gate (`src/components/Agreements/`) is shown by `(protected)/layout.tsx` in place of the dashboard while `GET /training/agreements/pending` is non-empty; it fails open if that call errors.
- API contract: `docs/plans/training-v1.md`, "Learner API". Client: `src/api/client/training.ts`. Plain-language messages for every error code: `training-errors.ts`. The wire name is `addonScope` (not `isAddonScope`).
- `VideoStep.tsx` is our own HTML5 player: it pauses on blur (counted, sent as `focusLossCount`), blocks forward seeking past the furthest watched point or an unanswered checkpoint, and sends a heartbeat every 10 s and on pause/end. The range and seek logic is in `src/lib/video-watch.ts`.
- `Markdown` (`src/components/Markdown`) wraps react-markdown + remark-gfm: no raw HTML, default `urlTransform`, http(s)-only images. Hotspot questions are not v1; they show a notice.
- For a browser walk-through, run `./dev/seed-training-video.sh` and use a throwaway database (`SPRING_MARIADB_DB=...`), not the shared `pipeline_dev`.

## Supervisor sign-off (admin UI)

- Routes: `/admin/signoffs` (queue) and `/admin/signoffs/[id]` (checklist, approve, reject). Components in `src/components/Signoff/`, client in `src/api/client/signoff.ts`, plain-language errors in `signoff-errors.ts`. Visible only with `training:signoff` (sidebar, admin home, and the page itself); that permission is also in `ADMIN_SECTION_PERMISSIONS`.
- Approve is disabled until every checklist item is ticked and sends every key; the server enforces it too. Contract: `docs/plans/training-v1.md`, "Sign-off API".

## Legacy docs: verify before trusting

`AGENTS.md`, `README.md`, `docs/FEATURES.md`, `docs/ARCHITECTURE.md` and `.env.example` came over from the old repo and are partly **stale** (Next 15, npm/Node 20, invite codes, routes that no longer exist). `docs/LAUNCH_SCOPE.md` and `docs/IAM.md` are the most accurate. Prefer the code, and fix a stale doc when you touch its area.
