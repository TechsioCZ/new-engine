import type { Meta, StoryObj } from "@storybook/react"
import { Button } from "../../src/atoms/button"
import { DetailList } from "../../src/molecules/detail-list"
import { SectionCard } from "../../src/molecules/section-card"
import { Table } from "../../src/organisms/table"

const meta = {
  title: "Molecules/SectionCard",
  component: SectionCard,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "A titled block of one page with optional local actions: the one outlined surface level. A SectionCard inside another SectionCard or a SidePanel drops its outline and padding, so frames never stack. Use `flush` for a child that draws its own edges, such as a Table.",
      },
    },
  },
  argTypes: {
    title: { control: "text", description: "The section's h2." },
    description: { control: "text", description: "One sentence under the title." },
    flush: { control: "boolean", description: "No padding, for a child with its own edges." },
    actions: { control: false },
    children: { control: false },
    ref: { control: false, table: { disable: true } },
  },
  args: {
    title: "Billing",
    description: "Where invoices for this customer are sent.",
    flush: false,
  },
} satisfies Meta<typeof SectionCard>

export default meta
type Story = StoryObj<typeof meta>

const details = [
  { label: "Billing email", value: "accounts@northwind.example" },
  { label: "Payment terms", value: "14 days" },
  { label: "VAT ID", value: "CZ12345678" },
  { label: "Currency", value: "EUR" },
]

export const Playground: Story = {
  render: (args) => (
    <SectionCard
      {...args}
      actions={
        <Button appearance="outline" severity="secondary" size="sm">
          Edit
        </Button>
      }
    >
      <DetailList items={details} />
    </SectionCard>
  ),
}

export const Flush: Story = {
  args: { title: "Latest invoices", description: undefined, flush: true },
  render: (args) => (
    <SectionCard {...args}>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Invoice</Table.ColumnHeader>
            <Table.ColumnHeader>Due</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row>
            <Table.Cell>2026-0098</Table.Cell>
            <Table.Cell>12 Dec 2026</Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>2026-0087</Table.Cell>
            <Table.Cell>28 Nov 2026</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>
    </SectionCard>
  ),
}

export const Nested: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A card inside a card draws no second frame: the outer card is the one outlined level.",
      },
    },
  },
  args: { title: "Customer", description: undefined },
  render: (args) => (
    <SectionCard {...args}>
      <SectionCard title="Billing">
        <DetailList items={details.slice(0, 2)} />
      </SectionCard>
      <SectionCard title="Shipping">
        <DetailList items={details.slice(2)} />
      </SectionCard>
    </SectionCard>
  ),
}
