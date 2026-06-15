# 3D Printing Dashboard

A modern, full-featured dashboard application for managing 3D printing services. Built with Next.js 15, React Server Components, and shadcn/ui.

## Features

- **Authentication**: Login with Student ID + password, MFA (OTP), email verification, and password reset
- **Invite-only registration**: Multi-step signup gated by an admin-issued invitation code
- **User dashboard**: Server-side paginated job list with status and search filters
- **3D print job submission**: Three-step presigned-URL upload flow (create → upload STL → complete with checksum)
- **Admin — Job management**: All-user job table with status change and delete actions
- **Admin — Invitation management**: Create, view, and revoke registration invitations
- **Admin — IAM**: Role and group management with per-permission granularity
- **Permission-based access control**: All admin UI gates use `hasPermission()` — no group-name checks
- **Dark / light mode**: Full theme support via `next-themes`
- **Responsive design**: Mobile-friendly layout with Tailwind CSS
- **Data tables**: Sorting, filtering, pagination, and row actions via TanStack Table
- **Mock API**: Development environment with MSW for full offline development (`MOCK_ENABLED=true`)
- **Comprehensive testing**: Unit, integration, and E2E tests with Vitest and Playwright

> See [docs/FEATURES.md](docs/FEATURES.md) for the full feature catalog including not-yet-implemented items.

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router and React Server Components
- **UI Library**: [shadcn/ui](https://ui.shadcn.com/) with Radix UI primitives
- **Styling**: [Tailwind CSS 4.x](https://tailwindcss.com/)
- **State Management**: React Context API
- **Data Tables**: [TanStack Table v8](https://tanstack.com/table/v8)
- **Forms**: [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/) validation
- **Testing**: [Vitest](https://vitest.dev) + [Playwright](https://playwright.dev) + [MSW](https://mswjs.io)
- **TypeScript**: Strict mode enabled

## Quick Start

### Prerequisites

- Node.js 20.x or higher
- npm, yarn, pnpm, or bun

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd dashboard-frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Environment Variables

Create a `.env` file:

```bash
# Backend API URL
API_URL=http://localhost:8000

# Enable mock server (for development without backend)
MOCK_ENABLED=true

# Frontend URL
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

## Development

### Available Scripts

```bash
# Development
npm run dev              # Start dev server with Turbopack
npm run build            # Build for production
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint (auto-fix)
npm run lint:ci          # Run ESLint with zero warnings
npm run format           # Format with Prettier

# Testing
npm run test             # Run unit/integration tests
npm run test:coverage    # Run tests with coverage
npm run test:e2e         # Run E2E tests
npm run test:all         # Run all tests
```

## Project Structure

```
dashboard-frontend/
├── src/
│   ├── api/                  # API client and MSW mocks
│   ├── app/                  # Next.js App Router
│   │   ├── (home)/           # Public landing page
│   │   ├── (auth)/           # Auth pages (login, signup, MFA, password reset, email verify)
│   │   ├── (protected)/      # Session-required routes
│   │   │   ├── dashboard/    # User dashboard, jobs, settings
│   │   │   └── admin/        # Admin sections (jobs, invitations, IAM, users, audit)
│   │   └── faqs/             # Public FAQ page
│   ├── components/           # React components
│   │   └── ui/               # shadcn/ui components (do not edit manually)
│   ├── constants/            # App-wide constants (permissions, faculties, etc.)
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilities and helpers
│   ├── providers/            # React context providers
│   ├── types/                # TypeScript types
│   └── __tests__/            # Integration tests
├── test/                     # Shared test utilities
├── e2e/                      # End-to-end tests (Playwright)
├── docs/                     # Documentation
└── public/                   # Static assets
```

## Documentation

Comprehensive documentation is available in the `docs/` folder:

- **[Feature Reference](docs/FEATURES.md)** - Complete catalog of implemented features and what's not yet built
- **[Architecture Guide](docs/ARCHITECTURE.md)** - Project architecture, routing, and API structure
- **[Development Guide](docs/DEVELOPMENT.md)** - Development workflow and best practices
- **[Testing Guide](docs/TESTING.md)** - Unit, integration, and E2E testing
- **[IAM Guide](docs/IAM.md)** - Permission model, access control utilities, and mock layer

## Key Concepts

### Authentication

The app uses server-side authentication with React Server Components:

- Protected routes automatically validate session on every request
- Server-side `validateSession()` checks authentication status
- Client-side `useUser()` hook provides user context

See [Architecture Guide](docs/ARCHITECTURE.md#authentication) for details.

### Routing

Built with Next.js 15 App Router using route groups:

- **`(home)/`** — Public landing page
- **`(auth)/`** — Login, signup, MFA, email verification, password reset
- **`(protected)/dashboard/`** — User dashboard and job submission (requires authentication)
- **`(protected)/admin/`** — Admin sections, each gated by a specific permission
- **`faqs/`** — Public FAQ page

See [Architecture Guide](docs/ARCHITECTURE.md#routing--layouts) for the full route list.

### Permissions

All access control is permission-based. The backend derives a `permissions` array from the user's group memberships. The frontend uses `hasPermission(user, PERMISSIONS.*)` exclusively — never group-name checks.

See [IAM Guide](docs/IAM.md) for details.

### API Integration

Centralized API client with type-safe requests:

```typescript
import { sessionApi } from '@/api/client/session';

const user = await sessionApi.login(studentId, password);
```

Development mode uses MSW for API mocking. Set `MOCK_ENABLED=true` to enable.

See [Architecture Guide](docs/ARCHITECTURE.md#api-architecture) for details.

### Testing

Comprehensive testing strategy:

- **Unit Tests**: Test individual functions/components (Vitest)
- **Integration Tests**: Test component + API interactions (Vitest + MSW)
- **E2E Tests**: Test complete user workflows (Playwright)

```bash
npm run test              # Unit/integration tests
npm run test:e2e          # E2E tests
npm run test:coverage     # Coverage report
```

See [Testing Guide](docs/TESTING.md) for details.

## Adding Components

### shadcn/ui Components

Add pre-built components with the CLI:

```bash
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
```

Components are added to `src/components/ui/` with full TypeScript support.

### Custom Components

Create components in `src/components/`:

```typescript
// src/components/MyComponent.tsx
export default function MyComponent() {
  return <div>My Component</div>;
}
```

Use Server Components by default. Add `'use client'` only when needed (state, effects, event handlers).

See [Development Guide](docs/DEVELOPMENT.md#working-with-components) for details.

## Contributing

We follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages:

```bash
feat: add new feature
fix: resolve bug
docs: update documentation
test: add tests
refactor: refactor code
```

### Workflow

1. Create a feature branch: `git checkout -b feat/my-feature`
2. Make changes and commit: `git commit -m "feat: add my feature"`
3. Push and create PR: `git push -u origin feat/my-feature`
4. Get reviews and merge

See [Development Guide](docs/DEVELOPMENT.md#git-workflow) for details.

## Deployment

### Build for Production

```bash
npm run build
npm run start
```

The build output will be in `.next/`.

### Environment Variables

Configure these for production:

```bash
API_URL=https://api.your-domain.com
NEXT_PUBLIC_SERVER_URL=https://your-domain.com
MOCK_ENABLED=false
```

## License

[Your License Here]

## Support

For issues and questions:

- Check the [documentation](docs/)
- Search [existing issues](https://github.com/your-repo/issues)
- Create a [new issue](https://github.com/your-repo/issues/new)
