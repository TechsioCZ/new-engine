import type { Options } from "@zag-js/toast"
import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { VariantContainer } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import { ToastProvider, useToast } from "../../src/molecules/toast"

type ToastStoryArgs = Pick<
  Options<string>,
  "type" | "title" | "description" | "duration" | "closable"
>

const meta: Meta<ToastStoryArgs> = {
  title: "Molecules/Toast",
  parameters: {
    docs: {
      description: {
        component:
          "A temporary notification for the result of a user action or a background operation. Use inline StatusText for field validation and Dialog for a decision requiring attention. Mount one Toaster per store, or ToastProvider for an isolated surface; toast layout is responsive rather than size-variant based.",
      },
    },
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
  argTypes: {
    closable: { control: "boolean" },
    type: {
      control: "select",
      options: ["info", "success", "warning", "error", "loading"],
      description: "The type of the toast, which determines its styling",
      table: { defaultValue: { summary: "info" } },
    },
    duration: {
      control: "number",
      description:
        "Duration in milliseconds before auto-close. Use Infinity to keep open.",
      table: { defaultValue: { summary: "5000" } },
    },
    title: {
      control: "text",
      description: "The title text of the toast",
    },
    description: {
      control: "text",
      description: "The description text of the toast",
    },
  },
  args: {
    type: "success",
    duration: 5000,
    closable: true,
    title: "Project saved",
    description: "Your teammates can see the latest changes.",
  },
}

export default meta
type Story = StoryObj<ToastStoryArgs>

export const Playground: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Show Toast" })
    )
    const body = within(canvasElement.ownerDocument.body)
    await waitFor(async () => {
      await expect(body.getAllByRole("status")).toHaveLength(1)
    })
    const roots = canvasElement.ownerDocument.querySelectorAll(
      '[data-scope="toast"][data-part="root"]'
    )
    await expect(roots).toHaveLength(1)
    if (args.closable !== false)
      await userEvent.click(
        body.getByRole("button", { name: "Close notification" })
      )
  },
  parameters: {
    docs: {
      description: {
        story:
          "Create one notification in this isolated preview and adjust its status, copy, duration and close affordance.",
      },
    },
  },
  args: {
    title: "Project saved",
    description: "Your teammates can see the latest changes.",
    type: "success",
  },
  render: (args) => {
    const toaster = useToast()
    return (
      <VariantContainer>
        <Button
          onClick={() => {
            toaster.create(args)
          }}
        >
          Show Toast
        </Button>
      </VariantContainer>
    )
  },
}

export const UpdateExample: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Update one notification through progress and completion instead of stacking duplicate messages.",
      },
    },
  },
  render: () => {
    const toaster = useToast()
    const [toastId, setToastId] = useState<string | null>(null)
    const [step, setStep] = useState(0)

    return (
      <VariantContainer>
        <div className="space-y-200">
          <p className="text-fg-secondary text-sm">
            Create a toast, then update it step by step
          </p>
          <div className="flex gap-200">
            <Button
              size="sm"
              onClick={() => {
                const id = toaster.create({
                  title: "Original Toast",
                  description: "This is the original message",
                  type: "info",
                  duration: Number.POSITIVE_INFINITY, // Keep it open
                })
                setToastId(id)
                setStep(0)
              }}
            >
              Create Toast
            </Button>

            {toastId && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const nextStep = step + 1
                  setStep(nextStep)

                  const updates = [
                    {
                      title: "Step 1",
                      description: "Loading data...",
                      type: "loading",
                    },
                    {
                      title: "Step 2",
                      description: "Processing...",
                      type: "loading",
                    },
                    {
                      title: "Complete!",
                      description: "Operation successful",
                      type: "success",
                    },
                  ]

                  const update = updates[nextStep - 1]
                  if (update) {
                    toaster.update(toastId, update)
                  }
                }}
                disabled={step >= 3}
              >
                Update Toast (Step {step + 1})
              </Button>
            )}
          </div>
        </div>
      </VariantContainer>
    )
  },
}

export const RemoveVsDismiss: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare immediate removal with animated dismissal for a notification already on screen.",
      },
    },
  },
  render: () => {
    const toaster = useToast()
    const [toastIds, setToastIds] = useState<{
      instant: string | null
      animated: string | null
    }>({
      instant: null,
      animated: null,
    })

    return (
      <VariantContainer>
        <div className="space-y-200">
          <p className="text-fg-secondary text-sm">
            Compare remove (instant) vs dismiss (with animation)
          </p>

          <div className="grid grid-cols-2 gap-200">
            <div className="space-y-100">
              <h3 className="font-semibold">Remove (Instant)</h3>
              <Button
                size="sm"
                onClick={() => {
                  const id = toaster.create({
                    title: "I will be removed instantly",
                    description: "Click the button below to remove me",
                    type: "info",
                    duration: Number.POSITIVE_INFINITY,
                  })
                  setToastIds((prev) => ({ ...prev, instant: id }))
                }}
              >
                Create Toast for Remove
              </Button>

              {toastIds.instant && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    toaster.remove(toastIds.instant!)
                    setToastIds((prev) => ({ ...prev, instant: null }))
                  }}
                >
                  Remove Toast (Instant)
                </Button>
              )}
            </div>

            <div className="space-y-100">
              <h3 className="font-semibold">Dismiss (Animated)</h3>
              <Button
                size="sm"
                onClick={() => {
                  const id = toaster.create({
                    title: "I will be dismissed with animation",
                    description: "Click the button below to dismiss me",
                    type: "info",
                    duration: Number.POSITIVE_INFINITY,
                  })
                  setToastIds((prev) => ({ ...prev, animated: id }))
                }}
              >
                Create Toast for Dismiss
              </Button>

              {toastIds.animated && (
                <Button
                  size="sm"
                  variant="warning"
                  onClick={() => {
                    toaster.dismiss(toastIds.animated!)
                    setToastIds((prev) => ({ ...prev, animated: null }))
                  }}
                >
                  Dismiss Toast (Animated)
                </Button>
              )}
            </div>
          </div>
        </div>
      </VariantContainer>
    )
  },
}

export const PauseResumeExample: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Pause or resume a timed notification without losing the message context.",
      },
    },
  },
  render: () => {
    const toaster = useToast()
    const [toastId, setToastId] = useState<string | null>(null)
    const [isPaused, setIsPaused] = useState(false)

    return (
      <VariantContainer>
        <div className="space-y-200">
          <p className="text-fg-secondary text-sm">
            Create a toast with timer, then pause/resume it
          </p>

          <div className="flex gap-200">
            <Button
              size="sm"
              onClick={() => {
                const id = toaster.create({
                  title: "Auto-closing toast",
                  description: "I will close in 5 seconds unless paused",
                  type: "info",
                  duration: 5000,
                  onStatusChange({ status }) {
                    if (status === "dismissing" || status === "unmounted") {
                      setToastId((current) => current === id ? null : current)
                    }
                  },
                })
                setToastId(id)
                setIsPaused(false)
              }}
            >
              Create Timed Toast (5s)
            </Button>

            {toastId && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (isPaused) {
                    toaster.resume(toastId)
                  } else {
                    toaster.pause(toastId)
                  }
                  setIsPaused(!isPaused)
                }}
              >
                {isPaused ? "Resume Timer" : "Pause Timer"}
              </Button>
            )}
          </div>

          {toastId && (
            <p className="text-sm">
              Timer is currently:{" "}
              <strong>{isPaused ? "Paused" : "Running"}</strong>
            </p>
          )}
        </div>
      </VariantContainer>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(canvas.getByRole("button", { name: "Create Timed Toast (5s)" }))
    await userEvent.click(canvas.getByRole("button", { name: "Pause Timer" }))
    await expect(canvas.getByText("Paused", { exact: true })).toBeVisible()
    await userEvent.click(body.getByRole("button", { name: "Close notification" }))
    await waitFor(() => expect(canvas.queryByRole("button", { name: "Resume Timer" })).toBeNull())
    await expect(canvas.queryByText("Timer is currently:")).toBeNull()
  },
}

export const BatchOperations: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Control a small notification batch within this preview only, without affecting other Docs stories.",
      },
    },
  },
  render: () => {
    const toaster = useToast()
    const [toastIds, setToastIds] = useState<string[]>([])

    return (
      <VariantContainer>
        <div className="space-y-200">
          <p className="text-fg-secondary text-sm">
            Create multiple toasts and control them all at once
          </p>

          <div className="flex flex-wrap gap-200">
            <Button
              size="sm"
              onClick={() => {
                const newIds = Array.from({ length: 3 }, (_, i) => {
                  return toaster.create({
                    title: `Toast ${i + 1}`,
                    description: `This is toast number ${i + 1}`,
                    type: (["success", "info", "warning"] as const)[i],
                    duration: 5000,
                  })
                })
                setToastIds(newIds)
              }}
            >
              Create 3 Toasts
            </Button>

            {toastIds.length > 0 && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    toastIds.forEach((id) => toaster.pause(id))
                  }}
                >
                  Pause All
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    toastIds.forEach((id) => toaster.resume(id))
                  }}
                >
                  Resume All
                </Button>

                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    toastIds.forEach((id) => toaster.remove(id))
                    setToastIds([])
                  }}
                >
                  Remove All
                </Button>
              </>
            )}
          </div>
        </div>
      </VariantContainer>
    )
  },
}

// Promise-based toasts - zobrazení loading/success/error podle průběhu promise
export const PromiseExample: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Follow a deterministic background operation from a supplied loading title to completion.",
      },
    },
  },
  render: () => {
    const toaster = useToast()

    const simulateAsyncOperation = () => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const shouldSucceed = true
          if (shouldSucceed) {
            resolve("Operation completed successfully!")
          } else {
            reject(new Error("Operation failed"))
          }
        }, 2000)
      })
    }

    return (
      <VariantContainer>
        <div className="space-y-200">
          <p className="text-fg-secondary text-sm">
            Follow a background export from progress to completion
          </p>
          <Button
            size="sm"
            onClick={() => {
              const toastId = toaster.create({
                title: "Processing...",
                description: "Please wait while we process your request",
                type: "loading",
                duration: Number.POSITIVE_INFINITY,
              })

              simulateAsyncOperation()
                .then((result) => {
                  toaster.update(toastId, {
                    title: "Success!",
                    description: result as string,
                    type: "success",
                    duration: 3000,
                  })
                })
                .catch((error) => {
                  toaster.update(toastId, {
                    title: "Error",
                    description: error.message,
                    type: "error",
                    duration: 5000,
                  })
                })
            }}
          >
            Start Async Operation
          </Button>
        </div>
      </VariantContainer>
    )
  },
}

export const WithAction: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A rendered Undo action restores local preview state and dismisses its notification.",
      },
    },
  },
  render: () => {
    const toaster = useToast()
    const [restored, setRestored] = useState(false)
    return (
      <div className="flex flex-col gap-200">
        <Button
          variant="secondary"
          onClick={() => {
            setRestored(false)
            toaster.create({
              type: "info",
              title: "Project archived",
              description: "You can restore it before leaving this page.",
              duration: Infinity,
              action: {
                label: "Undo archive",
                onClick: () => setRestored(true),
              },
            })
          }}
        >
          Archive project
        </Button>
        <p aria-live="polite">
          {restored
            ? "Project restored."
            : "The project is available in this preview."}
        </p>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole("button", { name: "Archive project" })
    )
    await userEvent.click(
      await within(canvasElement.ownerDocument.body).findByRole("button", {
        name: "Undo archive",
      })
    )
    await expect(canvas.getByText("Project restored.")).toBeVisible()
  },
}
export const PersistentLoading: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Non-closable progress keeps its supplied title until the operation completes and becomes dismissible.",
      },
    },
  },
  render: () => {
    const toaster = useToast()
    const [id, setId] = useState<string>()
    return (
      <div className="flex flex-wrap gap-200">
        <Button
          onClick={() =>
            setId(
              toaster.create({
                type: "loading",
                title: "Preparing your project export",
                description: "We will notify you when the download is ready.",
                closable: false,
              })
            )
          }
        >
          Prepare export
        </Button>
        <Button
          variant="secondary"
          theme="outlined"
          disabled={!id}
          onClick={() => {
            if (id)
              toaster.update(id, {
                type: "success",
                title: "Your export is ready",
                description: "The download is available from your project.",
                closable: true,
                duration: 5000,
              })
          }}
        >
          Finish export
        </Button>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(
      canvas.getByRole("button", { name: "Prepare export" })
    )
    await waitFor(async () => {
      await expect(
        await body.findByText("Preparing your project export")
      ).toBeVisible()
    })
    await expect(
      body.queryByRole("button", { name: "Close notification" })
    ).not.toBeInTheDocument()
    const notification = body.getByRole("status")
    notification.focus()
    await userEvent.keyboard("{Escape}")
    await expect(notification).toHaveAttribute("data-state", "open")
    await expect(body.getByText("Preparing your project export")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Finish export" }))
    await waitFor(async () => {
      await expect(await body.findByText("Your export is ready")).toBeVisible()
    })
    await userEvent.click(
      body.getByRole("button", { name: "Close notification" })
    )
  },
}
export const LongContent: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Long notification copy wraps on narrow screens while the close action remains visible.",
      },
    },
  },
  args: {
    title:
      "Your project export for the autumn catalogue and all associated product attachments is ready to download",
    description:
      "This notification wraps on narrow screens and keeps its close action visible. Reference: ProjectExport_AutumnCatalogue_ProductAttachments_2026_Complete.",
    type: "info",
    duration: Infinity,
  },
  render: (args) => {
    const toaster = useToast()
    return (
      <Button onClick={() => toaster.create(args)}>
        Show export notification
      </Button>
    )
  },
}
