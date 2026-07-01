import type { AnyFieldApi } from "@tanstack/react-form"
import type { ReactNode } from "react"
import type { IconType } from "../atoms/icon"
import { NumericInput, type NumericInputProps } from "../atoms/numeric-input"
import { FormNumericInput } from "../molecules/form-numeric-input"
import { tv } from "../utils"
import {
  type FieldErrorVisibility,
  getFieldStatus,
  getNumericFieldProps,
} from "./field-bindings"

const numericFieldVariants = tv({
  slots: {
    sidesControl: "flex-1",
    sidesWrapper: "flex items-center gap-50",
  },
})

export type NumericFieldProps = Omit<
  NumericInputProps,
  "children" | "value" | "defaultValue" | "onChange" | "id" | "name"
> & {
  field: AnyFieldApi
  label: ReactNode
  id?: string
  name?: string
  showControls?: boolean
  showScrubber?: boolean
  controlsPosition?: "right" | "sides"
  incrementIcon?: IconType
  decrementIcon?: IconType
  errorVisibility?: FieldErrorVisibility
  externalError?: string
  onExternalErrorClear?: () => void
  showHelpTextIcon?: boolean
  helpText?: ReactNode
  formatValue?: (value: number | null | undefined) => number | undefined
  parseValue?: (value: number) => number
}

export function NumericField({
  field,
  label,
  id,
  name,
  size = "md",
  required,
  disabled,
  className,
  showControls = true,
  showScrubber = false,
  controlsPosition = "right",
  incrementIcon = "token-icon-numeric-input-increment",
  decrementIcon = "token-icon-numeric-input-decrement",
  errorVisibility = "blurred",
  externalError,
  onExternalErrorClear,
  showHelpTextIcon,
  helpText,
  formatValue,
  parseValue,
  ...numericInputProps
}: NumericFieldProps) {
  const fieldProps = getNumericFieldProps(field, {
    id,
    name,
    formatValue,
    parseValue,
  })
  const fieldStatus = getFieldStatus(field, {
    when: errorVisibility,
    externalError,
  })
  const resolvedHelpText = fieldStatus.errorMessage ?? helpText
  const { sidesControl, sidesWrapper } = numericFieldVariants()

  const handleChange = (value: number) => {
    fieldProps.onChange(value)
    if (externalError && onExternalErrorClear) {
      onExternalErrorClear()
    }
  }

  const controlContent = (
    <NumericInput.Control
      className={controlsPosition === "sides" ? sidesControl() : undefined}
    >
      {showScrubber && <NumericInput.Scrubber />}
      <NumericInput.Input />
      {showControls && controlsPosition === "right" && (
        <NumericInput.TriggerContainer>
          <NumericInput.IncrementTrigger icon={incrementIcon} />
          <NumericInput.DecrementTrigger icon={decrementIcon} />
        </NumericInput.TriggerContainer>
      )}
    </NumericInput.Control>
  )

  return (
    <FormNumericInput
      className={className}
      disabled={disabled}
      helpText={resolvedHelpText}
      id={fieldProps.id}
      label={label}
      name={fieldProps.name}
      onChange={handleChange}
      required={required}
      showHelpTextIcon={showHelpTextIcon}
      size={size}
      validateStatus={fieldStatus.validateStatus}
      value={fieldProps.value}
      {...numericInputProps}
    >
      {controlsPosition === "sides" ? (
        <div className={sidesWrapper()}>
          {showControls && (
            <NumericInput.DecrementTrigger icon={decrementIcon} />
          )}
          {controlContent}
          {showControls && (
            <NumericInput.IncrementTrigger icon={incrementIcon} />
          )}
        </div>
      ) : (
        controlContent
      )}
    </FormNumericInput>
  )
}
