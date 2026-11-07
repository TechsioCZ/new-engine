import type { Meta, StoryObj } from "@storybook/react"
import { type CSSProperties, useEffect, useState } from "react"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { Button } from "../../src/atoms/button"
import { StatusText } from "../../src/atoms/status-text"
import { Tooltip } from "../../src/atoms/tooltip"
import { Dialog } from "../../src/molecules/dialog"
import { Drawer } from "../../src/molecules/drawer"
import { Menu } from "../../src/molecules/menu"
import { Popover } from "../../src/molecules/popover"
import { createToaster, Toaster } from "../../src/molecules/toast"

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

async function assertFocusClearance(control: HTMLElement) {
  const viewport = control.closest<HTMLElement>(".dialog-scroll-viewport")
  await expect(viewport).not.toBeNull()
  const style = getComputedStyle(viewport!)
  const clearance = Number.parseFloat(style.paddingInlineStart)
  await expect(clearance).toBeGreaterThan(0)
  const outer = viewport!.getBoundingClientRect()
  const inner = control.getBoundingClientRect()
  await expect(inner.left - outer.left).toBeGreaterThanOrEqual(clearance - 0.5)
  await expect(outer.right - inner.right).toBeGreaterThanOrEqual(clearance - 0.5)
  await expect(inner.top - outer.top).toBeGreaterThanOrEqual(clearance - 0.5)
  await expect(outer.bottom - inner.bottom).toBeGreaterThanOrEqual(clearance - 0.5)
}

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
    await assertFocusClearance(menuTrigger)
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
    // The entrance fade starts at opacity 0; allow slow engines to finish it.
    await waitFor(() => expect(command).toBeVisible(), { timeout: 5000 })
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
    await assertFocusClearance(within(outer).getByRole("button", { name: "Open delivery options" }))
  },
}

type NotificationStore = ReturnType<typeof createToaster>

function Notify({ toast }: { toast: NotificationStore }) {
  const [message, setMessage] = useState("No catalog changes yet.")
  return (
    <div className="space-y-200" ref={(node) => {
      if (!node) return
      const content = node.closest<HTMLElement>('[data-scope="drawer"][data-part="content"]')
      if (!content) return
      // The toast portal inherits this measured clearance from its modal owner.
      // Measure relative to the panel so its translated detents do not affect it.
      const measure = () => content.style.setProperty(
        "--overlay-regressions-notification-body-end",
        `${node.getBoundingClientRect().bottom - content.getBoundingClientRect().top}px`,
      )
      measure()
      const observer = new ResizeObserver(measure)
      observer.observe(node)
      observer.observe(content)
      return () => observer.disconnect()
    }}>
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

// Keep the top-edge notification above partial detents, but below the header
// and notification controls when the Drawer fills the viewport.
function DetentNotificationsDemo() {
  const [expanded, setExpanded] = useState(false)
  const [toast] = useState(() => createToaster({
    placement: "top-end",
    offsets: {
      top: "var(--overlay-regressions-notification-top, 24px)",
      right: "24px",
      bottom: "24px",
      left: "24px",
    },
  }))
  useEffect(() => () => toast.remove(), [toast])
  return (
    <>
      <Drawer placement="bottom" size="full" snapPoints={[0.25, 0.5, 1]} defaultSnapPoint={0.5}
        onSnapPointChange={({ snapPoint }) => setExpanded(snapPoint === 1)}>
        <Drawer.Trigger>Open notification drawer</Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content style={{
              "--overlay-regressions-notification-top": expanded
                ? "calc(var(--overlay-regressions-notification-body-end, 0px) + var(--spacing-200))"
                : "24px",
            } as CSSProperties}>
              <Drawer.Header><Drawer.Title>Catalog updates</Drawer.Title></Drawer.Header>
              <Drawer.Body><Notify toast={toast} /></Drawer.Body>
              <Drawer.Footer>
                <Drawer.Context>{(api) => <>{([0.25, 0.5, 1] as const).map((point) => <Button key={point} onClick={() => api.setSnapPoint(point)} variant="secondary">{point * 100}%</Button>)}</>}</Drawer.Context>
                <Drawer.CloseTrigger>Close drawer</Drawer.CloseTrigger>
              </Drawer.Footer>
            </Drawer.Content>
          </Drawer.Positioner>
        </Drawer.Portal>
      </Drawer>
      <Toaster store={toast} />
    </>
  )
}

export const DetentNotifications: Story = {
  parameters: { docs: { description: { story: "Notification actions and Alt+T stay visible and focusable inside a bottom Drawer at quarter, half and full-height snap points, without covering its title, full-height notification controls or footer actions." } } },
  render: () => <DetentNotificationsDemo />,
  play: async ({ canvasElement }) => {
    const doc = canvasElement.ownerDocument
    const body = within(doc.body)
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Open notification drawer" }))
    const modal = await body.findByRole("dialog", { name: "Catalog updates" })
    await userEvent.click(within(modal).getByRole("button", { name: "Notify" }))
    const undo = await body.findByRole("button", { name: "Undo" })
    const updateStatus = within(modal)
      .getByText("Catalog updated for this preview.", { exact: true })
      .closest<HTMLElement>('[role="status"]')
    if (!updateStatus) throw new Error("Missing local update status")
    for (const detent of ["25%", "50%", "100%"]) {
      await userEvent.click(within(modal).getByRole("button", { name: detent }))
      undo.focus()
      await waitFor(() => {
        expect(undo).toHaveFocus()
        const rect = undo.getBoundingClientRect()
        expect(rect.top).toBeGreaterThanOrEqual(0)
        expect(rect.bottom).toBeLessThanOrEqual(doc.documentElement.clientHeight)
      })
      await waitFor(() => {
        const notification = undo.closest<HTMLElement>('[data-scope="toast"][data-part="root"]')
        expect(notification).not.toBeNull()
        const toastRect = notification!.getBoundingClientRect()
        const protectedElements = [
          within(modal).getByText("Catalog updates", { exact: true }),
          ...["25%", "50%", "100%", "Close drawer"].map((name) => within(modal).getByRole("button", { name })),
          ...(detent === "100%" ? [
            within(modal).getByRole("button", { name: "Notify" }),
            updateStatus,
          ] : []),
        ]
        for (const element of protectedElements) {
          const rect = element.getBoundingClientRect()
          expect(toastRect.bottom <= rect.top || toastRect.top >= rect.bottom || toastRect.right <= rect.left || toastRect.left >= rect.right).toBe(true)
        }
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
