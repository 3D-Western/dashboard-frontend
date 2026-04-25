# IAM & Permissions Guide

This document explains how authorization works in this application. All access control is **permission-based** — code must never check group names (e.g. `super_admins`) directly. Groups are an implementation detail of the backend; what the frontend receives and acts on are **permissions**.

## Table of Contents

- [Core Concept](#core-concept)
- [Permission Catalog](#permission-catalog)
- [Frontend Utilities](#frontend-utilities)
- [Protecting Routes](#protecting-routes)
- [Conditional UI Rendering](#conditional-ui-rendering)
- [Mock Layer](#mock-layer)
- [Adding a New Permission](#adding-a-new-permission)
- [What NOT to Do](#what-not-to-do)

---

## Core Concept

When a user authenticates, the `/api/v1/users/me` endpoint returns their session data:

```ts
{
  user: UserResponse;
  groups: GroupResponse[];   // informational only — do not use for access checks
  permissions: UserPermission[];  // { key: string; scopeKey: string }[] — source of truth for access
  activeJobCount: number;
}
```

The `permissions` array is derived on the backend from the user's group memberships and any directly assigned roles. The frontend stores this array on the `User` object and uses it exclusively for all access decisions.

**Never derive access from `groups`.** Group membership may change, groups may be renamed, and the same permission can be granted through multiple paths. Always check `permissions`.

---

## Permission Catalog

All permission keys are defined in [`src/constants/permissions.ts`](../src/constants/permissions.ts).

```ts
import { PERMISSIONS } from '@/constants/permissions';

PERMISSIONS.USERS_LIST; // 'users:list'
PERMISSIONS.JOBS_UPDATE_STATUS; // 'jobs:update_status'
PERMISSIONS.IAM_READ; // 'iam:read'
// etc.
```

Permission keys follow the pattern `resource:action`. A subset are marked `isDangerous: true` in `PERMISSION_CATALOG` — these are highlighted in the IAM management UI and require extra care before granting.

### Admin Section Permissions

`ADMIN_SECTION_PERMISSIONS` (also in `permissions.ts`) lists the permissions that grant access to the admin section of the app. A user must hold **at least one** of these to see the admin sidebar and access `/admin/*` routes:

```ts
export const ADMIN_SECTION_PERMISSIONS = [
  PERMISSIONS.USERS_LIST,
  PERMISSIONS.JOBS_LIST,
  PERMISSIONS.INVITATIONS_LIST,
  PERMISSIONS.IAM_READ,
  PERMISSIONS.AUDIT_READ,
];
```

---

## Frontend Utilities

Both helpers live in [`src/types/user.ts`](../src/types/user.ts).

### `hasPermission(user, permission)`

Returns `true` if the user's `permissions` array contains the given key.

```ts
import { hasPermission } from '@/types/user';
import { PERMISSIONS } from '@/constants/permissions';

if (hasPermission(user, PERMISSIONS.USERS_DELETE)) {
  // show delete button
}
```

### `hasAnyAdminPermission(user)`

Returns `true` if the user holds at least one permission from `ADMIN_SECTION_PERMISSIONS`. Used to gate the admin layout and the admin sidebar section.

```ts
import { hasAnyAdminPermission } from '@/types/user';

if (hasAnyAdminPermission(user)) {
  // user can access at least one part of the admin area
}
```

---

## Protecting Routes

### Admin layout (`src/app/(protected)/admin/layout.tsx`)

The admin layout uses `hasAnyAdminPermission` to redirect users who have no admin-level permissions:

```ts
if (!hasAnyAdminPermission(currentUser)) {
  redirect('/dashboard?error=unauthorized');
}
```

### Individual admin pages

Each admin page should perform its own permission check for the specific action it exposes — do not rely solely on the layout gate:

```ts
const currentUser = await validateSession();
if (!hasPermission(currentUser, PERMISSIONS.USERS_LIST)) {
  redirect('/dashboard?error=unauthorized');
}
```

---

## Conditional UI Rendering

### Sidebar (`src/components/AppSidebar/index.tsx`)

The admin section is shown only when the user holds at least one non-null permission from `adminNavigationItems`. Individual items are then filtered by their own permission:

```tsx
// Section visibility — requires at least one real admin permission
{
  adminNavigationItems.some(
    (item) => item.permission !== null && hasPermission(user, item.permission),
  ) && (
    <SidebarGroup>
      {
        adminNavigationItems
          .filter((item) => item.permission === null || hasPermission(user, item.permission))
          .map(/* render item */)
      }
    </SidebarGroup>
  );
}
```

Items with `permission: null` (e.g. Admin Dashboard) are always shown **within** the section, but do not count toward section visibility on their own.

### General pattern

```tsx
{
  hasPermission(user, PERMISSIONS.USERS_DELETE) && (
    <Button variant="destructive">Delete User</Button>
  );
}
```

---

## Mock Layer

The MSW mock server simulates the backend permission system. The key file is [`src/api/mocks/utils.ts`](../src/api/mocks/utils.ts).

### `mockPermissionsForGroups(groupKeys)`

Maps mock group keys to a permission set:

| Group          | Permissions                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------------------- |
| `super_admins` | All permissions                                                                                                  |
| `members`      | `jobs:create`, `jobs:read`, `jobs:complete_upload`, `jobs:retry_upload`, `files:read_metadata`, `files:download` |

This is used by the session handler to populate the `permissions` field in `/users/me` responses.

### `mockUserHasPermission(user, permission)`

Used inside mock API handlers to enforce per-endpoint authorization:

```ts
import { mockUserHasPermission } from './utils';
import { PERMISSIONS as PERMISSION_KEYS } from '@/constants/permissions';

if (!mockUserHasPermission(user, PERMISSION_KEYS.USERS_LIST)) {
  return HttpResponse.json(
    generateErrorResponse({ code: 'FORBIDDEN', message: 'Insufficient permissions' }),
    { status: 403 },
  );
}
```

Each handler checks the **specific permission** required for its operation rather than any broad "is admin" check.

---

## Adding a New Permission

1. **Add the key** to `PERMISSIONS` in [`src/constants/permissions.ts`](../src/constants/permissions.ts):

   ```ts
   REPORTS_EXPORT: 'reports:export',
   ```

2. **Add the catalog entry** in `PERMISSION_CATALOG` in the same file:

   ```ts
   {
     key: PERMISSIONS.REPORTS_EXPORT,
     resource: 'reports',
     action: 'export',
     description: 'Export report data',
     isDangerous: true,  // if applicable
   }
   ```

3. **Add the mock handler check** in the relevant handler file using `mockUserHasPermission`.

4. **Use the permission in UI** via `hasPermission(user, PERMISSIONS.REPORTS_EXPORT)`.

5. **If it gates the admin section**, add it to `ADMIN_SECTION_PERMISSIONS`.

---

## What NOT to Do

```ts
// ❌ Never check group names
if (user.groups.some(g => g.groupKey === 'super_admins')) { ... }

// ❌ Never hardcode group strings
if (user.groups.includes('super_admins')) { ... }

// ✅ Always check the specific permission needed
if (hasPermission(user, PERMISSIONS.USERS_DELETE)) { ... }
```

Group membership is an implementation detail that can change at any time through the IAM management interface. Permissions are the stable, auditable contract between the backend and the frontend.
