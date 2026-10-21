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
- Approve is disabled until every checklist item is ticked and sends every key; the server enforces it too. Reject means "not ready in person yet" (the student stays in line, with a fresh request); the optional "must redo the online training" tick lapses them instead. The student's card (`TrainingCard`) shows `signoffFeedback`, the reason. Contract: `docs/plans/training-v1.md`, "Sign-off API".

## Training (admin editor)

- Routes under `/admin/training`: trainings list, `equipment`, `import`, and per training `[id]` (overview and versions), `draft`, `questions`, `settings`, `report`. Components are in `src/components/TrainingAdmin/`. Every read accepts `training:author` or `training:publish`; changes need `training:author`; publishing, corrections and re-scoring need `training:publish` (`useTrainingPermissions`). The sidebar and admin dashboard show it for either permission.
- API contract: `docs/plans/training-v1.md`, "Authoring API". Client: `src/api/client/training-admin.ts` (paths in `trainingAdminPaths`). Server problems come as `error.details.errors[]` (`path`, `message`, optional `line`/`column`): `src/lib/training-admin-errors.ts` turns them into messages beside the field, and a publish-check path like `steps[2] "Title"` counts steps from 1.
- Form rules mirror the server's (`training-settings-form.ts`, `training-step-form.ts`, `training-question-form.ts`), so most mistakes are caught before a request; the server stays the judge.
- Video upload (`src/lib/video-upload.ts`): presigned PUT with `XMLHttpRequest` for progress; `Content-Length` and `Host` from the signed headers are left to the browser. The bucket CORS must allow `PUT` from the dashboard origin. MP4, QuickTime and WebM upload; anything else is refused with a pointer to `scripts/encode-training-video.sh`.
- Video in the step dialog: the chosen file plays locally (blob URL) before and during the upload, a stored video plays from a staff playback URL, both in `VideoScrubber`, where "Add question here" and the timeline markers edit the same checkpoint list as the typed times. Video problems are **warnings, never blocks** (`src/lib/video-warnings.ts`: over 10 minutes, above 1080p, over about 5 Mbps, not MP4). Compression: `VideoUploader` compresses in the browser with Mediabunny (`src/lib/video-compress.ts`: `compressionAdvice` decides required / offered / unneeded, `checkCompressionSupport` asks the browser, `compressVideo` does the work). Settings match `scripts/encode-training-video.sh` (720p max, H.264, 2 Mbps cap, AAC 128k, moov first). It is loaded only by dynamic import after a file is chosen; keep it out of every other bundle and keep `video-compress.ts` free of static `mediabunny` and API-client imports (`videoTypeOf` lives in `video-type.ts` for that reason). After compressing, staff review the result and choose which file to upload; an unsupported browser, a failure, a cancel or a file too big for browser memory (`compressionLimit`: source over 1.5 GB or expected result over 400 MB) never blocks uploading the original, and an MP4 that compression made larger is replaced by the original automatically. The unit tests mock the library; `pnpm run test:browser` (Playwright, `e2e-browser/`; non-blocking CI job `browser` on Chrome) runs the real thing on a generated clip and needs a browser with H.264 (it says loudly when it skips).
- Confirmations say what happens to people: the publish dialog uses the counts in the publish check (`effects`), and recording a correction asks the server for a preview (`POST .../corrections/preview`) before the user confirms.
- Dialogs that edit something guard closing with `useGuardedClose` (built on `UnsavedChangesDialog`'s controlled mode). Someone with only `training:publish` can read everything and publish; `AuthorOnly` switches off the editing controls for them.
- Tests mock `@/api/client/training-admin` (use `renderInTraining` from `test/utils/renderTrainingAdmin.tsx`); there are no MSW handlers for these endpoints because the backend serves them.

## Legacy docs: verify before trusting

`AGENTS.md`, `README.md`, `docs/FEATURES.md`, `docs/ARCHITECTURE.md` and `.env.example` came over from the old repo and are partly **stale** (Next 15, npm/Node 20, invite codes, routes that no longer exist). `docs/LAUNCH_SCOPE.md` and `docs/IAM.md` are the most accurate. Prefer the code, and fix a stale doc when you touch its area.
