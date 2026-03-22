import type { Meta, StoryObj } from '@storybook/react'
import { VariantContainer, VariantGroup } from '../../.storybook/decorator'
import { Button } from '../../src/atoms/button'
import { fn } from 'storybook/test'
import { iconLabels, iconOptions } from '../helpers/icon-options'

const meta: Meta<typeof Button> = {
  title: 'Atoms/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'tertiary', 'warning', 'danger'],
      description: 'Controls the semantic style of the button',
      table: {
        defaultValue: { summary: 'primary' },
      },
    },
    theme: {
      control: 'select',
      options: ['solid', 'light', 'outlined', 'borderless', 'unstyled'],
      description: 'Controls the visual weight/theme of the button',
      table: {
        defaultValue: { summary: 'solid' },
      },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'current'],
      description: 'Controls the size of the button',
      table: {
        defaultValue: { summary: 'md' },
      },
    },
    type: {
      control: 'radio',
      options: ['button', 'submit', 'reset'],
      description: 'The HTML type of the button',
      table: {
        defaultValue: { summary: 'button' },
      },
    },
    block: {
      control: 'boolean',
      description: 'Whether the button should take up the full width of its container',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    uppercase: {
      control: 'boolean',
      description: 'Whether the button text should be uppercase',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    isLoading: {
      control: 'boolean',
      description: 'Whether the button is in a loading state',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    loadingText: {
      control: 'text',
      description: 'Text to display when isLoading is true',
    },
    icon: {
      control: {
        type: 'select',
        labels: iconLabels,
      },
      options: iconOptions,
      description: 'Icon to display in the button',
    },
    iconPosition: {
      control: 'radio',
      options: ['left', 'right'],
      description: 'Position of the icon relative to the text',
      table: {
        defaultValue: { summary: 'left' },
      },
    },
    children: {
      control: 'text',
      description: 'Content of the button',
    },
    onClick: {
      description: 'Click handler',
    },
  },
  args: {
    variant: 'primary',
    theme: 'solid',
    size: 'md',
    type: 'button',
    block: false,
    uppercase: false,
    disabled: false,
    isLoading: false,
    loadingText: 'Loading...',
    children: 'Button',
    iconPosition: 'left',
    onClick: fn(),
  },
  parameters: {
    layout: 'centered',
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Playground: Story = {
  render: (args) => 
  <div className='w-md'>
    <Button {...args} />
  </div>
}

export const Variants: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Solid themes">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="tertiary">Tertiary</Button>
        <Button variant="warning">Warning</Button>
        <Button variant="danger">Danger</Button>
      </VariantGroup>
      <VariantGroup title="Light themes">
        <Button variant="primary" theme="light">
          Primary Light
        </Button>
        <Button variant="secondary" theme="light">
          Secondary Light
        </Button>
        <Button variant="tertiary" theme="light">
          Tertiary Light
        </Button>
        <Button variant="warning" theme="light">
          Warning Light
        </Button>
        <Button variant="danger" theme="light">
          Danger Light
        </Button>
      </VariantGroup>
      <VariantGroup title="Outlined themes">
        <Button variant="primary" theme="outlined">
          Primary Outlined
        </Button>
        <Button variant="secondary" theme="outlined">
          Secondary Outlined
        </Button>
        <Button variant="tertiary" theme="outlined">
          Tertiary Outlined
        </Button>
        <Button variant="warning" theme="outlined">
          Warning Outlined
        </Button>
        <Button variant="danger" theme="outlined">
          Danger Outlined
        </Button>
      </VariantGroup>
      <VariantGroup title="Borderless themes">
        <Button variant="primary" theme="borderless">
          Primary Borderless
        </Button>
        <Button variant="secondary" theme="borderless">
          Secondary Borderless
        </Button>
        <Button variant="tertiary" theme="borderless">
          Tertiary Borderless
        </Button>
        <Button variant="warning" theme="borderless">
          Warning Borderless
        </Button>
        <Button variant="danger" theme="borderless">
          Danger Borderless
        </Button>
      </VariantGroup>
      <VariantGroup title="Block (full width)" fullWidth>
        <Button block>Primary Block</Button>
        <Button variant="secondary" block>
          Secondary Block
        </Button>
        <Button variant="primary" theme="outlined" block>
          Outlined Block
        </Button>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const Sizes: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="sizes">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </VariantGroup>

      <VariantGroup title="Block buttons" fullWidth>
        <Button block>Block Button</Button>
        <Button block variant="secondary">
          Block Secondary
        </Button>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const States: Story = {
  render: () => {
    return (
      <VariantContainer>
        <VariantGroup title="Disabled states">
          <Button disabled>
            Solid
          </Button>
          <Button variant="secondary" theme="light" disabled>
            Light
          </Button>
          <Button variant="tertiary" theme="borderless" disabled>
            Borderless
          </Button>
          <Button variant="warning" theme="outlined" disabled>
            Outlined
          </Button>
        </VariantGroup>

        <VariantGroup title="Loading states">
          <Button isLoading>Primary</Button>
          <Button isLoading theme="outlined" loadingText="Loading...">
            Outlined
          </Button>

          <Button variant="danger" isLoading>
            Danger
          </Button>
        </VariantGroup>
      </VariantContainer>
    )
  },
}

export const AllVariants: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Primary buttons">
        <Button variant="primary">BUTTON</Button>
        <Button variant="primary" size="sm">
          SMALL
        </Button>
        <Button variant="primary" size="md">
          DEFAULT
        </Button>
        <Button variant="primary" size="lg">
          LARGE
        </Button>
        <Button variant="primary" disabled>
          DISABLED
        </Button>
      </VariantGroup>

      <VariantGroup title="Secondary buttons">
        <Button variant="secondary">BUTTON</Button>
        <Button variant="secondary" size="sm">
          SMALL
        </Button>
        <Button variant="secondary" size="md">
          DEFAULT
        </Button>
        <Button variant="secondary" size="lg">
          LARGE
        </Button>
        <Button variant="secondary" disabled>
          DISABLED
        </Button>
      </VariantGroup>

      <VariantGroup title="Tertiary buttons">
        <Button variant="tertiary">BUTTON</Button>
        <Button variant="tertiary" size="sm">
          SMALL
        </Button>
        <Button variant="tertiary" size="md">
          DEFAULT
        </Button>
        <Button variant="tertiary" size="lg">
          LARGE
        </Button>
        <Button variant="tertiary" disabled>
          DISABLED
        </Button>
      </VariantGroup>

      <VariantGroup title="Warning buttons">
        <Button variant="warning">WARNING</Button>
        <Button variant="warning" size="sm">
          SMALL
        </Button>
        <Button variant="warning" size="md">
          DEFAULT
        </Button>
        <Button variant="warning" size="lg">
          LARGE
        </Button>
        <Button variant="warning" disabled>
          DISABLED
        </Button>
      </VariantGroup>

      <VariantGroup title="Danger buttons">
        <Button variant="danger">DANGER</Button>
        <Button variant="danger" size="sm">
          SMALL
        </Button>
        <Button variant="danger" size="md">
          DEFAULT
        </Button>
        <Button variant="danger" size="lg">
          LARGE
        </Button>
        <Button variant="danger" disabled>
          DISABLED
        </Button>
      </VariantGroup>

      <VariantGroup title="Light variants">
        <Button variant="primary">PRIMARY LIGHT</Button>
        <Button variant="secondary">SECONDARY LIGHT</Button>
        <Button variant="tertiary">TERTIARY LIGHT</Button>
        <Button variant="warning">WARNING LIGHT</Button>
        <Button variant="danger">DANGER LIGHT</Button>
      </VariantGroup>

      <VariantGroup title="Full width buttons" fullWidth>
        <Button variant="primary" block>
          PRIMARY
        </Button>
        <Button variant="secondary" block>
          SECONDARY
        </Button>
        <Button variant="tertiary" block>
          TERTIARY
        </Button>
        <Button variant="warning" block>
          WARNING
        </Button>
        <Button variant="danger" block>
          DANGER
        </Button>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const IconButtons: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Icon buttons">
        <Button icon="icon-[mdi--thumb-up]">LIKE</Button>
        <Button icon="icon-[mdi--send]" iconPosition="right">
          SEND
        </Button>
        <Button icon="icon-[mdi--magnify]" aria-label="Search" />
        <Button variant="secondary" icon="icon-[mdi--pencil]">
          EDIT
        </Button>
        <Button variant="danger" icon="icon-[mdi--delete]">
          DELETE
        </Button>
      </VariantGroup>
    </VariantContainer>
  ),
}
