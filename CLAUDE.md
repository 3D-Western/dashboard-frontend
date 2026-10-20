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

## Training (admin editor)

- Routes under `/admin/training`: trainings list, `equipment`, `import`, and per training `[id]` (overview and versions), `draft`, `questions`, `settings`, `report`. Components are in `src/components/TrainingAdmin/`. Needs `training:author` to open anything; publishing, corrections and re-scoring also need `training:publish` (`useTrainingPermissions`). The sidebar and admin dashboard show it for either permission.
- API contract: `docs/plans/training-v1.md`, "Authoring API". Client: `src/api/client/training-admin.ts` (paths in `trainingAdminPaths`). Server problems come as `error.details.errors[]` (`path`, `message`, optional `line`/`column`): `src/lib/training-admin-errors.ts` turns them into messages beside the field, and a publish-check path like `steps[2] "Title"` counts steps from 1.
- Form rules mirror the server's (`training-settings-form.ts`, `training-step-form.ts`, `training-question-form.ts`), so most mistakes are caught before a request; the server stays the judge.
- Video upload (`src/lib/video-upload.ts`): presigned PUT with `XMLHttpRequest` for progress; `Content-Length` and `Host` from the signed headers are left to the browser. The bucket CORS must allow `PUT` from the dashboard origin.
- Tests mock `@/api/client/training-admin` (use `renderInTraining` from `test/utils/renderTrainingAdmin.tsx`); there are no MSW handlers for these endpoints because the backend serves them.

## Legacy docs: verify before trusting

`AGENTS.md`, `README.md`, `docs/FEATURES.md`, `docs/ARCHITECTURE.md` and `.env.example` came over from the old repo and are partly **stale** (Next 15, npm/Node 20, invite codes, routes that no longer exist). `docs/LAUNCH_SCOPE.md` and `docs/IAM.md` are the most accurate. Prefer the code, and fix a stale doc when you touch its area.
