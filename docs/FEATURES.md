# Feature Reference

This document catalogs all implemented features in the 3D Western Dashboard. Use it for sprint planning, onboarding, and understanding current scope before adding new work.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Authentication \& Identity](#authentication--identity)
- [User Dashboard](#user-dashboard)
- [Job Submission](#job-submission)
- [Admin — Job Management](#admin--job-management)
- [Admin — Invitation Management](#admin--invitation-management)
- [Admin — IAM Management](#admin--iam-management)
- [Admin — User Management](#admin--user-management)
- [Admin — Audit Log](#admin--audit-log)
- [Settings](#settings)
- [Shared UI Patterns](#shared-ui-patterns)
- [Not Yet Implemented](#not-yet-implemented)

---

## Authentication & Identity

### Login

**Route:** `/login`  
**File:** `src/app/(auth)/login/`

- Student ID + password form with Zod validation (9-digit ID in range 251000000–251999999)
- MFA challenge redirect: if backend returns `requiresMfa`, user is sent to `/mfa?challengeId=…`
- Email-not-verified handling: shows inline warning with a resend button (60-second cooldown)
- Rate-limit error: surfaces friendly message when `RATE_LIMIT_EXCEEDED` code is returned
- Session-expired error message when arriving from a protected redirect

### Multi-Factor Authentication (MFA)

**Route:** `/mfa`  
**File:** `src/app/(auth)/mfa/`

- 6-digit OTP input (`InputOTP`) tied to a `challengeId` from the login response
- Resend OTP via `sessionApi.resendMfaOtp()`
- Enables the Verify button when the OTP reaches 6 digits

### Sign Up

**Route:** `/signup`  
**File:** `src/app/(auth)/signup/`

- Multi-step form (two pages: account details → profile details)
- Fields: Student ID, UWO email (`*@uwo.ca`), password, invite code, first/last name, experience level, faculty, public profile toggle
- Password requirements: min 8 chars, uppercase, lowercase, digit
- Invite-code requirement — registration is gated by a valid invitation
- On success, redirects to `/check-email`

### Email Verification

**Route:** `/verify-email`  
**File:** `src/app/(auth)/verify-email/`

- Handles the token link clicked from the verification email
- Calls `sessionApi.verifyEmail(token)` and shows a success or error state

**Route:** `/check-email`  
**File:** `src/app/(auth)/check-email/`

- Static confirmation page shown immediately after signup

### Password Reset

**Routes:** `/forgot-password` → `/reset-password`  
**Files:** `src/app/(auth)/forgot-password/`, `src/app/(auth)/reset-password/`

- Forgot-password form: accepts Student ID, calls `passwordResetApi.requestReset()`
- Reset-password form: validates new password + confirmation, enforces same strength rules as signup (min 10 chars)
- Token is read from URL search params

---

## User Dashboard

### Dashboard Home

**Route:** `/dashboard`  
**File:** `src/app/(protected)/dashboard/page.tsx`

- Landing page for authenticated users
- Wraps the entire protected area with `UserProvider`; all child client components can call `useUser()`

### My Jobs

**Route:** `/dashboard/jobs`  
**File:** `src/app/(protected)/dashboard/jobs/page.tsx`

- Server-side paginated table of the current user's jobs
- URL-driven filters: `status`, `search`, `page`, `pageSize`
- Uses `userApi.getCurrentUserJobs()`
- Shared `PrintJobsTable` component in user mode (no admin actions)

### FAQs

**Route:** `/faqs`  
**File:** `src/app/faqs/`

- Public FAQ page, no authentication required

---

## Job Submission

### New Job Hub

**Route:** `/dashboard/jobs/new`  
**File:** `src/app/(protected)/dashboard/jobs/new/page.tsx`

- Service picker with four cards: 3D Print (active), CNC, Laser Cutting, Water Jet (all three are disabled/coming-soon)

### 3D Print Job Form

**Route:** `/dashboard/jobs/print/new`  
**File:** `src/app/(protected)/dashboard/jobs/print/new/components/PrintJobForm.tsx`

Three-step upload flow:

1. `jobApi.createJob()` — creates the job record and receives a presigned S3 URL
2. `jobApi.uploadJobFile()` — PUT the STL file directly to the presigned URL
3. `jobApi.completeUpload()` — sends filename, size, content-type, SHA-256 checksum

Form fields: project title, STL file dropzone (`.stl` only), description (200-char limit with live counter), project purpose (select), design intent (radio group).  
`UnsavedChangesDialog` warns before navigation if the form is dirty and not yet submitted.

### CNC / Laser Cutting / Water Jet Forms

**Routes:** `/dashboard/jobs/cnc/new`, `/dashboard/jobs/laser-cutting/new`, `/dashboard/jobs/water-jet/new`

- Placeholder forms — routes exist but forms are stubs; submission not yet wired to API

---

## Admin — Job Management

**Route:** `/admin/jobs`  
**File:** `src/app/(protected)/admin/jobs/page.tsx`  
**Permission:** `jobs:list`

- Server-side paginated table of **all** jobs across all users (`jobApi.listAllJobs()`)
- URL-driven filters: `status`, `search`, `page`, `pageSize`
- Shared `PrintJobsTable` in `mode="admin"` — exposes status-change and delete actions not visible to regular users
- `ChangeStatusDialog`: update a job's status
- `DeleteJobDialog`: delete a job with confirmation
- `ActionsCell`: per-row dropdown exposing admin actions

---

## Admin — Invitation Management

**Route:** `/admin/invitations`  
**File:** `src/app/(protected)/admin/invitations/page.tsx`  
**Permission:** `invitations:list`

- Server-side paginated table of invitations
- URL-driven filters: `status` (pending/accepted/revoked/expired), `email`, `page`, `pageSize`
- **Create invitation** (permission `invitations:create`): opens `CreateInvitationDialog` — generates a new invite code for an email address
- **Revoke invitation** (permission `invitations:revoke`): `RevokeInvitationDialog` with confirmation
- **View details**: `InvitationInfoDialog` shows full invitation metadata
- Status badge with colour coding: `InvitationStatusBadge`
- Masked invitation code cell with copy-to-clipboard: `InvitationCodeCell`

---

## Admin — IAM Management

**Route:** `/admin/iam`  
**File:** `src/app/(protected)/admin/iam/page.tsx`  
**Permission:** `iam:read`  
**Full reference:** `docs/IAM.md`

IAM is split into two tabs — **Roles** and **Groups**.

### Roles Tab

- Table of all roles (`iamApi.listRoles()`)
- `CreateRoleDialog`: create a new role with a name and description
- `DeactivateRoleDialog`: deactivate a role with confirmation
- `RolePermissionsSheet`: slide-out panel listing all permissions assigned to a role; supports adding/removing individual permissions (requires `iam:write`)
- `RoleStatusBadge`: active/inactive colour badge

### Groups Tab

- Table of all groups (`iamApi.listGroups()`)
- `CreateGroupDialog`: create a new group
- `DeactivateGroupDialog`: deactivate a group with confirmation
- `GroupMembersSheet`: slide-out panel to view and manage group membership
- `GroupRolesSheet`: slide-out panel to view and manage which roles a group inherits
- `DefaultPermissionsCard`: shows the effective permission set of a group
- `IamHelpDialog`: contextual help overlay explaining how IAM works

### Access Control Model

- All UI gates use `hasPermission(user, PERMISSIONS.*)` — never group-name checks
- `ADMIN_SECTION_PERMISSIONS` determines sidebar and layout visibility
- Dangerous permissions are flagged in `PERMISSION_CATALOG` and highlighted in the UI

---

## Admin — User Management

**Route:** `/admin/users`  
**File:** `src/app/(protected)/admin/users/page.tsx`  
**Permission:** `users:list`

- Page scaffold exists; content is a placeholder ("Coming Soon")

---

## Admin — Audit Log

**Route:** `/admin/audit`  
**File:** `src/app/(protected)/admin/audit/page.tsx`  
**Permission:** `audit:read`

- Page scaffold exists; content is a placeholder for future implementation

---

## Settings

**Route:** `/dashboard/settings`  
**File:** `src/app/(protected)/dashboard/settings/settings-content.tsx`  
**Permission:** authenticated user (any)

- **Change password**: current password + new password + confirmation; optional "invalidate all other sessions" checkbox; enforces min 10 chars + complexity rules
- **Experience level**: dropdown to update the user's self-reported skill level

---

## Shared UI Patterns

### Navigation & Layout

- `AppSidebar`: collapsible sidebar with user avatar, navigation items, and admin section gated by permissions
- `DashboardHeader`: top bar with user info and logout button
- `PageHeader` / `PageTitle`: dynamic heading derived from current route
- `ThemeToggle`: light/dark/system theme switcher (`next-themes`)
- `SettingsPopover`: popover accessible from the sidebar with quick settings

### Data Tables (`PrintJobsTable`)

Built on TanStack Table v8. Shared between user jobs view and admin jobs view via `mode` prop.

- Server-side pagination with `DataTablePagination`
- Column sorting
- Global search filter (`SearchFilter`)
- Status filter (`StatusFilter`)
- `PrintJobStatusBadge`: colour-coded status chip
- `DateCell`: displays timestamps in the user's local timezone via `useLocalTime()`
- Admin-only: `ActionsCell` with `ChangeStatusDialog` and `DeleteJobDialog`

### Forms

- All forms use React Hook Form + Zod resolvers
- `FileUploadDropzone`: drag-and-drop or click-to-select for STL files
- `UnsavedChangesDialog`: browser-native-style warning before leaving a dirty form
- `StatusAlert`: contextual success/warning/error banner used in auth forms
- `ColorSelect`: reusable colour picker component

### API Layer

- `apiRequest()` in `src/api/client/base.ts`: centralised fetch wrapper with typed `ApiError`
- Typed error codes (`ErrorCodes`) for consistent client-side error handling
- MSW mock server (`MOCK_ENABLED=true`) covers session, jobs, invitations, IAM, and user endpoints

---

## Not Yet Implemented

| Feature                  | Location                            | Notes                                    |
| ------------------------ | ----------------------------------- | ---------------------------------------- |
| User Management UI       | `/admin/users`                      | Scaffold only; "Coming Soon" placeholder |
| Audit Log UI             | `/admin/audit`                      | Scaffold only; no data table wired       |
| CNC Job submission       | `/dashboard/jobs/cnc/new`           | Form exists, not wired to API            |
| Laser Cutting submission | `/dashboard/jobs/laser-cutting/new` | Form exists, not wired to API            |
| Water Jet submission     | `/dashboard/jobs/water-jet/new`     | Form exists, not wired to API            |
