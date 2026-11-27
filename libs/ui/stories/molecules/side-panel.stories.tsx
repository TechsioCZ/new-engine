import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { Button } from "../../src/atoms/button"
import { DetailList } from "../../src/molecules/detail-list"
import { FormInput } from "../../src/molecules/form-input"
import { SaveBar, type SaveBarStatus } from "../../src/molecules/save-bar"
import { SectionCard } from "../../src/molecules/section-card"
import { SidePanel } from "../../src/molecules/side-panel"
import { UnsavedChangesDialog } from "../../src/molecules/unsaved-changes-dialog"

const meta = {
  title: "Molecules/SidePanel",
  component: SidePanel,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "A right-hand panel for create, edit and quick-view forms, built on Dialog's right placement. Its left edge resizes it (drag, or the arrow keys; Home resets) and the chosen width is remembered. It closes on an Escape nothing above it owns, keeps an edited draft open on a stray press outside, and flattens SectionCards inside it. Every way of closing goes through `onCloseRequest`, where an app asks its unsaved-changes question.",
      },
    },
  },
  argTypes: {
    title: { control: "text" },
    description: { control: "text" },
    size: { control: "inline-radio", options: ["sm", "md", "lg", "xl"] },
    peek: { control: "boolean" },
    resizable: { control: "boolean" },
    open: { control: false },
    onOpenChange: { control: false },
    onCloseRequest: { control: false },
    actions: { control: false },
    children: { control: false },
  },
  args: {
    title: "Edit customer",
    description: "Changes apply to new orders.",
    size: "md",
    peek: false,
    resizable: true,
    open: false,
    onOpenChange: () => undefined,
  },
} satisfies Meta<typeof SidePanel>

export default meta
type Story = StoryObj<typeof meta>

function EditForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("Northwind Traders")
  const [status, setStatus] = useState<SaveBarStatus>("idle")
  return (
    <>
      <FormInput
        id="side-panel-customer-name"
        label="Name"
        onChange={(event) => {
          setName(event.target.value)
          setStatus("dirty")
        }}
        value={name}
      />
      <SaveBar
        onSave={() => {
          setStatus("saved")
          onDone()
        }}
        status={status}
      />
    </>
  )
}

export const Playground: Story = {
  render: function Render(args) {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setOpen(true)} size="sm">
          Edit customer
        </Button>
        <SidePanel {...args} onOpenChange={setOpen} open={open}>
          <EditForm onDone={() => setOpen(false)} />
        </SidePanel>
      </>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Edit customer" }))
    const body = within(canvasElement.ownerDocument.body)
    const panel = await body.findByRole("dialog", { name: "Edit customer" })
    await expect(
      within(panel).getByRole("button", { name: "Close panel" })
    ).toBeVisible()
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
  },
}

export const QuickView: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`peek` opens a non-blocking quick view: the page behind stays usable and a press outside leaves the panel open. SectionCards inside draw no frame of their own.",
      },
    },
  },
  args: { title: "Order 2026-0142", description: undefined, peek: true },
  render: function Render(args) {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setOpen(true)} size="sm">
          Preview order
        </Button>
        <SidePanel {...args} onOpenChange={setOpen} open={open}>
          <SectionCard title="Customer">
            <DetailList
              items={[
                { label: "Name", value: "Northwind Traders" },
                { label: "Email", value: "orders@northwind.example" },
              ]}
            />
          </SectionCard>
        </SidePanel>
      </>
    )
  },
}

export const GuardedClose: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "With `onCloseRequest` the app decides: here an edited form asks UnsavedChangesDialog before the panel closes.",
      },
    },
  },
  render: function Render(args) {
    const [open, setOpen] = useState(false)
    const [dirty, setDirty] = useState(false)
    const [leave, setLeave] = useState<(() => void) | null>(null)
    const closeAndReset = (close: () => void) => () => {
      setLeave(null)
      setDirty(false)
      close()
    }
    return (
      <>
        <Button onClick={() => setOpen(true)} size="sm">
          Edit customer
        </Button>
        <SidePanel
          {...args}
          onCloseRequest={(close) => {
            if (dirty) {
              setLeave(() => close)
              return
            }
            close()
          }}
          onOpenChange={setOpen}
          open={open}
        >
          <FormInput
            id="guarded-customer-name"
            label="Name"
            onChange={() => setDirty(true)}
          />
        </SidePanel>
        <UnsavedChangesDialog
          canSave={dirty}
          onDiscard={leave ? closeAndReset(leave) : () => undefined}
          onSave={leave ? closeAndReset(leave) : () => undefined}
          onStay={() => setLeave(null)}
          open={leave !== null}
        />
      </>
    )
  },
}
