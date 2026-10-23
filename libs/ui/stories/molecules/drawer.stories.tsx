import type { Meta, StoryObj } from "@storybook/react"
import { type ReactNode, useId, useState } from "react"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import { FormInput } from "../../src/molecules/form-input"
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
                variant="tertiary"
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
  component: Drawer,
  render: (args) => <DrawerStory {...args} />,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    controls: {
      disable: true,
      include: [
        "placement",
        "size",
        "modal",
        "draggable",
        "closeOnEscape",
        "closeOnInteractOutside",
        "preventScroll",
        "trapFocus",
        "triggerLabel",
      ],
    },
    docs: {
      description: {
        component:
          "Drawer presents contextual tasks in a transient edge panel, with swipe gestures and accessible focus management; use Dialog for centered confirmations, Sidebar for persistent navigation, and Popover for anchored content.",
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
      description:
        "Width for side drawers or height for top and bottom drawers",
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
} satisfies Meta<DrawerStoryArgs>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  parameters: {
    controls: { disable: false },
    docs: {
      description: {
        story:
          "A configurable workspace panel demonstrates edge placement, dimensions, drag behavior, and dismissal controls.",
      },
      source: {
        code: `import { Drawer } from "@techsio/ui-kit/molecules/drawer"

export function WorkspaceDrawer() {
  return (
    <Drawer placement="end" size="md">
      <Drawer.Trigger>Open drawer</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content draggable>
            <Drawer.Grabber>
              <Drawer.GrabberIndicator />
            </Drawer.Grabber>
            <Drawer.Header>
              <Drawer.Title>Playground drawer</Drawer.Title>
              <Drawer.Description>
                Review the current workspace settings.
              </Drawer.Description>
            </Drawer.Header>
            <Drawer.Body>
              Notifications, privacy, and workspace defaults are ready to review.
            </Drawer.Body>
            <Drawer.Footer>
              <Drawer.CloseTrigger variant="tertiary" theme="outlined">
                Close
              </Drawer.CloseTrigger>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Portal>
    </Drawer>
  )
}`,
      },
    },
  },
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", {
      name: "Open drawer",
    })
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(trigger)
    const drawer = await body.findByRole("dialog", {
      name: "Playground drawer",
    })
    await waitFor(() =>
      expect(drawer.contains(canvasElement.ownerDocument.activeElement)).toBe(
        true
      )
    )
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(drawer).not.toBeInTheDocument())
    await waitFor(() => expect(trigger).toHaveFocus())
    await userEvent.keyboard("{Enter}")
    const reopened = await body.findByRole("dialog", {
      name: "Playground drawer",
    })
    await waitFor(() =>
      expect(reopened.contains(canvasElement.ownerDocument.activeElement)).toBe(
        true
      )
    )
    await userEvent.click(
      within(reopened).getByRole("button", { name: /^Close$/ })
    )
    await waitFor(() => expect(reopened).not.toBeInTheDocument())
    await waitFor(() => expect(trigger).toHaveFocus())
  },
}

const placements = [
  { label: "Start", value: "start" },
  { label: "End", value: "end" },
  { label: "Top", value: "top" },
  { label: "Bottom", value: "bottom" },
] satisfies { label: string; value: DrawerPlacement }[]

export const Placements: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Start, end, top, and bottom panels demonstrate logical edge placement without duplicating Dialog examples.",
      },
    },
  },
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
  parameters: {
    docs: {
      description: {
        story:
          "Six panel sizes demonstrate how much page context remains visible around the drawer.",
      },
    },
  },
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
          "A bottom sheet combines draggable snap points with an upward edge-swipe opening gesture to reveal more or less page context.",
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
                    variant="tertiary"
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
  parameters: {
    docs: {
      description: {
        story:
          "Externally managed open state stays synchronized with the trigger, close action, and visible status.",
      },
    },
  },
  args: {},
  render: () => <ControlledDrawerExample />,
}

type Profile = { email: string; id: string; name: string }

const initialProfiles: Profile[] = [
  { email: "ada@example.com", id: "ada", name: "Ada Lovelace" },
  { email: "grace@example.com", id: "grace", name: "Grace Hopper" },
  { email: "margaret@example.com", id: "margaret", name: "Margaret Hamilton" },
]

function ProfileForm({
  formId,
  profile,
  onSave,
}: {
  formId: string
  profile: Profile
  onSave: (profile: Profile) => void
}) {
  const [name, setName] = useState(profile.name)
  const [email, setEmail] = useState(profile.email)
  return (
    <form
      id={formId}
      className="space-y-200"
      onSubmit={(event) => {
        event.preventDefault()
        onSave({ ...profile, name: name.trim(), email: email.trim() })
      }}
    >
      <FormInput
        label="Full name"
        autoComplete="name"
        required
        pattern={String.raw`.*\S.*`}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <FormInput
        label="Email address"
        autoComplete="email"
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
    </form>
  )
}

function ProfileEditor({
  profile,
  onSave,
}: {
  profile: Profile
  onSave: (profile: Profile) => void
}) {
  const formId = useId()
  return (
    <DrawerPanel
      description="Update contact details for this team member. Changes stay in this demo."
      draggable={false}
      title="Edit profile"
      footer={
        <>
          <Drawer.CloseTrigger size="md" theme="outlined" variant="tertiary">
            Cancel
          </Drawer.CloseTrigger>
          <Button type="submit" form={formId}>
            Save changes
          </Button>
        </>
      }
    >
      <Drawer.Context>
        {(api) => (
          <ProfileForm
            key={`${profile.id}-${api.open}`}
            formId={formId}
            profile={profile}
            onSave={onSave}
          />
        )}
      </Drawer.Context>
    </DrawerPanel>
  )
}

function MultipleTriggersExample() {
  const [profiles, setProfiles] = useState(initialProfiles)
  const [message, setMessage] = useState(
    "Select a team member to edit their profile."
  )
  return (
    <div className="space-y-150">
      <Drawer placement="end" size="sm">
        <div className="flex flex-wrap gap-100">
          {profiles.map((profile) => (
            <Drawer.Trigger
              key={profile.id}
              value={profile.id}
              theme="outlined"
              variant="tertiary"
            >
              Edit {profile.name.split(" ")[0]}
            </Drawer.Trigger>
          ))}
        </div>
        <Drawer.Context>
          {(api) => {
            const profile = profiles.find(({ id }) => id === api.triggerValue)
            return profile ? (
              <ProfileEditor
                key={profile.id}
                profile={profile}
                onSave={(updated) => {
                  setProfiles((current) =>
                    current.map((item) =>
                      item.id === updated.id ? updated : item
                    )
                  )
                  setMessage(`Profile saved for ${updated.name}.`)
                  api.setOpen(false)
                }}
              />
            ) : null
          }}
        </Drawer.Context>
      </Drawer>
      <p role="status" className="text-fg-secondary text-sm">
        {message}
      </p>
    </div>
  )
}

export const MultipleTriggers: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Each Edit trigger opens a real profile form; saving persists local edits, while Cancel discards the current draft.",
      },
    },
  },
  args: {},
  render: () => <MultipleTriggersExample />,
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
        className="relative isolate h-drawer-sm w-full max-w-3xl overflow-hidden rounded-md border border-border-primary bg-surface p-300"
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
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        story:
          "A non-modal drawer mounted inside a workspace container stays within its bounds instead of covering the viewport.",
      },
    },
  },
  render: () => (
    <div className="flex min-h-screen items-center justify-center p-300">
      <CustomContainerExample />
    </div>
  ),
}

function NonModalDrawerExample() {
  const [refreshes, setRefreshes] = useState(0)

  return (
    <div className="flex min-h-svh flex-col items-start gap-150 p-300">
      <Button onClick={() => setRefreshes((count) => count + 1)}>
        Refresh results
      </Button>
      <p aria-live="polite" className="text-fg-secondary text-sm">
        Refreshes: {refreshes}
      </p>
      <Drawer
        closeOnInteractOutside={false}
        modal={false}
        placement="bottom"
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
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        story:
          "An activity panel leaves background refresh controls usable while remaining open.",
      },
    },
  },
  args: {},
  render: () => <NonModalDrawerExample />,
}

function DrawerStackExample() {
  return (
    <Drawer.Stack>
      <Drawer.Indent className="rounded-md border border-border-primary bg-surface p-300">
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
  parameters: {
    docs: {
      description: {
        story:
          "A coordinated account and security stack demonstrates advanced nested panels; prefer a single panel for ordinary tasks.",
      },
    },
  },
  args: {},
  render: () => <DrawerStackExample />,
}
