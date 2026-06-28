/**
 * Example: Migration from useState+useEffect to React Query
 * 
 * This file shows side-by-side comparison of old vs new patterns
 */

'use client'

import { useState, useEffect } from 'react'
import { useServices, useHouses, usePriceTemplates } from '@/lib/hooks/useQuery'
import { getServices, getHouses, type Service, type House } from '@/lib/supabaseClient'

// ============================================
// ❌ OLD WAY: useState + useEffect
// ============================================

function OldServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    async function fetchServices() {
      try {
        setLoading(true)
        const { data, error } = await getServices()
        if (error) throw error
        setServices(data || [])
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchServices()
  }, [])

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  
  return (
    <div>
      <h1>Services (Old Way)</h1>
      {services.map(s => (
        <div key={s.service_code}>{s.service_name}</div>
      ))}
    </div>
  )
}

// ============================================
// ✅ NEW WAY: React Query
// ============================================

function NewServicesPage() {
  // One line replaces all the useState + useEffect + try/catch above!
  const { data: services = [], isLoading, error } = useServices()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  
  return (
    <div>
      <h1>Services (New Way with React Query)</h1>
      {services.map(s => (
        <div key={s.service_code}>{s.service_name}</div>
      ))}
    </div>
  )
}

// ============================================
// ✅ ADVANCED: Multiple Queries in Parallel
// ============================================

function ServicesWithHouses() {
  const { data: services = [], isLoading: servicesLoading } = useServices()
  const { data: houses = [], isLoading: housesLoading } = useHouses('user-id')
  const { data: templates = [], isLoading: templatesLoading } = usePriceTemplates()

  // React Query automatically runs all queries in parallel!
  const isLoading = servicesLoading || housesLoading || templatesLoading

  if (isLoading) return <div>Loading all data...</div>
  
  return (
    <div>
      <h1>Multiple Data Sources</h1>
      <p>Services: {services.length}</p>
      <p>Houses: {houses.length}</p>
      <p>Templates: {templates.length}</p>
    </div>
  )
}

// ============================================
// ✅ ADVANCED: Dependent Queries
// ============================================

function HouseDetails({ houseCode }: { houseCode: string }) {
  // First get house details
  const { data: house, isLoading: houseLoading } = useHouse(houseCode)
  
  // Then get services (only runs after house is loaded)
  const { data: services = [], isLoading: servicesLoading } = useServices({
    enabled: !!house, // Wait for house to load first
  })

  if (houseLoading) return <div>Loading house...</div>
  if (!house) return <div>House not found</div>
  if (servicesLoading) return <div>Loading services...</div>

  return (
    <div>
      <h1>{house.name}</h1>
      <p>Available services: {services.length}</p>
    </div>
  )
}

// ============================================
// Benefits of React Query:
// ============================================
/*
1. ✅ Automatic caching - data is cached for 5 minutes by default
2. ✅ Automatic refetching - refetches when window regains focus or network reconnects
3. ✅ No loading/error state management needed
4. ✅ Parallel queries run automatically
5. ✅ Dependent queries made easy with 'enabled' option
6. ✅ Request deduplication - multiple components using same query = 1 request
7. ✅ DevTools for debugging (visible in development mode)
8. ✅ TypeScript support with full type inference
9. ✅ Optimistic updates & mutations
10. ✅ Much less code to maintain

Migration Checklist:
─────────────────────
1. Remove useState for data
2. Remove useState for loading
3. Remove useState for error
4. Remove useEffect
5. Remove try/catch
6. Replace with useQuery hook
7. Use isLoading instead of loading
8. Use error directly
9. Use data with default value

Example:
────────
- const [data, setData] = useState([])
- const [loading, setLoading] = useState(true)
- const [error, setError] = useState('')
- useEffect(() => { ... }, [])

+ const { data = [], isLoading, error } = useServices()
*/
