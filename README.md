# 3D Printing Dashboard

A modern dashboard application for managing 3D printing services at Western University, built with Next.js 16 and shadcn/ui.

## Features

- **Authentication** - Secure login/signup with email verification, MFA, and password reset
- **User Dashboard** - View and manage orders with filtering, sorting, and file uploads
- **Admin Panel** - Manage users, orders, and invitations
- **User Settings** - Change password and manage account preferences
- **Dark Mode** - Full dark/light theme support
- **Responsive Design** - Mobile-friendly interface
- **Mock API** - Development mode with MSW for backend simulation

## Tech Stack

Next.js 16 • React 19 • TypeScript • shadcn/ui • Tailwind CSS 4 • TanStack Table • React Hook Form • Zod • Vitest • Playwright • MSW

## Getting Started

**Requirements:** Node.js 20+

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Environment Variables

```bash
API_URL=http://localhost:8000                  # Backend API URL
MOCK_ENABLED=false                             # Enable mock server for development
NEXT_PUBLIC_SERVER_URL=http://localhost:3000   # Frontend URL
NEXT_BACKEND_URL=                              # Alternative backend URL (optional)
REACT_EDITOR=code                              # Preferred editor for debugging
```

## Scripts

```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Lint and auto-fix
npm run format           # Format code with Prettier
npm run test             # Run unit/integration tests
npm run test:e2e         # Run E2E tests with Playwright
npm run test:coverage    # Generate coverage report
npm run test:all         # Run all tests
```

## Project Structure

```
dashboard-frontend/
├── src/
│   ├── api/                  # API client and mocks
│   ├── app/                  # Next.js App Router
│   │   ├── (home)/           # Landing page
│   │   ├── (auth)/           # Auth pages (login, signup, MFA, forgot password, etc.)
│   │   ├── (protected)/      # Protected routes
│   │   │   ├── dashboard/    # User dashboard, orders, settings
│   │   │   └── admin/        # Admin panel (users, orders, invitations)
│   │   ├── api/              # API routes
│   │   └── faqs/             # FAQs page
│   ├── components/           # React components
│   │   └── ui/               # shadcn/ui components
│   ├── hooks/                # Custom hooks
│   ├── lib/                  # Utilities and helpers
│   ├── providers/            # Context providers
│   ├── types/                # TypeScript types
│   └── __tests__/            # Integration tests
├── test/                     # Test utilities
├── e2e/                      # E2E tests
└── docs/                     # Documentation
```

## Documentation

Comprehensive guides are available in the [`docs/`](docs/) folder:

- **[Documentation Index](docs/README.md)** - Guide to all documentation
- **[Testing Guide](docs/TESTING.md)** - Testing strategies and best practices
- **[Architecture Guide](docs/ARCHITECTURE.md)** - Project architecture and design decisions
- **[Development Guide](docs/DEVELOPMENT.md)** - Development workflow and standards

## Key Features

### Authentication Flow

- Email/password authentication
- Email verification
- Multi-factor authentication (MFA)
- Forgot/reset password flow
- Session-based auth with server components

### User Dashboard

- View and track print orders
- Upload 3D model files
- Filter and sort orders
- Manage account settings
- Change password

### Admin Panel

- User management with role-based access
- Order management and status updates
- Invitation system for new users
- System-wide order tracking

## Adding Components

Use shadcn CLI to add pre-built components:

```bash
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add table
```

Components are added to `src/components/ui/` with full TypeScript support.

## Contributing

Follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages:

```bash
feat: add new feature
fix: resolve bug
docs: update documentation
test: add tests
refactor: refactor code
```

### Workflow

1. Create feature branch: `git checkout -b feat/my-feature`
2. Make changes and test
3. Commit: `git commit -m "feat: add my feature"`
4. Push and create PR

See [Development Guide](docs/DEVELOPMENT.md#git-workflow) for details.

## Deployment

```bash
npm run build
npm run start
```

**Production Environment:**

```bash
API_URL=https://api.your-domain.com
NEXT_PUBLIC_SERVER_URL=https://your-domain.com
MOCK_ENABLED=false
```

## License

[Your License Here]

## Support

- Check the [documentation](docs/)
- Search [existing issues](https://github.com/your-repo/issues)
- Create a [new issue](https://github.com/your-repo/issues/new)
