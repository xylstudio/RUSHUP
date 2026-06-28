# Contributing to Xylem Landscape

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm 9.x or higher
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/xylproject.git
   cd xylproject/xylem-landscape
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Copy environment variables:
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in your actual values.

5. Run the development server:
   ```bash
   npm run dev
   ```

## 💻 Development Workflow

### Branch Naming

- `feat/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/description` - Documentation changes
- `refactor/description` - Code refactoring
- `test/description` - Adding tests

### Making Changes

1. Create a new branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. Make your changes

3. Run tests:
   ```bash
   npm run test
   npm run test:e2e
   ```

4. Check linting:
   ```bash
   npm run lint
   npm run typecheck
   ```

5. Commit your changes (see [Commit Messages](#commit-messages))

6. Push to your fork:
   ```bash
   git push origin feat/your-feature-name
   ```

## 📝 Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define proper types/interfaces
- Avoid `any` type when possible
- Export types that may be used elsewhere

```typescript
// ✅ Good
interface UserProfile {
  id: string
  name: string
  email: string
}

// ❌ Bad
const user: any = { ... }
```

### React Components

- Use functional components with hooks
- Use TypeScript for props
- Export components as default
- Use meaningful component names

```typescript
// ✅ Good
interface ButtonProps {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

export default function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>
}
```

### Styling

- Use Tailwind CSS utility classes
- Follow the design system in `styles/globals.css`
- Use semantic class names for custom CSS

### File Organization

```
app/
  ├── api/              # API routes
  ├── dashboard/        # Protected dashboard routes
  │   ├── admin/
  │   ├── customer/
  │   └── staff/
  └── (public)/         # Public pages

components/
  ├── ui/               # Reusable UI components
  └── [feature]/        # Feature-specific components

lib/
  ├── hooks/            # Custom hooks
  ├── utils/            # Utility functions
  ├── security/         # Security utilities
  └── errors/           # Error handling

tests/
  ├── unit/             # Unit tests
  ├── integration/      # Integration tests
  └── e2e/              # E2E tests
```

## 🧪 Testing

### Unit Tests

Use Vitest for unit tests:

```typescript
import { describe, it, expect } from 'vitest'
import { myFunction } from '@/lib/utils'

describe('myFunction', () => {
  it('should do something', () => {
    expect(myFunction('input')).toBe('expected')
  })
})
```

### E2E Tests

Use Playwright for E2E tests:

```typescript
import { test, expect } from '@playwright/test'

test('should load homepage', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Xylem/)
})
```

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

## 📝 Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
type(scope): subject

body (optional)

footer (optional)
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

### Examples

```
feat(auth): add login page

fix(api): handle null values in payment route

docs(readme): update installation instructions

test(validation): add tests for email validation
```

## 🔄 Pull Request Process

1. **Update Documentation**: If you've changed APIs or added features

2. **Add Tests**: Ensure your code is covered by tests

3. **Run All Checks**:
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   npm run build
   ```

4. **Create Pull Request**:
   - Use a clear title following commit message conventions
   - Describe what you changed and why
   - Link related issues
   - Add screenshots for UI changes

5. **Code Review**:
   - Address review comments
   - Keep discussions focused and professional
   - Be open to feedback

6. **Merge**:
   - PRs require approval from maintainers
   - Squash merge is preferred

## ❓ Questions?

If you have questions, please:
- Check existing issues and discussions
- Open a new issue with the `question` label
- Tag `@maintainers` for urgent matters

## 🙏 Thank You!

Your contributions make this project better for everyone!
