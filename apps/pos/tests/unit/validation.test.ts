/**
 * Unit Tests for Validation Utilities
 */

import { describe, it, expect } from 'vitest'
import {
  sanitizeHtml,
  isValidEmail,
  isValidThaiPhone,
  isValidUrl,
  sanitizeFilename,
  isInRange,
  isValidUuid,
  isValidZipCode,
  containsSuspiciousPatterns,
  isSafeObjectKey,
} from '@/lib/security/validation'

describe('Security Validation Utilities', () => {
  describe('sanitizeHtml', () => {
    it('should escape HTML special characters', () => {
      const malicious = '<script>alert("XSS")</script>'
      const sanitized = sanitizeHtml(malicious)
      expect(sanitized).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;')
    })

    it('should handle empty string', () => {
      expect(sanitizeHtml('')).toBe('')
    })

    it('should escape quotes', () => {
      expect(sanitizeHtml(`"Hello" and 'World'`)).toBe('&quot;Hello&quot; and &#x27;World&#x27;')
    })
  })

  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name+tag@example.co.th')).toBe(true)
    })

    it('should reject invalid email formats', () => {
      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('test@')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('test@example')).toBe(false)
    })
  })

  describe('isValidThaiPhone', () => {
    it('should validate correct Thai phone numbers', () => {
      expect(isValidThaiPhone('0812345678')).toBe(true)
      expect(isValidThaiPhone('02-123-4567')).toBe(true)
      expect(isValidThaiPhone('081-234-5678')).toBe(true)
    })

    it('should reject invalid phone numbers', () => {
      expect(isValidThaiPhone('12345')).toBe(false)
      expect(isValidThaiPhone('1234567890')).toBe(false)
      expect(isValidThaiPhone('0112345678')).toBe(false)
    })
  })

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true)
      expect(isValidUrl('http://localhost:3000')).toBe(true)
    })

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false)
      expect(isValidUrl('javascript:alert(1)')).toBe(false)
    })

    it('should respect allowed protocols', () => {
      expect(isValidUrl('ftp://files.example.com', ['ftp'])).toBe(true)
      expect(isValidUrl('ftp://files.example.com', ['http', 'https'])).toBe(false)
    })
  })

  describe('sanitizeFilename', () => {
    it('should remove special characters', () => {
      expect(sanitizeFilename('file<script>.txt')).toBe('file_script_.txt')
      expect(sanitizeFilename('../../../etc/passwd')).toBe('_._._._etc_passwd')
    })

    it('should limit filename length', () => {
      const longName = 'a'.repeat(300)
      const sanitized = sanitizeFilename(longName)
      expect(sanitized.length).toBeLessThanOrEqual(255)
    })
  })

  describe('isInRange', () => {
    it('should validate numbers in range', () => {
      expect(isInRange(5, 1, 10)).toBe(true)
      expect(isInRange(1, 1, 10)).toBe(true)
      expect(isInRange(10, 1, 10)).toBe(true)
    })

    it('should reject numbers out of range', () => {
      expect(isInRange(0, 1, 10)).toBe(false)
      expect(isInRange(11, 1, 10)).toBe(false)
      expect(isInRange(NaN, 1, 10)).toBe(false)
    })
  })

  describe('isValidUuid', () => {
    it('should validate correct UUID v4', () => {
      expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    })

    it('should reject invalid UUIDs', () => {
      expect(isValidUuid('not-a-uuid')).toBe(false)
      expect(isValidUuid('550e8400-e29b-11d4-a716-446655440000')).toBe(false) // Wrong version
    })
  })

  describe('isValidZipCode', () => {
    it('should validate Thai zip codes', () => {
      expect(isValidZipCode('10110')).toBe(true)
      expect(isValidZipCode('50000')).toBe(true)
    })

    it('should reject invalid zip codes', () => {
      expect(isValidZipCode('1234')).toBe(false)
      expect(isValidZipCode('123456')).toBe(false)
    })
  })

  describe('containsSuspiciousPatterns', () => {
    it('should detect XSS patterns', () => {
      expect(containsSuspiciousPatterns('<script>alert(1)</script>')).toBe(true)
      expect(containsSuspiciousPatterns('javascript:alert(1)')).toBe(true)
      expect(containsSuspiciousPatterns('onclick=alert(1)')).toBe(true)
    })

    it('should allow safe content', () => {
      expect(containsSuspiciousPatterns('Normal text content')).toBe(false)
      expect(containsSuspiciousPatterns('Email: test@example.com')).toBe(false)
    })
  })

  describe('isSafeObjectKey', () => {
    it('should reject dangerous keys', () => {
      expect(isSafeObjectKey('__proto__')).toBe(false)
      expect(isSafeObjectKey('constructor')).toBe(false)
      expect(isSafeObjectKey('prototype')).toBe(false)
    })

    it('should allow safe keys', () => {
      expect(isSafeObjectKey('name')).toBe(true)
      expect(isSafeObjectKey('email')).toBe(true)
    })
  })
})
