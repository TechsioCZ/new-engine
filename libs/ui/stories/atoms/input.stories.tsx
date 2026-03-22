import type { Meta, StoryObj } from '@storybook/react'
import { VariantContainer, VariantGroup } from '../../.storybook/decorator'
import { Input } from '../../src/atoms/input'
import { Label } from '../../src/atoms/label'
import { StatusText } from '../../src/atoms/status-text'

const meta: Meta<typeof Input> = {
  title: 'Atoms/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Input size',
    },
    variant: {
      control: 'select',
      options: ['default', 'error', 'success', 'warning'],
      description: 'Visual variant of input',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state',
    },
  },
}

export default meta
type Story = StoryObj<typeof Input>

// Interactive playground
export const Playground: Story = {
  args: {
    placeholder: 'Enter text...',
  },
}

// Visual demonstration of all variants
export const AllVariants: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Sizes">
        <div className="w-64">
          <Input size="sm" placeholder="Small input" />
        </div>
        <div className="w-64">
          <Input size="md" placeholder="Default input" />
        </div>
        <div className="w-64">
          <Input size="lg" placeholder="Large input" />
        </div>
      </VariantGroup>

      <VariantGroup title="States">
        <div className="w-64">
          <Input placeholder="Default state" />
        </div>
        <div className="w-64">
          <Input variant="error" placeholder="Error state" />
        </div>
        <div className="w-64">
          <Input variant="success" placeholder="Success state" />
        </div>
        <div className="w-64">
          <Input variant="warning" placeholder="Success state" />
        </div>
        <div className="w-64">
          <Input disabled placeholder="Disabled state" />
        </div>
      </VariantGroup>

      <VariantGroup title="With label" fullWidth>
        <div className="w-64">
          <Label htmlFor="input-basic">Basic input</Label>
          <Input id="input-basic" placeholder="Enter text..." />
        </div>

        <div className="w-64">
          <Label htmlFor="input-required" required>
            Required field
          </Label>
          <Input id="input-required" placeholder="Enter value" />
        </div>
      </VariantGroup>

      <VariantGroup title="With validation" fullWidth>
        <div className="w-64">
          <Label htmlFor="input-error">Email</Label>
          <Input
            id="input-error"
            variant="error"
            placeholder="john@example.com"
          />
          <StatusText status="error" showIcon>Email is in invalid format</StatusText>
        </div>

        <div className="w-64">
          <Label htmlFor="input-success">Username</Label>
          <Input id="input-success" variant="success" placeholder="johndoe" />
        </div>

        <div className="w-64">
          <Label htmlFor="input-disabled" disabled>
            Disabled field
          </Label>
          <Input id="input-disabled" disabled placeholder="Cannot edit" />
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}
