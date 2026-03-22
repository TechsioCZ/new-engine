import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Badge } from '../../src/atoms/badge'
import { Button } from '../../src/atoms/button'
import { TreeView, type TreeNode } from '../../src/molecules/tree-view'

const meta: Meta<typeof TreeView> = {
  title: 'Molecules/TreeView',
  component: TreeView,
  parameters: {
    layout: 'centered',
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
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the tree view',
      table: { defaultValue: { summary: 'md' }, category: 'Appearance' },
    },
    selectionMode: {
      control: 'select',
      options: ['single', 'multiple'],
      description: 'Selection mode',
      table: { defaultValue: { summary: 'single' }, category: 'Selection' },
    },
    selectionBehavior: {
      control: 'select',
      options: ['all', 'leaf-only', 'custom'],
      description: 'Which nodes can be selected',
      table: { defaultValue: { summary: 'all' }, category: 'Selection' },
    },
    expandOnClick: {
      control: 'boolean',
      description: 'Expand branches on click',
      table: { defaultValue: { summary: 'true' }, category: 'Behavior' },
    },
    typeahead: {
      control: 'boolean',
      description: 'Enable typeahead navigation',
      table: { defaultValue: { summary: 'true' }, category: 'Behavior' },
    },
    dir: {
      control: 'radio',
      options: ['ltr', 'rtl'],
      description: 'Text direction',
      table: { defaultValue: { summary: 'ltr' }, category: 'Behavior' },
    },
  },
}

export default meta
type Story = StoryObj<typeof TreeView>

// Sample data
const fileSystemData: TreeNode[] = [
  {
    id: 'src',
    name: 'src',
    children: [
      {
        id: 'components',
        name: 'components',
        children: [
          {
            id: 'atoms',
            name: 'atoms',
            children: [
              { id: 'button.tsx', name: 'button.tsx' },
              { id: 'input.tsx', name: 'input.tsx' },
              { id: 'icon.tsx', name: 'icon.tsx' },
            ],
          },
          {
            id: 'molecules',
            name: 'molecules',
            children: [
              { id: 'dialog.tsx', name: 'dialog.tsx' },
              { id: 'combobox.tsx', name: 'combobox.tsx' },
              { id: 'tree-comp.tsx', name: 'tree-comp.tsx' },
            ],
          },
        ],
      },
      {
        id: 'utils',
        name: 'utils',
        disabled: true,
        children: [
          { id: 'helpers.ts', name: 'helpers.ts' },
          { id: 'constants.ts', name: 'constants.ts' },
        ],
      },
      { id: 'index.ts', name: 'index.ts' },
    ],
  },
  {
    id: 'public',
    name: 'public',
    children: [
      { id: 'favicon.ico', name: 'favicon.ico' },
      { id: 'robots.txt', name: 'robots.txt' },
    ],
  },
  {
    id: 'package.json',
    name: 'package.json',
  },
  {
    id: 'README.md',
    name: 'README.md',
  },
]

const navigationData: TreeNode[] = [
  {
    id: 'home',
    name: 'Home',
    selectable: false,
  },
  {
    id: 'products',
    name: 'Products',
    selectable: false,
    children: [
      {
        id: 'electronics',
        name: 'Electronics',
        selectable: false,
        children: [
          { id: 'phones', name: 'Phones' },
          { id: 'laptops', name: 'Laptops' },
          { id: 'tablets', name: 'Tablets' },
        ],
      },
      {
        id: 'clothing',
        name: 'Clothing',
        selectable: false,
        children: [
          { id: 'mens', name: "Men's" },
          { id: 'womens', name: "Women's" },
          { id: 'kids', name: 'Kids' },
        ],
      },
    ],
  },
  {
    id: 'about',
    name: 'About Us',
  },
  {
    id: 'contact',
    name: 'Contact',
  },
]

export const Playground: Story = {
  args: {
    size: 'md',
    selectionMode: 'single',
    selectionBehavior: 'all',
    expandOnClick: true,
    typeahead: true,
    dir: 'ltr',
  },
  render: (args) => (
    <TreeView
      data={fileSystemData}
      className="w-md"
      size={args.size}
      selectionMode={args.selectionMode}
      selectionBehavior={args.selectionBehavior}
      expandOnClick={args.expandOnClick}
      typeahead={args.typeahead}
      dir={args.dir}
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
  parameters: {
    docs: {
      description: {
        story: 'Interactive TreeView with all controls. Try different sizes, selection modes, and behaviors.',
      },
    },
  },
}

export const CustomComposition: Story = {
  render: () => (
      <TreeView data={fileSystemData} className='w-md' selectionMode="multiple">
        <TreeView.Label>Project Structure</TreeView.Label>
        <TreeView.Tree>
          {fileSystemData.map((node, index) => {
            const RenderNode = ({ node, indexPath }: { node: TreeNode; indexPath: number[] }) => (
              <TreeView.NodeProvider node={node} indexPath={indexPath}>
                {node.children ? (
                  <TreeView.Branch>
                    <TreeView.BranchTrigger>
                      <TreeView.BranchControl>
                        <TreeView.NodeIcon />
                        <TreeView.BranchText />
                        {node.children && (
                          <Badge variant="secondary" className="ml-xs">
                            {String(node.children.length)}
                          </Badge>
                        )}
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
                    {node.name.endsWith('.tsx') && (
                      <Badge variant="info" className="ml-auto">
                        TSX
                      </Badge>
                    )}
                    {node.name.endsWith('.ts') && !node.name.endsWith('.tsx') && (
                      <Badge variant="warning" className="ml-auto">
                        TS
                      </Badge>
                    )}
                  </TreeView.Item>
                )}
              </TreeView.NodeProvider>
            )

            return <RenderNode key={node.id} node={node} indexPath={[index]} />
          })}
        </TreeView.Tree>
      </TreeView>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Full compound pattern example showing how to customize node rendering. This adds Badges for child counts and file types, demonstrating the flexibility of the compound component pattern.',
      },
    },
  },
}

export const Minimal: Story = {
  render: () => (
      <TreeView data={navigationData} selectionMode="single" className='w-xs'>
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
  parameters: {
    docs: {
      description: {
        story: 'Minimal TreeView without icons or indent guides, ideal for navigation menus or simple hierarchical lists.',
      },
    },
  },
}

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-300">
        <TreeView data={fileSystemData} size="sm" className='w-md' selectionMode="single">
          <TreeView.Label>Small Size</TreeView.Label>
          <TreeView.Tree>
            {fileSystemData.map((node, index) => (
              <TreeView.Node key={node.id} node={node} indexPath={[index]} />
            ))}
          </TreeView.Tree>
        </TreeView>
        <TreeView data={fileSystemData} size="md" className='w-md' selectionMode="single">
          <TreeView.Label>Medium Size (Default)</TreeView.Label>
          <TreeView.Tree>
            {fileSystemData.map((node, index) => (
              <TreeView.Node key={node.id} node={node} indexPath={[index]} />
            ))}
          </TreeView.Tree>
        </TreeView>
        <TreeView data={fileSystemData} size="lg" className='w-md' selectionMode="single">
          <TreeView.Label>Large Size</TreeView.Label>
          <TreeView.Tree>
            {fileSystemData.map((node, index) => (
              <TreeView.Node key={node.id} node={node} indexPath={[index]} />
            ))}
          </TreeView.Tree>
        </TreeView>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'TreeView supports three size variants: sm, md, and lg. Choose the appropriate size based on your UI density requirements.',
      },
    },
  },
}

export const SelectionBehaviors: Story = {
  render: () => (
    <div className="flex flex-col gap-300">
        <TreeView
          className='w-md'
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
          className='w-md'
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
          className='w-md'
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
  parameters: {
    docs: {
      description: {
        story: 'TreeView supports three selectionBehavior modes: "all" (both branches and leaves selectable), "leaf-only" (only leaf nodes selectable, branches just expand/collapse), and "custom" (individual nodes control selectability via selectable property).',
      },
    },
  },
}

export const Controlled: Story = {
  render: () => {
    const ControlledExample = () => {
      const [expanded, setExpanded] = useState<string[]>(['src', 'components'])
      const [selected, setSelected] = useState<string[]>(['button.tsx'])

      return (
        <div className="flex gap-300">
            <TreeView
              className='w-md'
              data={fileSystemData}
              selectionMode="multiple"
              expandedValue={expanded}
              selectedValue={selected}
              onExpandedChange={(details) => setExpanded(details.expandedValue)}
              onSelectionChange={(details) =>
                setSelected(details.selectedValue)
              }
            >
              <TreeView.Label>Controlled Tree</TreeView.Label>
              <TreeView.Tree>
                {fileSystemData.map((node, index) => (
                  <TreeView.Node
                    key={node.id}
                    node={node}
                    indexPath={[index]}
                  />
                ))}
              </TreeView.Tree>
            </TreeView>

          <div className="flex flex-col gap-100">
            <div className="p-100 bg-surface-secondary rounded-md">
              <h4 className="text-sm font-semibold mb-xs">Expanded Nodes:</h4>
              <ul className="text-xs space-y-xs">
                {expanded.map((id) => (
                  <li key={id} className="text-fg-muted">
                    {id}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-100 bg-surface-secondary rounded-md">
              <h4 className="text-sm font-semibold mb-xs">Selected Nodes:</h4>
              <ul className="text-xs space-y-xs">
                {selected.map((id) => (
                  <li key={id} className="text-fg-muted">
                    {id}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-50">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setExpanded(['src', 'components', 'atoms'])}
              >
                Expand Some
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setExpanded([])}
              >
                Collapse All
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setSelected([])}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return <ControlledExample />
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates controlled TreeView state with external controls. Use expandedValue/selectedValue props with callbacks to manage state externally, enabling integration with forms or other UI controls.',
      },
    },
  },
}

export const CustomStyling: Story = {
  render: () => (
      <TreeView data={fileSystemData} selectionMode="single" className="w-lg bg-gradient-to-br from-surface to-surface-secondary rounded-lg">
        <h2 className="text-lg font-bold mb-md bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          🎨 Styled File Explorer
        </h2>
        <TreeView.Tree className="bg-white/50 dark:bg-black/20 backdrop-blur-sm">
          {fileSystemData.map((node, index) => {
            const CustomNode = ({ node, indexPath }: { node: TreeNode; indexPath: number[] }) => (
              <TreeView.NodeProvider node={node} indexPath={indexPath}>
                {node.children ? (
                  <TreeView.Branch className='data-disabled:opacity-40'>
                    <TreeView.BranchTrigger className="hover:bg-primary/10 rounded-sm transition-colors">
                      <TreeView.BranchControl>
                        <span className="text-primary">
                          <TreeView.NodeIcon />
                        </span>
                        <TreeView.BranchText className="font-semibold text-fg-primary" />
                      </TreeView.BranchControl>
                      <TreeView.BranchIndicator className="text-secondary" />
                    </TreeView.BranchTrigger>
                    <TreeView.BranchContent>
                      <div className="ml-md pl-sm border-l-2 border-border-secondary/30">
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
                  <TreeView.Item className="hover:bg-secondary/10 rounded-sm transition-colors ml-sm">
                    <span className="text-secondary">
                      <TreeView.NodeIcon />
                    </span>
                    <TreeView.ItemText className="text-fg-secondary" />
                  </TreeView.Item>
                )}
              </TreeView.NodeProvider>
            )

            return <CustomNode key={node.id} node={node} indexPath={[index]} />
          })}
        </TreeView.Tree>
      </TreeView>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Advanced styling example showing how to apply custom Tailwind classes to TreeView components for theming. Use className props on any sub-component to customize appearance.',
      },
    },
  },
}

export const DefaultExpanded: Story = {
  render: () => (
      <TreeView
        data={fileSystemData}
        selectionMode="single"
        defaultExpandedValue={['src', 'components', 'atoms']}
        defaultSelectedValue={['button.tsx']}
        className='w-md'
      >
        <TreeView.Label>With Default State</TreeView.Label>
        <TreeView.Tree>
          {fileSystemData.map((node, index) => (
            <TreeView.Node key={node.id} node={node} indexPath={[index]} />
          ))}
        </TreeView.Tree>
      </TreeView>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Shows how to use defaultExpandedValue and defaultSelectedValue props to set initial tree state without managing state yourself. Useful for uncontrolled components.',
      },
    },
  },
}

export const SelectionModes: Story = {
  render: () => {
    const SelectionModesExample = () => {
      const [singleSelected, setSingleSelected] = useState<string[]>(['button.tsx'])
      const [multiSelected, setMultiSelected] = useState<string[]>(['button.tsx', 'dialog.tsx', 'helpers.ts'])

      return (
        <div className="flex gap-300">
          <div className="flex-1">
            <TreeView
              data={fileSystemData}
              selectionMode="single"
              selectedValue={singleSelected}
              onSelectionChange={(details) => setSingleSelected(details.selectedValue)}
              defaultExpandedValue={['src', 'components', 'atoms']}
              className='w-full'
            >
              <TreeView.Label>Single Selection</TreeView.Label>
              <TreeView.Tree>
                {fileSystemData.map((node, index) => (
                  <TreeView.Node key={node.id} node={node} indexPath={[index]} />
                ))}
              </TreeView.Tree>
            </TreeView>
            <div className="mt-100 p-100 bg-overlay rounded-md">
              <p className="text-xs font-semibold mb-50">Selected:</p>
              <p className="text-xs text-fg-secondary">
                {singleSelected.join(', ') || 'None'}
              </p>
              <p className="text-xs text-fg-secondary mt-50">
                Click any item to select it
              </p>
            </div>
          </div>

          <div className="flex-1">
            <TreeView
              data={fileSystemData}
              selectionMode="multiple"
              selectedValue={multiSelected}
              onSelectionChange={(details) => setMultiSelected(details.selectedValue)}
              defaultExpandedValue={['src', 'components', 'molecules']}
              className='w-full'
            >
              <TreeView.Label>Multiple Selection</TreeView.Label>
              <TreeView.Tree>
                {fileSystemData.map((node, index) => (
                  <TreeView.Node key={node.id} node={node} indexPath={[index]} />
                ))}
              </TreeView.Tree>
            </TreeView>
            <div className="mt-100 p-100 bg-overlay rounded-md">
              <p className="text-xs font-semibold mb-50">Selected ({multiSelected.length}):</p>
              <p className="text-xs text-fg-secondary">
                {multiSelected.join(', ') || 'None'}
              </p>
              <p className="text-xs text-fg-secondary mt-50">
                Use Ctrl+Click (Cmd+Click on Mac) to select multiple items
              </p>
            </div>
          </div>
        </div>
      )
    }

    return <SelectionModesExample />
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates the difference between single and multiple selection modes. In single mode, only one item can be selected at a time. In multiple mode, use Ctrl+Click (Cmd+Click on Mac) to select multiple items.',
      },
    },
  },
}

export const ExpandVsSelectionTest: Story = {
  render: () => {
    const InteractiveTest = () => {
      const [logs, setLogs] = useState<string[]>([])

      const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          fractionalSecondDigits: 3
        })
        setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 15))
      }

      return (
        <div className="space-y-200">
          <div className="p-100 bg-overlay rounded-md">
            <h4 className="text-sm font-semibold mb-50">Test Instructions:</h4>
            <ul className="text-xs space-y-50 text-fg-secondary">
              <li>• Click the <strong>chevron arrow</strong> → should ONLY expand/collapse</li>
              <li>• Click the <strong>folder/file name</strong> → should select (and expand if expandOnClick=true)</li>
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
                  addLog(`🔽 EXPANDED: ${details.expandedValue.join(', ') || 'none'}`)
                }}
                onSelectionChange={(details) => {
                  addLog(`✅ SELECTED: ${details.selectedValue.join(', ') || 'none'}`)
                }}
                className='w-full'
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
                  addLog(`🔽 EXPANDED: ${details.expandedValue.join(', ') || 'none'}`)
                }}
                onSelectionChange={(details) => {
                  addLog(`✅ SELECTED: ${details.selectedValue.join(', ') || 'none'}`)
                }}
                className='w-full'
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

          <div className="p-100 bg-overlay rounded-md">
            <div className="flex items-center justify-between mb-50">
              <h4 className="text-sm font-semibold">Event Log (last 15 events)</h4>
              <Button
                size="sm"
                onClick={() => setLogs([])}
              >
                Clear
              </Button>
            </div>
            <div className="bg-surface rounded-sm p-100 h-48 overflow-y-auto font-mono text-xs">
              {logs.length === 0 ? (
                <div className="text-fg-secondary">Waiting for interaction...</div>
              ) : (
                logs.map((log, index) => (
                  <div
                    key={index}
                    className={log.includes('SELECTED') ? 'text-success' : 'text-info'}
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

    return <InteractiveTest />
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive test to understand the difference between expand/collapse and selection. The chevron arrow should only expand/collapse branches, while clicking on the node text should select it. When expandOnClick is true, clicking on a branch node will also expand it.',
      },
    },
  },
}

export const WithHoverEvents: Story = {
  render: () => {
    const [logs, setLogs] = useState<string[]>([])

    const addLog = (message: string) => {
      const timestamp = new Date().toLocaleTimeString()
      setLogs((prev) => [...prev, `[${timestamp}] ${message}`])
    }

    const treeData = [
      {
        id: 'obleceni',
        name: 'Oblečení',
        handle: 'obleceni',
        children: [
          {
            id: 'trika',
            name: 'Trika a tílka',
            handle: 'trika-a-tilka',
            children: [
              {
                id: 'kratke',
                name: 'Krátké rukávy',
                handle: 'kratke-rukavy',
              },
              {
                id: 'dlouhe',
                name: 'Dlouhé rukávy',
                handle: 'dlouhe-rukavy',
              },
            ],
          },
          {
            id: 'mikiny',
            name: 'Mikiny',
            handle: 'mikiny',
          },
        ],
      },
      {
        id: 'cyklo',
        name: 'Cyklo',
        handle: 'cyklo',
        children: [
          {
            id: 'cyklo-obleceni',
            name: 'Oblečení',
            handle: 'cyklo-obleceni',
          },
        ],
      },
    ]

    const handleNodeHover = (node: any, indexPath: number[]) => {
      addLog(`🎯 HOVER: ${node.name} (handle: ${node.handle}) at path [${indexPath.join(', ')}]`)
    }

    const handleNodeLeave = (node: any, indexPath: number[]) => {
      addLog(`👋 LEAVE: ${node.name} (handle: ${node.handle})`)
    }

    return (
      <div className="flex flex-col gap-400">
        <TreeView
          className="w-3xs border-t-2 border-t-overlay p-200"
          data={treeData}
          selectionMode="single"
          size='sm'
          defaultExpandedValue={['obleceni']}
        >
          <TreeView.Label className="capitalize">Kategorie</TreeView.Label>
          <TreeView.Tree>
            {treeData?.map((node, index) => (
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
          <div className="flex flex-col mb-200">
            <h3 className="font-semibold">Hover Events Log</h3>
            <Button size="sm" onClick={() => setLogs([])}>
              Clear
            </Button>
          </div>
          <div className="bg-surface w-md rounded-sm p-100 h-48 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-fg-secondary">Hover over nodes to see events...</div>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className={
                    log.includes('HOVER')
                      ? 'text-success'
                      : log.includes('LEAVE')
                        ? 'text-warning'
                        : 'text-info'
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
  },
  parameters: {
    docs: {
      description: {
        story:
          'Test story for onNodeHover and onNodeLeave callbacks. Hover over any node (branch or leaf) to see events being logged. This demonstrates that callbacks work for all levels of the tree.',
      },
    },
  },
}