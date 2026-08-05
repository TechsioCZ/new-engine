import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"

import { VariantContainer } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import { Toaster, useToast } from "../../src/molecules/toast"

const meta: Meta = {
  argTypes: {
    description: {
      control: "text",
      description: "The description text of the toast",
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
    type: {
      control: "select",
      description: "The type of the toast, which determines its styling",
      options: ["info", "success", "warning", "error", "loading"],
      table: { defaultValue: { summary: "info" } },
    },
  },
  args: {
    description: "Toast description message.",
    duration: 5000,
    title: "Toast Title",
    type: "success",
  },
  decorators: [
    (Story) => (
      <>
        <Story />
        <Toaster />
      </>
    ),
  ],
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Molecules/Toast",
}

export default meta
type Story = StoryObj

export const Playground: Story = {
  args: {
    description: "Your action was completed successfully.",
    title: "Success!",
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
                  description: "This is the original message",
                  duration: Number.POSITIVE_INFINITY, // Keep it open
                  title: "Original Toast",
                  type: "info",
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
                      description: "Loading data...",
                      title: "Step 1",
                      type: "loading",
                    },
                    {
                      description: "Processing...",
                      title: "Step 2",
                      type: "loading",
                    },
                    {
                      description: "Operation successful",
                      title: "Complete!",
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
  render: () => {
    const toaster = useToast()
    const [toastIds, setToastIds] = useState<{
      instant: string | null
      animated: string | null
    }>({
      animated: null,
      instant: null,
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
                    description: "Click the button below to remove me",
                    duration: Number.POSITIVE_INFINITY,
                    title: "I will be removed instantly",
                    type: "info",
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
                    description: "Click the button below to dismiss me",
                    duration: Number.POSITIVE_INFINITY,
                    title: "I will be dismissed with animation",
                    type: "info",
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
                  description: "I will close in 5 seconds unless paused",
                  duration: 5000,
                  title: "Auto-closing toast",
                  type: "info",
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
}

export const BatchOperations: Story = {
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
                const newIds = Array.from({ length: 3 }, (_, i) =>
                  toaster.create({
                    title: `Toast ${i + 1}`,
                    description: `This is toast number ${i + 1}`,
                    type: ["success", "info", "warning"][i] as any,
                    duration: 5000,
                  }),
                )
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
                    toastIds.forEach((id) => {
                      toaster.pause(id)
                    })
                  }}
                >
                  Pause All
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    toastIds.forEach((id) => {
                      toaster.resume(id)
                    })
                  }}
                >
                  Resume All
                </Button>

                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    toastIds.forEach((id) => {
                      toaster.remove(id)
                    })
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
  render: () => {
    const toaster = useToast()

    const simulateAsyncOperation = async () =>
      new Promise((resolve, reject) => {
        setTimeout(() => {
          const shouldSucceed = Math.random() > 0.5
          if (shouldSucceed) {
            resolve("Operation completed successfully!")
          } else {
            reject(new Error("Operation failed"))
          }
        }, 2000)
      })

    return (
      <VariantContainer>
        <div className="space-y-200">
          <p className="text-fg-secondary text-sm">
            Create toast that updates based on promise state (50% chance of
            success)
          </p>
          <Button
            size="sm"
            onClick={() => {
              const toastId = toaster.create({
                description: "Please wait while we process your request",
                duration: Number.POSITIVE_INFINITY,
                title: "Processing...",
                type: "loading",
              })

              simulateAsyncOperation()
                .then((result) => {
                  toaster.update(toastId, {
                    description: result as string,
                    duration: 3000,
                    title: "Success!",
                    type: "success",
                  })
                })
                .catch((error) => {
                  toaster.update(toastId, {
                    description: error.message,
                    duration: 5000,
                    title: "Error",
                    type: "error",
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
