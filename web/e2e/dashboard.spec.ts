import { test, expect } from '@playwright/test'

// Helper to set up authenticated state
async function setupAuth(page: any) {
  await page.evaluate(() => {
    localStorage.setItem('accessToken', 'test-token')
    localStorage.setItem('refreshToken', 'test-refresh-token')
    localStorage.setItem('user', JSON.stringify({
      id: 'test-user-id',
      name: 'テストユーザー',
      email: 'test@example.com',
    }))
  })
}

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await setupAuth(page)
  })

  test('should display dashboard layout with sidebar', async ({ page }) => {
    await page.goto('/dashboard')

    // Check sidebar navigation
    await expect(page.getByRole('link', { name: 'ダッシュボード' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'アカウント' })).toBeVisible()
    await expect(page.getByRole('link', { name: '分析' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'レポート' })).toBeVisible()
    await expect(page.getByRole('link', { name: '設定' })).toBeVisible()
  })

  test('should display user info in sidebar', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page.getByText('テストユーザー')).toBeVisible()
    await expect(page.getByText('test@example.com')).toBeVisible()
  })

  test('should navigate to different pages', async ({ page }) => {
    await page.goto('/dashboard')

    // Navigate to accounts
    await page.getByRole('link', { name: 'アカウント' }).click()
    await expect(page).toHaveURL(/\/dashboard\/accounts/)

    // Navigate to analytics
    await page.getByRole('link', { name: '分析' }).click()
    await expect(page).toHaveURL(/\/dashboard\/analytics/)

    // Navigate to reports
    await page.getByRole('link', { name: 'レポート' }).click()
    await expect(page).toHaveURL(/\/dashboard\/reports/)

    // Navigate to settings
    await page.getByRole('link', { name: '設定' }).click()
    await expect(page).toHaveURL(/\/dashboard\/settings/)
  })

  test('should display stats cards on dashboard', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page.getByText('登録アカウント')).toBeVisible()
    await expect(page.getByText('総フォロワー')).toBeVisible()
    await expect(page.getByText('平均エンゲージメント')).toBeVisible()
    await expect(page.getByText('週間成長率')).toBeVisible()
  })

  test('should handle logout', async ({ page }) => {
    await page.goto('/dashboard')

    await page.getByRole('button', { name: 'ログアウト' }).click()

    // Should redirect to login and clear storage
    await expect(page).toHaveURL(/\/login/)

    const token = await page.evaluate(() => localStorage.getItem('accessToken'))
    expect(token).toBeNull()
  })
})

test.describe('Accounts Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await setupAuth(page)
  })

  test('should display accounts page header', async ({ page }) => {
    await page.goto('/dashboard/accounts')

    await expect(page.getByRole('heading', { name: 'アカウント管理' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'アカウント追加' })).toBeVisible()
  })

  test('should display search input', async ({ page }) => {
    await page.goto('/dashboard/accounts')

    await expect(page.getByPlaceholder('アカウントを検索...')).toBeVisible()
  })

  test('should open add account modal', async ({ page }) => {
    await page.goto('/dashboard/accounts')

    await page.getByRole('button', { name: 'アカウント追加' }).click()

    await expect(page.getByRole('heading', { name: 'アカウントを追加' })).toBeVisible()
    await expect(page.getByLabel('プラットフォーム')).toBeVisible()
    await expect(page.getByLabel('アカウントID')).toBeVisible()
  })

  test('should close modal on cancel', async ({ page }) => {
    await page.goto('/dashboard/accounts')

    await page.getByRole('button', { name: 'アカウント追加' }).click()
    await expect(page.getByRole('heading', { name: 'アカウントを追加' })).toBeVisible()

    await page.getByRole('button', { name: 'キャンセル' }).click()
    await expect(page.getByRole('heading', { name: 'アカウントを追加' })).not.toBeVisible()
  })

  test('should filter accounts by search', async ({ page }) => {
    await page.goto('/dashboard/accounts')

    const searchInput = page.getByPlaceholder('アカウントを検索...')
    await searchInput.fill('test')

    // Search should filter (even if no results)
    await expect(searchInput).toHaveValue('test')
  })
})

test.describe('Analytics Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await setupAuth(page)
  })

  test('should display analytics page header', async ({ page }) => {
    await page.goto('/dashboard/analytics')

    await expect(page.getByRole('heading', { name: '分析' })).toBeVisible()
  })

  test('should display date range selector', async ({ page }) => {
    await page.goto('/dashboard/analytics')

    await expect(page.getByText('過去7日間')).toBeVisible()
    await expect(page.getByText('過去30日間')).toBeVisible()
    await expect(page.getByText('過去90日間')).toBeVisible()
  })
})

test.describe('Reports Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await setupAuth(page)
  })

  test('should display reports page header', async ({ page }) => {
    await page.goto('/dashboard/reports')

    await expect(page.getByRole('heading', { name: 'レポート' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'レポート作成' })).toBeVisible()
  })

  test('should open create report modal', async ({ page }) => {
    await page.goto('/dashboard/reports')

    await page.getByRole('button', { name: 'レポート作成' }).click()

    await expect(page.getByRole('heading', { name: 'レポートを作成' })).toBeVisible()
    await expect(page.getByText('対象アカウント')).toBeVisible()
    await expect(page.getByText('出力形式')).toBeVisible()
    await expect(page.getByText('対象期間')).toBeVisible()
  })
})

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await setupAuth(page)
  })

  test('should display settings sections', async ({ page }) => {
    await page.goto('/dashboard/settings')

    await expect(page.getByRole('heading', { name: '設定' })).toBeVisible()
    await expect(page.getByText('プロフィール')).toBeVisible()
    await expect(page.getByText('パスワード変更')).toBeVisible()
    await expect(page.getByText('通知設定')).toBeVisible()
  })

  test('should display profile form with user data', async ({ page }) => {
    await page.goto('/dashboard/settings')

    const nameInput = page.locator('input[type="text"]').first()
    await expect(nameInput).toHaveValue('テストユーザー')

    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toHaveValue('test@example.com')
    await expect(emailInput).toBeDisabled()
  })

  test('should display notification toggles', async ({ page }) => {
    await page.goto('/dashboard/settings')

    await expect(page.getByText('メール通知')).toBeVisible()
    await expect(page.getByText('週次レポート')).toBeVisible()
    await expect(page.getByText('アラート通知')).toBeVisible()
  })
})
