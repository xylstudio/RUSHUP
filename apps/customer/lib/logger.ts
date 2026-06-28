/**
 * Production-safe Logger
 * Replaces console.log with structured logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const REDACTED = '[REDACTED]'
const SENSITIVE_KEYS = ['password', 'token', 'secret', 'authorization', 'cookie', 'refresh_token', 'access_token']

const maskEmail = (value: string) => {
  const [localPart, domain] = value.split('@')
  if (!localPart || !domain) return value
  if (localPart.length <= 2) return `${localPart[0] || '*'}*@${domain}`
  return `${localPart.slice(0, 2)}***@${domain}`
}

const maskPhone = (value: string) => {
  const digits = value.replace(/\D/g, '')
  if (digits.length < 4) return REDACTED
  return `***${digits.slice(-4)}`
}

const sanitizeLogData = (value: unknown): unknown => {
  if (value == null) return value

  if (typeof value === 'string') {
    if (value.includes('@')) return maskEmail(value)
    if (/^(\+66|0)\d{8,12}$/.test(value.replace(/[\s-]/g, ''))) return maskPhone(value)
    return value.length > 2000 ? `${value.slice(0, 2000)}...[truncated]` : value
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((entry) => sanitizeLogData(entry))
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => {
        const normalizedKey = key.toLowerCase()
        if (SENSITIVE_KEYS.some((sensitiveKey) => normalizedKey.includes(sensitiveKey))) {
          return [key, REDACTED]
        }

        if (normalizedKey.includes('email') && typeof entryValue === 'string') {
          return [key, maskEmail(entryValue)]
        }

        if (normalizedKey.includes('phone') && typeof entryValue === 'string') {
          return [key, maskPhone(entryValue)]
        }

        return [key, sanitizeLogData(entryValue)]
      })
    )
  }

  return value
}

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  data?: any
  context?: string
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production'

  private formatLog(level: LogLevel, message: string, data?: any, context?: string): LogEntry {
    const sanitizedData = sanitizeLogData(data)

    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      data: sanitizedData,
      context
    }
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true
    // In production, only log warnings and errors
    return level === 'warn' || level === 'error'
  }

  private log(level: LogLevel, message: string, data?: any, context?: string) {
    if (!this.shouldLog(level)) return

    const entry = this.formatLog(level, message, data, context)

    if (this.isDevelopment) {
      // Pretty print in development
      const color = {
        debug: '\x1b[36m', // Cyan
        info: '\x1b[32m',  // Green
        warn: '\x1b[33m',  // Yellow
        error: '\x1b[31m'  // Red
      }[level]
      const reset = '\x1b[0m'

      console.log(`${color}[${level.toUpperCase()}]${reset} ${message}`, entry.data || '')
    } else {
      // Structured JSON in production (for log aggregation)
      console.log(JSON.stringify(entry))
    }
  }

  debug(message: string, data?: any, context?: string) {
    this.log('debug', message, data, context)
  }

  info(message: string, data?: any, context?: string) {
    this.log('info', message, data, context)
  }

  warn(message: string, data?: any, context?: string) {
    this.log('warn', message, data, context)
  }

  error(message: string, error?: any, context?: string) {
    // Extract error details
    const errorData = error instanceof Error 
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      : error

    this.log('error', message, errorData, context)
  }

  // API request logging
  apiRequest(method: string, path: string, userId?: string) {
    this.info(`API ${method} ${path}`, { userId }, 'API')
  }

  // API response logging
  apiResponse(method: string, path: string, status: number, duration: number) {
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'
    this.log(level, `API ${method} ${path} - ${status}`, { duration }, 'API')
  }

  // Database query logging
  dbQuery(query: string, duration?: number) {
    if (this.isDevelopment) {
      this.debug(`DB Query: ${query}`, { duration }, 'Database')
    }
  }
}

// Singleton instance
const logger = new Logger()

export default logger

// Helper to measure execution time
export async function measureTime<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now()
  try {
    const result = await fn()
    const duration = Date.now() - start
    logger.debug(`${label} completed`, { duration })
    return result
  } catch (error) {
    const duration = Date.now() - start
    logger.error(`${label} failed`, error, `Duration: ${duration}ms`)
    throw error
  }
}
