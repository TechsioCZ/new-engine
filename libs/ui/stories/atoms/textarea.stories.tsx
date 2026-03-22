import type { Meta, StoryObj } from '@storybook/react'
import { VariantContainer, VariantGroup } from '../../.storybook/decorator'
import { Textarea } from '../../src/atoms/textarea'

const meta: Meta<typeof Textarea> = {
  title: 'Atoms/Textarea',
  component: Textarea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Textarea>

export const Playground: Story = {
  args: {
    placeholder: 'Enter your text...',
    size: 'md',
    variant: 'default',
    resize: 'y',
    disabled: false,
    readonly: false,
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the textarea',
    },
    variant: {
      control: 'select',
      options: ['default', 'error', 'success', 'warning', 'borderless'],
      description: 'Visual variant for validation states',
    },
    resize: {
      control: 'select',
      options: ['none', 'y', 'x', 'both', 'auto'],
      description: 'Resize behavior (auto = grows with content)',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the textarea',
    },
    readonly: {
      control: 'boolean',
      description: 'Make textarea read-only (still focusable, sent on submit)',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
  },
}

export const Sizes: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Sizes">
        <Textarea size="sm" placeholder="Small textarea" />
        <Textarea placeholder="Medium textarea (default)" />
        <Textarea size="lg" placeholder="Large textarea" />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const ValidationStates: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Validation States">
        <Textarea variant="default" placeholder="Default state" />
        <Textarea variant="error" placeholder="Error state" />
        <Textarea variant="success" placeholder="Success state" />
        <Textarea variant="warning" placeholder="Warning state" />
        <Textarea variant="borderless" placeholder="Borderless variant" />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const AllVariants: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Sizes">
        <Textarea size="sm" placeholder="Small textarea" />
        <Textarea size="md" placeholder="Medium textarea" />
        <Textarea size="lg" placeholder="Large textarea" />
      </VariantGroup>

      <VariantGroup title="Resize Modes">
        <Textarea resize="y" placeholder="Vertical resize" />
        <Textarea resize="x" placeholder="Horizontal resize" />
        <Textarea resize="none" placeholder="No resize" />
        <Textarea resize="both" placeholder="Resize both" />
        <Textarea resize="auto" placeholder="Auto-sizing - grows with content" />
      </VariantGroup>

      <VariantGroup title="Validation States">
        <Textarea variant="default" placeholder="Default state" />
        <Textarea variant="error" placeholder="Error state" />
        <Textarea variant="success" placeholder="Success state" />
        <Textarea variant="warning" placeholder="Warning state" />
        <Textarea variant="borderless" placeholder="Borderless variant" />
      </VariantGroup>

      <VariantGroup title="Interactivity">
        <Textarea placeholder="Normal state" />
        <Textarea disabled value="Disabled textarea" />
        <Textarea readonly value="Readonly textarea" />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const AutoSizing: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Auto-sizing Textareas">
        <div className="w-80">
          <Textarea
            resize="auto"
            size="sm"
            defaultValue="This auto-sizing textarea starts with content. Try adding more lines - it will grow automatically!"
          />
        </div>

      </VariantGroup>

    </VariantContainer>
  ),
}

export const UseCaseCombinations: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Real-world Use Cases">
        <Textarea
          size="lg"
          resize="y"
          placeholder="Product description - admin interface"
        />
        <Textarea
          variant="error"
          size="md"
          placeholder="Order notes with validation error"
        />
        <Textarea
          readonly
          variant="borderless"
          defaultValue="This is a read-only display of database content that maintains the same visual structure as editable fields."
        />
        <Textarea
          variant="success"
          placeholder="Successfully submitted product review"
        />
        <Textarea
          size="sm"
          resize="both"
          placeholder="Compact notepad with resizing"
        />
      </VariantGroup>
    </VariantContainer>
  ),
}
