import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { expect, fn, userEvent, within } from "storybook/test"
import { Button } from "../../src/atoms/button"
import { BulkActionBar } from "../../src/molecules/bulk-action-bar"

const meta = {
  title: "Molecules/BulkActionBar",
  component: BulkActionBar,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Actions for the selected rows of a table. It appears above the table only while rows are selected and renders nothing at zero, so the table's own toolbar never changes shape. Actions go primary first, destructive last.",
      },
    },
  },
  argTypes: {
    selectedCount: { control: { type: "number", min: 0 } },
    onClear: { control: false },
    children: { control: false },
    ref: { control: false, table: { disable: true } },
  },
  args: { selectedCount: 3, onClear: fn() },
} satisfies Meta<typeof BulkActionBar>

export default meta
type Story = StoryObj<typeof meta>

const actions = (
  <>
    <Button appearance="outline" severity="secondary" size="sm">
      Assign
    </Button>
    <Button appearance="outline" severity="danger" size="sm">
      Delete
    </Button>
  </>
)

export const Playground: Story = {
  render: (args) => <BulkActionBar {...args}>{actions}</BulkActionBar>,
}

export const ClearSelection: Story = {
  parameters: {
    docs: {
      description: { story: "Clearing the selection removes the bar." },
    },
  },
  render: function Render() {
    const [count, setCount] = useState(2)
    return (
      <BulkActionBar onClear={() => setCount(0)} selectedCount={count}>
        {actions}
      </BulkActionBar>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Clear selection" }))
    await expect(canvas.queryByText("2 selected")).toBeNull()
  },
}
