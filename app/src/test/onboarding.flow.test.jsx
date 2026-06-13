// Interactive walk-through of the full onboarding flow.
import { describe, it, expect } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from './renderWithProviders'
import Onboarding from '../screens/onboarding/Onboarding'

const goalTitle = 'Shielding purchasing power from inflation'
const NONE = 'None of the above'

const clickContinue = () => fireEvent.click(screen.getByText(/^Continue\s*→$/))

async function answerGoalQuestion() {
  fireEvent.click(await screen.findByText(goalTitle))
  clickContinue()
}

// Remaining questions are shuffled; answer whatever is on screen.
async function answerCurrentQuestion() {
  const numInput = document.querySelector('input[inputmode="numeric"]')
  if (numInput) {
    fireEvent.change(numInput, { target: { value: '10000' } })
    clickContinue()
    return
  }
  // single-choice GoalCards auto-advance ~180ms after click
  const card = document.querySelector('[data-testid="goal-card"]')
  expect(card).toBeTruthy()
  fireEvent.click(card)
  await new Promise(r => setTimeout(r, 220))
}

async function walkToStockScreen() {
  await answerGoalQuestion()
  for (let i = 0; i < 6; i++) {
    if (document.body.textContent.includes('Any stocks, ETFs')) break
    await waitFor(() => {}) // flush
    await answerCurrentQuestion()
  }
  await waitFor(() => expect(document.body.textContent).toContain('Any stocks, ETFs'))
}

describe('onboarding flow', () => {
  it('multi-select goal: picking a goal disables None of the above', async () => {
    renderWithProviders(<Onboarding/>)
    fireEvent.click(await screen.findByText(goalTitle))
    // None of the above is now unclickable — clicking it must not reveal the textarea
    fireEvent.click(screen.getByText(NONE))
    expect(screen.queryByPlaceholderText(/your own words/i)).not.toBeInTheDocument()
    // Continue becomes enabled and advances to question 2
    clickContinue()
    await waitFor(() => expect(screen.queryByText(goalTitle)).not.toBeInTheDocument())
  })

  it('None of the above reveals a free-form text box', async () => {
    renderWithProviders(<Onboarding/>)
    fireEvent.click(await screen.findByText(NONE))
    expect(await screen.findByPlaceholderText(/your own words/i)).toBeInTheDocument()
  })

  it('Back button restores the previous answer', async () => {
    renderWithProviders(<Onboarding/>)
    await answerGoalQuestion()
    await waitFor(() => expect(screen.queryByText(goalTitle)).not.toBeInTheDocument())
    fireEvent.click(screen.getByText('← Back'))
    // goal question returns with the prior pick still checked
    expect(await screen.findByText(goalTitle)).toBeInTheDocument()
    expect(document.body.textContent).toContain('✓')
  })

  it('walks all questions to the stock screen, then I-have-no-idea → expert selection', async () => {
    renderWithProviders(<Onboarding/>)
    await walkToStockScreen()

    // add + remove a stock chip
    const stockInput = screen.getByPlaceholderText(/AAPL, Tesla/i)
    fireEvent.change(stockInput, { target: { value: 'aapl' } })
    fireEvent.keyDown(stockInput, { key: 'Enter' })
    expect(document.body.textContent).toContain('AAPL')
    expect(document.body.textContent).toContain("Now let's go buy some stocks")
    fireEvent.click(screen.getByText('×'))

    // no stocks → "I have no idea" → HeroSelect
    fireEvent.click(screen.getByText(/I have no idea/))
    expect(await screen.findByText(/ask some of these experts/i)).toBeInTheDocument()
    // BrandPanel also lists Warren Buffett on desktop — pick the grid card (last match)
    const warrenCards = screen.getAllByText('Warren Buffett')
    expect(warrenCards.length).toBeGreaterThan(0)

    // CTA disabled until a hero is picked, then completes
    expect(screen.getByText(/Pick an expert/i)).toBeInTheDocument()
    fireEvent.click(warrenCards.at(-1))
    fireEvent.click(await screen.findByText(/Ask Warren Buffett/))
  }, 15000)
})
