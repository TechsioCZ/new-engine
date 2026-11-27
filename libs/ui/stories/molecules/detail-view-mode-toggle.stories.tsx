import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { expect, userEvent, within } from "storybook/test"
import {
  type DetailViewMode,
  DetailViewModeToggle,
} from "../../src/molecules/detail-view-mode-toggle"

const meta = {
  title: "Molecules/DetailViewModeToggle",
  component: DetailViewModeToggle,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "A two-way switch between opening a list's records as a full page or in a side panel. The app owns the value and where the choice is remembered.",
      },
    },
  },
  argTypes: {
    value: { control: "inline-radio", options: ["page", "panel"] },
    size: { control: "inline-radio", options: ["sm", "md"] },
    onValueChange: { control: false },
    ref: { control: false, table: { disable: true } },
  },
  args: { value: "page", size: "sm", onValueChange: () => undefined },
} satisfies Meta<typeof DetailViewModeToggle>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: function Render(args) {
    const [value, setValue] = useState<DetailViewMode>(args.value)
    return <DetailViewModeToggle {...args} onValueChange={setValue} value={value} />
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const panel = canvas.getByRole("button", { name: "Side panel" })
    await userEvent.click(panel)
    await expect(panel).toHaveAttribute("aria-pressed", "true")
  },
}
