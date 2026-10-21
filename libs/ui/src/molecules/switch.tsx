/**
 * Switch — @techsio/ui-kit molecule.
 *
 * @component Switch
 * @componentVersion v1.2.1
 * @skill switch-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the switch-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { normalizeProps, useMachine } from "@zag-js/react"
import { connect, machine } from "@zag-js/switch"
import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  type Ref,
  useId,
} from "react"
import type { VariantProps } from "tailwind-variants"
import { Label } from "../atoms/label"
import { StatusText } from "../atoms/status-text"
import {
  getControlledChoiceInputProps,
  isSilentChoiceReset,
  mergeChoiceInputProps,
  runSilentChoiceReset,
  trackChoiceFormControl,
  useChoiceInputRef,
} from "../internal/choice-control"
import { joinDescribedBy } from "../internal/described-by"
import { tv } from "../utils"

const switchChoiceMachine: typeof machine = {
  ...machine,
  implementations: {
    ...machine.implementations,
    effects: {
      ...machine.implementations?.effects,
      trackFormControlState({ scope, context, prop, action }) {
        const root = scope.getById(scope.ids?.root ?? `switch:${scope.id}`)
        return trackChoiceFormControl(
          root,
          () => {
            if (prop("checked") === undefined) {
              runSilentChoiceReset(context, () =>
                context.set("checked", context.initial("checked"))
              )
            } else {
              // Native reset bypasses React; the parent remains authoritative.
              action(["syncInputElement"])
            }
          },
          (disabled) => context.set("fieldsetDisabled", disabled)
        )
      },
    },
  },
}

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
      "data-[state=unchecked]:bg-switch-thumb-bg-unchecked",
      "switch-thumb-boundary data-invalid:not-data-readonly:not-data-disabled:data-[state=unchecked]:bg-switch-thumb-bg-invalid",
      "transform transition-transform duration-200 motion-reduce:transition-none",
      "data-[disabled]:bg-switch-thumb-bg-unavailable",
      "data-[state=checked]:translate-x-switch-translate-track",
      "rtl:data-[state=checked]:-translate-x-switch-translate-track",
      "data-readonly:not-data-disabled:bg-switch-thumb-bg-readonly",
    ],
    label: [
      "wrap-anywhere min-w-0 flex-1 select-none data-readonly:select-text",
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
  /** Ref targets the native, focusable input rather than the visual control. */
  ref?: Ref<HTMLInputElement>
  inputProps?: Omit<
    ComponentPropsWithoutRef<"input">,
    | "type"
    | "checked"
    | "defaultChecked"
    | "disabled"
    | "readOnly"
    | "required"
    | "name"
    | "value"
    | "id"
  >
  "aria-label"?: string
  "aria-labelledby"?: string
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
  ref,
  inputProps: nativeInputProps = {},
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
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

  const service = useMachine(switchChoiceMachine, {
    id: uniqueId,
    ids: id ? { hiddenInput: id } : undefined,
    name,
    value,
    form: nativeInputProps.form,
    checked,
    defaultChecked,
    dir,
    disabled,
    invalid: validateStatus === "error",
    readOnly,
    required,
    onCheckedChange: ({ checked: nextChecked }) => {
      if (!(readOnly || disabled || isSilentChoiceReset(service.context))) {
        onCheckedChange?.(nextChecked)
      }
    },
  })

  const api = connect(service, normalizeProps)
  const inputProps = getControlledChoiceInputProps(
    mergeChoiceInputProps(nativeInputProps, api.getHiddenInputProps()),
    api.checked
  )

  const inputRef = useChoiceInputRef(ref)
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
          {...inputProps}
          aria-checked={api.checked}
          aria-describedby={joinDescribedBy(
            ariaDescribedBy,
            nativeInputProps["aria-describedby"],
            helpText ? helpTextId : undefined
          )}
          aria-errormessage={invalid && helpText ? helpTextId : undefined}
          aria-invalid={invalid || undefined}
          aria-label={nativeInputProps["aria-label"] ?? ariaLabel}
          aria-labelledby={
            nativeInputProps["aria-labelledby"] ??
            ariaLabelledBy ??
            ((nativeInputProps["aria-label"] ?? ariaLabel) || !children
              ? undefined
              : inputProps["aria-labelledby"])
          }
          aria-readonly={(readOnly && !disabled) || undefined}
          className={hiddenInput({ className: nativeInputProps.className })}
          readOnly={readOnly}
          ref={inputRef}
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
