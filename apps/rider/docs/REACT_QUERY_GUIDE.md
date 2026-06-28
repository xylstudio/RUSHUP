# React Query Integration Guide

## 📚 Table of Contents
- [What is React Query?](#what-is-react-query)
- [Why We Added It](#why-we-added-it)
- [Quick Start](#quick-start)
- [Available Hooks](#available-hooks)
- [Migration Guide](#migration-guide)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## 🎯 What is React Query?

React Query (TanStack Query) is a powerful data-fetching library that provides:
- **Automatic caching** - Data is cached and reused across components
- **Smart refetching** - Automatically refetches stale data
- **Loading & error states** - Built-in state management
- **Request deduplication** - Multiple components using same data = 1 request
- **DevTools** - Visual debugger for queries (in development)

---

## 🚀 Why We Added It

**Problems with old approach (useState + useEffect):**
```tsx
// ❌ 30+ lines of boilerplate code
const [services, setServices] = useState([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState('')

useEffect(() => {
  async function fetchServices() {
    try {
      setLoading(true)
      const { data, error } = await getServices()
      if (error) throw error
      setServices(data || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  fetchServices()
}, [])
```

**Benefits with React Query:**
```tsx
// ✅ 1 line of code
const { data: services = [], isLoading, error } = useServices()
```

**Improvements:**
- 95% less code
- Automatic caching (5 min default)
- No need to manage loading/error states
- Automatic refetching when data is stale
- Better performance (request deduplication)
- TypeScript support with full type inference

---

## 🏁 Quick Start

### 1. The Setup is Already Done! ✅

React Query is already configured in the project:
- ✅ Installed: `@tanstack/react-query` + devtools
- ✅ Provider added to app layout
- ✅ Custom hooks created for all major entities
- ✅ DevTools enabled in development mode

### 2. Using Hooks in Your Components

```tsx
'use client'
import { useServices } from '@/lib/hooks/useQuery'

export default function MyPage() {
  const { data: services = [], isLoading, error } = useServices()

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  
  return (
    <div>
      {services.map(service => (
        <ServiceCard key={service.service_code} service={service} />
      ))}
    </div>
  )
}
```

---

## 🎣 Available Hooks

### Services
```tsx
import { useServices, useService } from '@/lib/hooks/useQuery'

// Get all services
const { data: services = [], isLoading, error } = useServices()

// Get single service by ID
const { data: service, isLoading } = useService('SVC001')
```

### Houses
```tsx
import { useHouses, useHouse } from '@/lib/hooks/useQuery'

// Get all houses for a user
const { data: houses = [] } = useHouses(userId)

// Get single house by code
const { data: house } = useHouse('HOUSE001')
```

### Price Templates
```tsx
import { usePriceTemplates } from '@/lib/hooks/useQuery'

const { data: templates = [] } = usePriceTemplates()
```

### Measurements
```tsx
import { useMeasurements } from '@/lib/hooks/useQuery'

const { data: measurements = [] } = useMeasurements(userId)
```

### Staff & Branches
```tsx
import { useStaff, useBranches } from '@/lib/hooks/useQuery'

const { data: staff = [] } = useStaff()
const { data: branches = [] } = useBranches()
```

### Current User
```tsx
import { useCurrentUser } from '@/lib/hooks/useQuery'

const { data: user } = useCurrentUser()
```

---

## 🔄 Migration Guide

### Step 1: Identify useState + useEffect Patterns

Look for code like this:
```tsx
const [data, setData] = useState([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState('')

useEffect(() => {
  async function fetchData() {
    // ... fetching logic
  }
  fetchData()
}, [])
```

### Step 2: Replace with React Query Hook

```tsx
// Before (15+ lines)
const [services, setServices] = useState<Service[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState('')

useEffect(() => {
  async function fetchServices() {
    try {
      setLoading(true)
      const { data, error } = await getServices()
      if (error) throw error
      setServices(data || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  fetchServices()
}, [])

// After (1 line)
const { data: services = [], isLoading, error } = useServices()
```

### Step 3: Update Conditional Rendering

```tsx
// Before
if (loading) return <div>Loading...</div>
if (error) return <div>Error: {error}</div>

// After (same!)
if (isLoading) return <div>Loading...</div>
if (error) return <div>Error: {error.message}</div>
```

---

## 💡 Best Practices

### 1. Always Provide Default Values

```tsx
// ✅ Good - prevents undefined errors
const { data: services = [] } = useServices()

// ❌ Bad - services might be undefined
const { data: services } = useServices()
```

### 2. Use Enabled Option for Dependent Queries

```tsx
// Wait for userId before fetching houses
const { data: houses = [] } = useHouses(userId, {
  enabled: !!userId // Only run when userId exists
})
```

### 3. Custom Query Options

```tsx
const { data: services = [] } = useServices({
  staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  refetchOnWindowFocus: true, // Refetch when window focused
  retry: 3, // Retry failed requests 3 times
})
```

### 4. Multiple Queries in Parallel

```tsx
// ✅ All queries run in parallel automatically
const { data: services = [] } = useServices()
const { data: houses = [] } = useHouses(userId)
const { data: staff = [] } = useStaff()

// React Query handles parallelization for you!
```

### 5. Invalidating Queries After Mutations

```tsx
import { useInvalidateQueries } from '@/lib/hooks/useQuery'

function MyComponent() {
  const { invalidateServices } = useInvalidateQueries()
  
  const handleCreateService = async () => {
    // Create service...
    await createService(data)
    
    // Invalidate cache to refetch fresh data
    invalidateServices()
  }
}
```

---

## 🔧 Advanced Patterns

### Dependent Queries

```tsx
// First get user, then get houses
const { data: user } = useCurrentUser()
const { data: houses = [] } = useHouses(user?.id, {
  enabled: !!user // Only run after user is loaded
})
```

### Conditional Queries

```tsx
// Only fetch when modal is open
const [isOpen, setIsOpen] = useState(false)
const { data: services = [] } = useServices({
  enabled: isOpen
})
```

### Query Refetching

```tsx
const { data, refetch } = useServices()

// Manual refetch
<button onClick={() => refetch()}>
  Refresh Data
</button>
```

---

## 🎨 React Query DevTools

**DevTools are automatically enabled in development mode!**

Look for the TanStack Query icon in the bottom-right corner of your browser.

**Features:**
- View all active queries
- See query status (loading, success, error)
- Inspect cached data
- Manually trigger refetch
- See query timelines

---

## 🐛 Troubleshooting

### Query Not Running

**Problem:** Query returns undefined or never loads

**Solution:** Check if required parameters are available
```tsx
// ❌ Bad - userId might be undefined
const { data: houses } = useHouses(userId)

// ✅ Good - only run when userId exists
const { data: houses } = useHouses(userId, {
  enabled: !!userId
})
```

### Stale Data Not Refetching

**Problem:** Data doesn't update after mutation

**Solution:** Invalidate queries after mutations
```tsx
import { useInvalidateQueries } from '@/lib/hooks/useQuery'

const { invalidateServices } = useInvalidateQueries()

// After mutation
await updateService(id, data)
invalidateServices() // Triggers refetch
```

### Too Many Requests

**Problem:** Query runs too frequently

**Solution:** Increase staleTime
```tsx
const { data } = useServices({
  staleTime: 1000 * 60 * 10 // 10 minutes
})
```

---

## 📊 Configuration

Current default settings (in `lib/query-client.tsx`):

```tsx
{
  queries: {
    staleTime: 1000 * 60 * 5,      // 5 minutes
    gcTime: 1000 * 60 * 10,         // 10 minutes  
    retry: 2,                       // Retry 2 times
    refetchOnWindowFocus: false,    // Don't refetch on focus
    refetchOnMount: true,           // Refetch on mount if stale
    refetchOnReconnect: true,       // Refetch on reconnect
  },
  mutations: {
    retry: 1,                       // Retry mutations once
  }
}
```

To customize per-query:
```tsx
const { data } = useServices({
  staleTime: 1000 * 60 * 1, // Override to 1 minute
})
```

---

## 📚 Resources

- **TanStack Query Docs**: https://tanstack.com/query/latest
- **Example File**: `examples/react-query-migration-example.tsx`
- **Custom Hooks**: `lib/hooks/useQuery.ts`
- **Provider Setup**: `lib/query-client.tsx`

---

## 🎯 Next Steps

1. **Start Small**: Pick one component with useState + useEffect
2. **Replace**: Convert to using React Query hooks
3. **Test**: Verify it works correctly
4. **Expand**: Gradually migrate other components
5. **Clean Up**: Remove old useState/useEffect code

**Remember:** You don't have to migrate everything at once. React Query works alongside existing code!

---

## 🤝 Getting Help

- Check the example file: `examples/react-query-migration-example.tsx`
- Look at DevTools in development mode (bottom-right corner)
- Read the official docs: https://tanstack.com/query/latest

Happy querying! 🚀
