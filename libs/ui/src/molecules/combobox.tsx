/*
 * Combobox — @techsio/ui-kit molecule.
 *
 * @component Combobox
 * @componentVersion v1.1.0
 * @skill combobox-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the combobox-usage skill's component_version and a changelog entry. Bump all three together.
 */
import {
  machine as comboboxMachine,
  connect as connectCombobox,
  collection as createComboboxCollection,
} from "@zag-js/combobox"
import type {
  Api as ZagComboboxApi,
  Props as ZagComboboxProps,
} from "@zag-js/combobox"
import { normalizeProps, Portal, useMachine } from "@zag-js/react"
import type { PropTypes as ZagPropTypes } from "@zag-js/react"
import { useId, useState } from "react"
import type { KeyboardEvent } from "react"
import type { VariantProps } from "tailwind-variants"

import { ActionIcon } from "../atoms/action-icon"
import { Button } from "../atoms/button"
import { Icon } from "../atoms/icon"
import type { IconProps, IconType } from "../atoms/icon"
import { Input } from "../atoms/input"
import { Label } from "../atoms/label"
import { StatusText } from "../atoms/status-text"
import type { StatusTextProps } from "../atoms/status-text"
import { tv } from "../utils"

const comboboxVariants = tv({
  compoundSlots: [
    {
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
      slots: ["trigger"],
    },
  ],
  defaultVariants: {
    size: "md",
  },
  slots: {
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
    emptyState: ["text-combobox-fg-placeholder"],
    helper: [
      "data-[validation=success]:text-combobox-success-fg",
      "data-[validation=warning]:text-combobox-warning-fg",
    ],
    input: [
      "relative h-full min-w-0 flex-1 border-none bg-combobox-input-bg-base",
      "hover:bg-combobox-input-bg-hover focus-visible:outline-none",
      "focus:bg-combobox-input-bg-focus",
      "placeholder:text-combobox-fg-placeholder",
      "data-disabled:text-combobox-fg-disabled",
      "data-disabled:bg-combobox-bg-disabled",
    ],
    item: [
      "flex items-center",
      "text-combobox-item-fg",
      "cursor-pointer",
      "data-highlighted:bg-combobox-item-bg-hover",
      "data-[state=checked]:bg-combobox-item-bg-selected",
      "data-disabled:cursor-not-allowed data-disabled:text-combobox-fg-disabled",
    ],
    label: ["block font-label text-label-md"],
    list: ["m-0 flex list-none flex-col"],
    multiple: [],
    positioner: [
      "z-(--z-index) w-full *:max-h-(--available-height) *:overflow-y-auto",
    ],
    root: ["relative flex w-full flex-col"],
    // Trailing actions (clear + chevron) sit side by side with NO gap.
    trigger: [
      "group flex h-full shrink-0 items-center justify-center",
      "font-normal",
      "p-combobox-trigger",
    ],
    triggerIndicator: [
      "text-combobox-trigger-fg-base group-hover:text-combobox-trigger-fg-hover",
      "motion-safe:transition-[transform,color] motion-safe:duration-200 motion-reduce:transition-none",
      "rotate-0 group-data-[state=open]:rotate-180",
    ],
  },
  variants: {
    size: {
      lg: {
        content: "text-combobox-lg",
        control: "rounded-combobox text-input-lg",
        emptyState: "p-combobox-item-lg text-combobox-item-lg",
        input: "p-input-lg",
        item: "p-combobox-item-lg text-combobox-item-lg",
        root: "gap-combobox-lg",
        triggerIndicator: "text-icon-control-lg",
      },
      md: {
        content: "text-combobox-md",
        control: "h-form-control-md rounded-combobox-md text-input-md",
        emptyState: "p-combobox-item-md text-combobox-item-md",
        input: "p-input-md",
        item: "p-combobox-item-md text-combobox-item-md",
        root: "gap-combobox-md",
        triggerIndicator: "text-icon-control-md",
      },
      sm: {
        content: "text-combobox-sm",
        control: "h-form-control-sm rounded-combobox-sm text-input-sm",
        emptyState: "p-combobox-item-sm text-combobox-item-sm",
        input: "p-input-sm",
        item: "p-combobox-item-sm text-combobox-item-sm",
        root: "gap-combobox-sm",
        triggerIndicator: "text-icon-control-sm",
      },
    },
  },
})

export interface ComboboxItem<T = unknown> {
  id?: string | undefined
  label: string
  value: string
  disabled?: boolean | undefined
  data?: T | undefined
}

type ComboboxValue = string | string[]

export interface ComboboxProps<T = unknown> extends VariantProps<
  typeof comboboxVariants
> {
  id?: string | undefined
  name?: string | undefined
  label?: string | undefined
  placeholder?: string | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  required?: boolean | undefined
  items: ComboboxItem<T>[]
  filterItems?: boolean | undefined
  open?: boolean | undefined
  value?: ComboboxValue | undefined
  defaultValue?: ComboboxValue | undefined
  inputValue?: string | undefined
  multiple?: boolean | undefined
  validateStatus?: StatusTextProps["status"]
  helpText?: string | undefined
  showHelpTextIcon?: boolean | undefined
  noResultsMessage?: string | undefined
  clearable?: boolean | undefined
  selectionBehavior?: ZagComboboxProps["selectionBehavior"]
  closeOnSelect?: boolean | undefined
  allowCustomValue?: boolean | undefined
  loopFocus?: boolean | undefined
  autoFocus?: boolean | undefined
  triggerIcon?: IconType | undefined
  triggerIconSize?: IconProps["size"] | undefined
  clearIcon?: IconType | undefined
  onChange?: ((value: ComboboxValue) => void) | undefined
  onInputValueChange?: ((value: string) => void) | undefined
  onOpenChange?: ((open: boolean) => void) | undefined
  inputBehavior?: ZagComboboxProps["inputBehavior"]
  navigate?: ZagComboboxProps["navigate"]
  openOnChange?: ZagComboboxProps["openOnChange"]
}

type DefaultedComboboxKey =
  | "allowCustomValue"
  | "autoFocus"
  | "clearable"
  | "clearIcon"
  | "closeOnSelect"
  | "disabled"
  | "filterItems"
  | "inputBehavior"
  | "loopFocus"
  | "multiple"
  | "noResultsMessage"
  | "placeholder"
  | "readOnly"
  | "required"
  | "selectionBehavior"
  | "showHelpTextIcon"
  | "triggerIcon"

type ResolvedComboboxProps<T> = ComboboxProps<T> & {
  [Key in DefaultedComboboxKey]-?: NonNullable<ComboboxProps<T>[Key]>
}

interface ComboboxFilterState<T> {
  query?: string | undefined
  source: ComboboxItem<T>[]
}

const resolveComboboxProps = <T,>(
  props: ComboboxProps<T>,
): ResolvedComboboxProps<T> => ({
  ...props,
  allowCustomValue: props.allowCustomValue ?? false,
  autoFocus: props.autoFocus ?? false,
  clearIcon: props.clearIcon ?? "token-icon-combobox-clear",
  clearable: props.clearable ?? true,
  closeOnSelect: props.closeOnSelect ?? true,
  disabled: props.disabled ?? false,
  filterItems: props.filterItems ?? true,
  inputBehavior: props.inputBehavior ?? "autocomplete",
  loopFocus: props.loopFocus ?? true,
  multiple: props.multiple ?? false,
  noResultsMessage:
    props.noResultsMessage ?? 'No results found for "{inputValue}"',
  placeholder: props.placeholder ?? "Select option",
  readOnly: props.readOnly ?? false,
  required: props.required ?? false,
  selectionBehavior: props.selectionBehavior ?? "replace",
  showHelpTextIcon: props.showHelpTextIcon ?? true,
  triggerIcon: props.triggerIcon ?? "token-icon-combobox-chevron",
})

const normalizeComboboxValue = (value: ComboboxValue): string[] =>
  typeof value === "string" ? [value] : value

export type ComboboxApi<T = unknown> = ZagComboboxApi<
  ZagPropTypes,
  ComboboxItem<T>
>

export const useCombobox = <T,>(rawProps: ComboboxProps<T>) => {
  const props = resolveComboboxProps(rawProps)
  const generatedId = useId()
  const uniqueId =
    props.id !== undefined && props.id !== "" ? props.id : generatedId
  const {
    allowCustomValue,
    autoFocus,
    closeOnSelect,
    defaultValue,
    disabled,
    filterItems,
    inputBehavior,
    inputValue,
    items,
    loopFocus,
    multiple,
    name,
    navigate,
    open,
    openOnChange,
    onChange,
    onInputValueChange,
    onOpenChange,
    readOnly,
    selectionBehavior,
    value,
  } = props
  const [filterState, setFilterState] = useState<ComboboxFilterState<T>>({
    source: items,
  })
  const filterQuery =
    filterState.source === items ? filterState.query : undefined
  const normalizedQuery = filterQuery?.toLowerCase()
  const options =
    !filterItems || normalizedQuery === undefined
      ? items
      : items.filter((item) =>
          item.label.toLowerCase().includes(normalizedQuery),
        )
  const collection = createComboboxCollection({
    isItemDisabled: (item) => item.disabled === true,
    itemToString: (item) => item.label,
    itemToValue: (item) => item.value,
    items: options,
  })

  const service = useMachine(comboboxMachine, {
    allowCustomValue,
    autoFocus,
    closeOnSelect,
    collection,
    ...(defaultValue !== undefined && {
      defaultValue: normalizeComboboxValue(defaultValue),
    }),
    disabled,
    id: uniqueId,
    ids: {
      control: `${uniqueId}-control`,
      input: `${uniqueId}-input`,
      label: `${uniqueId}-label`,
    },
    inputBehavior,
    ...(inputValue !== undefined && { inputValue }),
    loopFocus,
    multiple,
    ...(name !== undefined && { name }),
    ...(navigate !== undefined && { navigate }),
    ...(open !== undefined && { open }),
    ...(openOnChange !== undefined && { openOnChange }),
    onInputValueChange: ({ inputValue: nextInputValue }) => {
      setFilterState({ query: nextInputValue, source: items })
      onInputValueChange?.(nextInputValue)
    },
    onOpenChange: ({ open: nextOpen }) => {
      setFilterState({ source: items })
      onOpenChange?.(nextOpen)
    },
    onValueChange: ({ value: nextValue }) => {
      onChange?.(nextValue)
    },
    readOnly,
    selectionBehavior,
    ...(value !== undefined && { value: normalizeComboboxValue(value) }),
  })

  const machineApi = connectCombobox(service, normalizeProps)
  const api: ComboboxApi<T> = {
    ...machineApi,
    getInputProps: () => {
      const inputProps = machineApi.getInputProps()
      return {
        ...inputProps,
        onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
          const wasDefaultPrevented = event.defaultPrevented
          inputProps.onKeyDown?.(event)
          if (event.key === "Escape" && !wasDefaultPrevented) {
            machineApi.setOpen(false)
          }
        },
      }
    },
  }

  return { api, options, props }
}

export const Combobox = <T = unknown,>(rawProps: ComboboxProps<T>) => {
  const { api, options, props } = useCombobox(rawProps)
  const {
    clearable,
    clearIcon,
    helpText,
    label,
    name,
    noResultsMessage,
    placeholder,
    required,
    showHelpTextIcon,
    size,
    triggerIcon,
    triggerIconSize,
    validateStatus,
  } = props
  const restInputProps = api.getInputProps()

  const {
    content,
    control,
    emptyState,
    input,
    item: itemSlot,
    label: labelStyles,
    list,
    positioner,
    root,
    trigger,
    triggerIndicator,
  } = comboboxVariants({ size })

  const hasHelpText = helpText !== undefined && helpText !== ""
  const hasLabel = label !== undefined && label !== ""
  const hasOptions = api.collection.size > 0
  const showEmptyState = !hasOptions && api.inputValue !== ""

  return (
    <div className={root()}>
      {hasLabel && (
        <Label
          {...api.getLabelProps()}
          className={labelStyles()}
          required={required}
          size={size}
        >
          {label}
        </Label>
      )}
      <div
        {...api.getControlProps()}
        className={control()}
        data-validation={validateStatus}
      >
        <Input
          {...restInputProps}
          className={input()}
          name={name}
          placeholder={placeholder}
          required={required}
          size={size}
        />

        {clearable && api.value.length > 0 && (
          <ActionIcon
            {...api.getClearTriggerProps()}
            icon={clearIcon}
            size={size ?? "md"}
            tone="neutral"
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
            {showEmptyState && (
              <div className={emptyState()}>
                {noResultsMessage.replace("{inputValue}", api.inputValue)}
              </div>
            )}
          </div>
        </div>
      </Portal>

      {hasHelpText && (
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
