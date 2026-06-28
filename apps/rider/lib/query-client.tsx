'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

/**
 * React Query Configuration
 * 
 * Default settings optimized for the Xylem project:
 * - 5 minutes cache time
 * - 2 retries on failure
 * - Refetch on window focus (disabled for better UX)
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Cache data for 5 minutes
        staleTime: 1000 * 60 * 5,
        
        // Keep unused data in cache for 10 minutes
        gcTime: 1000 * 60 * 10,
        
        // Retry failed requests twice
        retry: 2,
        
        // Don't refetch on window focus (better for user experience)
        refetchOnWindowFocus: false,
        
        // Refetch on mount if data is stale
        refetchOnMount: true,
        
        // Refetch on reconnect if data is stale
        refetchOnReconnect: true,
      },
      mutations: {
        // Retry failed mutations once
        retry: 1,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient()
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
  }
}

/**
 * QueryClientProvider wrapper component
 * 
 * Usage:
 * ```tsx
 * import { QueryProvider } from '@/lib/query-client'
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <QueryProvider>
 *       {children}
 *     </QueryProvider>
 *   )
 * }
 * ```
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => getQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools only shown in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false}
        />
      )}
    </QueryClientProvider>
  )
}
