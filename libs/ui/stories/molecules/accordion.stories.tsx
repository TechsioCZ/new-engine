import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Accordion } from '../../src/molecules/accordion'
import { Button } from '../../src/atoms/button'
import { Badge } from '../../src/atoms/badge'

const meta: Meta<typeof Accordion> = {
  title: 'Molecules/Accordion',
  component: Accordion,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'inline-radio' },
      options: ['sm', 'md', 'lg'],
      description: 'Sets the size of the accordion items',
    },
    shadow: {
      control: { type: 'inline-radio' },
      options: ['none', 'sm', 'md'],
      description: 'Sets the shadow of the accordion',
    },
    variant: {
    control: { type: 'inline-radio' },
    options: ['default', 'borderless', 'child'],
    description: 'Sets the visual variant of the accordion',
  },
    multiple: {
      control: 'boolean',
      description: 'Allows expanding multiple items simultaneously',
    },
    collapsible: {
      control: 'boolean',
      description: 'Allows collapsing all items',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables interaction with the accordion',
    },
  },
}

export default meta
type Story = StoryObj<typeof Accordion>

export const Playground: Story = {
  args: {
    size: 'md',
    shadow: 'none',
    variant: 'default',
    multiple: false,
    collapsible: true,
    disabled: false,
  },
  render: (args) => (
    <div className="w-md h-96">
      <Accordion {...args}>
        <Accordion.Item value="item-1">
          <Accordion.Header>
            <Accordion.Title>
              What is an Accordion?
              <Accordion.Subtitle>Accordion with subtitle</Accordion.Subtitle>
            </Accordion.Title>
            <Accordion.Indicator />
          </Accordion.Header>
          <Accordion.Content>
            Accordion is a UI component that allows collapsing and expanding content, saving space
            on the page and enabling users to view only the information they're interested in.
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="item-2">
          <Accordion.Header>
            <Accordion.Title>How to use an Accordion?</Accordion.Title>
            <Accordion.Indicator />
          </Accordion.Header>
          <Accordion.Content>
            By clicking on the accordion header, its content expands or collapses. You can have
            either one or multiple accordions open simultaneously, depending on the component's
            configuration.
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="item-3" disabled>
          <Accordion.Header>
            <Accordion.Title>Why use an Accordion?</Accordion.Title>
            <Accordion.Indicator />
          </Accordion.Header>
          <Accordion.Content>
            Accordion is useful for organizing content that may be lengthy or complex. Users can
            easily navigate through relevant sections without needing to scroll through the entire
            page.
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </div>
  ),
}

export const Multiple: Story = {
  render: () => (
    <div className="w-md">
      <Accordion collapsible multiple>
        <Accordion.Item value="item-1">
          <Accordion.Header>
            <Accordion.Title>
              What is an Accordion?
              <Accordion.Subtitle>Accordion with subtitle</Accordion.Subtitle>
            </Accordion.Title>
            <Accordion.Indicator />
          </Accordion.Header>
          <Accordion.Content>
            Accordion is a UI component that allows collapsing and expanding content.
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="item-2">
          <Accordion.Header>
            <Accordion.Title>How to use an Accordion?</Accordion.Title>
            <Accordion.Indicator />
          </Accordion.Header>
          <Accordion.Content>
            Click on headers to expand or collapse content sections.
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="item-3">
          <Accordion.Header>
            <Accordion.Title>Why use an Accordion?</Accordion.Title>
            <Accordion.Indicator />
          </Accordion.Header>
          <Accordion.Content>
            Accordion is useful for organizing lengthy or complex content.
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </div>
  ),
}

export const ShadowVariants: Story = {
  render: () => (
    <div className="w-md flex flex-col gap-300">
      <div>
        <h3 className="mb-150 text-sm font-medium">Shadow: none (default)</h3>
        <Accordion shadow="none">
          <Accordion.Item value="item-1">
            <Accordion.Header>
              <Accordion.Title>Item with no shadow</Accordion.Title>
              <Accordion.Indicator />
            </Accordion.Header>
            <Accordion.Content>Content for no shadow variant</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </div>

      <div>
        <h3 className="mb-150 text-sm font-medium">Shadow: sm</h3>
        <Accordion shadow="sm">
          <Accordion.Item value="item-1">
            <Accordion.Header>
              <Accordion.Title>Item with small shadow</Accordion.Title>
              <Accordion.Indicator />
            </Accordion.Header>
            <Accordion.Content>Content for small shadow variant</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </div>

      <div>
        <h3 className="mb-150 text-sm font-medium">Shadow: md</h3>
        <Accordion shadow="md">
          <Accordion.Item value="item-1">
            <Accordion.Header>
              <Accordion.Title>Item with medium shadow</Accordion.Title>
              <Accordion.Indicator />
            </Accordion.Header>
            <Accordion.Content>Content for medium shadow variant</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </div>
    </div>
  ),
}

export const SizeVariants: Story = {
  render: () => (
    <div className="w-md flex flex-col gap-300">
      <div>
        <h3 className="mb-150 text-sm font-medium">Size: sm</h3>
        <Accordion size="sm">
          <Accordion.Item value="item-1">
            <Accordion.Header>
              <Accordion.Title>
                Small Accordion
                <Accordion.Subtitle>With subtitle</Accordion.Subtitle>
              </Accordion.Title>
              <Accordion.Indicator />
            </Accordion.Header>
            <Accordion.Content>Small size content text</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </div>

      <div>
        <h3 className="mb-150 text-sm font-medium">Size: md (default)</h3>
        <Accordion size="md">
          <Accordion.Item value="item-1">
            <Accordion.Header>
              <Accordion.Title>
                Medium Accordion
                <Accordion.Subtitle>With subtitle</Accordion.Subtitle>
              </Accordion.Title>
              <Accordion.Indicator />
            </Accordion.Header>
            <Accordion.Content>Medium size content text</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </div>

      <div>
        <h3 className="mb-150 text-sm font-medium">Size: lg</h3>
        <Accordion size="lg">
          <Accordion.Item value="item-1">
            <Accordion.Header>
              <Accordion.Title>
                Large Accordion
                <Accordion.Subtitle>With subtitle</Accordion.Subtitle>
              </Accordion.Title>
              <Accordion.Indicator />
            </Accordion.Header>
            <Accordion.Content>Large size content text</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </div>
    </div>
  ),
}

export const CustomContent: Story = {
  name: 'Custom Content (Compound Pattern Benefit)',
  render: () => (
    <div className="w-lg">
      <Accordion collapsible multiple>
        <Accordion.Item value="custom-1">
          <Accordion.Header>
            <span className="inline-flex items-center gap-200 flex-1">
              <Badge variant="primary">
                NEW
              </Badge>
              <Accordion.Title>Custom Header with Badge</Accordion.Title>
            </span>
            <Accordion.Indicator />
          </Accordion.Header>
          <Accordion.Content>
            <div className="flex flex-col gap-150">
              <p>This demonstrates the flexibility of compound pattern.</p>
              <Button size="sm" variant="secondary">
                Action Button
              </Button>
            </div>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="custom-2">
          <Accordion.Header>
            <span className="inline-flex flex-col p-200">
              <Accordion.Title className='px-0 py-0'>Product Features</Accordion.Title>
              <Accordion.Subtitle className='text-left'>Click to explore all features</Accordion.Subtitle>
            </span>
            <span className="inline-flex items-center gap-100">
              <Badge variant="tertiary">
                5 items
              </Badge>
              <Accordion.Indicator />
            </span>
          </Accordion.Header>
          <Accordion.Content>
            <ul className="list-disc pl-200">
              <li>Feature 1: Advanced analytics</li>
              <li>Feature 2: Real-time collaboration</li>
              <li>Feature 3: Cloud sync</li>
              <li>Feature 4: Offline mode</li>
              <li>Feature 5: API access</li>
            </ul>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="custom-3">
          <Accordion.Header>
            <Accordion.Title>Settings & Configuration</Accordion.Title>
            <Accordion.Indicator />
          </Accordion.Header>
          <Accordion.Content>
            <div className="flex flex-col gap-200">
              <div className="flex justify-between items-center">
                <span>Enable notifications</span>
                <Button size="sm" variant="secondary" theme="borderless">
                  Configure
                </Button>
              </div>
              <div className="flex justify-between items-center">
                <span>Auto-save</span>
                <Button size="sm" variant="secondary" theme="borderless">
                  Configure
                </Button>
              </div>
            </div>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </div>
  ),
}

export const AllVariants: Story = {
  render: () => (
    <div className="w-md flex flex-col gap-300">
      <div>
        <h3 className="mb-150 text-sm font-medium">Variant: default</h3>
        <Accordion variant="default" collapsible>
          <Accordion.Item value="item-1">
            <Accordion.Header>
              <Accordion.Title>Default Accordion</Accordion.Title>
              <Accordion.Indicator />
            </Accordion.Header>
            <Accordion.Content>
              Default accordion with borders and standard styling.
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </div>

      <div>
        <h3 className="mb-150 text-sm font-medium">Variant: borderless</h3>
        <Accordion variant="borderless" collapsible>
          <Accordion.Item value="item-1">
            <Accordion.Header>
              <Accordion.Title>Borderless Accordion</Accordion.Title>
              <Accordion.Indicator />
            </Accordion.Header>
            <Accordion.Content>
              Borderless accordion for a cleaner, minimalist look.
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </div>

      <div>
        <h3 className="mb-150 text-sm font-medium">Nested comparison: default vs child</h3>
        <div className="flex flex-col gap-200">
          {/* Nested with default - has own styling */}
          <Accordion variant="default" collapsible defaultValue={['parent-default']} className="flex-1">
            <Accordion.Item value="parent-default">
              <Accordion.Header>
                <Accordion.Title>variant="default"</Accordion.Title>
                <Accordion.Indicator />
              </Accordion.Header>
              <Accordion.Content>
                <Accordion variant="default" collapsible defaultValue={['nested-default']}>
                  <Accordion.Item value="nested-default">
                    <Accordion.Header>
                      <Accordion.Title>Nested (default)</Accordion.Title>
                      <Accordion.Indicator />
                    </Accordion.Header>
                    <Accordion.Content>
                      ← Own padding & background
                    </Accordion.Content>
                  </Accordion.Item>
                </Accordion>
              </Accordion.Content>
            </Accordion.Item>
          </Accordion>

          {/* Nested with child - inherits parent */}
          <Accordion variant="default" collapsible defaultValue={['parent-child']} className="flex-1">
            <Accordion.Item value="parent-child">
              <Accordion.Header>
                <Accordion.Title>variant="child"</Accordion.Title>
                <Accordion.Indicator />
              </Accordion.Header>
              <Accordion.Content>
                <Accordion variant="child" collapsible defaultValue={['nested-child']}>
                  <Accordion.Item value="nested-child">
                    <Accordion.Header>
                      <Accordion.Title>Nested (child)</Accordion.Title>
                      <Accordion.Indicator />
                    </Accordion.Header>
                    <Accordion.Content>
                      ← Inherits (bg-inherit, py-0)
                    </Accordion.Content>
                  </Accordion.Item>
                </Accordion>
              </Accordion.Content>
            </Accordion.Item>
          </Accordion>
        </div>
      </div>
    </div>
  ),
}

export const ControlledAccordion: Story = {
  render: () => {
    const [activeItems, setActiveItems] = useState<string[]>(['item-1'])

    return (
      <div className="w-md">
        <h2 className="mb-200 font-bold text-lg">Controlled Accordion</h2>
        <div className="mb-200">
          <p className="text-sm">Active items: {activeItems.join(', ') || 'None'}</p>
          <div className="mt-150 flex flex-wrap gap-100">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setActiveItems(prev => {
                  const isActive = prev.includes('item-1')
                  return isActive
                    ? prev.filter((i) => i !== 'item-1')
                    : [...prev, 'item-1']
                })
              }}
            >
              Toggle Item 1
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setActiveItems(prev => {
                  const isActive = prev.includes('item-2')
                  return isActive
                    ? prev.filter((i) => i !== 'item-2')
                    : [...prev, 'item-2']
                })
              }}
            >
              Toggle Item 2
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setActiveItems(prev => {
                  const isActive = prev.includes('item-3')
                  return isActive
                    ? prev.filter((i) => i !== 'item-3')
                    : [...prev, 'item-3']
                })
              }}
            >
              Toggle Item 3
            </Button>
            <Button size="sm" variant="tertiary" theme="borderless" onClick={() => setActiveItems([])}>
              Close All
            </Button>
          </div>
        </div>

        <Accordion
          value={activeItems}
          onChange={setActiveItems}
          multiple
          collapsible
        >
          <Accordion.Item value="item-1">
            <Accordion.Header>
              <Accordion.Title>What is an Accordion?</Accordion.Title>
              <Accordion.Indicator />
            </Accordion.Header>
            <Accordion.Content>
              Accordion is a UI component that allows collapsing and expanding content.
            </Accordion.Content>
          </Accordion.Item>

          <Accordion.Item value="item-2">
            <Accordion.Header>
              <Accordion.Title>How to use an Accordion?</Accordion.Title>
              <Accordion.Indicator />
            </Accordion.Header>
            <Accordion.Content>
              Click on headers to expand or collapse content sections.
            </Accordion.Content>
          </Accordion.Item>

          <Accordion.Item value="item-3" disabled>
            <Accordion.Header>
              <Accordion.Title>Why use an Accordion? (Disabled)</Accordion.Title>
              <Accordion.Indicator />
            </Accordion.Header>
            <Accordion.Content>
              This item is disabled and cannot be expanded.
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </div>
    )
  },
}

export const ConditionalRendering: Story = {
  name: 'Conditional Rendering (Compound Pattern Benefit)',
  render: () => {
    const [showExtra, setShowExtra] = useState(false)

    return (
      <div className="w-md">
        <div className="mb-200">
          <Button size="sm" variant="primary" onClick={() => setShowExtra(!showExtra)}>
            {showExtra ? 'Hide' : 'Show'} Extra Items
          </Button>
        </div>

        <Accordion collapsible multiple>
          <Accordion.Item value="item-1">
            <Accordion.Header>
              <Accordion.Title>Always Visible Item</Accordion.Title>
              <Accordion.Indicator />
            </Accordion.Header>
            <Accordion.Content>This item is always visible.</Accordion.Content>
          </Accordion.Item>

          {showExtra && (
            <>
              <Accordion.Item value="item-2">
                <Accordion.Header>
                  <Accordion.Title>Conditionally Rendered Item 1</Accordion.Title>
                  <Accordion.Indicator />
                </Accordion.Header>
                <Accordion.Content>
                  This item only appears when "Show Extra Items" is clicked.
                </Accordion.Content>
              </Accordion.Item>

              <Accordion.Item value="item-3">
                <Accordion.Header>
                  <Accordion.Title>Conditionally Rendered Item 2</Accordion.Title>
                  <Accordion.Indicator />
                </Accordion.Header>
                <Accordion.Content>
                  Another conditionally rendered item demonstrating the flexibility of compound
                  pattern.
                </Accordion.Content>
              </Accordion.Item>
            </>
          )}

          <Accordion.Item value="item-4">
            <Accordion.Header>
              <Accordion.Title>Another Always Visible Item</Accordion.Title>
              <Accordion.Indicator />
            </Accordion.Header>
            <Accordion.Content>This item is also always visible.</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </div>
    )
  },
}
