/**
 * Custom React Query Hooks for Xylem Project
 * 
 * These hooks provide type-safe, cached data fetching for all major entities.
 * Each hook includes:
 * - Automatic caching (5 min default)
 * - Loading & error states
 * - Automatic refetching
 * - Type safety with TypeScript
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { data: services, isLoading, error } = useServices()
 *   
 *   if (isLoading) return <LoadingSpinner />
 *   if (error) return <ErrorMessage />
 *   
 *   return <ServiceList services={services} />
 * }
 * ```
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
import {
  getServices,
  getPriceTemplates,
  getCustomerHouses,
  getMeasurementRequestsWithDetails,
  getStaffMembers,
  getBranches,
  getCurrentUser,
  type Service,
  type PriceTemplate,
  type House,
  type MeasurementRequestWithDetails,
  type Profile,
  type Branch,
} from '../supabaseClient'

// ============================================
// Query Keys (for cache invalidation)
// ============================================

export const queryKeys = {
  services: ['services'] as const,
  serviceById: (id: string) => ['services', id] as const,
  priceTemplates: ['priceTemplates'] as const,
  houses: (userId?: string) => ['houses', userId] as const,
  houseById: (houseCode: string) => ['houses', houseCode] as const,
  measurements: (userId?: string) => ['measurements', userId] as const,
  staff: ['staff'] as const,
  branches: ['branches'] as const,
  currentUser: ['currentUser'] as const,
  profile: (userId: string) => ['profile', userId] as const,
}

// ============================================
// Services
// ============================================

/**
 * Fetch all active services
 */
export function useServices(options?: UseQueryOptions<Service[], Error>) {
  return useQuery<Service[], Error>({
    queryKey: queryKeys.services,
    queryFn: async () => {
      const { data, error } = await getServices()
      if (error) throw new Error(error.message || 'Failed to fetch services')
      return data || []
    },
    ...options,
  })
}

/**
 * Fetch service by ID
 */
export function useService(serviceId: string | null) {
  return useQuery<Service | null, Error>({
    queryKey: queryKeys.serviceById(serviceId || ''),
    queryFn: async () => {
      if (!serviceId) return null
      const { data } = await getServices()
      return data?.find(s => s.service_code === serviceId) || null
    },
    enabled: !!serviceId,
  })
}

// ============================================
// Price Templates
// ============================================

/**
 * Fetch all price templates
 */
export function usePriceTemplates(options?: UseQueryOptions<PriceTemplate[], Error>) {
  return useQuery<PriceTemplate[], Error>({
    queryKey: queryKeys.priceTemplates,
    queryFn: async () => {
      const { data, error } = await getPriceTemplates()
      if (error) throw new Error(error.message || 'Failed to fetch price templates')
      return data || []
    },
    ...options,
  })
}

// ============================================
// Houses
// ============================================

/**
 * Fetch houses for current user
 */
export function useHouses(userId?: string) {
  return useQuery<House[], Error>({
    queryKey: queryKeys.houses(userId),
    queryFn: async () => {
      const { data, error } = await getCustomerHouses(userId!)
      if (error) throw new Error(error.message || 'Failed to fetch houses')
      return data || []
    },
    enabled: !!userId,
  })
}

/**
 * Fetch single house by code
 */
export function useHouse(houseCode: string | null) {
  return useQuery<House | null, Error>({
    queryKey: queryKeys.houseById(houseCode || ''),
    queryFn: async () => {
      if (!houseCode) return null
      const user = await getCurrentUser()
      if (!user) return null
      
      const { data } = await getCustomerHouses(user.id)
      return data?.find(h => h.house_code === houseCode) || null
    },
    enabled: !!houseCode,
  })
}

// ============================================
// Measurement Requests
// ============================================

/**
 * Fetch measurement requests for user
 */
export function useMeasurements(userId?: string) {
  return useQuery<MeasurementRequestWithDetails[], Error>({
    queryKey: queryKeys.measurements(userId),
    queryFn: async () => {
      if (!userId) return []
      const data = await getMeasurementRequestsWithDetails(userId)
      return data || []
    },
    enabled: !!userId,
  })
}

// ============================================
// Staff
// ============================================

/**
 * Fetch all staff members
 */
export function useStaff(options?: UseQueryOptions<Profile[], Error>) {
  return useQuery<Profile[], Error>({
    queryKey: queryKeys.staff,
    queryFn: async () => {
      const { data, error } = await getStaffMembers()
      if (error) throw new Error(error.message || 'Failed to fetch staff')
      return data || []
    },
    ...options,
  })
}

// ============================================
// Branches
// ============================================

/**
 * Fetch all branches
 */
export function useBranches(options?: UseQueryOptions<Branch[], Error>) {
  return useQuery<Branch[], Error>({
    queryKey: queryKeys.branches,
    queryFn: async () => {
      const { data, error } = await getBranches()
      if (error) throw new Error(error.message || 'Failed to fetch branches')
      return data || []
    },
    ...options,
  })
}

// ============================================
// Current User
// ============================================

/**
 * Fetch current authenticated user
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: getCurrentUser,
    staleTime: 1000 * 60 * 10, // 10 minutes (user data changes rarely)
  })
}

// ============================================
// Mutation Helpers
// ============================================

/**
 * Hook to invalidate queries after mutations
 * 
 * @example
 * ```tsx
 * const { invalidateHouses } = useInvalidateQueries()
 * 
 * const mutation = useMutation({
 *   mutationFn: createHouse,
 *   onSuccess: () => {
 *     invalidateHouses()
 *   }
 * })
 * ```
 */
export function useInvalidateQueries() {
  const queryClient = useQueryClient()

  return {
    invalidateServices: () => queryClient.invalidateQueries({ queryKey: queryKeys.services }),
    invalidateHouses: (userId?: string) => 
      queryClient.invalidateQueries({ queryKey: queryKeys.houses(userId) }),
    invalidateMeasurements: (userId?: string) => 
      queryClient.invalidateQueries({ queryKey: queryKeys.measurements(userId) }),
    invalidateStaff: () => queryClient.invalidateQueries({ queryKey: queryKeys.staff }),
    invalidateBranches: () => queryClient.invalidateQueries({ queryKey: queryKeys.branches }),
    invalidateAll: () => queryClient.invalidateQueries(),
  }
}
