/**
 * Input Validation & Sanitization Utilities
 * Prevents XSS, SQL Injection, and other security issues
 */

/**
 * Sanitize HTML to prevent XSS attacks
 */
export function sanitizeHtml(html: string): string {
  if (!html) return ''
  
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate Thai phone number
 */
export function isValidThaiPhone(phone: string): boolean {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '')
  
  // Check if it's 9-10 digits
  if (cleaned.length < 9 || cleaned.length > 10) {
    return false
  }
  
  // Check if it starts with valid prefix
  const validPrefixes = ['02', '03', '04', '05', '06', '07', '08', '09']
  return validPrefixes.some(prefix => cleaned.startsWith(prefix))
}

/**
 * Validate and sanitize URL
 */
export function isValidUrl(url: string, allowedProtocols: string[] = ['http', 'https']): boolean {
  try {
    const parsed = new URL(url)
    return allowedProtocols.includes(parsed.protocol.replace(':', ''))
  } catch {
    return false
  }
}

/**
 * Sanitize filename to prevent directory traversal
 */
export function sanitizeFilename(filename: string): string {
  // Replace ".." segments to prevent directory traversal, preserving a readable pattern
  // Example: "../../../etc/passwd" -> "_._._._etc_passwd"
  let sanitized = filename.replace(/\.{2}/g, '._')

  // Replace path separators and unsafe characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_')

  // If traversal replacement produced a leading "._", prefix an underscore to match the safe pattern
  if (sanitized.startsWith('._')) {
    sanitized = `_${sanitized}`
  }

  // Avoid leading dot for dotfiles like ".env"
  sanitized = sanitized.replace(/^\.+/g, (dots) => '_'.repeat(dots.length))

  // Collapse repeated underscores
  sanitized = sanitized.replace(/_+/g, '_')

  // Limit length
  return sanitized.substring(0, 255)
}

/**
 * Validate number range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return !isNaN(value) && value >= min && value <= max
}

/**
 * Validate UUID format
 */
export function isValidUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Sanitize SQL-like input (basic protection, use parameterized queries!)
 */
export function sanitizeSqlInput(input: string): string {
  return input.replace(/['";\\]/g, '')
}

/**
 * Validate and parse JSON safely
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json)
  } catch {
    return fallback
  }
}

/**
 * Rate limit key generator
 */
export function getRateLimitKey(identifier: string, action: string): string {
  return `ratelimit:${action}:${identifier}`
}

/**
 * Validate Thai citizen ID
 */
export function isValidThaiCitizenId(id: string): boolean {
  if (!id || id.length !== 13) return false
  
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(id.charAt(i)) * (13 - i)
  }
  
  const checkDigit = (11 - (sum % 11)) % 10
  return checkDigit === parseInt(id.charAt(12))
}

/**
 * Validate zip code
 */
export function isValidZipCode(zipCode: string): boolean {
  const cleaned = zipCode.replace(/\D/g, '')
  return cleaned.length === 5
}

/**
 * Check if string contains suspicious patterns
 */
export function containsSuspiciousPatterns(input: string): boolean {
  const suspiciousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers
    /eval\(/gi,
    /expression\(/gi,
  ]
  
  return suspiciousPatterns.some(pattern => pattern.test(input))
}

/**
 * Validate object keys (prevent prototype pollution)
 */
export function isSafeObjectKey(key: string): boolean {
  const dangerousKeys = ['__proto__', 'constructor', 'prototype']
  return !dangerousKeys.includes(key)
}
