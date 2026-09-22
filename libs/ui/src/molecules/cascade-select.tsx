/**
 * CascadeSelect — @techsio/ui-kit molecule.
 *
 * @component CascadeSelect
 * @componentVersion v1.0.1
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
  Portal,
  type PropTypes,
  useMachine,
} from "@zag-js/react"
import {
  type ComponentPropsWithoutRef,
  createContext,
  type Dispatch,
  type ReactNode,
  type Ref,
  type SetStateAction,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react"
import type { VariantProps } from "tailwind-variants"
import { ActionIcon, type ActionIconProps } from "../atoms/action-icon"
import { Button } from "../atoms/button"
import { Icon, type IconProps } from "../atoms/icon"
import { Label } from "../atoms/label"
import { StatusText, type StatusTextProps } from "../atoms/status-text"
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

export const cascadeSelectVariants = tv({
  slots: {
    root: "relative flex w-full flex-col gap-cascade-select",
    control: "relative flex w-full items-center justify-between",
    positioner: "isolate",
    trigger: [
      "form-control-base group w-full",
      "flex items-center justify-between gap-0",
      "border-cascade-select-trigger-border",
      "text-left font-normal",
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
      "-translate-y-1/2 absolute top-1/2 right-cascade-select-right data-readonly:hidden",
    content: [
      "popup-surface-base flex w-max min-w-(--reference-width) max-w-(--available-width) overflow-x-auto",
      "duration-200 ease-out motion-safe:transition-[opacity,display,translate,scale]",
      "transition-discrete",
      "starting:scale-98 starting:opacity-0",
      "data-[state=open]:starting:scale-98 data-[state=open]:starting:opacity-0",
      "data-[state=open]:scale-100 data-[state=open]:opacity-100",
      "data-[state=closed]:scale-98 data-[state=closed]:opacity-0",
    ],
    list: "min-w-cascade-select-column grow basis-0",
    item: [
      "popup-item-base",
      "hover:bg-popup-item-bg-hover",
      "data-highlighted:bg-popup-item-bg-hover",
      "data-[state=checked]:bg-popup-item-bg-selected",
      "data-[state=checked]:text-popup-item-fg-selected",
      "data-disabled:cursor-not-allowed data-disabled:text-popup-item-fg-disabled",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    itemText: "min-w-0 flex-grow truncate",
    branchIndicator: [
      "last:-me-(--size-popup-indicator) flex size-(--size-popup-indicator) shrink-0 items-center justify-center",
      "rtl:rotate-180",
    ],
    itemIndicator: [
      "last:-me-(--size-popup-indicator) flex size-(--size-popup-indicator) shrink-0 items-center justify-center",
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
        trigger: "p-cascade-select-trigger-sm text-cascade-select-trigger-xs",
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
        trigger: "p-cascade-select-trigger-md text-cascade-select-trigger-lg",
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

const pathsMatch = (
  api: CascadeSelectApi,
  selectedItems: CascadeSelectItem[][]
) =>
  selectedItems.length === api.value.length &&
  selectedItems.every(
    (items, pathIndex) =>
      items.length === api.value[pathIndex]?.length &&
      items.every(
        (item, itemIndex) =>
          api.collection.getNodeValue(item) ===
          api.value[pathIndex]?.[itemIndex]
      )
  )

// Zag 1.41.2 initializes value from defaultValue before it initializes
// selectedItems. Keep the compatibility path local to value rendering.
const resolveSelectedItems = (api: CascadeSelectApi) => {
  if (pathsMatch(api, api.selectedItems)) {
    return api.selectedItems
  }

  return api.value.map((valuePath) => {
    const indexPath = api.collection.getIndexPath(valuePath)

    return indexPath
      .map((_, index) => api.collection.at(indexPath.slice(0, index + 1)))
      .filter((item): item is CascadeSelectItem => item !== undefined)
  })
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
  required: boolean
  size: CascadeSelectSize
  statusTextIds: string[]
  setStatusTextIds: Dispatch<SetStateAction<string[]>>
  validateStatus: CascadeSelectValidateStatus
}

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
  const [statusTextIds, setStatusTextIds] = useState<string[]>([])
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
  const service = useMachine(cascadeSelectMachine, {
    ...machineProps,
    collection,
    id,
    invalid: validateStatus === "error",
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
  const styles = cascadeSelectVariants({ size })

  return (
    <CascadeSelectContext.Provider
      value={{
        api,
        formatValue: machineProps.formatValue,
        required,
        size,
        statusTextIds,
        setStatusTextIds,
        validateStatus,
      }}
    >
      <div
        {...api.getRootProps()}
        className={styles.root({ className })}
        ref={ref}
      >
        <input {...api.getHiddenInputProps()} />
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
  const { api, size, statusTextIds, validateStatus } = useCascadeSelectContext()
  const styles = cascadeSelectVariants({ size })
  const triggerProps = mergeProps(api.getTriggerProps(), props)
  const ariaDescribedBy =
    [triggerProps["aria-describedby"], ...statusTextIds]
      .filter(Boolean)
      .join(" ") || undefined

  return (
    <Button
      {...triggerProps}
      aria-describedby={ariaDescribedBy}
      className={styles.trigger({ className })}
      data-validation={
        validateStatus === "default" ? undefined : validateStatus
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
    selectedItems === api.selectedItems
      ? api.valueAsString
      : (formatValue?.(selectedItems) ??
        formatSelectedItems(api, selectedItems))
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
  const { api, size } = useCascadeSelectContext()
  const styles = cascadeSelectVariants({ size })

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
  const { api, size } = useCascadeSelectContext()
  const styles = cascadeSelectVariants({ size })

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
  const { api, size } = useCascadeSelectContext()
  const styles = cascadeSelectVariants({ size })

  return (
    <div
      {...mergeProps(api.getContentProps(), props)}
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
      {...mergeProps(api.getListProps(itemProps), props)}
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

  return (
    <CascadeSelectItemContext.Provider value={{ itemProps, itemState }}>
      <li
        {...mergeProps(api.getItemProps(itemProps), props)}
        className={styles.item({ className })}
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
  value: string[]
}

function CascadeSelectTreeNode({
  indexPath,
  node,
  value,
}: CascadeSelectTreeNodeProps) {
  const { api } = useCascadeSelectContext()
  const nodeProps = { indexPath, item: node, value }
  const nodeState = api.getItemState(nodeProps)
  const children = api.collection.getNodeChildren(node)
  const highlightedChild = nodeState.highlightedChild

  return (
    <>
      <CascadeSelect.List {...nodeProps}>
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

      {highlightedChild && api.collection.isBranchNode(highlightedChild) && (
        <CascadeSelectTreeNode
          indexPath={[...indexPath, nodeState.highlightedIndex]}
          node={highlightedChild}
          value={[...value, api.collection.getNodeValue(highlightedChild)]}
        />
      )}
    </>
  )
}

type CascadeSelectNodeProps = {
  indexPath?: number[]
  node?: CascadeSelectItem
  value?: string[]
}

CascadeSelect.Node = function CascadeSelectNode({
  indexPath = [],
  node,
  value = [],
}: CascadeSelectNodeProps) {
  const { api } = useCascadeSelectContext()

  return (
    <CascadeSelectTreeNode
      indexPath={indexPath}
      node={node ?? api.collection.rootNode}
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
  const { setStatusTextIds, size, validateStatus } = useCascadeSelectContext()
  const generatedId = useId()
  const id = providedId || generatedId
  const effectiveSize = sizeProp ?? size

  useEffect(() => {
    setStatusTextIds((ids) => [...ids, id])
    return () =>
      setStatusTextIds((ids) => ids.filter((statusId) => statusId !== id))
  }, [id, setStatusTextIds])

  return (
    <StatusText
      {...props}
      id={id}
      size={effectiveSize === "xs" ? "sm" : effectiveSize}
      status={statusProp ?? validateStatus}
    />
  )
}

CascadeSelect.displayName = "CascadeSelect"
