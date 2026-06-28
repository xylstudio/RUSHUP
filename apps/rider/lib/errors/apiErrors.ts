/**
 * Centralized Error Handler
 * Consistent error responses across all API routes
 */

import { NextResponse } from 'next/server'
import logger from '../logger'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message)
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public errors?: Record<string, string>
  ) {
    super(400, message)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, message)
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super(429, `Too many requests. Please try again in ${retryAfter} seconds.`)
  }
}

/**
 * Handle errors in API routes
 */
export function handleApiError(error: unknown, context?: string): NextResponse {
  // Log the error
  logger.error('API Error', error, context)

  // Handle known error types
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        ...(error instanceof ValidationError && error.errors ? { errors: error.errors } : {}),
      },
      { status: error.statusCode }
    )
  }

  // Handle Supabase errors
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const supabaseError = error as any
    return NextResponse.json(
      {
        error: 'Database error',
        message: supabaseError.message || 'An error occurred while accessing the database',
      },
      { status: 500 }
    )
  }

  // Generic error response (don't leak sensitive info in production)
  const isDevelopment = process.env.NODE_ENV === 'development'

  return NextResponse.json(
    {
      error: 'Internal server error',
      ...(isDevelopment && error instanceof Error
        ? { message: error.message, stack: error.stack }
        : {}),
    },
    { status: 500 }
  )
}

/**
 * Async error wrapper for API routes
 * Usage: export const GET = asyncHandler(async (req) => { ... })
 */
export function asyncHandler(handler: (request: Request, context?: any) => Promise<NextResponse>) {
  return async (request: Request, context?: any) => {
    try {
      return await handler(request, context)
    } catch (error) {
      return handleApiError(error)
    }
  }
}

/**
 * Validate required environment variables on startup
 */
export function validateEnv() {
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    console.warn(
      `⚠️ [Config] Missing required environment variables: ${missing.join(', ')}\n` +
        'Database calls may fail until these are set in the environment.'
    )
  }
}

/**
 * API Response builders
 */
export class ApiResponse {
  static success<T>(data: T, status = 200) {
    return NextResponse.json({ success: true, data }, { status })
  }

  static created<T>(data: T) {
    return NextResponse.json({ success: true, data }, { status: 201 })
  }

  static noContent() {
    return new NextResponse(null, { status: 204 })
  }

  static error(message: string, status = 400) {
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
