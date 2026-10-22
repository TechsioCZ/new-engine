import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { Button } from "../../src/atoms/button"
import { StatusText } from "../../src/atoms/status-text"
import { Tooltip } from "../../src/atoms/tooltip"
import { Dialog } from "../../src/molecules/dialog"
import { Drawer } from "../../src/molecules/drawer"
import { Menu } from "../../src/molecules/menu"
import { Popover } from "../../src/molecules/popover"
import { ToastProvider, useToast } from "../../src/molecules/toast"

const meta = {
  title: "Molecules/Overlay regressions",
  component: Dialog,
  tags: ["autodocs", "ui-runtime-regression"],
  parameters: {
    docs: { description: { component: "Integrated overlay regressions verify Escape priority, nested modal portal ownership and viewport-relative notifications; use each component's own Docs for its public API." } },
    controls: { disable: true },
    layout: "centered",
  },
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  name: "Tooltip Escape priority",
  parameters: { docs: { description: { story: "A focused Menu dismisses before an older hint, and neither Escape cascades into the parent Dialog." } } },
  render: () => (
    <Dialog title="Escape priority host" triggerText="Open priority host">
      <Tooltip
        closeDelay={10000}
        closeOnClick={false}
        closeOnPointerDown={false}
        content="An older hint must not intercept the focused menu's Escape."
        defaultOpen
      >
        <Button variant="secondary">Hint trigger</Button>
      </Tooltip>
      <Menu
        items={[{ type: "action", value: "duplicate", label: "Duplicate catalog" }]}
        triggerText="Newer commands"
      />
    </Dialog>
  ),
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Open priority host" }))
    const modal = await body.findByRole("dialog", { name: "Escape priority host" })
    await expect(await body.findByRole("tooltip")).toBeVisible()
    const menuTrigger = within(modal).getByRole("button", { name: "Newer commands" })
    menuTrigger.focus()
    await userEvent.keyboard("{Enter}")
    const menu = await body.findByRole("menu")
    await waitFor(() => expect(menu).toHaveFocus())
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(menu).toHaveAttribute("data-state", "closed"))
    await expect(body.getByRole("tooltip")).toBeVisible()
    await expect(modal).toBeVisible()
    await waitFor(() => expect(menuTrigger).toHaveFocus())
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("tooltip")).toBeNull())
    await expect(modal).toBeVisible()
  },
}

export const ModalPopoverCommands: Story = {
  parameters: { docs: { description: { story: "A modal Popover inside Dialog owns its nested Menu so commands remain accessible and dismiss one level at a time." } } },
  render: () => (
    <Dialog title="Outer catalog task" triggerText="Open catalog task">
      <Popover modal>
        <Popover.Trigger>Open delivery options</Popover.Trigger>
        <Popover.Positioner>
          <Popover.Content>
            <Popover.Title>Delivery options</Popover.Title>
            <Popover.CloseTrigger />
            <Menu
              items={[{ type: "action", value: "express", label: "Use express delivery" }]}
              triggerText="Delivery commands"
            />
          </Popover.Content>
        </Popover.Positioner>
      </Popover>
    </Dialog>
  ),
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Open catalog task" }))
    const outer = await body.findByRole("dialog", { name: "Outer catalog task" })
    await userEvent.click(within(outer).getByRole("button", { name: "Open delivery options" }))
    const inner = await body.findByRole("dialog", { name: "Delivery options" })
    await userEvent.click(within(inner).getByRole("button", { name: "Delivery commands" }))
    const command = await body.findByRole("menuitem", { name: "Use express delivery" })
    // Role discovery can precede the menu's starting-style opacity transition.
    await waitFor(() => expect(command).toBeVisible())
    await expect(command.closest('[aria-hidden="true"], [inert]')).toBeNull()
    await expect(inner.contains(command)).toBe(true)
    await userEvent.keyboard("{Escape}")
    await waitFor(() => {
      expect(body.queryByRole("menu")).toBeNull()
      expect(within(inner).getByRole("button", { name: "Delivery commands" })).toHaveFocus()
    })
    await expect(inner).toBeVisible()
    await expect(outer).toBeVisible()
    await userEvent.keyboard("{Escape}")
    await waitFor(() => {
      expect(body.queryByRole("dialog", { name: "Delivery options" })).toBeNull()
      expect(within(outer).getByRole("button", { name: "Open delivery options" })).toHaveFocus()
    })
    await expect(outer).toBeVisible()
  },
}

function Notify() {
  const toast = useToast()
  const [message, setMessage] = useState("No catalog changes yet.")
  return (
    <div className="space-y-200">
      <Button onClick={() => {
        setMessage("Catalog updated for this preview.")
        toast.create({
          title: "Catalog updated",
          duration: Infinity,
          action: { label: "Undo", onClick: () => setMessage("Catalog update undone.") },
        })
      }}>
        Notify
      </Button>
      <StatusText role="status">{message}</StatusText>
    </div>
  )
}

export const DetentNotifications: Story = {
  parameters: { docs: { description: { story: "Notification actions and Alt+T stay visible and focusable inside a bottom Drawer at quarter, half and full-height snap points." } } },
  render: () => (
    <ToastProvider>
      <Drawer placement="bottom" size="full" snapPoints={[0.25, 0.5, 1]} defaultSnapPoint={0.5}>
        <Drawer.Trigger>Open notification drawer</Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content>
              <Drawer.Header><Drawer.Title>Catalog updates</Drawer.Title></Drawer.Header>
              <Drawer.Body><Notify /></Drawer.Body>
              <Drawer.Footer>
                <Drawer.Context>{(api) => <>{([0.25, 0.5, 1] as const).map((point) => <Button key={point} onClick={() => api.setSnapPoint(point)} variant="secondary">{point * 100}%</Button>)}</>}</Drawer.Context>
                <Drawer.CloseTrigger>Close drawer</Drawer.CloseTrigger>
              </Drawer.Footer>
            </Drawer.Content>
          </Drawer.Positioner>
        </Drawer.Portal>
      </Drawer>
    </ToastProvider>
  ),
  play: async ({ canvasElement }) => {
    const doc = canvasElement.ownerDocument
    const body = within(doc.body)
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Open notification drawer" }))
    const modal = await body.findByRole("dialog", { name: "Catalog updates" })
    await userEvent.click(within(modal).getByRole("button", { name: "Notify" }))
    const undo = await body.findByRole("button", { name: "Undo" })
    for (const detent of ["25%", "50%", "100%"]) {
      await userEvent.click(within(modal).getByRole("button", { name: detent }))
      undo.focus()
      await waitFor(() => {
        expect(undo).toHaveFocus()
        const rect = undo.getBoundingClientRect()
        expect(rect.top).toBeGreaterThanOrEqual(0)
        expect(rect.bottom).toBeLessThanOrEqual(doc.documentElement.clientHeight)
      })
      await expect(modal.contains(undo)).toBe(true)
      await expect(undo.closest('[aria-hidden="true"], [inert]')).toBeNull()
      within(modal).getByRole("button", { name: "Notify" }).focus()
      await userEvent.keyboard("{Alt>}t{/Alt}")
      await waitFor(() => expect(doc.activeElement?.closest('[data-scope="toast"][data-part="group"]')).not.toBeNull())
    }
    await userEvent.click(body.getByRole("button", { name: "Close notification" }))
    await userEvent.click(within(modal).getByRole("button", { name: "Close drawer" }))
  },
}
