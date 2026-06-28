// This file configures the initialization of Sentry on the client.
// The config you add here  will be used whenever a users loads a page in their browser.
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

    replaysOnErrorSampleRate: 1.0,

    // This sets the sample rate to be 10%. You may want this to be 100% while
    // in development and sample at a lower rate in production
    replaysSessionSampleRate: 0.1,

    // You can remove this option if you're not planning to use the Sentry Session Replay feature:
    integrations: [
      Sentry.replayIntegration({
        // Additional Replay configuration goes in here, for example:
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Ignore common errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      // Random plugins/extensions
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      // Facebook flakiness
      'fb_xd_fragment',
      // ISP "optimizing" proxy - `Cache-Control: no-transform` seems to reduce this. (thanks @acdha)
      'bmi_SafeAddOnload',
      'EBCallBackMessageReceived',
      // Chrome extensions
      'chrome-extension://',
      'moz-extension://',
      // Network errors
      'NetworkError',
      'Network request failed',
    ],

    beforeSend(event, hint) {
      // Filter out events in development
      if (env.NODE_ENV === 'development') {
        return null
      }

      // Don't send events for cancelled requests
      const error = hint.originalException
      if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
        return null
      }

      return event
    },
  })
}
