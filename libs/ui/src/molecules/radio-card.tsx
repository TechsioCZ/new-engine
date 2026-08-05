/**
 * RadioCard — @techsio/ui-kit molecule.
 *
 * @component RadioCard
 * @componentVersion v1.0.0
 * @skill radio-card-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the radio-card-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { connect, machine } from "@zag-js/radio-group"
import type {
  ItemProps,
  ValueChangeDetails,
  Props as ZagRadioGroupProps,
} from "@zag-js/radio-group"
import { mergeProps, normalizeProps, useMachine } from "@zag-js/react"
import { createContext, useContext, useId } from "react"
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react"
import type { VariantProps } from "tailwind-variants"

import { Label } from "../atoms/label"
import { StatusText } from "../atoms/status-text"
import { tv } from "../utils"

const radioCardVariants = tv({
  defaultVariants: {
    align: "start",
    itemOrientation: "horizontal",
    justify: "between",
    size: "md",
    variant: "outline",
  },
  slots: {
    hiddenInput: "sr-only",
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
      "data-disabled:data-[state=checked]:bg-radio-card-item-bg-disabled",
      "data-disabled:data-[state=checked]:border-radio-card-item-border-disabled",
      "data-disabled:data-[state=checked]:text-radio-card-item-fg-disabled",
      "data-focus-visible:outline-(style:--default-ring-style)",
      "data-focus-visible:outline-(length:--default-ring-width)",
      "data-focus-visible:outline-radio-card-ring",
      "data-focus-visible:outline-offset-(length:--default-ring-offset)",
      "data-invalid:border-radio-card-item-border-error",
    ],
    itemAddon: [
      "border-t-(length:--border-width-radio-card-addon)",
      "border-radio-card-addon-border",
      "font-radio-card-addon",
      "text-radio-card-addon-fg",
      "transition-colors duration-200 motion-reduce:transition-none",
      "data-disabled:border-radio-card-addon-border-disabled",
      "data-disabled:bg-radio-card-addon-bg-disabled",
      "data-disabled:text-radio-card-addon-fg-disabled",
      "data-disabled:data-[state=checked]:border-radio-card-addon-border-disabled",
      "data-disabled:data-[state=checked]:bg-radio-card-addon-bg-disabled",
      "data-disabled:data-[state=checked]:text-radio-card-addon-fg-disabled",
    ],
    itemContent: ["flex min-w-0 flex-col"],
    itemControl: ["flex min-w-0 flex-1"],
    itemDescription: [
      "min-w-0",
      "text-radio-card-item-description-fg",
      "leading-normal",
      "data-disabled:text-radio-card-item-description-fg-disabled",
      "data-disabled:data-[state=checked]:text-radio-card-item-description-fg-disabled",
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
      "data-disabled:data-[state=checked]:border-radio-card-item-indicator-border-disabled",
      "data-disabled:data-[state=checked]:bg-radio-card-item-indicator-bg-disabled",
    ],
    itemIndicatorContent: [
      "inline-grid place-items-center",
      "text-radio-card-item-indicator-content-fg",
      "opacity-0 transition-opacity duration-200 motion-reduce:transition-none",
      "data-[state=checked]:opacity-100",
      "data-disabled:data-[state=checked]:text-radio-card-item-indicator-content-fg-disabled",
    ],
    itemIndicatorMark: ["block leading-none", "token-icon-radio-card-checked"],
    itemText: [
      "min-w-0",
      "font-radio-card-item",
      "text-radio-card-item-fg",
      "leading-snug",
      "data-disabled:text-radio-card-item-fg-disabled",
      "data-disabled:data-[state=checked]:text-radio-card-item-fg-disabled",
    ],
    root: ["flex w-full flex-col"],
  },
  variants: {
    align: {
      center: {
        itemAddon: "text-center",
        itemContent: "items-center",
        itemControl: "items-center",
        itemDescription: "text-center",
        itemText: "text-center",
      },
      end: {
        itemAddon: "text-right",
        itemContent: "items-end",
        itemControl: "items-end",
        itemDescription: "text-right",
        itemText: "text-right",
      },
      start: {
        itemAddon: "text-left",
        itemContent: "items-start",
        itemControl: "items-start",
        itemDescription: "text-left",
        itemText: "text-left",
      },
    },
    itemOrientation: {
      horizontal: {
        itemContent: "flex-1",
        itemControl: "flex-row",
        itemText: "flex-1",
      },
      vertical: {
        itemControl: "flex-col",
      },
    },
    justify: {
      between: {
        itemControl: "justify-between",
      },
      center: {
        itemControl: "justify-center",
      },
      end: {
        itemControl: "justify-end",
      },
      start: {
        itemControl: "justify-start",
      },
    },
    size: {
      lg: {
        itemAddon: ["p-radio-card-addon-lg", "text-radio-card-addon-lg"],
        itemContent: "gap-radio-card-item-content-lg",
        itemControl: [
          "gap-radio-card-item-control-lg",
          "p-radio-card-item-control-lg",
        ],
        itemDescription: "text-radio-card-item-description-lg",
        itemIndicator: "size-radio-card-indicator-lg",
        itemIndicatorMark: "size-radio-card-indicator-mark-lg",
        itemText: "text-radio-card-item-lg",
        root: "gap-radio-card-stack-lg",
      },
      md: {
        itemAddon: ["p-radio-card-addon-md", "text-radio-card-addon-md"],
        itemContent: "gap-radio-card-item-content-md",
        itemControl: [
          "gap-radio-card-item-control-md",
          "p-radio-card-item-control-md",
        ],
        itemDescription: "text-radio-card-item-description-md",
        itemIndicator: "size-radio-card-indicator-md",
        itemIndicatorMark: "size-radio-card-indicator-mark-md",
        itemText: "text-radio-card-item-md",
        root: "gap-radio-card-stack-md",
      },
      sm: {
        itemAddon: ["p-radio-card-addon-sm", "text-radio-card-addon-sm"],
        itemContent: "gap-radio-card-item-content-sm",
        itemControl: [
          "gap-radio-card-item-control-sm",
          "p-radio-card-item-control-sm",
        ],
        itemDescription: "text-radio-card-item-description-sm",
        itemIndicator: "size-radio-card-indicator-sm",
        itemIndicatorMark: "size-radio-card-indicator-mark-sm",
        itemText: "text-radio-card-item-sm",
        root: "gap-radio-card-stack-sm",
      },
    },
    variant: {
      outline: {
        item: [
          "data-[state=checked]:bg-radio-card-item-bg",
          "data-[state=checked]:border-radio-card-item-border-outline-checked",
          "data-hover:data-[state=checked]:bg-radio-card-item-bg-outline-checked-hover",
          "data-hover:data-[state=checked]:border-radio-card-item-border-outline-checked-hover",
        ],
        itemIndicator: [
          "data-[state=checked]:border-radio-card-item-indicator-border-outline-checked",
        ],
        itemIndicatorContent: [
          "data-[state=checked]:text-radio-card-item-indicator-content-fg-outline-checked",
        ],
      },
      solid: {
        item: [
          "data-[state=checked]:bg-radio-card-item-bg-solid-checked",
          "data-[state=checked]:border-radio-card-item-border-solid-checked",
          "data-hover:data-[state=checked]:bg-radio-card-item-bg-solid-checked-hover",
          "data-hover:data-[state=checked]:border-radio-card-item-border-solid-checked-hover",
        ],
        itemAddon: [
          "data-[state=checked]:border-radio-card-addon-border-solid-checked",
          "data-[state=checked]:text-radio-card-addon-fg-solid-checked",
        ],
        itemDescription: [
          "data-[state=checked]:text-radio-card-item-description-fg-solid-checked",
        ],
        itemIndicator: [
          "data-[state=checked]:border-radio-card-item-indicator-border-solid-checked",
          "data-[state=checked]:bg-radio-card-item-indicator-bg-solid-checked",
        ],
        itemIndicatorContent: [
          "data-[state=checked]:text-radio-card-item-indicator-content-fg-solid-checked",
        ],
        itemText: [
          "data-[state=checked]:text-radio-card-item-fg-solid-checked",
        ],
      },
      subtle: {
        item: [
          "data-[state=checked]:bg-radio-card-item-bg-subtle-checked",
          "data-[state=checked]:border-radio-card-item-border-subtle-checked",
          "data-hover:data-[state=checked]:bg-radio-card-item-bg-subtle-checked-hover",
          "data-hover:data-[state=checked]:border-radio-card-item-border-subtle-checked-hover",
        ],
        itemAddon: [
          "data-[state=checked]:border-radio-card-addon-border-subtle-checked",
          "data-[state=checked]:text-radio-card-addon-fg-subtle-checked",
        ],
        itemDescription: [
          "data-[state=checked]:text-radio-card-item-description-fg-subtle-checked",
        ],
        itemIndicator: [
          "data-[state=checked]:border-radio-card-item-indicator-border-subtle-checked",
        ],
        itemIndicatorContent: [
          "data-[state=checked]:text-radio-card-item-indicator-content-fg-subtle-checked",
        ],
        itemText: [
          "data-[state=checked]:text-radio-card-item-fg-subtle-checked",
        ],
      },
    },
  },
})

type RadioCardVariant = NonNullable<
  VariantProps<typeof radioCardVariants>["variant"]
>
type RadioCardSize = NonNullable<VariantProps<typeof radioCardVariants>["size"]>
type RadioCardItemOrientation = NonNullable<
  VariantProps<typeof radioCardVariants>["itemOrientation"]
>
type RadioCardAlign = NonNullable<
  VariantProps<typeof radioCardVariants>["align"]
>
type RadioCardJustify = NonNullable<
  VariantProps<typeof radioCardVariants>["justify"]
>
type RadioCardValidateStatus = "default" | "error" | "success" | "warning"

interface RadioCardContextValue {
  api: ReturnType<typeof connect>
  variant: RadioCardVariant
  size: RadioCardSize
  itemOrientation: RadioCardItemOrientation
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

interface RadioCardItemContextValue {
  itemProps: ItemProps
}

const RadioCardItemContext = createContext<RadioCardItemContextValue | null>(
  null,
)

function useRadioCardItemContext() {
  const context = useContext(RadioCardItemContext)
  if (!context) {
    throw new Error(
      "RadioCard item components must be used within RadioCard.Item",
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
    "aria-describedby"?: string | undefined
    id?: string | undefined
    children: ReactNode
    className?: string | undefined
    ref?: Ref<HTMLDivElement> | undefined
    validateStatus?: RadioCardValidateStatus | undefined
    onValueChange?: ((value: string | null) => void) | undefined
  }

export function RadioCard({
  "aria-describedby": ariaDescribedByProp,
  id: providedId,
  disabled = false,
  required = false,
  orientation = "horizontal",
  itemOrientation = "horizontal",
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
    disabled,
    id,
    invalid,
    onValueChange: ({ value: nextValue }: ValueChangeDetails) => {
      onValueChange?.(nextValue)
    },
    orientation,
    required,
  })

  const api = connect(service, normalizeProps)
  const styles = radioCardVariants({
    align,
    itemOrientation,
    justify,
    size,
    variant,
  })
  const rootProps = mergeProps(
    {
      "aria-describedby": ariaDescribedByProp,
    },
    api.getRootProps(),
  )

  return (
    <RadioCardContext.Provider
      value={{
        align,
        api,
        disabled,
        itemOrientation,
        justify,
        required,
        size,
        validateStatus,
        variant,
      }}
    >
      <div className={styles.root({ className })} ref={ref} {...rootProps}>
        {children}
      </div>
    </RadioCardContext.Provider>
  )
}

type RadioCardLabelProps = Omit<
  ComponentPropsWithoutRef<typeof Label>,
  "disabled" | "required"
> & {
  disabled?: boolean | undefined
  required?: boolean | undefined
  ref?: Ref<HTMLLabelElement> | undefined
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
  const labelProps = mergeProps(api.getLabelProps(), props)

  return (
    <Label
      disabled={disabled ?? groupDisabled}
      required={required ?? groupRequired}
      size={sizeProp ?? size}
      {...labelProps}
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
    ref?: Ref<HTMLLabelElement> | undefined
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
  const itemProps = { disabled, invalid, value }
  const mergedItemProps = mergeProps(api.getItemProps(itemProps), props)

  return (
    <RadioCardItemContext.Provider value={{ itemProps }}>
      <label
        className={styles.item({ className })}
        ref={ref}
        {...mergedItemProps}
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
  ref?: Ref<HTMLInputElement> | undefined
}

RadioCard.ItemHiddenInput = function RadioCardItemHiddenInput({
  className,
  ref,
  ...props
}: RadioCardItemHiddenInputProps) {
  const { api, size, variant } = useRadioCardContext()
  const { itemProps } = useRadioCardItemContext()
  const styles = radioCardVariants({ size, variant })
  const hiddenInputProps = mergeProps(
    api.getItemHiddenInputProps(itemProps),
    props,
  )

  return (
    <input
      className={styles.hiddenInput({ className })}
      ref={ref}
      {...hiddenInputProps}
    />
  )
}

type RadioCardItemControlProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement> | undefined
}

RadioCard.ItemControl = function RadioCardItemControl({
  children,
  className,
  ref,
  ...props
}: RadioCardItemControlProps) {
  const { api, size, variant, itemOrientation, align, justify } =
    useRadioCardContext()
  const { itemProps } = useRadioCardItemContext()
  const styles = radioCardVariants({
    align,
    itemOrientation,
    justify,
    size,
    variant,
  })
  const itemControlProps = mergeProps(api.getItemControlProps(itemProps), props)

  return (
    <div
      className={styles.itemControl({ className })}
      ref={ref}
      {...itemControlProps}
    >
      {children}
    </div>
  )
}

type RadioCardItemContentProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement> | undefined
}

RadioCard.ItemContent = function RadioCardItemContent({
  children,
  className,
  ref,
  ...props
}: RadioCardItemContentProps) {
  const { size, variant, itemOrientation, align } = useRadioCardContext()
  const styles = radioCardVariants({
    align,
    itemOrientation,
    size,
    variant,
  })

  return (
    <div className={styles.itemContent({ className })} ref={ref} {...props}>
      {children}
    </div>
  )
}

type RadioCardItemTextProps = ComponentPropsWithoutRef<"span"> & {
  ref?: Ref<HTMLSpanElement> | undefined
}

RadioCard.ItemText = function RadioCardItemText({
  children,
  className,
  ref,
  ...props
}: RadioCardItemTextProps) {
  const { api, size, variant, itemOrientation, align } = useRadioCardContext()
  const { itemProps } = useRadioCardItemContext()
  const styles = radioCardVariants({
    align,
    itemOrientation,
    size,
    variant,
  })
  const itemTextProps = mergeProps(api.getItemTextProps(itemProps), props)

  return (
    <span
      className={styles.itemText({ className })}
      ref={ref}
      {...itemTextProps}
    >
      {children}
    </span>
  )
}

type RadioCardItemDescriptionProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement> | undefined
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
    align,
    size,
    variant,
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
  ref?: Ref<HTMLSpanElement> | undefined
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
  ref?: Ref<HTMLDivElement> | undefined
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
    align,
    size,
    variant,
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
  status?: RadioCardValidateStatus | undefined
  size?: RadioCardSize | undefined
  ref?: Ref<HTMLDivElement> | undefined
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
