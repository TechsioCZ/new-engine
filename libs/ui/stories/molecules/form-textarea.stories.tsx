import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { VariantContainer, VariantGroup } from '../../.storybook/decorator'
import { FormTextarea } from '../../src/molecules/form-textarea'
import { FormInput } from '../../src/molecules/form-input'
import { Button } from '../../src/atoms/button'

const meta: Meta<typeof FormTextarea> = {
  title: 'Molecules/FormTextarea',
  component: FormTextarea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    // Text inputs
    label: {
      control: 'text',
      description: 'Textarea label',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    helpText: {
      control: 'text',
      description: 'Helper text or validation message below textarea',
    },

    // Appearance
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the textarea and label',
      table: { defaultValue: { summary: 'md' } },
    },
    validateStatus: {
      control: 'select',
      options: ['default', 'error', 'success', 'warning'],
      description: 'Validation state',
      table: { defaultValue: { summary: 'default' } },
    },
    showHelpTextIcon: {
      control: 'boolean',
      description: 'Show icon with help text',
      table: { defaultValue: { summary: 'false' } },
    },
    resize: {
      control: 'select',
      options: ['none', 'y', 'x', 'both', 'auto'],
      description: 'Resize behavior of the textarea',
      table: { defaultValue: { summary: 'y' } },
    },
    rows: {
      control: 'number',
      description: 'Number of visible text rows',
    },
    maxLength: {
      control: 'number',
      description: 'Maximum number of characters allowed',
    },
    minLength: {
      control: 'number',
      description: 'Minimum number of characters required',
    },

    // States
    disabled: {
      control: 'boolean',
      description: 'Disable the textarea',
      table: { defaultValue: { summary: 'false' } },
    },
    required: {
      control: 'boolean',
      description: 'Mark as required field',
      table: { defaultValue: { summary: 'false' } },
    },
    readOnly: {
      control: 'boolean',
      description: 'Make textarea read-only',
      table: { defaultValue: { summary: 'false' } },
    },
    spellCheck: {
      control: 'boolean',
      description: 'Enable browser spell checking',
    },
    autoFocus: {
      control: 'boolean',
      description: 'Automatically focus on mount',
      table: { defaultValue: { summary: 'false' } },
    },
  },
  args: {
    label: 'Description',
    placeholder: 'Enter description...',
    helpText: 'Provide a detailed description',
    size: 'md',
    validateStatus: 'default',
    showHelpTextIcon: false,
    resize: 'y',
    rows: 4,
    disabled: false,
    required: false,
    readOnly: false,
    autoFocus: false,
  },
}

export default meta
type Story = StoryObj<typeof FormTextarea>

export const Playground: Story = {
  args: {
    label: 'Playground Textarea',
  },
}

// All variants and combinations
export const AllVariants: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Requirement States">
        <div className="w-md">
          <FormTextarea
            id="default-textarea"
            label="Default"
            placeholder="Enter text..."
            rows={3}
          />
        </div>
        <div className="w-md">
          <FormTextarea
            id="required-textarea"
            label="Required"
            placeholder="Enter text..."
            required
            rows={3}
          />
        </div>
        <div className="w-md">
          <FormTextarea
            id="optional-textarea"
            label="Optional"
            placeholder="Enter text..."
            rows={3}
          />
        </div>
      </VariantGroup>

      <VariantGroup title="Validation States">
        <div className="w-md">
          <FormTextarea
            id="default-state-textarea"
            label="Default state"
            placeholder="Enter text..."
            validateStatus="default"
            helpText="This is default help text"
            rows={3}
          />
        </div>
        <div className="w-md">
          <FormTextarea
            id="success-textarea"
            label="Success state"
            placeholder="Enter message..."
            validateStatus="success"
            helpText="Message saved successfully"
            rows={3}
          />
        </div>
        <div className="w-md">
          <FormTextarea
            id="error-textarea"
            label="Error state"
            placeholder="Enter feedback..."
            validateStatus="error"
            helpText="Message is too short (min 10 characters)"
            rows={3}
          />
        </div>
        <div className="w-md">
          <FormTextarea
            id="warning-textarea"
            label="Warning state"
            placeholder="Enter comment..."
            validateStatus="warning"
            helpText="Message contains sensitive information"
            rows={3}
          />
        </div>
      </VariantGroup>

      <VariantGroup title="Supporting Text">
        <div className="w-md">
          <FormTextarea
            id="helper-textarea"
            label="With helper text"
            placeholder="Enter message..."
            helpText="This field supports markdown formatting"
            rows={3}
          />
        </div>
        <div className="w-md">
          <FormTextarea
            id="extra-textarea"
            label="With validation message"
            placeholder="Enter comment..."
            helpText="Please be respectful"
            validateStatus="default"
            rows={3}
          />
        </div>
      </VariantGroup>

      <VariantGroup title="Sizes">
        <div className="w-md">
          <FormTextarea
            id="sm-textarea"
            label="Small textarea"
            placeholder="Enter text..."
            helpText="Helper text for small size"
            size="sm"
            rows={3}
          />
        </div>
        <div className="w-md">
          <FormTextarea
            id="md-textarea"
            label="Default textarea"
            placeholder="Enter text..."
            helpText="Helper text for default size"
            size="md"
            rows={3}
          />
        </div>
        <div className="w-md">
          <FormTextarea
            id="lg-textarea"
            label="Large textarea"
            placeholder="Enter text..."
            helpText="Helper text for large size"
            size="lg"
            rows={3}
          />
        </div>
      </VariantGroup>

      <VariantGroup title="Special States">
        <div className="w-md">
          <FormTextarea
            id="disabled-textarea"
            label="Disabled textarea"
            placeholder="Cannot edit"
            disabled
            rows={3}
          />
        </div>
        <div className="w-md">
          <FormTextarea
            id="readonly-textarea"
            label="Read-only textarea"
            value="This content is read-only and cannot be modified by the user."
            readOnly
            rows={3}
          />
        </div>
        <div className="w-md">
          <FormTextarea
            id="prefilled-textarea"
            label="With default value"
            defaultValue="This textarea comes with pre-filled content that can be edited."
            rows={3}
          />
        </div>
      </VariantGroup>

      <VariantGroup title="Resize Behaviors" fullWidth>
        <div className="w-md">
          <FormTextarea
            id="resize-none"
            label="No resize"
            placeholder="Cannot resize this textarea..."
            resize="none"
            rows={3}
          />
        </div>
        <div className="w-md">
          <FormTextarea
            id="resize-vertical"
            label="Vertical resize only"
            placeholder="Can only resize vertically..."
            resize="y"
            rows={3}
          />
        </div>
        <div className="w-md">
          <FormTextarea
            id="resize-horizontal"
            label="Horizontal resize only"
            placeholder="Can only resize horizontally..."
            resize="x"
            rows={3}
          />
        </div>
        <div className="w-md">
          <FormTextarea
            id="resize-both"
            label="Resize both directions"
            placeholder="Can resize in any direction..."
            resize="both"
            rows={3}
          />
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}

// Validation States - Dedicated story showing all 4 validation states
export const ValidationStates: Story = {
  render: () => (
    <div className="flex flex-col gap-200 w-md">
      <FormTextarea
        id="default-validation"
        label="Default State"
        placeholder="Enter your message..."
        validateStatus="default"
        helpText="This is default help text"
        rows={3}
      />
      <FormTextarea
        id="error-validation"
        label="Error State"
        placeholder="Enter your message..."
        validateStatus="error"
        helpText="Message is too short (min 10 characters)"
        rows={3}
      />
      <FormTextarea
        id="success-validation"
        label="Success State"
        placeholder="Enter your message..."
        validateStatus="success"
        helpText="Message saved successfully"
        rows={3}
      />
      <FormTextarea
        id="warning-validation"
        label="Warning State"
        placeholder="Enter your message..."
        validateStatus="warning"
        helpText="Message contains sensitive information"
        rows={3}
      />
    </div>
  ),
}

// Sizes - Dedicated story showing all size variants
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-200 w-md">
      <FormTextarea
        id="small-size"
        label="Small Size"
        placeholder="Enter text..."
        size="sm"
        helpText="Small textarea variant"
        rows={3}
      />
      <FormTextarea
        id="medium-size"
        label="Medium Size (Default)"
        placeholder="Enter text..."
        size="md"
        helpText="Medium textarea variant"
        rows={3}
      />
      <FormTextarea
        id="large-size"
        label="Large Size"
        placeholder="Enter text..."
        size="lg"
        helpText="Large textarea variant"
        rows={3}
      />
    </div>
  ),
}

// Interactive character count example
export const InteractiveCharacterCount: Story = {
  render: () => {
    return <CharacterCountExample />
  },
}

function CharacterCountExample() {
  const [text, setText] = useState('')
  const maxLength = 280
  const remaining = maxLength - text.length
  const isOverLimit = remaining < 0
  const isNearLimit = remaining <= 20 && remaining >= 0

  const validateStatus = isOverLimit
    ? 'error'
    : isNearLimit
      ? 'warning'
      : 'default'

  const helpText = isOverLimit
    ? `${Math.abs(remaining)} characters over the limit`
    : isNearLimit
      ? `${remaining} characters remaining`
      : `${remaining}/${maxLength} characters`

  return (
    <div className="w-lg">
      <h3 className="mb-200 font-medium text-lg">Character Count Validation</h3>
      <FormTextarea
        id="character-count"
        label="Tweet"
        placeholder="What's happening?"
        required
        value={text}
        onChange={(e) => setText(e.target.value)}
        validateStatus={validateStatus}
        helpText={helpText}
        rows={4}
      />
      <div className="mt-200 text-sm">
        <div className="flex gap-200">
          <span>Characters: {text.length}</span>
          <span className={isOverLimit ? 'text-danger' : ''}>
            Remaining: {remaining}
          </span>
        </div>
      </div>
    </div>
  )
}

// Contact form example
export const ContactForm: Story = {
  render: () => <ContactFormExample />,
}

function ContactFormExample() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })

  return (
    <div className="w-lg rounded-md border border-border-primary p-300 shadow-sm">
      <h2 className="mb-300 font-semibold text-xl">Contact Us</h2>

      <div className="space-y-200">
        <div className="grid grid-cols-2 gap-200">
          <FormInput
            id="contact-name"
            label="Name"
            placeholder="John Doe"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <FormInput
            id="contact-email"
            label="Email"
            type="email"
            placeholder="john@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <FormInput
          id="contact-subject"
          label="Subject"
          placeholder="How can we help?"
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
        />

        <FormTextarea
          id="contact-message"
          label="Message"
          placeholder="Tell us more about your inquiry..."
          required
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          rows={6}
          helpText="Please provide as much detail as possible"
        />

        <FormTextarea
          id="additional-info"
          label="Additional Information (Optional)"
          placeholder="Any other details you'd like to share..."
          rows={3}
          helpText="Include any relevant links, references, or context"
        />
      </div>

      <div className="mt-300 flex gap-150">
        <Button size="sm" type="submit">
          Send Message
        </Button>
        <Button size="sm" variant="danger" type="button">
          Cancel
        </Button>
      </div>
    </div>
  )
}
