/**
 * Combobox — @techsio/ui-kit molecule.
 *
 * @component Combobox
 * @componentVersion v1.5.0
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
  type Api as ZagComboboxApi,
  type Props as ZagComboboxProps,
} from "@zag-js/combobox"
import {
  mergeProps,
  normalizeProps,
  Portal,
  type PropTypes,
  useMachine,
} from "@zag-js/react"
import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  type Ref,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import type { VariantProps } from "tailwind-variants"
import { ActionIcon } from "../atoms/action-icon"
import { Button } from "../atoms/button"
import { Icon, type IconProps, type IconType } from "../atoms/icon"
import { Input } from "../atoms/input"
import { Label } from "../atoms/label"
import { StatusText } from "../atoms/status-text"
import { joinDescribedBy } from "../internal/described-by"
import { tv } from "../utils"

const comboboxVariants = tv({
  slots: {
    root: ["relative flex w-full flex-col"],
    label: ["block font-label"],
    control: [
      "form-control-base relative flex w-full min-w-0 items-center overflow-clip",
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
      "hover:bg-combobox-input-bg-hover focus-visible:outline-hidden",
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
    // Zag sets `min-width: max-content` inline, so this resolves to
    // max(trigger width, content width) — the panel is never narrower than
    // the control that opened it.
    positioner: ["popup-layer isolate w-(--reference-width)"],
    content: [
      "popup-surface-base popup-layer",
      "w-full",
      "flex flex-col overflow-hidden",
      "duration-200 ease-out motion-safe:transition-[opacity,display,translate,scale] motion-reduce:transition-none motion-reduce:duration-0",
      "transition-discrete",
      "starting:scale-98 starting:opacity-0",
      "data-[state=open]:starting:scale-98 data-[state=open]:starting:opacity-0",
      "data-[state=open]:scale-100 data-[state=open]:opacity-100",
      "data-[state=closed]:scale-98 data-[state=closed]:opacity-0",
    ],
    list: [
      "m-0 flex min-h-0 list-none flex-col overflow-y-auto overscroll-contain",
    ],
    groupLabel: [
      "combobox-popup-padding",
      "font-combobox-group-label text-combobox-group-fg text-combobox-group-label-size",
    ],
    footer: [
      "combobox-popup-padding shrink-0 border-combobox-footer-border border-t",
    ],
    itemText: ["min-w-0 flex-grow truncate"],
    item: [
      "combobox-item-base",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    // Matches Select: absolutely positioned in the reserved end gutter, so a
    // checked option never shifts its label.
    itemIndicator: [
      "absolute end-(--popup-item-x) top-1/2 -translate-y-1/2",
      "flex items-center justify-center",
      "size-(--size-popup-indicator) text-current",
    ],
    emptyState: [
      "px-(--popup-item-x) py-(--popup-item-y)",
      "text-combobox-status-fg",
    ],
    status: [
      "combobox-status-gap flex items-center",
      "px-(--popup-item-x) py-(--popup-item-y)",
      "text-combobox-status-fg",
    ],
    triggerIndicator: [
      "text-combobox-trigger-fg-base group-hover:text-combobox-trigger-fg-hover",
      "motion-safe:transition-[transform,color] motion-safe:duration-200 motion-reduce:transition-none",
      "rotate-none group-data-[state=open]:rotate-180",
    ],
    helper: [
      "data-[validation=success]:text-combobox-success-fg",
      "data-[validation=warning]:text-combobox-warning-fg",
    ],
    selectedList: ["m-0 flex min-w-0 list-none flex-wrap gap-combobox-sm p-0"],
    selectedItem: [
      "flex min-w-0 max-w-full items-center rounded-combobox-sm border border-combobox-footer-border bg-combobox-bg-base ps-combobox-input-sm",
    ],
    selectedLabel: ["wrap-anywhere min-w-0 text-combobox-status-fg"],
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
        input: "p-combobox-input-sm",
        content: "popup-size-sm text-combobox-item-sm",
        triggerIndicator: "text-icon-control-sm",
      },
      md: {
        root: "gap-combobox-md",
        control: "h-form-control-md rounded-combobox-md text-input-md",
        input: "p-combobox-input-md",
        content: "popup-size-md text-combobox-item-md",
        triggerIndicator: "text-icon-control-md",
      },
      lg: {
        root: "gap-combobox-lg",
        control: "h-form-control-lg rounded-combobox-lg text-input-lg",
        input: "p-combobox-input-lg",
        content: "popup-size-lg text-combobox-item-lg",
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
  href?: string
}

export type ComboboxItemGroup<T = unknown> = {
  id: string
  label?: string
  items: ComboboxItem<T>[]
}

export type ComboboxProps<T = unknown> = VariantProps<typeof comboboxVariants> &
  Omit<
    ComponentPropsWithoutRef<"div">,
    "onChange" | "defaultValue" | "children"
  > &
  (
    | { items: ComboboxItem<T>[]; groups?: never }
    | { items?: never; groups: ComboboxItemGroup<T>[] }
  ) & {
    /** Ref to the focusable input, not the wrapper. Supports React 19 cleanup. */
    ref?: Ref<HTMLInputElement>
    /** Native input attributes/events; machine-owned value and editability remain authoritative. */
    inputProps?: Omit<
      ComponentPropsWithoutRef<"input">,
      | "size"
      | "value"
      | "defaultValue"
      | "name"
      | "disabled"
      | "readOnly"
      | "required"
      | "id"
      | "children"
    >
    id?: string
    name?: string
    "aria-label"?: string
    "aria-labelledby"?: string
    "aria-describedby"?: string
    label?: string
    placeholder?: string
    disabled?: boolean
    readOnly?: boolean
    required?: boolean
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
    open?: boolean
    defaultOpen?: boolean
    triggerIcon?: IconType
    triggerIconSize?: IconProps["size"]
    clearIcon?: IconType
    /** Always emits an array, including single selection and clearing ([]). */
    onChange?: (value: string[]) => void
    onInputValueChange?: (value: string) => void
    onOpenChange?: (open: boolean) => void
    inputBehavior?: "autohighlight" | "autocomplete" | "none"
    filterBehavior?: "local" | "external"
    loading?: boolean
    loadingMessage?: string
    error?: ReactNode
    retryLabel?: string
    onRetry?: () => void
    renderItem?: (item: ComboboxItem<T>) => ReactNode
    mode?: "selection" | "navigation"
    navigate?: ZagComboboxProps["navigate"]
    footer?: ReactNode
    portalled?: boolean
  }

type ComboboxApi<T> = ZagComboboxApi<PropTypes, ComboboxItem<T>>
type ComboboxStyles = ReturnType<typeof comboboxVariants>
type ComboboxOptionProps<T> = Pick<
  ComboboxProps<T>,
  "disabled" | "readOnly" | "navigate" | "renderItem"
> & {
  api: ComboboxApi<T>
  item: ComboboxItem<T>
  navigation: boolean
  styles: ComboboxStyles
}

function ComboboxOption<T>({
  api,
  item,
  navigation,
  disabled,
  readOnly,
  navigate,
  renderItem,
  styles,
}: ComboboxOptionProps<T>) {
  const { item: itemSlot, itemText, itemIndicator } = styles
  const itemProps = api.getItemProps({ item })
  const itemContent = renderItem ? (
    renderItem(item)
  ) : (
    <span className={itemText()}>{item.label}</span>
  )

  if (navigation) {
    const blocked = disabled || readOnly || item.disabled || !item.href
    return (
      <a
        {...itemProps}
        aria-label={item.label}
        className={itemSlot()}
        href={blocked ? undefined : item.href}
        onClick={(event) => {
          if (blocked) {
            event.preventDefault()
            return
          }
          itemProps.onClick?.(event)
          if (
            navigate &&
            !event.defaultPrevented &&
            event.button === 0 &&
            !event.metaKey &&
            !event.ctrlKey &&
            !event.shiftKey &&
            !event.altKey
          ) {
            event.preventDefault()
            navigate({
              node: event.currentTarget,
              href: event.currentTarget.href,
              value: item.value,
            })
          }
        }}
      >
        {itemContent}
      </a>
    )
  }

  return (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: Zag supplies role="option"; focus stays on the input via aria-activedescendant.
    <div {...itemProps} aria-label={item.label} className={itemSlot()}>
      {itemContent}
      <span
        {...api.getItemIndicatorProps({ item })}
        className={itemIndicator()}
      >
        <Icon icon="token-icon-check" size="current" />
      </span>
    </div>
  )
}

type ComboboxOptionsProps<T> = Omit<ComboboxOptionProps<T>, "item"> & {
  groups?: ComboboxItemGroup<T>[]
}

function ComboboxOptions<T>({
  groups,
  ...optionProps
}: ComboboxOptionsProps<T>) {
  const { api, styles } = optionProps
  const renderOption = (item: ComboboxItem<T>) => (
    <ComboboxOption {...optionProps} item={item} key={item.value} />
  )
  if (!groups) {
    return api.collection.items.map(renderOption)
  }

  const visibleValues = new Set(api.collection.items.map((item) => item.value))
  return groups.map((group) => {
    const groupItems = group.items.filter((item) =>
      visibleValues.has(item.value)
    )
    if (groupItems.length === 0) {
      return null
    }
    const groupProps = api.getItemGroupProps({ id: group.id })
    return (
      // biome-ignore lint/a11y/useAriaPropsSupportedByRole: Zag supplies the listbox option group role.
      <div
        {...groupProps}
        aria-labelledby={
          group.label ? groupProps["aria-labelledby"] : undefined
        }
        key={group.id}
      >
        {group.label && (
          <div
            {...api.getItemGroupLabelProps({ htmlFor: group.id })}
            className={styles.groupLabel()}
          >
            {group.label}
          </div>
        )}
        {groupItems.map(renderOption)}
      </div>
    )
  })
}

function normalizeValue(value: ComboboxProps["value"]) {
  if (typeof value === "string") {
    return value ? [value] : []
  }
  return value
}

function getResultsState({
  loading,
  error,
  hasOptions,
  inputValue,
}: {
  loading: boolean
  error: ReactNode
  hasOptions: boolean
  inputValue: string
}) {
  if (loading) {
    return "loading"
  }
  if (error) {
    return "error"
  }
  if (hasOptions) {
    return "results"
  }
  return inputValue ? "empty" : "idle"
}

function ComboboxClearTrigger<T>({
  api,
  navigation,
  clearable,
  clearIcon,
  size,
  disabled,
  readOnly,
}: Pick<ComboboxProps<T>, "clearable" | "size" | "disabled" | "readOnly"> & {
  api: ComboboxApi<T>
  clearIcon: IconType
  navigation: boolean
}) {
  const hasValue = navigation ? Boolean(api.inputValue) : api.value.length > 0
  if (readOnly || !(clearable && hasValue)) {
    return null
  }
  return (
    <ActionIcon
      icon={clearIcon}
      size={size ?? "md"}
      tone="neutral"
      {...api.getClearTriggerProps()}
      aria-label={api.getClearTriggerProps()["aria-label"] ?? "Clear value"}
      disabled={disabled || readOnly}
      hidden={false}
      onClick={(event) => {
        if (navigation) {
          if (disabled || readOnly) {
            return
          }
          api.setInputValue("")
          api.focus()
        } else {
          api.getClearTriggerProps().onClick?.(event)
        }
      }}
    />
  )
}

function ComboboxStatus({
  state,
  styles,
  loadingMessage,
  error,
  onRetry,
  disabled,
  readOnly,
  retryLabel,
  noResultsMessage,
  inputValue,
}: Pick<
  ComboboxProps,
  | "loadingMessage"
  | "error"
  | "onRetry"
  | "disabled"
  | "readOnly"
  | "retryLabel"
> & {
  state: ReturnType<typeof getResultsState>
  styles: ComboboxStyles
  noResultsMessage: string
  inputValue: string
}) {
  if (state === "loading") {
    return (
      <div className={styles.status()} role="status">
        <Icon icon="token-icon-spinner" size="current" />
        <span>{loadingMessage}</span>
      </div>
    )
  }
  if (state === "error") {
    return (
      <div className={styles.status()} role="alert">
        <span className="min-w-0 flex-1">{error}</span>
        {onRetry && (
          <Button
            disabled={disabled || readOnly}
            onClick={onRetry}
            size="sm"
            variant="secondary"
          >
            {retryLabel}
          </Button>
        )}
      </div>
    )
  }
  if (state === "empty") {
    return (
      <div className={styles.emptyState()} role="status">
        {noResultsMessage.replace("{inputValue}", inputValue)}
      </div>
    )
  }
  return null
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The root coordinates the Zag selection, navigation and field contracts.
export function Combobox<T = unknown>({
  id,
  name,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  label,
  size,
  placeholder = "Select option",
  disabled = false,
  readOnly = false,
  required = false,
  items,
  groups,
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
  open,
  defaultOpen,
  triggerIcon = "token-icon-combobox-chevron",
  triggerIconSize,
  clearIcon = "token-icon-combobox-clear",
  inputBehavior = "autocomplete",
  filterBehavior = "local",
  loading = false,
  loadingMessage = "Loading results",
  error,
  retryLabel = "Retry",
  onRetry,
  renderItem,
  onChange,
  onInputValueChange,
  onOpenChange,
  mode = "selection",
  navigate,
  footer,
  portalled = true,
  ref,
  inputProps = {},
  className,
  ...rootProps
}: ComboboxProps<T>) {
  const generatedId = useId()
  const uniqueId = id || generatedId
  const listId = `${uniqueId}-listbox`
  const helpTextId = `${uniqueId}-help`
  const selectedTextId = `${uniqueId}-selected`
  const navigation = mode === "navigation"
  const allItems = useMemo(
    () => (groups ? groups.flatMap((group) => group.items) : (items ?? [])),
    [groups, items]
  )

  const inputRef = useRef<HTMLInputElement>(null)
  const focusableRef = useMemo(
    () => (node: HTMLInputElement | null) => {
      inputRef.current = node
      const cleanup = typeof ref === "function" ? ref(node) : undefined
      if (ref && typeof ref !== "function") {
        ref.current = node
      }
      return () => {
        inputRef.current = null
        if (typeof cleanup === "function") {
          cleanup()
        } else if (typeof ref === "function") {
          ref(null)
        } else if (ref) {
          ref.current = null
        }
      }
    },
    [ref]
  )
  const [focusVisible, setFocusVisible] = useState(false)
  const [options, setOptions] = useState(allItems)
  useEffect(() => {
    setOptions(allItems)
  }, [allItems])
  const displayedItems = filterBehavior === "external" ? allItems : options
  const resultsHidden = loading || Boolean(error)
  const collection = createComboboxCollection({
    items: displayedItems,
    itemToString: (item) => item.label,
    itemToValue: (item) => item.value,
    isItemDisabled: (item) =>
      Boolean(
        resultsHidden || item.disabled || readOnly || (navigation && !item.href)
      ),
  })

  const service = useMachine(comboboxMachine, {
    id: uniqueId,
    name: navigation ? undefined : name,
    collection,
    disabled,
    readOnly,
    closeOnSelect,
    selectionBehavior: navigation ? "preserve" : selectionBehavior,
    allowCustomValue: !navigation && allowCustomValue,
    autoFocus,
    open: readOnly || disabled ? false : open,
    defaultOpen: readOnly || disabled ? false : defaultOpen,
    inputBehavior,
    loopFocus,
    navigate,
    composite: false,
    // Keep inline popups inside modal focus containment without clipping to its scroll area.
    positioning: { strategy: portalled ? "absolute" : "fixed" },
    // The listbox scrolls; content remains Zag's dismissal boundary.
    scrollToIndexFn: ({ getElement }) => {
      getElement()?.scrollIntoView({ block: "nearest", inline: "nearest" })
    },
    invalid: validateStatus === "error",
    ids: {
      label: `${uniqueId}-label`,
      input: `${uniqueId}-input`,
      control: `${uniqueId}-control`,
    },
    value: navigation ? [] : normalizeValue(value),
    defaultValue: navigation ? undefined : normalizeValue(defaultValue),
    multiple: !navigation && multiple,
    inputValue,
    onValueChange: ({ value: selectedValue }) => {
      if (!(navigation || readOnly || disabled)) {
        onChange?.(selectedValue)
      }
    },
    onInputValueChange: ({ inputValue: newItemInputValue }) => {
      if (filterBehavior === "local") {
        const filtered = allItems.filter((item) =>
          item.label.toLowerCase().includes(newItemInputValue.toLowerCase())
        )
        setOptions(filtered)
      }
      if (!(readOnly || disabled)) {
        onInputValueChange?.(newItemInputValue)
      }
    },
    onOpenChange: ({ open: nextOpen, reason }) => {
      // Zag opens after notifying the first input change. Do not overwrite
      // that freshly filtered collection; explicit reopening restores choices.
      if (reason !== "input-change") {
        setOptions(allItems)
      }
      onOpenChange?.(nextOpen)
    },
  })

  const api = connectCombobox(service, normalizeProps)
  useEffect(() => {
    inputRef.current?.setCustomValidity(
      !navigation && required && api.value.length === 0
        ? "Select an option from the suggestions."
        : ""
    )
  }, [navigation, required, api.value.length])
  const selectedText = api.value
    .map(
      (selectedValue) =>
        allItems.find((item) => item.value === selectedValue)?.label ??
        api.selectedItems.find((item) => item.value === selectedValue)?.label ??
        selectedValue
    )
    .join(", ")

  useEffect(() => {
    if (readOnly && !navigation) {
      // Closing the popup alone leaves its uncommitted search in the input.
      // Resolve from selected items, including those outside the filtered list.
      if (service.context.get("inputValue") !== selectedText) {
        service.send({ type: "INPUT_VALUE.SET", value: selectedText })
      }
      // Ask a controlled query's owner to discard its draft too. The surface
      // still reflects the selection if that owner cannot update immediately.
      if (inputValue !== undefined && inputValue !== selectedText) {
        onInputValueChange?.(selectedText)
      }
      if (inputRef.current) {
        inputRef.current.value = selectedText
      }
    }
  }, [
    readOnly,
    navigation,
    selectedText,
    service,
    inputValue,
    onInputValueChange,
  ])
  // The inner list owns listbox semantics; the outer surface is only the
  // dismissal boundary and also contains statuses and retry/footer actions.
  const {
    role: _contentRole,
    tabIndex: _contentTabIndex,
    "aria-labelledby": _contentLabel,
    ...contentProps
  } = api.getContentProps()

  const styles = comboboxVariants({ size })
  const {
    root,
    label: labelStyles,
    control,
    input,
    trigger,
    positioner,
    content,
    list,
    footer: footerSlot,
    triggerIndicator,
  } = styles

  const state = getResultsState({
    loading,
    error,
    hasOptions: api.collection.size > 0,
    inputValue: api.inputValue,
  })

  return (
    <div
      {...mergeProps(api.getRootProps(), rootProps)}
      className={root({ className })}
      data-mode={mode}
      data-status={state}
    >
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
        data-focus-visible={focusVisible ? "" : undefined}
        data-validation={validateStatus}
        onBlurCapture={() => setFocusVisible(false)}
        onFocusCapture={(event) =>
          setFocusVisible(event.target.matches(":focus-visible"))
        }
        onKeyDownCapture={() => setFocusVisible(true)}
        onPointerDownCapture={() => setFocusVisible(false)}
      >
        <Input
          {...mergeProps(api.getInputProps(), inputProps)}
          aria-controls={api.open ? listId : undefined}
          aria-describedby={joinDescribedBy(
            ariaDescribedBy,
            inputProps["aria-describedby"],
            helpText ? helpTextId : undefined,
            multiple && api.value.length ? selectedTextId : undefined
          )}
          aria-errormessage={
            validateStatus === "error"
              ? joinDescribedBy(
                  inputProps["aria-errormessage"],
                  helpText ? helpTextId : undefined
                )
              : inputProps["aria-errormessage"]
          }
          aria-invalid={
            validateStatus === "error" ||
            inputProps["aria-invalid"] ||
            undefined
          }
          aria-label={ariaLabel ?? inputProps["aria-label"]}
          aria-labelledby={
            ariaLabelledBy ??
            inputProps["aria-labelledby"] ??
            (label && !(ariaLabel ?? inputProps["aria-label"])
              ? api.getInputProps()["aria-labelledby"]
              : undefined)
          }
          aria-required={required || undefined}
          className={input({ className: inputProps.className })}
          disabled={disabled}
          name={undefined}
          onKeyDown={(event) => {
            inputProps.onKeyDown?.(event)
            if (event.defaultPrevented) {
              return
            }
            if (
              !navigation &&
              multiple &&
              !disabled &&
              !readOnly &&
              !api.open &&
              !api.inputValue &&
              event.key === "Backspace" &&
              !event.nativeEvent.isComposing
            ) {
              const lastValue = api.value.at(-1)
              if (lastValue) {
                event.preventDefault()
                api.clearValue(lastValue)
              }
              return
            }
            api.getInputProps().onKeyDown?.(event)
          }}
          placeholder={placeholder}
          readOnly={readOnly}
          ref={focusableRef}
          required={navigation && required}
          size={size}
        />

        <ComboboxClearTrigger
          api={api}
          clearable={clearable}
          clearIcon={clearIcon}
          disabled={disabled}
          navigation={navigation}
          readOnly={readOnly}
          size={size}
        />

        {!readOnly && (
          <Button
            {...api.getTriggerProps()}
            aria-controls={api.open ? listId : undefined}
            aria-haspopup="listbox"
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
        )}
      </div>
      {!navigation &&
        name &&
        (api.value.length ? api.value : [""]).map((selectedValue) => (
          <input
            disabled={disabled}
            form={inputProps.form}
            key={selectedValue}
            name={name}
            type="hidden"
            value={selectedValue}
          />
        ))}

      <Portal disabled={!portalled}>
        <div {...api.getPositionerProps()} className={positioner()}>
          <div {...contentProps} className={content()} data-status={state}>
            <ComboboxStatus
              disabled={disabled}
              error={error}
              inputValue={api.inputValue}
              loadingMessage={loadingMessage}
              noResultsMessage={noResultsMessage}
              onRetry={onRetry}
              readOnly={readOnly}
              retryLabel={retryLabel}
              state={state}
              styles={styles}
            />
            <div
              {...api.getListProps()}
              aria-busy={loading || undefined}
              className={list()}
              id={listId}
            >
              {!resultsHidden && (
                <ComboboxOptions
                  api={api}
                  disabled={disabled}
                  groups={groups}
                  navigate={navigate}
                  navigation={navigation}
                  readOnly={readOnly}
                  renderItem={renderItem}
                  styles={styles}
                />
              )}
            </div>
            {footer && (
              <div className={footerSlot()} data-part="footer">
                {footer}
              </div>
            )}
          </div>
        </div>
      </Portal>

      {multiple && !navigation && api.value.length > 0 && (
        <div>
          <StatusText className="sr-only" id={selectedTextId} size={size}>
            Selected: {selectedText}
          </StatusText>
          <ul aria-label="Selected values" className={styles.selectedList()}>
            {api.value.map((selectedValue) => {
              const selectedLabel =
                allItems.find((item) => item.value === selectedValue)?.label ??
                api.selectedItems.find((item) => item.value === selectedValue)
                  ?.label ??
                selectedValue
              return (
                <li className={styles.selectedItem()} key={selectedValue}>
                  <span className={styles.selectedLabel()}>
                    {selectedLabel}
                  </span>
                  {!readOnly && (
                    <ActionIcon
                      aria-label={`Remove ${selectedLabel}`}
                      disabled={disabled}
                      icon="token-icon-combobox-clear"
                      onClick={() => {
                        if (disabled || readOnly) {
                          return
                        }
                        api.clearValue(selectedValue)
                        api.focus()
                      }}
                      size={size ?? "md"}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {helpText && (
        <StatusText
          id={helpTextId}
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
