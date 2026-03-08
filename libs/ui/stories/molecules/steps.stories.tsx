import type { Meta, StoryObj } from '@storybook/react'
import { useEffect, useState } from 'react'
import { VariantContainer, VariantGroup } from '../../.storybook/decorator'
import { Badge } from '../../src/atoms/badge'
import { Button } from '../../src/atoms/button'
import { Icon, type IconType } from '../../src/atoms/icon'
import { Input } from '../../src/atoms/input'
import { Steps, useSteps } from '../../src/molecules/steps'

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
    actionLabel: 'Assign owner',
    badge: 'Planning',
    content:
      'Set the initial structure, clarify intent, and gather the small decisions that should not leak into later steps.',
    description: 'Define scope and ownership.',
    icon: 'token-icon-folder',
    title: 'Brief',
  },
  {
    actionLabel: 'Capture details',
    badge: 'Execution',
    content:
      'Move from outline to implementation details. This is where the stepper starts benefiting from a richer compound composition.',
    description: 'Collect the important inputs.',
    icon: 'token-icon-clipboard',
    title: 'Inputs',
  },
  {
    actionLabel: 'Confirm release',
    badge: 'Approval',
    content:
      'Review the result, check open questions, and prepare the final handoff. Completion should feel visually distinct from the in-progress state.',
    description: 'Review and publish.',
    icon: 'token-icon-save',
    title: 'Review',
  },
]

const completedText = 'All steps are complete. This content lives outside the indexed step panels.'

const meta: Meta<typeof Steps> = {
  title: 'Molecules/Steps',
  component: Steps,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Computed/compound stepper built on Zag.js. This version keeps the machine API close to Zag while exposing composable subcomponents similar to our other computed molecules.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    linear: {
      control: 'boolean',
      description: 'Whether users must progress sequentially.',
      table: { category: 'Behavior', defaultValue: { summary: 'false' } },
    },
    orientation: {
      control: 'radio',
      options: ['horizontal', 'vertical'],
      description: 'Stepper orientation.',
      table: {
        category: 'Layout',
        defaultValue: { summary: 'horizontal' },
      },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Visual size scale for indicators and content.',
      table: { category: 'Appearance', defaultValue: { summary: 'md' } },
    },
    step: {
      control: { type: 'number', min: 0, max: demoSteps.length },
      description: 'Controlled active step index.',
      table: { category: 'Behavior', defaultValue: { summary: '0' } },
    },
    variant: {
      control: 'radio',
      options: ['subtle', 'solid'],
      description: 'Visual emphasis style.',
      table: {
        category: 'Appearance',
        defaultValue: { summary: 'subtle' },
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
    orientation: 'horizontal',
    size: 'md',
    step: 0,
    variant: 'subtle',
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => {
    const [step, setStep] = useState(args.step ?? 0)

    useEffect(() => {
      setStep(args.step ?? 0)
    }, [args.step])

    return (
      <div className="w-5xl">
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
                    <p className="text-md font-semibold text-fg-primary">
                      {item.title}
                    </p>
                    <p className="text-sm text-fg-secondary">{item.content}</p>
                  </div>
                  <div className="flex flex-wrap gap-150">
                    <Button size="sm" theme="solid" variant="primary">
                      {item.actionLabel}
                    </Button>
                    <Button size="sm" theme="borderless" variant="secondary">
                      View notes
                    </Button>
                  </div>
                </div>
              </Steps.Content>
            ))}
            <Steps.CompletedContent>
              <div className="flex flex-col gap-150">
                <Badge variant="success">Complete</Badge>
                <p className="text-md font-semibold text-fg-primary">
                  Ready for handoff
                </p>
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
}

export const Basic: Story = {
  render: () => (
    <div className="w-5xl">
      <Steps count={demoSteps.length} defaultStep={1} size="md" variant="subtle">
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
  render: () => {
    const [step, setStep] = useState(1)

    return (
      <div className="w-5xl">
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

export const Sizes: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup fullWidth title="Small">
        <div className="w-5xl">
          <Steps count={demoSteps.length} defaultStep={1} size="sm" variant="subtle">
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

      <VariantGroup fullWidth title="Medium">
        <div className="w-5xl">
          <Steps count={demoSteps.length} defaultStep={1} size="md" variant="subtle">
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

      <VariantGroup fullWidth title="Large">
        <div className="w-5xl">
          <Steps count={demoSteps.length} defaultStep={1} size="lg" variant="subtle">
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

export const Validation: Story = {
  render: () => (
    <div className="w-5xl">
      <Steps count={demoSteps.length} defaultStep={1} linear size="md" variant="subtle">
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
          <Steps.Content index={0}>
            <div className="flex flex-col gap-150">
              <Badge variant="success">Looks good</Badge>
              <Input defaultValue="Ada Lovelace" readOnly variant="success" />
              <p className="text-sm text-fg-secondary">
                Validation UI can live inside the panel content without adding a
                dedicated validation API to the stepper itself.
              </p>
            </div>
          </Steps.Content>

          <Steps.Content index={1}>
            <div className="flex flex-col gap-150">
              <Badge variant="warning">Needs attention</Badge>
              <Input defaultValue="team@" readOnly variant="error" />
              <p className="text-sm text-danger">
                Example only: this panel shows how an invalid state can be composed.
              </p>
            </div>
          </Steps.Content>

          <Steps.Content index={2}>
            <div className="flex flex-col gap-150">
              <Badge variant="outline">Review</Badge>
              <p className="text-sm text-fg-secondary">
                The final step can summarize the previous panels or show any review UI.
              </p>
            </div>
          </Steps.Content>

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

export const Variants: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup fullWidth title="Subtle">
        <div className="w-5xl">
          <Steps count={demoSteps.length} defaultStep={1} size="md" variant="subtle">
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
        <div className="w-5xl">
          <Steps count={demoSteps.length} defaultStep={1} size="md" variant="solid">
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

export const Vertical: Story = {
  render: () => (
    <div className="w-5xl">
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

export const Description: Story = {
  render: () => (
    <div className="w-5xl">
      <Steps count={demoSteps.length} defaultStep={1} size="md" variant="subtle">
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
  render: () => (
    <div className="w-5xl">
      <Steps count={demoSteps.length} defaultStep={1} size="md" variant="subtle">
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
  render: () => (
    <div className="w-5xl">
      <Steps count={demoSteps.length} defaultStep={1} size="md" variant="subtle">
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
              <p className="text-sm text-fg-secondary">{item.title} panel content.</p>
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
  render: () => (
    <div className="w-5xl">
      <p className="mb-150 text-sm text-fg-secondary">
        Step headers are read-only in this example. Navigate only with Back/Continue.
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

