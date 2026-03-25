import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import {
  RadioGroup,
  type RadioGroupProps,
} from "../../src/molecules/radio-group"

type RadioOption = {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

const shippingOptions: RadioOption[] = [
  {
    value: "standard",
    label: "Standard shipping",
    description: "Delivers in 3-5 business days.",
  },
  {
    value: "express",
    label: "Express shipping",
    description: "Delivers next business day.",
  },
  {
    value: "pickup",
    label: "Store pickup",
    description: "Ready in 2 hours.",
    disabled: true,
  },
]

const planOptions: RadioOption[] = [
  {
    value: "starter",
    label: "Starter",
    description: "Best for new projects and quick prototypes.",
  },
  {
    value: "growth",
    label: "Growth",
    description: "Adds team features and faster support.",
  },
  {
    value: "scale",
    label: "Scale",
    description: "Priority onboarding and dedicated success manager.",
  },
]

type BasicRadioGroupProps = Omit<RadioGroupProps, "children">

function BasicRadioGroup(args: BasicRadioGroupProps) {
  return (
    <RadioGroup {...args}>
      <RadioGroup.Label>Shipping method</RadioGroup.Label>
      <RadioGroup.ItemGroup>
        {shippingOptions.map((option) => (
          <RadioGroup.Item
            disabled={option.disabled}
            key={option.value}
            value={option.value}
          >
            <RadioGroup.ItemHiddenInput />
            <RadioGroup.ItemControl />
            <span className="flex flex-col gap-50">
              <RadioGroup.ItemText>{option.label}</RadioGroup.ItemText>
              {option.description && (
                <span className="text-fg-secondary text-sm">
                  {option.description}
                </span>
              )}
            </span>
          </RadioGroup.Item>
        ))}
      </RadioGroup.ItemGroup>
      <RadioGroup.StatusText>
        Choose one delivery option for the order.
      </RadioGroup.StatusText>
    </RadioGroup>
  )
}

const meta: Meta<typeof RadioGroup> = {
  title: "Molecules/RadioGroup",
  component: RadioGroup,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A compound radio-group component built with Zag.js. It supports controlled/uncontrolled state, form submission, validation, horizontal or vertical layouts, and rich item content.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: { type: "select" },
      options: ["sm", "md", "lg"],
      description: "Size of the radio group content.",
      table: { defaultValue: { summary: "md" } },
    },
    orientation: {
      control: { type: "inline-radio" },
      options: ["vertical", "horizontal"],
      description: "Layout orientation for radio items.",
      table: { defaultValue: { summary: "vertical" } },
    },
    validateStatus: {
      control: { type: "select" },
      options: ["default", "error", "success", "warning"],
      description: "Validation state shown in helper text and accessibility.",
      table: { defaultValue: { summary: "default" } },
    },
    disabled: {
      control: "boolean",
      description: "Disable the entire radio group.",
      table: { defaultValue: { summary: "false" } },
    },
    readOnly: {
      control: "boolean",
      description: "Make the radio group read-only.",
      table: { defaultValue: { summary: "false" } },
    },
    required: {
      control: "boolean",
      description: "Mark the field as required.",
      table: { defaultValue: { summary: "false" } },
    },
    defaultValue: {
      control: { type: "select" },
      options: ["standard", "express", "pickup", null],
      description: "Initial selected value for uncontrolled usage.",
    },
    onValueChange: {
      action: "value changed",
      description: "Called when the selected value changes.",
    },
  },
  args: {
    size: "md",
    orientation: "vertical",
    validateStatus: "default",
    disabled: false,
    readOnly: false,
    required: false,
    defaultValue: "standard",
  },
}

export default meta

type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => <BasicRadioGroup {...args} />,
}

export const Sizes: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Sizes" fullWidth>
        <BasicRadioGroup defaultValue="standard" size="sm" />
        <BasicRadioGroup defaultValue="standard" size="md" />
        <BasicRadioGroup defaultValue="standard" size="lg" />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const Orientations: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Vertical" fullWidth>
        <BasicRadioGroup defaultValue="standard" orientation="vertical" />
      </VariantGroup>
      <VariantGroup title="Horizontal" fullWidth>
        <BasicRadioGroup defaultValue="standard" orientation="horizontal" />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const States: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Validation" fullWidth>
        <BasicRadioGroup
          defaultValue={null}
          validateStatus="error"
          required
        />
        <BasicRadioGroup
          defaultValue="express"
          validateStatus="success"
        />
        <BasicRadioGroup
          defaultValue="standard"
          validateStatus="warning"
        />
      </VariantGroup>
      <VariantGroup title="Interactivity" fullWidth>
        <BasicRadioGroup defaultValue="standard" disabled />
        <BasicRadioGroup defaultValue="express" readOnly />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const Controlled: Story = {
  render: () => {
    const [value, setValue] = useState<string | null>("growth")

    return (
      <div className="flex w-md flex-col gap-250">
        <RadioGroup
          onValueChange={setValue}
          orientation="vertical"
          size="md"
          value={value}
        >
          <RadioGroup.Label>Plan selection</RadioGroup.Label>
          <RadioGroup.ItemGroup>
            {planOptions.map((option) => (
              <RadioGroup.Item key={option.value} value={option.value}>
                <RadioGroup.ItemHiddenInput />
                <RadioGroup.ItemControl />
                <span className="flex flex-col gap-50">
                  <RadioGroup.ItemText>{option.label}</RadioGroup.ItemText>
                  {option.description && (
                    <span className="text-fg-secondary text-sm">
                      {option.description}
                    </span>
                  )}
                </span>
              </RadioGroup.Item>
            ))}
          </RadioGroup.ItemGroup>
          <RadioGroup.StatusText>
            Selection syncs with external state.
          </RadioGroup.StatusText>
        </RadioGroup>

        <div className="flex items-center gap-150">
          <Button onClick={() => setValue("starter")} size="sm" theme="outlined">
            Set Starter
          </Button>
          <Button onClick={() => setValue("scale")} size="sm" theme="outlined">
            Set Scale
          </Button>
          <Button onClick={() => setValue(null)} size="sm" theme="borderless">
            Clear
          </Button>
        </div>

        <div className="text-fg-secondary text-sm">
          Current value: {value ?? "none"}
        </div>
      </div>
    )
  },
}

export const RichContent: Story = {
  render: () => (
    <RadioGroup defaultValue="growth" size="md" validateStatus="default">
      <RadioGroup.Label>Choose a plan</RadioGroup.Label>
      <RadioGroup.ItemGroup>
        {planOptions.map((option) => (
          <RadioGroup.Item key={option.value} value={option.value}>
            <RadioGroup.ItemHiddenInput />
            <RadioGroup.ItemControl />
            <div className="flex flex-col gap-50">
              <div className="flex items-center gap-100">
                <RadioGroup.ItemText>{option.label}</RadioGroup.ItemText>
                <span className="rounded-full bg-fill-base px-100 py-50 text-fg-secondary text-xs">
                  {option.value === "growth" ? "Popular" : "Available"}
                </span>
              </div>
              {option.description && (
                <span className="text-fg-secondary text-sm">
                  {option.description}
                </span>
              )}
            </div>
          </RadioGroup.Item>
        ))}
      </RadioGroup.ItemGroup>
      <RadioGroup.StatusText>
        Compound API lets you add metadata next to each option.
      </RadioGroup.StatusText>
    </RadioGroup>
  ),
}
