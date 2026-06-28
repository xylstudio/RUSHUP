/**
 * E2E Test - Authentication Flow
 */

import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login')
    
    // Check for login form elements
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /login|เข้าสู่ระบบ/i })).toBeVisible()
  })

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/login')
    
    // Submit empty form
    await page.getByRole('button', { name: /login|เข้าสู่ระบบ/i }).click()
    
    // Should show validation errors (this depends on your implementation)
    // Adjust selectors based on your actual error messages
  })

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/login')
    
    // Click register link
    await page.getByRole('link', { name: /register|ลงทะเบียน/i }).click()
    
    // Should navigate to register page
    await expect(page).toHaveURL(/\/register/)
  })

  test('should show register form', async ({ page }) => {
    await page.goto('/register')
    
    // Check for register form elements
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
  })
})
