# Complete Implementation Guide

## 📋 Overview

This document comprehensive guide for all new features added to the Xylem Landscape project.

### What Was Added

1. **React Query (TanStack Query)** - Data fetching and caching
2. **React Hook Form + Zod** - Form validation
3. **shadcn/ui Components** - UI component library
4. **PWA Support** - Progressive Web App functionality
5. **Database Migrations** - Schema versioning system

---

## 🎣 Part 1: React Query

### Quick Start

```tsx
import { useServices, useHouses } from '@/lib/hooks/useQuery'

function MyComponent() {
  const { data: services = [] } = useServices()
  const { data: houses = [] } = useHouses(userId)
  
  return (
    <div>
      Services: {services.length}
      Houses: {houses.length}
    </div>
  )
}
```

### Available Hooks

- `useServices()` - Fetch all services
- `useService(id)` - Fetch single service
- `useHouses(userId)` - Fetch houses for user
- `useHouse(houseCode)` - Fetch single house
- `usePriceTemplates()` - Fetch price templates
- `useMeasurements(userId)` - Fetch measurement requests
- `useStaff()` - Fetch all staff
- `useBranches()` - Fetch all branches
- `useCurrentUser()` - Fetch current user

### Cache Settings

Default cache: **5 minutes**

Override per-query:
```tsx
const { data } = useServices({
  staleTime: 1000 * 60 * 10 // 10 minutes
})
```

### Full Documentation

📖 Read [docs/REACT_QUERY_GUIDE.md](docs/REACT_QUERY_GUIDE.md)

---

## 📝 Part 2: React Hook Form + Zod

### Quick Start

```tsx
import { useLoginForm } from '@/lib/hooks/useForms'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useLoginForm()

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input
        label="Email"
        error={errors.email?.message}
        {...register('email')}
      />
      <Button type="submit">Login</Button>
    </form>
  )
}
```

### Pre-built Hooks (9 forms)

- `useLoginForm()` - Login validation
- `useRegisterForm()` - Registration with password strength
- `useHouseForm()` - House/property form
- `useServiceBookingForm()` - Service booking
- `useMeasurementRequestForm()` - Measurement request
- `usePaymentForm()` - Payment form
- `useServiceTemplateForm()` - Service creation
- `useAssignJobForm()` - Job assignment

### All Validations Included

- ✅ Email validation
- ✅ Phone number (Thai format)
- ✅ Password strength (8+ chars, uppercase, number, special char)
- ✅ Thai address validation
- ✅ Date validation
- ✅ Number ranges
- ✅ Custom error messages in Thai

### Available Schemas

Location: `lib/schemas/index.ts`

```tsx
import {
  loginSchema,
  registerSchema,
  houseSchema,
  serviceBookingSchema,
  measurementRequestSchema,
  paymentSchema,
  serviceTemplateSchema,
  assignJobSchema,
} from '@/lib/schemas'
```

---

## 🎨 Part 3: shadcn/ui Components

### Style System

All components follow Xylem design system:
- **Colors**: #FDFDFB, #1A1A1A, #2A4532
- **Buttons**: uppercase, tracking-wider, rounded-2xl
- **Inputs**: rounded-2xl, border-[#E5E5DF], focus on brand color
- **Font**: Sarabun

### Components Available

#### Button
```tsx
import { Button } from '@/components/ui/Button'

<Button variant="default" size="default">
  Click me
</Button>

// Variants: default, destructive, outline, secondary, ghost, link
// Sizes: default, sm, lg, icon
```

#### Input
```tsx
import { Input } from '@/components/ui/Input'

<Input
  label="Email"
  error="Invalid email"
  placeholder="test@example.com"
/>
```

#### Select
```tsx
import { Select } from '@/components/ui/Select'

<Select
  label="Choose"
  options={[
    { value: '1', label: 'Option 1' }
  ]}
/>
```

#### Textarea
```tsx
import { Textarea } from '@/components/ui/Textarea'

<Textarea
  label="Notes"
  characterLimit={500}
/>
```

### Examples

See [examples/login-form-example.tsx](examples/login-form-example.tsx)  
See [examples/booking-form-example.tsx](examples/booking-form-example.tsx)

---

## 📱 Part 4: PWA Support

### Features

- ✅ Offline functionality
- ✅ Service worker caching
- ✅ Background sync
- ✅ Install as app
- ✅ Offline page

### Setup

Service worker is automatically registered in production.

Optional: Use install prompt hook
```tsx
import { useInstallPrompt } from '@/lib/hooks/usePWA'

function AppHeader() {
  const { installPrompt, isInstalled, installApp } = useInstallPrompt()

  if (!installPrompt || isInstalled) return null

  return (
    <button onClick={installApp}>
      Install as App
    </button>
  )
}
```

### Caching Strategy

- **Static assets**: Cache-first (after serving from network)
- **API calls**: Network-first (cache fallback)
- **Navigation**: Network-first with offline page fallback

### Offline Page

Automatic offline page: `/offline.html`

---

## 🗄️ Part 5: Database Migrations

### Commands

```bash
# Check status
npm run db:status

# Apply migrations
npm run db:migrate

# Rollback last migration
npm run db:rollback
```

### Create Migration

1. Create `migrations/NNN_description.sql`
2. Create `migrations/NNN_description.rollback.sql`
3. Run `npm run db:migrate`

### Example Migration

```sql
-- migrations/003_add_feature.sql
ALTER TABLE houses ADD COLUMN new_field TEXT;

-- migrations/003_add_feature.rollback.sql
ALTER TABLE houses DROP COLUMN new_field;
```

### Tracking

Migrations are tracked in `_migrations` table automatically.

---

## 🔄 Migration Guide

### From Old Forms to React Hook Form

**Before:**
```tsx
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [errors, setErrors] = useState({})

const handleChange = (e) => {
  if (e.target.name === 'email') setEmail(e.target.value)
}

const handleSubmit = async (e) => {
  e.preventDefault()
  // Manual validation
  // Manual error handling
}
```

**After:**
```tsx
const { register, handleSubmit, formState: { errors } } = useLoginForm()

<Input error={errors.email?.message} {...register('email')} />
<form onSubmit={handleSubmit(onSubmit)}>...</form>
```

### From useState to React Query

**Before:**
```tsx
const [data, setData] = useState([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState('')

useEffect(() => {
  getServices().then(setData)
}, [])
```

**After:**
```tsx
const { data = [], isLoading, error } = useServices()
```

---

## 📚 Files Created (20+)

### Core
- `lib/query-client.tsx` - React Query provider
- `lib/hooks/useQuery.ts` - 9 data-fetching hooks
- `lib/schemas/index.ts` - 8 validation schemas
- `lib/hooks/useForms.ts` - 8 form hooks
- `lib/migrations.ts` - Migration manager

### Components
- `components/ui/Button.tsx`
- `components/ui/Input.tsx`
- `components/ui/Select.tsx`
- `components/ui/Textarea.tsx`

### PWA
- `public/sw.js` - Service worker
- `public/offline.html` - Offline page
- `lib/hooks/usePWA.ts` - PWA hooks

### Migrations
- `migrations/001_create_migrations_table.sql`
- `migrations/001_create_migrations_table.rollback.sql`
- `migrations/002_add_deployment_metadata.sql`
- `migrations/002_add_deployment_metadata.rollback.sql`

### Documentation
- `docs/REACT_QUERY_GUIDE.md` - React Query guide
- `examples/login-form-example.tsx` - Login form example
- `examples/booking-form-example.tsx` - Booking form example

### Updated
- `app/client-providers.tsx` - Added QueryProvider
- `package.json` - Added dependencies

---

## 🚀 Next Steps

### Immediate
1. Run `npm install` to install new dependencies
2. Test in browser: `npm run dev`
3. Check DevTools for React Query DevTools badge

### Short Term (This Week)
1. Migrate one form from old pattern to React Hook Form
2. Replace one data-fetching component with React Query
3. Test PWA on mobile (add to home screen)

### Medium Term (This Month)
1. Migrate all forms to React Hook Form
2. Replace all data-fetching to React Query
3. Set up Supabase migrations workflow

### Long Term (Next Quarter)
1. Complete PWA offline experience
2. Implement background sync for critical workflows
3. Add push notifications

---

## ✅ Feature Checklist

### React Query
- ✅ 9 custom hooks created
- ✅ DevTools enabled in development
- ✅ QueryProvider integrated
- ✅ Types exported for all hooks
- ✅ Cache configuration customizable

### React Hook Form + Zod
- ✅ 8 validation schemas
- ✅ 8 pre-configured form hooks
- ✅ Input error display components
- ✅ Thai error messages
- ✅ Type-safe form handling

### UI Components
- ✅ 4 base components (Button, Input, Select, Textarea)
- ✅ Xylem design system integrated
- ✅ Error states included
- ✅ Label support
- ✅ Helper text support

### PWA
- ✅ Service worker (cache + offline)
- ✅ Offline page
- ✅ Install prompt hook
- ✅ Background sync ready
- ✅ Manifest updated

### Database Migrations
- ✅ Migration manager CLI
- ✅ Tracking table
- ✅ Rollback support
- ✅ Example migrations
- ✅ Automatic version control

---

## 🎓 Learning Resources

### React Query
- Official Docs: https://tanstack.com/query/latest
- DevTools accessible in dev mode (bottom-right corner)

### React Hook Form
- Official Docs: https://react-hook-form.com
- Zod Docs: https://zod.dev

### PWA
- MDN PWA Guide: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps
- Service Worker API: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API

### Supabase Migrations
- Docs: https://supabase.com/docs/migrations/overview

---

## 💬 Questions?

Review the specific guide files:
- React Query: `docs/REACT_QUERY_GUIDE.md`
- Forms: See examples in `examples/`
- PWA: Check `public/sw.js` and `public/offline.html`
- Migrations: Run `npm run db:status` for current state

---

## 🎉 Summary

You now have:
- 🚀 Production-ready data fetching (React Query)
- 📝 Type-safe forms with validation (React Hook Form + Zod)
- 🎨 Consistent UI components (shadcn/ui)
- 📱 Offline functionality (PWA)
- 🗄️ Schema versioning (Database Migrations)

All with comprehensive documentation and examples.

Happy coding! 🚀
