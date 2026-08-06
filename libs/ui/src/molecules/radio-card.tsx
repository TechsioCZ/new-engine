/*
 * RadioCard — @techsio/ui-kit molecule.
 *
 * @component RadioCard
 * @componentVersion v1.0.1
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
import { useId } from "react"
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react"
import type { VariantProps } from "tailwind-variants"

import { Label as LabelPrimitive } from "../atoms/label"
import { StatusText as StatusTextPrimitive } from "../atoms/status-text"
import {
  radioCardItemProvider as RadioCardItemProvider,
  radioCardProvider as RadioCardProvider,
  useRadioCardContext,
  useRadioCardItemContext,
} from "./radio-card-context"
import { radioCardVariants } from "./radio-card-variants"
import type {
  RadioCardSize,
  RadioCardValidateStatus,
} from "./radio-card-variants"

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

export const RadioCard = ({
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
}: RadioCardProps) => {
  const generatedId = useId()
  const id = providedId ?? generatedId
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
  const rootProps = mergeProps(api.getRootProps(), {
    "aria-describedby": ariaDescribedByProp,
  })
  return (
    <RadioCardProvider
      align={align}
      api={api}
      disabled={disabled}
      itemOrientation={itemOrientation}
      justify={justify}
      required={required}
      size={size}
      validateStatus={validateStatus}
      variant={variant}
    >
      <div {...rootProps} className={styles.root({ className })} ref={ref}>
        {children}
      </div>
    </RadioCardProvider>
  )
}

type RadioCardLabelProps = Omit<
  ComponentPropsWithoutRef<typeof LabelPrimitive>,
  "disabled" | "required"
> & {
  disabled?: boolean | undefined
  required?: boolean | undefined
  ref?: Ref<HTMLLabelElement> | undefined
}

RadioCard.Label = function Label({
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
    <LabelPrimitive
      {...labelProps}
      disabled={disabled ?? groupDisabled}
      required={required ?? groupRequired}
      size={sizeProp ?? size}
    >
      {children}
    </LabelPrimitive>
  )
}

export type RadioCardItemProps = Omit<
  ComponentPropsWithoutRef<"label">,
  "value"
> &
  ItemProps & {
    ref?: Ref<HTMLLabelElement> | undefined
  }

RadioCard.Item = function Item({
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
    <RadioCardItemProvider itemProps={itemProps}>
      <label
        {...mergedItemProps}
        className={styles.item({ className })}
        ref={ref}
      >
        {children}
      </label>
    </RadioCardItemProvider>
  )
}

type RadioCardItemHiddenInputProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "type" | "value"
> & {
  ref?: Ref<HTMLInputElement> | undefined
}

RadioCard.ItemHiddenInput = function ItemHiddenInput({
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
      {...hiddenInputProps}
      className={styles.hiddenInput({ className })}
      ref={ref}
    />
  )
}

type RadioCardItemControlProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement> | undefined
}

RadioCard.ItemControl = function ItemControl({
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
      {...itemControlProps}
      className={styles.itemControl({ className })}
      ref={ref}
    >
      {children}
    </div>
  )
}

type RadioCardItemContentProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement> | undefined
}

RadioCard.ItemContent = function ItemContent({
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

RadioCard.ItemText = function ItemText({
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
      {...itemTextProps}
      className={styles.itemText({ className })}
      ref={ref}
    >
      {children}
    </span>
  )
}

type RadioCardItemDescriptionProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement> | undefined
}

RadioCard.ItemDescription = function ItemDescription({
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

RadioCard.ItemIndicator = function ItemIndicator({
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

RadioCard.ItemAddon = function ItemAddon({
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
  ComponentPropsWithoutRef<typeof StatusTextPrimitive>,
  "status" | "size"
> & {
  status?: RadioCardValidateStatus | undefined
  size?: RadioCardSize | undefined
  ref?: Ref<HTMLDivElement> | undefined
}

RadioCard.StatusText = function StatusText({
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
    <StatusTextPrimitive
      showIcon={showIcon ?? effectiveStatus !== "default"}
      size={effectiveSize}
      status={effectiveStatus}
      {...props}
    >
      {children}
    </StatusTextPrimitive>
  )
}

export { useRadioCardContext } from "./radio-card-context"
export { radioCardVariants } from "./radio-card-variants"

RadioCard.displayName = "RadioCard"
