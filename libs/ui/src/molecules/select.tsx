/**
 * Select — @techsio/ui-kit molecule.
 *
 * @component Select
 * @componentVersion v1.2.1
 * @skill select-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the select-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { mergeProps, normalizeProps, Portal, useMachine } from "@zag-js/react"
import {
  connect as connectSelect,
  collection as createSelectCollection,
  machine as selectMachine,
  type Props as ZagSelectProps,
} from "@zag-js/select"
import {
  type ComponentPropsWithoutRef,
  createContext,
  type ReactNode,
  type Ref,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import type { VariantProps } from "tailwind-variants"
import { ActionIcon } from "../atoms/action-icon"
import { Button } from "../atoms/button"
import { Icon, type IconProps } from "../atoms/icon"
import { Label } from "../atoms/label"
import { StatusText as StatusTextComponent } from "../atoms/status-text"
import {
  type DescribedBy,
  joinDescribedBy,
  useDescribedBy,
  useRegisterDescription,
} from "../internal/described-by"
import { tv } from "../utils"

export type SelectSize = "xs" | "sm" | "md" | "lg"

// The icon-control scale only has sm/md/lg; the Select `xs` size shares `sm`.
const toControlSize = (size: SelectSize): "sm" | "md" | "lg" =>
  size === "xs" ? "sm" : size
const controlGlyphClass: Record<"sm" | "md" | "lg", string> = {
  sm: "text-icon-control-sm",
  md: "text-icon-control-md",
  lg: "text-icon-control-lg",
}

export type SelectItem = {
  label: ReactNode
  value: string
  disabled?: boolean
  displayValue?: string
  [key: string]: unknown
}

const selectVariants = tv({
  slots: {
    root: ["relative", "flex flex-col gap-select", "w-full"],
    control: [
      "select-clear-gutter relative flex items-center justify-between",
      "w-full",
    ],
    // Zag sets `min-width: max-content` inline, so this resolves to
    // max(trigger width, content width) — the panel is never narrower than
    // the control that opened it.
    positioner: ["popup-layer isolate w-(--reference-width)"],
    trigger: [
      "form-control-base w-full",
      "border-select-trigger-border",
      "group",
      "flex items-center justify-between gap-0",
      "font-normal",
      "text-start",
      "hover:bg-select-trigger-bg-hover",
      "hover:border-select-trigger-border-hover",
      "focus:border-select-trigger-border-focus",
      "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-select-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
      "data-[disabled]:cursor-not-allowed",
      "data-[disabled]:bg-select-bg-disabled",
      "data-[disabled]:text-select-fg-disabled",
      "data-[disabled]:border-select-border-disabled",
      "data-[validation=error]:border-(length:--border-width-validation)",
      "data-[validation=error]:border-select-border-error data-[validation=error]:outline-select-border-error",
      "data-[validation=error]:outline-(style:--default-ring-style) data-[validation=error]:outline-(length:--default-ring-width)",
      "data-[validation=error]:outline-offset-(length:--default-ring-offset)",
      "data-[validation=success]:border-(length:--border-width-validation)",
      "data-[validation=success]:border-select-border-success data-[validation=success]:outline-select-border-success",
      "data-[validation=success]:outline-(style:--default-ring-style) data-[validation=success]:outline-(length:--default-ring-width)",
      "data-[validation=success]:outline-offset-(length:--default-ring-offset)",
      "data-[validation=warning]:border-(length:--border-width-validation)",
      "data-[validation=warning]:border-select-border-warning data-[validation=warning]:outline-select-border-warning",
      "data-[validation=warning]:outline-(style:--default-ring-style) data-[validation=warning]:outline-(length:--default-ring-width)",
      "data-[validation=warning]:outline-offset-(length:--default-ring-offset)",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    // Clear (an ActionIcon) sits just left of the chevron with no gap; it owns
    // its own size, glyph and neutral hover pill.
    clearTrigger: ["absolute end-select-right top-1/2 -translate-y-1/2"],
    content: [
      "popup-surface-base popup-layer",
      "w-full",
      "duration-200 ease-out motion-safe:transition-[opacity,display,translate,scale] motion-reduce:transition-none motion-reduce:duration-0",
      "transition-discrete",
      "starting:scale-98 starting:opacity-0",
      "data-[state=open]:starting:scale-98 data-[state=open]:starting:opacity-0",
      "data-[state=open]:scale-100 data-[state=open]:opacity-100",
      "data-[state=closed]:scale-98 data-[state=closed]:opacity-0",
    ],
    item: [
      "popup-item-base",
      "hover:bg-popup-item-bg-hover",
      "data-[highlighted]:bg-popup-item-bg-hover",
      "data-[state=checked]:bg-popup-item-bg-selected",
      "data-[state=checked]:text-popup-item-fg-selected",
      "data-[disabled]:cursor-not-allowed data-[disabled]:text-popup-item-fg-disabled",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    // Absolutely positioned inside the reserved end gutter so the label never
    // shifts when the selection changes.
    itemIndicator: [
      "absolute end-(--popup-item-x) top-1/2 -translate-y-1/2",
      "flex items-center justify-center",
      "size-(--size-popup-indicator) text-popup-item-fg-selected",
    ],
    itemText: ["min-w-0 flex-grow truncate"],
    itemGroup: [""],
    itemGroupLabel: [
      "px-(--popup-item-x) py-(--popup-item-y)",
      "font-medium text-popup-item-fg-muted",
    ],
    valueText: [
      "min-w-0 flex-1 truncate font-normal",
      "data-[placeholder]:font-normal data-[placeholder]:text-select-placeholder",
    ],
  },
  variants: {
    size: {
      xs: {
        trigger:
          "h-form-control-sm rounded-select-sm p-select-trigger-sm text-select-trigger-xs",
        content: "popup-size-xs text-select-item-xs",
        valueText: "text-select-value-xs",
        itemGroupLabel: "text-select-item-group-label-xs",
      },
      sm: {
        trigger:
          "h-form-control-sm rounded-select-sm p-select-trigger-sm text-select-trigger-sm",
        content: "popup-size-sm text-select-item-sm",
        valueText: "text-select-value-sm",
        itemGroupLabel: "text-select-item-group-label-sm",
      },
      md: {
        trigger:
          "h-form-control-md rounded-select-md p-select-trigger-md text-select-trigger-md",
        content: "popup-size-md text-select-item-md",
        valueText: "text-select-value-md",
        itemGroupLabel: "text-select-item-group-label-md",
      },
      lg: {
        trigger:
          "h-form-control-lg rounded-select-lg p-select-trigger-md text-select-trigger-lg",
        content: "popup-size-lg text-select-item-lg",
        valueText: "text-select-value-lg",
        itemGroupLabel: "text-select-item-group-label-lg",
      },
    },
  },
  defaultVariants: {
    size: "md",
  },
})

type SelectContextValue = {
  api: ReturnType<typeof connectSelect>
  size: SelectSize
  items: SelectItem[]
  validateStatus: "default" | "error" | "success" | "warning"
  readOnly: boolean
  disabled: boolean
  readOnlyId: string
  errors: DescribedBy
} & DescribedBy

const SelectContext = createContext<SelectContextValue | null>(null)

function useSelectContext() {
  const context = useContext(SelectContext)
  if (!context) {
    throw new Error("Select components must be used within Select")
  }
  return context
}

// Item context for sharing item-specific state
type SelectItemContextValue = {
  item: SelectItem
}

const SelectItemContext = createContext<SelectItemContextValue | null>(null)

function useSelectItemContext() {
  const context = useContext(SelectItemContext)
  if (!context) {
    throw new Error("Select.Item components must be used within Select.Item")
  }
  return context
}

// === ROOT COMPONENT ===
export type SelectProps = VariantProps<typeof selectVariants> &
  Omit<ZagSelectProps, "collection" | "id" | "invalid"> & {
    /** Authoritative options; removed values are cleared, not replaced implicitly. */
    items: SelectItem[]
    id?: string
    className?: string
    children: ReactNode
    ref?: Ref<HTMLDivElement>
    validateStatus?: "default" | "error" | "success" | "warning"
  }

export function Select({
  items,
  id: providedId,
  size = "md",
  // Zag.js props
  value,
  defaultValue,
  multiple = false,
  disabled = false,
  validateStatus = "default",
  required = false,
  readOnly = false,
  closeOnSelect = true,
  loopFocus = true,
  name,
  form,
  onValueChange,
  onOpenChange,
  onHighlightChange,

  className,
  children,
  ref,
  ...machineProps
}: SelectProps) {
  const generatedId = useId()
  const id = providedId || generatedId

  // Derive invalid from validateStatus for Zag.js accessibility
  const invalid = validateStatus === "error"

  const [internalValue, setInternalValue] = useState(defaultValue ?? [])
  const requestedValue = value ?? internalValue
  const effectiveValue = requestedValue.filter((selected) =>
    items.some((item) => item.value === selected)
  )
  const reconciliation = useRef<string | null>(null)

  const collection = useMemo(
    () =>
      createSelectCollection({
        items,
        itemToString: (item) =>
          item.displayValue ??
          (typeof item.label === "string" || typeof item.label === "number"
            ? String(item.label)
            : item.value),
        itemToValue: (item) => item.value,
        isItemDisabled: (item) => !!item.disabled,
      }),
    [items]
  )

  const service = useMachine(selectMachine, {
    ...machineProps,
    id,
    open: readOnly || disabled ? false : machineProps.open,
    defaultOpen: readOnly || disabled ? false : machineProps.defaultOpen,
    collection,
    name,
    form,
    multiple,
    disabled,
    invalid,
    required,
    readOnly,
    closeOnSelect,
    loopFocus,
    defaultValue,
    value: effectiveValue,
    highlightedValue:
      machineProps.highlightedValue &&
      (!collection.has(machineProps.highlightedValue) ||
        collection.getItemDisabled(
          collection.find(machineProps.highlightedValue)
        ))
        ? null
        : machineProps.highlightedValue,
    onValueChange: (details) => {
      if (!(readOnly || disabled)) {
        if (value === undefined) {
          setInternalValue(details.value)
        }
        onValueChange?.(details)
      }
    },
    onOpenChange,
    onHighlightChange,
  })

  // Collection updates are parent-owned changes, including while read-only.
  // Request controlled correction once; never select an arbitrary replacement.
  useEffect(() => {
    if (effectiveValue.length === requestedValue.length) {
      reconciliation.current = null
      return
    }
    const key = JSON.stringify([requestedValue, effectiveValue])
    if (reconciliation.current === key) {
      return
    }
    reconciliation.current = key
    if (value === undefined) {
      setInternalValue(effectiveValue)
    }
    onValueChange?.({
      value: effectiveValue,
      items: collection.findMany(effectiveValue),
    })
  }, [collection, effectiveValue, requestedValue, value, onValueChange])

  const api = connectSelect(service, normalizeProps)
  useEffect(() => {
    const highlighted = service.context.get("highlightedValue")
    if (
      highlighted &&
      (!collection.has(highlighted) ||
        collection.getItemDisabled(collection.find(highlighted)))
    ) {
      service.send({ type: "HIGHLIGHTED_VALUE.CLEAR" })
    }
  }, [collection, service])
  const { defaultValue: _nativeDefaultValue, ...hiddenSelectProps } =
    api.getHiddenSelectProps()
  const styles = selectVariants({ size })
  const describedBy = useDescribedBy()
  const errors = useDescribedBy()

  return (
    <SelectContext.Provider
      value={{
        api,
        size,
        items,
        validateStatus,
        readOnly,
        disabled,
        readOnlyId: `${id}-readonly`,
        errors,
        ...describedBy,
      }}
    >
      {/* Hidden form select for native form submission */}
      <select
        {...hiddenSelectProps}
        onChange={(event) => {
          if (readOnly || disabled) {
            event.preventDefault()
            for (const option of event.currentTarget.options) {
              option.selected = api.value.includes(option.value)
            }
            return
          }
          if (!multiple && event.currentTarget.value === "") {
            api.setValue([])
          } else {
            api.getHiddenSelectProps().onChange?.(event)
          }
        }}
        onInput={(event) => {
          if (readOnly || disabled) {
            event.preventDefault()
            for (const option of event.currentTarget.options) {
              option.selected = api.value.includes(option.value)
            }
            return
          }
          if (!multiple && event.currentTarget.value === "") {
            api.setValue([])
          } else {
            api.getHiddenSelectProps().onInput?.(event)
          }
        }}
        value={multiple ? effectiveValue : (effectiveValue[0] ?? "")}
      >
        {!multiple && <option value="" />}
        {items.map((item) => (
          <option
            disabled={item.disabled && !effectiveValue.includes(item.value)}
            key={item.value}
            value={item.value}
          >
            {item.displayValue ??
              (typeof item.label === "string" || typeof item.label === "number"
                ? String(item.label)
                : item.value)}
          </option>
        ))}
      </select>

      <div
        className={styles.root({ className })}
        ref={ref}
        {...api.getRootProps()}
      >
        {children}
        {readOnly && !disabled && (
          <span className="sr-only" id={`${id}-readonly`}>
            Read-only selection
          </span>
        )}
      </div>
    </SelectContext.Provider>
  )
}

type SelectLabelProps = ComponentPropsWithoutRef<"label"> & {
  ref?: Ref<HTMLLabelElement>
}

Select.Label = function SelectLabel({ children, ...props }: SelectLabelProps) {
  const { api, size } = useSelectContext()

  return (
    <Label
      size={toControlSize(size)}
      {...mergeProps(api.getLabelProps(), props)}
    >
      {children}
    </Label>
  )
}

type SelectControlProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

Select.Control = function SelectControl({
  children,
  className,
  ref,
  ...props
}: SelectControlProps) {
  const { api, size } = useSelectContext()
  const styles = selectVariants({ size })

  return (
    <div
      className={styles.control({ className })}
      data-size={toControlSize(size)}
      ref={ref}
      {...mergeProps(api.getControlProps(), props)}
    >
      {children}
    </div>
  )
}

type SelectTriggerProps = ComponentPropsWithoutRef<"button"> & {
  size?: SelectSize
  iconSize?: IconProps["size"]
  ref?: Ref<HTMLButtonElement>
}

Select.Trigger = function SelectTrigger({
  children,
  className,
  size: sizeProp,
  iconSize,
  ref,
  ...props
}: SelectTriggerProps) {
  const {
    api,
    size: contextSize,
    validateStatus,
    describedById,
    errors,
    readOnly,
    disabled,
    readOnlyId,
  } = useSelectContext()
  const effectiveSize = sizeProp ?? contextSize
  const styles = selectVariants({ size: effectiveSize })

  // Map validateStatus to unified data-validation attribute
  const validationDataAttrs =
    validateStatus === "default" ? {} : { "data-validation": validateStatus }

  return (
    <Button
      className={styles.trigger({ className })}
      ref={ref}
      size="current"
      theme="unstyled"
      {...mergeProps(api.getTriggerProps(), props)}
      disabled={disabled || props.disabled}
      {...validationDataAttrs}
      aria-describedby={joinDescribedBy(
        props["aria-describedby"],
        describedById,
        readOnly && !disabled ? readOnlyId : undefined
      )}
      aria-errormessage={joinDescribedBy(
        props["aria-errormessage"],
        validateStatus === "error" ? errors.describedById : undefined
      )}
      aria-invalid={
        validateStatus === "error" || props["aria-invalid"] || undefined
      }
      aria-readonly={(readOnly && !disabled) || undefined}
    >
      {children}
      {!readOnly && (
        <Icon
          className={`shrink-0 ${controlGlyphClass[toControlSize(effectiveSize)]} text-select-trigger-fg-base group-hover:text-select-trigger-fg-hover motion-safe:transition-[transform,color] motion-safe:duration-200 motion-reduce:transition-none ${
            api.open ? "rotate-180" : "rotate-none"
          }`}
          icon="token-icon-select-indicator"
          size={iconSize ?? "current"}
        />
      )}
    </Button>
  )
}

type SelectValueTextProps = Omit<
  ComponentPropsWithoutRef<"span">,
  "children"
> & {
  placeholder?: string
  size?: SelectSize
  ref?: Ref<HTMLSpanElement>
  children?: ReactNode | ((items: SelectItem[]) => ReactNode)
}

Select.ValueText = function SelectValueText({
  placeholder = "Select an option",
  className,
  size: sizeProp,
  ref,
  children,
  ...props
}: SelectValueTextProps) {
  const { api, size: contextSize, items } = useSelectContext()
  const effectiveSize = sizeProp ?? contextSize
  const styles = selectVariants({ size: effectiveSize })

  const hasValue = api.value.length > 0
  const selectedItems = api.value
    .map((v) => items.find((item) => item.value === v))
    .filter((item) => item !== undefined)

  const renderContent = () => {
    if (!hasValue) {
      return placeholder
    }

    if (typeof children === "function") {
      return children(selectedItems)
    }

    if (children !== undefined) {
      return children
    }

    return selectedItems.map((item, index) => (
      <span key={item.value}>
        {index > 0 ? ", " : ""}
        {item.label}
      </span>
    ))
  }

  return (
    <span
      {...api.getValueTextProps()}
      className={styles.valueText({ className })}
      data-placeholder={!hasValue || undefined}
      ref={ref}
      {...props}
    >
      {renderContent()}
    </span>
  )
}

type SelectClearTriggerProps = ComponentPropsWithoutRef<"button"> & {
  ref?: Ref<HTMLButtonElement>
}

Select.ClearTrigger = function SelectClearTrigger({
  className,
  ref,
  ...props
}: SelectClearTriggerProps) {
  const { api, size, readOnly, disabled } = useSelectContext()
  const styles = selectVariants({ size })
  if (readOnly) {
    return null
  }

  return (
    <ActionIcon
      className={styles.clearTrigger({ className })}
      icon="token-icon-select-clear"
      ref={ref}
      size={toControlSize(size)}
      tone="neutral"
      {...mergeProps(api.getClearTriggerProps(), props)}
      aria-label={props["aria-label"] ?? "Clear selection"}
      disabled={disabled || props.disabled}
      type="button"
    />
  )
}

type SelectPositionerProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

Select.Positioner = function SelectPositioner({
  children,
  className,
  ref,
  ...props
}: SelectPositionerProps) {
  const { api, size } = useSelectContext()
  const styles = selectVariants({ size })

  return (
    <Portal>
      <div
        className={styles.positioner({ className })}
        ref={ref}
        {...api.getPositionerProps()}
        {...props}
      >
        {children}
      </div>
    </Portal>
  )
}

type SelectContentProps = ComponentPropsWithoutRef<"ul"> & {
  ref?: Ref<HTMLUListElement>
}

Select.Content = function SelectContent({
  children,
  className,
  ref,
  ...props
}: SelectContentProps) {
  const { api, size } = useSelectContext()
  const styles = selectVariants({ size })

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: Zag supplies role=listbox and tabIndex; the consumer handler must run before its keyboard action.
    <ul
      className={styles.content({ className })}
      ref={ref}
      {...mergeProps(api.getContentProps(), props)}
      onKeyDown={(event) => {
        props.onKeyDown?.(event)
        if (!event.defaultPrevented) {
          api.getContentProps().onKeyDown?.(event)
        }
      }}
    >
      {children}
    </ul>
  )
}

type SelectItemGroupProps = ComponentPropsWithoutRef<"div"> & {
  id: string
  ref?: Ref<HTMLDivElement>
}

Select.ItemGroup = function SelectItemGroup({
  id,
  children,
  className,
  ref,
  ...props
}: SelectItemGroupProps) {
  const { api, size } = useSelectContext()
  const styles = selectVariants({ size })

  return (
    <div
      className={styles.itemGroup({ className })}
      ref={ref}
      {...mergeProps(api.getItemGroupProps({ id }), props)}
    >
      {children}
    </div>
  )
}

type SelectItemGroupLabelProps = ComponentPropsWithoutRef<"div"> & {
  htmlFor: string
  ref?: Ref<HTMLDivElement>
}

Select.ItemGroupLabel = function SelectItemGroupLabel({
  htmlFor,
  children,
  className,
  ref,
  ...props
}: SelectItemGroupLabelProps) {
  const { api, size } = useSelectContext()
  const styles = selectVariants({ size })

  return (
    <div
      className={styles.itemGroupLabel({ className })}
      ref={ref}
      {...mergeProps(api.getItemGroupLabelProps({ htmlFor }), props)}
    >
      {children}
    </div>
  )
}

type SelectItemProps = ComponentPropsWithoutRef<"li"> & {
  item: SelectItem
  size?: SelectSize
  ref?: Ref<HTMLLIElement>
}

Select.Item = function SelectItem({
  item,
  children,
  className,
  size: sizeProp,
  ref,
  ...props
}: SelectItemProps) {
  const { api, size: contextSize } = useSelectContext()
  const effectiveSize = sizeProp ?? contextSize
  const styles = selectVariants({ size: effectiveSize })

  return (
    <SelectItemContext.Provider value={{ item }}>
      <li
        className={styles.item({ className })}
        ref={ref}
        {...mergeProps(api.getItemProps({ item }), props)}
      >
        {children}
      </li>
    </SelectItemContext.Provider>
  )
}

type SelectItemTextProps = ComponentPropsWithoutRef<"span"> & {
  ref?: Ref<HTMLSpanElement>
}

Select.ItemText = function SelectItemText({
  children,
  className,
  ref,
  ...props
}: SelectItemTextProps) {
  const { api, size } = useSelectContext()
  const { item } = useSelectItemContext()
  const styles = selectVariants({ size })

  return (
    <span
      className={styles.itemText({ className })}
      ref={ref}
      {...mergeProps(api.getItemTextProps({ item }), props)}
    >
      {children || item.label}
    </span>
  )
}

type SelectItemIndicatorProps = ComponentPropsWithoutRef<"span"> & {
  iconSize?: IconProps["size"]
  ref?: Ref<HTMLSpanElement>
}

Select.ItemIndicator = function SelectItemIndicator({
  className,
  iconSize,
  ref,
  ...props
}: SelectItemIndicatorProps) {
  const { api, size } = useSelectContext()
  const { item } = useSelectItemContext()
  const styles = selectVariants({ size })

  return (
    <span
      className={styles.itemIndicator({ className })}
      ref={ref}
      {...mergeProps(api.getItemIndicatorProps({ item }), props)}
    >
      <Icon icon="token-icon-select-check" size={iconSize} />
    </span>
  )
}

type SelectStatusTextProps = ComponentPropsWithoutRef<"div"> & {
  status?: "default" | "error" | "success" | "warning"
  size?: SelectSize
  showIcon?: boolean
  ref?: Ref<HTMLDivElement>
}

Select.StatusText = function SelectStatusText({
  status: statusProp,
  size: sizeProp,
  showIcon,
  children,
  ...props
}: SelectStatusTextProps) {
  const {
    size: contextSize,
    validateStatus: contextValidateStatus,
    errors,
    registerDescription,
  } = useSelectContext()
  const generatedId = useId()
  const id = props.id ?? `${generatedId}-status`
  useRegisterDescription(id, registerDescription)

  const effectiveSize = sizeProp ?? contextSize

  const effectiveStatus = statusProp ?? contextValidateStatus
  useEffect(
    () =>
      effectiveStatus === "error" ? errors.registerDescription(id) : undefined,
    [effectiveStatus, errors.registerDescription, id]
  )

  return (
    <StatusTextComponent
      showIcon={showIcon}
      size={effectiveSize === "xs" ? "sm" : effectiveSize}
      status={effectiveStatus}
      {...props}
      id={id}
    >
      {children}
    </StatusTextComponent>
  )
}

export { selectVariants, useSelectContext }

Select.displayName = "Select"
