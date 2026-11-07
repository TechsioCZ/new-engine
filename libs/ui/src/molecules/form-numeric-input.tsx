/**
 * FormNumericInput — @techsio/ui-kit molecule.
 *
 * @component FormNumericInput
 * @componentVersion v1.2.3
 * @skill form-numeric-input-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the form-numeric-input-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { Children, isValidElement, type ReactNode, useId } from "react"
import { Label } from "../atoms/label"
import { NumericInput, type NumericInputProps } from "../atoms/numeric-input"
import { StatusText } from "../atoms/status-text"
import { joinDescribedBy } from "../internal/described-by"
import { tv } from "../utils"

const formNumericInputVariants = tv({
  base: "flex min-w-0 flex-col gap-form-field-gap",
})

type ValidateStatus = "default" | "error" | "success" | "warning"

type FormNumericInputProps = Omit<NumericInputProps, "children"> & {
  id?: string
  label: ReactNode
  validateStatus?: ValidateStatus
  helpText?: ReactNode
  showHelpTextIcon?: boolean
  children: ReactNode
}

function findInputId(children: ReactNode): string | undefined {
  for (const child of Children.toArray(children)) {
    if (!isValidElement<{ id?: string; children?: ReactNode }>(child)) {
      continue
    }
    if (child.type === NumericInput.Input) {
      return child.props.id
    }
    const nestedId = findInputId(child.props.children)
    if (nestedId !== undefined) {
      return nestedId
    }
  }
  return undefined
}

export function FormNumericInput({
  id,
  ids,
  dir,
  label,
  validateStatus = "default",
  helpText,
  showHelpTextIcon = validateStatus !== "default",
  size = "md",
  required,
  disabled,
  describedBy,
  "aria-describedby": ariaDescribedBy,
  "aria-errormessage": ariaErrorMessage,
  children,
  ...numericInputProps
}: FormNumericInputProps) {
  const generatedId = useId()
  // The label must point at the real input. Zag only uses our id for the
  // input when one is given, otherwise it generates `number-input:<id>:input`
  // and the label's htmlFor dangles — so always pass a concrete id.
  const fieldId = id || generatedId
  const inputId = findInputId(children) ?? ids?.input ?? fieldId
  const helpTextId = useId()
  const hasHelpText =
    helpText !== undefined &&
    helpText !== null &&
    helpText !== false &&
    helpText !== ""
  const mergedDescribedBy = joinDescribedBy(
    describedBy,
    ariaDescribedBy,
    hasHelpText ? helpTextId : undefined
  )

  return (
    <div className={formNumericInputVariants()} dir={dir}>
      <Label
        disabled={disabled}
        htmlFor={inputId}
        required={required}
        size={size}
      >
        {label}
      </Label>

      <NumericInput
        {...numericInputProps}
        aria-errormessage={joinDescribedBy(
          ariaErrorMessage,
          validateStatus === "error" && hasHelpText ? helpTextId : undefined
        )}
        describedBy={mergedDescribedBy}
        dir={dir}
        disabled={disabled}
        id={fieldId}
        ids={{ ...ids, input: inputId }}
        invalid={validateStatus === "error" || numericInputProps.invalid}
        required={required}
        size={size}
        validateStatus={validateStatus}
      >
        {children}
      </NumericInput>

      {hasHelpText && (
        <StatusText
          id={helpTextId}
          showIcon={validateStatus !== "default" || showHelpTextIcon}
          size={size}
          status={validateStatus}
        >
          {helpText}
        </StatusText>
      )}
    </div>
  )
}
