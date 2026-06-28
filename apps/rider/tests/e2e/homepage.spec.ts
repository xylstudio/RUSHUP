/**
 * E2E Test - Homepage
 */

import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('Global Landscape Platform')).toBeVisible()
    await expect(page.getByRole('heading', { name: /customer-facing landscape platform|ระบบลูกค้าและบริการสวน|面向客户的景观服务平台/i })).toBeVisible()
  })

  test('should expose public navigation and trust links', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('link', { name: 'Service Areas' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Contact' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Privacy' })).toBeVisible()
  })

  test('should have language switcher', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('button', { name: /th|ไทย/i })).toBeVisible()
  })

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('link', { name: /portal login|customer portal|เข้าสู่/i }).first().click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('should be responsive', async ({ page }) => {
    await page.goto('/')

    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.getByText('Global Landscape Platform')).toBeVisible()

    await page.setViewportSize({ width: 1280, height: 720 })
    await expect(page.getByText('Global Landscape Platform')).toBeVisible()
  })
})
