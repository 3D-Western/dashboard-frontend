# Development Guide

This guide covers the development workflow, coding standards, and best practices for contributing to the 3D Printing Dashboard project.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style \& Standards](#code-style--standards)
- [Adding Features](#adding-features)
- [Working with Components](#working-with-components)
- [API Integration](#api-integration)
- [Git Workflow](#git-workflow)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)
- [Resources](#resources)

## Getting Started

### Prerequisites

- **Node.js**: 20.x or higher
- **Package Manager**: npm, yarn, pnpm, or bun
- **Editor**: VS Code recommended (with TypeScript and ESLint extensions)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd dashboard-frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start development server
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Environment Setup

Create a `.env` file in the root directory:

```bash
# Backend API URL
NEXT_BACKEND_URL=http://localhost:8000
API_URL=http://localhost:8000

# Frontend URL
NEXT_PUBLIC_SERVER_URL=http://localhost:3000

# Enable mock server for development
MOCK_ENABLED=true

# Editor for error overlays
REACT_EDITOR=code
```

### Available Scripts

```bash
# Development
npm run dev              # Start dev server with Turbopack
npm run build            # Build for production
npm run start            # Start production server

# Linting & Formatting
npm run lint             # Run ESLint (fix mode)
npm run lint:ci          # Run ESLint with zero warnings (CI)
npm run format           # Format all files with Prettier

# Testing
npm run test             # Run unit/integration tests (watch)
npm run test:run         # Run tests once
npm run test:coverage    # Run tests with coverage
npm run test:e2e         # Run E2E tests
npm run test:all         # Run all tests
```

## Development Workflow

### 1. Pick a Task

- Check the issue tracker or project board
- Assign yourself to the task
- Understand requirements before starting

### 2. Create a Branch

```bash
# Create and switch to a new branch
git checkout -b feat/your-feature-name

# Branch naming conventions:
# feat/* - New features
# fix/* - Bug fixes
# refactor/* - Code refactoring
# docs/* - Documentation updates
# test/* - Adding/updating tests
# chore/* - Build/tooling changes
```

### 3. Make Changes

- Write code following the style guide
- Add tests for new functionality
- Update documentation if needed
- Run linter and tests locally

### 4. Commit Changes

```bash
# Stage changes
git add .

# Commit with conventional commit format
git commit -m "feat: add user profile settings"
```

See [Git Workflow](#git-workflow) for commit message conventions.

### 5. Push and Create PR

```bash
# Push to remote
git push -u origin feat/your-feature-name

# Create pull request
# - Fill out PR template
# - Request reviews
# - Link related issues
```

### 6. Address Review Feedback

- Make requested changes
- Commit and push updates
- Reply to review comments

### 7. Merge

- Ensure CI passes
- Get required approvals
- Merge via GitHub (squash and merge preferred)

## Code Style & Standards

### TypeScript

- **Strict mode enabled**: All code must pass TypeScript strict checks
- **Explicit types**: Prefer explicit return types for functions
- **Avoid `any`**: Use `unknown` or proper types instead
- **Use type inference**: Let TypeScript infer when obvious

```typescript
// Good
export async function fetchUser(id: number): Promise<User | null> {
  const response = await apiRequest<User>(`/users/${id}`);
  return response.data;
}

// Avoid
export async function fetchUser(id: any): Promise<any> {
  const response: any = await apiRequest(`/users/${id}`);
  return response.data;
}
```

### ESLint Configuration

**Rules:**

- Extends `next/core-web-vitals` and `next/typescript`
- `@typescript-eslint/no-explicit-any`: Warning (not error)
- Unused variables: Prefix with `_` to suppress warnings

```typescript
// Suppress unused variable warning
function MyComponent({ user, _metadata }: Props) {
  return <div>{user.name}</div>;
}
```

**Running ESLint:**

```bash
# Auto-fix issues
npm run lint

# CI mode (zero warnings)
npm run lint:ci
```

### Prettier Configuration

- **Single quotes**: Prefer single quotes over double
- **Semicolons**: Always use semicolons
- **Trailing commas**: Always use trailing commas
- **Print width**: 100 characters
- **Tab width**: 2 spaces

```typescript
// Formatted by Prettier
const user = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com', // Trailing comma
};
```

**Auto-format:**

```bash
npm run format
```

### File Naming Conventions

- **Components**: PascalCase (`LoginForm.tsx`, `UserAvatar.tsx`)
- **Utilities**: camelCase (`formatDate.ts`, `apiRequest.ts`)
- **Types**: camelCase (`user.ts`, `jobs.ts`)
- **Tests**: Match source file with `.test.ts` or `.spec.ts`
- **Styles**: Match component name (`Button.module.css`)

### Import Job

1. External packages (React, Next.js, etc.)
2. Internal packages (`@/components`, `@/lib`, etc.)
3. Relative imports (`./`, `../`)
4. Type imports (if not auto-sorted)

```typescript
// Good
import { useState } from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/useUser';

import { formatDate } from './utils';
```

### Component Structure

```typescript
'use client'; // If client component

import { useState } from 'react';
import { Button } from '@/components/ui/button';

// Types/Interfaces
interface MyComponentProps {
  title: string;
  onSubmit: () => void;
}

// Component
export default function MyComponent({ title, onSubmit }: MyComponentProps) {
  // Hooks
  const [isLoading, setIsLoading] = useState(false);

  // Event handlers
  const handleClick = () => {
    setIsLoading(true);
    onSubmit();
  };

  // Render helpers
  const renderContent = () => {
    if (isLoading) return <Spinner />;
    return <div>{title}</div>;
  };

  // Main render
  return (
    <div>
      {renderContent()}
      <Button onClick={handleClick}>Submit</Button>
    </div>
  );
}
```

## Adding Features

### 1. Adding a New Component

```bash
# If it's a shadcn/ui component, use CLI
npx shadcn@latest add <component-name>

# For custom components, create in src/components/
touch src/components/MyComponent.tsx
```

**Component Template:**

```typescript
import { FC } from 'react';

interface MyComponentProps {
  // Props
}

const MyComponent: FC<MyComponentProps> = ({ ...props }) => {
  return <div>My Component</div>;
};

export default MyComponent;
```

### 2. Adding a New Page

```bash
# Create page in app directory
mkdir -p src/app/my-page
touch src/app/my-page/page.tsx
```

**Page Template:**

```typescript
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Page',
  description: 'Description of my page',
};

export default function MyPage() {
  return <div>My Page Content</div>;
}
```

### 3. Adding a Protected Route

```bash
# Create page inside (protected) group
mkdir -p src/app/(protected)/my-route
touch src/app/(protected)/my-route/page.tsx
```

Authentication is handled automatically by the protected layout.

### 4. Adding a New API Endpoint

**Client-side API function:**

```typescript
// src/api/client/myFeature.ts
import { apiRequest } from './base';
import { API_ENDPOINTS } from './endpoints';

export const myFeatureApi = {
  async getData(): Promise<MyData> {
    const response = await apiRequest<MyData>(API_ENDPOINTS.myFeature.getData);
    return response.data;
  },
};
```

**Add endpoint definition:**

```typescript
// src/api/client/endpoints.ts
export const API_ENDPOINTS = {
  // ... existing endpoints
  myFeature: {
    getData: '/api/my-feature',
  },
} as const;
```

**Mock handler (optional):**

```typescript
// src/api/mocks/my-feature-handlers.ts
import { http, HttpResponse } from 'msw';

export const myFeatureHandlers = [
  http.get('/api/my-feature', () => {
    return HttpResponse.json({ data: [] });
  }),
];
```

### 5. Adding a Custom Hook

```typescript
// src/hooks/useMyHook.ts
import { useState, useEffect } from 'react';

export function useMyHook() {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Hook logic
  }, []);

  return { data };
}
```

## Working with Components

### shadcn/ui Components

**Adding a new component:**

```bash
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
```

**Don't edit** components in `src/components/ui/` manually. They're auto-generated.

**Customizing shadcn/ui:**

- Modify theme in `src/app/globals.css` (CSS variables)
- Wrap components for custom behavior
- Use `className` prop with Tailwind utilities

### Server vs Client Components

**Server Component (default):**

```typescript
// No 'use client' directive
export default async function ServerComponent() {
  const data = await fetchData(); // Direct API call
  return <div>{data}</div>;
}
```

**Client Component:**

```typescript
'use client';

import { useState } from 'react';

export default function ClientComponent() {
  const [count, setCount] = useState(0); // Needs hooks
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

**When to use Client Components:**

- State management (`useState`, `useReducer`)
- Effects (`useEffect`, `useLayoutEffect`)
- Event handlers (`onClick`, `onChange`, etc.)
- Browser APIs (`window`, `localStorage`, etc.)
- Custom hooks that use the above

### Form Handling

Use React Hook Form + Zod for forms:

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
});

export default function MyForm() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '' },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    // Handle form submission
  });

  return (
    <form onSubmit={onSubmit}>
      <input {...form.register('name')} />
      {form.formState.errors.name && <span>{form.formState.errors.name.message}</span>}

      <button type="submit">Submit</button>
    </form>
  );
}
```

## API Integration

### Using the API Client

```typescript
import { sessionApi } from '@/api/client/session';

async function login() {
  try {
    const user = await sessionApi.login(251000001, 'password');
    console.log('Logged in:', user);
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('API Error:', error.message);
    }
  }
}
```

### Error Handling

```typescript
import { ApiError } from '@/api/client/errors';

try {
  await apiRequest('/endpoint');
} catch (error) {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'NETWORK_ERROR':
        // Handle network error
        break;
      case 'UNAUTHORIZED':
        // Handle unauthorized
        break;
      default:
      // Handle other errors
    }
  }
}
```

### Mock vs Real Backend

**Development with mocks:**

```bash
# .env
MOCK_ENABLED=true
```

**Development with real backend:**

```bash
# .env
MOCK_ENABLED=false
NEXT_BACKEND_URL=http://localhost:8000
```

## Git Workflow

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, semicolons, etc.)
- `refactor`: Code refactoring (no feature change)
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Build system or dependencies
- `ci`: CI configuration
- `chore`: Other changes (no src or test modification)

**Examples:**

```bash
feat: add user profile settings page
fix: resolve table sorting issue on mobile
docs: update API integration guide
refactor: simplify authentication logic
test: add tests for login form
chore: update dependencies
```

**Breaking changes:**

```bash
feat!: redesign authentication system

BREAKING CHANGE: Login API endpoint changed from /auth to /login
```

### Branch Strategy

**Main Branches:**

- `main` - Production-ready code
- `develop` - Integration branch (if using)

**Feature Branches:**

- `feat/feature-name` - New features
- `fix/bug-name` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation updates

**Workflow:**

```bash
# Create feature branch from main
git checkout main
git pull origin main
git checkout -b feat/my-feature

# Make changes and commit
git add .
git commit -m "feat: add my feature"

# Push to remote
git push -u origin feat/my-feature

# Create PR targeting main
# After approval and CI pass, merge
```

### Pull Request Guidelines

**PR Title:**

- Follow conventional commit format
- Be descriptive and concise

**PR Description:**

- Explain what and why
- Reference related issues
- Include screenshots for UI changes
- List breaking changes if any

**Before Creating PR:**

- [ ] Code follows style guide
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] No linting errors
- [ ] Branch is up to date with main
- [ ] Commit messages follow convention

## Common Tasks

### Adding a New Table Column

```typescript
// src/components/PrintJobsTable/useColumns.tsx
export function useColumns() {
  return useMemo<ColumnDef<PrintJob>[]>(() => [
    // ... existing columns
    {
      accessorKey: 'newField',
      header: 'New Field',
      cell: ({ row }) => <div>{row.getValue('newField')}</div>,
    },
  ], []);
}
```

### Adding a Sidebar Menu Item

```typescript
// src/components/AppSidebar/index.tsx
const menuItems = [
  // ... existing items
  {
    title: 'New Page',
    url: '/dashboard/new-page',
    icon: IconComponent,
  },
];
```

### Updating Environment Variables

1. Add to `.env.example` (don't commit actual values)
2. Add to `.env` locally
3. Update deployment environment
4. Document in README or relevant docs

### Debugging

**Client-side:**

```typescript
console.log('Debug:', data);
debugger; // Pauses execution in DevTools
```

**Server-side:**

```typescript
console.log('Server:', data); // Logs in terminal
```

**Network requests:**

- Open DevTools → Network tab
- Filter by Fetch/XHR
- Inspect request/response

**React DevTools:**

- Install React DevTools extension
- Inspect component tree and state

## Troubleshooting

### Common Issues

**1. Module not found errors**

```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
```

**2. TypeScript errors after updating dependencies**

```bash
# Restart TS server in VS Code
Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

**3. ESLint not working**

```bash
# Reinstall ESLint extension or restart editor
# Check .eslintrc or eslint.config.mjs for errors
```

**4. Mock server not working**

```bash
# Check MOCK_ENABLED=true in .env
# Restart dev server
npm run dev
```

**5. Tests failing randomly**

```bash
# Clear test cache
npx vitest run --no-cache
```

**6. Port 3000 already in use**

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

### Getting Help

1. Check existing documentation
2. Search GitHub issues
3. Ask in team chat/Slack
4. Create a GitHub issue with:
   - Description of the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (Node version, OS, etc.)

## Best Practices

### Performance

- Use Server Components by default
- Lazy load heavy client components
- Optimize images with `next/image`
- Minimize client-side JavaScript
- Use React.memo for expensive renders

### Security

- Never commit secrets to git
- Validate all user input
- Use environment variables for sensitive data
- Sanitize data before rendering
- Follow OWASP security practices

### Accessibility

- Use semantic HTML
- Add ARIA labels where needed
- Ensure keyboard navigation works
- Test with screen readers
- Maintain color contrast ratios

### Code Quality

- Write self-documenting code
- Add comments for complex logic
- Keep functions small and focused
- Follow DRY principle (Don't Repeat Yourself)
- Write tests for critical paths

### Testing

- Write tests as you code
- Test behavior, not implementation
- Keep tests independent
- Use descriptive test names
- Aim for high coverage on critical code

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Conventional Commits](https://www.conventionalcommits.org/)
