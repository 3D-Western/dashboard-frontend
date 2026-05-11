# AGENTS.md

This file provides guidance AI when working with code in this repository.

## Project Overview

A Next.js 16 dashboard application for managing 3D printing services. Built with App Router, React Server Components, shadcn/ui, TanStack Table, and comprehensive testing infrastructure using Vitest and Playwright.

### Note

- Do not create example code unless specifically requested.
- Do not create a readme file unless specifically requested.

## Development Commands

```bash
# Development
npm run dev              # Start dev server with Turbopack
npm run build            # Build for production
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint (auto-fix)
npm run lint:ci          # Run ESLint with zero warnings (CI)
npm run format           # Format all files with Prettier

# Testing - Unit & Integration (Vitest)
npm run test             # Run tests in watch mode
npm run test:run         # Run tests once (CI mode)
npm run test:ui          # Run with visual test runner
npm run test:coverage    # Run with coverage report
npm run test:ci          # Run tests with verbose output for CI

# Testing - E2E (Playwright)
npm run test:e2e         # Run E2E tests (headless)
npm run test:e2e:ui      # Run with UI mode (interactive)
npm run test:e2e:headed  # Run in headed mode (see browser)
npm run test:e2e:debug   # Debug mode (step through tests)
npm run test:e2e:codegen # Generate tests with Codegen

# Run All Tests
npm run test:all         # Run both unit/integration and E2E tests
npm run test:all:ci      # Run all tests in CI mode

# Run a specific test file
npx vitest run src/lib/auth.test.ts
npx playwright test e2e/auth.spec.ts

# Run tests matching a pattern
npx vitest run -t "validates session"
npx playwright test --grep "login"
```

## Architecture

### Route Structure and Authentication

The app uses Next.js 15 App Router with route groups:

**Public Routes:**

- `(home)/` - Landing page
- `login/` - Login page
- `signup/` - Signup page
- `faqs/` - FAQ page

**Protected Routes (require authentication):**

- `(protected)/dashboard/` - User dashboard
- `(protected)/dashboard/orders/` - User orders
- `(protected)/dashboard/settings/` - User settings
- `(protected)/admin/` - Admin panel (admin role required)

**Protected Layout** (`src/app/(protected)/layout.tsx`):

- Runs `validateSession()` on every request (Server Component)
- Redirects to `/login?error=unauthenticated` if no valid session
- Wraps children with `UserProvider` for client-side user access
- Uses `export const dynamic = 'force-dynamic'` to disable static optimization

### Authentication Flow

Server-side validation happens in protected routes:

1. `validateSession()` (from `src/lib/auth.ts`) calls `/api/v1/users/me` endpoint
2. Backend endpoint `/api/v1/users/me` returns current user or null
3. If authenticated, `UserProvider` makes user available via `useUser()` hook in client components
4. If unauthenticated, user is redirected to login

**Key Files:**

- `src/lib/auth.ts` - Server-side `validateSession()` function
- `src/api/client/endpoints.ts` - API endpoint definitions (includes `users.me`)
- `src/providers/user-provider.tsx` - Client-side `UserProvider` and `useUser()` hook
- `src/api/client/session.ts` - `sessionApi` for login, logout, getCurrentSession

### API Architecture

**Client API Layer** (`src/api/client/`):

- `base.ts` - Core `apiRequest()` function with error handling
- `endpoints.ts` - Centralized API endpoint definitions
- `errors.ts` - `ApiError` class with typed error codes
- `session.ts` - `sessionApi` for authentication
- `job.ts` - `jobApi` for print job operations
- `utils.ts` - Helper functions

**Mock Server** (`src/api/mocks/`):

- Uses MSW (Mock Service Worker) for development without backend
- Enable by setting `MOCK_ENABLED=true` in `.env`
- `index.ts` - Exports `mockServer` with all handlers
- `session-handlers.ts` - Mock authentication endpoints
- `print-job-handlers.ts` - Mock print job CRUD operations
- `database/db.ts` - In-memory database simulation
- `data/` - Mock data for users and print jobs

### Type System

**User Types** (`src/types/user.ts`):

```typescript
UserRole = 'user' | 'admin';
UserExperienceLevel = 'beginner' | 'advanced' | 'no-experience';
```

**Print Job Types** (`src/types/jobs.ts`):

- Uses discriminated unions with `kind` field for type safety
- `PrintJob` - Active jobs with `kind: 'active-print-job'`
- `CompletedPrintJob` - Finished jobs with `kind: 'completed-print-job'`
- `PrintJobStatus` - Union of status strings

### Data Tables

Built with TanStack Table v8 in `src/components/PrintJobsTable/`:

- `useColumns.tsx` - Column definitions with sorting, filtering
- `DataTable.tsx` - Table rendering with selection and pagination
- `DateCell.tsx` - Timezone-aware date formatting using `useLocalTime()` hook
- Features: column sorting, global search, row selection, pagination

### Custom Hooks

- `useUser()` - Access authenticated user (must be inside `UserProvider`)
- `useLocalTime()` - Convert ISO strings to user's local timezone
- `useIsMobile()` - Responsive breakpoint detection

### Component Organization

- `src/components/ui/` - shadcn/ui components (auto-generated via `npx shadcn@latest add <component>`, don't manually edit)
- `src/components/` - Custom application components
  - `AppSidebar/` - Navigation sidebar with user avatar
  - `PageHeader/` - Dynamic page title based on route
  - `DashboardHeader/` - User info and logout button
  - `PrintJobsTable/` - Data table for print jobs
  - `DataTablePagination/` - Reusable pagination controls

## Testing Strategy

### Philosophy

Focus on **user-facing behavior** over implementation details:

- Test what users see and do, not how code works internally
- Avoid redundant tests for shared components
- Don't test framework-level concerns (Next.js handles SSR, routing)
- Keep tests maintainable and resistant to refactoring

### Test Types

**E2E Tests** (Playwright) - Complete user workflows:

- Login → Dashboard → Logout
- Creating and managing print jobs
- Admin workflows
- Navigation and protected routes

**Integration Tests** (Vitest + RTL) - Component + API:

- Form submission with API calls
- Components using context providers
- Multi-step user interactions

**Unit Tests** (Vitest) - Pure functions:

- Utilities (`lib/utils.ts`)
- Custom hooks (`useLocalTime`, `useIsMobile`)
- Data transformations and validation

### Test Organization

```
dashboard-frontend/
├── e2e/                              # E2E tests (Playwright)
│   ├── auth.spec.ts                  # Authentication workflows
│   ├── print-jobs.spec.ts            # Print job workflows
│   └── helpers/                      # E2E test helpers
├── src/
│   ├── __tests__/                    # Integration tests
│   │   └── components/               # Component + API integration
│   ├── components/
│   │   └── *.test.tsx                # Component unit tests
│   ├── hooks/
│   │   └── *.test.tsx                # Hook unit tests
│   └── lib/
│       └── *.test.ts                 # Utility unit tests
└── test/
    └── utils/                        # Shared test utilities
        ├── render.tsx                # Custom render with providers
        ├── mockFactories.ts          # Mock data generators
        └── authHelpers.ts            # Auth test helpers
```

### What NOT to Test

**Avoid these patterns:**

- ❌ Branch-coverage tests (testing line numbers)
- ❌ Duplicate tests for shared components
- ❌ Server-side rendering tests (framework concern)
- ❌ Implementation details (timers, cleanup, internal state)
- ❌ Trivial tests (pluralization, hardcoded text)

### Test Configuration

**Vitest** (`vitest.config.ts`):

- Environment: `happy-dom` for fast DOM simulation
- Coverage: V8 provider with 60-70% thresholds
- Test Files: `src/**/*.{test,spec}.{ts,tsx}`
- MSW mock server auto-started in `vitest.setup.ts`

**Playwright** (`playwright.config.ts`):

- Test Directory: `./e2e`
- Base URL: `http://localhost:3000`
- Browsers: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- Auto-starts dev server with `MOCK_ENABLED=true`

### Quick Decision Guide

```
User workflow (multiple pages/steps)     → E2E Test
Component + API interaction              → Integration Test
Pure function/utility                    → Unit Test
Shared component behavior                → Unit Test (once)
Framework feature (SSR, routing)         → No test needed
Implementation detail (cleanup, timers)  → No test needed
```

**Golden Rule:** "Would a user notice if this broke?" → If YES, write a test. If NO, skip it.

### Writing Tests

**Unit Tests** - Test individual functions/components:

```typescript
import { describe, it, expect } from 'vitest';
import { createMockUser } from '@test/utils/mockFactories';

describe('validateSession', () => {
  it('returns user when authenticated', async () => {
    const mockUser = createMockUser();
    mockAuthenticatedSession(mockUser);
    const result = await validateSession();
    expect(result).toEqual(mockUser);
  });
});
```

**Integration Tests** - Test component + API interactions:

```typescript
import { render, screen, userEvent } from '@test/utils/render';
import { mockSuccessfulLogin } from '@test/utils/authHelpers';

describe('LoginForm Integration', () => {
  it('completes full login flow', async () => {
    mockSuccessfulLogin();
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText(/student id/i), '251000001');
    await user.click(screen.getByRole('button', { name: /login/i }));
    // Assertions...
  });
});
```

**E2E Tests** - Test complete user workflows:

```typescript
import { test, expect } from '@playwright/test';

test('successful login redirects to dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/student id/i).fill('251000001');
  await page.getByRole('button', { name: /^login$/i }).click();
  await expect(page).toHaveURL('/dashboard');
});
```

### Test Utilities

- `render()` from `@test/utils/render` - Wraps components with providers
- `createMockUser()`, `createMockPrintJob()` - Generate test data
- `mockAuthenticatedSession()`, `mockSuccessfulLogin()` - Mock auth state

## Configuration Files

### TypeScript (`tsconfig.json`)

- `strict: true` mode enabled
- Path aliases: `@/*` → `./src/*`, `@test/*` → `./test/*`
- Target: ES2017

### ESLint (`eslint.config.mjs`)

- Extends `next/core-web-vitals` and `next/typescript`
- `@typescript-eslint/no-explicit-any` - Warning (not error)
- Unused variables - Prefix with `_` to suppress warnings

### Prettier (`.prettierrc`)

- Single quotes, semicolons, trailing commas
- 100 character print width
- Includes `prettier-plugin-tailwindcss` for class sorting

### Environment Variables (`.env.example`)

```bash
NEXT_BACKEND_URL=         # Backend API base URL
MOCK_ENABLED=false        # Enable MSW mocking
API_URL=http://localhost:8000
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
REACT_EDITOR=code         # Preferred editor for error overlays
```

## Important Patterns

### Adding New Protected Routes

1. Create page in `src/app/(protected)/your-route/page.tsx`
2. Authentication is automatic via layout
3. Access user via `useUser()` hook in client components

### Adding New API Endpoints

1. Define endpoint in `src/api/client/endpoints.ts`
2. Create API function in appropriate file (e.g., `session.ts`, `job.ts`)
3. Add MSW handler in `src/api/mocks/` if mocking is needed
4. Use `apiRequest()` for consistent error handling

### Working with shadcn/ui

Add components via CLI (don't manually edit):

```bash
npx shadcn@latest add button
npx shadcn@latest add dialog
```

Components are added to `src/components/ui/` with theming and TypeScript types.

### Server vs Client Components

**Server Component (default)** - No `'use client'` directive:

- Zero JavaScript sent to client
- Direct API/database access
- Better SEO

**Client Component** - Add `'use client'` when you need:

- `useState`, `useEffect`, or other React hooks
- Event handlers (onClick, onChange, etc.)
- Browser APIs (localStorage, window, etc.)
- Context providers

### Forms

Use React Hook Form + Zod:

```typescript
const schema = z.object({
  name: z.string().min(1, 'Name is required'),
});

const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { name: '' },
});
```

## Commit Convention

Follows Conventional Commits:

- `feat:` - New features
- `fix:` - Bug fixes
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `docs:` - Documentation only
- `chore:` - Build/tooling changes

Examples:

```bash
feat: add user profile settings page
fix: resolve table sorting issue on mobile
test: add integration tests for authentication flow
```

## Branch Strategy

- `main` - Main branch for PRs
- `feat/*` - Feature branches
- `fix/*` - Bug fix branches
- `test/*` - Testing branches
- `refactor/*` - Refactoring branches

## Key Documentation

Comprehensive guides available in `docs/`:

- `docs/TESTING.md` - Complete testing guide
- `docs/ARCHITECTURE.md` - Detailed architecture documentation
- `docs/DEVELOPMENT.md` - Development workflow and best practices

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **dashboard-frontend** (2758 symbols, 5470 relationships, 203 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/dashboard-frontend/context` | Codebase overview, check index freshness |
| `gitnexus://repo/dashboard-frontend/clusters` | All functional areas |
| `gitnexus://repo/dashboard-frontend/processes` | All execution flows |
| `gitnexus://repo/dashboard-frontend/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
