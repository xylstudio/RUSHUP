/**
 * Unit Tests for Logger
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import logger, { measureTime } from '@/lib/logger'

describe('Logger', () => {
  // Spy on console methods
  let consoleLogSpy: any

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
  })

  describe('Basic logging methods', () => {
    it('should log debug messages in development', () => {
      logger.debug('Test debug message', { test: 'data' })
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should log info messages', () => {
      logger.info('Test info message')
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should log warnings', () => {
      logger.warn('Test warning')
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should log errors', () => {
      const error = new Error('Test error')
      logger.error('Something went wrong', error)
      expect(consoleLogSpy).toHaveBeenCalled()
    })
  })

  describe('API logging', () => {
    it('should log API requests', () => {
      logger.apiRequest('GET', '/api/test', 'user123')
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should log API responses', () => {
      logger.apiResponse('GET', '/api/test', 200, 150)
      expect(consoleLogSpy).toHaveBeenCalled()
    })
  })

  describe('measureTime', () => {
    it('should measure execution time', async () => {
      const result = await measureTime('test-operation', async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return 'success'
      })

      expect(result).toBe('success')
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should log errors and rethrow', async () => {
      await expect(
        measureTime('failing-operation', async () => {
          throw new Error('Operation failed')
        })
      ).rejects.toThrow('Operation failed')

      expect(consoleLogSpy).toHaveBeenCalled()
    })
  })
})
