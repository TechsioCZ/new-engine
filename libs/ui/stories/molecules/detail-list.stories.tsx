import type { Meta, StoryObj } from "@storybook/react"
import { Badge } from "../../src/atoms/badge"
import { Link } from "../../src/atoms/link"
import { DetailList } from "../../src/molecules/detail-list"

const meta = {
  title: "Molecules/DetailList",
  component: DetailList,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "A read-only label and value grid for detail pages and panels: one column on phones, two from sm. Values can be any content; long values wrap anywhere instead of overflowing.",
      },
    },
  },
  argTypes: {
    items: { control: "object" },
    ref: { control: false, table: { disable: true } },
  },
  args: {
    items: [
      { label: "Customer", value: "Northwind Traders" },
      { label: "Order date", value: "27 Nov 2026" },
      { label: "Status", value: <Badge severity="success" size="sm">Paid</Badge> },
      { label: "Contact", value: <Link href="#">anna.novak@northwind.example</Link> },
      {
        label: "Delivery note",
        value: "Leave the parcel at the reception desk; the loading dock closes at 16:00.",
      },
    ],
  },
} satisfies Meta<typeof DetailList>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
