# Architecture Guide

This document provides an overview of the 3D Printing Dashboard architecture, including routing, authentication, API structure, and key design patterns.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Overview](#overview)
- [Project Structure](#project-structure)
- [Routing \& Layouts](#routing--layouts)
- [Authentication](#authentication)
- [API Architecture](#api-architecture)
- [State Management](#state-management)
- [Type System](#type-system)
- [Component Architecture](#component-architecture)
- [Theming](#theming)
- [Path Aliases](#path-aliases)
- [Performance Considerations](#performance-considerations)
- [Environment Variables](#environment-variables)
- [Best Practices](#best-practices)

## Overview

The dashboard is built with Next.js 15 App Router, leveraging React Server Components for optimal performance and user experience. The architecture follows modern React patterns with clear separation of concerns.

**Key Technologies:**

- Next.js 15 (App Router + React Server Components)
- TypeScript (strict mode)
- shadcn/ui + Radix UI
- TanStack Table
- MSW for API mocking

## Project Structure

```
dashboard-frontend/
├── src/
│   ├── api/                          # API layer
│   │   ├── client/                   # Client-side API functions
│   │   │   ├── base.ts               # Core apiRequest function
│   │   │   ├── endpoints.ts          # API endpoint definitions
│   │   │   ├── errors.ts             # ApiError class
│   │   │   ├── session.ts            # Session API (login, logout)
│   │   │   ├── job.ts                # Print job API
│   │   │   └── utils.ts              # API utilities
│   │   └── mocks/                    # MSW mock server
│   │       ├── index.ts              # Mock server setup
│   │       ├── session-handlers.ts   # Auth endpoint mocks
│   │       ├── print-job-handlers.ts # Print job endpoint mocks
│   │       ├── database/             # In-memory DB simulation
│   │       └── data/                 # Mock data
│   │
│   ├── app/                          # Next.js App Router
│   │   ├── (home)/                   # Public home page
│   │   ├── (protected)/              # Protected routes
│   │   │   ├── layout.tsx            # Protected layout with auth
│   │   │   ├── dashboard/            # User dashboard
│   │   │   └── admin/                # Admin routes
│   │   ├── login/                    # Login page
│   │   ├── signup/                   # Signup page
│   │   ├── api/                      # API routes
│   │   │   └── me/                   # Current session endpoint
│   │   └── layout.tsx                # Root layout
│   │
│   ├── components/                   # React components
│   │   ├── ui/                       # shadcn/ui components
│   │   ├── AppSidebar/               # Navigation sidebar
│   │   ├── PageHeader/               # Dynamic page headers
│   │   ├── DashboardHeader/          # Dashboard header
│   │   └── PrintJobsTable/           # Data table components
│   │
│   ├── context/                      # React Context providers
│   │   └── UserContext.tsx           # Deprecated (use providers/)
│   │
│   ├── providers/                    # React providers
│   │   └── user-provider.tsx         # User context provider
│   │
│   ├── hooks/                        # Custom React hooks
│   │   ├── useUser.ts                # Access authenticated user
│   │   ├── useLocalTime.ts           # Timezone conversions
│   │   └── useIsMobile.ts            # Responsive breakpoints
│   │
│   ├── lib/                          # Utility functions
│   │   ├── auth.ts                   # Authentication logic
│   │   └── utils.ts                  # General utilities (cn, etc.)
│   │
│   ├── types/                        # TypeScript types
│   │   ├── user.ts                   # User types
│   │   └── jobs.ts                   # Print job types
│   │
│   └── __tests__/                    # Integration tests
│
├── test/                             # Test utilities
│   └── utils/                        # Shared test helpers
│
├── e2e/                              # End-to-end tests
│
├── public/                           # Static assets
│
└── Configuration files
```

## Routing & Layouts

### Route Groups

The app uses Next.js route groups for layout organization:

**Public Routes:**

- `(home)/` - Landing page (no authentication required)
- `login/` - Login page
- `signup/` - Signup page
- `faqs/` - FAQ page
- `forgot-password/` - Password reset

**Protected Routes:**

- `(protected)/dashboard/` - User dashboard
- `(protected)/dashboard/print/` - Print jobs
- `(protected)/dashboard/settings/` - User settings
- `(protected)/admin/` - Admin panel (admin role required)

### Protected Layout

File: `src/app/(protected)/layout.tsx`

```typescript
export const dynamic = 'force-dynamic'; // Disable static optimization

export default async function ProtectedLayout({ children }) {
  const user = await validateSession();

  if (!user) {
    redirect('/login?error=unauthenticated');
  }

  return (
    <UserProvider user={user}>
      {/* Layout structure */}
    </UserProvider>
  );
}
```

**Key Features:**

- Runs `validateSession()` on every request (server-side)
- Redirects unauthenticated users to login
- Provides user data to client via `UserProvider`
- Forces dynamic rendering (no static generation)

### Client-Side Navigation

Use Next.js `Link` component for navigation:

```typescript
import Link from 'next/link';

<Link href="/dashboard">Dashboard</Link>
```

## Authentication

### Authentication Flow

```
┌─────────────┐
│ User visits │
│ /dashboard  │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Protected Layout    │
│ (Server Component)  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ validateSession()   │
│ Calls /api/me       │
└──────┬──────────────┘
       │
       ├─────────────┐
       │             │
       ▼             ▼
  ┌────────┐   ┌──────────┐
  │ User   │   │ null     │
  │ object │   │          │
  └────┬───┘   └─────┬────┘
       │             │
       ▼             ▼
  ┌────────────┐ ┌──────────────────────┐
  │ Render     │ │ Redirect to          │
  │ protected  │ │ /login?error=...     │
  │ content    │ │                      │
  └────────────┘ └──────────────────────┘
```

### Server-Side Validation

File: `src/lib/auth.ts`

```typescript
export async function validateSession(): Promise<User | null> {
  try {
    const user = await sessionApi.getCurrentSession();
    return user;
  } catch (error) {
    return null;
  }
}
```

### API Endpoint

File: `src/app/api/me/route.ts`

```typescript
export async function GET() {
  // Check session/cookie
  // Return user or 401
}
```

### Client-Side Access

```typescript
import { useUser } from '@/hooks/useUser';

function MyComponent() {
  const { user, isLoading } = useUser();

  if (isLoading) return <Spinner />;
  if (!user) return null;

  return <div>Hello {user.firstName}</div>;
}
```

## API Architecture

### Client API Layer

All API calls go through the client API layer in `src/api/client/`.

#### Core Request Function

File: `src/api/client/base.ts`

```typescript
export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(/* ... */);
  }

  return response.json();
}
```

**Features:**

- Centralized error handling
- Type-safe responses
- Automatic JSON parsing
- Custom `ApiError` class

#### Endpoint Definitions

File: `src/api/client/endpoints.ts`

```typescript
export const API_ENDPOINTS = {
  session: {
    current: '/api/me',
    login: '/api/auth/login',
    logout: '/api/auth/logout',
  },
  jobs: {
    list: '/api/jobs',
    create: '/api/jobs',
    get: (id: string) => `/api/jobs/${id}`,
  },
} as const;
```

#### API Modules

**Session API** (`src/api/client/session.ts`):

```typescript
export const sessionApi = {
  async getCurrentSession(): Promise<User | null> {
    /* ... */
  },
  async login(studentId: number, password: string): Promise<User> {
    /* ... */
  },
  async logout(): Promise<void> {
    /* ... */
  },
};
```

**Job API** (`src/api/client/job.ts`):

```typescript
export const jobApi = {
  async listJobs(): Promise<PrintJob[]> {
    /* ... */
  },
  async createJob(data: CreateJobData): Promise<PrintJob> {
    /* ... */
  },
  async getJob(id: string): Promise<PrintJob> {
    /* ... */
  },
};
```

### Mock Server (Development)

The project uses MSW (Mock Service Worker) for development without a backend.

**Setup:**

1. Set `MOCK_ENABLED=true` in `.env`
2. Mock server starts automatically in development
3. Handlers defined in `src/api/mocks/`

**Handler Example:**

```typescript
// src/api/mocks/session-handlers.ts
export const sessionHandlers = [
  http.get('/api/me', () => {
    const session = db.getCurrentSession();
    if (!session) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return HttpResponse.json(session.user);
  }),
];
```

**In-Memory Database:**

```typescript
// src/api/mocks/database/db.ts
export const db = {
  users: [...],
  printJobs: [...],
  currentSession: null,
};
```

## State Management

### User State (React Context)

File: `src/providers/user-provider.tsx`

```typescript
const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children, user }) {
  const [currentUser, setCurrentUser] = useState(user);

  return (
    <UserContext.Provider value={{ user: currentUser, ... }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be inside UserProvider');
  return context;
};
```

**Usage:**

```typescript
const { user, isLoading } = useUser();
```

### Form State (React Hook Form + Zod)

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  studentId: z.number().int().min(251000000).max(251999999),
  password: z.string().min(8),
});

function LoginForm() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { studentId: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    // Handle submission
  });

  return <form onSubmit={onSubmit}>...</form>;
}
```

## Type System

### User Types

File: `src/types/user.ts`

```typescript
export type UserRole = 'user' | 'admin';
export type UserExperienceLevel = 'beginner' | 'advanced' | 'no-experience';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  experienceLevel: UserExperienceLevel;
}
```

### Print Job Types (Discriminated Unions)

File: `src/types/jobs.ts`

```typescript
export type PrintJobStatus = 'IN_QUEUE' | 'PRINTING' | 'COMPLETED' | 'FAILED';

// Active jobs
export interface PrintJob {
  kind: 'active-print-job';
  id: string;
  studentId: number;
  name: string;
  description: string;
  status: PrintJobStatus;
  orderPlaced: string;
  stlFile: {
    id: string;
    name: string;
    path: string;
  };
}

// Completed jobs
export interface CompletedPrintJob {
  kind: 'completed-print-job';
  id: string;
  studentId: number;
  name: string;
  completedAt: string;
  // ... other fields
}

export type AnyPrintJob = PrintJob | CompletedPrintJob;
```

**Type Guards:**

```typescript
function isPrintJob(job: AnyPrintJob): job is PrintJob {
  return job.kind === 'active-print-job';
}
```

## Component Architecture

### Component Categories

**1. UI Components** (`src/components/ui/`)

- Auto-generated by shadcn/ui
- Don't manually edit
- Reusable primitives (Button, Input, Dialog, etc.)

**2. Feature Components** (`src/components/`)

- Business logic components
- Composed from UI components
- Examples: LoginForm, PrintJobsTable, AppSidebar

**3. Layout Components**

- Defined in app directory
- Server Components by default
- Handle data fetching and authentication

### Data Tables (TanStack Table)

File: `src/components/PrintJobsTable/`

```
PrintJobsTable/
├── index.tsx              # Main table component
├── DataTable.tsx          # Table rendering logic
├── useColumns.tsx         # Column definitions
├── DateCell.tsx           # Custom cell renderer
└── ...
```

**Column Definition:**

```typescript
export function useColumns() {
  return useMemo<ColumnDef<PrintJob>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <div>{row.getValue('name')}</div>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
    },
  ], []);
}
```

**Features:**

- Column sorting
- Global search filtering
- Row selection
- Pagination
- Responsive design

### Custom Hooks

**useUser** - Access authenticated user

```typescript
const { user, isLoading } = useUser();
```

**useLocalTime** - Timezone conversions

```typescript
const localTime = useLocalTime(isoString);
```

**useIsMobile** - Responsive breakpoints

```typescript
const isMobile = useIsMobile();
```

## Theming

### Theme Provider

File: `src/app/layout.tsx`

```typescript
import { ThemeProvider } from 'next-themes';

export default function RootLayout({ children }) {
  return (
    <html suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### CSS Variables

File: `src/app/globals.css`

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    /* ... */
  }

  .dark {
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    /* ... */
  }
}
```

### Using Theme in Components

```typescript
import { useTheme } from 'next-themes';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle Theme
    </button>
  );
}
```

### shadcn/ui Components

All UI components automatically respect the theme through CSS variables:

```typescript
import { Button } from '@/components/ui/button';

<Button variant="default">Click me</Button>
```

## Path Aliases

Configured in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@test/*": ["./test/*"]
    }
  }
}
```

**Usage:**

```typescript
// Instead of: '../../../components/ui/button'
import { Button } from '@/components/ui/button';

// Instead of: '../../../test/utils/render'
import { render } from '@test/utils/render';
```

## Performance Considerations

### Server Components by Default

All components in the `app/` directory are Server Components unless marked with `'use client'`.

**Benefits:**

- Zero JavaScript sent to client
- Direct database/API access
- Better SEO

**When to use Client Components:**

- Need `useState`, `useEffect`, or other React hooks
- Event handlers (onClick, onChange, etc.)
- Browser APIs (localStorage, window, etc.)
- Context providers

### Dynamic vs Static Rendering

**Static (default):**

```typescript
// Renders at build time
export default async function Page() {
  const data = await fetchData();
  return <div>{data}</div>;
}
```

**Dynamic (opt-in):**

```typescript
export const dynamic = 'force-dynamic';

// Renders on every request
export default async function Page() {
  const session = await validateSession();
  return <div>{session?.name}</div>;
}
```

### Loading States

Use `loading.tsx` for automatic loading UI:

```typescript
// app/dashboard/loading.tsx
export default function Loading() {
  return <Skeleton />;
}
```

## Environment Variables

File: `.env.example`

```bash
# Backend API
NEXT_BACKEND_URL=http://localhost:8000
API_URL=http://localhost:8000

# Frontend URL
NEXT_PUBLIC_SERVER_URL=http://localhost:3000

# Enable MSW mocking
MOCK_ENABLED=false

# Editor for error overlays
REACT_EDITOR=code
```

**Access in code:**

```typescript
// Server-side (any variable)
const apiUrl = process.env.API_URL;

// Client-side (NEXT_PUBLIC_ only)
const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
```

## Best Practices

1. **Use Server Components by default** - Only use Client Components when necessary
2. **Centralize API calls** - All API logic in `src/api/client/`
3. **Type everything** - Leverage TypeScript strict mode
4. **Use discriminated unions** - For type-safe polymorphic data
5. **Prefer composition** - Build complex UIs from simple components
6. **Keep business logic separate** - Don't mix UI and business logic
7. **Use path aliases** - Import with `@/` instead of relative paths
8. **Follow file organization** - Keep related files together
