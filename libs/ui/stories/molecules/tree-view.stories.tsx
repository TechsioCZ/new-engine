import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"

import { Badge } from "../../src/atoms/badge"
import { Button } from "../../src/atoms/button"
import { TreeView } from "../../src/molecules/tree-view"
import type { TreeNode } from "../../src/molecules/tree-view"

const meta: Meta<typeof TreeView> = {
  argTypes: {
    dir: {
      control: "radio",
      description: "Text direction",
      options: ["ltr", "rtl"],
      table: { category: "Behavior", defaultValue: { summary: "ltr" } },
    },
    expandOnClick: {
      control: "boolean",
      description: "Expand branches on click",
      table: { category: "Behavior", defaultValue: { summary: "true" } },
    },
    selectionBehavior: {
      control: "select",
      description: "Which nodes can be selected",
      options: ["all", "leaf-only", "custom"],
      table: { category: "Selection", defaultValue: { summary: "all" } },
    },
    selectionMode: {
      control: "select",
      description: "Selection mode",
      options: ["single", "multiple"],
      table: { category: "Selection", defaultValue: { summary: "single" } },
    },
    size: {
      control: "select",
      description: "Size of the tree view",
      options: ["sm", "md", "lg"],
      table: { category: "Appearance", defaultValue: { summary: "md" } },
    },
    typeahead: {
      control: "boolean",
      description: "Enable typeahead navigation",
      table: { category: "Behavior", defaultValue: { summary: "true" } },
    },
  },
  component: TreeView,
  parameters: {
    docs: {
      description: {
        component: `A compound tree view component built with Zag.js. Provides flexible composition for creating file explorers, navigation menus, and hierarchical data displays.

## Keyboard Navigation

TreeView is fully keyboard accessible following WAI-ARIA tree pattern:

- **↑↓** - Navigate items up/down
- **←→** - Collapse/Expand branches
- **Space** or **Enter** - Select item
- **Ctrl+A** (Cmd+A on Mac) - Select all items (multiple mode)
- **Home/End** - Jump to first/last item
- **Shift+Click** - Range selection (multiple mode)
- **Ctrl+Click** (Cmd+Click on Mac) - Individual multi-select (multiple mode)`,
      },
    },
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Molecules/TreeView",
}

export default meta
type Story = StoryObj<typeof TreeView>

const buttonFileName = "button.tsx"
const dialogFileName = "dialog.tsx"
const helpersFileName = "helpers.ts"

// Sample data
const fileSystemData: TreeNode[] = [
  {
    children: [
      {
        children: [
          {
            children: [
              { id: buttonFileName, name: buttonFileName },
              { id: "input.tsx", name: "input.tsx" },
              { id: "icon.tsx", name: "icon.tsx" },
            ],
            id: "atoms",
            name: "atoms",
          },
          {
            children: [
              { id: dialogFileName, name: dialogFileName },
              { id: "combobox.tsx", name: "combobox.tsx" },
              { id: "tree-comp.tsx", name: "tree-comp.tsx" },
            ],
            id: "molecules",
            name: "molecules",
          },
        ],
        id: "components",
        name: "components",
      },
      {
        children: [
          { id: helpersFileName, name: helpersFileName },
          { id: "constants.ts", name: "constants.ts" },
        ],
        disabled: true,
        id: "utils",
        name: "utils",
      },
      { id: "index.ts", name: "index.ts" },
    ],
    id: "src",
    name: "src",
  },
  {
    children: [
      { id: "favicon.ico", name: "favicon.ico" },
      { id: "robots.txt", name: "robots.txt" },
    ],
    id: "public",
    name: "public",
  },
  {
    id: "package.json",
    name: "package.json",
  },
  {
    id: "README.md",
    name: "README.md",
  },
]

const navigationData: TreeNode[] = [
  {
    id: "home",
    name: "Home",
    selectable: false,
  },
  {
    children: [
      {
        children: [
          { id: "phones", name: "Phones" },
          { id: "laptops", name: "Laptops" },
          { id: "tablets", name: "Tablets" },
        ],
        id: "electronics",
        name: "Electronics",
        selectable: false,
      },
      {
        children: [
          { id: "mens", name: "Men's" },
          { id: "womens", name: "Women's" },
          { id: "kids", name: "Kids" },
        ],
        id: "clothing",
        name: "Clothing",
        selectable: false,
      },
    ],
    id: "products",
    name: "Products",
    selectable: false,
  },
  {
    id: "about",
    name: "About Us",
  },
  {
    id: "contact",
    name: "Contact",
  },
]

export const Playground: Story = {
  args: {
    dir: "ltr",
    expandOnClick: true,
    selectionBehavior: "all",
    selectionMode: "single",
    size: "md",
    typeahead: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Interactive TreeView with all controls. Try different sizes, selection modes, and behaviors.",
      },
    },
  },
  render: (args) => (
    <TreeView
      data={fileSystemData}
      className="w-md"
      {...(args.size === undefined ? {} : { size: args.size })}
      {...(args.selectionMode === undefined
        ? {}
        : { selectionMode: args.selectionMode })}
      {...(args.selectionBehavior === undefined
        ? {}
        : { selectionBehavior: args.selectionBehavior })}
      {...(args.expandOnClick === undefined
        ? {}
        : { expandOnClick: args.expandOnClick })}
      {...(args.typeahead === undefined ? {} : { typeahead: args.typeahead })}
      {...(args.dir === undefined ? {} : { dir: args.dir })}
    >
      <TreeView.Label>File Explorer</TreeView.Label>
      <TreeView.Tree>
        {fileSystemData.map((node, index) => (
          <TreeView.Node
            key={node.id}
            node={node}
            indexPath={[index]}
            showIndentGuides
            showNodeIcons
          />
        ))}
      </TreeView.Tree>
    </TreeView>
  ),
}

const RenderNode = ({
  node,
  indexPath,
}: {
  node: TreeNode
  indexPath: number[]
}) => (
  <TreeView.NodeProvider node={node} indexPath={indexPath}>
    {node.children ? (
      <TreeView.Branch>
        <TreeView.BranchTrigger>
          <TreeView.BranchControl>
            <TreeView.NodeIcon />
            <TreeView.BranchText />
            <Badge variant="secondary" className="ml-100">
              {String(node.children.length)}
            </Badge>
          </TreeView.BranchControl>
          <TreeView.BranchIndicator />
        </TreeView.BranchTrigger>
        <TreeView.BranchContent>
          <TreeView.IndentGuide />
          {node.children?.map((child, idx) => (
            <RenderNode
              key={child.id}
              node={child}
              indexPath={[...indexPath, idx]}
            />
          ))}
        </TreeView.BranchContent>
      </TreeView.Branch>
    ) : (
      <TreeView.Item>
        <TreeView.NodeIcon />
        <TreeView.ItemText />
        {node.name.endsWith(".tsx") && (
          <Badge variant="info" className="ml-auto">
            TSX
          </Badge>
        )}
        {node.name.endsWith(".ts") && !node.name.endsWith(".tsx") && (
          <Badge variant="warning" className="ml-auto">
            TS
          </Badge>
        )}
      </TreeView.Item>
    )}
  </TreeView.NodeProvider>
)

export const CustomComposition: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Full compound pattern example showing how to customize node rendering. This adds Badges for child counts and file types, demonstrating the flexibility of the compound component pattern.",
      },
    },
  },
  render: () => (
    <TreeView data={fileSystemData} className="w-md" selectionMode="multiple">
      <TreeView.Label>Project Structure</TreeView.Label>
      <TreeView.Tree>
        {fileSystemData.map((node, index) => (
          <RenderNode key={node.id} node={node} indexPath={[index]} />
        ))}
      </TreeView.Tree>
    </TreeView>
  ),
}

export const Minimal: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Minimal TreeView without icons or indent guides, ideal for navigation menus or simple hierarchical lists.",
      },
    },
  },
  render: () => (
    <TreeView data={navigationData} selectionMode="single" className="w-xs">
      <TreeView.Tree>
        {navigationData.map((node, index) => (
          <TreeView.Node
            key={node.id}
            node={node}
            indexPath={[index]}
            showIndentGuides={false}
            showNodeIcons={false}
          />
        ))}
      </TreeView.Tree>
    </TreeView>
  ),
}

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "TreeView supports three size variants: sm, md, and lg. Choose the appropriate size based on your UI density requirements.",
      },
    },
  },
  render: () => (
    <div className="flex flex-col gap-300">
      <TreeView
        data={fileSystemData}
        size="sm"
        className="w-md"
        selectionMode="single"
      >
        <TreeView.Label>Small Size</TreeView.Label>
        <TreeView.Tree>
          {fileSystemData.map((node, index) => (
            <TreeView.Node key={node.id} node={node} indexPath={[index]} />
          ))}
        </TreeView.Tree>
      </TreeView>
      <TreeView
        data={fileSystemData}
        size="md"
        className="w-md"
        selectionMode="single"
      >
        <TreeView.Label>Medium Size (Default)</TreeView.Label>
        <TreeView.Tree>
          {fileSystemData.map((node, index) => (
            <TreeView.Node key={node.id} node={node} indexPath={[index]} />
          ))}
        </TreeView.Tree>
      </TreeView>
      <TreeView
        data={fileSystemData}
        size="lg"
        className="w-md"
        selectionMode="single"
      >
        <TreeView.Label>Large Size</TreeView.Label>
        <TreeView.Tree>
          {fileSystemData.map((node, index) => (
            <TreeView.Node key={node.id} node={node} indexPath={[index]} />
          ))}
        </TreeView.Tree>
      </TreeView>
    </div>
  ),
}

export const SelectionBehaviors: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'TreeView supports three selectionBehavior modes: "all" (both branches and leaves selectable), "leaf-only" (only leaf nodes selectable, branches just expand/collapse), and "custom" (individual nodes control selectability via selectable property).',
      },
    },
  },
  render: () => (
    <div className="flex flex-col gap-300">
      <TreeView
        className="w-md"
        data={fileSystemData}
        selectionMode="multiple"
        selectionBehavior="all"
      >
        <TreeView.Label>All Selectable (Default)</TreeView.Label>
        <TreeView.Tree>
          {fileSystemData.map((node, index) => (
            <TreeView.Node key={node.id} node={node} indexPath={[index]} />
          ))}
        </TreeView.Tree>
      </TreeView>
      <TreeView
        className="w-md"
        data={fileSystemData}
        selectionMode="multiple"
        selectionBehavior="leaf-only"
      >
        <TreeView.Label>Leaf Only Selectable</TreeView.Label>
        <TreeView.Tree>
          {fileSystemData.map((node, index) => (
            <TreeView.Node key={node.id} node={node} indexPath={[index]} />
          ))}
        </TreeView.Tree>
      </TreeView>
      <TreeView
        className="w-md"
        data={navigationData}
        selectionMode="single"
        selectionBehavior="custom"
      >
        <TreeView.Label>Custom (via selectable prop)</TreeView.Label>
        <TreeView.Tree>
          {navigationData.map((node, index) => (
            <TreeView.Node key={node.id} node={node} indexPath={[index]} />
          ))}
        </TreeView.Tree>
      </TreeView>
    </div>
  ),
}

const ControlledExample = () => {
  const [expanded, setExpanded] = useState<string[]>(["src", "components"])
  const [selected, setSelected] = useState<string[]>([buttonFileName])

  return (
    <div className="flex gap-300">
      <TreeView
        className="w-md"
        data={fileSystemData}
        selectionMode="multiple"
        expandedValue={expanded}
        selectedValue={selected}
        onExpandedChange={(details) => {
          setExpanded(details.expandedValue)
        }}
        onSelectionChange={(details) => {
          setSelected(details.selectedValue)
        }}
      >
        <TreeView.Label>Controlled Tree</TreeView.Label>
        <TreeView.Tree>
          {fileSystemData.map((node, index) => (
            <TreeView.Node key={node.id} node={node} indexPath={[index]} />
          ))}
        </TreeView.Tree>
      </TreeView>

      <div className="flex flex-col gap-100">
        <div className="rounded-md bg-overlay p-100">
          <h4 className="mb-100 text-sm font-semibold">Expanded Nodes:</h4>
          <ul className="space-y-100 text-xs">
            {expanded.map((id) => (
              <li key={id} className="text-fg-secondary">
                {id}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-md bg-overlay p-100">
          <h4 className="mb-100 text-sm font-semibold">Selected Nodes:</h4>
          <ul className="space-y-100 text-xs">
            {selected.map((id) => (
              <li key={id} className="text-fg-secondary">
                {id}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-50">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setExpanded(["src", "components", "atoms"])
            }}
          >
            Expand Some
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setExpanded([])
            }}
          >
            Collapse All
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setSelected([])
            }}
          >
            Clear Selection
          </Button>
        </div>
      </div>
    </div>
  )
}

export const Controlled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates controlled TreeView state with external controls. Use expandedValue/selectedValue props with callbacks to manage state externally, enabling integration with forms or other UI controls.",
      },
    },
  },
  render: ControlledExample,
}

const CustomNode = ({
  node,
  indexPath,
}: {
  node: TreeNode
  indexPath: number[]
}) => (
  <TreeView.NodeProvider node={node} indexPath={indexPath}>
    {node.children ? (
      <TreeView.Branch className="data-disabled:opacity-40">
        <TreeView.BranchTrigger className="rounded-sm transition-colors hover:bg-primary/10">
          <TreeView.BranchControl>
            <span className="text-primary">
              <TreeView.NodeIcon />
            </span>
            <TreeView.BranchText className="font-semibold text-fg-primary" />
          </TreeView.BranchControl>
          <TreeView.BranchIndicator className="text-secondary" />
        </TreeView.BranchTrigger>
        <TreeView.BranchContent>
          <div className="ml-250 border-l-2 border-border-secondary/30 pl-150">
            {node.children?.map((child, idx) => (
              <CustomNode
                key={child.id}
                node={child}
                indexPath={[...indexPath, idx]}
              />
            ))}
          </div>
        </TreeView.BranchContent>
      </TreeView.Branch>
    ) : (
      <TreeView.Item className="ml-150 rounded-sm transition-colors hover:bg-secondary/10">
        <span className="text-secondary">
          <TreeView.NodeIcon />
        </span>
        <TreeView.ItemText className="text-fg-secondary" />
      </TreeView.Item>
    )}
  </TreeView.NodeProvider>
)

export const CustomStyling: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Advanced styling example showing how to apply custom Tailwind classes to TreeView components for theming. Use className props on any sub-component to customize appearance.",
      },
    },
  },
  render: () => (
    <TreeView
      data={fileSystemData}
      selectionMode="single"
      className="w-lg rounded-lg bg-gradient-to-br from-surface to-overlay"
    >
      <h2 className="mb-250 bg-gradient-to-r from-primary to-secondary bg-clip-text text-lg font-bold text-transparent">
        🎨 Styled File Explorer
      </h2>
      <TreeView.Tree className="bg-white/50 backdrop-blur-sm dark:bg-black/20">
        {fileSystemData.map((node, index) => (
          <CustomNode key={node.id} node={node} indexPath={[index]} />
        ))}
      </TreeView.Tree>
    </TreeView>
  ),
}

export const DefaultExpanded: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Shows how to use defaultExpandedValue and defaultSelectedValue props to set initial tree state without managing state yourself. Useful for uncontrolled components.",
      },
    },
  },
  render: () => (
    <TreeView
      data={fileSystemData}
      selectionMode="single"
      defaultExpandedValue={["src", "components", "atoms"]}
      defaultSelectedValue={[buttonFileName]}
      className="w-md"
    >
      <TreeView.Label>With Default State</TreeView.Label>
      <TreeView.Tree>
        {fileSystemData.map((node, index) => (
          <TreeView.Node key={node.id} node={node} indexPath={[index]} />
        ))}
      </TreeView.Tree>
    </TreeView>
  ),
}

const SelectionModesExample = () => {
  const [singleSelected, setSingleSelected] = useState<string[]>([
    buttonFileName,
  ])
  const [multiSelected, setMultiSelected] = useState<string[]>([
    buttonFileName,
    dialogFileName,
    helpersFileName,
  ])

  return (
    <div className="flex gap-300">
      <div className="flex-1">
        <TreeView
          data={fileSystemData}
          selectionMode="single"
          selectedValue={singleSelected}
          onSelectionChange={(details) => {
            setSingleSelected(details.selectedValue)
          }}
          defaultExpandedValue={["src", "components", "atoms"]}
          className="w-full"
        >
          <TreeView.Label>Single Selection</TreeView.Label>
          <TreeView.Tree>
            {fileSystemData.map((node, index) => (
              <TreeView.Node key={node.id} node={node} indexPath={[index]} />
            ))}
          </TreeView.Tree>
        </TreeView>
        <div className="mt-100 rounded-md bg-overlay p-100">
          <p className="mb-50 text-xs font-semibold">Selected:</p>
          <p className="text-xs text-fg-secondary">
            {singleSelected.join(", ") || "None"}
          </p>
          <p className="mt-50 text-xs text-fg-secondary">
            Click any item to select it
          </p>
        </div>
      </div>

      <div className="flex-1">
        <TreeView
          data={fileSystemData}
          selectionMode="multiple"
          selectedValue={multiSelected}
          onSelectionChange={(details) => {
            setMultiSelected(details.selectedValue)
          }}
          defaultExpandedValue={["src", "components", "molecules"]}
          className="w-full"
        >
          <TreeView.Label>Multiple Selection</TreeView.Label>
          <TreeView.Tree>
            {fileSystemData.map((node, index) => (
              <TreeView.Node key={node.id} node={node} indexPath={[index]} />
            ))}
          </TreeView.Tree>
        </TreeView>
        <div className="mt-100 rounded-md bg-overlay p-100">
          <p className="mb-50 text-xs font-semibold">
            Selected ({multiSelected.length}):
          </p>
          <p className="text-xs text-fg-secondary">
            {multiSelected.join(", ") || "None"}
          </p>
          <p className="mt-50 text-xs text-fg-secondary">
            Use Ctrl+Click (Cmd+Click on Mac) to select multiple items
          </p>
        </div>
      </div>
    </div>
  )
}

export const SelectionModes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates the difference between single and multiple selection modes. In single mode, only one item can be selected at a time. In multiple mode, use Ctrl+Click (Cmd+Click on Mac) to select multiple items.",
      },
    },
  },
  render: SelectionModesExample,
}

const InteractiveTest = () => {
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString("en-US", {
      fractionalSecondDigits: 3,
      hour: "2-digit",
      hour12: false,
      minute: "2-digit",
      second: "2-digit",
    })
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev].slice(0, 15))
  }

  return (
    <div className="space-y-200">
      <div className="rounded-md bg-overlay p-100">
        <h4 className="mb-50 text-sm font-semibold">Test Instructions:</h4>
        <ul className="space-y-50 text-xs text-fg-secondary">
          <li>
            • Click the <strong>chevron arrow</strong> → should ONLY
            expand/collapse
          </li>
          <li>
            • Click the <strong>folder/file name</strong> → should select (and
            expand if expandOnClick=true)
          </li>
          <li>• Try keyboard: Arrow keys to navigate, Space/Enter to select</li>
        </ul>
      </div>

      <div className="flex gap-300">
        <div className="flex-1">
          <TreeView
            data={fileSystemData}
            selectionMode="single"
            expandOnClick={false}
            onExpandedChange={(details) => {
              addLog(
                `🔽 EXPANDED: ${details.expandedValue.join(", ") || "none"}`,
              )
            }}
            onSelectionChange={(details) => {
              addLog(
                `✅ SELECTED: ${details.selectedValue.join(", ") || "none"}`,
              )
            }}
            className="w-full"
          >
            <TreeView.Label>expandOnClick = false</TreeView.Label>
            <TreeView.Tree>
              {fileSystemData.map((node, index) => (
                <TreeView.Node key={node.id} node={node} indexPath={[index]} />
              ))}
            </TreeView.Tree>
          </TreeView>
        </div>

        <div className="flex-1">
          <TreeView
            data={fileSystemData}
            selectionMode="single"
            expandOnClick={true}
            onExpandedChange={(details) => {
              addLog(
                `🔽 EXPANDED: ${details.expandedValue.join(", ") || "none"}`,
              )
            }}
            onSelectionChange={(details) => {
              addLog(
                `✅ SELECTED: ${details.selectedValue.join(", ") || "none"}`,
              )
            }}
            className="w-full"
          >
            <TreeView.Label>expandOnClick = true (default)</TreeView.Label>
            <TreeView.Tree>
              {fileSystemData.map((node, index) => (
                <TreeView.Node key={node.id} node={node} indexPath={[index]} />
              ))}
            </TreeView.Tree>
          </TreeView>
        </div>
      </div>

      <div className="rounded-md bg-overlay p-100">
        <div className="mb-50 flex items-center justify-between">
          <h4 className="text-sm font-semibold">Event Log (last 15 events)</h4>
          <Button
            size="sm"
            onClick={() => {
              setLogs([])
            }}
          >
            Clear
          </Button>
        </div>
        <div className="h-48 overflow-y-auto rounded-sm bg-surface p-100 font-mono text-xs">
          {logs.length === 0 ? (
            <div className="text-fg-secondary">Waiting for interaction...</div>
          ) : (
            logs.map((log) => (
              <div
                key={log}
                className={
                  log.includes("SELECTED") ? "text-success" : "text-info"
                }
              >
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export const ExpandVsSelectionTest: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Interactive test to understand the difference between expand/collapse and selection. The chevron arrow should only expand/collapse branches, while clicking on the node text should select it. When expandOnClick is true, clicking on a branch node will also expand it.",
      },
    },
  },
  render: InteractiveTest,
}

const getTreeNodeHandle = (node: TreeNode) => {
  const { handle } = node
  return typeof handle === "string" ? handle : "unknown"
}

const getHoverLogClassName = (log: string) => {
  if (log.includes("HOVER")) {
    return "text-success"
  }
  if (log.includes("LEAVE")) {
    return "text-warning"
  }
  return "text-info"
}

const WithHoverEventsStory: NonNullable<Story["render"]> = () => {
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`])
  }

  const treeData: TreeNode[] = [
    {
      children: [
        {
          children: [
            {
              handle: "kratke-rukavy",
              id: "kratke",
              name: "Krátké rukávy",
            },
            {
              handle: "dlouhe-rukavy",
              id: "dlouhe",
              name: "Dlouhé rukávy",
            },
          ],
          handle: "trika-a-tilka",
          id: "trika",
          name: "Trika a tílka",
        },
        {
          handle: "mikiny",
          id: "mikiny",
          name: "Mikiny",
        },
      ],
      handle: "obleceni",
      id: "obleceni",
      name: "Oblečení",
    },
    {
      children: [
        {
          handle: "cyklo-obleceni",
          id: "cyklo-obleceni",
          name: "Oblečení",
        },
      ],
      handle: "cyklo",
      id: "cyklo",
      name: "Cyklo",
    },
  ]

  const handleNodeHover = (node: TreeNode, indexPath: number[]) => {
    addLog(
      `🎯 HOVER: ${node.name} (handle: ${getTreeNodeHandle(node)}) at path [${indexPath.join(", ")}]`,
    )
  }

  const handleNodeLeave = (node: TreeNode) => {
    addLog(`👋 LEAVE: ${node.name} (handle: ${getTreeNodeHandle(node)})`)
  }

  return (
    <div className="flex flex-col gap-400">
      <TreeView
        className="w-3xs border-t-2 border-t-overlay p-200"
        data={treeData}
        selectionMode="single"
        size="sm"
        defaultExpandedValue={["obleceni"]}
      >
        <TreeView.Label className="capitalize">Kategorie</TreeView.Label>
        <TreeView.Tree>
          {treeData.map((node, index) => (
            <TreeView.Node
              showNodeIcons={false}
              key={node.id}
              node={node}
              indexPath={[index]}
              onNodeHover={handleNodeHover}
              onNodeLeave={handleNodeLeave}
            />
          ))}
        </TreeView.Tree>
      </TreeView>

      <div className="flex-1">
        <div className="mb-200 flex flex-col">
          <h3 className="font-semibold">Hover Events Log</h3>
          <Button
            size="sm"
            onClick={() => {
              setLogs([])
            }}
          >
            Clear
          </Button>
        </div>
        <div className="h-48 w-md overflow-y-auto rounded-sm bg-surface p-100 font-mono text-xs">
          {logs.length === 0 ? (
            <div className="text-fg-secondary">
              Hover over nodes to see events...
            </div>
          ) : (
            logs.map((log) => (
              <div key={log} className={getHoverLogClassName(log)}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export const WithHoverEvents: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Test story for onNodeHover and onNodeLeave callbacks. Hover over any node (branch or leaf) to see events being logged. This demonstrates that callbacks work for all levels of the tree.",
      },
    },
  },
  render: WithHoverEventsStory,
}
