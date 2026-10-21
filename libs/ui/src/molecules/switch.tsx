/**
 * Switch — @techsio/ui-kit molecule.
 *
 * @component Switch
 * @componentVersion v1.1.0
 * @skill switch-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the switch-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { normalizeProps, useMachine } from "@zag-js/react"
import { connect, machine } from "@zag-js/switch"
import { type ReactNode, useId } from "react"
import type { VariantProps } from "tailwind-variants"
import { Label } from "../atoms/label"
import { StatusText } from "../atoms/status-text"
import { joinDescribedBy } from "../internal/described-by"
import { tv } from "../utils"

const switchVariants = tv({
  slots: {
    root: [
      "cursor-pointer data-readonly:not-data-disabled:cursor-default",
      "data-[disabled]:cursor-not-allowed",
      "flex items-center",
    ],
    control: [
      "form-control-readonly form-control-disabled me-switch p-switch-control",
      "relative inline-flex shrink-0 items-center justify-start",
      "bg-switch-bg-base hover:bg-switch-bg-hover",
      "h-switch-track-height w-switch-track-width",
      "rounded-switch",
      "transition-colors duration-200 motion-reduce:transition-none",
      "border-(length:--border-width-switch) border-switch-border",
      "data-[state=checked]:bg-switch-bg-checked",
      "data-[state=checked]:hover:bg-switch-bg-checked-hover",
      "data-[disabled]:bg-switch-bg-disabled",
      "data-[disabled]:border-switch-border-disabled",
      "data-[disabled]:data-[state=checked]:bg-switch-bg-disabled",
      "data-[focus-visible]:outline-(style:--default-ring-style) data-[focus-visible]:outline-(length:--default-ring-width)",
      "data-[focus-visible]:outline-switch-ring",
      "data-[focus-visible]:outline-offset-(length:--default-ring-offset)",
      "data-[invalid]:bg-switch-bg-invalid data-[invalid]:outline-switch-ring-invalid",
      "data-[invalid]:outline-(style:--default-ring-style) data-[invalid]:outline-(length:--default-ring-width)",
      "data-[invalid]:outline-offset-(length:--default-ring-offset)",
    ],
    thumb: [
      "block aspect-square h-switch-thumb-height rounded-full bg-switch-thumb-bg",
      "transform transition-transform duration-200 motion-reduce:transition-none",
      "data-[disabled]:bg-switch-thumb-bg-unavailable",
      "data-[state=checked]:translate-x-switch-translate-track",
      "rtl:data-[state=checked]:-translate-x-switch-translate-track",
      "data-readonly:not-data-disabled:bg-switch-thumb-bg-readonly",
    ],
    label: [
      "select-none data-readonly:select-text",
      "text-switch-label-fg",
      "data-[disabled]:text-switch-label-fg-disabled",
    ],
    hiddenInput: "sr-only",
  },
  variants: {
    size: {
      sm: { control: "switch-size-sm", label: "text-label-sm" },
      md: { control: "switch-size-md", label: "text-label-md" },
      lg: { control: "switch-size-lg", label: "text-label-lg" },
    },
  },
  defaultVariants: { size: "md" },
})

export type SwitchProps = VariantProps<typeof switchVariants> & {
  "aria-describedby"?: string
  id?: string
  name?: string
  value?: string | number
  checked?: boolean
  defaultChecked?: boolean
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  children?: ReactNode
  onCheckedChange?: (checked: boolean) => void
  className?: string
  dir?: "ltr" | "rtl"
  validateStatus?: "default" | "error" | "success" | "warning"
  helpText?: ReactNode
  showHelpTextIcon?: boolean
}

export function Switch({
  id,
  "aria-describedby": ariaDescribedBy,
  size = "md",
  name,
  value,
  checked,
  defaultChecked,
  disabled = false,
  readOnly = false,
  required = false,
  dir = "ltr",
  children,
  className,
  onCheckedChange,
  validateStatus = "default",
  helpText,
  showHelpTextIcon = true,
}: SwitchProps) {
  const generatedId = useId()
  const uniqueId = id || generatedId
  const helpTextId = useId()
  const invalid = validateStatus === "error"

  const service = useMachine(machine, {
    id: uniqueId,
    ids: id ? { hiddenInput: id } : undefined,
    name,
    value,
    checked,
    defaultChecked,
    dir,
    disabled,
    invalid: validateStatus === "error",
    readOnly,
    required,
    onCheckedChange: ({ checked: nextChecked }) => {
      if (!(readOnly || disabled)) {
        onCheckedChange?.(nextChecked)
      }
    },
  })

  const api = connect(service, normalizeProps)

  const { root, control, thumb, label, hiddenInput } = switchVariants({
    size,
  })

  return (
    <div className={className}>
      <Label
        className={root()}
        required={required}
        size={size}
        {...api.getRootProps()}
      >
        <input
          className={hiddenInput()}
          {...api.getHiddenInputProps()}
          aria-checked={api.checked}
          aria-describedby={joinDescribedBy(
            ariaDescribedBy,
            helpText ? helpTextId : undefined
          )}
          aria-errormessage={invalid && helpText ? helpTextId : undefined}
          aria-invalid={invalid || undefined}
          aria-readonly={(readOnly && !disabled) || undefined}
          readOnly={readOnly}
          role="switch"
        />
        <span className={control()} {...api.getControlProps()}>
          <span className={thumb()} {...api.getThumbProps()} />
        </span>
        {children && (
          <span className={label()} {...api.getLabelProps()}>
            {children}
          </span>
        )}
      </Label>
      {helpText && (
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
