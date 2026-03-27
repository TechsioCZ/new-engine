import type { Meta, StoryObj } from '@storybook/react'
import { VariantContainer, VariantGroup } from '../../.storybook/decorator'
import { Badge, type BadgeProps } from '../../src/atoms/badge'

const meta: Meta<typeof Badge> = {
  title: 'Atoms/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
      description: 'Badge size',
      table: {
        defaultValue: { summary: 'md' },
      },
    },
    variant: {
      control: 'select',
      options: [
        'primary',
        'secondary',
        'tertiary',
        'discount',
        'info',
        'success',
        'warning',
        'danger',
        'outline',
        'dynamic',
      ],
      description: 'Visual style variant of the badge',
      table: {
        defaultValue: { summary: 'info' },
      },
    },
    children: {
      control: 'text',
      description: 'Text content of the badge',
    },
    bgColor: {
      control: 'color',
      description: 'Background color for dynamic variant',
      if: {
        arg: 'variant',
        eq: 'dynamic',
      },
    },
    fgColor: {
      control: 'color',
      description: 'Foreground color for dynamic variant',
      if: {
        arg: 'variant',
        eq: 'dynamic',
      },
    },
    borderColor: {
      control: 'color',
      description: 'Border color for dynamic variant',
      if: {
        arg: 'variant',
        eq: 'dynamic',
      },
    },
  },
  args: {
    variant: 'info',
    size: 'md',
    children: 'Badge',
  },
}

export default meta
type Story = Omit<StoryObj<typeof meta>, 'args'> & { args?: Partial<BadgeProps> }

export const Playground: Story = {
  args: {
    variant: 'info',
    size: 'md',
    children: 'Badge text',
  },
}

export const Variants: Story = {
  args: {},
  render: () => (
    <VariantContainer>
      <VariantGroup title="Solid themes">
        <Badge variant="primary">Primary</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="tertiary">Tertiary</Badge>
        <Badge variant="discount">Discount 30%</Badge>
        <Badge variant="info">Ships within 24 h</Badge>
        <Badge variant="success">Delivered</Badge>
        <Badge variant="warning">Last units</Badge>
        <Badge variant="danger">Unavailable</Badge>
      </VariantGroup>
      <VariantGroup title="Outline">
        <Badge variant="outline">Outline badge</Badge>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const Sizes: Story = {
  args: {},
  render: () => (
    <VariantContainer>
      <VariantGroup title="Info">
        <Badge size="sm" variant="info">
          Small badge
        </Badge>
        <Badge size="md" variant="info">
          Medium badge
        </Badge>
        <Badge size="lg" variant="info">
          Large badge
        </Badge>
        <Badge size="xl" variant="info">
          Extra large badge
        </Badge>
      </VariantGroup>
      <VariantGroup title="Outline">
        <Badge size="sm" variant="outline">
          Small outline
        </Badge>
        <Badge size="md" variant="outline">
          Medium outline
        </Badge>
        <Badge size="lg" variant="outline">
          Large outline
        </Badge>
        <Badge size="xl" variant="outline">
          Extra large outline
        </Badge>
      </VariantGroup>
      <VariantGroup title="Dynamic">
        <Badge variant='dynamic' bgColor='yellow' fgColor='black' borderColor='black' size='sm'>
          Small dynamic
        </Badge>
        <Badge variant='dynamic' bgColor='yellow' fgColor='black' borderColor='black' size='md'>
          Medium dynamic
        </Badge>
        <Badge variant='dynamic' bgColor='yellow' fgColor='black' borderColor='black' size='lg'>
          Large dynamic
        </Badge>
        <Badge variant='dynamic' bgColor='yellow' fgColor='black' borderColor='black' size='xl'>
          Extra dynamic
        </Badge>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const Dynamic: Story = {
  args: {
    variant: 'dynamic',
    size: 'md',
    bgColor: '#8A0002',
    fgColor: '#FFFFFF',
    borderColor: '#FFF500',
    children: 'Dynamic badge',
  },
}
