# Testing Guide

This guide covers all testing approaches in the 3D Printing Dashboard application, including unit tests, integration tests, and end-to-end (E2E) tests.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Overview](#overview)
- [Quick Start](#quick-start)
- [What to Test (and What NOT to Test)](#what-to-test-and-what-not-to-test)
- [Testing Stack](#testing-stack)
- [Running Tests](#running-tests)
- [Unit \& Integration Tests (Vitest)](#unit--integration-tests-vitest)
- [End-to-End Tests (Playwright)](#end-to-end-tests-playwright)
- [Test Utilities](#test-utilities)
- [Writing Tests](#writing-tests)
- [Coverage](#coverage)
- [Best Practices](#best-practices)
- [Continuous Integration](#continuous-integration)
- [Resources](#resources)
- [Summary: Quick Decision Guide](#summary-quick-decision-guide)

## Overview

The project uses a **focused testing strategy** that emphasizes user-facing behavior over implementation details:

- **Unit Tests**: Test pure functions, utilities, and hooks in isolation
- **Integration Tests**: Test component + API interactions and multi-step flows
- **E2E Tests**: Test complete user workflows in a real browser

**Testing Philosophy:**

- Focus on what users see and do, not how code is implemented
- Avoid redundant tests for shared components
- Don't test framework-level concerns (Next.js handles SSR, routing, etc.)
- Keep tests maintainable and resistant to refactoring

## Quick Start

```bash
# Run all tests in watch mode
npm run test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run all tests (unit + E2E)
npm run test:all
```

## What to Test (and What NOT to Test)

### ✅ DO Write These Tests

#### 1. **E2E Tests for Critical User Paths**

Test complete workflows that users actually perform:

- ✅ Login → Dashboard → Logout
- ✅ Create new print job with file upload
- ✅ Admin managing print jobs
- ✅ Navigation between protected routes

**Example:**

```typescript
test('user can create and submit print job', async ({ page }) => {
  await loginAsUser(page);
  await page.goto('/dashboard/orders/print/new');
  await page.getByLabel(/print name/i).fill('My Print');
  // ... complete the workflow
  await expect(page).toHaveURL('/dashboard');
});
```

#### 2. **Integration Tests for Component + API Flows**

Test components that interact with APIs or complex state:

- ✅ Login form with authentication
- ✅ Print job forms with submission
- ✅ Data tables with filtering/sorting
- ✅ Components using context providers

**Example:**

```typescript
it('submits login form and redirects', async () => {
  mockSuccessfulLogin();
  render(<LoginForm />);

  await user.type(screen.getByLabelText(/student id/i), '251000001');
  await user.click(screen.getByRole('button', { name: /login/i }));

  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard'));
});
```

#### 3. **Unit Tests for Pure Functions and Utilities**

Test logic without UI or API dependencies:

- ✅ Utility functions (`lib/utils.ts`)
- ✅ Custom hooks (`useLocalTime`, `useIsMobile`)
- ✅ Data transformations
- ✅ Validation functions

**Example:**

```typescript
it('formats date to local timezone', () => {
  const result = formatToLocalTime('2024-01-01T00:00:00Z');
  expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
});
```

---

### ❌ DON'T Write These Tests

#### 1. **Branch Coverage Tests (Testing Line Numbers)**

**Why:** Breaks on every refactor, tests implementation not behavior

```typescript
// ❌ BAD - Testing line numbers
it('handles generic non-ApiError in onSubmit (line 137)', async () => {
  // This test will break when code is refactored
});

// ✅ GOOD - Testing behavior
it('shows error message when login fails', async () => {
  // Tests what users see, not implementation
});
```

#### 2. **Duplicate Tests for Shared Components**

**Why:** If a component is used in 4 places, test it once, not 4 times

```typescript
// ❌ BAD - Testing dropzone 4 times
// NewPrintForm.dropzone.test.tsx
// LaserCuttingOrderForm.dropzone.test.tsx
// CNCOrderForm.dropzone.test.tsx
// WaterJetOrderForm.dropzone.test.tsx

// ✅ GOOD - Test shared component once
// Dropzone.test.tsx (tests the component)
// E2E tests verify file upload works in real forms
```

#### 3. **Server-Side Rendering (SSR) Tests**

**Why:** Next.js handles SSR correctly, this is a framework concern

```typescript
// ❌ BAD - Testing framework behavior
it('handles missing window during SSR', () => {
  vi.stubGlobal('window', undefined);
  renderToString(<Component />);
});

// ✅ GOOD - Use E2E with JavaScript disabled if needed
```

#### 4. **Implementation Detail Tests**

**Why:** Users don't care about internal state, timer cleanup, or memoization

```typescript
// ❌ BAD - Testing implementation
it('cleans up timer when component unmounts during cooldown', () => {
  const { unmount } = render(<Component />);
  unmount();
  // Testing React internals, not user behavior
});

// ✅ GOOD - Test user-visible behavior
it('disables resend button for 60 seconds after clicking', async () => {
  await user.click(screen.getByRole('button', { name: /resend/i }));
  expect(screen.getByRole('button', { name: /resend available in/i })).toBeDisabled();
});
```

#### 5. **Trivial Tests**

**Why:** No value, wastes maintenance time

```typescript
// ❌ BAD - Testing obvious behavior
it('uses correct pluralization for selected rows', () => {
  // "1 row" vs "2 rows" - trivial
});

// ❌ BAD - Testing framework features
it('renders password input with type="password"', () => {
  expect(passwordInput).toHaveAttribute('type', 'password');
});
```

---

### 📋 Decision Guide: Which Test Type?

| Scenario                                             | Test Type              | Why                               |
| ---------------------------------------------------- | ---------------------- | --------------------------------- |
| Complete user workflow (login → create job → logout) | **E2E**                | Tests real browser behavior       |
| Form submission with API call                        | **Integration**        | Tests component + API interaction |
| Utility function (date formatting, validation)       | **Unit**               | Pure function, no dependencies    |
| Shared component behavior (dropzone, dialog)         | **Unit** (once)        | Test component, not every usage   |
| Framework features (SSR, routing)                    | **None**               | Next.js handles this              |
| Internal state, timers, cleanup                      | **None**               | Implementation detail             |
| Error boundary, suspense fallback                    | **E2E or Integration** | User-visible behavior             |

---

## Testing Stack

| Tool                      | Purpose                            | Documentation                                            |
| ------------------------- | ---------------------------------- | -------------------------------------------------------- |
| **Vitest**                | Unit & integration test runner     | [vitest.dev](https://vitest.dev)                         |
| **React Testing Library** | Component testing utilities        | [testing-library.com](https://testing-library.com/react) |
| **Playwright**            | E2E testing framework              | [playwright.dev](https://playwright.dev)                 |
| **MSW**                   | API mocking for all test types     | [mswjs.io](https://mswjs.io)                             |
| **happy-dom**             | Fast DOM implementation for Vitest | [github.com](https://github.com/capricorn86/happy-dom)   |
| **Faker.js**              | Generate realistic test data       | [fakerjs.dev](https://fakerjs.dev)                       |

## Running Tests

### Unit & Integration Tests

```bash
# Run all tests in watch mode
npm run test

# Run tests once (CI mode)
npm run test:run

# Run with UI (visual test runner)
npm run test:ui

# Run with coverage report
npm run test:coverage

# Run tests in watch mode (explicit)
npm run test:watch

# Run tests with verbose output for CI
npm run test:ci
```

### End-to-End Tests

```bash
# Run E2E tests (headless)
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug mode (step through tests)
npm run test:e2e:debug

# View test report
npm run test:e2e:report

# Generate tests with Codegen
npm run test:e2e:codegen
```

### Run All Tests

```bash
# Run both unit/integration and E2E tests
npm run test:all

# Run all tests in CI mode
npm run test:all:ci
```

## Unit & Integration Tests (Vitest)

### Configuration

Tests are configured in `vitest.config.ts`:

- **Environment**: `happy-dom` for fast DOM simulation
- **Setup**: Global configuration in `vitest.setup.ts`
- **Coverage**: V8 provider with 60-70% thresholds
- **Test Files**: `src/**/*.{test,spec}.{ts,tsx}` and `__tests__/**/*`

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

### Example Unit Test

```typescript
// src/lib/auth.test.ts
import { describe, it, expect } from 'vitest';
import { validateSession } from '@/lib/auth';
import { mockAuthenticatedSession } from '@test/utils/authHelpers';
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

### Example Integration Test

```typescript
// src/__tests__/components/LoginForm.integration.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, userEvent } from '@test/utils/render';
import { mockSuccessfulLogin } from '@test/utils/authHelpers';
import LoginForm from '@/components/LoginForm';

describe('LoginForm Integration', () => {
  it('completes full login flow', async () => {
    mockSuccessfulLogin();
    const user = userEvent.setup();

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/student id/i), '251000001');
    await user.type(screen.getByLabelText(/password/i), 'password');
    await user.click(screen.getByRole('button', { name: /login/i }));

    // Assertions...
  });
});
```

## End-to-End Tests (Playwright)

### Configuration

E2E tests are configured in `playwright.config.ts`:

- **Test Directory**: `./e2e`
- **Base URL**: `http://localhost:3000`
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Retries**: 2 retries on CI, 0 locally
- **Auto-start**: Development server with `MOCK_ENABLED=true`

### Test Organization

```
e2e/
├── auth.spec.ts              # Authentication workflows
├── print-jobs.spec.ts        # Print job management workflows
└── helpers/                  # Shared E2E test helpers
```

### Example E2E Test

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('successful login redirects to dashboard', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel(/student id/i).fill('251000001');
  await page.getByLabel(/password/i).fill('password');
  await page.getByRole('button', { name: /^login$/i }).click();

  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByText(/john doe/i)).toBeVisible();
});
```

### Running Specific Tests

```bash
# Run a specific test file
npx playwright test e2e/auth.spec.ts

# Run tests matching a pattern
npx playwright test --grep "login"

# Run a specific browser
npx playwright test --project=chromium
```

## Test Utilities

### Custom Render (`test/utils/render.tsx`)

Wraps components with necessary providers (UserProvider, ThemeProvider):

```typescript
import { render } from '@test/utils/render';
import { createMockUser } from '@test/utils/mockFactories';

const user = createMockUser();
render(<MyComponent />, { user });
```

### Mock Factories (`test/utils/mockFactories.ts`)

Generate realistic test data:

```typescript
import { createMockUser, createMockPrintJob, createMockFile } from '@test/utils/mockFactories';

// Create a user with default values
const user = createMockUser();

// Create an admin user
const admin = createMockUser({ role: 'admin' });

// Create a print job
const job = createMockPrintJob({ status: 'IN_QUEUE' });

// Create multiple print jobs
const jobs = createMockPrintJobs(10);

// Create a file for upload testing
const file = createMockFile('model.stl', 2048, 'model/stl');
```

### Auth Helpers (`test/utils/authHelpers.ts`)

Mock authentication state and actions:

```typescript
import {
  mockAuthenticatedSession,
  mockUnauthenticatedSession,
  mockSuccessfulLogin,
  mockFailedLogin,
  mockSuccessfulLogout,
} from '@test/utils/authHelpers';

// Mock an authenticated session
mockAuthenticatedSession(mockUser);

// Mock successful login
mockSuccessfulLogin();

// Mock login failure
mockFailedLogin();
```

## Writing Tests

### File Naming Conventions

- **Unit tests**: `filename.test.ts` (next to source file)
  - ✅ `src/lib/utils.test.ts`
  - ✅ `src/hooks/useLocalTime.test.tsx`

- **Integration tests**: `filename.integration.test.tsx` (in `src/__tests__/`)
  - ✅ `src/__tests__/components/LoginForm.integration.test.tsx`

- **E2E tests**: `filename.spec.ts` (in `e2e/`)
  - ✅ `e2e/auth.spec.ts`
  - ✅ `e2e/print-jobs.spec.ts`

**Avoid these patterns:**

- ❌ `*.branch-coverage.test.tsx` - Tests implementation details
- ❌ `*.server-coverage.test.tsx` - Tests framework concerns
- ❌ `ComponentName.dropzone.test.tsx` - Duplicate tests for shared components

### Test Structure

Follow the **Arrange-Act-Assert** pattern:

```typescript
it('should do something', async () => {
  // Arrange: Set up test data and mocks
  const mockUser = createMockUser();
  mockAuthenticatedSession(mockUser);

  // Act: Perform the action being tested
  const result = await validateSession();

  // Assert: Verify the outcome
  expect(result).toEqual(mockUser);
});
```

### Choosing the Right Test Type

See the comprehensive guide in [What to Test (and What NOT to Test)](#what-to-test-and-what-not-to-test) section above.

**Quick Reference:**

- **E2E** → Complete user workflows (login to logout)
- **Integration** → Component + API interactions
- **Unit** → Pure functions, utilities, hooks

### Testing Components

```typescript
import { render, screen, userEvent } from '@test/utils/render';
import { createMockUser } from '@test/utils/mockFactories';

describe('MyComponent', () => {
  it('renders with user context', () => {
    const user = createMockUser({ firstName: 'John' });

    render(<MyComponent />, { user });

    expect(screen.getByText(/john/i)).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const user = userEvent.setup();

    render(<MyComponent />);

    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(screen.getByText(/success/i)).toBeInTheDocument();
  });
});
```

### Testing with MSW

All tests use MSW for API mocking. The mock server is automatically started in `vitest.setup.ts`.

```typescript
import { mockServer } from '@/api/mocks';
import { http, HttpResponse } from 'msw';

it('handles API error', async () => {
  // Override default handler for this test
  mockServer.use(
    http.get('/api/v1/users/me', () => {
      return HttpResponse.json({ error: 'Server error' }, { status: 500 });
    }),
  );

  // Test error handling...
});
```

## Coverage

### Running Coverage

```bash
npm run test:coverage
```

Coverage reports are generated in:

- `coverage/` - HTML report (open `coverage/index.html`)
- Console output with summary

### Coverage Thresholds

Current thresholds (defined in `vitest.config.ts`):

```typescript
{
  branches: 60,
  functions: 60,
  lines: 70,
  statements: 70
}
```

### Coverage Exclusions

The following are excluded from coverage:

- `node_modules/`
- `.next/`
- `src/components/ui/**` (shadcn/ui auto-generated)
- `**/*.d.ts` (type definitions)
- `**/*.config.*` (config files)
- `**/mockData` (mock data)
- `src/api/mocks/**` (MSW handlers)
- `e2e/**` (E2E tests)

## Best Practices

### Golden Rules

1. **Test user behavior, not implementation**
   - ✅ "shows error when login fails"
   - ❌ "calls setError with correct parameters"

2. **Avoid redundant tests**
   - Test shared components once, not in every usage
   - E2E tests cover integration; don't duplicate with unit tests

3. **Keep tests maintainable**
   - Tests should survive refactoring
   - Don't reference line numbers or internal variable names
   - Focus on what users see and do

4. **Use the right test type**
   - Complex user workflow → E2E
   - Component + API → Integration
   - Pure function → Unit

### Writing Quality Tests

**DO:**

- ✅ Use descriptive test names (active voice, no "should")
- ✅ Use factories for test data (`createMockUser()`)
- ✅ Test error states and loading states
- ✅ Wait for async operations (`await waitFor(...)`)
- ✅ Use accessible queries (`getByRole`, `getByLabel`)

**DON'T:**

- ❌ Test implementation details (internal state, timers, cleanup)
- ❌ Write branch-coverage or line-specific tests
- ❌ Test framework features (SSR, routing)
- ❌ Duplicate tests for shared components
- ❌ Test trivial behavior (pluralization, hardcoded text)

### Debugging

**Vitest:**

```bash
# Run with UI
npm run test:ui

# Run specific test file
npx vitest run src/lib/auth.test.ts

# Run tests matching pattern
npx vitest run -t "validates session"
```

**Playwright:**

```bash
# Debug mode (pause execution)
npm run test:e2e:debug

# Headed mode (see browser)
npm run test:e2e:headed

# Generate test code
npm run test:e2e:codegen
```

### Common Pitfalls

1. **Testing implementation over behavior**
   - ❌ Testing line numbers, internal state, cleanup functions
   - ✅ Testing what users see and do

2. **Writing redundant tests**
   - ❌ Testing same component 4 times (dropzone in all forms)
   - ✅ Test shared component once, E2E verifies it works

3. **Not waiting for async operations**
   - ❌ `getByText('Loading')` → Fails immediately
   - ✅ `await screen.findByText('Success')` → Waits properly

4. **Hardcoding test data**
   - ❌ `const user = { id: 1, name: 'John' }`
   - ✅ `const user = createMockUser()`

5. **Testing framework concerns**
   - ❌ Testing SSR, routing, Next.js features
   - ✅ Trust the framework, test your code

## Continuous Integration

### CI Configuration

Tests are optimized for CI with:

- Retry logic (1 retry for Vitest, 2 for Playwright)
- JUnit reporters for test results
- Single worker for E2E tests
- Verbose output

### CI Scripts

```bash
# Run unit tests in CI mode
npm run test:ci

# Run E2E tests (automatically uses CI config)
npm run test:e2e

# Run all tests
npm run test:all:ci
```

### Test Results

- **Vitest**: `test-results/junit.xml`
- **Playwright**: `test-results/e2e-junit.xml`
- **Playwright HTML**: `playwright-report/index.html`

## Resources

### Documentation

- [Vitest](https://vitest.dev) - Fast unit test runner
- [React Testing Library](https://testing-library.com/react) - Component testing
- [Playwright](https://playwright.dev) - E2E testing
- [MSW](https://mswjs.io) - API mocking

### Best Practices

- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library) by Kent C. Dodds
- [Testing Implementation Details](https://kentcdodds.com/blog/testing-implementation-details)

### Internal

- `AGENTS.md` - Project architecture and testing strategy
- `test/utils/` - Shared test utilities and helpers

---

## Summary: Quick Decision Guide

**When to write a test:**

```text
┌─────────────────────────────────────────────────────────────┐
│ Question: "Would a user notice if this broke?"              │
│                                                              │
│ ✅ YES  → Write test (E2E or Integration)                   │
│ ❌ NO   → Skip test (implementation detail)                 │
└─────────────────────────────────────────────────────────────┘
```

**Which test type:**

```text
User workflow (multiple pages/steps)     → E2E Test
Component + API interaction              → Integration Test
Pure function/utility                    → Unit Test
Shared component behavior                → Unit Test (once)
Framework feature (SSR, routing)         → No test needed
Implementation detail (cleanup, timers)  → No test needed
```

**Red flags (Don't write these):**

- 🚫 Tests with line numbers in the name
- 🚫 Duplicate tests for same component
- 🚫 Tests for `window` object or SSR
- 🚫 Tests for internal state/timers
- 🚫 Tests that break on refactoring

**Remember:**

> "The more your tests resemble the way your software is used, the more confidence they can give you."
> — Kent C. Dodds
