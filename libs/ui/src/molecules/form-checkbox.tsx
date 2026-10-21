/**
 * FormCheckbox — @techsio/ui-kit molecule.
 *
 * @component FormCheckbox
 * @componentVersion v1.2.1
 * @skill form-checkbox-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the form-checkbox-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { connect, machine } from "@zag-js/checkbox"
import { normalizeProps, useMachine } from "@zag-js/react"
import { type ReactNode, useId } from "react"
import {
  getControlledChoiceInputProps,
  trackChoiceFormControl,
} from "../atoms/checkbox"
import { StatusText } from "../atoms/status-text"
import { joinDescribedBy } from "../internal/described-by"
import { tv } from "../utils"

const checkboxChoiceMachine: typeof machine = {
  ...machine,
  implementations: {
    ...machine.implementations,
    effects: {
      ...machine.implementations?.effects,
      trackFormControlState({ scope, context }) {
        const root = scope.getById(scope.ids?.root ?? `checkbox:${scope.id}`)
        return trackChoiceFormControl(
          root,
          () => context.set("checked", context.initial("checked")),
          (disabled) => context.set("fieldsetDisabled", disabled)
        )
      },
    },
  },
}

const checkboxVariants = tv({
  slots: {
    root: "flex items-center gap-form-checkbox-gap",
    control: [
      "form-control-readonly form-control-disabled relative shrink-0 cursor-pointer",

      "border-(length:--border-width-checkbox) rounded-checkbox-control border-checkbox-border-base",
      "bg-checkbox-bg-base",
      "flex items-center justify-center",
      "transition duration-200 motion-reduce:transition-none",
      "data-[state=checked]:bg-checkbox-bg-checked",
      "data-[state=checked]:border-checkbox-border-checked",
      "data-[state=indeterminate]:bg-checkbox-bg-indeterminate",
      "data-[state=indeterminate]:border-checkbox-border-indeterminate",
      "data-disabled:cursor-not-allowed",
      "data-disabled:bg-checkbox-bg-disabled",
      "data-disabled:border-checkbox-border-disabled",
      "data-focus-visible:outline-(style:--default-ring-style) data-focus-visible:outline-(length:--default-ring-width)",
      "data-focus-visible:outline-checkbox-ring-focus",
      "data-focus-visible:outline-offset-(length:--default-ring-offset)",
      "data-invalid:border-(length:--border-width-validation)",
      "data-invalid:border-checkbox-border-error",
    ],
    indicator: [
      "text-checkbox-fg-checked",
      "data-[state=checked]:token-icon-checkbox",
      "data-[state=indeterminate]:w-checkbox-indeterminate-icon",
      "data-[state=indeterminate]:h-checkbox-indeterminate-stroke",
      "data-[state=indeterminate]:rounded-full",
      "data-[state=indeterminate]:bg-checkbox-fg-indeterminate",
      "data-disabled:text-checkbox-fg-disabled",
      "data-disabled:data-[state=indeterminate]:bg-checkbox-fg-disabled",
      "data-readonly:not-data-disabled:text-checkbox-fg-readonly",
      "data-readonly:not-data-disabled:data-[state=indeterminate]:bg-checkbox-fg-readonly",
    ],
    label: [
      "wrap-anywhere min-w-0 flex-1 cursor-pointer select-none data-readonly:not-data-disabled:cursor-default data-readonly:select-text",
      "text-label-fg",
      "data-disabled:cursor-not-allowed",
      "data-disabled:text-label-fg-disabled",
    ],
    hiddenInput: "sr-only",
    textIndented: "",
  },
  variants: {
    size: {
      sm: {
        label: "text-label-sm",
        control: "size-form-checkbox-control-sm",
        textIndented: "data-[icon=false]:ps-form-checkbox-description-sm",
      },
      md: {
        label: "text-label-md",
        control: "size-form-checkbox-control-md",
        textIndented: "data-[icon=false]:ps-form-checkbox-description-md",
      },
      lg: {
        label: "text-label-lg",
        control: "size-form-checkbox-control-lg",
        textIndented: "data-[icon=false]:ps-form-checkbox-description-lg",
      },
    },
  },
  defaultVariants: {
    size: "md",
  },
})

export type FormCheckboxProps = {
  id?: string
  name?: string
  value?: string
  checked?: boolean
  defaultChecked?: boolean
  indeterminate?: boolean
  disabled?: boolean
  required?: boolean
  readOnly?: boolean
  children?: ReactNode
  label?: ReactNode
  helpText?: ReactNode
  "aria-describedby"?: string
  validateStatus?: "default" | "error" | "success" | "warning"
  showHelpTextIcon?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
  onCheckedChange?: (checked: boolean) => void
}

export function FormCheckbox({
  id,
  name,
  value,
  checked,
  defaultChecked,
  indeterminate,
  disabled = false,
  required = false,
  readOnly = false,
  children,
  label,
  helpText,
  "aria-describedby": ariaDescribedBy,
  validateStatus = "default",
  showHelpTextIcon = validateStatus !== "default",
  size = "md",
  className,
  onCheckedChange,
}: FormCheckboxProps) {
  const generatedId = useId()
  const uniqueId = id || generatedId
  const helpTextId = useId()
  const describedBy = joinDescribedBy(
    ariaDescribedBy,
    helpText ? helpTextId : undefined
  )
  const invalid = validateStatus === "error"
  const showIcon = validateStatus !== "default" || showHelpTextIcon

  const service = useMachine(checkboxChoiceMachine, {
    id: uniqueId,
    ids: id ? { hiddenInput: id } : undefined,
    name,
    value,
    checked: indeterminate ? "indeterminate" : checked,
    defaultChecked,
    disabled,
    invalid: validateStatus === "error",
    readOnly,
    required,
    onCheckedChange: (details) => {
      if (!(readOnly || disabled)) {
        onCheckedChange?.(details.checked === true)
      }
    },
  })

  const api = connect(service, normalizeProps)
  const inputProps = getControlledChoiceInputProps(
    api.getHiddenInputProps(),
    api.checked,
    api.indeterminate
  )

  const styles = checkboxVariants({ size })

  const labelContent = label ?? children

  return (
    <div className={className}>
      <label className={styles.root()} {...api.getRootProps()}>
        <div className={styles.control()} {...api.getControlProps()}>
          <span className={styles.indicator()} {...api.getIndicatorProps()} />
        </div>
        <input
          className={styles.hiddenInput()}
          {...inputProps}
          aria-checked={api.indeterminate ? "mixed" : api.checked}
          aria-describedby={describedBy}
          aria-errormessage={invalid && helpText ? helpTextId : undefined}
          aria-invalid={invalid || undefined}
          aria-readonly={(readOnly && !disabled) || undefined}
          readOnly={readOnly}
          ref={(node) => {
            if (node) {
              node.indeterminate = api.indeterminate
            }
          }}
          type="checkbox"
        />
        {labelContent && (
          <span className={styles.label()} {...api.getLabelProps()}>
            {labelContent}
            {required && <span className="text-label-fg-required"> *</span>}
          </span>
        )}
      </label>
      {helpText && (
        <div className={styles.textIndented()} data-icon={showIcon}>
          <StatusText
            id={helpTextId}
            showIcon={showIcon}
            size={size}
            status={validateStatus}
          >
            {helpText}
          </StatusText>
        </div>
      )}
    </div>
  )
}

FormCheckbox.displayName = "FormCheckbox"
