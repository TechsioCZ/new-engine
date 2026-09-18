import type { Meta, StoryObj } from '@storybook/react'
import {
  FormErrorSummary,
  type FormErrorSummaryError,
} from '../../src/molecules/form-error-summary'

const meta: Meta<typeof FormErrorSummary> = {
  title: 'Molecules/FormErrorSummary',
  component: FormErrorSummary,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Summary heading',
    },
    errors: {
      control: 'object',
      description: 'Errors to list; each links to its field by targetId',
    },
    onFieldFocus: {
      control: false,
      description: 'Optional callback fired when an error link is activated',
    },
  },
  args: {
    title: 'There is a problem',
    errors: [{ id: 'name', label: 'Enter your name', targetId: 'name-field' }],
  },
}

export default meta
type Story = StoryObj<typeof FormErrorSummary>

const errors: FormErrorSummaryError[] = [
  { id: 'name', label: 'Enter your name', targetId: 'name-field' },
  { id: 'email', label: 'Enter a valid email address', targetId: 'email-field' },
  { id: 'terms', label: 'You must accept the terms', targetId: 'terms-field' },
]

export const Playground: Story = {
  args: {
    errors,
  },
}

export const OneError: Story = {
  args: {
    errors: [{ id: 'name', label: 'Enter your name', targetId: 'name-field' }],
  },
}

export const MultipleErrors: Story = {
  args: {
    errors,
  },
}

export const Hidden: Story = {
  render: () => (
    <div className="flex w-xs flex-col gap-200">
      <p className="text-fg-secondary text-sm">
        No summary is rendered when errors is empty.
      </p>
      <FormErrorSummary errors={[]} />
    </div>
  ),
}
