'use client'

import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { VariantContainer } from '../../.storybook/decorator'
import { Rating } from '../../src/atoms/rating'

const meta: Meta<typeof Rating> = {
  title: 'Atoms/Rating',
  component: Rating,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'number', min: 0, max: 10, step: 0.5 },
      description: 'Current rating value',
    },
    defaultValue: {
      control: { type: 'number', min: 0, max: 10, step: 0.5 },
      description: 'Default rating value',
    },
    count: {
      control: { type: 'number', min: 1, max: 10 },
      description: 'Number of rating items',
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
      description: 'Size variant',
    },
    labelText: {
      control: 'text',
      description: 'Label text for the rating group',
    },
    readOnly: {
      control: 'boolean',
      description: 'Make rating read-only',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable rating interaction',
    },
    allowHalf: {
      control: 'boolean',
      description: 'Allow half star ratings',
    },
    name: {
      control: 'text',
      description: 'Form field name',
    },
  },
}

export default meta
type Story = StoryObj<typeof Rating>

export const Playground: Story = {
  args: {
    defaultValue: 3,
    count: 5,
    size: 'md',
    allowHalf: true,
  },
}

export const Sizes: Story = {
  render: () => (
    <VariantContainer>
      <Rating size="sm" defaultValue={3} />
      <Rating size="md" defaultValue={3} />
      <Rating size="lg" defaultValue={3} />
    </VariantContainer>
  ),
}

export const Controlled: Story = {
  render: () => {
    const [value, setValue] = useState(3)
    const [hoverValue, setHoverValue] = useState<number>(0)

    return (
      <div className="flex flex-col gap-4">
        <Rating
          value={value}
          onChange={setValue}
          onHoverChange={setHoverValue}
          allowHalf
        />
        <div className="space-y-1 text-sm">
          <p>Current value: {value}</p>
          <p>Hover value: {hoverValue}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setValue(0)}
            className="rounded border px-3 py-1 text-sm hover:bg-gray-100/20"
          >
            Clear
          </button>
          <button
            onClick={() => setValue(5)}
            className="rounded border px-3 py-1 text-sm hover:bg-gray-100/20"
          >
            Max
          </button>
        </div>
      </div>
    )
  },
}

export const States: Story = {
  render: () => (
    <VariantContainer>
      <div>
        <h3 className="mb-2 font-medium text-sm">Normal</h3>
        <Rating defaultValue={3} />
      </div>
      <div>
        <h3 className="mb-2 font-medium text-sm">Read Only</h3>
        <Rating defaultValue={3} readOnly />
      </div>
      <div>
        <h3 className="mb-2 font-medium text-sm">Disabled</h3>
        <Rating defaultValue={3} disabled />
      </div>
    </VariantContainer>
  ),
}
