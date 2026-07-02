import { normalizeProps, Portal, useMachine } from "@zag-js/react"
import {
  connect as connectSelect,
  collection as createSelectCollection,
  type Props as SelectMachineProps,
  type Service as SelectService,
  machine as selectMachine,
} from "@zag-js/select"
import {
  type ComponentPropsWithoutRef,
  createContext,
  type ReactNode,
  type Ref,
  useContext,
  useId,
} from "react"
import { tv, type VariantProps } from "tailwind-variants"
import { ActionIcon } from "../atoms/action-icon"
import { Button } from "../atoms/button"
import { Icon, type IconProps } from "../atoms/icon"
import { Label } from "../atoms/label"
import { StatusText } from "../atoms/status-text"

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
    control: ["relative flex items-center justify-between", "w-full"],
    positioner: ["w-(--reference-width)", "isolate z-(--z-index)"],
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
    itemIndicator: ["text-select-indicator"],
    itemText: ["flex-grow"],
    itemGroup: [""],
    itemGroupLabel: ["px-select-item-x", "font-medium text-select-fg-disabled"],
    valueText: [
      "flex-grow truncate font-normal",
      "data-[placeholder]:font-normal data-[placeholder]:text-select-placeholder",
    ],
  },
  variants: {
    size: {
      xs: {
        trigger: "p-select-trigger-sm text-select-trigger-xs",
        item: "text-select-item-xs",
        valueText: "text-select-value-xs",
        itemGroupLabel: "text-select-item-group-label-xs",
      },
      sm: {
        trigger:
          "h-form-control-sm rounded-select-sm p-select-trigger-sm text-select-trigger-sm",
        item: "text-select-item-sm",
        valueText: "text-select-value-sm",
        itemGroupLabel: "text-select-item-group-label-sm",
      },
      md: {
        trigger:
          "h-form-control-md rounded-select-md p-select-trigger-md text-select-trigger-md",
        item: "text-select-item-md",
        valueText: "text-select-value-md",
        itemGroupLabel: "text-select-item-group-label-md",
      },
      lg: {
        trigger: "p-select-trigger-md text-select-trigger-lg",
        item: "text-select-item-lg",
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
}

const SelectContext = createContext<SelectContextValue | null>(null)

function useSelectContext() {
  const context = useContext(SelectContext)
  if (!context) {
    throw new Error("Select components must be used within Select.Root")
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
export interface SelectProps
  extends VariantProps<typeof selectVariants>,
    Omit<SelectMachineProps, "collection" | "id" | "invalid"> {
  items: SelectItem[]
  id?: string
  autoComplete?: string
  className?: string
  children: ReactNode
  ref?: Ref<HTMLDivElement>
  validateStatus?: "default" | "error" | "success" | "warning"
}

export function Select({
  items,
  id: providedId,
  autoComplete,
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
}: SelectProps) {
  const generatedId = useId()
  const id = providedId || generatedId

  // Derive invalid from validateStatus for Zag.js accessibility
  const invalid = validateStatus === "error"

  const collection = createSelectCollection({
    items,
    itemToString: (item) => item.displayValue || item.value,
    itemToValue: (item) => item.value,
    isItemDisabled: (item) => !!item.disabled,
  })

  const service = useMachine(selectMachine, {
    id,
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
    value,
    onValueChange,
    onOpenChange,
    onHighlightChange,
  })

  const api = connectSelect(service as SelectService, normalizeProps)
  const styles = selectVariants({ size })

  return (
    <SelectContext.Provider value={{ api, size, items, validateStatus }}>
      {/* Hidden form select for native form submission */}
      <select {...api.getHiddenSelectProps()} autoComplete={autoComplete}>
        {items.map((item) => (
          <option disabled={item.disabled} key={item.value} value={item.value}>
            {item.displayValue || item.value}
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
  ref?: Ref<HTMLLabelElement>
}

Select.Label = function SelectLabel({ children, ...props }: SelectLabelProps) {
  const { api } = useSelectContext()

  return (
    <Label {...api.getLabelProps()} {...props}>
      {children}
    </Label>
  )
}

interface SelectControlProps extends ComponentPropsWithoutRef<"div"> {
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
      ref={ref}
      {...api.getControlProps()}
      {...props}
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
  const { api, size: contextSize, validateStatus } = useSelectContext()
  const effectiveSize = sizeProp ?? contextSize
  const styles = selectVariants({ size: effectiveSize })

  // Map validateStatus to unified data-validation attribute
  const validationDataAttrs =
    validateStatus !== "default" ? { "data-validation": validateStatus } : {}

  return (
    <Button
      className={styles.trigger({ className })}
      ref={ref}
      size="current"
      theme="unstyled"
      {...api.getTriggerProps()}
      {...validationDataAttrs}
      {...props}
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

interface SelectValueTextProps
  extends Omit<ComponentPropsWithoutRef<"span">, "children"> {
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
    .filter(Boolean) as SelectItem[]

  const renderContent = () => {
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
  ref?: Ref<HTMLButtonElement>
}

Select.ClearTrigger = function SelectClearTrigger({
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

interface SelectContentProps extends ComponentPropsWithoutRef<"ul"> {
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
    <ul
      className={styles.content({ className })}
      ref={ref}
      {...api.getContentProps()}
      {...props}
    >
      {children}
    </ul>
  )
}

interface SelectItemGroupProps extends ComponentPropsWithoutRef<"div"> {
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
      {...api.getItemGroupProps({ id })}
      {...props}
    >
      {children}
    </div>
  )
}

interface SelectItemGroupLabelProps extends ComponentPropsWithoutRef<"div"> {
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
      {...api.getItemGroupLabelProps({ htmlFor })}
      {...props}
    >
      {children}
    </div>
  )
}

interface SelectItemProps extends ComponentPropsWithoutRef<"li"> {
  item: SelectItem
  size?: SelectSize
  ref?: Ref<HTMLLIElement>
}

Select.Item = function SelectOptionItem({
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
        {...api.getItemProps({ item })}
        {...props}
      >
        {children}
      </li>
    </SelectItemContext.Provider>
  )
}

interface SelectItemTextProps extends ComponentPropsWithoutRef<"span"> {
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
      {...api.getItemTextProps({ item })}
      {...props}
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
      {...api.getItemIndicatorProps({ item })}
      {...props}
    >
      <Icon icon="token-icon-select-check" size={iconSize} />
    </span>
  )
}

interface SelectStatusTextProps extends ComponentPropsWithoutRef<"div"> {
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

export { useSelectContext, selectVariants }

Select.displayName = "Select"
