import type { Meta, StoryObj } from '@storybook/react'
import { VariantContainer, VariantGroup } from '../../.storybook/decorator'
import { Icon, type IconType } from '../../src/atoms/icon'
import { iconLabels, iconOptions } from '../helpers/icon-options'

const tokenIconOptions: IconType[] = [
  'token-icon-error',
  'token-icon-success',
  'token-icon-warning',
  'token-icon-info',
  'token-icon-input-error',
  'token-icon-input-success',
  'token-icon-input-warning',
  'token-icon-input-info',
]

const iconControlOptions: IconType[] = [
  ...tokenIconOptions,
  ...iconOptions.filter((option): option is IconType => Boolean(option)),
]

const iconControlLabels: Record<string, string> = {
  ...iconLabels,
  'token-icon-error': 'Token Error',
  'token-icon-success': 'Token Success',
  'token-icon-warning': 'Token Warning',
  'token-icon-info': 'Token Info',
  'token-icon-input-error': 'Token Input Error',
  'token-icon-input-success': 'Token Input Success',
  'token-icon-input-warning': 'Token Input Warning',
  'token-icon-input-info': 'Token Input Info',
}

const meta: Meta<typeof Icon> = {
  title: 'Atoms/Icon',
  component: Icon,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    icon: {
      control: {
        type: 'select',
        labels: iconControlLabels,
      },
      options: iconControlOptions,
      description: 'Icon token or inline icon class',
    },
    size: {
      control: 'select',
      options: ['current', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'],
      description: 'Size token for the icon',
      table: {
        defaultValue: { summary: 'current' },
      },
    },
    color: {
      control: 'select',
      options: ['current', 'primary', 'secondary', 'success', 'danger', 'warning'],
      description: 'Color token for the icon',
      table: {
        defaultValue: { summary: 'current' },
      },
    },
  },
  args: {
    icon: 'token-icon-error',
    size: 'md',
    color: 'current',
  },
}

export default meta
type Story = StoryObj<typeof Icon>

export const Playground: Story = {
  render: (args) => <Icon {...args} />,
}

// Sizes
export const Sizes: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Sizes">
        <Icon icon="token-icon-error" size="xs" />
        <Icon icon="token-icon-error" size="sm" />
        <Icon icon="token-icon-error" size="md" />
        <Icon icon="token-icon-error" size="lg" />
        <Icon icon="token-icon-error" size="xl" />
      </VariantGroup>
    </VariantContainer>
  ),
}

// Colors
export const Colors: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Colors">
        <Icon icon="token-icon-error" color="current" />
        <Icon icon="token-icon-error" color="primary" />
        <Icon icon="token-icon-error" color="secondary" />
        <Icon icon="token-icon-error" color="success" />
        <Icon icon="token-icon-error" color="danger" />
        <Icon icon="token-icon-error" color="warning" />
      </VariantGroup>
    </VariantContainer>
  ),
}

// Semantic tokens
export const SemanticTokens: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Semantic Icons">
        <div className="flex items-center gap-4">
          <Icon icon="token-icon-error" size="md" />
          <span>token-icon-error</span>
        </div>
        <div className="flex items-center gap-4">
          <Icon icon="token-icon-success" size="md" />
          <span>token-icon-success</span>
        </div>
        <div className="flex items-center gap-4">
          <Icon icon="token-icon-warning" size="md" />
          <span>token-icon-warning</span>
        </div>
        <div className="flex items-center gap-4">
          <Icon icon="token-icon-info" size="md" />
          <span>token-icon-info</span>
        </div>
        <div className="flex items-center gap-4">
          <Icon icon="icon-[mdi-light--check-circle]" size="md" />
          <span>token-icon-check-circle</span>
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}

// Component tokens
export const ComponentTokens: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Component Tokens">
        <div className="flex items-center gap-4">
          <Icon icon="token-icon-input-error" size="md" />
          <span>token-icon-input-error</span>
        </div>
        <div className="flex items-center gap-4">
          <Icon icon="token-icon-input-success" size="md" />
          <span>token-icon-input-success</span>
        </div>
        <div className="flex items-center gap-4">
          <Icon icon="token-icon-input-warning" size="md" />
          <span>token-icon-input-warning</span>
        </div>
        <div className="flex items-center gap-4">
          <Icon icon="token-icon-input-info" size="md" />
          <span>token-icon-input-info</span>
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}
