import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { Button } from "../../src/atoms/button"
import { UnsavedChangesDialog } from "../../src/molecules/unsaved-changes-dialog"

const meta = {
  title: "Molecules/UnsavedChangesDialog",
  component: UnsavedChangesDialog,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "The question asked before unsaved changes are left: Save, Discard changes or Stay. Escape and a press outside mean Stay. The app decides when to ask (a close, a navigation, switching record) and what each answer does.",
      },
    },
  },
  argTypes: {
    open: { control: false },
    canSave: { control: "boolean" },
    saving: { control: "boolean" },
    onSave: { control: false },
    onDiscard: { control: false },
    onStay: { control: false },
  },
  args: {
    open: false,
    canSave: true,
    saving: false,
    onSave: fn(),
    onDiscard: fn(),
    onStay: fn(),
  },
} satisfies Meta<typeof UnsavedChangesDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: function Render(args) {
    const [open, setOpen] = useState(false)
    const answer = (handler: () => void) => () => {
      handler()
      setOpen(false)
    }
    return (
      <>
        <Button onClick={() => setOpen(true)} size="sm">
          Leave the form
        </Button>
        <UnsavedChangesDialog
          {...args}
          onDiscard={answer(args.onDiscard)}
          onSave={answer(args.onSave)}
          onStay={answer(args.onStay)}
          open={open}
        />
      </>
    )
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Leave the form" }))
    const body = within(canvasElement.ownerDocument.body)
    const dialog = await body.findByRole("alertdialog")
    await expect(dialog).toHaveAccessibleName("Unsaved changes")
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(args.onStay).toHaveBeenCalled())
  },
}
