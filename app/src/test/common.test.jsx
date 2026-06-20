import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TickerBadge from '../components/common/TickerBadge'
import StatCard from '../components/common/StatCard'
import DetailRow from '../components/common/DetailRow'

describe('TickerBadge', () => {
  it('M1: renders the ticker text', () => {
    render(<TickerBadge ticker="AAPL" />)
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('M2: size variants apply the right box classes', () => {
    const { rerender } = render(<TickerBadge ticker="A" size="lg" />)
    let chip = screen.getByText('A')
    expect(chip).toHaveClass('h-[46px]')
    expect(chip).toHaveClass('w-[46px]')

    rerender(<TickerBadge ticker="A" />) // default md
    chip = screen.getByText('A')
    expect(chip).toHaveClass('h-[38px]')
    expect(chip).toHaveClass('w-[38px]')

    rerender(<TickerBadge ticker="A" size="sm" />)
    chip = screen.getByText('A')
    expect(chip).toHaveClass('h-9')
    expect(chip).toHaveClass('w-9')
  })

  it('M3: highlighted toggles brand vs muted classes', () => {
    const { rerender } = render(<TickerBadge ticker="A" highlighted />)
    let chip = screen.getByText('A')
    expect(chip).toHaveClass('bg-ame-100')
    expect(chip).toHaveClass('text-ame-600')

    rerender(<TickerBadge ticker="A" />)
    chip = screen.getByText('A')
    expect(chip).toHaveClass('bg-ink-50')
    expect(chip).toHaveClass('text-ink-500')
  })

  it('M4: always has rounded-input and font-bold', () => {
    render(<TickerBadge ticker="A" />)
    const chip = screen.getByText('A')
    expect(chip).toHaveClass('rounded-input')
    expect(chip).toHaveClass('font-bold')
  })
})

describe('StatCard', () => {
  it('N1: renders label and value (ReactNode label supported)', () => {
    render(<StatCard label={<span>Market cap</span>} value="$2.5T" />)
    expect(screen.getByText('Market cap')).toBeInTheDocument()
    expect(screen.getByText('$2.5T')).toBeInTheDocument()
  })

  it('N2: valueColor applies the class to the value element', () => {
    render(<StatCard label="L" value="42" valueColor="text-aqua-600" />)
    expect(screen.getByText('42')).toHaveClass('text-aqua-600')
  })

  it('N3: mobile toggles value font size', () => {
    const { rerender } = render(<StatCard label="L" value="42" mobile />)
    expect(screen.getByText('42')).toHaveClass('text-[17px]')

    rerender(<StatCard label="L" value="42" />)
    expect(screen.getByText('42')).toHaveClass('text-xl')
  })

  it('N4: card wrapper has card chrome classes', () => {
    const { container } = render(<StatCard label="L" value="42" />)
    const wrapper = container.firstChild
    expect(wrapper).toHaveClass('rounded-card')
    expect(wrapper).toHaveClass('border')
    expect(wrapper).toHaveClass('border-ink-100')
    expect(wrapper).toHaveClass('bg-white')
  })
})

describe('DetailRow', () => {
  it('O1: renders label and value', () => {
    render(<DetailRow label="Order type" value="Market order" />)
    expect(screen.getByText('Order type')).toBeInTheDocument()
    expect(screen.getByText('Market order')).toBeInTheDocument()
  })

  it('O2: bold toggles value weight', () => {
    const { rerender } = render(<DetailRow label="L" value="V" bold />)
    expect(screen.getByText('V')).toHaveClass('font-bold')

    rerender(<DetailRow label="L" value="V" />)
    expect(screen.getByText('V')).toHaveClass('font-medium')
  })

  it('O3: row wrapper has the divider border', () => {
    const { container } = render(<DetailRow label="L" value="V" />)
    const wrapper = container.firstChild
    expect(wrapper).toHaveClass('border-b')
    expect(wrapper).toHaveClass('border-ink-50')
  })
})
