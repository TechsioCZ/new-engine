/*
 * RadioGroup — @techsio/ui-kit molecule.
 *
 * @component RadioGroup
 * @componentVersion v1.0.2
 * @skill radio-group-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the radio-group-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { connect, machine } from "@zag-js/radio-group"
import type {
  Api as RadioGroupApi,
  ItemProps,
  Props as RadioGroupMachineConfiguration,
  ValueChangeDetails,
} from "@zag-js/radio-group"
import { mergeProps, normalizeProps, useMachine } from "@zag-js/react"
import type { PropTypes as ReactPropTypes } from "@zag-js/react"
import { createContext, useContext, useId } from "react"
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react"
import type { VariantProps } from "tailwind-variants"

import { Label as AtomLabel } from "../atoms/label"
import { StatusText as AtomStatusText } from "../atoms/status-text"
import { radioGroupVariants } from "./radio-group-variants"

export { radioGroupVariants } from "./radio-group-variants"

type RadioGroupVariant = NonNullable<
  VariantProps<typeof radioGroupVariants>["variant"]
>

type RadioGroupSize = NonNullable<
  VariantProps<typeof radioGroupVariants>["size"]
>

type RadioGroupValidateStatus = "default" | "error" | "success" | "warning"

interface RadioGroupContextValue {
  api: RadioGroupApi<ReactPropTypes>
  disabled: boolean
  orientation: "horizontal" | "vertical"
  required: boolean
  size: RadioGroupSize
  validateStatus: RadioGroupValidateStatus
  variant: RadioGroupVariant
}

const RadioGroupApiContext =
  createContext<RadioGroupApi<ReactPropTypes> | null>(null)
const RadioGroupVariantContext = createContext<RadioGroupVariant>("outline")
const RadioGroupSizeContext = createContext<RadioGroupSize>("md")
const RadioGroupOrientationContext = createContext<"horizontal" | "vertical">(
  "vertical",
)
const RadioGroupDisabledContext = createContext(false)
const RadioGroupRequiredContext = createContext(false)
const RadioGroupValidateStatusContext =
  createContext<RadioGroupValidateStatus>("default")

const useRadioGroupContext = (): RadioGroupContextValue => {
  const api = useContext(RadioGroupApiContext)
  const variant = useContext(RadioGroupVariantContext)
  const size = useContext(RadioGroupSizeContext)
  const orientation = useContext(RadioGroupOrientationContext)
  const disabled = useContext(RadioGroupDisabledContext)
  const required = useContext(RadioGroupRequiredContext)
  const validateStatus = useContext(RadioGroupValidateStatusContext)
  if (api === null) {
    throw new Error("RadioGroup components must be used within RadioGroup")
  }
  return {
    api,
    disabled,
    orientation,
    required,
    size,
    validateStatus,
    variant,
  }
}

const RadioGroupItemValueContext = createContext<string | null>(null)
const RadioGroupItemDisabledContext = createContext<boolean | undefined>(
  undefined,
)
const RadioGroupItemInvalidContext = createContext<boolean | undefined>(
  undefined,
)

const useRadioGroupItemContext = () => {
  const value = useContext(RadioGroupItemValueContext)
  const disabled = useContext(RadioGroupItemDisabledContext)
  const invalid = useContext(RadioGroupItemInvalidContext)
  if (value === null) {
    throw new Error(
      "RadioGroup item components must be used within RadioGroup.Item",
    )
  }
  const itemProps: ItemProps = { disabled, invalid, value }
  return { itemProps }
}

type RadioGroupMachineProps = Omit<
  RadioGroupMachineConfiguration,
  "id" | "invalid" | "onValueChange"
>

export type RadioGroupProps = VariantProps<typeof radioGroupVariants> &
  RadioGroupMachineProps & {
    id?: string | undefined
    children: ReactNode
    className?: string | undefined
    ref?: Ref<HTMLDivElement> | undefined
    validateStatus?: RadioGroupValidateStatus | undefined
    onValueChange?: ((value: string | null) => void) | undefined
  }

export const RadioGroup = ({
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
}: RadioGroupProps) => {
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
  const styles = radioGroupVariants({ size, variant })

  return (
    <RadioGroupApiContext.Provider value={api}>
      <RadioGroupVariantContext.Provider value={variant}>
        <RadioGroupSizeContext.Provider value={size}>
          <RadioGroupOrientationContext.Provider value={orientation}>
            <RadioGroupDisabledContext.Provider value={disabled}>
              <RadioGroupRequiredContext.Provider value={required}>
                <RadioGroupValidateStatusContext.Provider
                  value={validateStatus}
                >
                  <div
                    {...api.getRootProps()}
                    className={styles.root({ className })}
                    ref={ref}
                  >
                    {children}
                  </div>
                </RadioGroupValidateStatusContext.Provider>
              </RadioGroupRequiredContext.Provider>
            </RadioGroupDisabledContext.Provider>
          </RadioGroupOrientationContext.Provider>
        </RadioGroupSizeContext.Provider>
      </RadioGroupVariantContext.Provider>
    </RadioGroupApiContext.Provider>
  )
}

type RadioGroupLabelProps = Omit<
  ComponentPropsWithoutRef<typeof AtomLabel>,
  "disabled" | "required"
> & {
  disabled?: boolean | undefined
  required?: boolean | undefined
  ref?: Ref<HTMLLabelElement> | undefined
}

RadioGroup.Label = function Label({
  children,
  disabled,
  required,
  size: sizeProp,
  ...props
}: RadioGroupLabelProps) {
  const {
    api,
    size,
    disabled: groupDisabled,
    required: groupRequired,
  } = useRadioGroupContext()

  return (
    <AtomLabel
      {...mergeProps(api.getLabelProps(), props)}
      disabled={disabled ?? groupDisabled}
      required={required ?? groupRequired}
      size={sizeProp ?? size}
    >
      {children}
    </AtomLabel>
  )
}

type RadioGroupItemGroupProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement> | undefined
}

RadioGroup.ItemGroup = function ItemGroup({
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

export type RadioGroupItemProps = Omit<
  ComponentPropsWithoutRef<"label">,
  "value"
> &
  ItemProps & {
    ref?: Ref<HTMLLabelElement> | undefined
  }

RadioGroup.Item = function Item({
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
  const itemProps: ItemProps = { disabled, invalid, value }

  return (
    <RadioGroupItemValueContext.Provider value={value}>
      <RadioGroupItemDisabledContext.Provider value={disabled}>
        <RadioGroupItemInvalidContext.Provider value={invalid}>
          <label
            {...mergeProps(api.getItemProps(itemProps), props)}
            className={styles.item({ className })}
            ref={ref}
          >
            {children}
          </label>
        </RadioGroupItemInvalidContext.Provider>
      </RadioGroupItemDisabledContext.Provider>
    </RadioGroupItemValueContext.Provider>
  )
}

type RadioGroupItemHiddenInputProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "type" | "value"
> & {
  ref?: Ref<HTMLInputElement> | undefined
}

RadioGroup.ItemHiddenInput = function ItemHiddenInput({
  className,
  ref,
  ...props
}: RadioGroupItemHiddenInputProps) {
  const { api, size, variant } = useRadioGroupContext()
  const { itemProps } = useRadioGroupItemContext()
  const styles = radioGroupVariants({ size, variant })

  return (
    <input
      {...mergeProps(api.getItemHiddenInputProps(itemProps), props)}
      className={styles.hiddenInput({ className })}
      ref={ref}
    />
  )
}

type RadioGroupItemControlProps = ComponentPropsWithoutRef<"span"> & {
  ref?: Ref<HTMLSpanElement> | undefined
}

RadioGroup.ItemControl = function ItemControl({
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
      {...mergeProps(api.getItemControlProps(itemProps), props)}
      className={styles.itemControl({ className })}
      ref={ref}
    >
      <span
        aria-hidden="true"
        className={styles.itemIndicator()}
        data-disabled={itemState.disabled ?? undefined}
        data-state={itemState.checked ? "checked" : "unchecked"}
      />
      {children}
    </span>
  )
}

type RadioGroupItemContentProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement> | undefined
}

RadioGroup.ItemContent = function ItemContent({
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
  ref?: Ref<HTMLSpanElement> | undefined
}

RadioGroup.ItemText = function ItemText({
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
      {...mergeProps(api.getItemTextProps(itemProps), props)}
      className={styles.itemText({ className })}
      ref={ref}
    >
      {children}
    </span>
  )
}

type RadioGroupItemDescriptionProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement> | undefined
}

RadioGroup.ItemDescription = function ItemDescription({
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
      data-disabled={itemState.disabled ?? undefined}
      ref={ref}
      {...props}
    >
      {children}
    </div>
  )
}

type RadioGroupStatusTextProps = Omit<
  ComponentPropsWithoutRef<typeof AtomStatusText>,
  "status" | "size"
> & {
  status?: RadioGroupValidateStatus | undefined
  size?: RadioGroupSize | undefined
  ref?: Ref<HTMLDivElement> | undefined
}

RadioGroup.StatusText = function StatusText({
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
    <AtomStatusText
      showIcon={showIcon ?? effectiveStatus !== "default"}
      size={effectiveSize}
      status={effectiveStatus}
      {...props}
    >
      {children}
    </AtomStatusText>
  )
}

export { useRadioGroupContext }

RadioGroup.displayName = "RadioGroup"
