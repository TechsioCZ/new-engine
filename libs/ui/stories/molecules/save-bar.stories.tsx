import type { Meta, StoryObj } from "@storybook/react"
import { fn } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { SaveBar, type SaveBarStatus } from "../../src/molecules/save-bar"

const statuses: SaveBarStatus[] = [
  "idle",
  "ready",
  "dirty",
  "invalid",
  "saving",
  "saved",
  "proposed",
  "error",
  "conflict",
  "reload-required",
]

const meta = {
  title: "Molecules/SaveBar",
  component: SaveBar,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "The save control of an edit form: one primary Save button with the draft's status beside it. The button is enabled only for a savable draft and shows the loading state while the save runs; one click sends one save. A conflict offers to load the latest version, and a draft left behind by a new release offers to reload and restore it.",
      },
    },
  },
  argTypes: {
    status: { control: "select", options: statuses },
    size: { control: "inline-radio", options: ["sm", "md"] },
    error: { control: "text", description: "error only: the form's own failure text." },
    onSave: { control: false },
    onReloadLatest: { control: false },
    onReloadKeepingDrafts: { control: false },
    ref: { control: false, table: { disable: true } },
  },
  args: {
    status: "dirty",
    size: "md",
    onSave: fn(),
    onReloadLatest: fn(),
    onReloadKeepingDrafts: fn(),
  },
} satisfies Meta<typeof SaveBar>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const States: Story = {
  parameters: { controls: { disable: true } },
  render: (args) => (
    <VariantContainer>
      {statuses.map((status) => (
        <VariantGroup fullWidth key={status} title={status}>
          <SaveBar {...args} status={status} />
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
}
