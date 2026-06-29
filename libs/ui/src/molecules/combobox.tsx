import {
  machine as comboboxMachine,
  connect as connectCombobox,
  collection as createComboboxCollection,
} from "@zag-js/combobox"
import { normalizeProps, Portal, useMachine } from "@zag-js/react"
import { type ReactNode, useEffect, useId, useState } from "react"
import type { VariantProps } from "tailwind-variants"
import { ActionIcon } from "../atoms/action-icon"
import { Button } from "../atoms/button"
import { Icon, type IconProps, type IconType } from "../atoms/icon"
import { Input } from "../atoms/input"
import { Label } from "../atoms/label"
import { StatusText } from "../atoms/status-text"
import { tv } from "../utils"

const comboboxVariants = tv({
  slots: {
    root: ["relative flex w-full flex-col"],
    label: ["block font-label text-label-md"],
    control: [
      "form-control-base relative flex w-full items-center overflow-hidden",
      "bg-combobox-bg-base",
      "transition-colors duration-200 ease-in-out motion-reduce:transition-none",
      "hover:border-combobox-border-hover hover:bg-combobox-bg-hover",
      "data-focus:border-combobox-border-focus data-focus:bg-combobox-bg-focus",
      "data-focus-visible:outline-(style:--default-ring-style) data-focus-visible:outline-(length:--default-ring-width)",
      "data-focus-visible:outline-combobox-ring",
      "data-focus-visible:outline-offset-(length:--default-ring-offset)",
      "data-disabled:border-combobox-border-disabled data-disabled:bg-combobox-bg-disabled",
      "data-[validation=error]:border-(length:--border-width-validation)",
      "data-[validation=error]:border-combobox-border-error",
      "data-[validation=success]:border-(length:--border-width-validation)",
      "data-[validation=success]:border-combobox-border-success",
      "data-[validation=warning]:border-(length:--border-width-validation)",
      "data-[validation=warning]:border-combobox-border-warning",
    ],
    input: [
      "relative h-full min-w-0 flex-1 border-none bg-combobox-input-bg-base",
      "hover:bg-combobox-input-bg-hover focus-visible:outline-none",
      "focus:bg-combobox-input-bg-focus",
      "placeholder:text-combobox-fg-placeholder",
      "data-disabled:text-combobox-fg-disabled",
      "data-disabled:bg-combobox-bg-disabled",
    ],
    // Trailing actions (clear + chevron) sit side by side with NO gap.
    trigger: [
      "group flex h-full shrink-0 items-center justify-center",
      "font-normal",
      "p-combobox-trigger",
    ],
    positioner: [
      "z-(--z-index) w-full *:max-h-(--available-height) *:overflow-y-auto",
    ],
    content: [
      "flex flex-col overflow-clip",
      "rounded-combobox shadow-md",
      "bg-combobox-content-bg",
      "z-(--z-combobox-content) border border-combobox-border-base",
      "duration-200 ease-out motion-safe:transition-[opacity,display,translate]",
      "transition-discrete",
      "starting:-translate-y-2 starting:opacity-0",
      "data-[state=open]:starting:-translate-y-2 data-[state=open]:starting:opacity-0",
      "data-[state=open]:translate-y-0 data-[state=open]:opacity-100",
      "data-[state=closed]:-translate-y-2 data-[state=closed]:opacity-0",
    ],
    list: ["m-0 flex list-none flex-col"],
    item: [
      "flex items-center",
      "text-combobox-item-fg",
      "cursor-pointer",
      "data-highlighted:bg-combobox-item-bg-hover",
      "data-highlighted:text-combobox-item-fg-hover",
      "data-[state=checked]:bg-combobox-item-bg-selected",
      "data-[state=checked]:text-combobox-item-fg-selected",
      "data-disabled:cursor-not-allowed data-disabled:text-combobox-fg-disabled",
    ],
    emptyState: ["text-combobox-fg-placeholder"],
    triggerIndicator: [
      "text-combobox-trigger-fg-base group-hover:text-combobox-trigger-fg-hover",
      "motion-safe:transition-[transform,color] motion-safe:duration-200 motion-reduce:transition-none",
      "rotate-0 group-data-[state=open]:rotate-180",
    ],
    helper: [
      "data-[validation=success]:text-combobox-success-fg",
      "data-[validation=warning]:text-combobox-warning-fg",
    ],
    multiple: [],
  },
  compoundSlots: [
    {
      slots: ["trigger"],
      class: [
        "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
        "focus-visible:outline-combobox-ring",
        "focus-visible:outline-offset-(length:--default-ring-offset)",
        "text-combobox-trigger text-combobox-trigger-fg-base",
        "hover:text-combobox-trigger-fg-hover",
        "motion-safe:transition-colors motion-safe:duration-200 motion-reduce:transition-none",
        "hover:bg-combobox-trigger-bg-hover",
        "active:bg-combobox-trigger-bg-active",
      ],
    },
  ],
  variants: {
    size: {
      sm: {
        root: "gap-combobox-sm",
        control: "h-form-control-sm rounded-combobox-sm text-input-sm",
        item: "p-combobox-item-sm text-combobox-item-sm",
        emptyState: "p-combobox-item-sm text-combobox-item-sm",
        input: "p-combobox-input-sm",
        content: "text-combobox-sm",
        triggerIndicator: "text-icon-control-sm",
      },
      md: {
        root: "gap-combobox-md",
        control: "h-form-control-md rounded-combobox-md text-input-md",
        item: "p-combobox-item-md text-combobox-item-md",
        emptyState: "p-combobox-item-md text-combobox-item-md",
        input: "p-combobox-input-md",
        content: "text-combobox-md",
        triggerIndicator: "text-icon-control-md",
      },
      lg: {
        root: "gap-combobox-lg",
        control: "rounded-combobox text-input-lg",
        item: "p-combobox-item-lg text-combobox-item-lg",
        emptyState: "p-combobox-item-lg text-combobox-item-lg",
        input: "p-combobox-input-lg",
        content: "text-combobox-lg",
        triggerIndicator: "text-icon-control-lg",
      },
    },
  },
  defaultVariants: {
    size: "md",
  },
})

export type ComboboxItem<T = unknown> = {
  id?: string
  label: string
  value: string
  disabled?: boolean
  data?: T
}

export type ComboboxItemDetails<TItem> = {
  item: TItem
  label: string
  value: string
}

export type ComboboxStateDetails = {
  inputValue: string
}

type DefaultComboboxItem = ComboboxItem<unknown>

type ComboboxStateContentProps = {
  className: string
  error?: ReactNode
  loading: boolean
  loadingMessage: ReactNode
  inputValue: string
  hasOptions: boolean
  noResultsMessage: string
  renderEmptyState?: (details: ComboboxStateDetails) => ReactNode
  renderLoadingState?: (details: ComboboxStateDetails) => ReactNode
  renderErrorState?: (
    details: ComboboxStateDetails & { error: ReactNode }
  ) => ReactNode
}

export type ComboboxProps<TItem = DefaultComboboxItem> = VariantProps<
  typeof comboboxVariants
> & {
  id?: string
  name?: string
  label?: string
  placeholder?: string
  autoComplete?: string
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  items: TItem[]
  value?: string | string[]
  defaultValue?: string | string[]
  inputValue?: string
  multiple?: boolean
  validateStatus?: "default" | "error" | "success" | "warning"
  helpText?: string
  showHelpTextIcon?: boolean
  filterMode?: "local" | "remote"
  loading?: boolean
  loadingMessage?: ReactNode
  error?: ReactNode
  noResultsMessage?: string
  renderItem?: (details: ComboboxItemDetails<TItem>) => ReactNode
  renderEmptyState?: (details: ComboboxStateDetails) => ReactNode
  renderLoadingState?: (details: ComboboxStateDetails) => ReactNode
  renderErrorState?: (
    details: ComboboxStateDetails & { error: ReactNode }
  ) => ReactNode
  itemToString?: (item: TItem) => string
  itemToValue?: (item: TItem) => string
  isItemDisabled?: (item: TItem) => boolean
  clearable?: boolean
  selectionBehavior?: "replace" | "clear" | "preserve"
  closeOnSelect?: boolean
  allowCustomValue?: boolean
  loopFocus?: boolean
  autoFocus?: boolean
  triggerIcon?: IconType
  triggerIconSize?: IconProps["size"]
  clearIcon?: IconType
  onChange?: (value: string | string[]) => void
  onInputValueChange?: (value: string) => void
  onOpenChange?: (open: boolean) => void
  inputBehavior?: "autohighlight" | "autocomplete" | "none"
}

function defaultItemToString<TItem>(item: TItem) {
  return typeof item === "object" && item !== null && "label" in item
    ? String(item.label)
    : ""
}

function defaultItemToValue<TItem>(item: TItem) {
  return typeof item === "object" && item !== null && "value" in item
    ? String(item.value)
    : ""
}

function defaultIsItemDisabled<TItem>(item: TItem) {
  return typeof item === "object" && item !== null && "disabled" in item
    ? Boolean(item.disabled)
    : false
}

function filterComboboxItems<TItem>(
  items: TItem[],
  currentInputValue: string,
  itemToString: (item: TItem) => string
) {
  const normalizedInputValue = currentInputValue.toLowerCase()

  if (!normalizedInputValue) {
    return items
  }

  return items.filter((item) =>
    itemToString(item).toLowerCase().includes(normalizedInputValue)
  )
}

function ComboboxStateContent({
  className,
  error,
  loading,
  loadingMessage,
  inputValue,
  hasOptions,
  noResultsMessage,
  renderEmptyState,
  renderLoadingState,
  renderErrorState,
}: ComboboxStateContentProps) {
  const details = { inputValue }

  if (error) {
    return (
      <output aria-live="polite" className={className}>
        {renderErrorState ? renderErrorState({ ...details, error }) : error}
      </output>
    )
  }

  if (loading) {
    return (
      <output aria-live="polite" className={className}>
        {renderLoadingState ? renderLoadingState(details) : loadingMessage}
      </output>
    )
  }

  if (!hasOptions && inputValue) {
    return (
      <output aria-live="polite" className={className}>
        {renderEmptyState
          ? renderEmptyState(details)
          : noResultsMessage.replace("{inputValue}", inputValue)}
      </output>
    )
  }

  return null
}

export function Combobox<TItem = DefaultComboboxItem>({
  id,
  name,
  label,
  size,
  placeholder = "Select option",
  autoComplete,
  disabled = false,
  readOnly = false,
  required = false,
  items = [],
  value,
  defaultValue,
  inputValue,
  multiple = false,
  validateStatus,
  helpText,
  showHelpTextIcon = true,
  filterMode = "local",
  loading = false,
  loadingMessage = "Loading results...",
  error,
  noResultsMessage = 'No results found for "{inputValue}"',
  renderItem,
  renderEmptyState,
  renderLoadingState,
  renderErrorState,
  itemToString = defaultItemToString,
  itemToValue = defaultItemToValue,
  isItemDisabled = defaultIsItemDisabled,
  clearable = true,
  selectionBehavior = "replace",
  closeOnSelect = true,
  allowCustomValue = false,
  loopFocus = true,
  autoFocus = false,
  triggerIcon = "token-icon-combobox-chevron",
  triggerIconSize,
  clearIcon = "token-icon-combobox-clear",
  inputBehavior = "autocomplete",
  onChange,
  onInputValueChange,
  onOpenChange,
}: ComboboxProps<TItem>) {
  const generatedId = useId()
  const uniqueId = id || generatedId

  const [currentInputValue, setCurrentInputValue] = useState(inputValue ?? "")
  useEffect(() => {
    if (inputValue !== undefined) {
      setCurrentInputValue(inputValue)
    }
  }, [inputValue])

  const collectionItems =
    filterMode === "remote"
      ? items
      : filterComboboxItems(items, currentInputValue, itemToString)
  const collection = createComboboxCollection({
    items: collectionItems,
    itemToString,
    itemToValue,
    isItemDisabled,
  })

  const service = useMachine(comboboxMachine, {
    id: uniqueId,
    name,
    collection,
    disabled,
    readOnly,
    closeOnSelect,
    selectionBehavior,
    allowCustomValue,
    autoFocus,
    inputBehavior,
    loopFocus,
    ids: {
      label: `${uniqueId}-label`,
      input: `${uniqueId}-input`,
      control: `${uniqueId}-control`,
    },
    value: value as string[] | undefined,
    defaultValue: defaultValue as string[] | undefined,
    multiple,
    inputValue,
    onValueChange: ({ value: selectedValue }) => {
      onChange?.(selectedValue)
    },
    onInputValueChange: ({ inputValue: newItemInputValue }) => {
      setCurrentInputValue(newItemInputValue)
      onInputValueChange?.(newItemInputValue)
    },
    onOpenChange: ({ open }) => {
      onOpenChange?.(open)
    },
  })

  const api = connectCombobox(service, normalizeProps)

  const inputProps = api.getInputProps()
  const { ...restInputProps } = inputProps

  const {
    root,
    label: labelStyles,
    control,
    input,
    trigger,
    positioner,
    content,
    list,
    item: itemSlot,
    emptyState,
    triggerIndicator,
  } = comboboxVariants({ size })

  const hasOptions = api.collection.size > 0

  return (
    <div className={root()}>
      {label && (
        <Label
          className={labelStyles()}
          required={required}
          size={size}
          {...api.getLabelProps()}
        >
          {label}
        </Label>
      )}
      <div
        className={control()}
        {...api.getControlProps()}
        data-validation={validateStatus}
      >
        <Input
          className={input()}
          {...restInputProps}
          autoComplete={autoComplete}
          name={name}
          placeholder={placeholder}
          required={required}
          size={size}
        />

        {clearable && api.value.length > 0 && (
          <ActionIcon
            icon={clearIcon}
            size={size ?? "md"}
            tone="neutral"
            {...api.getClearTriggerProps()}
          />
        )}

        <Button
          {...api.getTriggerProps()}
          className={trigger()}
          size="current"
          theme="unstyled"
        >
          <Icon
            className={triggerIndicator()}
            icon={triggerIcon}
            size={triggerIconSize ?? "current"}
          />
        </Button>
      </div>

      <Portal>
        <div {...api.getPositionerProps()} className={positioner()}>
          <div {...api.getContentProps()} className={content()}>
            {hasOptions && (
              <ul {...api.getListProps()} className={list()}>
                {collectionItems.map((item) => {
                  const itemLabel = itemToString(item)
                  const itemValue = itemToValue(item)

                  return (
                    <li
                      key={itemValue}
                      {...api.getItemProps({ item })}
                      className={itemSlot()}
                    >
                      <span className="flex-1">
                        {renderItem
                          ? renderItem({
                              item,
                              label: itemLabel,
                              value: itemValue,
                            })
                          : itemLabel}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
            <ComboboxStateContent
              className={emptyState()}
              error={error}
              hasOptions={hasOptions}
              inputValue={api.inputValue}
              loading={loading}
              loadingMessage={loadingMessage}
              noResultsMessage={noResultsMessage}
              renderEmptyState={renderEmptyState}
              renderErrorState={renderErrorState}
              renderLoadingState={renderLoadingState}
            />
          </div>
        </div>
      </Portal>

      {helpText && (
        <StatusText
          showIcon={showHelpTextIcon}
          size={size}
          status={validateStatus}
        >
          {helpText}
        </StatusText>
      )}
    </div>
  )
}
