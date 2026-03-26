import type { Meta, StoryObj } from "@storybook/react"
import { fn } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Badge } from "../../src/atoms/badge"
import { Icon, type IconType } from "../../src/atoms/icon"
import { RadioCard, type RadioCardProps } from "../../src/molecules/radio-card"

type RadioCardOption = {
  value: string
  title: string
  description?: string
  addon?: string
  icon?: IconType
  disabled?: boolean
  badge?: string
}

const frameworkOptions: RadioCardOption[] = [
  {
    value: "next",
    title: "Next.js",
    description: "SSR, routing and server actions in one stack.",
    addon: "Recommended for full-stack apps",
    icon: "token-icon-check",
    badge: "Full stack",
  },
  {
    value: "vite",
    title: "Vite",
    description: "Fast local iteration for app shells and dashboards.",
    addon: "Great for SPAs",
    icon: "token-icon-save",
    badge: "Fast",
  },
  {
    value: "astro",
    title: "Astro",
    description: "Lean output for mostly static and content-led pages.",
    addon: "Best for content sites",
    icon: "token-icon-folder",
    badge: "Content",
    disabled: true,
  },
]

const paymentOptions: RadioCardOption[] = [
  {
    value: "paypal",
    title: "Approval flow",
    description: "Manual review before deploy.",
    icon: "token-icon-info",
  },
  {
    value: "card",
    title: "Instant publish",
    description: "Push immediately after validation.",
    icon: "token-icon-success",
  },
  {
    value: "bank",
    title: "Copy assets",
    description: "Reuse a previous configuration.",
    icon: "token-icon-copy",
  },
]

type BasicRadioCardProps = Omit<RadioCardProps, "children">

function BasicRadioCard({
  align = "start",
  justify = "between",
  itemOrientation = "horizontal",
  ...args
}: BasicRadioCardProps) {
  return (
    <RadioCard
      align={align}
      justify={justify}
      itemOrientation={itemOrientation}
      {...args}
    >
      <RadioCard.Label>Choose your stack</RadioCard.Label>
      <div className="grid w-full gap-150 md:grid-cols-3">
        {frameworkOptions.map((option) => (
          <RadioCard.Item
            disabled={option.disabled}
            key={option.value}
            value={option.value}
          >
            <RadioCard.ItemHiddenInput />
            <RadioCard.ItemControl>
              <RadioCard.ItemContent>
                <div className="flex items-center gap-100">
                  <RadioCard.ItemText>{option.title}</RadioCard.ItemText>
                  {option.badge ? (
                    <Badge
                      //className="w-max border-current"
                      //variant="outline"
                      variant="dynamic"
                      bgColor="#888"
                      fgColor="#fff"
                      borderColor="transparent"

                    >
                      {option.badge}
                    </Badge>
                  ) : null}
                </div>
                {option.description ? (
                  <RadioCard.ItemDescription>
                    {option.description}
                  </RadioCard.ItemDescription>
                ) : null}
              </RadioCard.ItemContent>
              <RadioCard.ItemIndicator />
            </RadioCard.ItemControl>
          </RadioCard.Item>
        ))}
      </div>
      <RadioCard.StatusText>
        Pick the option that matches the delivery target.
      </RadioCard.StatusText>
    </RadioCard>
  )
}

const meta: Meta<typeof RadioCard> = {
  title: "Molecules/RadioCard",
  component: RadioCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A compound radio-card component built on Zag radio-group semantics. It preserves form participation and accessibility, while exposing card-first slots for richer content and optional add-ons.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: { type: "select" },
      options: ["sm", "md", "lg"],
      description: "Size of the card content and spacing.",
      table: { defaultValue: { summary: "md" } },
    },
    variant: {
      control: { type: "select" },
      options: ["outline", "subtle", "solid"],
      description: "Visual treatment of the selected card state.",
      table: { defaultValue: { summary: "outline" } },
    },
    orientation: {
      control: { type: "inline-radio" },
      options: ["horizontal", "vertical"],
      description: "Keyboard and navigation orientation for the radio group.",
      table: { defaultValue: { summary: "horizontal" } },
    },
    itemOrientation: {
      control: { type: "inline-radio" },
      options: ["horizontal", "vertical"],
      description: "Content flow inside each card.",
      table: { defaultValue: { summary: "horizontal" } },
    },
    align: {
      control: { type: "select" },
      options: ["start", "center", "end"],
      description: "Cross-axis alignment for card content.",
      table: { defaultValue: { summary: "start" } },
    },
    justify: {
      control: { type: "select" },
      options: ["start", "center", "end", "between"],
      description: "Main-axis distribution inside each card.",
      table: { defaultValue: { summary: "between" } },
    },
    validateStatus: {
      control: { type: "select" },
      options: ["default", "error", "success", "warning"],
      description: "Validation state reflected in helper text and a11y.",
      table: { defaultValue: { summary: "default" } },
    },
    disabled: {
      control: "boolean",
      description: "Disable the entire radio-card group.",
      table: { defaultValue: { summary: "false" } },
    },
    readOnly: {
      control: "boolean",
      description: "Make the radio-card group read-only.",
      table: { defaultValue: { summary: "false" } },
    },
    required: {
      control: "boolean",
      description: "Mark the field as required.",
      table: { defaultValue: { summary: "false" } },
    },
    defaultValue: {
      control: { type: "select" },
      options: ["next", "vite", "astro", null],
      description: "Initial selected value for uncontrolled usage.",
    },
    onValueChange: {
      description: "Called when the selected value changes.",
    },
  },
  args: {
    size: "md",
    variant: "outline",
    orientation: "horizontal",
    itemOrientation: "horizontal",
    align: "start",
    justify: "between",
    validateStatus: "default",
    disabled: false,
    readOnly: false,
    required: false,
    defaultValue: "next",
    onValueChange: fn(),
  },
}

export default meta

type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => <BasicRadioCard {...args} />,
}

export const Variants: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Variants" fullWidth>
        <BasicRadioCard defaultValue="next" variant="outline" />
        <BasicRadioCard defaultValue="next" variant="subtle" />
        <BasicRadioCard defaultValue="next" variant="solid" />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const Sizes: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Sizes" fullWidth>
        <BasicRadioCard defaultValue="next" size="sm" />
        <BasicRadioCard defaultValue="next" size="md" />
        <BasicRadioCard defaultValue="next" size="lg" />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const States: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Validation" fullWidth>
        <BasicRadioCard defaultValue={null} required validateStatus="error" />
        <BasicRadioCard defaultValue="vite" validateStatus="success" />
        <BasicRadioCard defaultValue="next" validateStatus="warning" />
      </VariantGroup>
      <VariantGroup title="Interactivity" fullWidth>
        <BasicRadioCard defaultValue="next" disabled />
        <BasicRadioCard defaultValue="vite" readOnly />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const Centered: Story = {
  render: () => (
    <RadioCard
      align="center"
      defaultValue="card"
      justify="center"
      itemOrientation="vertical"
      size="md"
      variant="outline"
    >
      <RadioCard.Label>Publish mode</RadioCard.Label>
      <div className="grid w-full gap-150 md:grid-cols-3">
        {paymentOptions.map((option) => (
          <RadioCard.Item key={option.value} value={option.value}>
            <RadioCard.ItemHiddenInput />
            <RadioCard.ItemControl>
              <Icon
                className="text-fg-secondary"
                icon={option.icon ?? "token-icon-info"}
                size="xl"
              />
              <RadioCard.ItemText>{option.title}</RadioCard.ItemText>
              <RadioCard.ItemIndicator />
            </RadioCard.ItemControl>
          </RadioCard.Item>
        ))}
      </div>
      <RadioCard.StatusText>
        Centered content works well for icon-led choices.
      </RadioCard.StatusText>
    </RadioCard>
  ),
}

export const WithAddon: Story = {
  render: () => (
    <RadioCard defaultValue="vite" size="md" variant="outline">
      <RadioCard.Label>Preferred frontend setup</RadioCard.Label>
      <div className="grid w-full gap-150 md:grid-cols-3">
        {frameworkOptions.map((option) => (
          <RadioCard.Item
            disabled={option.disabled}
            key={option.value}
            value={option.value}
          >
            <RadioCard.ItemHiddenInput />
            <RadioCard.ItemControl>
              <RadioCard.ItemContent>
                <RadioCard.ItemText>{option.title}</RadioCard.ItemText>
                {option.description ? (
                  <RadioCard.ItemDescription>
                    {option.description}
                  </RadioCard.ItemDescription>
                ) : null}
              </RadioCard.ItemContent>
              <RadioCard.ItemIndicator />
            </RadioCard.ItemControl>
            <RadioCard.ItemAddon>{option.addon}</RadioCard.ItemAddon>
          </RadioCard.Item>
        ))}
      </div>
      <RadioCard.StatusText>
        Add-ons are useful for pricing, limits or rollout notes.
      </RadioCard.StatusText>
    </RadioCard>
  ),
}

export const WithoutIndicator: Story = {
  render: () => (
    <RadioCard
      align="center"
      defaultValue="card"
      justify="center"
      itemOrientation="vertical"
      size="md"
      variant="outline"
    >
      <RadioCard.Label>Publish mode</RadioCard.Label>
      <div className="grid w-full gap-150 md:grid-cols-3">
        {paymentOptions.map((option) => (
          <RadioCard.Item key={option.value} value={option.value}>
            <RadioCard.ItemHiddenInput />
            <RadioCard.ItemControl>
              <Icon
                className="text-fg-secondary"
                icon={option.icon ?? "token-icon-info"}
                size="xl"
              />
              <RadioCard.ItemText>{option.title}</RadioCard.ItemText>
            </RadioCard.ItemControl>
          </RadioCard.Item>
        ))}
      </div>
      <RadioCard.StatusText>
        Omitting the indicator still works when the card surface carries the state.
      </RadioCard.StatusText>
    </RadioCard>
  ),
}
