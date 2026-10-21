/**
 * CascadeSelect — @techsio/ui-kit molecule.
 *
 * @component CascadeSelect
 * @componentVersion v1.1.3
 * @skill cascade-select-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the cascade-select-usage skill's component_version and a changelog entry. Bump all three together.
 */
import {
  machine as cascadeSelectMachine,
  connect as connectCascadeSelect,
  collection as createCascadeSelectCollection,
  type Api as ZagCascadeSelectApi,
  type ItemProps as ZagCascadeSelectItemProps,
  type ItemState as ZagCascadeSelectItemState,
  type Props as ZagCascadeSelectProps,
  type Service as ZagCascadeSelectService,
} from "@zag-js/cascade-select"
import {
  mergeProps,
  normalizeProps,
  type PropTypes,
  useMachine,
} from "@zag-js/react"
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
import { ActionIcon, type ActionIconProps } from "../atoms/action-icon"
import { Button } from "../atoms/button"
import { Icon, type IconProps } from "../atoms/icon"
import { Label } from "../atoms/label"
import { StatusText, type StatusTextProps } from "../atoms/status-text"
import {
  type DescribedBy,
  joinDescribedBy,
  useDescribedBy,
  useRegisterDescription,
} from "../internal/described-by"
import { subscribeOwnerFormReset } from "../internal/form-control-lifecycle"
import { OverlayPortal as Portal } from "../internal/overlay-portal"
import { useEffectiveDisabled } from "../internal/use-effective-disabled"
import { tv } from "../utils"

export type CascadeSelectSize = "xs" | "sm" | "md" | "lg"

export type CascadeSelectValidateStatus =
  | "default"
  | "error"
  | "success"
  | "warning"

export type CascadeSelectItem = {
  label: string
  value: string
  children?: CascadeSelectItem[]
  disabled?: boolean
}

const toControlSize = (size: CascadeSelectSize): "sm" | "md" | "lg" =>
  size === "xs" ? "sm" : size

const controlGlyphClass: Record<"sm" | "md" | "lg", string> = {
  sm: "text-icon-control-sm",
  md: "text-icon-control-md",
  lg: "text-icon-control-lg",
}

// Wrapper-owned state and native projections share one cancellation-safe lifecycle.
const nativeCascadeSelectMachine: typeof cascadeSelectMachine = {
  ...cascadeSelectMachine,
  implementations: {
    ...cascadeSelectMachine.implementations,
    effects: {
      ...cascadeSelectMachine.implementations?.effects,
      trackFormControlState() {
        /* Shared lifecycle below owns disabled and reset behavior. */
      },
    },
  },
}

export const cascadeSelectVariants = tv({
  slots: {
    root: "relative flex w-full flex-col gap-cascade-select",
    control: "relative flex w-full items-center justify-between",
    positioner: "isolate",
    trigger: [
      "form-control-base group w-full",
      "flex items-center justify-between gap-0",
      "border-cascade-select-trigger-border",
      "text-start font-normal",
      "hover:border-cascade-select-trigger-border-hover",
      "hover:bg-cascade-select-trigger-bg-hover",
      "focus:border-cascade-select-trigger-border-focus",
      "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-cascade-select-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
      "data-disabled:cursor-not-allowed",
      "data-disabled:border-cascade-select-border-disabled",
      "data-disabled:bg-cascade-select-bg-disabled",
      "data-disabled:text-cascade-select-fg-disabled",
      "data-[validation=error]:border-(length:--border-width-validation)",
      "data-[validation=error]:border-cascade-select-border-error data-[validation=error]:outline-cascade-select-border-error",
      "data-[validation=error]:outline-(style:--default-ring-style) data-[validation=error]:outline-(length:--default-ring-width)",
      "data-[validation=error]:outline-offset-(length:--default-ring-offset)",
      "data-[validation=success]:border-(length:--border-width-validation)",
      "data-[validation=success]:border-cascade-select-border-success data-[validation=success]:outline-cascade-select-border-success",
      "data-[validation=success]:outline-(style:--default-ring-style) data-[validation=success]:outline-(length:--default-ring-width)",
      "data-[validation=success]:outline-offset-(length:--default-ring-offset)",
      "data-[validation=warning]:border-(length:--border-width-validation)",
      "data-[validation=warning]:border-cascade-select-border-warning data-[validation=warning]:outline-cascade-select-border-warning",
      "data-[validation=warning]:outline-(style:--default-ring-style) data-[validation=warning]:outline-(length:--default-ring-width)",
      "data-[validation=warning]:outline-offset-(length:--default-ring-offset)",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    clearTrigger:
      "absolute end-cascade-select-right top-1/2 -translate-y-1/2 data-readonly:hidden",
    content: [
      "popup-surface-base flex w-max min-w-(--reference-width) max-w-(--available-width) overflow-x-auto p-0",
      "duration-200 ease-out motion-safe:transition-[opacity,display,translate,scale]",
      "transition-discrete",
      "starting:scale-98 starting:opacity-0",
      "data-[state=open]:starting:scale-98 data-[state=open]:starting:opacity-0",
      "data-[state=open]:scale-100 data-[state=open]:opacity-100",
      "data-[state=closed]:scale-98 data-[state=closed]:opacity-0",
    ],
    column: [
      "flex min-w-cascade-select-column flex-1 shrink-0 basis-0 flex-col",
      "cascade-select-column-divider bg-cascade-select-column-bg",
    ],
    columnHeader:
      "flex items-center gap-cascade-select-header border-cascade-select-column-border border-b bg-cascade-select-header-bg p-cascade-select-header font-cascade-select-header text-cascade-select-header-fg text-cascade-select-header-size",
    columnStep:
      "flex size-cascade-select-step shrink-0 items-center justify-center rounded-full bg-cascade-select-step-bg text-cascade-select-step-fg",
    list: "p-cascade-select-column",
    item: [
      "popup-item-base cascade-select-item-path",
      "data-active-path:font-cascade-select-path",
      "data-active-path:data-[state=unchecked]:bg-cascade-select-path-bg",
      "hover:bg-popup-item-bg-hover",
      "data-highlighted:bg-popup-item-bg-hover",
      "data-[state=checked]:bg-popup-item-bg-selected",
      "data-[state=checked]:text-popup-item-fg-selected",
      "data-disabled:cursor-not-allowed data-disabled:text-popup-item-fg-disabled",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    itemText: "min-w-0 flex-grow truncate",
    branchIndicator: [
      "flex size-(--size-popup-indicator) shrink-0 items-center justify-center last:-me-(--size-popup-indicator)",
      "rtl:rotate-180",
    ],
    itemIndicator: [
      "flex size-(--size-popup-indicator) shrink-0 items-center justify-center last:-me-(--size-popup-indicator)",
      "text-popup-item-fg-selected",
    ],
    valueText: [
      "min-w-0 flex-grow truncate font-normal",
      "data-placeholder:text-cascade-select-placeholder",
    ],
    indicator: [
      "shrink-0 text-cascade-select-trigger-fg-base group-hover:text-cascade-select-trigger-fg-hover",
      "data-[state=open]:rotate-180",
      "motion-safe:transition-[transform,color] motion-safe:duration-200 motion-reduce:transition-none",
    ],
  },
  variants: {
    size: {
      xs: {
        trigger:
          "h-form-control-sm rounded-cascade-select-sm p-cascade-select-trigger-sm text-cascade-select-trigger-xs",
        content: "popup-size-xs text-cascade-select-item-xs",
        valueText: "text-cascade-select-value-xs",
      },
      sm: {
        trigger:
          "h-form-control-sm rounded-cascade-select-sm p-cascade-select-trigger-sm text-cascade-select-trigger-sm",
        content: "popup-size-sm text-cascade-select-item-sm",
        valueText: "text-cascade-select-value-sm",
      },
      md: {
        trigger:
          "h-form-control-md rounded-cascade-select-md p-cascade-select-trigger-md text-cascade-select-trigger-md",
        content: "popup-size-md text-cascade-select-item-md",
        valueText: "text-cascade-select-value-md",
      },
      lg: {
        trigger:
          "h-form-control-lg rounded-cascade-select-lg p-cascade-select-trigger-md text-cascade-select-trigger-lg",
        content: "popup-size-lg text-cascade-select-item-lg",
        valueText: "text-cascade-select-value-lg",
      },
    },
  },
  defaultVariants: {
    size: "md",
  },
})

type CascadeSelectApi = ZagCascadeSelectApi<PropTypes, CascadeSelectItem>

// A path must resolve in full; a surviving ancestor is not the selected leaf.
const resolveSelectedItems = (api: CascadeSelectApi) =>
  api.value.map((valuePath) => {
    const indexPath = api.collection.getIndexPath(valuePath)
    return indexPath
      .map((_, index) => api.collection.at(indexPath.slice(0, index + 1)))
      .filter((item): item is CascadeSelectItem => item !== undefined)
  })

function resolvePath(items: CascadeSelectItem[], path: string[]) {
  const nodes: CascadeSelectItem[] = []
  const indices: number[] = []
  let children = items
  for (const value of path) {
    const index = children.findIndex((candidate) => candidate.value === value)
    if (index === -1) {
      break
    }
    const node = children[index]
    if (!node) {
      break
    }
    nodes.push(node)
    indices.push(index)
    children = node.children ?? []
  }
  return {
    nodes,
    indices,
    complete: path.length > 0 && nodes.length === path.length,
  }
}

const formatSelectedItems = (
  api: CascadeSelectApi,
  selectedItems: CascadeSelectItem[][]
) => {
  const stringify = (item: CascadeSelectItem) =>
    api.collection.stringifyNode(item) ?? api.collection.getNodeValue(item)

  if (api.multiple) {
    return selectedItems
      .map((path) => path.at(-1))
      .filter((item): item is CascadeSelectItem => item !== undefined)
      .map(stringify)
      .join(", ")
  }

  return selectedItems.map((path) => path.map(stringify).join(" / ")).join(", ")
}

type CascadeSelectContextValue = {
  api: CascadeSelectApi
  formatValue?: (selectedItems: CascadeSelectItem[][]) => string
  getRootNode?: ZagCascadeSelectProps<CascadeSelectItem>["getRootNode"]
  readOnly: boolean
  required: boolean
  size: CascadeSelectSize
  validateStatus: CascadeSelectValidateStatus
  errors: DescribedBy
} & DescribedBy

const CascadeSelectContext = createContext<CascadeSelectContextValue | null>(
  null
)

type CascadeSelectItemContextValue = {
  itemProps: ZagCascadeSelectItemProps<CascadeSelectItem>
  itemState: ZagCascadeSelectItemState<CascadeSelectItem>
}

const CascadeSelectItemContext =
  createContext<CascadeSelectItemContextValue | null>(null)

export function useCascadeSelectContext() {
  const context = useContext(CascadeSelectContext)

  if (!context) {
    throw new Error("CascadeSelect parts must be used within CascadeSelect")
  }

  return context
}

function useCascadeSelectItemContext() {
  const context = useContext(CascadeSelectItemContext)

  if (!context) {
    throw new Error(
      "CascadeSelect item parts must be used within CascadeSelect.Item"
    )
  }

  return context
}

export type CascadeSelectProps = VariantProps<typeof cascadeSelectVariants> &
  Omit<
    ZagCascadeSelectProps<CascadeSelectItem>,
    "collection" | "id" | "invalid"
  > & {
    children: ReactNode
    className?: string
    id?: string
    /** Complete authoritative hierarchy; removed paths request value reconciliation. */
    items: CascadeSelectItem[]
    ref?: Ref<HTMLDivElement>
    validateStatus?: CascadeSelectValidateStatus
  }

export function CascadeSelect({
  children,
  className,
  id: providedId,
  items,
  ref,
  required = false,
  size = "md",
  validateStatus = "default",
  ...machineProps
}: CascadeSelectProps) {
  const generatedId = useId()
  const id = providedId || generatedId
  const descriptions = useDescribedBy()
  const errors = useDescribedBy()
  const hiddenInputRef = useRef<HTMLInputElement>(null)
  const [disabledElement, setDisabledElement] =
    useState<HTMLInputElement | null>(null)
  const disabled = useEffectiveDisabled(disabledElement, machineProps.disabled)
  const initialValue = useRef(machineProps.defaultValue ?? [])

  const [internalValue, setInternalValue] = useState(
    machineProps.defaultValue ?? []
  )
  const requestedValue = machineProps.value ?? internalValue
  const effectiveValue = requestedValue.filter(
    (path) => resolvePath(items, path).complete
  )
  const reconciliation = useRef<string | null>(null)
  const collection = useMemo(
    () =>
      createCascadeSelectCollection<CascadeSelectItem>({
        rootNode: {
          children: items,
          label: "",
          value: "__cascade-select-root__",
        },
        isNodeDisabled: (item) => item.disabled ?? false,
        nodeToChildren: (item) => item.children ?? [],
        nodeToString: (item) => item.label,
        nodeToValue: (item) => item.value,
      }),
    [items]
  )
  const [internalHighlight, setInternalHighlight] = useState<string[]>(
    machineProps.defaultHighlightedValue ?? []
  )
  const controlledHighlight = machineProps.highlightedValue ?? internalHighlight
  const resolvedHighlight = resolvePath(items, controlledHighlight ?? [])
  const effectiveHighlight =
    resolvedHighlight.complete &&
    !resolvedHighlight.nodes.some((node) => node.disabled)
      ? controlledHighlight
      : []
  const highlightReconciliation = useRef<string | null>(null)
  const service = useMachine(nativeCascadeSelectMachine, {
    ...machineProps,
    collection,
    disabled,
    open: machineProps.readOnly || disabled ? false : machineProps.open,
    defaultOpen:
      machineProps.readOnly || disabled ? false : machineProps.defaultOpen,
    value: effectiveValue,
    highlightedValue: effectiveHighlight,
    onHighlightChange: (details) => {
      if (machineProps.highlightedValue === undefined) {
        setInternalHighlight(details.highlightedValue ?? [])
      }
      machineProps.onHighlightChange?.(details)
    },
    onValueChange: (details) => {
      if (machineProps.readOnly || disabled) {
        return
      }
      if (machineProps.value === undefined) {
        setInternalValue(details.value)
      }
      machineProps.onValueChange?.(details)
    },
    id,
    invalid: validateStatus === "error" || Boolean(errors.describedById),
    positioning: {
      fitViewport: true,
      placement: "bottom-start",
      ...machineProps.positioning,
    },
    required,
  })
  const api = connectCascadeSelect<PropTypes, CascadeSelectItem>(
    service as ZagCascadeSelectService<CascadeSelectItem>,
    normalizeProps
  )
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
    if (machineProps.value === undefined) {
      setInternalValue(effectiveValue)
    }
    machineProps.onValueChange?.({
      value: effectiveValue,
      items: effectiveValue.map((path) => resolvePath(items, path).nodes),
    })
  }, [
    effectiveValue,
    requestedValue,
    items,
    machineProps.value,
    machineProps.onValueChange,
  ])

  const reset = useRef<() => void>(() => undefined)
  reset.current = () => {
    if (machineProps.value === undefined) {
      setInternalValue(
        initialValue.current.filter((path) => resolvePath(items, path).complete)
      )
    }
    if (machineProps.highlightedValue === undefined) {
      setInternalHighlight([])
    }
    api.setOpen(false)
  }
  useEffect(() => {
    const input = hiddenInputRef.current
    return input
      ? subscribeOwnerFormReset(input, () => reset.current())
      : undefined
  }, [])

  // Zag caches nodes and index paths but does not watch collection replacement.
  // Refresh metadata without emitting a value-change event for a rename/reorder.
  const valueKey = JSON.stringify(effectiveValue)
  const highlightKey = JSON.stringify(controlledHighlight)
  // useMachine returns a new service object on every render. Its context and
  // send function are stable; subscribing to the service itself repeatedly
  // writes fresh arrays and can overwrite a keyboard transition mid-flight.
  const { context: machineContext, send } = service
  useEffect(() => {
    const paths = JSON.parse(valueKey) as string[][]
    machineContext.set(
      "valueIndexPath",
      paths.map((path) => resolvePath(items, path).indices)
    )
    machineContext.set(
      "selectedItems",
      paths.map((path) => resolvePath(items, path).nodes)
    )
    const highlighted = JSON.parse(highlightKey) as string[]
    const resolved = resolvePath(items, highlighted)
    if (
      highlighted.length &&
      (!resolved.complete || resolved.nodes.some((node) => node.disabled))
    ) {
      if (highlightReconciliation.current !== highlightKey) {
        highlightReconciliation.current = highlightKey
        send({ type: "HIGHLIGHTED_VALUE.CLEAR" })
      }
    } else {
      highlightReconciliation.current = null
      machineContext.set("highlightedIndexPath", resolved.indices)
      machineContext.set("highlightedItems", resolved.nodes)
    }
  }, [items, machineContext, send, valueKey, highlightKey])
  const styles = cascadeSelectVariants({ size })

  return (
    <CascadeSelectContext.Provider
      value={{
        api,
        formatValue: machineProps.formatValue,
        getRootNode: machineProps.getRootNode,
        readOnly: machineProps.readOnly ?? false,
        required,
        size,
        ...descriptions,
        errors,
        validateStatus,
      }}
    >
      <div
        {...api.getRootProps()}
        className={styles.root({ className })}
        ref={ref}
      >
        <input ref={setDisabledElement} type="hidden" />
        <input
          {...api.getHiddenInputProps()}
          disabled={disabled}
          ref={hiddenInputRef}
        />
        {children}
      </div>
    </CascadeSelectContext.Provider>
  )
}

type CascadeSelectLabelProps = Omit<
  ComponentPropsWithoutRef<typeof Label>,
  "disabled" | "required"
>

CascadeSelect.Label = function CascadeSelectLabel({
  children,
  ...props
}: CascadeSelectLabelProps) {
  const { api, required } = useCascadeSelectContext()

  return (
    <Label
      {...mergeProps(api.getLabelProps(), props)}
      disabled={api.disabled}
      required={required}
    >
      {children}
    </Label>
  )
}

type CascadeSelectControlProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

CascadeSelect.Control = function CascadeSelectControl({
  className,
  ref,
  ...props
}: CascadeSelectControlProps) {
  const { api, size } = useCascadeSelectContext()
  const styles = cascadeSelectVariants({ size })

  return (
    <div
      {...mergeProps(api.getControlProps(), props)}
      className={styles.control({ className })}
      ref={ref}
    />
  )
}

type CascadeSelectTriggerProps = ComponentPropsWithoutRef<"button"> & {
  ref?: Ref<HTMLButtonElement>
}

CascadeSelect.Trigger = function CascadeSelectTrigger({
  className,
  ref,
  ...props
}: CascadeSelectTriggerProps) {
  const {
    api,
    describedById,
    errors,
    readOnly,
    required,
    size,
    validateStatus,
  } = useCascadeSelectContext()
  const invalid = validateStatus === "error" || Boolean(errors.describedById)
  const effectiveStatus = invalid ? "error" : validateStatus
  const styles = cascadeSelectVariants({ size })
  const triggerProps = mergeProps(
    api.getTriggerProps(),
    {
      "aria-haspopup": "tree",
      "aria-invalid": invalid || undefined,
      "aria-required": required || undefined,
      "aria-readonly": readOnly || undefined,
    },
    props
  )
  const ariaDescribedBy = joinDescribedBy(
    triggerProps["aria-describedby"],
    describedById
  )

  return (
    <Button
      {...triggerProps}
      aria-describedby={ariaDescribedBy}
      aria-errormessage={joinDescribedBy(
        props["aria-errormessage"],
        errors.describedById
      )}
      aria-invalid={invalid || props["aria-invalid"] || undefined}
      className={styles.trigger({ className })}
      data-validation={
        effectiveStatus === "default" ? undefined : effectiveStatus
      }
      ref={ref}
      size="current"
      theme="unstyled"
    />
  )
}

type CascadeSelectValueTextProps = Omit<
  ComponentPropsWithoutRef<"span">,
  "children"
> & {
  children?: ReactNode | ((selectedItems: CascadeSelectItem[][]) => ReactNode)
  placeholder?: ReactNode
  ref?: Ref<HTMLSpanElement>
}

CascadeSelect.ValueText = function CascadeSelectValueText({
  children,
  className,
  placeholder = "Select an option",
  ref,
  ...props
}: CascadeSelectValueTextProps) {
  const { api, formatValue, size } = useCascadeSelectContext()
  const styles = cascadeSelectVariants({ size })
  const selectedItems = resolveSelectedItems(api)
  const valueText =
    formatValue?.(selectedItems) ?? formatSelectedItems(api, selectedItems)
  const hasValue = api.hasSelectedItems

  let content: ReactNode = hasValue ? valueText : placeholder

  if (hasValue && typeof children === "function") {
    content = children(selectedItems)
  } else if (
    hasValue &&
    children !== undefined &&
    typeof children !== "function"
  ) {
    content = children
  }

  return (
    <span
      {...mergeProps(api.getValueTextProps(), props)}
      className={styles.valueText({ className })}
      data-placeholder={hasValue ? undefined : ""}
      ref={ref}
    >
      {content}
    </span>
  )
}

type CascadeSelectIndicatorProps = ComponentPropsWithoutRef<"span"> & {
  iconSize?: IconProps["size"]
  ref?: Ref<HTMLSpanElement>
}

CascadeSelect.Indicator = function CascadeSelectIndicator({
  children,
  className,
  iconSize = "current",
  ref,
  ...props
}: CascadeSelectIndicatorProps) {
  const { api, size, readOnly } = useCascadeSelectContext()
  const styles = cascadeSelectVariants({ size })

  if (readOnly) {
    return null
  }

  return (
    <span
      {...mergeProps(api.getIndicatorProps(), props)}
      className={styles.indicator({
        className: `${controlGlyphClass[toControlSize(size)]} ${className ?? ""}`,
      })}
      ref={ref}
    >
      {children ?? (
        <Icon icon="token-icon-cascade-select-indicator" size={iconSize} />
      )}
    </span>
  )
}

type CascadeSelectClearTriggerProps = Omit<
  ActionIconProps,
  "icon" | "size" | "tone"
> & {
  ref?: Ref<HTMLButtonElement>
}

CascadeSelect.ClearTrigger = function CascadeSelectClearTrigger({
  "aria-label": ariaLabel = "Clear selection",
  className,
  ref,
  ...props
}: CascadeSelectClearTriggerProps) {
  const { api, size, readOnly } = useCascadeSelectContext()
  const styles = cascadeSelectVariants({ size })

  if (readOnly) {
    return null
  }

  return (
    <ActionIcon
      {...mergeProps(api.getClearTriggerProps(), props)}
      aria-label={ariaLabel}
      className={styles.clearTrigger({ className })}
      icon="token-icon-cascade-select-clear"
      ref={ref}
      size={toControlSize(size)}
      tone="neutral"
    />
  )
}

type CascadeSelectPositionerProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

CascadeSelect.Positioner = function CascadeSelectPositioner({
  className,
  ref,
  ...props
}: CascadeSelectPositionerProps) {
  const { api, size } = useCascadeSelectContext()
  const styles = cascadeSelectVariants({ size })

  return (
    <Portal>
      <div
        {...mergeProps(api.getPositionerProps(), props)}
        className={styles.positioner({ className })}
        ref={ref}
      />
    </Portal>
  )
}

type CascadeSelectContentProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

CascadeSelect.Content = function CascadeSelectContent({
  className,
  ref,
  ...props
}: CascadeSelectContentProps) {
  const { api, getRootNode, size } = useCascadeSelectContext()
  const styles = cascadeSelectVariants({ size })
  const contentProps = api.getContentProps()
  const highlightedId = api.highlightedValue.length
    ? contentProps["aria-activedescendant"]
    : undefined

  useEffect(() => {
    if (!(api.open && highlightedId)) {
      return
    }
    // Zag scrolls within each list, but columns overflow the shared surface.
    // Keep the actual keyboard cursor visible in narrow viewports too.
    const root = getRootNode?.() ?? document
    const scope =
      root.nodeType === Node.DOCUMENT_NODE ||
      root.nodeType === Node.DOCUMENT_FRAGMENT_NODE
        ? (root as Document | DocumentFragment)
        : (root.ownerDocument ?? document)
    const view = scope.ownerDocument?.defaultView ?? window
    // Placement and Zag's per-list scrolling settle in the next frame.
    let frame = view.requestAnimationFrame(() => {
      frame = view.requestAnimationFrame(() => {
        scope.getElementById(highlightedId)?.scrollIntoView({
          block: "nearest",
          inline: "nearest",
          behavior: "instant",
        })
      })
    })
    return () => view.cancelAnimationFrame(frame)
  }, [api.open, getRootNode, highlightedId])

  return (
    <div
      {...mergeProps(
        {
          ...contentProps,
          role: "tree",
          "aria-activedescendant": highlightedId,
        },
        props
      )}
      className={styles.content({ className })}
      ref={ref}
    />
  )
}

type CascadeSelectNodePartProps = ZagCascadeSelectItemProps<CascadeSelectItem>

type CascadeSelectListProps = Omit<
  ComponentPropsWithoutRef<"ul">,
  keyof CascadeSelectNodePartProps
> &
  CascadeSelectNodePartProps & {
    ref?: Ref<HTMLUListElement>
  }

CascadeSelect.List = function CascadeSelectList({
  className,
  indexPath,
  item,
  ref,
  value,
  ...props
}: CascadeSelectListProps) {
  const { api, size } = useCascadeSelectContext()
  const styles = cascadeSelectVariants({ size })
  const itemProps = { indexPath, item, value }

  return (
    <ul
      {...mergeProps(
        { ...api.getListProps(itemProps), "aria-level": undefined },
        props
      )}
      className={styles.list({ className })}
      ref={ref}
    />
  )
}

type CascadeSelectItemProps = Omit<
  ComponentPropsWithoutRef<"li">,
  keyof CascadeSelectNodePartProps
> &
  CascadeSelectNodePartProps & {
    ref?: Ref<HTMLLIElement>
  }

CascadeSelect.Item = function CascadeSelectItemPart({
  children,
  className,
  indexPath,
  item,
  ref,
  value,
  ...props
}: CascadeSelectItemProps) {
  const { api, size } = useCascadeSelectContext()
  const styles = cascadeSelectVariants({ size })
  const itemProps = { indexPath, item, value }
  const itemState = api.getItemState(itemProps)
  const connectedProps = api.getItemProps(itemProps)
  const expanded = itemState.hasChildren && itemState.highlighted

  return (
    <CascadeSelectItemContext.Provider value={{ itemProps, itemState }}>
      <li
        {...mergeProps(
          {
            ...connectedProps,
            "aria-label": item.label,
            "aria-level": itemState.depth,
            "aria-selected": itemState.selected,
            "aria-expanded": itemState.hasChildren ? expanded : undefined,
            // Child groups are mounted only for the active path. Never point
            // assistive technology at a group that is not in the DOM.
            "aria-controls": expanded
              ? connectedProps["aria-controls"]
              : undefined,
            "aria-owns": expanded ? connectedProps["aria-owns"] : undefined,
            "aria-haspopup": undefined,
          },
          props
        )}
        className={styles.item({ className })}
        data-active-path={
          itemState.hasChildren && itemState.highlighted ? "" : undefined
        }
        ref={ref}
      >
        {children}
      </li>
    </CascadeSelectItemContext.Provider>
  )
}

type CascadeSelectItemTextProps = ComponentPropsWithoutRef<"span"> & {
  ref?: Ref<HTMLSpanElement>
}

CascadeSelect.ItemText = function CascadeSelectItemText({
  children,
  className,
  ref,
  ...props
}: CascadeSelectItemTextProps) {
  const { api, size } = useCascadeSelectContext()
  const { itemProps } = useCascadeSelectItemContext()
  const styles = cascadeSelectVariants({ size })

  return (
    <span
      {...mergeProps(api.getItemTextProps(itemProps), props)}
      className={styles.itemText({ className })}
      ref={ref}
    >
      {children ?? itemProps.item.label}
    </span>
  )
}

type CascadeSelectBranchIndicatorProps = ComponentPropsWithoutRef<"span"> & {
  iconSize?: IconProps["size"]
  ref?: Ref<HTMLSpanElement>
}

CascadeSelect.BranchIndicator = function CascadeSelectBranchIndicator({
  children,
  className,
  iconSize = "current",
  ref,
  ...props
}: CascadeSelectBranchIndicatorProps) {
  const { size } = useCascadeSelectContext()
  const { itemState } = useCascadeSelectItemContext()
  const styles = cascadeSelectVariants({ size })

  if (!itemState.hasChildren) {
    return null
  }

  return (
    <span
      aria-hidden="true"
      className={styles.branchIndicator({ className })}
      ref={ref}
      {...props}
    >
      {children ?? (
        <Icon icon="token-icon-cascade-select-branch" size={iconSize} />
      )}
    </span>
  )
}

type CascadeSelectItemIndicatorProps = ComponentPropsWithoutRef<"span"> & {
  iconSize?: IconProps["size"]
  ref?: Ref<HTMLSpanElement>
}

CascadeSelect.ItemIndicator = function CascadeSelectItemIndicator({
  children,
  className,
  iconSize = "current",
  ref,
  ...props
}: CascadeSelectItemIndicatorProps) {
  const { api, size } = useCascadeSelectContext()
  const { itemProps } = useCascadeSelectItemContext()
  const styles = cascadeSelectVariants({ size })

  return (
    <span
      {...mergeProps(api.getItemIndicatorProps(itemProps), props)}
      className={styles.itemIndicator({ className })}
      ref={ref}
    >
      {children ?? (
        <Icon icon="token-icon-cascade-select-check" size={iconSize} />
      )}
    </span>
  )
}

type CascadeSelectTreeNodeProps = {
  indexPath: number[]
  node: CascadeSelectItem
  rootLabel: string
  value: string[]
}

function CascadeSelectTreeNode({
  indexPath,
  node,
  rootLabel,
  value,
}: CascadeSelectTreeNodeProps) {
  const { api, size } = useCascadeSelectContext()
  const styles = cascadeSelectVariants({ size })
  const headingId = useId()
  const nodeProps = { indexPath, item: node, value }
  const children = api.collection.getNodeChildren(node)
  // Resolve by value identity during render, not a cached pre-reorder index.
  const highlightedIndex = children.findIndex(
    (child) =>
      api.collection.getNodeValue(child) ===
      api.highlightedValue?.[indexPath.length]
  )
  const highlightedChild = children[highlightedIndex]

  return (
    <>
      <div
        className={styles.column()}
        data-depth={indexPath.length}
        data-part="column"
        data-scope="cascade-select"
        dir={api.getListProps(nodeProps).dir}
      >
        <div className={styles.columnHeader()} data-part="column-header">
          <span aria-hidden="true" className={styles.columnStep()}>
            {indexPath.length + 1}
          </span>
          <span id={headingId}>
            {indexPath.length === 0 ? rootLabel : node.label}
          </span>
        </div>
        <CascadeSelect.List {...nodeProps} aria-labelledby={headingId}>
          {children.map((item, index) => {
            const itemValue = api.collection.getNodeValue(item)
            const itemProps = {
              indexPath: [...indexPath, index],
              item,
              value: [...value, itemValue],
            }
            return (
              <CascadeSelect.Item {...itemProps} key={itemValue}>
                <CascadeSelect.ItemText key="text" />
                <CascadeSelect.ItemIndicator key="item-indicator" />
                <CascadeSelect.BranchIndicator key="branch-indicator" />
              </CascadeSelect.Item>
            )
          })}
        </CascadeSelect.List>
      </div>

      {highlightedChild && api.collection.isBranchNode(highlightedChild) && (
        <CascadeSelectTreeNode
          indexPath={[...indexPath, highlightedIndex]}
          key={api.collection.getNodeValue(highlightedChild)}
          node={highlightedChild}
          rootLabel={rootLabel}
          value={[...value, api.collection.getNodeValue(highlightedChild)]}
        />
      )}
    </>
  )
}

type CascadeSelectNodeProps = {
  indexPath?: number[]
  node?: CascadeSelectItem
  /** Heading for the first column; subsequent columns use the parent label. */
  rootLabel?: string
  value?: string[]
}

CascadeSelect.Node = function CascadeSelectNode({
  indexPath = [],
  node,
  rootLabel = "Options",
  value = [],
}: CascadeSelectNodeProps) {
  const { api } = useCascadeSelectContext()

  return (
    <CascadeSelectTreeNode
      indexPath={indexPath}
      node={node ?? api.collection.rootNode}
      rootLabel={rootLabel}
      value={value}
    />
  )
}

type CascadeSelectStatusTextProps = Omit<StatusTextProps, "size" | "status"> & {
  size?: CascadeSelectSize
  status?: CascadeSelectValidateStatus
}

CascadeSelect.StatusText = function CascadeSelectStatusText({
  id: providedId,
  size: sizeProp,
  status: statusProp,
  ...props
}: CascadeSelectStatusTextProps) {
  const { registerDescription, errors, size, validateStatus } =
    useCascadeSelectContext()
  const generatedId = useId()
  const id = providedId || generatedId
  const effectiveSize = sizeProp ?? size
  const effectiveStatus = statusProp ?? validateStatus
  useEffect(
    () =>
      effectiveStatus === "error" ? errors.registerDescription(id) : undefined,
    [effectiveStatus, errors.registerDescription, id]
  )

  useRegisterDescription(id, registerDescription)

  return (
    <StatusText
      align="start"
      {...props}
      id={id}
      size={effectiveSize === "xs" ? "sm" : effectiveSize}
      status={effectiveStatus}
    />
  )
}

CascadeSelect.displayName = "CascadeSelect"
