/*
 * Switch — @techsio/ui-kit molecule.
 *
 * @component Switch
 * @componentVersion v1.0.1
 * @skill switch-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the switch-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { normalizeProps, useMachine } from "@zag-js/react"
import { connect, machine } from "@zag-js/switch"
import { useId } from "react"
import type { ReactNode } from "react"
import type { VariantProps } from "tailwind-variants"

import { Label } from "../atoms/label"
import { StatusText } from "../atoms/status-text"
import type { StatusTextProps } from "../atoms/status-text"
import { tv } from "../utils"

const switchVariants = tv({
  slots: {
    control: [
      "me-switch p-switch-control",
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
      "data-[focus]:outline-(style:--default-ring-style) data-[focus]:outline-(length:--default-ring-width)",
      "data-[focus]:outline-switch-ring",
      "data-[focus]:outline-offset-(length:--default-ring-offset)",
      "data-[invalid]:bg-switch-bg-invalid data-[invalid]:outline-switch-ring-invalid",
      "data-[invalid]:outline-(style:--default-ring-style) data-[invalid]:outline-(length:--default-ring-width)",
      "data-[invalid]:outline-offset-(length:--default-ring-offset)",
    ],
    hiddenInput: "sr-only",
    label: [
      "select-none",
      "text-switch-label-fg",
      "data-[disabled]:text-switch-label-fg-disabled",
    ],
    root: [
      "cursor-pointer",
      "data-[disabled]:cursor-not-allowed",
      "flex items-center",
    ],
    thumb: [
      "block aspect-square h-switch-thumb-height rounded-full bg-switch-thumb-bg",
      "transform transition-transform duration-200 motion-reduce:transition-none",
      "data-[disabled]:bg-switch-thumb-bg-disabled",
      "data-[state=checked]:translate-x-switch-translate-track",
    ],
  },
})

export interface SwitchProps extends VariantProps<typeof switchVariants> {
  id?: string | undefined
  name?: string | undefined
  value?: string | number | undefined
  checked?: boolean | undefined
  defaultChecked?: boolean | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  required?: boolean | undefined
  children?: ReactNode | undefined
  onCheckedChange?: ((checked: boolean) => void) | undefined
  className?: string | undefined
  dir?: "ltr" | "rtl" | undefined
  validateStatus?: StatusTextProps["status"]
  helpText?: ReactNode | undefined
  showHelpTextIcon?: boolean | undefined
}

export const Switch = ({
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
}: SwitchProps) => {
  const generatedId = useId()
  const uniqueId = id !== undefined && id !== "" ? id : generatedId

  const service = useMachine(machine, {
    ...(checked !== undefined && { checked }),
    ...(defaultChecked !== undefined && { defaultChecked }),
    dir,
    disabled,
    id: uniqueId,
    invalid: validateStatus === "error",
    ...(name !== undefined && { name }),
    onCheckedChange: ({ checked: nextChecked }) =>
      onCheckedChange?.(nextChecked),
    readOnly,
    required,
    ...(value !== undefined && { value }),
  })

  const api = connect(service, normalizeProps)
  const hasChildren = Boolean(children)
  const hasHelpText = Boolean(helpText)

  const { root, control, thumb, label, hiddenInput } = switchVariants({
    className,
  })

  return (
    <div className={className}>
      <Label {...api.getRootProps()} className={root()} required={required}>
        <input {...api.getHiddenInputProps()} className={hiddenInput()} />
        <span {...api.getControlProps()} className={control()}>
          <span {...api.getThumbProps()} className={thumb()} />
        </span>
        {hasChildren ? (
          <span {...api.getLabelProps()} className={label()}>
            {children}
          </span>
        ) : (
          children
        )}
      </Label>
      {hasHelpText ? (
        <StatusText
          showIcon={showHelpTextIcon}
          size="sm"
          status={validateStatus}
        >
          {helpText}
        </StatusText>
      ) : (
        helpText
      )}
    </div>
  )
}
