import * as zagRadioGroup from "@zag-js/radio-group"
import { normalizeProps, useMachine } from "@zag-js/react"
import {
  type ComponentPropsWithoutRef,
  createContext,
  type ReactNode,
  type Ref,
  useContext,
  useId,
} from "react"
import type { VariantProps } from "tailwind-variants"
import { Label } from "../atoms/label"
import { StatusText } from "../atoms/status-text"
import { tv } from "../utils"

const radioGroupVariants = tv({
  slots: {
    root: ["flex w-full flex-col"],
    itemGroup: [
      "relative flex",
      "data-[orientation=horizontal]:flex-row",
      "data-[orientation=horizontal]:flex-wrap",
      "data-[orientation=vertical]:flex-col",
    ],
    item: [
      "group inline-flex items-start",
      "cursor-pointer select-none",
      "data-disabled:cursor-not-allowed",
      "data-readonly:cursor-default",
    ],
    itemControl: [
      "relative shrink-0 rounded-radio-group-control",
      "border-(length:--border-width-radio-group)",
      "border-radio-group-item-control-border",
      "bg-radio-group-item-control-bg",
      "transition-colors duration-200 motion-reduce:transition-none",
      "after:absolute after:top-1/2 after:left-1/2",
      "after:-translate-x-1/2 after:-translate-y-1/2",
      "after:size-radio-group-indicator after:rounded-full",
      "after:bg-radio-group-item-indicator after:content-['']",
      "after:opacity-0 after:transition-opacity after:duration-200",
      "data-hover:bg-radio-group-item-control-bg-hover",
      "data-hover:border-radio-group-item-control-border-hover",
      "data-[state=checked]:border-radio-group-item-control-border-checked",
      "data-[state=checked]:after:opacity-100",
      "data-disabled:bg-radio-group-item-control-bg-disabled",
      "data-disabled:border-radio-group-item-control-border-disabled",
      "data-disabled:after:bg-radio-group-item-indicator-disabled",
      "data-focus-visible:outline-(style:--default-ring-style)",
      "data-focus-visible:outline-(length:--default-ring-width)",
      "data-focus-visible:outline-radio-group-ring",
      "data-focus-visible:outline-offset-(length:--default-ring-offset)",
      "data-invalid:border-(length:--border-width-validation)",
      "data-invalid:border-radio-group-item-control-border-error",
      "data-invalid:outline-(style:--default-ring-style)",
      "data-invalid:outline-(length:--default-ring-width)",
      "data-invalid:outline-radio-group-ring-error",
      "data-invalid:outline-offset-(length:--default-ring-offset)",
    ],
    itemText: [
      "text-radio-group-item-fg leading-normal",
      "data-disabled:text-radio-group-item-fg-disabled",
    ],
    hiddenInput: "sr-only",
  },
  variants: {
    size: {
      sm: {
        root: "gap-radio-group-root-sm",
        itemGroup:
          "data-[orientation=horizontal]:gap-radio-group-items-horizontal-sm data-[orientation=vertical]:gap-radio-group-items-vertical-sm",
        item: "gap-radio-group-item-sm",
        itemControl: "size-radio-group-control-sm",
        itemText: "text-radio-group-item-sm",
      },
      md: {
        root: "gap-radio-group-root-md",
        itemGroup:
          "data-[orientation=horizontal]:gap-radio-group-items-horizontal-md data-[orientation=vertical]:gap-radio-group-items-vertical-md",
        item: "gap-radio-group-item-md",
        itemControl: "size-radio-group-control-md",
        itemText: "text-radio-group-item-md",
      },
      lg: {
        root: "gap-radio-group-root-lg",
        itemGroup:
          "data-[orientation=horizontal]:gap-radio-group-items-horizontal-lg data-[orientation=vertical]:gap-radio-group-items-vertical-lg",
        item: "gap-radio-group-item-lg",
        itemControl: "size-radio-group-control-lg",
        itemText: "text-radio-group-item-lg",
      },
    },
  },
  defaultVariants: {
    size: "md",
  },
})

type RadioGroupSize = NonNullable<
  VariantProps<typeof radioGroupVariants>["size"]
>

type RadioGroupValidateStatus = "default" | "error" | "success" | "warning"

type RadioGroupContextValue = {
  api: ReturnType<typeof zagRadioGroup.connect>
  size: RadioGroupSize
  orientation: "horizontal" | "vertical"
  disabled: boolean
  required: boolean
  validateStatus: RadioGroupValidateStatus
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null)

function useRadioGroupContext() {
  const context = useContext(RadioGroupContext)
  if (!context) {
    throw new Error("RadioGroup components must be used within RadioGroup")
  }
  return context
}

type RadioGroupItemContextValue = {
  itemProps: zagRadioGroup.ItemProps
}

const RadioGroupItemContext =
  createContext<RadioGroupItemContextValue | null>(null)

function useRadioGroupItemContext() {
  const context = useContext(RadioGroupItemContext)
  if (!context) {
    throw new Error("RadioGroup item components must be used within RadioGroup.Item")
  }
  return context
}

export type RadioGroupProps = VariantProps<typeof radioGroupVariants> &
  Omit<zagRadioGroup.Props, "id" | "invalid" | "onValueChange"> & {
    id?: string
    children: ReactNode
    className?: string
    ref?: Ref<HTMLDivElement>
    validateStatus?: RadioGroupValidateStatus
    onValueChange?: (value: string | null) => void
  }

export function RadioGroup({
  id: providedId,
  value,
  defaultValue,
  name,
  form,
  disabled = false,
  required = false,
  readOnly = false,
  orientation = "vertical",
  dir,
  validateStatus = "default",
  onValueChange,
  size = "md",
  children,
  className,
  ref,
}: RadioGroupProps) {
  const generatedId = useId()
  const id = providedId || generatedId
  const invalid = validateStatus === "error"

  const service = useMachine(
    zagRadioGroup.machine as any,
    {
    id,
    value,
    defaultValue,
    name,
    form,
    disabled,
    required,
    readOnly,
    orientation,
    dir,
    invalid,
    onValueChange: ({ value: nextValue }: zagRadioGroup.ValueChangeDetails) => {
      onValueChange?.(nextValue)
    },
    },
  )

  const api = zagRadioGroup.connect(
    service as unknown as zagRadioGroup.Service,
    normalizeProps,
  )
  const styles = radioGroupVariants({ size })

  return (
    <RadioGroupContext.Provider
      value={{ api, size, orientation, disabled, required, validateStatus }}
    >
      <div className={styles.root({ className })} ref={ref} {...api.getRootProps()}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  )
}

type RadioGroupLabelProps = Omit<
  ComponentPropsWithoutRef<typeof Label>,
  "disabled" | "required"
> & {
  disabled?: boolean
  required?: boolean
  ref?: Ref<HTMLLabelElement>
}

RadioGroup.Label = function RadioGroupLabel({
  children,
  disabled,
  required,
  size: sizeProp,
  ...props
}: RadioGroupLabelProps) {
  const { api, size, disabled: groupDisabled, required: groupRequired } =
    useRadioGroupContext()

  return (
    <Label
      disabled={disabled ?? groupDisabled}
      required={required ?? groupRequired}
      size={sizeProp ?? size}
      {...api.getLabelProps()}
      {...props}
    >
      {children}
    </Label>
  )
}

type RadioGroupItemGroupProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

RadioGroup.ItemGroup = function RadioGroupItemGroup({
  children,
  className,
  ref,
  ...props
}: RadioGroupItemGroupProps) {
  const { size, orientation } = useRadioGroupContext()
  const styles = radioGroupVariants({ size })

  return (
    <div
      className={styles.itemGroup({ className })}
      data-orientation={orientation}
      ref={ref}
      {...props}
    >
      {children}
    </div>
  )
}

export type RadioGroupItemProps = Omit<ComponentPropsWithoutRef<"label">, "value"> &
  zagRadioGroup.ItemProps & {
    ref?: Ref<HTMLLabelElement>
  }

RadioGroup.Item = function RadioGroupItem({
  value,
  disabled,
  invalid,
  children,
  className,
  ref,
  ...props
}: RadioGroupItemProps) {
  const { api, size } = useRadioGroupContext()
  const styles = radioGroupVariants({ size })
  const itemProps = { value, disabled, invalid }

  return (
    <RadioGroupItemContext.Provider value={{ itemProps }}>
      <label
        className={styles.item({ className })}
        ref={ref}
        {...api.getItemProps(itemProps)}
        {...props}
      >
        {children}
      </label>
    </RadioGroupItemContext.Provider>
  )
}

type RadioGroupItemHiddenInputProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "type" | "value"
> & {
  ref?: Ref<HTMLInputElement>
}

RadioGroup.ItemHiddenInput = function RadioGroupItemHiddenInput({
  className,
  ref,
  ...props
}: RadioGroupItemHiddenInputProps) {
  const { api, size } = useRadioGroupContext()
  const { itemProps } = useRadioGroupItemContext()
  const styles = radioGroupVariants({ size })

  return (
    <input
      className={styles.hiddenInput({ className })}
      ref={ref}
      {...api.getItemHiddenInputProps(itemProps)}
      {...props}
    />
  )
}

type RadioGroupItemControlProps = ComponentPropsWithoutRef<"span"> & {
  ref?: Ref<HTMLSpanElement>
}

RadioGroup.ItemControl = function RadioGroupItemControl({
  className,
  ref,
  ...props
}: RadioGroupItemControlProps) {
  const { api, size } = useRadioGroupContext()
  const { itemProps } = useRadioGroupItemContext()
  const styles = radioGroupVariants({ size })

  return (
    <span
      className={styles.itemControl({ className })}
      ref={ref}
      {...api.getItemControlProps(itemProps)}
      {...props}
    />
  )
}

type RadioGroupItemTextProps = ComponentPropsWithoutRef<"span"> & {
  ref?: Ref<HTMLSpanElement>
}

RadioGroup.ItemText = function RadioGroupItemText({
  children,
  className,
  ref,
  ...props
}: RadioGroupItemTextProps) {
  const { api, size } = useRadioGroupContext()
  const { itemProps } = useRadioGroupItemContext()
  const styles = radioGroupVariants({ size })

  return (
    <span
      className={styles.itemText({ className })}
      ref={ref}
      {...api.getItemTextProps(itemProps)}
      {...props}
    >
      {children}
    </span>
  )
}

type RadioGroupStatusTextProps = Omit<
  ComponentPropsWithoutRef<typeof StatusText>,
  "status" | "size"
> & {
  status?: RadioGroupValidateStatus
  size?: RadioGroupSize
  ref?: Ref<HTMLDivElement>
}

RadioGroup.StatusText = function RadioGroupStatusText({
  status,
  size: sizeProp,
  showIcon,
  children,
  ...props
}: RadioGroupStatusTextProps) {
  const { size, validateStatus } = useRadioGroupContext()
  const effectiveSize = sizeProp ?? size
  const effectiveStatus = status ?? validateStatus

  return (
    <StatusText
      showIcon={showIcon ?? effectiveStatus !== "default"}
      size={effectiveSize}
      status={effectiveStatus}
      {...props}
    >
      {children}
    </StatusText>
  )
}

export { radioGroupVariants, useRadioGroupContext }

RadioGroup.displayName = "RadioGroup"
