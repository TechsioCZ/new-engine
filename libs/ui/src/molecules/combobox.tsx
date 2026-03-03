import * as combobox from "@zag-js/combobox"
import { normalizeProps, Portal, useMachine } from "@zag-js/react"
import { useEffect, useId, useState } from "react"
import type { VariantProps } from "tailwind-variants"
import { Button } from "../atoms/button"
import { Icon } from "../atoms/icon"
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
      "transition-colors duration-200 ease-in-out motion-reduce:transition-none",
      "hover:border-combobox-border-hover hover:bg-combobox-bg-hover",
      "data-focus:border-combobox-border-focus data-focus:bg-combobox-bg-focus",
      "data-focus-visible:outline-(style:--default-ring-style) data-focus-visible:outline-(length:--default-ring-width)",
      "data-focus-visible:outline-combobox-ring",
      "data-focus-visible:outline-offset-(length:--default-ring-offset)",
      "data-disabled:border-combobox-border-disabled data-disabled:bg-combobox-bg-disabled",
      "data-[validation=error]:border-(length:--border-width-validation)",
      "data-[validation=error]:border-combobox-danger-fg",
      "data-[validation=success]:border-(length:--border-width-validation)",
      "data-[validation=success]:border-combobox-success-fg",
      "data-[validation=warning]:border-(length:--border-width-validation)",
      "data-[validation=warning]:border-combobox-warning-fg",
    ],
    input: [
      "relative h-full w-full border-none bg-combobox-input-bg",
      "hover:bg-combobox-input-bg-hover focus-visible:outline-none",
      "focus:bg-combobox-input-bg-focused",
      "placeholder:text-combobox-placeholder",
      "data-disabled:text-combobox-fg-disabled",
      "data-disabled:bg-combobox-bg-disabled",
    ],
    clearTrigger: [
      "absolute right-combobox-clear-right h-full p-combobox-trigger",
    ],
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
      "z-(--z-combobox-content) border border-combobox-border",
    ],
    item: [
      "flex items-center",
      "text-combobox-item-fg",
      "cursor-pointer",
      "data-highlighted:bg-combobox-item-bg-hover",
      "data-[state=checked]:bg-combobox-item-bg-selected",
      "data-disabled:cursor-not-allowed data-disabled:text-combobox-fg-disabled",
    ],
    helper: [
      "data-[validation=success]:text-combobox-success-fg",
      "data-[validation=warning]:text-combobox-warning-fg",
    ],
    multiple: [],
  },
  compoundSlots: [
    {
      slots: ["clearTrigger", "trigger"],
      class: [
        "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
        "focus-visible:outline-combobox-ring",
        "focus-visible:outline-offset-(length:--default-ring-offset)",
        "text-combobox-trigger text-combobox-trigger-size",
        "hover:text-combobox-trigger-hover",
        "motion-safe:transition-colors motion-safe:duration-200 motion-reduce:transition-none",
        "hover:bg-combobox-trigger-bg-hover",
        "active:bg-combobox-trigger-bg-active",
      ],
    },
  ],
  variants: {
    size: {
      sm: {
        root: "gap-combobox-root-sm",
        control:
          "h-form-control-sm text-input-sm rounded-form-control-sm",
        item: "p-combobox-item-sm",
        content: "text-combobox-content-sm",
      },
      md: {
        root: "gap-combobox-root-md",
        control:
          "h-form-control-md text-input-md rounded-form-control-md",
        item: "p-combobox-item-md",
        content: "text-combobox-content-md",
      },
      lg: {
        root: "gap-combobox-root-lg",
        control: "text-input-lg",
        item: "p-combobox-item-lg",
        content: "text-combobox-content-lg",
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

export interface ComboboxProps<T = unknown>
  extends VariantProps<typeof comboboxVariants> {
  id?: string
  name?: string
  label?: string
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  items: ComboboxItem<T>[]
  value?: string | string[]
  defaultValue?: string | string[]
  inputValue?: string
  multiple?: boolean
  validateStatus?: "default" | "error" | "success" | "warning"
  helpText?: string
  showHelpTextIcon?: boolean
  noResultsMessage?: string
  clearable?: boolean
  selectionBehavior?: "replace" | "clear" | "preserve"
  closeOnSelect?: boolean
  allowCustomValue?: boolean
  loopFocus?: boolean
  autoFocus?: boolean
  triggerIcon?: string
  clearIcon?: string
  onChange?: (value: string | string[]) => void
  onInputValueChange?: (value: string) => void
  onOpenChange?: (open: boolean) => void
  inputBehavior?: "autohighlight" | "autocomplete" | "none"
}

export function Combobox<T = unknown>({
  id,
  name,
  label,
  size,
  placeholder = "Select option",
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
  noResultsMessage = 'No results found for "{inputValue}"',
  clearable = true,
  selectionBehavior = "replace",
  closeOnSelect = true,
  allowCustomValue = false,
  loopFocus = true,
  autoFocus = false,
  inputBehavior = "autocomplete",
  onChange,
  onInputValueChange,
  onOpenChange,
}: ComboboxProps<T>) {
  const resolvedChevronIconSize = size === "sm" ? "sm" : "md"

  const generatedId = useId()
  const uniqueId = id || generatedId

  const [options, setOptions] = useState(items)
  useEffect(() => {
    setOptions(items)
  }, [items])
  const collection = combobox.collection({
    items: options,
    itemToString: (item) => item.label,
    itemToValue: (item) => item.value,
    isItemDisabled: (item) => !!item.disabled,
  })

  const service = useMachine(combobox.machine, {
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
      const filtered = items.filter((item) =>
        item.label.toLowerCase().includes(newItemInputValue.toLowerCase())
      )
      setOptions(filtered)
      onInputValueChange?.(newItemInputValue)
    },
    onOpenChange: ({ open }) => {
      setOptions(items)
      onOpenChange?.(open)
    },
  })

  const api = combobox.connect(service, normalizeProps)

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
    clearTrigger,
    item: itemSlot,
  } = comboboxVariants({ size })

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
          name={name}
          placeholder={placeholder}
          required={required}
          size={size}
        />

        {clearable && api.value.length > 0 && (
          <Button
            className={clearTrigger()}
            size="current"
            theme="unstyled"
            {...api.getClearTriggerProps()}
          >
            <Icon icon={"token-icon-combobox-clear"} size="current" />
          </Button>
        )}

        <Button
          {...api.getTriggerProps()}
          className={trigger()}
          size="current"
          theme="unstyled"
        >
          <Icon
            className={`text-combobox-trigger group-hover:text-combobox-trigger-hover motion-safe:transition-[transform,color] motion-safe:duration-200 motion-reduce:transition-none ${
              api.open ? "rotate-180" : "rotate-0"
            }`}
            icon="token-icon-combobox-chevron"
            size={resolvedChevronIconSize}
          />
        </Button>
      </div>

      <Portal>
        <div {...api.getPositionerProps()} className={positioner()}>
          {api.open && options.length > 0 && (
            <ul {...api.getContentProps()} className={content()}>
              {options.map((item) => (
                <li
                  key={item.value}
                  {...api.getItemProps({ item })}
                  className={itemSlot()}
                >
                  <span className="flex-1">{item.label}</span>
                </li>
              ))}
            </ul>
          )}
          {api.open && api.inputValue && options.length === 0 && (
            <div className={content()}>
              {noResultsMessage.replace("{inputValue}", api.inputValue)}
            </div>
          )}
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
