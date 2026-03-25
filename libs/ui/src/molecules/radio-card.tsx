import {
  connect,
  type ItemProps,
  machine,
  type ValueChangeDetails,
  type Props as ZagRadioGroupProps,
} from "@zag-js/radio-group"
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

const radioCardVariants = tv({
  slots: {
    root: ["flex w-full flex-col"],
    item: [
      "relative flex min-w-0 flex-col overflow-hidden",
      "rounded-radio-card-item",
      "border-(length:--border-width-radio-card)",
      "border-radio-card-item-border",
      "bg-radio-card-item-bg",
      "text-radio-card-item-fg",
      "shadow-radio-card-item",
      "transition-colors duration-200 motion-reduce:transition-none",
      "data-hover:bg-radio-card-item-bg-hover",
      "data-hover:border-radio-card-item-border-hover",
      "data-disabled:cursor-not-allowed",
      "data-disabled:bg-radio-card-item-bg-disabled",
      "data-disabled:border-radio-card-item-border-disabled",
      "data-disabled:text-radio-card-item-fg-disabled",
      "data-focus-visible:outline-(style:--default-ring-style)",
      "data-focus-visible:outline-(length:--default-ring-width)",
      "data-focus-visible:outline-radio-card-ring",
      "data-focus-visible:outline-offset-(length:--default-ring-offset)",
      "data-invalid:border-radio-card-item-border-error",
    ],
    itemControl: ["flex min-w-0 flex-1"],
    itemContent: ["flex min-w-0 flex-col"],
    itemText: [
      "min-w-0",
      "font-radio-card-item",
      "text-radio-card-item-fg",
      "leading-snug",
      "data-disabled:text-radio-card-item-fg-disabled",
    ],
    itemDescription: [
      "min-w-0",
      "text-radio-card-item-description",
      "leading-normal",
      "data-disabled:text-radio-card-item-description-disabled",
    ],
    itemIndicator: [
      "inline-grid shrink-0 place-items-center",
      "rounded-radio-card-indicator",
      "border-(length:--border-width-radio-card-indicator)",
      "border-radio-card-item-indicator-border",
      "bg-radio-card-item-indicator-bg",
      "transition-colors duration-200 motion-reduce:transition-none",
      "data-disabled:border-radio-card-item-indicator-border-disabled",
      "data-disabled:bg-radio-card-item-indicator-bg-disabled",
    ],
    itemIndicatorContent: [
      "inline-grid place-items-center",
      "text-radio-card-item-indicator-content",
      "opacity-0 transition-opacity duration-200 motion-reduce:transition-none",
      "data-[state=checked]:opacity-100",
      "data-disabled:data-[state=checked]:text-radio-card-item-indicator-content-disabled",
    ],
    itemIndicatorMark: [
      "block leading-none",
      "token-icon-radio-card-checked",
    ],
    itemAddon: [
      "border-t-(length:--border-width-radio-card-addon)",
      "border-radio-card-item-addon-border",
      "font-radio-card-item-addon",
      "text-radio-card-item-addon-fg",
      "transition-colors duration-200 motion-reduce:transition-none",
      "data-disabled:border-radio-card-item-addon-border-disabled",
      "data-disabled:bg-radio-card-item-addon-bg-disabled",
      "data-disabled:text-radio-card-item-addon-fg-disabled",
    ],
    hiddenInput: "sr-only",
  },
  variants: {
    variant: {
      outline: {
        item: [
          "data-[state=checked]:bg-radio-card-item-bg-outline-checked",
          "data-[state=checked]:border-radio-card-item-border-outline-checked",
          "data-hover:data-[state=checked]:bg-radio-card-item-bg-outline-checked-hover",
          "data-hover:data-[state=checked]:border-radio-card-item-border-outline-checked-hover",
        ],
        itemIndicator: [
          "data-[state=checked]:border-radio-card-item-indicator-border-outline-checked",
        ],
        itemIndicatorContent: [
          "data-[state=checked]:text-radio-card-item-indicator-content-outline-checked",
        ],
      },
      subtle: {
        item: [
          "data-[state=checked]:bg-radio-card-item-bg-subtle-checked",
          "data-[state=checked]:border-radio-card-item-border-subtle-checked",
          "data-hover:data-[state=checked]:bg-radio-card-item-bg-subtle-checked-hover",
          "data-hover:data-[state=checked]:border-radio-card-item-border-subtle-checked-hover",
        ],
        itemText: [
          "data-[state=checked]:text-radio-card-item-fg-subtle-checked",
        ],
        itemDescription: [
          "data-[state=checked]:text-radio-card-item-description-subtle-checked",
        ],
        itemIndicator: [
          "data-[state=checked]:border-radio-card-item-indicator-border-subtle-checked",
        ],
        itemIndicatorContent: [
          "data-[state=checked]:text-radio-card-item-indicator-content-subtle-checked",
        ],
        itemAddon: [
          "data-[state=checked]:border-radio-card-item-addon-border-subtle-checked",
          "data-[state=checked]:text-radio-card-item-addon-fg-subtle-checked",
        ],
      },
      solid: {
        item: [
          "data-[state=checked]:bg-radio-card-item-bg-solid-checked",
          "data-[state=checked]:border-radio-card-item-border-solid-checked",
          "data-hover:data-[state=checked]:bg-radio-card-item-bg-solid-checked-hover",
          "data-hover:data-[state=checked]:border-radio-card-item-border-solid-checked-hover",
        ],
        itemText: [
          "data-[state=checked]:text-radio-card-item-fg-solid-checked",
        ],
        itemDescription: [
          "data-[state=checked]:text-radio-card-item-description-solid-checked",
        ],
        itemIndicator: [
          "data-[state=checked]:border-radio-card-item-indicator-border-solid-checked",
          "data-[state=checked]:bg-radio-card-item-indicator-bg-solid-checked",
        ],
        itemIndicatorContent: [
          "data-[state=checked]:text-radio-card-item-indicator-content-solid-checked",
        ],
        itemAddon: [
          "data-[state=checked]:border-radio-card-item-addon-border-solid-checked",
          "data-[state=checked]:text-radio-card-item-addon-fg-solid-checked",
        ],
      },
    },
    size: {
      sm: {
        root: "gap-radio-card-root-sm",
        itemControl: [
          "gap-radio-card-item-control-sm",
          "p-radio-card-item-control-sm",
        ],
        itemContent: "gap-radio-card-item-content-sm",
        itemText: "text-radio-card-item-sm",
        itemDescription: "text-radio-card-item-description-sm",
        itemIndicator: "size-radio-card-indicator-sm",
        itemIndicatorMark: "size-radio-card-indicator-mark-sm",
        itemAddon: [
          "p-radio-card-item-addon-sm",
          "text-radio-card-item-addon-sm",
        ],
      },
      md: {
        root: "gap-radio-card-root-md",
        itemControl: [
          "gap-radio-card-item-control-md",
          "p-radio-card-item-control-md",
        ],
        itemContent: "gap-radio-card-item-content-md",
        itemText: "text-radio-card-item-md",
        itemDescription: "text-radio-card-item-description-md",
        itemIndicator: "size-radio-card-indicator-md",
        itemIndicatorMark: "size-radio-card-indicator-mark-md",
        itemAddon: [
          "p-radio-card-item-addon-md",
          "text-radio-card-item-addon-md",
        ],
      },
      lg: {
        root: "gap-radio-card-root-lg",
        itemControl: [
          "gap-radio-card-item-control-lg",
          "p-radio-card-item-control-lg",
        ],
        itemContent: "gap-radio-card-item-content-lg",
        itemText: "text-radio-card-item-lg",
        itemDescription: "text-radio-card-item-description-lg",
        itemIndicator: "size-radio-card-indicator-lg",
        itemIndicatorMark: "size-radio-card-indicator-mark-lg",
        itemAddon: [
          "p-radio-card-item-addon-lg",
          "text-radio-card-item-addon-lg",
        ],
      },
    },
    orientation: {
      horizontal: {
        itemControl: "flex-row",
        itemContent: "flex-1",
        itemText: "flex-1",
      },
      vertical: {
        itemControl: "flex-col",
      },
    },
    align: {
      start: {
        itemControl: "items-start",
        itemContent: "items-start",
        itemText: "text-left",
        itemDescription: "text-left",
        itemAddon: "text-left",
      },
      center: {
        itemControl: "items-center",
        itemContent: "items-center",
        itemText: "text-center",
        itemDescription: "text-center",
        itemAddon: "text-center",
      },
      end: {
        itemControl: "items-end",
        itemContent: "items-end",
        itemText: "text-right",
        itemDescription: "text-right",
        itemAddon: "text-right",
      },
    },
    justify: {
      start: {
        itemControl: "justify-start",
      },
      center: {
        itemControl: "justify-center",
      },
      end: {
        itemControl: "justify-end",
      },
      between: {
        itemControl: "justify-between",
      },
    },
  },
  defaultVariants: {
    variant: "outline",
    size: "md",
    orientation: "horizontal",
    align: "start",
    justify: "between",
  },
})

type RadioCardVariant = NonNullable<
  VariantProps<typeof radioCardVariants>["variant"]
>
type RadioCardSize = NonNullable<VariantProps<typeof radioCardVariants>["size"]>
type RadioCardOrientation = NonNullable<
  VariantProps<typeof radioCardVariants>["orientation"]
>
type RadioCardAlign = NonNullable<
  VariantProps<typeof radioCardVariants>["align"]
>
type RadioCardJustify = NonNullable<
  VariantProps<typeof radioCardVariants>["justify"]
>
type RadioCardValidateStatus = "default" | "error" | "success" | "warning"

type RadioCardContextValue = {
  api: ReturnType<typeof connect>
  variant: RadioCardVariant
  size: RadioCardSize
  orientation: RadioCardOrientation
  align: RadioCardAlign
  justify: RadioCardJustify
  disabled: boolean
  required: boolean
  validateStatus: RadioCardValidateStatus
}

const RadioCardContext = createContext<RadioCardContextValue | null>(null)

function useRadioCardContext() {
  const context = useContext(RadioCardContext)
  if (!context) {
    throw new Error("RadioCard components must be used within RadioCard")
  }
  return context
}

type RadioCardItemContextValue = {
  itemProps: ItemProps
}

const RadioCardItemContext = createContext<RadioCardItemContextValue | null>(
  null
)

function useRadioCardItemContext() {
  const context = useContext(RadioCardItemContext)
  if (!context) {
    throw new Error(
      "RadioCard item components must be used within RadioCard.Item"
    )
  }
  return context
}

type RadioCardMachineProps = Omit<
  ZagRadioGroupProps,
  "id" | "invalid" | "onValueChange"
>

export type RadioCardProps = VariantProps<typeof radioCardVariants> &
  RadioCardMachineProps & {
    id?: string
    children: ReactNode
    className?: string
    ref?: Ref<HTMLDivElement>
    validateStatus?: RadioCardValidateStatus
    onValueChange?: (value: string | null) => void
  }

export function RadioCard({
  id: providedId,
  disabled = false,
  required = false,
  orientation = "horizontal",
  align = "start",
  justify = "between",
  validateStatus = "default",
  onValueChange,
  variant = "outline",
  size = "md",
  children,
  className,
  ref,
  ...machineProps
}: RadioCardProps) {
  const generatedId = useId()
  const id = providedId || generatedId
  const invalid = validateStatus === "error"

  const service = useMachine(machine, {
    ...machineProps,
    id,
    disabled,
    required,
    orientation,
    invalid,
    onValueChange: ({ value: nextValue }: ValueChangeDetails) => {
      onValueChange?.(nextValue)
    },
  })

  const api = connect(service, normalizeProps)
  const styles = radioCardVariants({
    size,
    variant,
    orientation,
    align,
    justify,
  })

  return (
    <RadioCardContext.Provider
      value={{
        api,
        variant,
        size,
        orientation,
        align,
        justify,
        disabled,
        required,
        validateStatus,
      }}
    >
      <div
        className={styles.root({ className })}
        ref={ref}
        {...api.getRootProps()}
      >
        {children}
      </div>
    </RadioCardContext.Provider>
  )
}

type RadioCardLabelProps = Omit<
  ComponentPropsWithoutRef<typeof Label>,
  "disabled" | "required"
> & {
  disabled?: boolean
  required?: boolean
  ref?: Ref<HTMLLabelElement>
}

RadioCard.Label = function RadioCardLabel({
  children,
  disabled,
  required,
  size: sizeProp,
  ...props
}: RadioCardLabelProps) {
  const {
    api,
    size,
    disabled: groupDisabled,
    required: groupRequired,
  } = useRadioCardContext()

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

export type RadioCardItemProps = Omit<
  ComponentPropsWithoutRef<"label">,
  "value"
> &
  ItemProps & {
    ref?: Ref<HTMLLabelElement>
  }

RadioCard.Item = function RadioCardItem({
  value,
  disabled,
  invalid,
  children,
  className,
  ref,
  ...props
}: RadioCardItemProps) {
  const { api, size, variant } = useRadioCardContext()
  const styles = radioCardVariants({ size, variant })
  const itemProps = { value, disabled, invalid }

  return (
    <RadioCardItemContext.Provider value={{ itemProps }}>
      <label
        className={styles.item({ className })}
        ref={ref}
        {...api.getItemProps(itemProps)}
        {...props}
      >
        {children}
      </label>
    </RadioCardItemContext.Provider>
  )
}

type RadioCardItemHiddenInputProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "type" | "value"
> & {
  ref?: Ref<HTMLInputElement>
}

RadioCard.ItemHiddenInput = function RadioCardItemHiddenInput({
  className,
  ref,
  ...props
}: RadioCardItemHiddenInputProps) {
  const { api, size, variant } = useRadioCardContext()
  const { itemProps } = useRadioCardItemContext()
  const styles = radioCardVariants({ size, variant })

  return (
    <input
      className={styles.hiddenInput({ className })}
      ref={ref}
      {...api.getItemHiddenInputProps(itemProps)}
      {...props}
    />
  )
}

type RadioCardItemControlProps = ComponentPropsWithoutRef<"span"> & {
  ref?: Ref<HTMLSpanElement>
}

RadioCard.ItemControl = function RadioCardItemControl({
  children,
  className,
  ref,
  ...props
}: RadioCardItemControlProps) {
  const { api, size, variant, orientation, align, justify } =
    useRadioCardContext()
  const { itemProps } = useRadioCardItemContext()
  const styles = radioCardVariants({
    size,
    variant,
    orientation,
    align,
    justify,
  })

  return (
    <span
      className={styles.itemControl({ className })}
      ref={ref}
      {...api.getItemControlProps(itemProps)}
      {...props}
    >
      {children}
    </span>
  )
}

type RadioCardItemContentProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

RadioCard.ItemContent = function RadioCardItemContent({
  children,
  className,
  ref,
  ...props
}: RadioCardItemContentProps) {
  const { size, variant, orientation, align } = useRadioCardContext()
  const styles = radioCardVariants({
    size,
    variant,
    orientation,
    align,
  })

  return (
    <div className={styles.itemContent({ className })} ref={ref} {...props}>
      {children}
    </div>
  )
}

type RadioCardItemTextProps = ComponentPropsWithoutRef<"span"> & {
  ref?: Ref<HTMLSpanElement>
}

RadioCard.ItemText = function RadioCardItemText({
  children,
  className,
  ref,
  ...props
}: RadioCardItemTextProps) {
  const { api, size, variant, orientation, align } = useRadioCardContext()
  const { itemProps } = useRadioCardItemContext()
  const styles = radioCardVariants({
    size,
    variant,
    orientation,
    align,
  })

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

type RadioCardItemDescriptionProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

RadioCard.ItemDescription = function RadioCardItemDescription({
  children,
  className,
  ref,
  ...props
}: RadioCardItemDescriptionProps) {
  const { api, size, variant, align } = useRadioCardContext()
  const { itemProps } = useRadioCardItemContext()
  const styles = radioCardVariants({
    size,
    variant,
    align,
  })
  const itemState = api.getItemState(itemProps)

  return (
    <div
      className={styles.itemDescription({ className })}
      data-disabled={itemState.disabled || undefined}
      data-state={itemState.checked ? "checked" : "unchecked"}
      ref={ref}
      {...props}
    >
      {children}
    </div>
  )
}

type RadioCardItemIndicatorProps = Omit<
  ComponentPropsWithoutRef<"span">,
  "children"
> & {
  ref?: Ref<HTMLSpanElement>
}

RadioCard.ItemIndicator = function RadioCardItemIndicator({
  className,
  ref,
  ...props
}: RadioCardItemIndicatorProps) {
  const { api, size, variant } = useRadioCardContext()
  const { itemProps } = useRadioCardItemContext()
  const styles = radioCardVariants({ size, variant })
  const itemState = api.getItemState(itemProps)

  return (
    <span
      aria-hidden="true"
      className={styles.itemIndicator()}
      data-disabled={itemState.disabled || undefined}
      data-state={itemState.checked ? "checked" : "unchecked"}
      ref={ref}
      {...props}
    >
      <span
        className={styles.itemIndicatorContent()}
        data-disabled={itemState.disabled || undefined}
        data-state={itemState.checked ? "checked" : "unchecked"}
      >
        <span className={styles.itemIndicatorMark({ className })} />
      </span>
    </span>
  )
}

type RadioCardItemAddonProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

RadioCard.ItemAddon = function RadioCardItemAddon({
  children,
  className,
  ref,
  ...props
}: RadioCardItemAddonProps) {
  const { api, size, variant, align } = useRadioCardContext()
  const { itemProps } = useRadioCardItemContext()
  const styles = radioCardVariants({
    size,
    variant,
    align,
  })
  const itemState = api.getItemState(itemProps)

  return (
    <div
      className={styles.itemAddon({ className })}
      data-disabled={itemState.disabled || undefined}
      data-state={itemState.checked ? "checked" : "unchecked"}
      ref={ref}
      {...props}
    >
      {children}
    </div>
  )
}

type RadioCardStatusTextProps = Omit<
  ComponentPropsWithoutRef<typeof StatusText>,
  "status" | "size"
> & {
  status?: RadioCardValidateStatus
  size?: RadioCardSize
  ref?: Ref<HTMLDivElement>
}

RadioCard.StatusText = function RadioCardStatusText({
  status,
  size: sizeProp,
  showIcon,
  children,
  ...props
}: RadioCardStatusTextProps) {
  const { size, validateStatus } = useRadioCardContext()
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

export { radioCardVariants, useRadioCardContext }

RadioCard.displayName = "RadioCard"
