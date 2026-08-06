/*
 * Select — @techsio/ui-kit molecule.
 *
 * @component Select
 * @componentVersion v1.0.1
 * @skill select-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the select-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { mergeProps, normalizeProps, Portal, useMachine } from "@zag-js/react"
import { collection, connect, machine } from "@zag-js/select"
import type { Props as ZagSelectProps, Service } from "@zag-js/select"
import { createContext, useContext, useId } from "react"
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react"
import { tv } from "tailwind-variants"
import type { VariantProps } from "tailwind-variants"

import { ActionIcon } from "../atoms/action-icon"
import { Button } from "../atoms/button"
import { Icon } from "../atoms/icon"
import type { IconProps } from "../atoms/icon"
import { Label } from "../atoms/label"
import { StatusText } from "../atoms/status-text"

export type SelectSize = "xs" | "sm" | "md" | "lg"

export type SelectValidateStatus = "default" | "error" | "success" | "warning"

// The icon-control scale only has sm/md/lg; the Select `xs` size shares `sm`.
const toControlSize = (size: SelectSize): "sm" | "md" | "lg" =>
  size === "xs" ? "sm" : size
const controlGlyphClass: Record<"sm" | "md" | "lg", string> = {
  lg: "text-icon-control-lg",
  md: "text-icon-control-md",
  sm: "text-icon-control-sm",
}

export interface SelectItem {
  label: ReactNode
  value: string
  disabled?: boolean | undefined
  displayValue?: string | undefined
  [key: string]: unknown
}

const selectVariants = tv({
  defaultVariants: {
    size: "md",
  },
  slots: {
    // Clear (an ActionIcon) sits just left of the chevron with no gap; it owns
    // its own size, glyph and neutral hover pill.
    clearTrigger: ["-translate-y-1/2 absolute top-1/2 right-select-right"],
    content: [
      "border border-select-content-border bg-select-content-bg",
      "max-h-fit rounded-select shadow-select-content",
      "h-[calc(var(--available-height)-var(--spacing-content))]",
      "z-(--z-content) overflow-auto",
      "duration-200 ease-out motion-safe:transition-[opacity,display,translate]",
      "transition-discrete",
      "starting:-translate-y-2 starting:opacity-0",
      "data-[state=open]:starting:-translate-y-2 data-[state=open]:starting:opacity-0",
      "data-[state=open]:translate-y-0 data-[state=open]:opacity-100",
      "data-[state=closed]:-translate-y-2 data-[state=closed]:opacity-0",
    ],
    control: ["relative flex items-center justify-between", "w-full"],
    item: [
      "flex items-center justify-between",
      "cursor-pointer bg-select-item-bg-base",
      "p-select-item",
      "text-select-item-fg-base",
      "hover:bg-select-item-bg-hover",
      "data-[highlighted]:bg-select-item-bg-hover",
      "data-[state=checked]:bg-select-item-bg-selected",
      "data-[state=checked]:text-select-item-fg-selected",
      "data-[disabled]:cursor-not-allowed data-[disabled]:text-select-fg-disabled",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    itemGroup: [""],
    itemGroupLabel: ["px-select-item-x", "font-medium text-select-fg-disabled"],
    itemIndicator: ["text-select-indicator"],
    itemText: ["flex-grow"],
    positioner: ["w-(--reference-width)", "isolate z-(--z-index)"],
    root: ["relative", "flex flex-col gap-select", "w-full"],
    trigger: [
      "form-control-base w-full",
      "border-select-trigger-border",
      "group",
      "flex items-center justify-between gap-0",
      "font-normal",
      "text-left",
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
    valueText: [
      "flex-grow truncate font-normal",
      "data-[placeholder]:font-normal data-[placeholder]:text-select-placeholder",
    ],
  },
  variants: {
    size: {
      lg: {
        item: "text-select-item-lg",
        itemGroupLabel: "text-select-item-group-label-lg",
        trigger: "p-select-trigger-md text-select-trigger-lg",
        valueText: "text-select-value-lg",
      },
      md: {
        item: "text-select-item-md",
        itemGroupLabel: "text-select-item-group-label-md",
        trigger:
          "h-form-control-md rounded-select-md p-select-trigger-md text-select-trigger-md",
        valueText: "text-select-value-md",
      },
      sm: {
        item: "text-select-item-sm",
        itemGroupLabel: "text-select-item-group-label-sm",
        trigger:
          "h-form-control-sm rounded-select-sm p-select-trigger-sm text-select-trigger-sm",
        valueText: "text-select-value-sm",
      },
      xs: {
        item: "text-select-item-xs",
        itemGroupLabel: "text-select-item-group-label-xs",
        trigger: "p-select-trigger-sm text-select-trigger-xs",
        valueText: "text-select-value-xs",
      },
    },
  },
})

interface SelectContextValue {
  api: ReturnType<typeof connect>
  size: SelectSize
  items: SelectItem[]
  validateStatus: SelectValidateStatus
}

// The provider values are built through these factories so the objects are not
// constructed inside the JSX attribute; React Compiler handles the caching, so
// no manual memoization is added here.
const createSelectContextValue = (
  value: SelectContextValue,
): SelectContextValue => value

const SelectContext = createContext<SelectContextValue | null>(null)

export const useSelectContext = (): SelectContextValue => {
  const context = useContext(SelectContext)
  if (!context) {
    throw new Error("Select components must be used within Select.Root")
  }
  return context
}

// Item context for sharing item-specific state
interface SelectItemContextValue {
  item: SelectItem
}

const createSelectItemContextValue = (
  item: SelectItem,
): SelectItemContextValue => ({ item })

const SelectItemContext = createContext<SelectItemContextValue | null>(null)

const useSelectItemContext = (): SelectItemContextValue => {
  const context = useContext(SelectItemContext)
  if (!context) {
    throw new Error("Select.Item components must be used within Select.Item")
  }
  return context
}

// === ROOT COMPONENT ===
export interface SelectProps
  extends
    VariantProps<typeof selectVariants>,
    Omit<ZagSelectProps, "collection" | "id" | "invalid"> {
  items: SelectItem[]
  id?: string | undefined
  className?: string | undefined
  children: ReactNode
  ref?: Ref<HTMLDivElement> | undefined
  validateStatus?: SelectValidateStatus | undefined
}

export const Select = ({
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
}: SelectProps) => {
  const generatedId = useId()
  // Empty ids are treated as "not provided", matching the previous `||` fallback.
  const id =
    providedId !== undefined && providedId !== "" ? providedId : generatedId

  // Derive invalid from validateStatus for Zag.js accessibility
  const invalid = validateStatus === "error"

  const itemCollection = collection({
    isItemDisabled: (item) => item.disabled === true,
    itemToString: (item) =>
      item.displayValue !== undefined && item.displayValue !== ""
        ? item.displayValue
        : item.value,
    itemToValue: (item) => item.value,
    items,
  })

  const service = useMachine(machine, {
    closeOnSelect,
    collection: itemCollection,
    defaultValue,
    disabled,
    form,
    id,
    invalid,
    loopFocus,
    multiple,
    name,
    onHighlightChange,
    onOpenChange,
    onValueChange,
    readOnly,
    required,
    value,
  })

  const api = connect(service as Service, normalizeProps)
  const styles = selectVariants({ size })

  const contextValue = createSelectContextValue({
    api,
    items,
    size,
    validateStatus,
  })

  return (
    <SelectContext.Provider value={contextValue}>
      {/* Hidden form select for native form submission */}
      <select {...api.getHiddenSelectProps()}>
        {items.map((item) => (
          <option disabled={item.disabled} key={item.value} value={item.value}>
            {item.displayValue !== undefined && item.displayValue !== ""
              ? item.displayValue
              : item.value}
          </option>
        ))}
      </select>

      <div
        className={styles.root({ className })}
        ref={ref}
        {...api.getRootProps()}
      >
        {children}
      </div>
    </SelectContext.Provider>
  )
}

interface SelectLabelProps extends ComponentPropsWithoutRef<"label"> {
  ref?: Ref<HTMLLabelElement> | undefined
}

// Kept as `SelectLabel` because a function named `Label` would shadow the
// imported Label atom this component renders.
const SelectLabel = ({ children, ...props }: SelectLabelProps) => {
  const { api } = useSelectContext()

  return <Label {...mergeProps(api.getLabelProps(), props)}>{children}</Label>
}

Select.Label = SelectLabel

interface SelectControlProps extends ComponentPropsWithoutRef<"div"> {
  ref?: Ref<HTMLDivElement> | undefined
}

Select.Control = function Control({
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
      ref={ref}
      {...mergeProps(api.getControlProps(), props)}
    >
      {children}
    </div>
  )
}

type SelectTriggerProps = ComponentPropsWithoutRef<"button"> & {
  size?: SelectSize | undefined
  iconSize?: IconProps["size"] | undefined
  ref?: Ref<HTMLButtonElement> | undefined
}

Select.Trigger = function Trigger({
  children,
  className,
  size: sizeProp,
  iconSize,
  ref,
  ...props
}: SelectTriggerProps) {
  const { api, size: contextSize, validateStatus } = useSelectContext()
  const effectiveSize = sizeProp ?? contextSize
  const styles = selectVariants({ size: effectiveSize })

  // Map validateStatus to unified data-validation attribute
  const triggerProps = mergeProps(api.getTriggerProps(), props)

  return (
    <Button
      {...triggerProps}
      className={styles.trigger({ className })}
      data-validation={
        validateStatus === "default" ? undefined : validateStatus
      }
      ref={ref}
      size="current"
      theme="unstyled"
    >
      {children}
      <Icon
        className={`${controlGlyphClass[toControlSize(effectiveSize)]} text-select-trigger-fg-base group-hover:text-select-trigger-fg-hover motion-safe:transition-[transform,color] motion-safe:duration-200 motion-reduce:transition-none ${
          api.open ? "rotate-180" : "rotate-0"
        }`}
        icon="token-icon-select-indicator"
        size={iconSize ?? "current"}
      />
    </Button>
  )
}

interface SelectValueTextProps extends Omit<
  ComponentPropsWithoutRef<"span">,
  "children"
> {
  placeholder?: string | undefined
  size?: SelectSize | undefined
  ref?: Ref<HTMLSpanElement> | undefined
  children?: (ReactNode | ((items: SelectItem[]) => ReactNode)) | undefined
}

Select.ValueText = function ValueText({
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
  const selectedItems = api.value.flatMap((selectedValue) => {
    const match = items.find((item) => item.value === selectedValue)
    return match === undefined ? [] : [match]
  })

  const renderContent = (): ReactNode => {
    if (!hasValue) {
      return placeholder
    }

    if (typeof children === "function") {
      return children(selectedItems)
    }

    return selectedItems[0]?.label
  }

  return (
    <span
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
  ref?: Ref<HTMLButtonElement> | undefined
}

Select.ClearTrigger = function ClearTrigger({
  className,
  ref,
  ...props
}: SelectClearTriggerProps) {
  const { api, size } = useSelectContext()
  const styles = selectVariants({ size })

  return (
    <ActionIcon
      className={styles.clearTrigger({ className })}
      icon="token-icon-select-clear"
      ref={ref}
      size={toControlSize(size)}
      tone="neutral"
      {...api.getClearTriggerProps()}
      aria-label="Clear selection"
      {...props}
    />
  )
}

interface SelectPositionerProps extends ComponentPropsWithoutRef<"div"> {
  ref?: Ref<HTMLDivElement> | undefined
}

Select.Positioner = function Positioner({
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
        {...mergeProps(api.getPositionerProps(), props)}
      >
        {children}
      </div>
    </Portal>
  )
}

interface SelectContentProps extends ComponentPropsWithoutRef<"ul"> {
  ref?: Ref<HTMLUListElement> | undefined
}

Select.Content = function Content({
  children,
  className,
  ref,
  ...props
}: SelectContentProps) {
  const { api, size } = useSelectContext()
  const styles = selectVariants({ size })

  return (
    <ul
      className={styles.content({ className })}
      ref={ref}
      {...mergeProps(api.getContentProps(), props)}
    >
      {children}
    </ul>
  )
}

interface SelectItemGroupProps extends ComponentPropsWithoutRef<"div"> {
  id: string
  ref?: Ref<HTMLDivElement> | undefined
}

Select.ItemGroup = function ItemGroup({
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

interface SelectItemGroupLabelProps extends ComponentPropsWithoutRef<"div"> {
  htmlFor: string
  ref?: Ref<HTMLDivElement> | undefined
}

Select.ItemGroupLabel = function ItemGroupLabel({
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

interface SelectItemProps extends ComponentPropsWithoutRef<"li"> {
  item: SelectItem
  size?: SelectSize | undefined
  ref?: Ref<HTMLLIElement> | undefined
}

Select.Item = function Item({
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

  const itemContextValue = createSelectItemContextValue(item)

  return (
    <SelectItemContext.Provider value={itemContextValue}>
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

interface SelectItemTextProps extends ComponentPropsWithoutRef<"span"> {
  ref?: Ref<HTMLSpanElement> | undefined
}

Select.ItemText = function ItemText({
  children,
  className,
  ref,
  ...props
}: SelectItemTextProps) {
  const { api, size } = useSelectContext()
  const { item } = useSelectItemContext()
  const styles = selectVariants({ size })
  const hasChildren = Boolean(children)

  return (
    <span
      className={styles.itemText({ className })}
      ref={ref}
      {...mergeProps(api.getItemTextProps({ item }), props)}
    >
      {hasChildren ? children : item.label}
    </span>
  )
}

type SelectItemIndicatorProps = ComponentPropsWithoutRef<"span"> & {
  iconSize?: IconProps["size"] | undefined
  ref?: Ref<HTMLSpanElement> | undefined
}

Select.ItemIndicator = function ItemIndicator({
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

interface SelectStatusTextProps extends ComponentPropsWithoutRef<"div"> {
  status?: SelectValidateStatus | undefined
  size?: SelectSize | undefined
  showIcon?: boolean | undefined
  ref?: Ref<HTMLDivElement> | undefined
}

// Kept as `SelectStatusText` because a function named `StatusText` would shadow
// the imported StatusText atom this component renders.
const SelectStatusText = ({
  status: statusProp,
  size: sizeProp,
  showIcon,
  children,
  ...props
}: SelectStatusTextProps) => {
  const { size: contextSize, validateStatus: contextValidateStatus } =
    useSelectContext()

  const effectiveSize = sizeProp ?? contextSize

  const effectiveStatus = statusProp ?? contextValidateStatus

  return (
    <StatusText
      showIcon={showIcon}
      size={effectiveSize === "xs" ? "sm" : effectiveSize}
      status={effectiveStatus}
      {...props}
    >
      {children}
    </StatusText>
  )
}

Select.StatusText = SelectStatusText

Select.displayName = "Select"
