import type { Meta, StoryObj } from "@storybook/react"
import type { ComponentProps } from "react"
import { useState } from "react"

import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { NumericInput } from "../../src/atoms/numeric-input"
import { Combobox } from "../../src/molecules/combobox"
import { FormCheckbox } from "../../src/molecules/form-checkbox"
import { FormInput } from "../../src/molecules/form-input"
import { FormNumericInput } from "../../src/molecules/form-numeric-input"
import { FormTextarea } from "../../src/molecules/form-textarea"
import { Select } from "../../src/molecules/select"
import { Slider } from "../../src/molecules/slider"
import { Switch } from "../../src/molecules/switch"

interface ComprehensiveFormArgs {
  size: NonNullable<ComponentProps<typeof FormInput>["size"]>
  validateStatus: NonNullable<
    ComponentProps<typeof FormInput>["validateStatus"]
  >
}

const meta = {
  argTypes: {
    size: {
      control: "select",
      description: "Size that propagates to all form components",
      options: ["sm", "md", "lg"],
    },
    validateStatus: {
      control: "select",
      description: "Validation state that affects all form inputs",
      options: ["default", "error", "success", "warning"],
    },
  },
  args: {
    size: "md",
    validateStatus: "default",
  },
  parameters: {
    layout: "centered",
  },
  title: "Templates/Comprehensive Form",
} satisfies Meta<ComprehensiveFormArgs>

export default meta
type Story = StoryObj<ComprehensiveFormArgs>

const selectOptions = [
  { label: "Option 1", value: "option1" },
  { label: "Option 2", value: "option2" },
  { label: "Option 3", value: "option3" },
]

const comboboxOptions = [
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana" },
  { label: "Cherry", value: "cherry" },
  { label: "Date", value: "date" },
]

const helpTextByStatus: Record<
  ComprehensiveFormArgs["validateStatus"],
  string
> = {
  default: "Helper text for this field",
  error: "This field has an error",
  success: "This field is valid",
  warning: "This field has a warning",
}

const AllFormInputsStory = ({
  size,
  validateStatus,
}: ComprehensiveFormArgs) => {
  const [formData, setFormData] = useState({
    checkbox: false,
    combobox: "",
    email: "",
    number: 0,
    password: "",
    range: [25],
    select: "",
    switch: false,
    textInput: "",
    textarea: "",
  })

  const helpText = helpTextByStatus[validateStatus]

  return (
    <div className="w-full space-y-6 p-6">
      <h2 className="mb-8 font-bold text-2xl">
        Comprehensive Form - Size: {size}
      </h2>

      <VariantContainer>
        <VariantGroup title="Text Inputs" fullWidth>
          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
            <FormInput
              id="text-input"
              label="Text Input"
              placeholder="Enter text"
              size={size}
              validateStatus={validateStatus}
              helpText={helpText}
              value={formData.textInput}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  textInput: e.target.value,
                }))
              }}
            />

            <FormInput
              id="email-input"
              label="Email"
              type="email"
              placeholder="Enter email"
              size={size}
              validateStatus={validateStatus}
              helpText={helpText}
              value={formData.email}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }}
            />

            <FormInput
              id="password-input"
              label="Password"
              type="password"
              placeholder="Enter password"
              size={size}
              validateStatus={validateStatus}
              helpText={helpText}
              value={formData.password}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, password: e.target.value }))
              }}
            />

            <FormTextarea
              id="textarea"
              label="Textarea"
              placeholder="Enter long text"
              size={size}
              validateStatus={validateStatus}
              helpText={helpText}
              value={formData.textarea}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  textarea: e.target.value,
                }))
              }}
            />
          </div>
        </VariantGroup>

        <VariantGroup title="Selection Inputs" fullWidth>
          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              items={selectOptions}
              size={size}
              validateStatus={validateStatus}
            >
              <Select.Label>Select</Select.Label>
              <Select.Control>
                <Select.Trigger>
                  <Select.ValueText placeholder="Choose an option" />
                </Select.Trigger>
                <Select.ClearTrigger />
              </Select.Control>
              <Select.Positioner>
                <Select.Content>
                  {selectOptions.map((item) => (
                    <Select.Item key={item.value} item={item}>
                      <Select.ItemText />
                      <Select.ItemIndicator />
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
              <Select.StatusText>{helpText}</Select.StatusText>
            </Select>

            <Combobox
              label="Combobox"
              placeholder="Search and select"
              size={size}
              items={comboboxOptions}
              validateStatus={validateStatus}
              helpText={helpText}
            />
          </div>
        </VariantGroup>

        <VariantGroup title="Numeric & Boolean Inputs" fullWidth>
          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
            <FormNumericInput
              id="numeric-input"
              label="Numeric Input"
              size={size}
              validateStatus={validateStatus}
              helpText={helpText}
            >
              <NumericInput.Control>
                <NumericInput.Input />
                <NumericInput.TriggerContainer>
                  <NumericInput.IncrementTrigger />
                  <NumericInput.DecrementTrigger />
                </NumericInput.TriggerContainer>
              </NumericInput.Control>
            </FormNumericInput>

            <div className="space-y-4">
              <FormCheckbox
                id="checkbox"
                label="Checkbox Option"
                size={size}
                validateStatus={validateStatus}
                helpText={helpText}
                checked={formData.checkbox}
                onCheckedChange={(checked) => {
                  setFormData((prev) => ({ ...prev, checkbox: checked }))
                }}
              />

              <Switch
                checked={formData.switch}
                onCheckedChange={(checked) => {
                  setFormData((prev) => ({ ...prev, switch: checked }))
                }}
                validateStatus={validateStatus}
                helpText={helpText}
              >
                Switch Option
              </Switch>
            </div>
          </div>
        </VariantGroup>

        <VariantGroup title="Range Input" fullWidth>
          <div className="w-full">
            <Slider
              label="Slider"
              size={size}
              min={0}
              max={100}
              value={formData.range}
              helpText={helpText}
            />
          </div>
        </VariantGroup>
      </VariantContainer>
    </div>
  )
}

/**
 * Comprehensive form showcasing all form input types with consistent sizing and validation states.
 * This template helps verify that all form components have consistent visual appearance and spacing.
 */
export const AllFormInputs: Story = {
  render: AllFormInputsStory,
}

/**
 * Shows all form inputs in small size for compact layouts.
 */
export const SmallSize: Story = {
  ...AllFormInputs,
  args: {
    size: "sm",
    validateStatus: "default",
  },
}

/**
 * Shows all form inputs in large size for accessibility or desktop layouts.
 */
export const LargeSize: Story = {
  ...AllFormInputs,
  args: {
    size: "lg",
    validateStatus: "default",
  },
}

/**
 * Shows all form inputs in error state to verify consistent error styling.
 */
export const ErrorState: Story = {
  ...AllFormInputs,
  args: {
    size: "md",
    validateStatus: "error",
  },
}

/**
 * Shows all form inputs in success state to verify consistent success styling.
 */
export const SuccessState: Story = {
  ...AllFormInputs,
  args: {
    size: "md",
    validateStatus: "success",
  },
}
