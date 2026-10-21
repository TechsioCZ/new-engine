/**
 * TreeView — @techsio/ui-kit molecule.
 *
 * @component TreeView
 * @componentVersion v1.1.0
 * @skill tree-view-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the tree-view-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { mergeProps, normalizeProps, useMachine } from "@zag-js/react"
import {
  connect as connectTree,
  collection as createTreeCollection,
  splitProps as splitTreeProps,
  type Api as TreeApi,
  type NodeProps as TreeNodeProps,
  type NodeState as TreeNodeState,
  type Props as TreeProps,
  machine as treeMachine,
} from "@zag-js/tree-view"
import {
  type ComponentPropsWithoutRef,
  createContext,
  type MouseEvent,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import type { VariantProps } from "tailwind-variants"
import { Icon, type IconType } from "../atoms/icon"
import { tv } from "../utils"

export type TreeNode = {
  id: string
  name: string
  children?: TreeNode[]
  icons?: {
    branch?: IconType
    leaf?: IconType
  }
  disabled?: boolean
  selected?: boolean
  selectable?: boolean // For 'custom' selection behavior
  [key: string]: unknown
}

// A disabled branch makes its entire subtree unavailable, even if a controlled
// owner keeps it expanded. Give Zag and every compound part the same policy.
function inheritDisabledState(
  nodes: TreeNode[],
  parentDisabled = false
): TreeNode[] {
  return nodes.map((node) => {
    const disabled = parentDisabled || Boolean(node.disabled)
    return {
      ...node,
      ...(disabled ? { disabled: true } : {}),
      ...(node.children
        ? { children: inheritDisabledState(node.children, disabled) }
        : {}),
    }
  })
}

function canSelectNode(
  node: TreeNode,
  behavior: "all" | "leaf-only" | "custom"
) {
  if (node.disabled) {
    return false
  }
  if (behavior === "leaf-only" && node.children?.length) {
    return false
  }
  return behavior !== "custom" || node.selectable !== false
}

function recoverTreeFocus(
  root: HTMLElement,
  previous: HTMLElement | null,
  api: TreeApi,
  target: string | null
) {
  if (!previous) {
    return false
  }
  const unavailable =
    !previous.isConnected ||
    Boolean(
      previous.closest(
        '[hidden], [data-disabled], [data-part="branch-content"][data-state="closed"]'
      )
    )
  if (!unavailable) {
    return false
  }
  const active = root.ownerDocument.activeElement
  if (active !== root.ownerDocument.body && !root.contains(active)) {
    return true
  }
  if (target) {
    api.focus(target)
  } else {
    root.querySelector<HTMLElement>('[data-part="tree"]')?.focus()
  }
  return true
}

const treeViewVariants = tv({
  slots: {
    root: "relative min-w-0 rounded-tree-view bg-tree-view-root-bg text-tree-view-fg-base",
    label: ["font-tree-view-label text-tree-view-label-fg"],
    tree: [
      "bg-tree-view-bg",
      "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-tree-view-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
    ],
    branch: [
      "data-disabled:cursor-not-allowed",
      "data-disabled:text-tree-view-fg-disabled",
      "data-disabled:*:pointer-events-none",
    ],
    branchTrigger: [
      "group flex items-center justify-between",
      "hover:bg-tree-view-node-bg-hover",
      "cursor-pointer",
      "has-focus-visible:outline-(style:--default-ring-style) has-focus-visible:outline-(length:--default-ring-width)",
      "has-focus-visible:outline-tree-view-ring",
      "has-focus-visible:outline-offset-(length:--default-ring-offset)",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    branchControl: ["min-w-0 flex-1"],
    branchText: ["wrap-anywhere min-w-0 flex-1"],
    branchIndicator: [
      "flex min-h-tree-view-target min-w-tree-view-target shrink-0 cursor-pointer items-center justify-center self-stretch text-tree-view-fg-base",
      "focus-visible:outline focus-visible:outline-tree-view-ring",
      "data-disabled:cursor-not-allowed",
      "transition duration-200 motion-reduce:transition-none",
    ],
    indicatorIcon: "data-[state=open]:token-icon-tree-indicator-open",
    branchContent: ["relative", "data-[state=closed]:hidden"],
    indentGuide: [
      "absolute inset-s-1 inset-y-0",
      "w-tree-view-indent-width bg-tree-view-indent-bg",
      "opacity-tree-view-indent",
    ],
    item: [
      "hover:bg-tree-view-node-bg-hover hover:text-tree-view-fg-hover",

      "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-tree-view-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    itemText: ["wrap-anywhere min-w-0 flex-1"],
    nodeIcon: [
      "hover:text-tree-view-icon-hover",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
  },
  compoundSlots: [
    {
      // leaf has a common style with branch
      slots: ["branch", "item"],
      class: [
        "relative",
        // get --depth from zag-js api
        "ms-tree-view-level",
        "data-[depth=1]:ms-0",
      ],
    },
    {
      slots: ["branchControl", "item"],
      class: [
        "flex items-center gap-tree-view-icon p-tree-view-node-padding",
        "cursor-pointer",
        "tree-view-selection data-selected:bg-tree-view-node-bg-selected data-selected:text-tree-view-node-fg-selected",
        "data-selected:group-hover:text-tree-view-node-fg-selected data-selected:hover:bg-tree-view-node-bg-selected data-selected:hover:text-tree-view-node-fg-selected",
        "group-hover:text-tree-view-fg-hover",
      ],
    },
  ],
  variants: {
    size: {
      sm: {
        nodeIcon: "text-tree-view-icon-sm",
        branchText: "text-tree-view-sm",
        itemText: "text-tree-view-sm",
        branchIndicator: "text-icon-control-sm",
        label: "text-tree-view-sm",
      },
      md: {
        nodeIcon: "text-tree-view-icon-md",
        branchText: "text-tree-view-md",
        itemText: "text-tree-view-md",
        branchIndicator: "text-icon-control-md",
        label: "text-tree-view-md",
      },
      lg: {
        nodeIcon: "text-tree-view-icon-lg",
        branchText: "text-tree-view-lg",
        itemText: "text-tree-view-lg",
        branchIndicator: "text-icon-control-lg",
        label: "text-tree-view-lg",
      },
    },
  },
  defaultVariants: {
    size: "md",
  },
})

type TreeViewContextValue = {
  api: TreeApi
  size?: "sm" | "md" | "lg"
  styles: ReturnType<typeof treeViewVariants>
  selectionBehavior?: "all" | "leaf-only" | "custom"
}

const TreeViewContext = createContext<TreeViewContextValue | null>(null)

function useTreeViewContext() {
  const context = useContext(TreeViewContext)
  if (!context) {
    throw new Error("TreeView components must be used within TreeView.Root")
  }
  return context
}

type TreeViewNodeContextValue = {
  node: TreeNode
  indexPath: number[]
  nodeProps: TreeNodeProps
  nodeState: TreeNodeState
}

const TreeViewNodeContext = createContext<TreeViewNodeContextValue | null>(null)

function useTreeViewNodeContext() {
  const context = useContext(TreeViewNodeContext)
  if (!context) {
    throw new Error(
      "TreeView node components must be used within a node provider"
    )
  }
  return context
}

type TreeViewRootProps = VariantProps<typeof treeViewVariants> &
  Omit<TreeProps, "id" | "size"> &
  Omit<ComponentPropsWithoutRef<"div">, "onChange" | "dir"> & {
    id?: string
    data: TreeNode[]
    selectionBehavior?: "all" | "leaf-only" | "custom"
  }

export function TreeView({
  data,
  size,
  selectionBehavior = "all",
  children,
  className,
  ...props
}: TreeViewRootProps) {
  const generatedId = useId()
  const [machineProps, rootProps] = splitTreeProps(props)
  const collection = useMemo(
    () =>
      createTreeCollection<TreeNode>({
        nodeToValue: (node) => node.id,
        nodeToString: (node) => node.name,
        rootNode: {
          id: "ROOT",
          name: "",
          children: inheritDisabledState(data),
        },
      }),
    [data]
  )
  const nodes = new Map<string, { node: TreeNode; parents: string[] }>()
  const visit = (items: TreeNode[], parents: string[] = []) => {
    for (const node of items) {
      nodes.set(node.id, { node, parents })
      if (node.children) {
        visit(node.children, [...parents, node.id])
      }
    }
  }
  visit(collection.rootNode.children ?? [])
  const allowed = (value: string) => {
    const node = nodes.get(value)?.node
    return Boolean(node && canSelectNode(node, selectionBehavior))
  }
  const filterSelection = (values: string[]) =>
    [...new Set(values)].filter(allowed)
  const [selection, setSelection] = useState(
    () => machineProps.defaultSelectedValue ?? []
  )
  const [focus, setFocus] = useState<string | null>(
    () => machineProps.defaultFocusedValue ?? null
  )
  const rootElement = useRef<HTMLDivElement | null>(null)
  const lastFocused = useRef<HTMLElement | null>(null)
  const previousNodes = useRef(nodes)
  const recovery = useRef<string | null>(null)
  const selectionRecovery = useRef<string | null>(null)
  const expanded = machineProps.expandedValue
  const [localExpanded, setLocalExpanded] = useState(
    () => machineProps.defaultExpandedValue ?? []
  )
  const expandedValues = expanded ?? localExpanded
  const visible = [...nodes.entries()].filter(
    ([, entry]) =>
      !entry.node.disabled &&
      entry.parents.every((parent) => expandedValues.includes(parent))
  )
  const requestedFocus =
    machineProps.focusedValue === undefined ? focus : machineProps.focusedValue
  const previousParents = requestedFocus
    ? (previousNodes.current.get(requestedFocus)?.parents ?? [])
    : []
  const visibleIds = visible.map(([value]) => value)
  const previousIds = [...previousNodes.current.keys()]
  const previousIndex = requestedFocus
    ? previousIds.indexOf(requestedFocus)
    : -1
  const neighbors = [
    ...previousIds.slice(previousIndex + 1),
    ...previousIds.slice(0, Math.max(0, previousIndex)).reverse(),
  ]
  const focusTarget =
    requestedFocus && visibleIds.includes(requestedFocus)
      ? requestedFocus
      : ([...previousParents]
          .reverse()
          .find((value) => visibleIds.includes(value)) ??
        neighbors.find((value) => visibleIds.includes(value)) ??
        visibleIds[0] ??
        null)
  const selectedValue = filterSelection(machineProps.selectedValue ?? selection)

  const service = useMachine(treeMachine, {
    expandOnClick: true,
    typeahead: true,
    ...machineProps,
    id: machineProps.id ?? generatedId,
    collection,
    selectedValue,
    focusedValue: focusTarget,
    onSelectionChange: (details) => {
      const selected = filterSelection(details.selectedValue)
      if (machineProps.selectedValue === undefined) {
        setSelection(selected)
      }
      machineProps.onSelectionChange?.({
        ...details,
        selectedValue: selected,
        selectedNodes: selected
          .map((value) => nodes.get(value)?.node)
          .filter((node): node is TreeNode => Boolean(node)),
      })
    },
    onExpandedChange: (details) => {
      if (expanded === undefined) {
        setLocalExpanded(details.expandedValue)
      }
      machineProps.onExpandedChange?.(details)
    },
    onFocusChange: (details) => {
      if (machineProps.focusedValue === undefined) {
        setFocus(details.focusedValue)
      }
      machineProps.onFocusChange?.(details)
    },
  })

  const api = connectTree(service, normalizeProps)
  const styles = treeViewVariants({ size })

  useEffect(() => {
    const requestedSelection = machineProps.selectedValue ?? selection
    const selectionKey = JSON.stringify([requestedSelection, selectedValue])
    if (requestedSelection.join("\0") === selectedValue.join("\0")) {
      selectionRecovery.current = null
    } else {
      if (machineProps.selectedValue === undefined) {
        setSelection(selectedValue)
      }
      if (selectionRecovery.current !== selectionKey) {
        selectionRecovery.current = selectionKey
        machineProps.onSelectionChange?.({
          focusedValue: focusTarget,
          selectedValue,
          selectedNodes: selectedValue
            .map((value) => nodes.get(value)?.node)
            .filter((node): node is TreeNode => Boolean(node)),
        })
      }
    }
  })

  useEffect(() => {
    const root = rootElement.current
    if (!root) {
      return
    }
    const key = `${requestedFocus}:${focusTarget}`
    if (requestedFocus !== focusTarget && recovery.current !== key) {
      recovery.current = key
      if (machineProps.focusedValue === undefined) {
        setFocus(focusTarget)
      }
      machineProps.onFocusChange?.({
        focusedValue: focusTarget,
        focusedNode: focusTarget
          ? (nodes.get(focusTarget)?.node ?? null)
          : null,
      })
    } else if (requestedFocus === focusTarget) {
      recovery.current = null
    }
    if (recoverTreeFocus(root, lastFocused.current, api, focusTarget)) {
      lastFocused.current = null
    }
    if (requestedFocus === focusTarget || requestedFocus == null) {
      previousNodes.current = nodes
    }
  })

  return (
    <TreeViewContext.Provider value={{ api, size, styles, selectionBehavior }}>
      <div
        className={styles.root({ className })}
        {...mergeProps(rootProps, api.getRootProps())}
        onBlurCapture={(event) => {
          rootProps.onBlurCapture?.(event)
          if (
            event.relatedTarget &&
            !event.currentTarget.contains(event.relatedTarget as Node)
          ) {
            lastFocused.current = null
          }
        }}
        onFocusCapture={(event) => {
          rootProps.onFocusCapture?.(event)
          lastFocused.current = event.target as HTMLElement
        }}
        ref={rootElement}
      >
        {children}
      </div>
    </TreeViewContext.Provider>
  )
}

type TreeViewLabelProps = ComponentPropsWithoutRef<"h3">

TreeView.Label = function TreeViewLabel({
  children,
  className,
  ...props
}: TreeViewLabelProps) {
  const { api, styles } = useTreeViewContext()

  return (
    <h3
      className={styles.label({ className })}
      {...api.getLabelProps()}
      {...props}
    >
      {children}
    </h3>
  )
}

type TreeViewTreeProps = ComponentPropsWithoutRef<"div">

TreeView.Tree = function TreeViewTree({
  children,
  className,
  ...props
}: TreeViewTreeProps) {
  const { api, styles, selectionBehavior } = useTreeViewContext()

  return (
    <div
      className={styles.tree({ className })}
      {...mergeProps(props, api.getTreeProps())}
      onKeyDown={(event) => {
        props.onKeyDown?.(event)
        if (event.defaultPrevented) {
          return
        }
        // Zag currently supports Meta+A only. Match native Ctrl+A too.
        if (
          (event.metaKey || event.ctrlKey) &&
          event.key.toLowerCase() === "a"
        ) {
          event.preventDefault()
          if (api.getTreeProps()["aria-multiselectable"]) {
            api.select()
          }
          return
        }
        const target = (event.target as HTMLElement).closest<HTMLElement>(
          '[data-part="branch-control"]'
        )
        const branch = target?.dataset.value
          ? (api.collection.findNode(target.dataset.value) as
              | TreeNode
              | undefined)
          : undefined
        if (
          branch &&
          !branch.disabled &&
          !canSelectNode(branch, selectionBehavior ?? "all") &&
          (event.key === "Enter" || event.key === " ")
        ) {
          event.preventDefault()
          if (api.expandedValue.includes(branch.id)) {
            api.collapse([branch.id])
          } else {
            api.expand([branch.id])
          }
          return
        }
        api.getTreeProps().onKeyDown?.(event)
      }}
      role="tree"
    >
      {children}
    </div>
  )
}

type TreeViewNodeProviderProps = {
  node: TreeNode
  indexPath: number[]
  children: ReactNode
}

TreeView.NodeProvider = function TreeViewNodeProvider({
  node,
  indexPath,
  children,
}: TreeViewNodeProviderProps) {
  const { api } = useTreeViewContext()
  const collectionNode =
    (api.collection.findNode(node.id) as TreeNode | undefined) ?? node
  const nodeProps = { node: collectionNode, indexPath }
  const nodeState = api.getNodeState(nodeProps)

  return (
    <TreeViewNodeContext.Provider
      value={{ node: collectionNode, indexPath, nodeProps, nodeState }}
    >
      {children}
    </TreeViewNodeContext.Provider>
  )
}

type TreeViewBranchProps = ComponentPropsWithoutRef<"div">

TreeView.Branch = function TreeViewBranch({
  children,
  className,
  ...props
}: TreeViewBranchProps) {
  const { api, styles } = useTreeViewContext()
  const { nodeProps } = useTreeViewNodeContext()

  return (
    <div
      className={styles.branch({ className })}
      {...api.getBranchProps(nodeProps)}
      {...props}
    >
      {children}
    </div>
  )
}

type TreeViewBranchTriggerProps = ComponentPropsWithoutRef<"div">

TreeView.BranchTrigger = function TreeViewBranchTrigger({
  children,
  className,
  ...props
}: TreeViewBranchTriggerProps) {
  const { styles } = useTreeViewContext()

  return (
    <div className={styles.branchTrigger({ className })} {...props}>
      {children}
    </div>
  )
}

type TreeViewBranchControlProps = ComponentPropsWithoutRef<"div">

TreeView.BranchControl = function TreeViewBranchControl({
  children,
  className,
  ...props
}: TreeViewBranchControlProps) {
  const { api, styles, selectionBehavior } = useTreeViewContext()
  const { node, nodeProps, nodeState } = useTreeViewNodeContext()

  const controlProps = api.getBranchControlProps(nodeProps)
  const isSelectable =
    selectionBehavior !== "leaf-only" &&
    (selectionBehavior !== "custom" || node.selectable !== false)
  const finalProps = {
    ...mergeProps(props, controlProps),
    onClick: (event: MouseEvent<HTMLDivElement>) => {
      props.onClick?.(event)
      if (event.defaultPrevented || nodeState.disabled) {
        return
      }
      if (isSelectable) {
        controlProps.onClick?.(event)
      } else {
        event.stopPropagation()
        if (nodeState.expanded) {
          api.collapse([node.id])
        } else {
          api.expand([node.id])
        }
      }
    },
  }

  return (
    <div
      className={styles.branchControl({ className })}
      {...finalProps}
      tabIndex={nodeState.disabled ? -1 : controlProps.tabIndex}
    >
      {children}
    </div>
  )
}

type TreeViewBranchTextProps = {
  children?: ReactNode
  className?: string
}

TreeView.BranchText = function TreeViewBranchText({
  children,
  className,
}: TreeViewBranchTextProps) {
  const { api, styles } = useTreeViewContext()
  const { node, nodeProps } = useTreeViewNodeContext()

  return (
    <span
      className={styles.branchText({ className })}
      {...api.getBranchTextProps(nodeProps)}
    >
      {children || node.name}
    </span>
  )
}

type TreeViewBranchIndicatorProps = {
  icon?: IconType
  className?: string
}

TreeView.BranchIndicator = function TreeViewBranchIndicator({
  icon = "token-icon-tree-indicator",
  className,
}: TreeViewBranchIndicatorProps) {
  const { api, styles } = useTreeViewContext()
  const { node, nodeProps, nodeState } = useTreeViewNodeContext()

  return (
    <button
      {...api.getBranchIndicatorProps(nodeProps)}
      aria-expanded={nodeState.expanded}
      aria-hidden={undefined}
      aria-label={`${nodeState.expanded ? "Collapse" : "Expand"} ${node.name}`}
      className={styles.branchIndicator({ className })}
      disabled={nodeState.disabled}
      onClick={(event) => {
        event.stopPropagation()
        if (nodeState.disabled) {
          return
        }
        if (nodeState.expanded) {
          api.collapse([node.id])
        } else {
          api.expand([node.id])
        }
      }}
      onMouseDown={(event) => event.preventDefault()}
      tabIndex={-1}
      type="button"
    >
      <Icon
        className={styles.indicatorIcon()}
        data-state={nodeState.expanded ? "open" : "closed"}
        icon={icon}
        size="current"
      />
    </button>
  )
}

type TreeViewBranchContentProps = ComponentPropsWithoutRef<"div">

TreeView.BranchContent = function TreeViewBranchContent({
  children,
  className,
  ...props
}: TreeViewBranchContentProps) {
  const { api, styles } = useTreeViewContext()
  const { nodeProps } = useTreeViewNodeContext()

  return (
    <div
      className={styles.branchContent({ className })}
      {...api.getBranchContentProps(nodeProps)}
      {...props}
    >
      {children}
    </div>
  )
}

type TreeViewIndentGuideProps = {
  className?: string
}

TreeView.IndentGuide = function TreeViewIndentGuide({
  className,
}: TreeViewIndentGuideProps) {
  const { api, styles } = useTreeViewContext()
  const { nodeProps } = useTreeViewNodeContext()

  return (
    <div
      className={styles.indentGuide({ className })}
      {...api.getBranchIndentGuideProps(nodeProps)}
    />
  )
}

type TreeViewItemProps = ComponentPropsWithoutRef<"div">

TreeView.Item = function TreeViewItem({
  children,
  className,
  ...props
}: TreeViewItemProps) {
  const { api, styles, selectionBehavior } = useTreeViewContext()
  const { node, nodeProps, nodeState } = useTreeViewNodeContext()

  const isSelectable =
    selectionBehavior !== "custom" || node.selectable !== false
  const itemProps = api.getItemProps(nodeProps)
  const finalProps = {
    ...mergeProps(props, itemProps),
    onClick: (event: MouseEvent<HTMLDivElement>) => {
      props.onClick?.(event)
      if (!event.defaultPrevented && isSelectable) {
        itemProps.onClick?.(event)
      }
    },
  }

  return (
    <div
      className={styles.item({ className })}
      {...finalProps}
      aria-selected={
        isSelectable && !nodeState.disabled ? nodeState.selected : undefined
      }
      data-selected={nodeState.selected || undefined}
      role="treeitem"
      tabIndex={nodeState.disabled ? -1 : itemProps.tabIndex}
    >
      {children}
    </div>
  )
}

type TreeViewItemTextProps = {
  children?: ReactNode
  className?: string
}

TreeView.ItemText = function TreeViewItemText({
  children,
  className,
}: TreeViewItemTextProps) {
  const { api, styles } = useTreeViewContext()
  const { node, nodeProps } = useTreeViewNodeContext()

  return (
    <span
      className={styles.itemText({ className })}
      {...api.getItemTextProps(nodeProps)}
    >
      {children || node.name}
    </span>
  )
}

type TreeViewNodeIconProps = ComponentPropsWithoutRef<"span"> & {
  icon?: IconType
}

TreeView.NodeIcon = function TreeViewNodeIcon({
  icon,
  className,
  ...props
}: TreeViewNodeIconProps) {
  const { styles } = useTreeViewContext()
  const { node, nodeState } = useTreeViewNodeContext()

  const iconToShow =
    icon ||
    (nodeState.isBranch
      ? node.icons?.branch ||
        (nodeState.expanded
          ? "token-icon-tree-node-open"
          : "token-icon-tree-node")
      : node.icons?.leaf || "token-icon-tree-item")

  return (
    <span
      className={styles.nodeIcon({ className })}
      data-state={nodeState.expanded ? "open" : "closed"}
      {...props}
    >
      <Icon icon={iconToShow} />
    </span>
  )
}

// This component provides a default implementation using all subcomponents
type TreeViewNodeProps = {
  node: TreeNode
  indexPath: number[]
  showIndentGuides?: boolean
  showNodeIcons?: boolean
  onNodeHover?: (node: TreeNode, indexPath: number[]) => void
  onNodeLeave?: (node: TreeNode, indexPath: number[]) => void
}

TreeView.Node = function TreeViewNode({
  node,
  indexPath,
  showIndentGuides = true,
  showNodeIcons = true,
  onNodeHover,
  onNodeLeave,
}: TreeViewNodeProps) {
  const { api } = useTreeViewContext()
  const nodeProps = { node, indexPath }
  const nodeState = api.getNodeState(nodeProps)

  return (
    <TreeView.NodeProvider indexPath={indexPath} node={node}>
      {nodeState.isBranch ? (
        <TreeView.Branch>
          <TreeView.BranchTrigger
            onMouseEnter={() => onNodeHover?.(node, indexPath)}
            onMouseLeave={() => onNodeLeave?.(node, indexPath)}
          >
            <TreeView.BranchControl>
              {showNodeIcons && <TreeView.NodeIcon />}
              <TreeView.BranchText />
            </TreeView.BranchControl>
            <TreeView.BranchIndicator />
          </TreeView.BranchTrigger>
          <TreeView.BranchContent>
            {showIndentGuides && <TreeView.IndentGuide />}
            {node.children?.map((childNode, index) => (
              <TreeView.Node
                indexPath={[...indexPath, index]}
                key={childNode.id}
                node={childNode}
                onNodeHover={onNodeHover}
                onNodeLeave={onNodeLeave}
                showIndentGuides={showIndentGuides}
                showNodeIcons={showNodeIcons}
              />
            ))}
          </TreeView.BranchContent>
        </TreeView.Branch>
      ) : (
        <TreeView.Item
          onMouseEnter={() => onNodeHover?.(node, indexPath)}
          onMouseLeave={() => onNodeLeave?.(node, indexPath)}
        >
          {showNodeIcons && <TreeView.NodeIcon />}
          <TreeView.ItemText />
        </TreeView.Item>
      )}
    </TreeView.NodeProvider>
  )
}

TreeView.displayName = "TreeView"
