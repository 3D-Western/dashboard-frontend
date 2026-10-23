# Launch scope restriction

For the initial launch, this dashboard intentionally only exposes:

- **User-facing**: Dashboard, My Jobs (which replaced Print History and the New Job picker), the 3D print job form, Settings
- **Admin-facing**: Admin Dashboard, Job Management, User Management (with the Invitations tab and "Add a non-Western member")

Everything else already exists in the codebase and works — it's just hidden from navigation
and blocked from direct access until it's ready for a future launch:

- Equipment Booking (`/dashboard/bookings` and its sub-routes)
- IAM Management (`/admin/iam`)
- Audit Log (`/admin/audit`)
- Equipment Bookings admin (`/admin/bookings`)
- Booking Requests (`/admin/requests`)
- Equipment Management (`/admin/equipment` and `/admin/equipment/[id]/capacity`)
- CNC, Laser Cutting and Water Jet jobs (`/dashboard/jobs/cnc/new`, `/dashboard/jobs/laser-cutting/new`,
  `/dashboard/jobs/water-jet/new`) and the job-type picker (`/dashboard/jobs/new`). These redirect to
  the 3D print form.

Nothing about permissions, data, or the pages themselves changed — this is purely a
nav-visibility + route-access gate, applied to every user regardless of permission level
(including super-admins). See the conversation/PR that introduced this for the reasoning.

## Bringing a feature back

When a held-back feature is ready to ship, reverse both parts for that feature:

### 1. Delete its route guard

Each blocked route has a `layout.tsx` at the root of its subtree containing a `// TEMP:` comment
and nothing but a `redirect(...)` call. Delete the whole file:

| Feature                    | File to delete                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| Equipment Booking          | `src/app/(protected)/dashboard/bookings/layout.tsx`                                         |
| IAM Management             | `src/app/(protected)/admin/iam/layout.tsx`                                                  |
| Audit Log                  | `src/app/(protected)/admin/audit/layout.tsx`                                                |
| Equipment Bookings (admin) | `src/app/(protected)/admin/bookings/layout.tsx`                                             |
| Booking Requests           | `src/app/(protected)/admin/requests/layout.tsx`                                             |
| Equipment Management       | `src/app/(protected)/admin/equipment/layout.tsx`                                            |
| CNC jobs                   | `src/app/(protected)/dashboard/jobs/cnc/layout.tsx`                                         |
| Laser Cutting jobs         | `src/app/(protected)/dashboard/jobs/laser-cutting/layout.tsx`                               |
| Water Jet jobs             | `src/app/(protected)/dashboard/jobs/water-jet/layout.tsx`                                   |
| Job-type picker            | `src/app/(protected)/dashboard/jobs/new/layout.tsx` (delete once any second job type ships) |

### 2. Re-add its nav entry

- **Equipment Booking** — add back to `navigationItems` in `src/components/AppSidebar/index.tsx`:
  ```ts
  {
    title: 'Equipment Booking',
    url: Routes.bookings,
    icon: Calendar, // re-add to the lucide-react import
  },
  ```
- **Admin features** — add back to `adminNavigationItems` in the same file, and re-add the
  matching tile in `src/app/(protected)/admin/page.tsx`. The exact `title`/`url`/`icon`/
  `permission` values and tile JSX for each are in the git history of both files — check out the
  version just before this launch-scope change landed (`git log -p -- src/components/AppSidebar/index.tsx`)
  and copy the relevant block back in, rather than reconstructing from scratch.

- **Other job types** — there's no nav entry to re-add. Delete the job-type guard(s) above, point the
  "Create job" button on My Jobs (`src/app/(protected)/dashboard/jobs/page.tsx`) back at
  `Routes.jobs.newJob`, and add the new statuses/categories to
  `src/app/(protected)/dashboard/jobs/lib/job-stages.ts` if they need their own wording.

### 3. Update tests

`src/components/AppSidebar/index.test.tsx` has a few tests specifically guarding that these
items _don't_ show (search the file for "launch-scope"). Once a feature is re-added, delete or
update the assertion for that specific item, and consider restoring per-item visibility tests
like the ones this change removed (e.g. "shows User Management only when user has users:list").

### 4. Re-check `e2e/booking-specs.ts`

This spec exercises the booking flow through `/dashboard/bookings` and was left failing/skipped
when this restriction was introduced (the route redirected away). Once Equipment Booking's guard
is removed, re-enable and re-verify this spec.

## Print jobs (My Jobs + Quick actions)

Print jobs aren't supported at launch, so their entry points are commented out (each marked
`// TEMP:`). Unlike the features above, the routes are **not** guarded — `/dashboard/jobs` is
still reachable by direct URL.

| File                                        | What's commented out                                              |
| ------------------------------------------- | ----------------------------------------------------------------- |
| `src/components/AppSidebar/index.tsx`       | The "My Jobs" entry in `navigationItems` and the `Printer` import |
| `src/app/(protected)/dashboard/page.tsx`    | The "Quick actions" `DashboardSection` and `QuickActions` import  |
| `src/app/(protected)/dashboard/loading.tsx` | The Quick actions loading skeleton                                |

To restore, uncomment those blocks and swap the "never shows the My Jobs link" test in
`src/components/AppSidebar/index.test.tsx` back to asserting the link is shown.

## Onboarding (backend not implemented yet)

Unlike the features above, onboarding isn't held back by choice — the backend hasn't built
`GET /api/v1/users/me/onboarding` yet (confirmed 2026-09-07: it 500s for every real user).
It's turned off in two places so neither path can reach the broken endpoint:

| File                              | What's disabled                                                       | To restore                                                                                                                      |
| --------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/(protected)/layout.tsx`  | The redirect-into-onboarding check for users who haven't completed it | Flip `ONBOARDING_CHECK_ENABLED` to `true` and delete the `if` wrapper, leaving the two inner lines unconditional                |
| `src/app/(onboarding)/layout.tsx` | Direct navigation to `/onboarding` (now bounces to `/dashboard`)      | Restore the original `validateSession()`-gated body from git history (the commit before this file was replaced with a redirect) |

## Why a route guard instead of just hiding the nav link

An earlier draft of this change only removed the sidebar links. That's not enough on its own:
anyone with a bookmarked URL, browser history, or a stale link would still land on a live,
unfinished feature with no indication it's not actually available yet. The route guards make
"not launched" actually mean not reachable, for every user — not just "not linked from the menu."
