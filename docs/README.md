# Documentation

Welcome to the 3D Printing Dashboard documentation. This guide will help you navigate the available resources.

## Documentation Structure

### [Feature Reference](FEATURES.md)

Catalog of every implemented feature — routes, permissions, form flows, and what is not yet built.

**Topics covered:**

- Authentication, MFA, email verification, password reset
- User dashboard and job submission flows
- All admin sections (jobs, invitations, IAM, users, audit)
- Shared UI patterns and API layer

**When to read:**

- Before sprint planning to understand current scope
- When onboarding to understand what exists
- Before building a new feature to avoid duplication

### [Testing Guide](TESTING.md)

Comprehensive guide to testing in this project.

**Topics covered:**

- Running unit, integration, and E2E tests
- Test utilities and helpers
- Writing effective tests
- Coverage reporting
- Best practices and common patterns

**When to read:**

- Before writing any tests
- When setting up CI/CD
- When debugging test failures

### [Architecture Guide](ARCHITECTURE.md)

Deep dive into the application architecture and design decisions.

**Topics covered:**

- Project structure and organization
- Routing with App Router
- Authentication flow
- API client architecture
- State management
- Type system and patterns
- Component architecture
- Theming system

**When to read:**

- Before starting development
- When adding new features
- When making architectural decisions
- When integrating with the backend

### [Launch Scope](LAUNCH_SCOPE.md)

What's deliberately hidden/blocked for the initial launch (Equipment Booking, User Management,
IAM Management, Audit Log, and the booking-admin pages), and the exact steps to bring each one
back once it's ready.

**When to read:**

- Before working on any of the held-back features
- When you hit a route that unexpectedly redirects

### [Development Guide](DEVELOPMENT.md)

Practical guide for day-to-day development work.

**Topics covered:**

- Getting started and setup
- Development workflow
- Code style and standards
- Adding features and components
- API integration
- Git workflow and commits
- Common tasks
- Troubleshooting

**When to read:**

- When onboarding to the project
- Before contributing code
- When stuck on common tasks
- Daily development reference

## Quick Navigation

### I want to...

**...understand what is already built**
→ [Feature Reference](FEATURES.md)

**...set up the project**
→ [README.md](../README.md#quick-start) or [Development Guide - Getting Started](DEVELOPMENT.md#getting-started)

**...understand the architecture**
→ [Architecture Guide](ARCHITECTURE.md)

**...write tests**
→ [Testing Guide](TESTING.md)

**...add a new feature**
→ [Development Guide - Adding Features](DEVELOPMENT.md#adding-features)

**...understand authentication**
→ [Architecture Guide - Authentication](ARCHITECTURE.md#authentication)

**...work with the API**
→ [Architecture Guide - API Architecture](ARCHITECTURE.md#api-architecture)

**...add a new component**
→ [Development Guide - Working with Components](DEVELOPMENT.md#working-with-components)

**...follow code style**
→ [Development Guide - Code Style & Standards](DEVELOPMENT.md#code-style--standards)

**...debug an issue**
→ [Development Guide - Troubleshooting](DEVELOPMENT.md#troubleshooting)

**...make a commit**
→ [Development Guide - Git Workflow](DEVELOPMENT.md#git-workflow)

**...bring back a feature hidden for launch (Booking, User Management, IAM, Audit Log, etc.)**
→ [Launch Scope](LAUNCH_SCOPE.md)

## Getting Help

If you can't find what you're looking for:

1. Check the [main README](../README.md)
2. Search through the documentation files
3. Check existing GitHub issues
4. Ask in team chat/Slack
5. Create a new GitHub issue

## Contributing to Documentation

Documentation improvements are always welcome!

**To update documentation:**

1. Edit the relevant `.md` file in `docs/`
2. Follow the existing structure and formatting
3. Keep explanations clear and concise
4. Add code examples where helpful
5. Submit a PR with type `docs:` in commit message

**Documentation principles:**

- Keep it up-to-date with code changes
- Use clear, simple language
- Include practical examples
- Link between related topics
- Don't over-document obvious things
