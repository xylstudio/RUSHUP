/**
 * Environment Variables Configuration & Validation
 * Type-safe access to environment variables
 */

import { validateEnv } from '../errors/apiErrors'

// Validate on module load (server-side only)
if (typeof window === 'undefined') {
  validateEnv()
}

/**
 * Server-side environment variables
 */
export const env = {
  // Node
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Supabase
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  
  // Email
  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT || '587'),
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASS: process.env.EMAIL_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || '',
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'Xylem Landscape',
  
  // Stripe
  STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  
  // App
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  
  // Security
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'dev_secret_123',
  
  // Google Maps
  GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  
  // Monitoring
  SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
  SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN || '',
} as const

/**
 * Client-side environment variables (safe to expose)
 */
export const publicEnv = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
  SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
} as const

/**
 * Check if running in production
 */
export const isProduction = env.NODE_ENV === 'production'

/**
 * Check if running in development
 */
export const isDevelopment = env.NODE_ENV === 'development'

/**
 * Check if a feature is enabled
 */
export const features = {
  email: Boolean(env.EMAIL_USER && env.EMAIL_PASS),
  payment: Boolean(env.STRIPE_PUBLISHABLE_KEY && env.STRIPE_SECRET_KEY),
  maps: Boolean(env.GOOGLE_MAPS_API_KEY),
  sentry: Boolean(env.SENTRY_DSN),
} as const
