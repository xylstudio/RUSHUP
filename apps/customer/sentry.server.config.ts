// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'
import { env } from './lib/config/env'

if (env.SENTRY_DSN && env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: env.SENTRY_DSN,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 0.1,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    // Ignore errors from API routes that are expected
    ignoreErrors: [
      'NEXT_NOT_FOUND',
      'NEXT_REDIRECT',
    ],

    beforeSend(event, hint) {
      // Filter out events in development
      if (env.NODE_ENV === 'development') {
        return null
      }

      // Add custom tags
      event.tags = {
        ...event.tags,
        runtime: 'server',
      }

      return event
    },
  })
}
