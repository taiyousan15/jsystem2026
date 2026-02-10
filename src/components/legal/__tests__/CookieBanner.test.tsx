// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CookieBanner } from '../CookieBanner'

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

describe('CookieBanner', () => {
  let store: Record<string, string>

  beforeEach(() => {
    store = {}
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => store[key] ?? null)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      store[key] = value
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows banner when no consent stored', () => {
    render(<CookieBanner />)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText(/プライバシーポリシー/)).toBeTruthy()
  })

  it('hides banner when consent is already accepted', () => {
    store['gamifi-cookie-consent'] = 'accepted'
    render(<CookieBanner />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('hides banner when consent is already rejected', () => {
    store['gamifi-cookie-consent'] = 'rejected'
    render(<CookieBanner />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('stores accepted consent and hides banner on accept', () => {
    render(<CookieBanner />)
    fireEvent.click(screen.getByText('すべて許可'))
    expect(store['gamifi-cookie-consent']).toBe('accepted')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('stores rejected consent and hides banner on reject', () => {
    render(<CookieBanner />)
    fireEvent.click(screen.getByText('必須のみ'))
    expect(store['gamifi-cookie-consent']).toBe('rejected')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('links to privacy policy page', () => {
    render(<CookieBanner />)
    const link = screen.getByText('プライバシーポリシー')
    expect(link.getAttribute('href')).toBe('/legal/privacy')
  })
})
