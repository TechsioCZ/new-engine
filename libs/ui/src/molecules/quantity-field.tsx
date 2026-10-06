/**
 * QuantityField — @techsio/ui-kit molecule.
 *
 * @component QuantityField
 * @componentVersion v1.0.0
 * @skill quantity-field-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 */
import { type ReactNode, type Ref, useId } from "react"
import { Label } from "../atoms/label"
import { NumericInput, type NumericInputProps } from "../atoms/numeric-input"
import { StatusText } from "../atoms/status-text"
import { tv } from "../utils"

const descriptionSeparator = /\s+/

const quantityFieldVariants = tv({
  slots: {
    root: "flex min-w-0 flex-col gap-quantity-field",
    control: "flex min-w-0 flex-wrap items-center gap-quantity-field-control",
    numeric: "min-w-quantity-field-control-min-width flex-1",
    input: "min-w-0",
    unit: "min-w-0 max-w-full break-words text-quantity-field-unit-fg",
    message: "text-quantity-field-message-fg",
    label: "",
  },
  variants: {
    size: {
      sm: { unit: "text-quantity-field-unit-sm" },
      md: { unit: "text-quantity-field-unit-md" },
      lg: { unit: "text-quantity-field-unit-lg" },
    },
    hideLabel: { true: { label: "sr-only" } },
  },
  defaultVariants: { size: "md", hideLabel: false },
})

type QuantityFieldPendingProps =
  | { pending: true; pendingLabel: string }
  | { pending?: false; pendingLabel?: string }

export type QuantityFieldProps = Omit<
  NumericInputProps,
  | "children"
  | "value"
  | "defaultValue"
  | "onChange"
  | "ref"
  | "invalid"
  | "allowOverflow"
  | "clampValueOnBlur"
  | "precision"
  | "ids"
> &
  QuantityFieldPendingProps & {
    label: ReactNode
    unitLabel: string
    value: string
    onValueChange: NonNullable<NumericInputProps["onValueChange"]>
    helperText?: ReactNode
    error?: ReactNode
    hideLabel?: boolean
    ref?: Ref<HTMLInputElement>
  }

function hasContent(content: ReactNode) {
  return (
    content !== undefined &&
    content !== null &&
    content !== false &&
    content !== ""
  )
}

export function QuantityField({
  id,
  label,
  unitLabel,
  value,
  onValueChange,
  onValueCommit,
  helperText,
  error,
  hideLabel = false,
  pending = false,
  pendingLabel,
  disabled = false,
  readOnly = false,
  required,
  describedBy,
  "aria-describedby": ariaDescribedBy,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  autoFocus,
  size = "md",
  formatOptions,
  ref,
  className,
  ...props
}: QuantityFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const unitId = `${inputId}-unit`
  const helperId = `${inputId}-helper`
  const errorId = `${inputId}-error`
  const pendingId = `${inputId}-pending`
  const hasError = hasContent(error)
  const hasHelper = hasContent(helperText)
  const blocked = pending || disabled || readOnly
  const mergedDescribedBy = [
    describedBy,
    ariaDescribedBy,
    unitId,
    hasHelper ? helperId : undefined,
    hasError ? errorId : undefined,
    pending ? pendingId : undefined,
  ]
    .filter(Boolean)
    .flatMap((description) => description?.split(descriptionSeparator) ?? [])
    .filter(Boolean)
  const inputDescribedBy = [...new Set(mergedDescribedBy)].join(" ")
  const styles = quantityFieldVariants({ size, hideLabel })

  return (
    <div
      className={styles.root({ className })}
      data-pending={pending || undefined}
      data-validation={hasError ? "error" : undefined}
    >
      <Label
        className={styles.label()}
        disabled={disabled || pending}
        htmlFor={inputId}
        required={required}
        size={size}
      >
        {label}
      </Label>
      <div aria-busy={pending || undefined} className={styles.control()}>
        <NumericInput
          {...props}
          allowOverflow={false}
          clampValueOnBlur={false}
          className={styles.numeric()}
          describedBy={inputDescribedBy}
          disabled={disabled || pending}
          formatOptions={
            formatOptions ?? { useGrouping: false, maximumFractionDigits: 20 }
          }
          id={inputId}
          invalid={hasError}
          onValueChange={(details) => {
            if (!blocked) {
              onValueChange(details)
            }
          }}
          onValueCommit={(details) => {
            // Disabling a focused input may blur it. Pending is presentation,
            // so that blur must not initiate a second persistence action.
            if (!blocked) {
              onValueCommit?.(details)
            }
          }}
          readOnly={readOnly}
          required={required}
          size={size}
          value={value}
        >
          <NumericInput.Control
            className={styles.numeric()}
            data-validation={hasError ? "error" : undefined}
          >
            <NumericInput.Input
              aria-label={ariaLabel}
              aria-labelledby={ariaLabelledBy}
              autoFocus={autoFocus}
              className={styles.input()}
              ref={ref}
            />
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </NumericInput.TriggerContainer>
          </NumericInput.Control>
        </NumericInput>
        <span className={styles.unit()} id={unitId}>
          {unitLabel}
        </span>
      </div>
      {hasHelper && (
        <StatusText className={styles.message()} id={helperId} size={size}>
          {helperText}
        </StatusText>
      )}
      {hasError && (
        <StatusText id={errorId} size={size} status="error">
          {error}
        </StatusText>
      )}
      {pending && (
        <StatusText
          aria-atomic="true"
          aria-live="polite"
          className={styles.message()}
          id={pendingId}
          role="status"
          size={size}
        >
          {pendingLabel}
        </StatusText>
      )}
    </div>
  )
}
