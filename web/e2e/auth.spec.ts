import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
    })
  })

  test('should display login page', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: 'SNS Research Tool' })).toBeVisible()
    await expect(page.getByLabel('メールアドレス')).toBeVisible()
    await expect(page.getByLabel('パスワード')).toBeVisible()
    await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel('メールアドレス').fill('invalid@example.com')
    await page.getByLabel('パスワード').fill('wrongpassword')
    await page.getByRole('button', { name: 'ログイン' }).click()

    // Wait for error message
    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 10000 })
  })

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    await page.goto('/dashboard')

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
  })

  test('should display register page', async ({ page }) => {
    await page.goto('/register')

    await expect(page.getByRole('heading', { name: 'SNS Research Tool' })).toBeVisible()
    await expect(page.getByLabel('名前')).toBeVisible()
    await expect(page.getByLabel('メールアドレス')).toBeVisible()
    await expect(page.getByLabel('パスワード', { exact: true })).toBeVisible()
    await expect(page.getByLabel('パスワード（確認）')).toBeVisible()
    await expect(page.getByRole('button', { name: 'アカウントを作成' })).toBeVisible()
  })

  test('should show password validation error on register', async ({ page }) => {
    await page.goto('/register')

    await page.getByLabel('名前').fill('Test User')
    await page.getByLabel('メールアドレス').fill('test@example.com')
    await page.getByLabel('パスワード', { exact: true }).fill('short')
    await page.getByLabel('パスワード（確認）').fill('different')
    await page.getByRole('button', { name: 'アカウントを作成' }).click()

    // Should show error
    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 5000 })
  })

  test('should toggle password visibility', async ({ page }) => {
    await page.goto('/login')

    const passwordInput = page.getByLabel('パスワード')
    await expect(passwordInput).toHaveAttribute('type', 'password')

    // Click toggle button
    await page.locator('button:has(svg)').first().click()

    await expect(passwordInput).toHaveAttribute('type', 'text')
  })

  test('should navigate between login and register', async ({ page }) => {
    await page.goto('/login')

    // Click register link
    await page.getByRole('link', { name: '新規登録' }).click()
    await expect(page).toHaveURL(/\/register/)

    // Click login link
    await page.getByRole('link', { name: 'ログイン' }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
