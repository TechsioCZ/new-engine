import type { Meta, StoryObj } from "@storybook/react"
import { type ReactNode, useState } from "react"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import {
  Drawer,
  type DrawerPlacement,
  type DrawerPortalProps,
  type DrawerRootProps,
  type DrawerSize,
} from "../../src/molecules/drawer"

type DrawerPanelProps = {
  backdrop?: boolean
  children?: ReactNode
  contained?: boolean
  description?: string
  draggable?: boolean
  footer?: ReactNode
  portalProps?: Omit<DrawerPortalProps, "children">
  showGrabber?: boolean
  title: string
}

function DrawerPanel({
  backdrop = true,
  children,
  contained = false,
  description,
  draggable = true,
  footer,
  portalProps,
  showGrabber = true,
  title,
}: DrawerPanelProps) {
  return (
    <Drawer.Portal {...portalProps}>
      {backdrop ? (
        <Drawer.Backdrop className={contained ? "absolute" : undefined} />
      ) : null}
      <Drawer.Positioner className={contained ? "absolute" : undefined}>
        <Drawer.Content draggable={draggable}>
          {showGrabber ? (
            <Drawer.Grabber>
              <Drawer.GrabberIndicator />
            </Drawer.Grabber>
          ) : null}
          <Drawer.Header>
            <Drawer.Title>{title}</Drawer.Title>
            {description ? (
              <Drawer.Description>{description}</Drawer.Description>
            ) : null}
          </Drawer.Header>
          <Drawer.Body>{children}</Drawer.Body>
          <Drawer.Footer>
            {footer ?? (
              <Drawer.CloseTrigger
                size="md"
                theme="outlined"
                variant="secondary"
              >
                Close
              </Drawer.CloseTrigger>
            )}
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer.Positioner>
    </Drawer.Portal>
  )
}

type DrawerStoryArgs = Omit<DrawerRootProps, "children"> & {
  draggable: boolean
  triggerLabel: string
}

function DrawerStory({
  draggable,
  triggerLabel,
  ...rootProps
}: DrawerStoryArgs) {
  return (
    <Drawer {...rootProps}>
      <Drawer.Trigger>{triggerLabel}</Drawer.Trigger>
      <DrawerPanel
        description="Review the current workspace settings."
        draggable={draggable}
        title="Playground drawer"
      >
        <p className="text-fg-secondary text-sm">
          Notifications, privacy, and workspace defaults are ready to review.
        </p>
      </DrawerPanel>
    </Drawer>
  )
}

const meta = {
  title: "Molecules/Drawer",
  component: DrawerStory,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A Zag.js-powered compound drawer with logical placement, snap points, swipe gestures, controlled state, custom portals, and coordinated stacks.",
      },
    },
  },
  argTypes: {
    placement: {
      control: "select",
      options: ["start", "end", "top", "bottom"],
      description: "Logical edge from which the drawer enters",
      table: { defaultValue: { summary: "end" } },
    },
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg", "xl", "full"],
      description: "Width for side drawers or height for top and bottom drawers",
      table: { defaultValue: { summary: "md" } },
    },
    modal: {
      control: "boolean",
      description: "Block interaction outside the drawer",
      table: { defaultValue: { summary: "true" } },
    },
    draggable: {
      control: "boolean",
      description: "Allow dragging from the content surface",
      table: { defaultValue: { summary: "true" } },
    },
    closeOnEscape: {
      control: "boolean",
      description: "Close when Escape is pressed",
      table: { defaultValue: { summary: "true" } },
    },
    closeOnInteractOutside: {
      control: "boolean",
      description: "Close after an interaction outside the drawer",
      table: { defaultValue: { summary: "true" } },
    },
    preventScroll: {
      control: "boolean",
      description: "Prevent scrolling behind an open drawer",
      table: { defaultValue: { summary: "true" } },
    },
    trapFocus: {
      control: "boolean",
      description: "Keep focus within an open drawer",
      table: { defaultValue: { summary: "true" } },
    },
    triggerLabel: {
      control: "text",
      description: "Trigger button label",
    },
    ids: { table: { disable: true } },
    initialFocusEl: { table: { disable: true } },
    finalFocusEl: { table: { disable: true } },
    getRootNode: { table: { disable: true } },
    stack: { table: { disable: true } },
    onOpenChange: { control: false },
    onSnapPointChange: { control: false },
    onTriggerValueChange: { control: false },
  },
  args: {
    closeOnEscape: true,
    closeOnInteractOutside: true,
    draggable: true,
    modal: true,
    onOpenChange: fn(),
    placement: "end",
    preventScroll: true,
    size: "md",
    trapFocus: true,
    triggerLabel: "Open drawer",
  },
} satisfies Meta<typeof DrawerStory>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const documentBody = within(canvasElement.ownerDocument.body)
    const trigger = canvas.getByRole("button", { name: "Open drawer" })

    await userEvent.click(trigger)
    const dialog = await documentBody.findByRole("dialog", {
      name: "Playground drawer",
    })
    await expect(dialog).toBeVisible()

    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(
        documentBody.queryByRole("dialog", { name: "Playground drawer" })
      ).not.toBeInTheDocument()
    )
    await expect(trigger).toHaveFocus()
  },
}

const placements = [
  { label: "Start", value: "start" },
  { label: "End", value: "end" },
  { label: "Top", value: "top" },
  { label: "Bottom", value: "bottom" },
] satisfies { label: string; value: DrawerPlacement }[]

export const Placements: Story = {
  args: {},
  render: () => (
    <VariantContainer>
      <VariantGroup title="Placements">
        {placements.map(({ label, value }) => (
          <Drawer key={value} placement={value} size="sm">
            <Drawer.Trigger>{label}</Drawer.Trigger>
            <DrawerPanel
              description="Review recent workspace activity."
              title={`${label} drawer`}
            >
              <p className="text-fg-secondary text-sm">
                Three teammates updated shared catalog records today.
              </p>
            </DrawerPanel>
          </Drawer>
        ))}
      </VariantGroup>
    </VariantContainer>
  ),
}

const sizes = ["xs", "sm", "md", "lg", "xl", "full"] satisfies DrawerSize[]

export const Sizes: Story = {
  args: {},
  render: () => (
    <VariantContainer>
      <VariantGroup title="Sizes">
        {sizes.map((size) => (
          <Drawer key={size} placement="end" size={size}>
            <Drawer.Trigger>{size.toUpperCase()}</Drawer.Trigger>
            <DrawerPanel
              description="Review pending catalog changes."
              title={`${size.toUpperCase()} drawer`}
            >
              <p className="text-fg-secondary text-sm">
                Twelve product records are ready for approval.
              </p>
            </DrawerPanel>
          </Drawer>
        ))}
      </VariantGroup>
    </VariantContainer>
  ),
}

export const SnapPointsAndSwipe: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story:
          "Drag the content or grabber between snap points. The edge SwipeArea also opens the closed drawer with an upward gesture.",
      },
    },
  },
  render: () => (
    <Drawer
      defaultSnapPoint={0.5}
      placement="bottom"
      size="full"
      snapPoints={[0.25, 0.5, 1]}
      snapToSequentialPoints
    >
      <Drawer.Trigger>Open snap drawer</Drawer.Trigger>
      <Drawer.SwipeArea />
      <DrawerPanel
        description="Adjust how much of the catalog remains visible."
        title="Product filters"
      >
        <Drawer.Context>
          {(api) => (
            <div className="space-y-150">
              <p aria-live="polite" className="text-fg-secondary text-sm">
                Active height: {String(api.snapPoint)}
              </p>
              <div className="flex flex-wrap gap-100">
                {api.snapPoints.map((snapPoint) => (
                  <Button
                    key={String(snapPoint)}
                    onClick={() => api.setSnapPoint(snapPoint)}
                    size="sm"
                    theme="outlined"
                    variant="secondary"
                  >
                    {Number(snapPoint) * 100}%
                  </Button>
                ))}
              </div>
            </div>
          )}
        </Drawer.Context>
      </DrawerPanel>
    </Drawer>
  ),
}

function ControlledDrawerExample() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col items-center gap-150">
      <p aria-live="polite" className="text-fg-secondary text-sm">
        Drawer state: {open ? "open" : "closed"}
      </p>
      <Drawer
        open={open}
        onOpenChange={({ open: nextOpen }) => setOpen(nextOpen)}
        placement="start"
        size="sm"
      >
        <Drawer.Trigger>
          {open ? "Close controlled drawer" : "Open controlled drawer"}
        </Drawer.Trigger>
        <DrawerPanel
          description="Review the latest workspace changes."
          title="Controlled drawer"
        >
          <p className="text-fg-secondary text-sm">
            The catalog sync completed without conflicts.
          </p>
        </DrawerPanel>
      </Drawer>
    </div>
  )
}

export const Controlled: Story = {
  args: {},
  render: () => <ControlledDrawerExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const documentBody = within(canvasElement.ownerDocument.body)

    await userEvent.click(
      canvas.getByRole("button", { name: "Open controlled drawer" })
    )
    const dialog = await documentBody.findByRole("dialog", {
      name: "Controlled drawer",
    })
    await expect(canvas.getByText("Drawer state: open")).toBeVisible()
    await userEvent.click(within(dialog).getByRole("button", { name: "Close" }))
    await expect(canvas.getByText("Drawer state: closed")).toBeVisible()
  },
}

const profiles = [
  { email: "ada@example.com", id: "ada", name: "Ada Lovelace" },
  { email: "grace@example.com", id: "grace", name: "Grace Hopper" },
  { email: "margaret@example.com", id: "margaret", name: "Margaret Hamilton" },
] as const

function MultipleTriggersExample() {
  return (
    <Drawer placement="end" size="sm">
      <div className="flex flex-wrap gap-100">
        {profiles.map((profile) => (
          <Drawer.Trigger key={profile.id} value={profile.id}>
            Edit {profile.name.split(" ")[0]}
          </Drawer.Trigger>
        ))}
      </div>
      <DrawerPanel
        description="Update contact details for this team member."
        title="Edit profile"
      >
        <Drawer.Context>
          {(api) => {
            const profile = profiles.find(
              ({ id }) => id === api.triggerValue
            )

            return profile ? (
              <div className="space-y-100 rounded-md border border-border-primary bg-surface-secondary p-150">
                <p className="font-medium text-fg-primary">{profile.name}</p>
                <p className="text-fg-secondary text-sm">{profile.email}</p>
              </div>
            ) : null
          }}
        </Drawer.Context>
      </DrawerPanel>
    </Drawer>
  )
}

export const MultipleTriggers: Story = {
  args: {},
  render: () => <MultipleTriggersExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const documentBody = within(canvasElement.ownerDocument.body)

    await userEvent.click(canvas.getByRole("button", { name: "Edit Ada" }))
    let dialog = await documentBody.findByRole("dialog", {
      name: "Edit profile",
    })
    await expect(within(dialog).getByText("ada@example.com")).toBeVisible()
    await userEvent.click(within(dialog).getByRole("button", { name: "Close" }))

    await userEvent.click(canvas.getByRole("button", { name: "Edit Grace" }))
    dialog = await documentBody.findByRole("dialog", { name: "Edit profile" })
    await expect(within(dialog).getByText("grace@example.com")).toBeVisible()
    await userEvent.keyboard("{Escape}")
  },
}

function CustomContainerExample() {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)

  return (
    <Drawer
      modal={false}
      placement="end"
      preventScroll={false}
      size="sm"
      trapFocus={false}
    >
      <div
        className="relative isolate h-sm w-full max-w-3xl overflow-hidden rounded-md border border-border-primary bg-surface-secondary p-300"
        ref={setContainer}
      >
        <div className="flex h-full items-center justify-center">
          <Drawer.Trigger>Open contained drawer</Drawer.Trigger>
        </div>
        {container ? (
          <DrawerPanel
            contained
            description="Review changes within this workspace."
            portalProps={{ container: { current: container } }}
            title="Contained drawer"
          >
            <p className="text-fg-secondary text-sm">
              Workspace permissions were last updated yesterday.
            </p>
          </DrawerPanel>
        ) : null}
      </div>
    </Drawer>
  )
}

export const CustomContainer: Story = {
  args: {},
  parameters: { layout: "fullscreen" },
  render: () => (
    <div className="flex min-h-screen items-center justify-center p-300">
      <CustomContainerExample />
    </div>
  ),
}

function NonModalDrawerExample() {
  const [refreshes, setRefreshes] = useState(0)

  return (
    <div className="flex flex-col items-center gap-150">
      <Button onClick={() => setRefreshes((count) => count + 1)}>
        Refresh results
      </Button>
      <p aria-live="polite" className="text-fg-secondary text-sm">
        Refreshes: {refreshes}
      </p>
      <Drawer
        closeOnInteractOutside={false}
        modal={false}
        placement="end"
        preventScroll={false}
        size="sm"
        trapFocus={false}
      >
        <Drawer.Trigger>Open activity panel</Drawer.Trigger>
        <DrawerPanel
          backdrop={false}
          description="Updates from the current catalog sync."
          title="Recent activity"
        >
          <p className="text-fg-secondary text-sm">
            Twelve catalog records were updated today.
          </p>
        </DrawerPanel>
      </Drawer>
    </div>
  )
}

export const NonModal: Story = {
  args: {},
  render: () => <NonModalDrawerExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const documentBody = within(canvasElement.ownerDocument.body)

    await userEvent.click(
      canvas.getByRole("button", { name: "Open activity panel" })
    )
    await documentBody.findByRole("dialog", { name: "Recent activity" })
    await userEvent.click(
      canvas.getByRole("button", { name: "Refresh results" })
    )
    await expect(canvas.getByText("Refreshes: 1")).toBeVisible()
    await userEvent.keyboard("{Escape}")
  },
}

function DrawerStackExample() {
  return (
    <Drawer.Stack>
      <Drawer.Indent className="rounded-md border border-border-primary bg-surface-secondary p-300">
        <Drawer placement="end" size="md">
          <Drawer.Trigger>Open account drawer</Drawer.Trigger>
          <DrawerPanel
            description="Manage personal details and sign-in options."
            title="Account"
          >
            <div className="space-y-150">
              <p className="text-fg-secondary text-sm">
                Manage personal details and sign-in options.
              </p>
              <Drawer placement="end" size="sm">
                <Drawer.Trigger>Security settings</Drawer.Trigger>
                <DrawerPanel
                  description="Review authentication and recovery settings."
                  title="Security"
                >
                  <p className="text-fg-secondary text-sm">
                    Passkeys and two-factor authentication are enabled.
                  </p>
                </DrawerPanel>
              </Drawer>
            </div>
          </DrawerPanel>
        </Drawer>
      </Drawer.Indent>
    </Drawer.Stack>
  )
}

export const Stack: Story = {
  args: {},
  render: () => <DrawerStackExample />,
}
