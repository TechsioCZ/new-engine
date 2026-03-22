import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { VariantContainer } from '../../.storybook/decorator'
import { Button } from '../../src/atoms/button'
import { Toaster, useToast } from '../../src/molecules/toast'

const meta: Meta = {
  title: 'Molecules/Toast',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <>
        <Story />
        <Toaster />
      </>
    ),
  ],
  argTypes: {
    type: {
      control: 'select',
      options: ['info', 'success', 'warning', 'error', 'loading'],
      description: 'The type of the toast, which determines its styling',
      table: { defaultValue: { summary: 'info' } },
    },
    duration: {
      control: 'number',
      description: 'Duration in milliseconds before auto-close. Use Infinity to keep open.',
      table: { defaultValue: { summary: '5000' } },
    },
    title: {
      control: 'text',
      description: 'The title text of the toast',
    },
    description: {
      control: 'text',
      description: 'The description text of the toast',
    },
  },
  args: {
    type: 'success',
    duration: 5000,
    title: 'Toast Title',
    description: 'Toast description message.',
  },
}

export default meta
type Story = StoryObj

export const Playground: Story = {
  args: {
    title: 'Success!',
    description: 'Your action was completed successfully.',
    type: 'success',
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
                  title: 'Original Toast',
                  description: 'This is the original message',
                  type: 'info',
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
                      title: 'Step 1',
                      description: 'Loading data...',
                      type: 'loading',
                    },
                    {
                      title: 'Step 2',
                      description: 'Processing...',
                      type: 'loading',
                    },
                    {
                      title: 'Complete!',
                      description: 'Operation successful',
                      type: 'success',
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
                    title: 'I will be removed instantly',
                    description: 'Click the button below to remove me',
                    type: 'info',
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
                    title: 'I will be dismissed with animation',
                    description: 'Click the button below to dismiss me',
                    type: 'info',
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
                  title: 'Auto-closing toast',
                  description: 'I will close in 5 seconds unless paused',
                  type: 'info',
                  duration: 5000,
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
                {isPaused ? 'Resume Timer' : 'Pause Timer'}
              </Button>
            )}
          </div>

          {toastId && (
            <p className="text-sm">
              Timer is currently:{' '}
              <strong>{isPaused ? 'Paused' : 'Running'}</strong>
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
                const newIds = Array.from({ length: 3 }, (_, i) => {
                  return toaster.create({
                    title: `Toast ${i + 1}`,
                    description: `This is toast number ${i + 1}`,
                    type: ['success', 'info', 'warning'][i] as any,
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
  render: () => {
    const toaster = useToast()

    const simulateAsyncOperation = () => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const shouldSucceed = Math.random() > 0.5
          if (shouldSucceed) {
            resolve('Operation completed successfully!')
          } else {
            reject(new Error('Operation failed'))
          }
        }, 2000)
      })
    }

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
                title: 'Processing...',
                description: 'Please wait while we process your request',
                type: 'loading',
                duration: Number.POSITIVE_INFINITY,
              })

              simulateAsyncOperation()
                .then((result) => {
                  toaster.update(toastId, {
                    title: 'Success!',
                    description: result as string,
                    type: 'success',
                    duration: 3000,
                  })
                })
                .catch((error) => {
                  toaster.update(toastId, {
                    title: 'Error',
                    description: error.message,
                    type: 'error',
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
