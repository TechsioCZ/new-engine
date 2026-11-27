import type { Meta, StoryObj } from "@storybook/react"
import { Link } from "../../src/atoms/link"
import { StatCard, StatRow } from "../../src/molecules/stat-card"

const meta = {
  title: "Molecules/StatCard",
  component: StatCard,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "A KPI tile: label first, the value dominant, the change as a badge, never a chart. Tinted, never outlined. Lay several out with StatRow: one column on phones, two from sm, four from xl.",
      },
    },
  },
  argTypes: {
    label: { control: "text" },
    value: { control: "text", description: "Already formatted." },
    delta: { control: "text", description: "The change, already formatted." },
    trend: { control: "inline-radio", options: ["up", "down", "flat"] },
    hint: { control: "text" },
    size: { control: "inline-radio", options: ["sm", "md"] },
    icon: { control: false },
    action: { control: false },
    ref: { control: false, table: { disable: true } },
  },
  args: {
    label: "Revenue",
    value: "€48,210",
    delta: "+12.4 %",
    trend: "up",
    hint: "Last 30 days",
    size: "md",
  },
} satisfies Meta<typeof StatCard>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => (
    <div className="max-w-xs">
      <StatCard {...args} />
    </div>
  ),
}

export const Row: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <StatRow>
      <StatCard delta="+12.4 %" label="Revenue" trend="up" value="€48,210" />
      <StatCard delta="−3 %" label="Orders" trend="down" value="1,204" />
      <StatCard label="Average order" value="€40.04" />
      <StatCard
        action={<Link href="#">Show overdue</Link>}
        hint="Due before today"
        icon="icon-[mdi--alert-circle-outline]"
        label="Overdue invoices"
        value="7"
      />
    </StatRow>
  ),
}

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <StatRow>
      <StatCard label="Compact" size="sm" value="€1,248,210.50" />
      <StatCard label="Default" size="md" value="€48,210" />
    </StatRow>
  ),
}
