/*
 * TreeView — @techsio/ui-kit molecule.
 *
 * @component TreeView
 * @componentVersion v1.0.1
 * @skill tree-view-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the tree-view-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { mergeProps, normalizeProps, useMachine } from "@zag-js/react"
import type { PropTypes } from "@zag-js/react"
import { collection, connect, machine } from "@zag-js/tree-view"
import type {
  Api,
  NodeState,
  Props as ZagTreeViewProps,
} from "@zag-js/tree-view"
import { createContext, useContext, useId } from "react"
import type { ComponentPropsWithoutRef, MouseEvent, ReactNode } from "react"
import type { VariantProps } from "tailwind-variants"

import { Icon } from "../atoms/icon"
import type { IconType } from "../atoms/icon"
import { tv } from "../utils"

interface SelectionBehaviorMap {
  all: never
  custom: never
  "leaf-only": never
}

type SelectionBehavior = keyof SelectionBehaviorMap

export interface TreeNode {
  id: string
  name: string
  children?: TreeNode[] | undefined
  icons?: {
    branch?: IconType | undefined
    leaf?: IconType | undefined
  }
  disabled?: boolean | undefined
  selected?: boolean | undefined
  // Controls selection when the TreeView uses custom selection behavior.
  selectable?: boolean | undefined
  [key: string]: unknown
}

const focusOutlineClasses = [
  "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
  "focus-visible:outline-tree-view-ring",
  "focus-visible:outline-offset-(length:--default-ring-offset)",
]
const transitionColors =
  "transition-colors duration-200 motion-reduce:transition-none"
const treeViewTextLarge = "text-tree-view-lg"
const treeViewTextMedium = "text-tree-view-md"
const treeViewTextSmall = "text-tree-view-sm"

const treeViewVariants = tv({
  compoundSlots: [
    {
      class: [
        "relative",
        // get --depth from zag-js api
        "ms-[calc(var(--depth)*var(--tree-indent-per-level))]",
        "data-[depth=1]:ms-0",
      ],
      // leaf has a common style with branch
      slots: ["branch", "item"],
    },
    {
      class: [
        "flex items-center gap-tree-view-icon p-tree-view-node-padding",
        "cursor-pointer",
        "data-selected:text-tree-view-fg-selected",
        "group-hover:text-tree-view-fg-hover",
        "data-selected:group-hover:text-tree-view-fg-hover",
      ],
      slots: ["branchControl", "item"],
    },
  ],
  defaultVariants: {
    size: "md",
  },
  slots: {
    branch: [
      "data-disabled:cursor-not-allowed",
      "data-disabled:text-tree-view-fg-disabled",
      "data-disabled:*:pointer-events-none",
    ],
    branchContent: ["relative", "data-[state=closed]:hidden"],
    branchControl: ["flex-1"],
    branchIndicator: [
      "group-hover:text-tree-view-fg-hover",
      "data-[state=open]:token-icon-tree-indicator-open cursor-pointer hover:scale-125",
      "transition-all duration-200 motion-reduce:transition-none",
    ],
    branchText: ["flex-1"],
    branchTrigger: [
      "group flex items-center justify-between",
      "hover:bg-tree-view-node-bg-hover",
      "cursor-pointer",
      "has-focus-visible:outline-(style:--default-ring-style) has-focus-visible:outline-(length:--default-ring-width)",
      "has-focus-visible:outline-tree-view-ring",
      "has-focus-visible:outline-offset-(length:--default-ring-offset)",
      transitionColors,
    ],
    indentGuide: [
      "absolute start-1 inset-y-0",
      "w-tree-view-indent-width bg-tree-view-indent-bg",
      "opacity-tree-view-indent",
    ],
    item: [
      "hover:bg-tree-view-node-bg-hover hover:text-tree-view-fg-hover",
      "data-selected:hover:bg-tree-view-node-bg-hover",
      "data-selected:hover:text-tree-view-fg-hover",
      ...focusOutlineClasses,
      transitionColors,
    ],
    itemText: ["flex-1"],
    label: ["font-tree-view-label text-tree-view-label-fg"],
    nodeIcon: ["hover:text-tree-view-icon-hover", transitionColors],
    root: "relative rounded-tree-view bg-tree-view-root-bg",
    tree: ["bg-tree-view-bg", ...focusOutlineClasses],
  },
  variants: {
    size: {
      lg: {
        branchIndicator: "text-icon-control-lg",
        branchText: treeViewTextLarge,
        itemText: treeViewTextLarge,
        label: treeViewTextLarge,
        nodeIcon: "text-tree-view-icon-lg",
      },
      md: {
        branchIndicator: "text-icon-control-md",
        branchText: treeViewTextMedium,
        itemText: treeViewTextMedium,
        label: treeViewTextMedium,
        nodeIcon: "text-tree-view-icon-md",
      },
      sm: {
        branchIndicator: "text-icon-control-sm",
        branchText: treeViewTextSmall,
        itemText: treeViewTextSmall,
        label: treeViewTextSmall,
        nodeIcon: "text-tree-view-icon-sm",
      },
    },
  },
})

type TreeViewApi = Api<PropTypes, TreeNode>
type TreeViewStyles = ReturnType<typeof treeViewVariants>

const rootContextError = "TreeView components must be used within TreeView.Root"
const nodeContextError =
  "TreeView node components must be used within a node provider"

const TreeViewApiContext = createContext<TreeViewApi | null>(null)
const TreeViewSelectionContext = createContext<SelectionBehavior | null>(null)
const TreeViewStylesContext = createContext<TreeViewStyles | null>(null)

const useTreeViewApi = () => {
  const api = useContext(TreeViewApiContext)
  if (api === null) {
    throw new Error(rootContextError)
  }
  return api
}

const useTreeViewSelectionBehavior = () => {
  const selectionBehavior = useContext(TreeViewSelectionContext)
  if (selectionBehavior === null) {
    throw new Error(rootContextError)
  }
  return selectionBehavior
}

const useTreeViewStyles = () => {
  const styles = useContext(TreeViewStylesContext)
  if (styles === null) {
    throw new Error(rootContextError)
  }
  return styles
}

const TreeViewNodeContext = createContext<TreeNode | null>(null)
const TreeViewIndexPathContext = createContext<number[] | null>(null)
const TreeViewNodeStateContext = createContext<NodeState | null>(null)

const useTreeViewNode = () => {
  const node = useContext(TreeViewNodeContext)
  if (node === null) {
    throw new Error(nodeContextError)
  }
  return node
}

const useTreeViewNodeProps = () => {
  const indexPath = useContext(TreeViewIndexPathContext)
  const node = useTreeViewNode()
  if (indexPath === null) {
    throw new Error(nodeContextError)
  }
  return { indexPath, node }
}

const useTreeViewNodeState = () => {
  const nodeState = useContext(TreeViewNodeStateContext)
  if (nodeState === null) {
    throw new Error(nodeContextError)
  }
  return nodeState
}

interface TreeViewRootProps
  extends
    VariantProps<typeof treeViewVariants>,
    Omit<ZagTreeViewProps, "id" | "size">,
    Omit<ComponentPropsWithoutRef<"div">, "onChange" | "dir"> {
  data: TreeNode[]
  id?: string | undefined
  selectionBehavior?: SelectionBehavior | undefined
}

export const TreeView = ({
  id,
  data,
  size,
  selectionBehavior = "all",

  dir = "ltr",
  selectionMode = "single",
  expandedValue,
  selectedValue,
  focusedValue,
  defaultExpandedValue,
  defaultSelectedValue,
  expandOnClick = true,
  typeahead = true,
  onExpandedChange,
  onSelectionChange,
  onFocusChange,

  children,
  className,
  ...props
}: TreeViewRootProps) => {
  const generatedId = useId()
  const uniqueId = id ?? generatedId

  const treeCollection = collection<TreeNode>({
    nodeToString: (node) => node.name,
    nodeToValue: (node) => node.id,
    rootNode: { children: data, id: "ROOT", name: "" },
  })

  const service = useMachine(machine, {
    collection: treeCollection,
    dir,
    expandOnClick,
    id: uniqueId,
    selectionMode,
    typeahead,
    ...(expandedValue !== undefined && { expandedValue }),
    ...(selectedValue !== undefined && { selectedValue }),
    ...(focusedValue !== undefined && { focusedValue }),
    ...(defaultExpandedValue !== undefined && { defaultExpandedValue }),
    ...(defaultSelectedValue !== undefined && { defaultSelectedValue }),
    ...(onExpandedChange !== undefined && { onExpandedChange }),
    ...(onSelectionChange !== undefined && { onSelectionChange }),
    ...(onFocusChange !== undefined && { onFocusChange }),
  })

  const api = connect<PropTypes, TreeNode>(service, normalizeProps)
  const styles = treeViewVariants({ size })

  return (
    <TreeViewApiContext.Provider value={api}>
      <TreeViewSelectionContext.Provider value={selectionBehavior}>
        <TreeViewStylesContext.Provider value={styles}>
          <div
            className={styles.root({ className })}
            {...mergeProps(api.getRootProps(), props)}
          >
            {children}
          </div>
        </TreeViewStylesContext.Provider>
      </TreeViewSelectionContext.Provider>
    </TreeViewApiContext.Provider>
  )
}

type TreeViewLabelProps = ComponentPropsWithoutRef<"h3">

TreeView.Label = function Label({
  children,
  className,
  ...props
}: TreeViewLabelProps) {
  const api = useTreeViewApi()
  const styles = useTreeViewStyles()

  return (
    <h3
      className={styles.label({ className })}
      {...mergeProps(api.getLabelProps(), props)}
    >
      {children}
    </h3>
  )
}

type TreeViewTreeProps = ComponentPropsWithoutRef<"div">

TreeView.Tree = function Tree({
  children,
  className,
  ...props
}: TreeViewTreeProps) {
  const api = useTreeViewApi()
  const styles = useTreeViewStyles()

  return (
    <div
      className={styles.tree({ className })}
      {...mergeProps(api.getTreeProps(), props)}
    >
      {children}
    </div>
  )
}

interface TreeViewNodeProviderProps {
  node: TreeNode
  indexPath: number[]
  children: ReactNode
}

TreeView.NodeProvider = function NodeProvider({
  node,
  indexPath,
  children,
}: TreeViewNodeProviderProps) {
  const api = useTreeViewApi()
  const nodeProps = { indexPath, node }
  const nodeState = api.getNodeState(nodeProps)

  return (
    <TreeViewNodeContext.Provider value={node}>
      <TreeViewIndexPathContext.Provider value={indexPath}>
        <TreeViewNodeStateContext.Provider value={nodeState}>
          {children}
        </TreeViewNodeStateContext.Provider>
      </TreeViewIndexPathContext.Provider>
    </TreeViewNodeContext.Provider>
  )
}

type TreeViewBranchProps = ComponentPropsWithoutRef<"div">

TreeView.Branch = function Branch({
  children,
  className,
  ...props
}: TreeViewBranchProps) {
  const api = useTreeViewApi()
  const styles = useTreeViewStyles()
  const nodeProps = useTreeViewNodeProps()

  return (
    <div
      className={styles.branch({ className })}
      {...mergeProps(api.getBranchProps(nodeProps), props)}
    >
      {children}
    </div>
  )
}

type TreeViewBranchTriggerProps = ComponentPropsWithoutRef<"div">

TreeView.BranchTrigger = function BranchTrigger({
  children,
  className,
  ...props
}: TreeViewBranchTriggerProps) {
  const styles = useTreeViewStyles()

  return (
    <div className={styles.branchTrigger({ className })} {...props}>
      {children}
    </div>
  )
}

type TreeViewBranchControlProps = ComponentPropsWithoutRef<"div">

TreeView.BranchControl = function BranchControl({
  children,
  className,
  ...props
}: TreeViewBranchControlProps) {
  const api = useTreeViewApi()
  const selectionBehavior = useTreeViewSelectionBehavior()
  const styles = useTreeViewStyles()
  const node = useTreeViewNode()
  const nodeProps = useTreeViewNodeProps()
  const nodeState = useTreeViewNodeState()

  let isSelectable: boolean
  switch (selectionBehavior) {
    case "all": {
      isSelectable = true
      break
    }
    case "leaf-only": {
      isSelectable = false
      break
    }
    case "custom": {
      isSelectable = node.selectable !== false
      break
    }
    default: {
      isSelectable = true
    }
  }

  const controlProps = api.getBranchControlProps(nodeProps)
  if (!isSelectable) {
    delete controlProps["aria-selected"]
    controlProps.onClick = (event: MouseEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      // Allow toggle on click for non-selectable branches
      if (!nodeState.disabled) {
        if (nodeState.expanded) {
          api.collapse([node.id])
        } else {
          api.expand([node.id])
        }
      }
    }
  }

  return (
    <div
      className={styles.branchControl({ className })}
      {...controlProps}
      data-disabled={!isSelectable || nodeState.disabled || undefined}
      {...props}
    >
      {children}
    </div>
  )
}

interface TreeViewBranchTextProps {
  children?: ReactNode | undefined
  className?: string | undefined
}

TreeView.BranchText = function BranchText({
  children,
  className,
}: TreeViewBranchTextProps) {
  const api = useTreeViewApi()
  const styles = useTreeViewStyles()
  const node = useTreeViewNode()
  const nodeProps = useTreeViewNodeProps()

  return (
    <span
      className={styles.branchText({ className })}
      {...api.getBranchTextProps(nodeProps)}
    >
      {children ?? node.name}
    </span>
  )
}

interface TreeViewBranchIndicatorProps {
  icon?: IconType | undefined
  className?: string | undefined
}

TreeView.BranchIndicator = function BranchIndicator({
  icon = "token-icon-tree-indicator",
  className,
}: TreeViewBranchIndicatorProps) {
  const api = useTreeViewApi()
  const styles = useTreeViewStyles()
  const node = useTreeViewNode()
  const nodeProps = useTreeViewNodeProps()
  const nodeState = useTreeViewNodeState()

  const handleToggle = (id: string) => {
    if (nodeState.expanded) {
      api.collapse([id])
    } else {
      api.expand([id])
    }
  }

  return (
    <Icon
      className={styles.branchIndicator({ className })}
      icon={icon}
      {...api.getBranchIndicatorProps(nodeProps)}
      color={undefined}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        handleToggle(node.id)
      }}
    />
  )
}

type TreeViewBranchContentProps = ComponentPropsWithoutRef<"div">

TreeView.BranchContent = function BranchContent({
  children,
  className,
  ...props
}: TreeViewBranchContentProps) {
  const api = useTreeViewApi()
  const styles = useTreeViewStyles()
  const nodeProps = useTreeViewNodeProps()

  return (
    <div
      className={styles.branchContent({ className })}
      {...mergeProps(api.getBranchContentProps(nodeProps), props)}
    >
      {children}
    </div>
  )
}

interface TreeViewIndentGuideProps {
  className?: string | undefined
}

TreeView.IndentGuide = function IndentGuide({
  className,
}: TreeViewIndentGuideProps) {
  const api = useTreeViewApi()
  const styles = useTreeViewStyles()
  const nodeProps = useTreeViewNodeProps()

  return (
    <div
      className={styles.indentGuide({ className })}
      {...api.getBranchIndentGuideProps(nodeProps)}
    />
  )
}

type TreeViewItemProps = ComponentPropsWithoutRef<"div">

TreeView.Item = function Item({
  children,
  className,
  ...props
}: TreeViewItemProps) {
  const api = useTreeViewApi()
  const selectionBehavior = useTreeViewSelectionBehavior()
  const styles = useTreeViewStyles()
  const node = useTreeViewNode()
  const nodeProps = useTreeViewNodeProps()
  const nodeState = useTreeViewNodeState()

  let isSelectable: boolean
  switch (selectionBehavior) {
    case "all":
    case "leaf-only": {
      isSelectable = true
      break
    }
    case "custom": {
      isSelectable = node.selectable !== false
      break
    }
    default: {
      isSelectable = true
    }
  }

  const itemProps = api.getItemProps(nodeProps)
  if (!isSelectable) {
    delete itemProps["aria-selected"]
    itemProps.onClick = (event: MouseEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  return (
    <div
      className={styles.item({ className })}
      {...itemProps}
      data-disabled={!isSelectable || nodeState.disabled || undefined}
      data-selected={nodeState.selected || undefined}
      {...props}
    >
      {children}
    </div>
  )
}

interface TreeViewItemTextProps {
  children?: ReactNode | undefined
  className?: string | undefined
}

TreeView.ItemText = function ItemText({
  children,
  className,
}: TreeViewItemTextProps) {
  const api = useTreeViewApi()
  const styles = useTreeViewStyles()
  const node = useTreeViewNode()
  const nodeProps = useTreeViewNodeProps()

  return (
    <span
      className={styles.itemText({ className })}
      {...api.getItemTextProps(nodeProps)}
    >
      {children ?? node.name}
    </span>
  )
}

interface TreeViewNodeIconProps extends ComponentPropsWithoutRef<"span"> {
  icon?: IconType | undefined
}

TreeView.NodeIcon = function NodeIcon({
  icon,
  className,
  ...props
}: TreeViewNodeIconProps) {
  const styles = useTreeViewStyles()
  const node = useTreeViewNode()
  const nodeState = useTreeViewNodeState()

  let defaultIcon: IconType
  if (nodeState.isBranch) {
    defaultIcon = nodeState.expanded
      ? "token-icon-tree-node-open"
      : "token-icon-tree-node"
    defaultIcon = node.icons?.branch ?? defaultIcon
  } else {
    defaultIcon = node.icons?.leaf ?? "token-icon-tree-item"
  }
  const iconToShow = icon ?? defaultIcon

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
interface TreeViewNodeProps {
  node: TreeNode
  indexPath: number[]
  showIndentGuides?: boolean | undefined
  showNodeIcons?: boolean | undefined
  onNodeHover?: ((node: TreeNode, indexPath: number[]) => void) | undefined
  onNodeLeave?: ((node: TreeNode, indexPath: number[]) => void) | undefined
}

TreeView.Node = function Node({
  node,
  indexPath,
  showIndentGuides = true,
  showNodeIcons = true,
  onNodeHover,
  onNodeLeave,
}: TreeViewNodeProps) {
  const api = useTreeViewApi()
  const nodeProps = { indexPath, node }
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
