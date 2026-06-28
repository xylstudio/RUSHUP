/**
 * Progressive Web App (PWA) Service Worker
 * 
 * Enables:
 * - Offline functionality
 * - Background sync
 * - Push notifications
 * - Asset caching
 * 
 * @file public/sw.js
 */

const CACHE_NAME = 'xylem-v4-force'
const RUNTIME_CACHE = 'xylem-runtime-v4-force'
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/offline.html',
]

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE).catch(err => {
          console.warn('Failed to cache assets:', err)
          // Don't fail the install if some assets can't be cached
        })
      })
      .then(() => self.skipWaiting())
  )
})

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map(name => {
            console.log('Deleting old cache:', name)
            return caches.delete(name)
          })
      )
    }).then(() => {
      // Take immediate control of all clients
      return self.clients.claim()
    })
  )
})

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event
  const { method, url } = request

  // Skip non-GET requests
  if (method !== 'GET') {
    return
  }

  // Skip API calls and Supabase calls (they'll use network-first strategy)
  if (url.includes('/api/') || url.includes('supabase.co')) {
    event.respondWith(networkFirstStrategy(request))
    return
  }

  // For navigation requests, use network-first
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstStrategy(request))
    return
  }

  // For other requests, use cache-first
  event.respondWith(cacheFirstStrategy(request))
})

/**
 * Cache-first strategy: Check cache first, fallback to network
 * Used for: Static assets, CSS, JS, images
 */
async function cacheFirstStrategy(request) {
  try {
    const cache = await caches.open(CACHE_NAME)
    const cached = await cache.match(request)
    
    if (cached) {
      return cached
    }

    const response = await fetch(request)
    
    // Cache successful responses
    if (response && response.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE)
      cache.put(request, response.clone()).catch(err => {
        console.warn('Failed to cache response:', err)
      })
    }

    return response
  } catch (error) {
    console.error('Cache-first fetch failed:', error)
    // Return offline page for documents
    if (request.mode === 'navigate') {
      const cache = await caches.open(CACHE_NAME)
      return cache.match('/offline.html') || new Response('Offline')
    }
    throw error
  }
}

/**
 * Network-first strategy: Try network first, fallback to cache
 * Used for: API calls, navigation, fresh data
 */
async function networkFirstStrategy(request) {
  const isApiRequest = request.url.includes('/api/') || request.url.includes('supabase.co');

  try {
    const response = await fetch(request)
    
    // Cache successful responses
    if (response && response.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE)
      cache.put(request, response.clone()).catch(err => {
        console.warn('Failed to cache response:', err)
      })
    }

    return response
  } catch (error) {
    console.warn('Network request failed:', error)
    
    // Skip cache fallback for API requests to avoid showing stale data (Ghost Logs)
    if (isApiRequest) {
      throw error;
    }

    // Try cache as fallback for assets/navigation
    const cached = await caches.match(request)
    if (cached) {
      return cached
    }

    // Return offline page for navigation
    if (request.mode === 'navigate') {
      const cache = await caches.open(CACHE_NAME)
      return cache.match('/offline.html') || new Response('Offline')
    }

    throw error
  }
}

// Background Sync - retry failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-requests') {
    event.waitUntil(syncFailedRequests())
  }
})

async function syncFailedRequests() {
  const cache = await caches.open(RUNTIME_CACHE)
  const requests = await cache.keys()
  
  return Promise.all(
    requests.map(async (request) => {
      try {
        const response = await fetch(request)
        if (response.ok) {
          await cache.delete(request)
        }
      } catch (err) {
        console.warn('Sync request failed:', err)
      }
    })
  )
}

// Handle messages from client
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
