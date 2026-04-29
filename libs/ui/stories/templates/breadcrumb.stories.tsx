import type { Meta, StoryObj } from '@storybook/react'
import { VariantContainer, VariantGroup } from '../../.storybook/decorator'
import {
  BreadcrumbTemplate,
  type BreadcrumbTemplateItem,
} from '../../src/templates/breadcrumb'

const defaultItems: BreadcrumbTemplateItem[] = [
  { label: 'Home', href: '/', icon: 'token-icon-home' },
  { label: 'Products', href: '/products', icon: 'token-icon-shopping-bag' },
  {
    label: 'Electronics',
    href: '/products/electronics',
    icon: 'token-icon-cpu',
  },
  { label: 'Smartphones', href: '/products/electronics/smartphones' },
]

const longItems: BreadcrumbTemplateItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Products', href: '/products' },
  { label: 'Electronics', href: '/products/electronics' },
  { label: 'Computers', href: '/products/electronics/computers' },
  { label: 'Laptops', href: '/products/electronics/computers/laptops' },
  { label: 'Gaming', href: '/products/electronics/computers/laptops/gaming' },
  {
    label: 'High-End',
    href: '/products/electronics/computers/laptops/gaming/high-end',
  },
]

const meta: Meta<typeof BreadcrumbTemplate> = {
  title: 'Templates/BreadcrumbTemplate',
  component: BreadcrumbTemplate,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
A ready-to-use breadcrumb template with a data-driven API.
This template composes Breadcrumb slots into the default e-commerce
breadcrumb structure.
Use the molecule directly when a project needs custom slot ordering or per-slot styling.
        `,
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-container-md bg-surface p-400">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    items: {
      control: 'object',
      description: 'Array of breadcrumb items to display.',
      table: {
        category: 'Content',
      },
    },
    maxItems: {
      control: { type: 'number', min: 0 },
      description: 'Maximum number of items before inserting ellipsis.',
      table: {
        category: 'Behavior',
        defaultValue: { summary: '0' },
      },
    },
    separator: {
      control: 'text',
      description: 'Custom separator content shared by all separators.',
      table: {
        category: 'Content',
      },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Controls breadcrumb sizing.',
      table: {
        category: 'Appearance',
        defaultValue: { summary: 'md' },
      },
    },
    variant: {
      control: 'select',
      options: ['plain', 'underline'],
      description: 'Controls the visual style of breadcrumb links.',
      table: {
        category: 'Appearance',
        defaultValue: { summary: 'plain' },
      },
    },
  },
  args: {
    items: defaultItems,
    maxItems: 0,
    size: 'md',
    variant: 'plain',
  },
}

export default meta
type Story = StoryObj<typeof BreadcrumbTemplate>

export const Playground: Story = {
  args: {
    items: defaultItems,
  },
}

export const Sizes: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Sizes">
        <div className='flex flex-col gap-300'>
        <BreadcrumbTemplate items={defaultItems} size="sm" />
        <BreadcrumbTemplate items={defaultItems} size="md" />
        <BreadcrumbTemplate items={defaultItems} size="lg" />
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const Variants: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Variants">
        <div className='flex flex-col gap-300'>
        <BreadcrumbTemplate items={defaultItems} variant="plain" />
        <BreadcrumbTemplate items={defaultItems} variant="underline" />
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const CustomSeparator: Story = {
  args: {
    items: defaultItems,
    separator: '/',
  },
}

export const Ellipsis: Story = {
  args: {
    items: longItems,
    maxItems: 4,
  },
}

export const ExplicitCurrent: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Products', href: '/products', isCurrent: true },
      { label: 'Electronics', href: '/products/electronics' },
    ],
  },
}
