# 3D Printing Dashboard

A modern, full-featured dashboard application for managing 3D printing services. Built with Next.js 15, React Server Components, and shadcn/ui.

## Features

- **User Dashboard**: View and manage print jobs with advanced filtering and sorting
- **Authentication**: Secure user authentication with session management
- **Dark Mode**: Full dark/light theme support
- **Responsive Design**: Mobile-friendly interface built with Tailwind CSS
- **Real-time Updates**: Toast notifications for user actions and system events
- **Data Tables**: Interactive tables with sorting, filtering, and selection powered by TanStack Table
- **Mock API**: Development environment with Mock Service Worker (MSW) for API simulation

## Tech Stack

- **Framework**: [Next.js 15.5.5](https://nextjs.org/) with App Router and React Server Components
- **UI Library**: [shadcn/ui](https://ui.shadcn.com/) (New York style) with Radix UI primitives
- **Styling**: [Tailwind CSS 4.x](https://tailwindcss.com/) with CSS variables for theming
- **State Management**: React Context API for user state
- **Tables**: [TanStack Table v8](https://tanstack.com/table/v8) for data tables
- **Forms**: [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/) validation
- **Icons**: [Lucide React](https://lucide.dev/)
- **Theme**: [next-themes](https://github.com/pacocoursey/next-themes) for dark mode
- **API Mocking**: [Mock Service Worker](https://mswjs.io/) for development
- **TypeScript**: Strict mode enabled

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd dashboard-frontend
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

```bash
# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run ESLint
npm run lint

# Run ESLint with zero warnings (CI mode)
npm run lint:ci
```

## Project Structure

```
dashboard-frontend/
├── src/
│   ├── app/                      # Next.js App Router
│   ├── components/               # React components
│   ├── context/                  # React Context providers
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Utility functions
│   ├── services/                 # Business logic and data fetching
│   └── types/                    # TypeScript type definitions
├── public/                       # Static assets
└── package.json
```

## Key Features

### Authentication

- Server-side authentication using React Server Components
- Protected routes with automatic redirect to login
- Session validation via `/api/me` endpoint
- Logout functionality with session cleanup
- User context available throughout the app via `UserProvider`

### Data Tables

- Built with TanStack Table for performance
- Features:
  - Column sorting (ascending/descending)
  - Global search filtering
  - Row selection
  - Pagination
  - Responsive design
  - Customizable columns

### Theming

- Light and dark mode support
- CSS variables for easy customization
- Persistent theme preference
- Smooth theme transitions

### Mock API (Development)

The project uses Mock Service Worker (MSW) to simulate backend API calls during development:

- Mock handlers intercept network requests
- Returns realistic test data
- Allows frontend development without a backend
- Easy to replace with real API endpoints

## Development Guidelines

### Adding New UI Components

This project uses shadcn/ui components. To add a new component:

```bash
npx shadcn@latest add <component-name>
```

Components will be added to `src/components/ui/`.

### Working with Types

- User types: `src/types/user.ts`
- Print job types: `src/types/jobs.ts`
- Use discriminated unions with `kind` field for type safety

### Custom Hooks

- `useUser()`: Access authenticated user (must be inside `UserProvider`)
- `useLocalTime()`: Handle timezone conversions
- `useToast()`: Display toast notifications

### Path Aliases

The project uses `@/*` path alias mapping to `src/*`:

```typescript
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/UserContext';
```

## API Integration

### Current Status

The app currently uses MSW for API mocking. Mock handlers are defined for:

- User authentication (`/api/me`)
- Print jobs data
- Logout endpoint

### Production Backend

To integrate with a real backend:

1. Update `src/lib/api.ts` with your API base URL
2. Replace MSW handlers with real API endpoints
3. Update `src/lib/auth.ts` with actual authentication logic
4. Configure CORS settings if needed

## Deployment

### Build for Production

```bash
npm run build
```

The build output will be in the `.next` directory.

### Environment Variables

Configure the following environment variables for production:

```env
# Add your environment variables here
# Example:
# NEXT_PUBLIC_API_URL=https://api.your-domain.com
# NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Contributing

This project follows [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for commit messages.

### Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that don't affect the meaning of the code (white-space, formatting, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files

### Examples

```bash
feat(auth): add logout functionality
fix(dashboard): resolve table sorting issue
docs: update README with API integration guide
refactor(components): simplify user avatar logic
```

### Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Commit using conventional commit format
4. Ensure linting passes: `npm run lint:ci`
5. Submit a pull request

### Branch Naming Convention

- `feat/*` - New features
- `fix/*` - Bug fixes
- `refactor/*` - Code refactoring
- `docs/*` - Documentation updates

## Support

For issues and questions:

- Create an issue in the repository
- Contact the development team
