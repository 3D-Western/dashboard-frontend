# Testing Guide

This guide covers all testing approaches in the 3D Printing Dashboard application, including unit tests, integration tests, and end-to-end (E2E) tests.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Overview](#overview)
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

## Overview

The project uses a comprehensive testing strategy:

- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test how multiple units work together (e.g., auth flow, component + API)
- **E2E Tests**: Test complete user workflows in a real browser

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
├── src/
│   ├── __tests__/                    # Integration tests
│   │   ├── components/               # Component integration tests
│   │   ├── lib/                      # Library integration tests
│   │   └── providers/                # Provider integration tests
│   ├── api/
│   │   └── client/
│   │       └── session.test.ts       # Unit tests for API client
│   └── lib/
│       └── auth.test.ts              # Unit tests for auth
└── test/
    └── utils/                        # Shared test utilities
        ├── render.tsx                # Custom render with providers
        ├── mockFactories.ts          # Mock data generators
        ├── authHelpers.ts            # Auth test helpers
        └── testUtils.ts              # General test utilities
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
├── auth.spec.ts              # Authentication flows
└── example.spec.ts           # Example test file
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
  mockSuccessfulLogout
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

- **Unit tests**: `filename.test.ts` or `filename.spec.ts` (next to source file)
- **Integration tests**: `filename.integration.test.tsx` (in `src/__tests__/`)
- **E2E tests**: `filename.spec.ts` (in `e2e/`)

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

### What to Test

**Unit Tests**: Test individual functions/components

- Pure functions (utilities, helpers)
- API client functions
- Custom hooks
- Individual component rendering

**Integration Tests**: Test component + context/API interactions

- Authentication flows
- Forms with API calls
- Components using providers
- Multi-step user interactions

**E2E Tests**: Test complete user workflows

- Login/logout flows
- Navigation between pages
- Form submissions
- Protected route access
- Session persistence

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
    http.get('/api/me', () => {
      return HttpResponse.json({ error: 'Server error' }, { status: 500 });
    })
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

### General

1. **Write descriptive test names**: Use "should..." or active voice
2. **One assertion per test**: Keep tests focused and clear
3. **Use factories**: Generate test data with `mockFactories`
4. **Clean up**: MSW and component cleanup happen automatically
5. **Avoid implementation details**: Test behavior, not internals

### Unit Tests

- Test pure functions without mocking when possible
- Mock external dependencies (API, localStorage, etc.)
- Test edge cases and error conditions
- Keep tests fast (<100ms each)

### Integration Tests

- Test realistic user scenarios
- Use `renderWithProviders` for components needing context
- Mock API responses with MSW
- Test error states and loading states

### E2E Tests

- Test critical user paths only
- Use data-testid sparingly (prefer accessible queries)
- Wait for elements properly (`await expect(...).toBeVisible()`)
- Keep tests independent (no shared state)
- Use Page Object Model for complex pages

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

1. **Not waiting for async operations**: Always `await` async actions
2. **Testing implementation details**: Focus on user-visible behavior
3. **Overly complex tests**: Break into smaller, focused tests
4. **Hardcoded test data**: Use factories for consistency
5. **Shared test state**: Each test should be independent

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

- [Vitest Documentation](https://vitest.dev)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- [Playwright Documentation](https://playwright.dev)
- [MSW Documentation](https://mswjs.io/docs/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
