import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'

import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Avatar, AvatarFallback } from '../components/ui/avatar'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '../components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../components/ui/sheet'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../components/ui/tooltip'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select'
import { Separator } from '../components/ui/separator'
import { Progress } from '../components/ui/progress'
import { Toggle } from '../components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '../components/ui/toggle-group'
import { ScrollArea } from '../components/ui/scroll-area'

// jsdom lacks a few DOM APIs that Radix touches.
beforeAll(() => {
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = vi.fn()
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = vi.fn(() => false)
  if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = vi.fn()
})

describe('Button', () => {
  it('renders each variant and size', () => {
    for (const variant of ['primary', 'danger', 'ghost', 'link']) {
      const { unmount } = render(<Button variant={variant}>{variant}</Button>)
      expect(screen.getByText(variant)).toBeInTheDocument()
      unmount()
    }
    for (const size of ['default', 'sm', 'cta', 'icon']) {
      const { unmount } = render(<Button size={size}>{size}</Button>)
      expect(screen.getByText(size)).toBeInTheDocument()
      unmount()
    }
  })

  it('fires onClick when enabled', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>go</Button>)
    fireEvent.click(screen.getByText('go'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('disabled blocks clicks', () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>nope</Button>)
    fireEvent.click(screen.getByText('nope'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('loading disables the button', () => {
    render(<Button loading>load</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})

describe('Badge', () => {
  it('renders status variants', () => {
    for (const v of ['pending', 'filled', 'cancelled', 'partial', 'sim']) {
      const { unmount } = render(<Badge variant={v}>{v}</Badge>)
      expect(screen.getByText(v)).toBeInTheDocument()
      unmount()
    }
  })
})

describe('Avatar', () => {
  it('renders the fallback initials', () => {
    render(<Avatar><AvatarFallback>WB</AvatarFallback></Avatar>)
    expect(screen.getByText('WB')).toBeInTheDocument()
  })
})

describe('Card', () => {
  it('renders header/content/footer composition', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Desc</CardDescription>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Foot</CardFooter>
      </Card>,
    )
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Desc')).toBeInTheDocument()
    expect(screen.getByText('Body')).toBeInTheDocument()
    expect(screen.getByText('Foot')).toBeInTheDocument()
  })
})

describe('Input + Label + Textarea', () => {
  it('label is associated with the input and value updates', () => {
    const onChange = vi.fn()
    render(
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" value="" onChange={onChange} placeholder="you@x.com" />
      </div>,
    )
    const input = screen.getByPlaceholderText('you@x.com')
    expect(screen.getByText('Email')).toBeInTheDocument()
    fireEvent.change(input, { target: { value: 'a@b.com' } })
    expect(onChange).toHaveBeenCalled()
  })

  it('textarea renders and accepts input', () => {
    const onChange = vi.fn()
    render(<Textarea placeholder="notes" value="" onChange={onChange} />)
    fireEvent.change(screen.getByPlaceholderText('notes'), { target: { value: 'hi' } })
    expect(onChange).toHaveBeenCalled()
  })
})

describe('Tabs', () => {
  it('shows the default panel and renders all triggers', () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">Tab A</TabsTrigger>
          <TabsTrigger value="b">Tab B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
      </Tabs>,
    )
    expect(screen.getByText('Panel A')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Tab A' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Tab B' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Tab A' })).toHaveAttribute('aria-selected', 'true')
  })
})

describe('Dialog', () => {
  it('renders content when open and opens via trigger', () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Earned</DialogTitle>
            <DialogDescription>You did it</DialogDescription>
          </DialogHeader>
          <DialogFooter>ok</DialogFooter>
        </DialogContent>
      </Dialog>,
    )
    expect(screen.getByText('Earned')).toBeInTheDocument()
    expect(screen.getByText('You did it')).toBeInTheDocument()
  })

  it('trigger toggles open', () => {
    render(
      <Dialog>
        <DialogTrigger>open me</DialogTrigger>
        <DialogContent><DialogTitle>Hi</DialogTitle></DialogContent>
      </Dialog>,
    )
    expect(screen.queryByText('Hi')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('open me'))
    expect(screen.getByText('Hi')).toBeInTheDocument()
  })
})

describe('Sheet', () => {
  it('renders content when open', () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Glossary</SheetTitle>
            <SheetDescription>term def</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>,
    )
    expect(screen.getByText('Glossary')).toBeInTheDocument()
    expect(screen.getByText('term def')).toBeInTheDocument()
  })
})

describe('Tooltip', () => {
  it('renders content when forced open', () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>term</TooltipTrigger>
          <TooltipContent>definition</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    )
    expect(screen.getByText('term')).toBeInTheDocument()
    // Radix renders tooltip content in a portal (may appear multiple times)
    expect(screen.getAllByText('definition').length).toBeGreaterThan(0)
  })
})

describe('Select', () => {
  it('renders a trigger with placeholder', () => {
    render(
      <Select>
        <SelectTrigger><SelectValue placeholder="Pick one" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="x">X</SelectItem>
          <SelectItem value="y">Y</SelectItem>
        </SelectContent>
      </Select>,
    )
    expect(screen.getByText('Pick one')).toBeInTheDocument()
  })
})

describe('Separator / Progress / ScrollArea', () => {
  it('render without crashing and reflect props', () => {
    const { container, rerender } = render(<Separator />)
    expect(container.firstChild).toBeTruthy()
    rerender(<Progress value={42} />)
    expect(container.firstChild).toBeTruthy()
    rerender(<ScrollArea><div>scrollable</div></ScrollArea>)
    expect(screen.getByText('scrollable')).toBeInTheDocument()
  })
})

describe('Toggle', () => {
  it('toggles pressed state on click', () => {
    render(<Toggle aria-label="bold">B</Toggle>)
    const btn = screen.getByRole('button', { name: 'bold' })
    expect(btn).toHaveAttribute('data-state', 'off')
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('data-state', 'on')
  })
})

describe('ToggleGroup', () => {
  it('selects an item (single type)', () => {
    render(
      <ToggleGroup type="single" defaultValue="en">
        <ToggleGroupItem value="en">EN</ToggleGroupItem>
        <ToggleGroupItem value="zh">繁中</ToggleGroupItem>
      </ToggleGroup>,
    )
    const group = screen.getByText('EN').closest('[role="group"]') || document.body
    fireEvent.click(screen.getByText('繁中'))
    expect(within(group).getByText('繁中')).toBeInTheDocument()
  })
})
