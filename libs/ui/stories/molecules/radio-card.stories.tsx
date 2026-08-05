import type { Meta, StoryObj } from "@storybook/react"
import { fn } from "storybook/test"

import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Badge } from "../../src/atoms/badge"
import { Icon } from "../../src/atoms/icon"
import type { IconType } from "../../src/atoms/icon"
import { RadioCard } from "../../src/molecules/radio-card"
import type { RadioCardProps } from "../../src/molecules/radio-card"

interface RadioCardOption {
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
    addon: "Recommended for full-stack apps",
    badge: "Full stack",
    description: "SSR, routing and server actions in one stack.",
    icon: "token-icon-check",
    title: "Next.js",
    value: "next",
  },
  {
    addon: "Great for SPAs",
    badge: "Fast",
    description: "Fast local iteration for app shells and dashboards.",
    icon: "token-icon-save",
    title: "Vite",
    value: "vite",
  },
  {
    addon: "Best for content sites",
    badge: "Content",
    description: "Lean output for mostly static and content-led pages.",
    disabled: true,
    icon: "token-icon-folder",
    title: "Astro",
    value: "astro",
  },
]

const paymentOptions: RadioCardOption[] = [
  {
    description: "Manual review before deploy.",
    icon: "token-icon-info",
    title: "Approval flow",
    value: "paypal",
  },
  {
    description: "Push immediately after validation.",
    icon: "token-icon-success",
    title: "Instant publish",
    value: "card",
  },
  {
    description: "Reuse a previous configuration.",
    icon: "token-icon-copy",
    title: "Copy assets",
    value: "bank",
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
  argTypes: {
    align: {
      control: { type: "select" },
      description: "Cross-axis alignment for card content.",
      options: ["start", "center", "end"],
      table: { defaultValue: { summary: "start" } },
    },
    defaultValue: {
      control: { type: "select" },
      description: "Initial selected value for uncontrolled usage.",
      options: ["next", "vite", "astro", null],
    },
    disabled: {
      control: "boolean",
      description: "Disable the entire radio-card group.",
      table: { defaultValue: { summary: "false" } },
    },
    itemOrientation: {
      control: { type: "inline-radio" },
      description: "Content flow inside each card.",
      options: ["horizontal", "vertical"],
      table: { defaultValue: { summary: "horizontal" } },
    },
    justify: {
      control: { type: "select" },
      description: "Main-axis distribution inside each card.",
      options: ["start", "center", "end", "between"],
      table: { defaultValue: { summary: "between" } },
    },
    onValueChange: {
      description: "Called when the selected value changes.",
    },
    orientation: {
      control: { type: "inline-radio" },
      description: "Keyboard and navigation orientation for the radio group.",
      options: ["horizontal", "vertical"],
      table: { defaultValue: { summary: "horizontal" } },
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
    size: {
      control: { type: "select" },
      description: "Size of the card content and spacing.",
      options: ["sm", "md", "lg"],
      table: { defaultValue: { summary: "md" } },
    },
    validateStatus: {
      control: { type: "select" },
      description: "Validation state reflected in helper text and a11y.",
      options: ["default", "error", "success", "warning"],
      table: { defaultValue: { summary: "default" } },
    },
    variant: {
      control: { type: "select" },
      description: "Visual treatment of the selected card state.",
      options: ["outline", "subtle", "solid"],
      table: { defaultValue: { summary: "outline" } },
    },
  },
  args: {
    align: "start",
    defaultValue: "next",
    disabled: false,
    itemOrientation: "horizontal",
    justify: "between",
    onValueChange: fn(),
    orientation: "horizontal",
    readOnly: false,
    required: false,
    size: "md",
    validateStatus: "default",
    variant: "outline",
  },
  component: RadioCard,
  parameters: {
    docs: {
      description: {
        component:
          "A compound radio-card component built on Zag radio-group semantics. It preserves form participation and accessibility, while exposing card-first slots for richer content and optional add-ons.",
      },
    },
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Molecules/RadioCard",
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
        Omitting the indicator still works when the card surface carries the
        state.
      </RadioCard.StatusText>
    </RadioCard>
  ),
}
