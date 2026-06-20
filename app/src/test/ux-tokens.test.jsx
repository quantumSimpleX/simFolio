// Suite 5 — Token / theming
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { renderWithProviders } from './renderWithProviders'
import { ScreenShell } from '../screens/onboarding/shell'

const here = dirname(fileURLToPath(import.meta.url))
const srcRoot = resolve(here, '..')
const readSrc = (rel) => readFileSync(resolve(srcRoot, rel), 'utf8')

describe('Suite 5 — tokens / theming', () => {
  // T5.1 — TradeReceipt imports status colors from tokens.js, not inline var(--…) (B8)
  it('T5.1 TradeReceipt sources realised P&L colors from tokens.js (C.*), not literal var() strings', () => {
    const src = readSrc('screens/trade/TradeReceipt.jsx')
    // It imports the colour token object.
    expect(src).toMatch(/import\s*\{\s*C\s*\}\s*from\s*['"]\.\.\/\.\.\/tokens['"]/)
    // The realised gain/loss ReceiptRow uses C.aqua600 / C.red rather than inline var() strings.
    expect(src).toMatch(/valueColor=\{pnlPositive\s*\?\s*C\.aqua600\s*:\s*C\.red\}/)
    // The two status-colour literals B8 targeted are gone from the realised P&L path.
    expect(src).not.toMatch(/valueColor=\{pnlPositive\s*\?\s*['"]var\(--aqua-600\)['"]/)
  })

  // T5.2 — Onboarding mobile top bar uses bg-paper not bg-white (A10)
  it('T5.2 onboarding mobile top bar uses bg-paper (no bg-white seam)', () => {
    const src = readSrc('screens/onboarding/shell.jsx')
    // The mobile top bar row must be bg-paper.
    expect(src).toMatch(/border-b border-ink-100 bg-paper/)
    // And must not carry a bg-white that would seam against the paper body.
    expect(src).not.toMatch(/border-b border-ink-100 bg-white/)
  })

  // T5.2b — render assertion: the mobile shell's top bar carries bg-paper at runtime.
  it('T5.2b ScreenShell mobile top bar element has bg-paper class', () => {
    window.innerWidth = 390
    window.dispatchEvent(new Event('resize'))
    const { container } = renderWithProviders(<ScreenShell><div>body</div></ScreenShell>)
    // The top bar is the bordered row containing the Logo + SimPill.
    const topBar = container.querySelector('.border-b.border-ink-100')
    expect(topBar).toBeTruthy()
    expect(topBar.className).toMatch(/bg-paper/)
    expect(topBar.className).not.toMatch(/bg-white/)
  })
})
