import type { Meta, StoryObj } from "@storybook/react"
import { useRef, useState } from "react"
import { fn } from "storybook/test"
import { Button } from "../../src/atoms/button"
import { Input } from "../../src/atoms/input"
import {
  Tour,
  type TourRootProps,
  type TourStep,
} from "../../src/molecules/tour"

function TourSurface() {
  return (
    <Tour.Portal>
      <Tour.Backdrop />
      <Tour.Spotlight />
      <Tour.Positioner>
        <Tour.Arrow />
        <Tour.Content>
          <Tour.CloseTrigger />
          <Tour.Title />
          <Tour.Description />
          <Tour.ProgressText />
          <Tour.Actions>
            <Tour.ActionTrigger action="skip" theme="borderless">
              Skip tour
            </Tour.ActionTrigger>
            <Tour.ActionTrigger action="prev" theme="outlined">
              Back
            </Tour.ActionTrigger>
            <Tour.Context>
              {(api) => (
                <Tour.ActionTrigger action={api.lastStep ? "dismiss" : "next"}>
                  {api.lastStep ? "Finish" : "Next"}
                </Tour.ActionTrigger>
              )}
            </Tour.Context>
          </Tour.Actions>
        </Tour.Content>
      </Tour.Positioner>
    </Tour.Portal>
  )
}

function TourExample(props: Omit<TourRootProps, "children" | "steps">) {
  const target = useRef<HTMLButtonElement>(null)
  const [status, setStatus] = useState("idle")
  const steps: TourStep[] = [
    {
      id: "welcome",
      type: "dialog",
      title: "Make yourself at home",
      description:
        "A short introduction to your workspace. You can leave at any time.",
    },
    {
      id: "create",
      target: () => target.current,
      title: "Create something new",
      description: "This is where your next project begins.",
    },
    {
      id: "done",
      type: "floating",
      title: "You are ready",
      description: "You can reopen this guide whenever you need it.",
    },
  ]
  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col gap-400 p-400 text-fg-primary">
      <h2 className="font-semibold text-xl">Your workspace</h2>
      <p className="text-fg-primary">
        Start the tour to try a dialog, a targeted tooltip and a floating panel.
        Use the Storybook controls to try RTL, blocked target interaction or
        different dismissal settings.
      </p>
      <Tour
        {...props}
        onStatusChange={(details) => {
          setStatus(details.status)
          props.onStatusChange?.(details)
        }}
        steps={steps}
      >
        <div className="flex flex-wrap items-center gap-200">
          <Tour.Trigger>Start tour</Tour.Trigger>
          <Button ref={target} theme="outlined">
            Create project
          </Button>
        </div>
        <p>
          Status: <output aria-label="Tour status">{status}</output>
        </p>
        <TourSurface />
      </Tour>
    </div>
  )
}

const meta = {
  title: "Molecules/Tour",
  component: Tour,
  tags: ["autodocs", "tour"],
  parameters: {
    layout: "fullscreen",
    controls: {
      include: [
        "closeOnEscape",
        "closeOnInteractOutside",
        "preventInteraction",
        "keyboardNavigation",
        "dir",
      ],
    },
  },
  argTypes: {
    closeOnEscape: { control: "boolean" },
    closeOnInteractOutside: { control: "boolean" },
    preventInteraction: { control: "boolean" },
    keyboardNavigation: { control: "boolean" },
    dir: { control: "select", options: ["ltr", "rtl"] },
  },
  args: {
    steps: [],
    children: null,
    closeOnEscape: true,
    closeOnInteractOutside: true,
    preventInteraction: false,
    keyboardNavigation: true,
    dir: "ltr",
    onStatusChange: fn(),
    onStepChange: fn(),
  },
  render: (args) => <TourExample {...args} />,
} satisfies Meta<typeof Tour>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

function LateTargetExample(props: Omit<TourRootProps, "children" | "steps">) {
  const target = useRef<HTMLButtonElement>(null)
  const [visible, setVisible] = useState(false)
  const [status, setStatus] = useState("idle")
  const [cleanupCount, setCleanupCount] = useState(0)
  return (
    <div className="flex min-h-svh flex-col items-start gap-200 p-400 text-fg-primary">
      <h2 className="font-semibold text-xl">A target that appears later</h2>
      <p>
        Click Start tour, then Reveal target within three seconds. The panel
        appears only after the target exists. To test a missing target, start
        and wait: the status becomes not-found. Reveal the target and start
        again to retry.
      </p>
      <Tour
        {...props}
        onStatusChange={(details) => {
          setStatus(details.status)
          props.onStatusChange?.(details)
        }}
        steps={[
          {
            id: "late",
            target: () => target.current,
            title: "The target is ready",
            description:
              "The tour waits for the element to appear, for up to three seconds.",
            effect({ show }) {
              show()
              return () => setCleanupCount((count) => count + 1)
            },
          },
        ]}
      >
        <Tour.Trigger>Start tour</Tour.Trigger>
        <Button
          disabled={visible}
          onClick={() => setVisible(true)}
          theme="outlined"
        >
          Reveal target
        </Button>
        {visible && <Button ref={target}>New target</Button>}
        <p>
          Status: <output aria-label="Tour status">{status}</output>
        </p>
        <p>
          Effect cleanup count:{" "}
          <output aria-label="Effect cleanup count">{cleanupCount}</output>
        </p>
        <TourSurface />
      </Tour>
    </div>
  )
}

export const LateTarget: Story = {
  render: (args) => <LateTargetExample {...args} />,
}

function InteractiveWaitExample(
  props: Omit<TourRootProps, "children" | "steps">
) {
  const target = useRef<HTMLButtonElement>(null)
  const cancelEffect = useRef<(() => void) | undefined>(undefined)
  const [cleanupCount, setCleanupCount] = useState(0)
  const [status, setStatus] = useState("idle")
  const steps: TourStep[] = [
    {
      id: "welcome",
      type: "dialog",
      title: "Connect your account",
      description:
        "The next step waits for your action without covering the page.",
    },
    {
      id: "connect",
      type: "wait",
      title: "Waiting for connection",
      description: "Activate the Connect account button to continue.",
      effect({ next, dismiss }) {
        const button = target.current
        cancelEffect.current = dismiss
        button?.addEventListener("click", next)
        return () => {
          button?.removeEventListener("click", next)
          cancelEffect.current = undefined
          setCleanupCount((count) => count + 1)
        }
      },
    },
    {
      id: "done",
      type: "dialog",
      title: "Account connected",
      description: "The effect listener has been cleaned up.",
    },
  ]
  return (
    <div className="flex min-h-svh flex-col items-start gap-200 p-400 text-fg-primary">
      <h2 className="font-semibold text-xl">Wait for an interaction</h2>
      <p>
        Start the tour and click Next. The panel disappears while the native
        wait step is active. Connect account continues to the final panel;
        Cancel waiting ends the tour. Both paths clean up the listener.
      </p>
      <Tour
        {...props}
        onStatusChange={(details) => {
          setStatus(details.status)
          props.onStatusChange?.(details)
        }}
        steps={steps}
      >
        <Tour.Trigger>Start tour</Tour.Trigger>
        <Button ref={target} theme="outlined">
          Connect account
        </Button>
        <Button onClick={() => cancelEffect.current?.()} theme="outlined">
          Cancel waiting
        </Button>
        <p>
          Effect cleanup count:{" "}
          <output aria-label="Effect cleanup count">{cleanupCount}</output>
        </p>
        <p>
          Status: <output aria-label="Tour status">{status}</output>
        </p>
        <TourSurface />
      </Tour>
    </div>
  )
}

export const InteractiveWait: Story = {
  render: (args) => <InteractiveWaitExample {...args} />,
}

const floatingPlacements = [
  "top-start",
  "top",
  "top-end",
  "right-start",
  "right",
  "right-end",
  "bottom-start",
  "bottom",
  "bottom-end",
  "left-start",
  "left",
  "left-end",
  "center",
] as const

export const FloatingPlacements: Story = {
  render: (args) => (
    <Tour
      {...args}
      steps={floatingPlacements.map((placement) => ({
        id: placement,
        type: "floating",
        placement,
        title: placement,
        description: "Floating panels use the viewport instead of a target.",
      }))}
    >
      <div className="flex flex-wrap gap-200 p-400">
        {floatingPlacements.map((placement) => (
          <Tour.Trigger key={placement} stepId={placement}>
            {placement}
          </Tour.Trigger>
        ))}
      </div>
      <TourSurface />
    </Tour>
  ),
}

function ControlsExample(props: Omit<TourRootProps, "children" | "steps">) {
  return (
    <Tour
      {...props}
      steps={[
        {
          id: "edit",
          type: "dialog",
          title: "Edit your name",
          description: (
            <div className="flex flex-col gap-200">
              <p>
                Try editing with the arrow keys. Update step changes the last
                step; Jump to end opens it. Replace steps is available there
                because the active step id must remain in the new list.
              </p>
              <Input aria-label="Your name" defaultValue="Ada" />
            </div>
          ),
        },
        {
          id: "done",
          type: "dialog",
          title: "Ready",
          description: "Changes stay owned by your app.",
        },
      ]}
    >
      <div className="flex flex-wrap gap-200 p-400">
        <Tour.Trigger disabled>Disabled start</Tour.Trigger>
        <Tour.Trigger onClick={(event) => event.preventDefault()}>
          Cancelled start
        </Tour.Trigger>
        <Tour.Trigger>Start tour</Tour.Trigger>
      </div>
      <Tour.Portal>
        <Tour.Backdrop />
        <Tour.Positioner>
          <Tour.Content>
            <Tour.Title />
            <Tour.Description />
            <Tour.Actions>
              <Tour.ActionTrigger
                action="next"
                onClick={(event) => event.preventDefault()}
              >
                Cancelled next
              </Tour.ActionTrigger>
              <Tour.ActionTrigger action="next" disabled>
                Disabled next
              </Tour.ActionTrigger>
              <Tour.ActionTrigger action={(actions) => actions.goto("done")}>
                Jump to end
              </Tour.ActionTrigger>
              <Tour.Context>
                {(api) => (
                  <Button
                    onClick={() =>
                      api.updateStep("done", { title: "Updated title" })
                    }
                  >
                    Update step
                  </Button>
                )}
              </Tour.Context>
              <Tour.Context>
                {(api) => (
                  <Button
                    disabled={!api.isCurrentStep("done")}
                    onClick={() => {
                      api.setSteps([
                        {
                          id: "done",
                          type: "dialog",
                          title: "Replacement tour",
                          description:
                            "Replaced through context while preserving the active id.",
                        },
                      ])
                    }}
                  >
                    Replace steps
                  </Button>
                )}
              </Tour.Context>
            </Tour.Actions>
            <Tour.CloseTrigger />
          </Tour.Content>
        </Tour.Positioner>
      </Tour.Portal>
    </Tour>
  )
}

export const CustomControls: Story = {
  render: (args) => <ControlsExample {...args} />,
}

export const LongContent: Story = {
  render: (args) => (
    <Tour
      {...args}
      steps={[
        {
          id: "long",
          type: "dialog",
          title: "A guide with longer content",
          description: (
            <div className="flex flex-col gap-200">
              {[
                "Welcome",
                "Workspace",
                "Projects",
                "Sharing",
                "Preferences",
                "Accounts",
                "Notifications",
                "Help",
                "Review",
                "Finish",
              ].map((section) => (
                <p key={section}>
                  {section}. Read this guide at your own pace. The panel stays
                  within the viewport and lets you scroll to its controls.
                </p>
              ))}
            </div>
          ),
        },
      ]}
    >
      <Tour.Trigger>Start tour</Tour.Trigger>
      <TourSurface />
    </Tour>
  ),
}

function UnmountExample(props: Omit<TourRootProps, "children" | "steps">) {
  const [mounted, setMounted] = useState(true)
  const [cleanupCount, setCleanupCount] = useState(0)
  return (
    <div className="flex flex-col items-start gap-200 p-400">
      <Button onClick={() => setMounted(false)}>Unmount tour</Button>
      <output aria-label="Effect cleanup count">{cleanupCount}</output>
      {mounted && (
        <Tour
          {...props}
          steps={[
            {
              id: "wait",
              type: "wait",
              title: "Waiting",
              description: "No overlay while waiting.",
              effect() {
                return () => setCleanupCount((count) => count + 1)
              },
            },
          ]}
        >
          <Tour.Trigger>Start tour</Tour.Trigger>
          <TourSurface />
        </Tour>
      )}
    </div>
  )
}

export const UnmountDuringWait: Story = {
  tags: ["!dev", "!autodocs"],
  render: (args) => <UnmountExample {...args} />,
}

function ScrollTargetExample(props: Omit<TourRootProps, "children" | "steps">) {
  const target = useRef<HTMLButtonElement>(null)
  return (
    <Tour
      {...props}
      steps={[
        {
          id: "below",
          target: () => target.current,
          title: "Further down the page",
          description:
            "The target is scrolled into view and the spotlight follows it.",
        },
      ]}
    >
      <div className="min-h-svh p-400">
        <Tour.Trigger>Start tour</Tour.Trigger>
      </div>
      <div className="min-h-svh p-400">
        <Button ref={target}>Target below the fold</Button>
      </div>
      <TourSurface />
    </Tour>
  )
}

export const ScrollTarget: Story = {
  render: (args) => <ScrollTargetExample {...args} />,
}
