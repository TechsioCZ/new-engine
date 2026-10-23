/**
 * RadioGroup — @techsio/ui-kit molecule.
 *
 * @component RadioGroup
 * @componentVersion v1.1.4
 * @skill radio-group-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the radio-group-usage skill's component_version and a changelog entry. Bump all three together.
 */
import {
  connect,
  machine,
  type ValueChangeDetails,
  type Props as ZagRadioGroupProps,
  type ItemProps as ZagRadioItemProps,
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
import { StatusText as StatusTextComponent } from "../atoms/status-text"
import {
  getControlledChoiceInputProps,
  handleChoiceArrowKey,
  isSilentChoiceReset,
  mergeChoiceInputProps,
  runSilentChoiceReset,
  trackChoiceFormControl,
  useChoiceFocusRecovery,
} from "../internal/choice-control"
import {
  type DescribedBy,
  joinDescribedBy,
  useDescribedBy,
  useRegisterDescription,
} from "../internal/described-by"
import { tv } from "../utils"

/** @internal One reset integration for both radio compositions. */
export const radioChoiceMachine: typeof machine = {
  ...machine,
  implementations: {
    ...machine.implementations,
    effects: {
      ...machine.implementations?.effects,
      trackFormControlState({ scope, context, prop, action }) {
        const root = scope.getById(scope.ids?.root ?? `radio-group:${scope.id}`)
        return trackChoiceFormControl(
          root,
          () => {
            if (prop("value") === undefined) {
              runSilentChoiceReset(context, () =>
                context.set("value", context.initial("value"))
              )
            } else {
              // Native reset bypasses React; the parent remains authoritative.
              action(["syncInputElements"])
            }
          },
          (disabled) => context.set("fieldsetDisabled", disabled)
        )
      },
    },
  },
}

const radioGroupVariants = tv({
  slots: {
    root: [
      "flex w-full flex-col",
      "focus-visible:outline-(style:--default-ring-style)",
      "focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-radio-group-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
    ],
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
      "data-readonly:not-data-disabled:cursor-default data-readonly:select-text",
    ],
    itemControl: [
      "form-control-readonly form-control-disabled row-start-1 self-center",
      "inline-grid shrink-0 place-items-center rounded-radio-group-control",
      "border-(length:--border-width-radio-group)",
      "border-radio-group-item-border-base",
      "bg-radio-group-item-bg",
      "data-readonly:not-data-disabled:data-[state=checked]:border-radio-group-border-choice-selected",
      "transition-colors duration-200 motion-reduce:transition-none",
      "data-hover:bg-radio-group-item-bg-hover",
      "data-hover:border-radio-group-item-border-hover",
      "data-disabled:bg-radio-group-item-bg-disabled",
      "data-disabled:border-radio-group-item-border-disabled",
      "data-focus-visible:outline-(style:--default-ring-style)",
      "data-focus-visible:outline-(length:--default-ring-width)",
      "data-focus-visible:outline-radio-group-ring",
      "data-focus-visible:outline-offset-(length:--default-ring-offset)",
      "data-invalid:border-radio-group-item-border-error",
      "data-invalid:outline-offset-(length:--default-ring-offset)",
    ],
    itemContent: ["col-start-2 row-start-1 flex min-w-0 flex-col"],
    itemIndicator: [
      "pointer-events-none block leading-none",
      "token-icon-radio-group-checked",
      "opacity-0 transition-opacity duration-200 motion-reduce:transition-none",
      "data-[state=checked]:opacity-100",
      "data-readonly:not-data-disabled:text-radio-group-fg-choice-selected",
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
          "data-[state=checked]:bg-radio-group-item-bg-outline-checked",
          "data-[state=checked]:border-radio-group-border-choice-selected",
          "data-hover:data-[state=checked]:bg-radio-group-item-bg-outline-checked-hover",
          "data-hover:data-[state=checked]:border-radio-group-border-choice-selected",
        ],
        itemIndicator: "text-radio-group-fg-choice-selected",
      },
      subtle: {
        itemControl: [
          "data-[state=checked]:bg-radio-group-item-bg-subtle-checked",
          "data-[state=checked]:border-radio-group-border-choice-selected",
          "data-hover:data-[state=checked]:bg-radio-group-item-bg-subtle-checked-hover",
          "data-hover:data-[state=checked]:border-radio-group-border-choice-selected",
        ],
        itemIndicator: "text-radio-group-fg-choice-selected",
      },
      solid: {
        itemControl: [
          "data-[state=checked]:bg-radio-group-item-bg-solid-checked",
          "data-[state=checked]:border-radio-group-border-solid-selected",
          "data-hover:data-[state=checked]:bg-radio-group-item-bg-solid-checked-hover",
          "data-hover:data-[state=checked]:border-radio-group-border-solid-selected",
        ],
        itemIndicator: "text-radio-group-fg-solid-selected",
      },
    },
    size: {
      sm: {
        root: "gap-radio-group-stack-sm",
        itemGroup:
          "data-[orientation=horizontal]:gap-radio-group-stack-horizontal-sm data-[orientation=vertical]:gap-radio-group-stack-vertical-sm",
        item: "gap-x-radio-group-item-sm",
        itemControl: "size-radio-group-control-sm",
        itemContent: "gap-radio-group-item-content-sm",
        itemIndicator: "size-radio-group-indicator-sm",
        itemText: "text-radio-group-item-sm",
        itemDescription: "text-radio-group-item-description-sm",
      },
      md: {
        root: "gap-radio-group-stack-md",
        itemGroup:
          "data-[orientation=horizontal]:gap-radio-group-stack-horizontal-md data-[orientation=vertical]:gap-radio-group-stack-vertical-md",
        item: "gap-x-radio-group-item-md",
        itemControl: "size-radio-group-control-md",
        itemContent: "gap-radio-group-item-content-md",
        itemIndicator: "size-radio-group-indicator-md",
        itemText: "text-radio-group-item-md",
        itemDescription: "text-radio-group-item-description-md",
      },
      lg: {
        root: "gap-radio-group-stack-lg",
        itemGroup:
          "data-[orientation=horizontal]:gap-radio-group-stack-horizontal-lg data-[orientation=vertical]:gap-radio-group-stack-vertical-lg",
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
  readOnly: boolean
  callerDescribedBy?: string
  errorMessageId?: string
  registerError: DescribedBy["registerDescription"]
  api: ReturnType<typeof connect>
  variant: RadioGroupVariant
  size: RadioGroupSize
  orientation: "horizontal" | "vertical"
  disabled: boolean
  required: boolean
  validateStatus: RadioGroupValidateStatus
  statusTextId: string
} & DescribedBy

const ignoreDescription = () => () => undefined

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null)

function useRadioGroupContext() {
  const context = useContext(RadioGroupContext)
  if (!context) {
    throw new Error("RadioGroup components must be used within RadioGroup")
  }
  return context
}

type RadioGroupItemContextValue = {
  itemProps: ZagRadioItemProps
} & DescribedBy

const RadioGroupItemContext = createContext<RadioGroupItemContextValue | null>(
  null
)

function useRadioGroupItemContext() {
  const context = useContext(RadioGroupItemContext)
  if (!context) {
    throw new Error(
      "RadioGroup item components must be used within RadioGroup.Item"
    )
  }
  return context
}

type RadioGroupMachineProps = Omit<
  ZagRadioGroupProps,
  "id" | "invalid" | "onValueChange"
>

export type RadioGroupProps = VariantProps<typeof radioGroupVariants> &
  RadioGroupMachineProps & {
    "aria-label"?: string
    "aria-labelledby"?: string
    "aria-describedby"?: string
    id?: string
    children: ReactNode
    className?: string
    ref?: Ref<HTMLDivElement>
    validateStatus?: RadioGroupValidateStatus
    onValueChange?: (value: string | null) => void
  }

export function RadioGroup({
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedByProp,
  id: providedId,
  disabled = false,
  readOnly = false,
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

  const service = useMachine(radioChoiceMachine, {
    ...machineProps,
    id,
    disabled,
    readOnly: readOnly && !disabled,
    required,
    orientation,
    invalid,
    onValueChange: ({ value: nextValue }: ValueChangeDetails) => {
      if (!(readOnly || disabled || isSilentChoiceReset(service.context))) {
        onValueChange?.(nextValue)
      }
    },
  })

  const api = connect(service, normalizeProps)
  const focusRef = useChoiceFocusRecovery()
  const styles = radioGroupVariants({ size, variant })
  const describedBy = useDescribedBy()
  const errors = useDescribedBy()

  return (
    <RadioGroupContext.Provider
      value={{
        api,
        readOnly: readOnly && !disabled,
        callerDescribedBy: ariaDescribedByProp,
        errorMessageId: errors.describedById,
        registerError: errors.registerDescription,
        ...describedBy,
        variant,
        size,
        orientation,
        disabled,
        required,
        validateStatus,
        statusTextId: `${id}-status`,
      }}
    >
      <div
        className={styles.root({ className })}
        ref={(node) => {
          focusRef.current = node
          if (typeof ref === "function") {
            return ref(node)
          }
          if (ref) {
            ref.current = node
          }
        }}
        {...api.getRootProps()}
        aria-describedby={joinDescribedBy(
          ariaDescribedByProp,
          describedBy.describedById
        )}
        aria-errormessage={errors.describedById}
        aria-invalid={invalid || !!errors.describedById || undefined}
        aria-label={ariaLabel}
        aria-labelledby={
          ariaLabelledBy ??
          (ariaLabel ? undefined : api.getRootProps()["aria-labelledby"])
        }
        role="radiogroup"
        tabIndex={-1}
      >
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
  const {
    api,
    size,
    disabled: groupDisabled,
    required: groupRequired,
  } = useRadioGroupContext()

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

export type RadioGroupItemProps = Omit<
  ComponentPropsWithoutRef<"label">,
  "value"
> &
  ZagRadioItemProps & {
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
  const descriptions = useDescribedBy()

  return (
    <RadioGroupItemContext.Provider value={{ itemProps, ...descriptions }}>
      {/* biome-ignore lint/a11y/noLabelWithoutControl: The compound hidden input is rendered by children and shares these Zag item props. */}
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
  const {
    api,
    size,
    variant,
    readOnly,
    callerDescribedBy,
    describedById,
    errorMessageId,
    validateStatus,
  } = useRadioGroupContext()
  const { itemProps, describedById: itemDescriptionId } =
    useRadioGroupItemContext()
  const styles = radioGroupVariants({ size, variant })
  const inputProps = getControlledChoiceInputProps(
    mergeChoiceInputProps(props, api.getItemHiddenInputProps(itemProps)),
    api.getItemState(itemProps).checked
  )

  return (
    <input
      className={styles.hiddenInput({ className })}
      ref={ref}
      {...inputProps}
      aria-describedby={joinDescribedBy(
        props["aria-describedby"],
        callerDescribedBy,
        describedById,
        itemDescriptionId
      )}
      aria-errormessage={
        validateStatus === "error" || errorMessageId
          ? errorMessageId
          : undefined
      }
      aria-invalid={
        api.getItemState(itemProps).invalid || !!errorMessageId || undefined
      }
      disabled={api.getItemState(itemProps).disabled}
      onKeyDown={(event) => {
        inputProps.onKeyDown?.(event)
        if (!readOnly) {
          handleChoiceArrowKey(event)
        }
      }}
      onKeyDownCapture={(event) => {
        props.onKeyDownCapture?.(event)
        if (
          readOnly &&
          [
            " ",
            "ArrowLeft",
            "ArrowRight",
            "ArrowUp",
            "ArrowDown",
            "Home",
            "End",
          ].includes(event.key)
        ) {
          event.preventDefault()
          event.stopPropagation()
        }
      }}
      readOnly={readOnly}
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
        data-readonly={api.getRootProps()["aria-readonly"] ? "" : undefined}
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
  const { itemProps, registerDescription } = useRadioGroupItemContext()
  const generatedId = useId()
  const id = props.id ?? generatedId
  useRegisterDescription(id, registerDescription)
  const styles = radioGroupVariants({ size, variant })
  const itemState = api.getItemState(itemProps)

  return (
    <div
      className={styles.itemDescription({ className })}
      data-disabled={itemState.disabled || undefined}
      ref={ref}
      {...props}
      id={id}
    >
      {children}
    </div>
  )
}

type RadioGroupStatusTextProps = Omit<
  ComponentPropsWithoutRef<typeof StatusTextComponent>,
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
  const { size, validateStatus, registerDescription, registerError } =
    useRadioGroupContext()
  const generatedId = useId()
  const id = props.id ?? generatedId
  const effectiveSize = sizeProp ?? size
  const effectiveStatus = status ?? validateStatus
  useRegisterDescription(id, registerDescription)
  useRegisterDescription(
    id,
    effectiveStatus === "error" ? registerError : ignoreDescription
  )

  return (
    <StatusTextComponent
      showIcon={effectiveStatus !== "default" || showIcon}
      size={effectiveSize}
      status={effectiveStatus}
      {...props}
      id={id}
    >
      {children}
    </StatusTextComponent>
  )
}

export { radioGroupVariants, useRadioGroupContext }

RadioGroup.displayName = "RadioGroup"
