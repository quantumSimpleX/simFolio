import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from './renderWithProviders'
import {
  StatusBar, Logo, Mark, SimPill, CTA, GhostCTA, Field, SocialBtn, Divider,
  LangToggle, ThemeToggle, FlagIcon, Eyebrow, TermUnderline, StatusPill, HeroAvatar,
  GuideAvatar, ProgressDots, GoalCard, MktStatus, ReceiptRow,
} from '../components/Primitives'
import { TopNav, BottomNav, PageHeader, BackHeader } from '../components/Nav'
import BrandPanel from '../components/BrandPanel'
import QSWordmark from '../components/QSWordmark'

describe('Primitives', () => {
  it('renders static primitives', () => {
    render(
      <>
        <StatusBar/><Logo/><Mark/><SimPill/><Divider/><Eyebrow>Label</Eyebrow>
        <SocialBtn provider="Google"/><HeroAvatar initials="WB" color="#8A60EB"/>
        <GuideAvatar/><ProgressDots step={2} total={6}/><MktStatus open/><MktStatus open={false}/>
        <ReceiptRow label="Fee" value="$1.00" bold/><ReceiptRow label="slippage" value="x" dotted/>
      </>,
    )
    expect(screen.getByText('Markets open')).toBeInTheDocument()
    expect(screen.getByText('Markets closed')).toBeInTheDocument()
    expect(screen.getByText('2 of 6')).toBeInTheDocument()
  })

  it('CTA fires onClick unless disabled or loading', () => {
    const onClick = vi.fn()
    const { rerender } = render(<CTA label="Go" onClick={onClick}/>)
    fireEvent.click(screen.getByText('Go'))
    expect(onClick).toHaveBeenCalledTimes(1)
    rerender(<CTA label="Go" disabled onClick={onClick}/>)
    fireEvent.click(screen.getByText('Go'))
    expect(onClick).toHaveBeenCalledTimes(1)
    rerender(<CTA label="Go" loading onClick={onClick}/>)
    fireEvent.click(screen.getByText('Please wait…'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('GhostCTA and GoalCard handle clicks', () => {
    const a = vi.fn(), b = vi.fn()
    render(<><GhostCTA label="Ghost" onClick={a}/><GoalCard label="Goal" selected onClick={b}/></>)
    fireEvent.click(screen.getByText('Ghost'))
    fireEvent.click(screen.getByText('Goal'))
    expect(a).toHaveBeenCalled()
    expect(b).toHaveBeenCalled()
  })

  it('Field renders live, wireframe, and error modes', () => {
    const onChange = vi.fn()
    render(
      <>
        <Field label="Email" placeholder="x@y.z" value="" onChange={onChange}/>
        <Field label="Static" placeholder="readonly"/>
        <Field label="Bad" placeholder="p" value="" onChange={onChange} error errorMsg="Nope"/>
      </>,
    )
    fireEvent.change(screen.getByPlaceholderText('x@y.z'), { target: { value: 'hi' } })
    expect(onChange).toHaveBeenCalled()
    expect(screen.getByText('Nope')).toBeInTheDocument()
    expect(screen.getByText('readonly')).toBeInTheDocument()
  })

  it('StatusPill maps all statuses', () => {
    render(
      <>
        {['pending', 'queued', 'filled', 'cancelled', 'partial'].map(s => <StatusPill key={s} status={s}/>)}
        <StatusPill/>
      </>,
    )
    expect(screen.getByText('Queued')).toBeInTheDocument()
    expect(screen.getByText('Partial')).toBeInTheDocument()
  })

  it('TermUnderline shows a glossary tooltip on hover', () => {
    renderWithProviders(<TermUnderline>slippage</TermUnderline>)
    fireEvent.mouseEnter(screen.getByText('slippage'))
    expect(document.body.textContent).toMatch(/difference between/i)
    fireEvent.mouseLeave(screen.getByText('slippage'))
  })

  it('TermUnderline falls back to plain underline for unknown terms', () => {
    renderWithProviders(<TermUnderline>mystery-term</TermUnderline>)
    fireEvent.mouseEnter(screen.getByText('mystery-term'))
  })

  it('TermUnderline opens a bottom sheet with EN/繁中 tabs on mobile', () => {
    const original = window.innerWidth
    window.innerWidth = 375
    try {
      renderWithProviders(<TermUnderline>slippage</TermUnderline>)
      fireEvent.click(screen.getByText('slippage'))
      expect(screen.getByText('EN')).toBeInTheDocument()
      expect(screen.getByText('繁中')).toBeInTheDocument()
      expect(document.body.textContent).toMatch(/difference between/i)
    } finally {
      window.innerWidth = original
    }
  })

  it('LangToggle and ThemeToggle toggle through context (icon buttons)', () => {
    localStorage.clear()
    const { container } = renderWithProviders(<><LangToggle/><ThemeToggle/></>)

    // Language: single flag-icon button, starts at English (US flag), toggles to TW.
    const lang = container.querySelector('[data-testid="lang-toggle"]')
    expect(lang).toHaveAttribute('aria-label', 'Switch to Traditional Chinese')
    fireEvent.click(lang)
    expect(lang).toHaveAttribute('aria-label', 'Switch to English')

    // Theme: single Sun/Moon icon button, toggles light ↔ dark + sets data-theme.
    const theme = container.querySelector('[data-testid="theme-toggle"]')
    expect(theme).toHaveAttribute('aria-label', 'Switch to dark mode')
    fireEvent.click(theme)
    expect(theme).toHaveAttribute('aria-label', 'Switch to light mode')
    expect(document.documentElement.dataset.theme).toBe('dark')
    fireEvent.click(theme)
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('FlagIcon renders US and TW flag svgs', () => {
    const { container } = render(<><FlagIcon country="US"/><FlagIcon country="TW"/></>)
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBe(2)
  })
})

describe('Nav', () => {
  it('TopNav renders tabs and navigates', async () => {
    renderWithProviders(<TopNav active="portfolio"/>)
    expect(await screen.findByText('Portfolio')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Markets'))
    fireEvent.click(screen.getByTitle('Profile'))
  })

  it('BottomNav renders all tabs', () => {
    renderWithProviders(<BottomNav active="markets"/>)
    fireEvent.click(screen.getByText('Orders'))
  })

  it('PageHeader and BackHeader render', () => {
    const onBack = vi.fn()
    renderWithProviders(<><PageHeader title="Title" right={<span>R</span>}/><BackHeader title="Back" onBack={onBack}/></>)
    fireEvent.click(screen.getByText('← Back'))
    expect(onBack).toHaveBeenCalled()
  })
})

describe('Brand components', () => {
  it('BrandPanel and QSWordmark render', () => {
    render(<><BrandPanel/><QSWordmark onDark size={28}/></>)
    expect(screen.getByText(/Learn investing/)).toBeInTheDocument()
  })
})
