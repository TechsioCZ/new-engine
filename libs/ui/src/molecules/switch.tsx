import { normalizeProps, useMachine } from "@zag-js/react"
import * as zagSwitch from "@zag-js/switch"
import { type ReactNode, useId } from "react"
import type { VariantProps } from "tailwind-variants"
import { Label } from "../atoms/label"
import { StatusText } from "../atoms/status-text"
import { tv } from "../utils"

const switchVariants = tv({
  slots: {
    root: [
      "cursor-pointer",
      "data-[disabled]:cursor-not-allowed",
      "flex items-center",
    ],
    control: [
      "me-switch-root p-switch-control",
      "relative inline-flex shrink-0 items-center justify-start",
      "bg-switch-bg hover:bg-switch-bg-hover",
      "h-switch-track-height w-switch-track-width",
      "rounded-switch",
      "transition-colors duration-200 motion-reduce:transition-none",
      "border-(length:--border-width-switch) border-switch-border",
      "data-[state=checked]:bg-switch-bg-checked",
      "data-[state=checked]:hover:bg-switch-bg-checked-hover",
      "data-[disabled]:bg-switch-bg-disabled",
      "data-[disabled]:border-switch-border-disabled",
      "data-[disabled]:data-[state=checked]:bg-switch-bg-disabled",
      "data-[focus]:outline-(style:--default-ring-style) data-[focus]:outline-(length:--default-ring-width)",
      "data-[focus]:outline-switch-ring",
      "data-[focus]:outline-offset-(length:--default-ring-offset)",
      "data-[invalid]:bg-switch-bg-invalid data-[invalid]:outline-switch-invalid",
      "data-[invalid]:outline-(style:--default-ring-style) data-[invalid]:outline-(length:--default-ring-width)",
      "data-[invalid]:outline-offset-(length:--default-ring-offset)",
    ],
    thumb: [
      "block aspect-square h-switch-thumb-height rounded-full bg-switch-thumb-bg",
      "transform transition-transform duration-200 motion-reduce:transition-none",
      "data-[disabled]:bg-switch-thumb-bg-disabled",
      "data-[state=checked]:translate-x-switch-translate-track",
    ],
    label: [
      "select-none",
      "text-switch-label-fg",
      "data-[disabled]:text-switch-label-fg-disabled",
    ],
    hiddenInput: "sr-only",
  },
})

export interface SwitchProps extends VariantProps<typeof switchVariants> {
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
  validateStatus,
  helpText,
  showHelpTextIcon = true,
}: SwitchProps) {
  const generatedId = useId()
  const uniqueId = id || generatedId

  const service = useMachine(zagSwitch.machine, {
    id: uniqueId,
    name,
    value,
    checked,
    defaultChecked,
    dir,
    disabled,
    invalid: validateStatus === "error",
    readOnly,
    required,
    onCheckedChange: ({ checked }) => onCheckedChange?.(checked),
  })

  const api = zagSwitch.connect(service, normalizeProps)

  const { root, control, thumb, label, hiddenInput } = switchVariants({
    className,
  })

  return (
    <div className={className}>
      <Label className={root()} required={required} {...api.getRootProps()}>
        <input className={hiddenInput()} {...api.getHiddenInputProps()} />
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
          status={validateStatus}
          showIcon={showHelpTextIcon}
          size="sm"
        >
          {helpText}
        </StatusText>
      )}
    </div>
  )
}
