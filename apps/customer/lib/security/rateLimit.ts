/**
 * Rate Limiting Utility
 * Prevents abuse by limiting API requests per IP/User
 */

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

export interface RateLimitConfig {
  windowMs?: number // Time window in milliseconds (default: 15 minutes)
  maxRequests?: number // Max requests per window (default: 100)
}

/**
 * Rate limiter for API routes
 * Usage in API route:
 * 
 * const limiter = rateLimit({ windowMs: 60000, maxRequests: 10 })
 * const rateLimitResult = await limiter.check(request, identifier)
 * if (!rateLimitResult.success) {
 *   return NextResponse.json(rateLimitResult.error, { status: 429 })
 * }
 */
export function rateLimit(config: RateLimitConfig = {}) {
  const windowMs = config.windowMs || 15 * 60 * 1000 // 15 minutes
  const maxRequests = config.maxRequests || 100

  return {
    check: async (request: Request, identifier?: string) => {
      // Get identifier (IP or custom identifier)
      const id = identifier || getClientIp(request) || 'anonymous'
      
      const now = Date.now()
      const record = store[id]

      // Clean up old entries
      if (record && now > record.resetTime) {
        delete store[id]
      }

      // Initialize or get current record
      const current = store[id] || { count: 0, resetTime: now + windowMs }

      // Check if limit exceeded
      if (current.count >= maxRequests) {
        const resetInSeconds = Math.ceil((current.resetTime - now) / 1000)
        return {
          success: false,
          error: {
            error: 'Too many requests',
            message: `Rate limit exceeded. Please try again in ${resetInSeconds} seconds.`,
            retryAfter: resetInSeconds
          }
        }
      }

      // Increment counter
      current.count++
      store[id] = current

      return {
        success: true,
        remaining: maxRequests - current.count,
        resetTime: current.resetTime
      }
    }
  }
}

/**
 * Get client IP address from request
 */
function getClientIp(request: Request): string | null {
  // Try various headers
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip', // Cloudflare
    'x-client-ip'
  ]

  for (const header of headers) {
    const value = request.headers.get(header)
    if (value) {
      // x-forwarded-for can contain multiple IPs
      return value.split(',')[0].trim()
    }
  }

  return null
}

/**
 * Clean up old entries periodically (run in background)
 */
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    Object.keys(store).forEach(key => {
      if (store[key].resetTime < now) {
        delete store[key]
      }
    })
  }, 60000) // Clean every minute
}
