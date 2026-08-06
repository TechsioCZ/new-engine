import type { Meta, StoryObj } from "@storybook/react"
import { sleep } from "@techsio/std/async"
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

const isNonEmptyString = (value: string | null): value is string =>
  value !== null && value.length > 0

const PlaygroundRender: NonNullable<Story["render"]> = (args) => {
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
}

export const Playground: Story = {
  args: {
    description: "Your action was completed successfully.",
    title: "Success!",
    type: "success",
  },
  render: PlaygroundRender,
}

const UpdateExampleRender: NonNullable<Story["render"]> = () => {
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
                // Keep it open
                duration: Number.POSITIVE_INFINITY,
                title: "Original Toast",
                type: "info",
              })
              setToastId(id)
              setStep(0)
            }}
          >
            Create Toast
          </Button>

          {isNonEmptyString(toastId) && (
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
}

export const UpdateExample: Story = {
  render: UpdateExampleRender,
}

const RemoveVsDismissRender: NonNullable<Story["render"]> = () => {
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

            {isNonEmptyString(toastIds.instant) && (
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  const toastId = toastIds.instant
                  if (isNonEmptyString(toastId)) {
                    toaster.remove(toastId)
                    setToastIds((prev) => ({ ...prev, instant: null }))
                  }
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

            {isNonEmptyString(toastIds.animated) && (
              <Button
                size="sm"
                variant="warning"
                onClick={() => {
                  const toastId = toastIds.animated
                  if (isNonEmptyString(toastId)) {
                    toaster.dismiss(toastId)
                    setToastIds((prev) => ({ ...prev, animated: null }))
                  }
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
}

export const RemoveVsDismiss: Story = {
  render: RemoveVsDismissRender,
}

const PauseResumeExampleRender: NonNullable<Story["render"]> = () => {
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

          {isNonEmptyString(toastId) && (
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

        {isNonEmptyString(toastId) && (
          <p className="text-sm">
            Timer is currently:{" "}
            <strong>{isPaused ? "Paused" : "Running"}</strong>
          </p>
        )}
      </div>
    </VariantContainer>
  )
}

export const PauseResumeExample: Story = {
  render: PauseResumeExampleRender,
}

const BATCH_TOAST_TYPES: readonly ["success", "info", "warning"] = [
  "success",
  "info",
  "warning",
]

const BatchOperationsRender: NonNullable<Story["render"]> = () => {
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
                  description: `This is toast number ${i + 1}`,
                  duration: 5000,
                  title: `Toast ${i + 1}`,
                  type: BATCH_TOAST_TYPES[i],
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
                  for (const id of toastIds) {
                    toaster.pause(id)
                  }
                }}
              >
                Pause All
              </Button>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  for (const id of toastIds) {
                    toaster.resume(id)
                  }
                }}
              >
                Resume All
              </Button>

              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  for (const id of toastIds) {
                    toaster.remove(id)
                  }
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
}

export const BatchOperations: Story = {
  render: BatchOperationsRender,
}

const isHighRandomByte = (randomByte: number | undefined): boolean =>
  (randomByte ?? 0) > 127

const shouldSimulatedOperationSucceed = (): boolean => {
  const [randomByte] = crypto.getRandomValues(new Uint8Array(1))
  return isHighRandomByte(randomByte)
}

const simulateAsyncOperation = async (): Promise<string> => {
  await sleep(2000)
  if (shouldSimulatedOperationSucceed()) {
    return "Operation completed successfully!"
  }
  throw new Error("Operation failed")
}

const PromiseExampleRender: NonNullable<Story["render"]> = () => {
  const toaster = useToast()

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

            const runOperation = async () => {
              try {
                const result = await simulateAsyncOperation()
                toaster.update(toastId, {
                  description: result,
                  duration: 3000,
                  title: "Success!",
                  type: "success",
                })
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : String(error)
                toaster.update(toastId, {
                  description: message,
                  duration: 5000,
                  title: "Error",
                  type: "error",
                })
              }
            }

            void runOperation()
          }}
        >
          Start Async Operation
        </Button>
      </div>
    </VariantContainer>
  )
}

// Promise-based toasts - zobrazení loading/success/error podle průběhu promise
export const PromiseExample: Story = {
  render: PromiseExampleRender,
}
