import type { Meta, StoryObj } from "@storybook/react"
import { Button } from "../../src/atoms/button"
import { EmptyState } from "../../src/molecules/empty-state"

const meta = {
  title: "Molecules/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Says what is missing and offers the one useful next step. Use it for an empty list or section; a DataTable has its own empty state.",
      },
    },
  },
  argTypes: {
    title: { control: "text" },
    description: { control: "text" },
    icon: { control: false },
    action: { control: false },
    ref: { control: false, table: { disable: true } },
  },
  args: {
    title: "No invoices yet",
    description: "Invoices appear here once an order is confirmed.",
  },
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => (
    <EmptyState
      {...args}
      action={
        <Button icon="icon-[mdi--plus]" size="sm">
          New invoice
        </Button>
      }
      icon="icon-[mdi--inbox-outline]"
    />
  ),
}

export const NoResults: Story = {
  args: {
    title: "No orders match these filters",
    description: "Clear a filter to see more orders.",
  },
  render: (args) => (
    <EmptyState
      {...args}
      action={
        <Button appearance="outline" severity="secondary" size="sm">
          Clear filters
        </Button>
      }
    />
  ),
}
