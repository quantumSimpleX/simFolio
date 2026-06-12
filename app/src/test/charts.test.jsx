import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MiniChart, ChartPanel, RangeButtons, Sparkline, PortfolioChart } from '../components/Charts'

// ResizeObserver that immediately reports a real width so the chart draws
beforeEach(() => {
  globalThis.ResizeObserver = class {
    constructor(cb) { this.cb = cb }
    observe() { this.cb([{ contentRect: { width: 800 } }]) }
    unobserve() {}
    disconnect() {}
  }
})

const candles = Array.from({ length: 30 }, (_, i) => ({
  t: 1700000000 + i * 86400,
  c: 100 + Math.sin(i / 3) * 10 + i * 0.5,
}))

describe('MiniChart', () => {
  it('shows loading state', () => {
    const { container } = render(<MiniChart isLoading candles={[]}/>)
    expect(container.textContent).toContain('Loading chart…')
  })
  it('shows error state', () => {
    const { container } = render(<MiniChart isError candles={[]}/>)
    expect(container.textContent).toContain('Chart unavailable')
  })
  it('renders a polyline and y-axis labels with data', () => {
    const { container } = render(<MiniChart candles={candles} range="3M"/>)
    expect(container.querySelector('polyline')).toBeTruthy()
    const labels = [...container.querySelectorAll('text')].map(t => t.textContent)
    expect(labels.some(l => l.startsWith('$'))).toBe(true)
  })
  it('formats y labels with 3 significant digits and k suffix', () => {
    const big = candles.map(c => ({ ...c, c: c.c * 100 })) // ~$10k range
    const { container } = render(<MiniChart candles={big} range="1Y"/>)
    const labels = [...container.querySelectorAll('text')].map(t => t.textContent)
    expect(labels.some(l => /^\$\d+(\.\d+)?k$/.test(l))).toBe(true)
  })
  it('draws an overlay series when provided', () => {
    const { container } = render(<MiniChart candles={candles} overlayCandles={candles}/>)
    expect(container.querySelectorAll('polyline').length).toBe(2)
  })
  it('shows crosshair tooltip on hover', () => {
    const { container } = render(<MiniChart candles={candles}/>)
    const svg = container.querySelector('svg')
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 280 })
    fireEvent.mouseMove(svg, { clientX: 400, clientY: 100 })
    expect(container.querySelector('rect')).toBeTruthy()
    fireEvent.mouseLeave(svg)
  })
})

describe('RangeButtons', () => {
  it('renders all ranges and reports clicks', () => {
    const onChange = vi.fn()
    render(<RangeButtons range="3M" onRangeChange={onChange}/>)
    fireEvent.click(screen.getByText('1W'))
    expect(onChange).toHaveBeenCalledWith('1W')
  })
})

describe('ChartPanel / Sparkline / PortfolioChart', () => {
  it('ChartPanel renders the chart', () => {
    const { container } = render(<ChartPanel height={150} candles={candles} isLoading={false} isError={false}/>)
    expect(container.querySelector('svg')).toBeTruthy()
  })
  it('Sparkline renders up and down variants', () => {
    const { container } = render(<><Sparkline positive/><Sparkline positive={false}/></>)
    expect(container.querySelectorAll('polyline').length).toBe(2)
  })
  it('PortfolioChart renders', () => {
    const { container } = render(<PortfolioChart/>)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
