import type { Meta, StoryObj } from "@storybook/react"

import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { BreadcrumbTemplate } from "../../src/templates/breadcrumb"
import type { BreadcrumbTemplateItem } from "../../src/templates/breadcrumb"

const electronicsHref = "/products/electronics"

const defaultItems: BreadcrumbTemplateItem[] = [
  { href: "/", icon: "token-icon-home", label: "Home" },
  { href: "/products", icon: "token-icon-shopping-bag", label: "Products" },
  {
    href: electronicsHref,
    icon: "token-icon-cpu",
    label: "Electronics",
  },
  { href: "/products/electronics/smartphones", label: "Smartphones" },
]

const longItems: BreadcrumbTemplateItem[] = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: electronicsHref, label: "Electronics" },
  { href: "/products/electronics/computers", label: "Computers" },
  { href: "/products/electronics/computers/laptops", label: "Laptops" },
  { href: "/products/electronics/computers/laptops/gaming", label: "Gaming" },
  {
    href: "/products/electronics/computers/laptops/gaming/high-end",
    label: "High-End",
  },
]

const meta: Meta<typeof BreadcrumbTemplate> = {
  argTypes: {
    items: {
      control: "object",
      description: "Array of breadcrumb items to display.",
      table: {
        category: "Content",
      },
    },
    maxItems: {
      control: { min: 0, type: "number" },
      description: "Maximum number of items before inserting ellipsis.",
      table: {
        category: "Behavior",
        defaultValue: { summary: "0" },
      },
    },
    separator: {
      control: "text",
      description: "Custom separator content shared by all separators.",
      table: {
        category: "Content",
      },
    },
    size: {
      control: "select",
      description: "Controls breadcrumb sizing.",
      options: ["sm", "md", "lg"],
      table: {
        category: "Appearance",
        defaultValue: { summary: "md" },
      },
    },
    variant: {
      control: "select",
      description: "Controls the visual style of breadcrumb links.",
      options: ["plain", "underline"],
      table: {
        category: "Appearance",
        defaultValue: { summary: "plain" },
      },
    },
  },
  args: {
    items: defaultItems,
    maxItems: 0,
    size: "md",
    variant: "plain",
  },
  component: BreadcrumbTemplate,
  decorators: [
    (Story) => (
      <div className="max-w-md bg-surface p-400">
        <Story />
      </div>
    ),
  ],
  parameters: {
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
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Templates/BreadcrumbTemplate",
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
        <div className="flex flex-col gap-300">
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
        <div className="flex flex-col gap-300">
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
    separator: "/",
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
      { href: "/", label: "Home" },
      { href: "/products", isCurrent: true, label: "Products" },
      { href: electronicsHref, label: "Electronics" },
    ],
  },
}
