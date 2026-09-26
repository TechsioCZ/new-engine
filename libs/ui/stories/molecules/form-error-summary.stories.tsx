import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Button } from '../../src/atoms/button'
import { NumericInput } from '../../src/atoms/numeric-input'
import { FormCheckbox } from '../../src/molecules/form-checkbox'
import { FormInput } from '../../src/molecules/form-input'
import { FormNumericInput } from '../../src/molecules/form-numeric-input'
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

export const WithForm: Story = {
  render: () => <FormErrorSummaryExample />,
}

function FormErrorSummaryExample() {
  const [errors, setErrors] = useState<FormErrorSummaryError[]>([])

  const validate = () => {
    setErrors([
      {
        id: 'email',
        label: 'Enter a valid email address',
        targetId: 'email-field',
      },
      {
        id: 'password',
        label: 'Password must be at least 8 characters',
        targetId: 'password-field',
      },
      {
        id: 'quantity',
        label: 'Enter a quantity',
        targetId: 'quantity-field',
      },
      {
        id: 'terms',
        label: 'Accept the terms',
        targetId: 'terms-field',
      },
    ])
  }

  const isInvalid = (targetId: string) =>
    errors.some((error) => error.targetId === targetId)

  return (
    <div className="flex w-md flex-col gap-200">
      <FormErrorSummary errors={errors} />
      <FormInput
        id="email-field"
        label="Email"
        type="email"
        validateStatus={isInvalid('email-field') ? 'error' : 'default'}
        helpText={
          isInvalid('email-field')
            ? 'Enter a valid email address'
            : 'We will send a confirmation'
        }
      />
      <FormInput
        id="password-field"
        label="Password"
        type="password"
        validateStatus={isInvalid('password-field') ? 'error' : 'default'}
        helpText={
          isInvalid('password-field')
            ? 'Password must be at least 8 characters'
            : 'Minimum 8 characters'
        }
      />
      <FormNumericInput
        id="quantity-field"
        label="Quantity"
        validateStatus={isInvalid('quantity-field') ? 'error' : 'default'}
      >
        <NumericInput.Control>
          <NumericInput.Input />
        </NumericInput.Control>
      </FormNumericInput>
      <FormCheckbox
        id="terms-field"
        label="Accept the terms"
        validateStatus={isInvalid('terms-field') ? 'error' : 'default'}
      />
      <Button onClick={validate} variant="primary">
        Validate
      </Button>
    </div>
  )
}
