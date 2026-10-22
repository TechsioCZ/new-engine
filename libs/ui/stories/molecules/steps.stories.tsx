import type { Meta, StoryObj } from "@storybook/react"
import { useEffect, useId, useState } from "react"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Badge } from "../../src/atoms/badge"
import { Icon, type IconType } from "../../src/atoms/icon"
import { Input } from "../../src/atoms/input"
import { Label } from "../../src/atoms/label"
import { StatusText } from "../../src/atoms/status-text"
import { Steps } from "../../src/molecules/steps"

type DemoStep = {
  actionLabel: string
  badge: string
  content: string
  description: string
  icon: IconType
  title: string
}

const demoSteps: DemoStep[] = [
  {
    actionLabel: "Assign owner",
    badge: "Planning",
    content:
      "Set the initial structure, clarify intent, and gather the small decisions that should not leak into later steps.",
    description: "Define scope and ownership.",
    icon: "token-icon-folder",
    title: "Brief",
  },
  {
    actionLabel: "Capture details",
    badge: "Execution",
    content:
      "Move from outline to implementation details. This is where the stepper starts benefiting from a richer compound composition.",
    description: "Collect the important inputs.",
    icon: "token-icon-clipboard",
    title: "Inputs",
  },
  {
    actionLabel: "Confirm release",
    badge: "Approval",
    content:
      "Review the result, check open questions, and prepare the final handoff. Completion should feel visually distinct from the in-progress state.",
    description: "Review and publish.",
    icon: "token-icon-save",
    title: "Review",
  },
]

const completedText =
  "All steps are complete. This content lives outside the indexed step panels."

async function expectResponsiveSteps(canvasElement: HTMLElement) {
  const document = canvasElement.ownerDocument
  const viewportWidth = document.documentElement.clientWidth
  await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(viewportWidth)
  for (const element of canvasElement.querySelectorAll<HTMLElement>(
    '[data-scope="steps"][data-part="trigger"], [data-scope="steps"][role="region"]:not([hidden]), [data-part="navigation"] button'
  )) {
    const box = element.getBoundingClientRect()
    await expect(box.left).toBeGreaterThanOrEqual(0)
    await expect(box.right).toBeLessThanOrEqual(viewportWidth + 1)
  }
  if (document.defaultView?.matchMedia("(max-width: 39.999rem)").matches) {
    for (const item of canvasElement.querySelectorAll('[data-part="item"][data-orientation="horizontal"]')) {
      const indicator = item.querySelector('[data-part="indicator"]')?.getBoundingClientRect()
      const separator = item.querySelector('[data-part="separator"]')?.getBoundingClientRect()
      if (!indicator || !separator?.width) continue
      await expect(Math.abs(indicator.y + indicator.height / 2 - separator.y - separator.height / 2)).toBeLessThan(1)
    }
  }
}

const meta: Meta<typeof Steps> = {
  title: "Molecules/Steps",
  component: Steps,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Steps shows progress through an ordered workflow, such as account setup, checkout or a project handoff. Use it when each stage has a clear task and completion state; choose Tabs for peer views, Progress for an operation without named stages, or a single form for short tasks.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    linear: {
      control: "boolean",
      description: "Whether users must progress sequentially.",
      table: { category: "Behavior", defaultValue: { summary: "false" } },
    },
    orientation: {
      control: "radio",
      options: ["horizontal", "vertical"],
      description: "Stepper orientation.",
      table: {
        category: "Layout",
        defaultValue: { summary: "horizontal" },
      },
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Visual size scale for indicators and content.",
      table: { category: "Appearance", defaultValue: { summary: "md" } },
    },
    step: {
      control: false,
      description: "Controlled active step index.",
      table: { category: "Behavior", defaultValue: { summary: "0" } },
    },
    variant: {
      control: "radio",
      options: ["subtle", "solid"],
      description: "Visual emphasis style.",
      table: {
        category: "Appearance",
        defaultValue: { summary: "subtle" },
      },
    },
    children: {
      table: { disable: true },
    },
    count: {
      table: { disable: true },
    },
    defaultStep: {
      table: { disable: true },
    },
    dir: {
      table: { disable: true },
    },
    id: {
      table: { disable: true },
    },
    onStepChange: {
      table: { disable: true },
    },
    onStepComplete: {
      table: { disable: true },
    },
  },
  args: {
    linear: false,
    orientation: "horizontal",
    size: "md",
    step: 0,
    variant: "subtle",
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Explore sequential navigation, orientation, size and progress treatments using working controls.",
      },
    },
  },
  tags: ["ui-semantic-regression"],
  render: (args) => {
    const [step, setStep] = useState(args.step ?? 0)

    useEffect(() => {
      setStep(args.step ?? 0)
    }, [args.step])

    return (
      <div className="w-full max-w-5xl">
        <Steps
          count={demoSteps.length}
          linear={args.linear}
          onStepChange={(details) => setStep(details.step)}
          orientation={args.orientation}
          size={args.size}
          step={step}
          variant={args.variant}
        >
          <Steps.List>
            {demoSteps.map((item, index) => (
              <Steps.Item index={index} key={item.title}>
                <Steps.Trigger>
                  <Steps.Indicator />
                  <Steps.ItemText>
                    <Steps.Title>{item.title}</Steps.Title>
                  </Steps.ItemText>
                </Steps.Trigger>
                <Steps.Separator />
              </Steps.Item>
            ))}
          </Steps.List>

          <Steps.Panels>
            {demoSteps.map((item, index) => (
              <Steps.Content index={index} key={item.title}>
                <div className="flex flex-col gap-200">
                  <Badge variant="outline">{item.badge}</Badge>
                  <div className="flex flex-col gap-100">
                    <h3 className="text-md font-semibold text-fg-primary">
                      {item.title}
                    </h3>
                    <p className="text-sm text-fg-secondary">{item.content}</p>
                  </div>
                </div>
              </Steps.Content>
            ))}
            <Steps.CompletedContent>
              <div className="flex flex-col gap-150">
                <Badge variant="success">Complete</Badge>
                <h3 className="text-md font-semibold text-fg-primary">
                  Ready for handoff
                </h3>
                <p className="text-sm text-fg-secondary">{completedText}</p>
              </div>
            </Steps.CompletedContent>
            <Steps.Navigation>
              <Steps.PrevTrigger>Back</Steps.PrevTrigger>
              <Steps.NextTrigger>Continue</Steps.NextTrigger>
            </Steps.Navigation>
          </Steps.Panels>
        </Steps>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const list = within(canvas.getByRole("list"))
    const first = list.getByRole("button", { name: "Brief" })
    const second = list.getByRole("button", { name: "Inputs" })
    await expect(list.getAllByRole("button")).toHaveLength(demoSteps.length)
    await expect(first).toHaveAttribute("aria-current", "step")

    await userEvent.click(second)
    await waitFor(() => {
      expect(second).toHaveAttribute("aria-current", "step")
      expect(first).not.toHaveAttribute("aria-current")
      expect(canvas.getByRole("region", { name: "Inputs" })).toBeVisible()
    })

    await userEvent.click(first)
    await waitFor(() => {
      expect(first).toHaveAttribute("aria-current", "step")
      expect(second).not.toHaveAttribute("aria-current")
      expect(canvas.getByRole("region", { name: "Brief" })).toBeVisible()
    })
    for (const name of ["Inputs", "Review", "Workflow complete"]) {
      await userEvent.click(canvas.getByRole("button", { name: "Continue" }))
      await waitFor(() => expect(canvas.getByRole("region", { name })).toHaveFocus())
    }
    await expect(canvas.getByRole("button", { name: "Continue" })).toBeDisabled()
    await userEvent.click(canvas.getByRole("button", { name: "Back" }))
    await waitFor(() => expect(canvas.getByRole("region", { name: "Review" })).toHaveFocus())
    await expectResponsiveSteps(canvasElement)
  },
}

export const Variants: Story = {
  play: async ({ canvasElement }) => expectResponsiveSteps(canvasElement),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Subtle and solid treatments provide different emphasis without changing workflow order.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <VariantGroup fullWidth title="Subtle">
        <div className="w-full max-w-5xl">
          <Steps
            count={demoSteps.length}
            defaultStep={1}
            size="md"
            variant="subtle"
          >
            <Steps.List>
              {demoSteps.map((item, index) => (
                <Steps.Item index={index} key={item.title}>
                  <Steps.Trigger>
                    <Steps.Indicator />
                    <Steps.ItemText>
                      <Steps.Title>{item.title}</Steps.Title>
                    </Steps.ItemText>
                  </Steps.Trigger>
                  <Steps.Separator />
                </Steps.Item>
              ))}
            </Steps.List>
            <Steps.Panels>
              {demoSteps.map((item, index) => (
                <Steps.Content index={index} key={item.title}>
                  <p className="text-sm text-fg-secondary">{item.content}</p>
                </Steps.Content>
              ))}
              <Steps.CompletedContent>
                <p className="text-sm text-fg-secondary">{completedText}</p>
              </Steps.CompletedContent>
            </Steps.Panels>
          </Steps>
        </div>
      </VariantGroup>

      <VariantGroup fullWidth title="Solid">
        <div className="w-full max-w-5xl">
          <Steps
            count={demoSteps.length}
            defaultStep={1}
            size="md"
            variant="solid"
          >
            <Steps.List>
              {demoSteps.map((item, index) => (
                <Steps.Item index={index} key={item.title}>
                  <Steps.Trigger>
                    <Steps.Indicator />
                    <Steps.ItemText>
                      <Steps.Title>{item.title}</Steps.Title>
                    </Steps.ItemText>
                  </Steps.Trigger>
                  <Steps.Separator />
                </Steps.Item>
              ))}
            </Steps.List>
            <Steps.Panels>
              {demoSteps.map((item, index) => (
                <Steps.Content index={index} key={item.title}>
                  <p className="text-sm text-fg-secondary">{item.content}</p>
                </Steps.Content>
              ))}
              <Steps.CompletedContent>
                <p className="text-sm text-fg-secondary">{completedText}</p>
              </Steps.CompletedContent>
            </Steps.Panels>
          </Steps>
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const Sizes: Story = {
  play: async ({ canvasElement }) => expectResponsiveSteps(canvasElement),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "The same project workflow is shown at Small (sm), Medium (md) and Large (lg).",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <VariantGroup fullWidth title="Small (sm)">
        <div className="w-full max-w-5xl">
          <Steps
            count={demoSteps.length}
            defaultStep={1}
            size="sm"
            variant="subtle"
          >
            <Steps.List>
              {demoSteps.map((item, index) => (
                <Steps.Item index={index} key={item.title}>
                  <Steps.Trigger>
                    <Steps.Indicator />
                    <Steps.ItemText>
                      <Steps.Title>{item.title}</Steps.Title>
                    </Steps.ItemText>
                  </Steps.Trigger>
                  <Steps.Separator />
                </Steps.Item>
              ))}
            </Steps.List>
            <Steps.Panels>
              {demoSteps.map((item, index) => (
                <Steps.Content index={index} key={item.title}>
                  <p className="text-sm text-fg-secondary">{item.content}</p>
                </Steps.Content>
              ))}
              <Steps.CompletedContent>
                <p className="text-sm text-fg-secondary">{completedText}</p>
              </Steps.CompletedContent>
            </Steps.Panels>
          </Steps>
        </div>
      </VariantGroup>

      <VariantGroup fullWidth title="Medium (md)">
        <div className="w-full max-w-5xl">
          <Steps
            count={demoSteps.length}
            defaultStep={1}
            size="md"
            variant="subtle"
          >
            <Steps.List>
              {demoSteps.map((item, index) => (
                <Steps.Item index={index} key={item.title}>
                  <Steps.Trigger>
                    <Steps.Indicator />
                    <Steps.ItemText>
                      <Steps.Title>{item.title}</Steps.Title>
                    </Steps.ItemText>
                  </Steps.Trigger>
                  <Steps.Separator />
                </Steps.Item>
              ))}
            </Steps.List>
            <Steps.Panels>
              {demoSteps.map((item, index) => (
                <Steps.Content index={index} key={item.title}>
                  <p className="text-sm text-fg-secondary">{item.content}</p>
                </Steps.Content>
              ))}
              <Steps.CompletedContent>
                <p className="text-sm text-fg-secondary">{completedText}</p>
              </Steps.CompletedContent>
            </Steps.Panels>
          </Steps>
        </div>
      </VariantGroup>

      <VariantGroup fullWidth title="Large (lg)">
        <div className="w-full max-w-5xl">
          <Steps
            count={demoSteps.length}
            defaultStep={1}
            size="lg"
            variant="subtle"
          >
            <Steps.List>
              {demoSteps.map((item, index) => (
                <Steps.Item index={index} key={item.title}>
                  <Steps.Trigger>
                    <Steps.Indicator />
                    <Steps.ItemText>
                      <Steps.Title>{item.title}</Steps.Title>
                    </Steps.ItemText>
                  </Steps.Trigger>
                  <Steps.Separator />
                </Steps.Item>
              ))}
            </Steps.List>
            <Steps.Panels>
              {demoSteps.map((item, index) => (
                <Steps.Content index={index} key={item.title}>
                  <p className="text-sm text-fg-secondary">{item.content}</p>
                </Steps.Content>
              ))}
              <Steps.CompletedContent>
                <p className="text-sm text-fg-secondary">{completedText}</p>
              </Steps.CompletedContent>
            </Steps.Panels>
          </Steps>
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const Basic: Story = {
  play: async ({ canvasElement }) => expectResponsiveSteps(canvasElement),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "A short workflow shows current, complete and upcoming steps with matching content panels.",
      },
    },
  },
  render: () => (
    <div className="w-full max-w-5xl">
      <Steps
        count={demoSteps.length}
        defaultStep={1}
        size="md"
        variant="subtle"
      >
        <Steps.List>
          {demoSteps.map((item, index) => (
            <Steps.Item index={index} key={item.title}>
              <Steps.Trigger>
                <Steps.Indicator />
                <Steps.ItemText>
                  <Steps.Title>{item.title}</Steps.Title>
                </Steps.ItemText>
              </Steps.Trigger>
              <Steps.Separator />
            </Steps.Item>
          ))}
        </Steps.List>

        <Steps.Panels>
          {demoSteps.map((item, index) => (
            <Steps.Content index={index} key={item.title}>
              <p className="text-sm text-fg-secondary">{item.content}</p>
            </Steps.Content>
          ))}
          <Steps.CompletedContent>
            <p className="text-sm text-fg-secondary">{completedText}</p>
          </Steps.CompletedContent>
          <Steps.Navigation>
            <Steps.PrevTrigger>Back</Steps.PrevTrigger>
            <Steps.NextTrigger>Continue</Steps.NextTrigger>
          </Steps.Navigation>
        </Steps.Panels>
      </Steps>
    </div>
  ),
}

export const Controlled: Story = {
  play: async ({ canvasElement }) => expectResponsiveSteps(canvasElement),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Application state owns the active step while navigation controls request state changes.",
      },
    },
  },
  render: () => {
    const [step, setStep] = useState(1)

    return (
      <div className="w-full max-w-5xl">
        <Steps
          count={demoSteps.length}
          onStepChange={(details) => setStep(details.step)}
          size="md"
          step={step}
          variant="subtle"
        >
          <Steps.List>
            {demoSteps.map((item, index) => (
              <Steps.Item index={index} key={item.title}>
                <Steps.Trigger>
                  <Steps.Indicator />
                  <Steps.ItemText>
                    <Steps.Title>{item.title}</Steps.Title>
                  </Steps.ItemText>
                </Steps.Trigger>
                <Steps.Separator />
              </Steps.Item>
            ))}
          </Steps.List>

          <Steps.Panels>
            {demoSteps.map((item, index) => (
              <Steps.Content index={index} key={item.title}>
                <p className="text-sm text-fg-secondary">{item.content}</p>
              </Steps.Content>
            ))}
            <Steps.CompletedContent>
              <p className="text-sm text-fg-secondary">{completedText}</p>
            </Steps.CompletedContent>
            <Steps.Navigation>
              <Steps.PrevTrigger>Back</Steps.PrevTrigger>
              <Steps.NextTrigger>Continue</Steps.NextTrigger>
            </Steps.Navigation>
          </Steps.Panels>
        </Steps>
      </div>
    )
  },
}

export const Validation: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Correct the email address before advancing; associated inline feedback explains how to recover.",
      },
    },
  },
  render: () => {
    const [step, setStep] = useState(1)
    const [email, setEmail] = useState("team@")
    const [attempted, setAttempted] = useState(false)
    const id = useId()
    const hintId = `${id}-hint`
    const errorId = `${id}-error`
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    const invalid = attempted && !valid
    return (
      <div className="w-full max-w-5xl">
        <Steps
          count={3}
          step={step}
          linear
          onStepChange={({ step: next }) => {
            if (next > 1 && !valid) {
              setAttempted(true)
              return
            }
            setStep(next)
          }}
        >
          <Steps.List>
            {["Contact", "Email", "Review"].map((title, index) => (
              <Steps.Item index={index} key={title}>
                <Steps.Trigger disabled={index > 1 && !valid}>
                  <Steps.Indicator />
                  <Steps.ItemText>
                    <Steps.Title>{title}</Steps.Title>
                  </Steps.ItemText>
                </Steps.Trigger>
                <Steps.Separator />
              </Steps.Item>
            ))}
          </Steps.List>
          <Steps.Panels>
            <Steps.Content index={0}>
              <p>
                Confirm the email address your team uses for project updates.
              </p>
            </Steps.Content>
            <Steps.Content index={1}>
              <div className="flex flex-col gap-150">
                <Label htmlFor={id}>Team email</Label>
                <Input
                  id={id}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  variant={invalid ? "error" : "default"}
                  aria-describedby={[hintId, invalid ? errorId : undefined]
                    .filter(Boolean)
                    .join(" ")}
                  aria-invalid={invalid || undefined}
                  aria-errormessage={invalid ? errorId : undefined}
                />
                <StatusText id={hintId}>
                  We send project updates to this address.
                </StatusText>
                {invalid && (
                  <StatusText id={errorId} status="error">
                    Enter a complete email address, such as team@example.com.
                  </StatusText>
                )}
              </div>
            </Steps.Content>
            <Steps.Content index={2}>
              <p>Project updates will be sent to {email}.</p>
            </Steps.Content>
            <Steps.CompletedContent>
              <p>Your contact preferences are saved for this preview.</p>
            </Steps.CompletedContent>
            <Steps.Navigation className="justify-end">
              <Steps.PrevTrigger variant="secondary">Back</Steps.PrevTrigger>
              <Steps.NextTrigger
                onClick={(event) => {
                  if (step === 1 && !valid) {
                    event.preventDefault()
                    setAttempted(true)
                  }
                }}
              >
                Continue
              </Steps.NextTrigger>
            </Steps.Navigation>
          </Steps.Panels>
        </Steps>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))
    const input = canvas.getByRole("textbox", { name: "Team email" })
    await expect(input).toHaveAttribute("aria-invalid", "true")
    await expect(input).toHaveAccessibleDescription(
      /Enter a complete email address/
    )
    await userEvent.clear(input)
    await userEvent.type(input, "team@example.com")
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))
    await expect(
      canvas.getByText("Project updates will be sent to team@example.com.")
    ).toBeVisible()
  },
}

export const Vertical: Story = {
  play: async ({ canvasElement }) => expectResponsiveSteps(canvasElement),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "A vertical workflow keeps longer stage descriptions next to the active panel.",
      },
    },
  },
  render: () => (
    <div className="w-full max-w-5xl">
      <Steps
        count={demoSteps.length}
        defaultStep={1}
        orientation="vertical"
        size="md"
        variant="subtle"
      >
        <Steps.List>
          {demoSteps.map((item, index) => (
            <Steps.Item index={index} key={item.title}>
              <Steps.Trigger>
                <Steps.Indicator />
                <Steps.ItemText>
                  <Steps.Title>{item.title}</Steps.Title>
                </Steps.ItemText>
              </Steps.Trigger>
              <Steps.Separator />
            </Steps.Item>
          ))}
        </Steps.List>

        <Steps.Panels>
          {demoSteps.map((item, index) => (
            <Steps.Content index={index} key={item.title}>
              <p className="text-sm text-fg-secondary">{item.content}</p>
            </Steps.Content>
          ))}
          <Steps.CompletedContent>
            <p className="text-sm text-fg-secondary">{completedText}</p>
          </Steps.CompletedContent>
          <Steps.Navigation>
            <Steps.PrevTrigger>Back</Steps.PrevTrigger>
            <Steps.NextTrigger>Continue</Steps.NextTrigger>
          </Steps.Navigation>
        </Steps.Panels>
      </Steps>
    </div>
  ),
}

export const ProgressHorizontal: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "A horizontal progress track supplements the explicit step names and numbers.",
      },
    },
  },
  tags: ["ui-semantic-regression"],
  render: () => (
    <div className="w-full max-w-5xl">
      <Steps count={demoSteps.length} defaultStep={2} size="md">
        <Steps.List>
          {demoSteps.map((item, index) => (
            <Steps.Item index={index} key={item.title}>
              <Steps.Trigger>
                <Steps.Indicator />
                <Steps.ItemText>
                  <Steps.Title>{item.title}</Steps.Title>
                  <Steps.Description>{item.description}</Steps.Description>
                </Steps.ItemText>
              </Steps.Trigger>
            </Steps.Item>
          ))}
        </Steps.List>

        <Steps.Progress aria-label="Release progress" />

        <Steps.Panels>
          {demoSteps.map((item, index) => (
            <Steps.Content index={index} key={item.title}>
              <p className="text-sm text-fg-secondary">{item.content}</p>
            </Steps.Content>
          ))}
          <Steps.CompletedContent>
            <p className="text-sm text-fg-secondary">{completedText}</p>
          </Steps.CompletedContent>
          <Steps.Navigation>
            <Steps.PrevTrigger>Back</Steps.PrevTrigger>
            <Steps.NextTrigger>Continue</Steps.NextTrigger>
          </Steps.Navigation>
        </Steps.Panels>
      </Steps>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const progress = canvas.getByRole("progressbar", {
      name: "Release progress",
    })
    await expect(Number(progress.getAttribute("aria-valuenow"))).toBeCloseTo(
      66.67,
      1
    )
    const current = canvas.getByRole("button", { name: /Review/ })
    await expect(current).toHaveAttribute("aria-current", "step")
    for (const tab of canvas.getAllByRole("button")) {
      if (tab !== current) await expect(tab).not.toHaveAttribute("aria-current")
    }
    await expect(canvas.getByRole("region", { name: /Review/ })).toBeVisible()
    await expect(canvas.getByText(completedText)).not.toBeVisible()
  },
}

export const ProgressVertical: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "A vertical progress track reinforces the position within an ordered workflow.",
      },
    },
  },
  tags: ["ui-semantic-regression"],
  render: () => (
    <div className="w-full max-w-5xl">
      <Steps
        count={demoSteps.length}
        defaultStep={2}
        orientation="vertical"
        size="md"
      >
        <Steps.List>
          {demoSteps.map((item, index) => (
            <Steps.Item index={index} key={item.title}>
              <Steps.Trigger>
                <Steps.Indicator />
                <Steps.ItemText>
                  <Steps.Title>{item.title}</Steps.Title>
                  <Steps.Description>{item.description}</Steps.Description>
                </Steps.ItemText>
              </Steps.Trigger>
            </Steps.Item>
          ))}
        </Steps.List>

        <Steps.Progress />

        <Steps.Panels>
          {demoSteps.map((item, index) => (
            <Steps.Content index={index} key={item.title}>
              <p className="text-sm text-fg-secondary">{item.content}</p>
            </Steps.Content>
          ))}
          <Steps.CompletedContent>
            <p className="text-sm text-fg-secondary">{completedText}</p>
          </Steps.CompletedContent>
          <Steps.Navigation>
            <Steps.PrevTrigger>Back</Steps.PrevTrigger>
            <Steps.NextTrigger>Continue</Steps.NextTrigger>
          </Steps.Navigation>
        </Steps.Panels>
      </Steps>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectResponsiveSteps(canvasElement)
    const progress = canvas.getByRole("progressbar", { name: "Step progress" })
    const root = progress.parentElement
    if (root && getComputedStyle(root).flexDirection === "column") {
      await expect(progress.getBoundingClientRect().width).toBeCloseTo(
        root.getBoundingClientRect().width,
        0
      )
    }
    await expect(Number(progress.getAttribute("aria-valuenow"))).toBeCloseTo(
      66.67,
      1
    )
    const current = canvas.getByRole("button", { name: /Review/ })
    await expect(current).toHaveAttribute("aria-current", "step")
    for (const tab of canvas.getAllByRole("button")) {
      if (tab !== current) await expect(tab).not.toHaveAttribute("aria-current")
    }
    await expect(canvas.getByRole("region", { name: /Review/ })).toBeVisible()
    await expect(canvas.getByText(completedText)).not.toBeVisible()
  },
}

export const Description: Story = {
  play: async ({ canvasElement }) => expectResponsiveSteps(canvasElement),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Short stage descriptions explain what each step asks the user to do.",
      },
    },
  },
  render: () => (
    <div className="w-full max-w-5xl">
      <Steps
        count={demoSteps.length}
        defaultStep={1}
        size="md"
        variant="subtle"
      >
        <Steps.List>
          {demoSteps.map((item, index) => (
            <Steps.Item index={index} key={item.title}>
              <Steps.Trigger>
                <Steps.Indicator />
                <Steps.ItemText>
                  <Steps.Title>{item.title}</Steps.Title>
                  <Steps.Description>{item.description}</Steps.Description>
                </Steps.ItemText>
              </Steps.Trigger>
              <Steps.Separator />
            </Steps.Item>
          ))}
        </Steps.List>

        <Steps.Panels>
          {demoSteps.map((item, index) => (
            <Steps.Content index={index} key={item.title}>
              <p className="text-sm text-fg-secondary">{item.content}</p>
            </Steps.Content>
          ))}
          <Steps.CompletedContent>
            <p className="text-sm text-fg-secondary">{completedText}</p>
          </Steps.CompletedContent>
          <Steps.Navigation>
            <Steps.PrevTrigger>Back</Steps.PrevTrigger>
            <Steps.NextTrigger>Continue</Steps.NextTrigger>
          </Steps.Navigation>
        </Steps.Panels>
      </Steps>
    </div>
  ),
}

export const WithIcon: Story = {
  play: async ({ canvasElement }) => expectResponsiveSteps(canvasElement),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Decorative stage glyphs complement numbered progress and explicit titles.",
      },
    },
  },
  render: () => (
    <div className="w-full max-w-5xl">
      <Steps
        count={demoSteps.length}
        defaultStep={1}
        size="md"
        variant="subtle"
      >
        <Steps.List>
          {demoSteps.map((item, index) => (
            <Steps.Item index={index} key={item.title}>
              <Steps.Trigger>
                <Steps.Indicator>
                  <Steps.Status
                    complete={<Icon icon="token-icon-steps-check" />}
                    current={<Icon icon={item.icon} />}
                    incomplete={<Icon icon={item.icon} />}
                  />
                </Steps.Indicator>
                <Steps.ItemText>
                  <Steps.Title>{item.title}</Steps.Title>
                </Steps.ItemText>
              </Steps.Trigger>
              <Steps.Separator />
            </Steps.Item>
          ))}
        </Steps.List>

        <Steps.Panels>
          {demoSteps.map((item, index) => (
            <Steps.Content index={index} key={item.title}>
              <p className="text-sm text-fg-secondary">{item.content}</p>
            </Steps.Content>
          ))}
          <Steps.CompletedContent>
            <p className="text-sm text-fg-secondary">{completedText}</p>
          </Steps.CompletedContent>
          <Steps.Navigation>
            <Steps.PrevTrigger>Back</Steps.PrevTrigger>
            <Steps.NextTrigger>Continue</Steps.NextTrigger>
          </Steps.Navigation>
        </Steps.Panels>
      </Steps>
    </div>
  ),
}

export const Lines: Story = {
  play: async ({ canvasElement }) => {
    await expectResponsiveSteps(canvasElement)
    for (const title of canvasElement.querySelectorAll('[data-part="title"]')) {
      const range = canvasElement.ownerDocument.createRange()
      range.selectNodeContents(title)
      await expect(range.getClientRects().length).toBe(1)
    }
  },
  parameters: {
    layout: "padded",
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Connectors make workflow continuity clear without replacing the step labels.",
      },
    },
  },
  render: () => (
    <div className="mx-auto w-5xl max-w-full">
      <Steps
        count={demoSteps.length}
        defaultStep={1}
        size="md"
        variant="subtle"
      >
        <Steps.List className="gap-200">
          {demoSteps.map((item, index) => (
            <Steps.Item
              className="flex-col items-start gap-100"
              index={index}
              key={item.title}
            >
              <Steps.Separator className="data-last:block data-[orientation=horizontal]:w-full data-[orientation=horizontal]:flex-none" />
              <Steps.Trigger>
                <Steps.ItemText>
                  <Steps.Title>{item.title}</Steps.Title>
                </Steps.ItemText>
              </Steps.Trigger>
            </Steps.Item>
          ))}
        </Steps.List>

        <Steps.Panels>
          {demoSteps.map((item, index) => (
            <Steps.Content index={index} key={item.title}>
              <p className="text-sm text-fg-secondary">
                {item.title} panel content.
              </p>
            </Steps.Content>
          ))}
          <Steps.CompletedContent>
            <p className="text-sm text-fg-secondary">{completedText}</p>
          </Steps.CompletedContent>
          <Steps.Navigation>
            <Steps.PrevTrigger>Back</Steps.PrevTrigger>
            <Steps.NextTrigger>Continue</Steps.NextTrigger>
          </Steps.Navigation>
        </Steps.Panels>
      </Steps>
    </div>
  ),
}

export const Trigger: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Custom trigger content preserves keyboard behavior and step semantics.",
      },
    },
  },
  render: () => (
    <div className="w-full max-w-5xl">
      <p className="mb-150 text-sm text-fg-secondary">
        Step headers are read-only in this example. Navigate only with
        Back/Continue.
      </p>
      <Steps
        count={demoSteps.length}
        defaultStep={1}
        linear
        size="md"
        variant="subtle"
      >
        <Steps.List>
          {demoSteps.map((item, index) => (
            <Steps.Item index={index} key={item.title}>
              <Steps.Trigger className="w-full" disabled>
                <Steps.Indicator />
                <Steps.ItemText>
                  <Steps.Title>{item.title}</Steps.Title>
                </Steps.ItemText>
              </Steps.Trigger>
              <Steps.Separator />
            </Steps.Item>
          ))}
        </Steps.List>

        <Steps.Panels>
          {demoSteps.map((item, index) => (
            <Steps.Content index={index} key={item.title}>
              <p className="text-sm text-fg-secondary">{item.content}</p>
            </Steps.Content>
          ))}
          <Steps.CompletedContent>
            <p className="text-sm text-fg-secondary">{completedText}</p>
          </Steps.CompletedContent>
          <Steps.Navigation>
            <Steps.PrevTrigger>Back</Steps.PrevTrigger>
            <Steps.NextTrigger>Continue</Steps.NextTrigger>
          </Steps.Navigation>
        </Steps.Panels>
      </Steps>
    </div>
  ),
}
