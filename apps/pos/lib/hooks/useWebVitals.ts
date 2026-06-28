/**
 * Web Vitals Monitoring
 * Track Core Web Vitals and performance metrics
 */

'use client'

import { useEffect, useState } from 'react'

interface WebVitalsMetrics {
  fcp: number | null // First Contentful Paint
  lcp: number | null // Largest Contentful Paint  
  fid: number | null // First Input Delay
  cls: number | null // Cumulative Layout Shift
  ttfb: number | null // Time to First Byte
}

export function useWebVitals() {
  const [metrics, setMetrics] = useState<WebVitalsMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return
    }

    // Track FCP
    const fcpObserver = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          setMetrics(prev => ({ ...prev, fcp: entry.startTime }))
        }
      }
    })
    fcpObserver.observe({ entryTypes: ['paint'] })

    // Track LCP
    const lcpObserver = new PerformanceObserver(list => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1] as any
      setMetrics(prev => ({
        ...prev,
        lcp: lastEntry.renderTime || lastEntry.loadTime,
      }))
    })
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

    // Track FID
    const fidObserver = new PerformanceObserver(list => {
      for (const entry of list.getEntries() as any[]) {
        setMetrics(prev => ({ ...prev, fid: entry.processingStart - entry.startTime }))
      }
    })
    fidObserver.observe({ entryTypes: ['first-input'] })

    // Track CLS
    let clsValue = 0
    const clsObserver = new PerformanceObserver(list => {
      for (const entry of list.getEntries() as any[]) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value
          setMetrics(prev => ({ ...prev, cls: clsValue }))
        }
      }
    })
    clsObserver.observe({ entryTypes: ['layout-shift'] })

    // Track TTFB
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (navigation) {
      const ttfb = navigation.responseStart - navigation.requestStart
      setMetrics(prev => ({ ...prev, ttfb }))
    }

    return () => {
      fcpObserver.disconnect()
      lcpObserver.disconnect()
      fidObserver.disconnect()
      clsObserver.disconnect()
    }
  }, [])

  return metrics
}

/**
 * Performance scoring based on Core Web Vitals thresholds
 */
export function getPerformanceScore(metrics: WebVitalsMetrics): {
  overall: 'good' | 'needs-improvement' | 'poor' | 'unknown'
  details: Record<keyof WebVitalsMetrics, 'good' | 'needs-improvement' | 'poor' | 'unknown'>
} {
  const details = {
    fcp: getMetricScore(metrics.fcp, 1800, 3000),
    lcp: getMetricScore(metrics.lcp, 2500, 4000),
    fid: getMetricScore(metrics.fid, 100, 300),
    cls: getMetricScore(metrics.cls, 0.1, 0.25),
    ttfb: getMetricScore(metrics.ttfb, 800, 1800),
  }

  const scores = Object.values(details)
  if (scores.includes('poor')) return { overall: 'poor', details }
  if (scores.includes('needs-improvement')) return { overall: 'needs-improvement', details }
  if (scores.every(s => s === 'good')) return { overall: 'good', details }
  return { overall: 'unknown', details }
}

function getMetricScore(
  value: number | null,
  goodThreshold: number,
  poorThreshold: number
): 'good' | 'needs-improvement' | 'poor' | 'unknown' {
  if (value === null) return 'unknown'
  if (value <= goodThreshold) return 'good'
  if (value <= poorThreshold) return 'needs-improvement'
  return 'poor'
}
