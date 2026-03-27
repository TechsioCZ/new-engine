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
      "grid grid-cols-(--radio-group-item-grid) items-start",
      "cursor-pointer select-none",
      "data-disabled:cursor-not-allowed",
      "data-readonly:cursor-default",
    ],
    itemControl: [
      "row-start-1 self-center",
      "inline-grid shrink-0 place-items-center rounded-radio-group-control",
      "border-(length:--border-width-radio-group)",
      "border-radio-group-item-control-border",
      "bg-radio-group-item-control-bg",
      "transition-colors duration-200 motion-reduce:transition-none",
      "data-hover:bg-radio-group-item-control-bg-hover",
      "data-hover:border-radio-group-item-control-border-hover",
      "data-disabled:bg-radio-group-item-control-bg-disabled",
      "data-disabled:border-radio-group-item-control-border-disabled",
      "data-focus-visible:outline-(style:--default-ring-style)",
      "data-focus-visible:outline-(length:--default-ring-width)",
      "data-focus-visible:outline-radio-group-ring",
      "data-focus-visible:outline-offset-(length:--default-ring-offset)",
      "data-invalid:border-radio-group-item-control-border-error",
      "data-invalid:outline-offset-(length:--default-ring-offset)",
    ],
    itemContent: ["col-start-2 row-start-1 min-w-0 flex flex-col"],
    itemIndicator: [
      "pointer-events-none block leading-none",
      "token-icon-radio-group-checked",
      "opacity-0 transition-opacity duration-200 motion-reduce:transition-none",
      "data-[state=checked]:opacity-100",
      "data-disabled:data-[state=checked]:text-radio-group-item-indicator-disabled",
    ],
    itemText: [
      "min-w-0 text-radio-group-item-fg leading-normal",
      "data-disabled:text-radio-group-item-fg-disabled",
    ],
    itemDescription: [
      "col-start-2 row-start-2 min-w-0 text-radio-group-item-description leading-normal",
      "data-disabled:text-radio-group-item-description-disabled",
    ],
    hiddenInput: "sr-only",
  },
  variants: {
    variant: {
      outline: {
        itemControl: [
          "data-[state=checked]:bg-radio-group-item-control-bg-outline-checked",
          "data-[state=checked]:border-radio-group-item-control-border-outline-checked",
          "data-hover:data-[state=checked]:bg-radio-group-item-control-bg-outline-checked-hover",
          "data-hover:data-[state=checked]:border-radio-group-item-control-border-outline-checked-hover",
        ],
        itemIndicator: "text-radio-group-item-indicator-outline",
      },
      subtle: {
        itemControl: [
          "data-[state=checked]:bg-radio-group-item-control-bg-subtle-checked",
          "data-[state=checked]:border-radio-group-item-control-border-subtle-checked",
          "data-hover:data-[state=checked]:bg-radio-group-item-control-bg-subtle-checked-hover",
          "data-hover:data-[state=checked]:border-radio-group-item-control-border-subtle-checked-hover",
        ],
        itemIndicator: "text-radio-group-item-indicator-subtle",
      },
      solid: {
        itemControl: [
          "data-[state=checked]:bg-radio-group-item-control-bg-solid-checked",
          "data-[state=checked]:border-radio-group-item-control-border-solid-checked",
          "data-hover:data-[state=checked]:bg-radio-group-item-control-bg-solid-checked-hover",
          "data-hover:data-[state=checked]:border-radio-group-item-control-border-solid-checked-hover",
        ],
        itemIndicator: "text-radio-group-item-indicator-solid",
      },
    },
    size: {
      sm: {
        root: "gap-radio-group-root-sm",
        itemGroup:
          "data-[orientation=horizontal]:gap-radio-group-items-horizontal-sm data-[orientation=vertical]:gap-radio-group-items-vertical-sm",
        item: "gap-x-radio-group-item-sm",
        itemControl: "size-radio-group-control-sm",
        itemContent: "gap-radio-group-item-content-sm",
        itemIndicator: "size-radio-group-indicator-sm",
        itemText: "text-radio-group-item-sm",
        itemDescription: "text-radio-group-item-description-sm",
      },
      md: {
        root: "gap-radio-group-root-md",
        itemGroup:
          "data-[orientation=horizontal]:gap-radio-group-items-horizontal-md data-[orientation=vertical]:gap-radio-group-items-vertical-md",
        item: "gap-x-radio-group-item-md",
        itemControl: "size-radio-group-control-md",
        itemContent: "gap-radio-group-item-content-md",
        itemIndicator: "size-radio-group-indicator-md",
        itemText: "text-radio-group-item-md",
        itemDescription: "text-radio-group-item-description-md",
      },
      lg: {
        root: "gap-radio-group-root-lg",
        itemGroup:
          "data-[orientation=horizontal]:gap-radio-group-items-horizontal-lg data-[orientation=vertical]:gap-radio-group-items-vertical-lg",
        item: "gap-x-radio-group-item-lg",
        itemControl: "size-radio-group-control-lg",
        itemContent: "gap-radio-group-item-content-lg",
        itemIndicator: "size-radio-group-indicator-lg",
        itemText: "text-radio-group-item-lg",
        itemDescription: "text-radio-group-item-description-lg",
      },
    },
  },
  defaultVariants: {
    variant: "outline",
    size: "md",
  },
})

type RadioGroupVariant = NonNullable<
  VariantProps<typeof radioGroupVariants>["variant"]
>

type RadioGroupSize = NonNullable<
  VariantProps<typeof radioGroupVariants>["size"]
>

type RadioGroupValidateStatus = "default" | "error" | "success" | "warning"

type RadioGroupContextValue = {
  api: ReturnType<typeof zagRadioGroup.connect>
  variant: RadioGroupVariant
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

type RadioGroupMachineProps = Omit<
  zagRadioGroup.Props,
  "id" | "invalid" | "onValueChange"
>

export type RadioGroupProps = VariantProps<typeof radioGroupVariants> &
  RadioGroupMachineProps & {
    id?: string
    children: ReactNode
    className?: string
    ref?: Ref<HTMLDivElement>
    validateStatus?: RadioGroupValidateStatus
    onValueChange?: (value: string | null) => void
  }

export function RadioGroup({
  id: providedId,
  disabled = false,
  required = false,
  orientation = "vertical",
  validateStatus = "default",
  onValueChange,
  variant = "outline",
  size = "md",
  children,
  className,
  ref,
  ...machineProps
}: RadioGroupProps) {
  const generatedId = useId()
  const id = providedId || generatedId
  const invalid = validateStatus === "error"

  const service = useMachine(zagRadioGroup.machine, {
    ...machineProps,
    id,
    disabled,
    required,
    orientation,
    invalid,
    onValueChange: ({ value: nextValue }: zagRadioGroup.ValueChangeDetails) => {
      onValueChange?.(nextValue)
    },
  })

  const api = zagRadioGroup.connect(
    service,
    normalizeProps,
  )
  const styles = radioGroupVariants({ size, variant })

  return (
    <RadioGroupContext.Provider
      value={{ api, variant, size, orientation, disabled, required, validateStatus }}
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
  const { size, variant, orientation } = useRadioGroupContext()
  const styles = radioGroupVariants({ size, variant })

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
  const { api, size, variant } = useRadioGroupContext()
  const styles = radioGroupVariants({ size, variant })
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
  const { api, size, variant } = useRadioGroupContext()
  const { itemProps } = useRadioGroupItemContext()
  const styles = radioGroupVariants({ size, variant })

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
  children,
  className,
  ref,
  ...props
}: RadioGroupItemControlProps) {
  const { api, size, variant } = useRadioGroupContext()
  const { itemProps } = useRadioGroupItemContext()
  const styles = radioGroupVariants({ size, variant })
  const itemState = api.getItemState(itemProps)

  return (
    <span
      className={styles.itemControl({ className })}
      ref={ref}
      {...api.getItemControlProps(itemProps)}
      {...props}
    >
      <span
        aria-hidden="true"
        className={styles.itemIndicator()}
        data-disabled={itemState.disabled || undefined}
        data-state={itemState.checked ? "checked" : "unchecked"}
      />
      {children}
    </span>
  )
}

type RadioGroupItemContentProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

RadioGroup.ItemContent = function RadioGroupItemContent({
  children,
  className,
  ref,
  ...props
}: RadioGroupItemContentProps) {
  const { size, variant } = useRadioGroupContext()
  const styles = radioGroupVariants({ size, variant })

  return (
    <div className={styles.itemContent({ className })} ref={ref} {...props}>
      {children}
    </div>
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
  const { api, size, variant } = useRadioGroupContext()
  const { itemProps } = useRadioGroupItemContext()
  const styles = radioGroupVariants({ size, variant })

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

type RadioGroupItemDescriptionProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

RadioGroup.ItemDescription = function RadioGroupItemDescription({
  children,
  className,
  ref,
  ...props
}: RadioGroupItemDescriptionProps) {
  const { api, size, variant } = useRadioGroupContext()
  const { itemProps } = useRadioGroupItemContext()
  const styles = radioGroupVariants({ size, variant })
  const itemState = api.getItemState(itemProps)

  return (
    <div
      className={styles.itemDescription({ className })}
      data-disabled={itemState.disabled || undefined}
      ref={ref}
      {...props}
    >
      {children}
    </div>
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
