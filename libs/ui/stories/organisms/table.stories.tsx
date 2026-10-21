import type { Meta, StoryObj } from '@storybook/react'
import { createRef, useState } from 'react'
import { expect, userEvent, within } from 'storybook/test'
import { Table } from '../../src/organisms/table'
import { Checkbox } from '../../src/atoms/checkbox'
import { Button } from '../../src/atoms/button'
import { StatusText } from '../../src/atoms/status-text'
import { VariantContainer } from '../../.storybook/decorator'

const meta = {
  title: 'Organisms/Table',
  component: Table,
  parameters: {
    controls: { exclude: ["ref", "id", "children", "ids", "getRootNode"] },
    docs: { description: { component: "Table displays a small structured data set using native table semantics, shared density and optional row activation. Use interactive rows only with an activation handler; use DataTable for filtering, sorting, virtualization or editing, and a list for unstructured content." } },
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [(Story) => <div className="w-full min-w-0 overflow-x-auto" role="region" aria-label="Scrollable table preview" tabIndex={0}><Story /></div>],
  argTypes: {
    variant: {
      control: 'select',
      options: ['line', 'outline', 'striped'],
      description: 'Visual style variant of the table',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of table cells and text',
    },
    interactive: {
      control: 'boolean',
      description: 'Enable hover effects and pointer cursor on rows',
    },
    stickyHeader: {
      control: 'boolean',
      description: 'Make header sticky on scroll',
    },
    showColumnBorder: {
      control: 'boolean',
      description: 'Show vertical borders between columns',
    },
    captionPlacement: {
      control: 'select',
      options: ['top', 'bottom'],
      description: 'Position of table caption',
    },
  },
} satisfies Meta<typeof Table>

export default meta
type Story = StoryObj<typeof meta>

// Sample data for stories
// Money goes through Intl, never `$` + toFixed (ux-guidelines, formatting.md).
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

const sampleProducts = [
  {
    id: 1,
    name: 'Laptop',
    category: 'Electronics',
    price: 999.99,
    stock: 50,
  },
  {
    id: 2,
    name: 'Coffee Maker',
    category: 'Home Appliances',
    price: 49.99,
    stock: 120,
  },
  {
    id: 3,
    name: 'Desk Chair',
    category: 'Furniture',
    price: 150.0,
    stock: 30,
  },
  {
    id: 4,
    name: 'Smartphone',
    category: 'Electronics',
    price: 799.99,
    stock: 75,
  },
  {
    id: 5,
    name: 'Headphones',
    category: 'Accessories',
    price: 199.99,
    stock: 200,
  },
]

// Fixed rows keep screenshots deterministic.
const productStock: [price: number, stock: number][] = [
  [678.19, 175],
  [652.69, 44],
  [731.46, 96],
  [295.39, 120],
  [320.47, 72],
  [384.96, 54],
  [39.75, 110],
  [717.24, 145],
  [90.1, 83],
  [515.58, 126],
  [340.45, 181],
  [426.23, 109],
  [357.22, 98],
  [351.38, 139],
  [583.28, 117],
  [857.23, 70],
  [447.15, 40],
  [452.79, 158],
  [987.42, 157],
  [738.12, 141],
]
const manyProducts = productStock.map(([price, stock], i) => ({
  id: i + 1,
  name: `Product ${i + 1}`,
  category: ['Electronics', 'Furniture', 'Accessories'][i % 3],
  price,
  stock,
}))

// === BASIC VARIANTS ===

export const Playground: Story = {
  parameters: { docs: { description: { story: "A native inventory table keeps text labels and numeric values aligned for quick comparison." } } },
  args: {
    variant: 'line',
    size: 'md',
  },
  render: (args) => (
    <Table {...args} ref={createRef<HTMLTableElement>()}>
      <Table.Caption>Product Inventory</Table.Caption>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>Product</Table.ColumnHeader>
          <Table.ColumnHeader>Category</Table.ColumnHeader>
          <Table.ColumnHeader numeric>Price</Table.ColumnHeader>
          <Table.ColumnHeader numeric>Stock</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {sampleProducts.map((product) => (
          <Table.Row key={product.id}>
            <Table.Cell>{product.name}</Table.Cell>
            <Table.Cell>{product.category}</Table.Cell>
            <Table.Cell numeric>{usd.format(product.price)}</Table.Cell>
            <Table.Cell numeric>{product.stock}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  ),
}

// === SIZE VARIANTS ===

export const Sizes: Story = {
  parameters: {
    controls: { disable: true }, docs: { description: { story: "Compare Small (sm), Medium (md) and Large (lg) with identical content to choose the appropriate interface density." } } },

  render: () => {

    const sizes = ['sm', 'md', 'lg'] as const
    const attributes = ["Product", "Category", "Price"]


    return (
    <VariantContainer>
      {sizes.map((size) => (
        <Table key={size} size={size}>
          <Table.Caption>{{ sm: "Small (sm)", md: "Medium (md)", lg: "Large (lg)" }[size]} — Product inventory</Table.Caption>
          <Table.Header>
            <Table.Row>
              {attributes.map((attribute) => (
                <Table.ColumnHeader key={attribute} numeric={attribute === "Price"}>{attribute}</Table.ColumnHeader>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {sampleProducts.slice(0, 3).map((product) => (
              <Table.Row key={product.id}>
                <Table.Cell>{product.name}</Table.Cell>
                <Table.Cell>{product.category}</Table.Cell>
                <Table.Cell numeric>{usd.format(product.price)}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      ))}
    </VariantContainer>
  )},
}

export const Outline: Story = {
  parameters: { docs: { description: { story: "An outlined table defines a standalone comparison surface without adding heavy cell borders." } } },
  args: {
    variant: 'outline',
    size: 'md',
  },
  render: (args) => (
    <Table {...args}>
      <Table.Caption>Product Inventory</Table.Caption>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>Product</Table.ColumnHeader>
          <Table.ColumnHeader>Category</Table.ColumnHeader>
          <Table.ColumnHeader numeric>Price</Table.ColumnHeader>
          <Table.ColumnHeader numeric>Stock</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {sampleProducts.map((product) => (
          <Table.Row key={product.id}>
            <Table.Cell>{product.name}</Table.Cell>
            <Table.Cell>{product.category}</Table.Cell>
            <Table.Cell numeric>{usd.format(product.price)}</Table.Cell>
            <Table.Cell numeric>{product.stock}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  ),
}

export const Interactive: Story = {
  parameters: { docs: { description: { story: "Activate a product row with Enter, Space or a click; the selected row retains focus and exposes its selection to assistive technology." } } },
  args: {
    variant: 'line',
    size: 'md',
    interactive: true,
  },
  render: function InteractiveInventory(args) {
    const [selected, setSelected] = useState<number | null>(null)
    return <Table {...args} ref={(table) => { table?.setAttribute("data-ref-attached", "true") }}>
      <Table.Caption>Choose a product with Enter, Space or a click</Table.Caption>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>Product</Table.ColumnHeader>
          <Table.ColumnHeader>Category</Table.ColumnHeader>
          <Table.ColumnHeader numeric>Price</Table.ColumnHeader>
          <Table.ColumnHeader numeric>Stock</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {sampleProducts.map((product) => (
          <Table.Row
            key={product.id}
            onClick={() => setSelected(product.id)}
            selected={selected === product.id}
          >
            <Table.Cell>{product.name}</Table.Cell>
            <Table.Cell>{product.category}</Table.Cell>
            <Table.Cell numeric>{usd.format(product.price)}</Table.Cell>
            <Table.Cell numeric>{product.stock}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  },
  play: async ({ canvasElement }) => {
    const row = within(canvasElement).getByRole("row", { name: /Laptop/ })
    row.focus()
    await userEvent.keyboard("{Enter}")
    await expect(row).toHaveAttribute("data-selected", "true")
    await expect(row).toHaveAttribute("aria-selected", "true")
    await expect(row).toHaveFocus()
  },
}

export const Striped: Story = {
  parameters: { docs: { description: { story: "Alternating inventory rows make it easier to track values across the table." } } },
  args: {
    variant: 'striped',
    size: 'md',
  },
  render: (args) => (
    <Table {...args}>
      <Table.Caption>Product Inventory</Table.Caption>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>Product</Table.ColumnHeader>
          <Table.ColumnHeader>Category</Table.ColumnHeader>
          <Table.ColumnHeader numeric>Price</Table.ColumnHeader>
          <Table.ColumnHeader numeric>Stock</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {sampleProducts.map((product) => (
          <Table.Row key={product.id}>
            <Table.Cell>{product.name}</Table.Cell>
            <Table.Cell>{product.category}</Table.Cell>
            <Table.Cell numeric>{usd.format(product.price)}</Table.Cell>
            <Table.Cell numeric>{product.stock}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  ),
}

// === ADVANCED FEATURES ===

export const WithFooter: Story = {
  parameters: { docs: { description: { story: "A totals footer summarizes numeric columns without disguising totals as another product." } } },
  args: {
    variant: 'line',
    size: 'md',
  },
  render: (args) => {
    const total = sampleProducts.reduce((sum, p) => sum + p.price, 0)
    const totalStock = sampleProducts.reduce((sum, p) => sum + p.stock, 0)

    return (
      <Table {...args}>
        <Table.Caption>Product Inventory with Totals</Table.Caption>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Product</Table.ColumnHeader>
            <Table.ColumnHeader>Category</Table.ColumnHeader>
            <Table.ColumnHeader numeric>Price</Table.ColumnHeader>
            <Table.ColumnHeader numeric>Stock</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {sampleProducts.map((product) => (
            <Table.Row key={product.id}>
              <Table.Cell>{product.name}</Table.Cell>
              <Table.Cell>{product.category}</Table.Cell>
              <Table.Cell numeric>{usd.format(product.price)}</Table.Cell>
              <Table.Cell numeric>{product.stock}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
        <Table.Footer>
          <Table.Row>
            <Table.Cell colSpan={2}>
              <strong>Total</strong>
            </Table.Cell>
            <Table.Cell numeric>
              <strong>{usd.format(total)}</strong>
            </Table.Cell>
            <Table.Cell numeric>
              <strong>{totalStock}</strong>
            </Table.Cell>
          </Table.Row>
        </Table.Footer>
      </Table>
    )
  },
}

export const StickyHeader: Story = {
  parameters: { docs: { description: { story: "A sticky header preserves column context while records scroll within a bounded region." } } },
  args: {
    variant: 'line',
    size: 'md',
    stickyHeader: true,
  },
  render: (args) => {
    return (
      // h-100 resolves to the theme's --spacing-100 token, not 400px.
      <div
        aria-label="Products, sticky header"
        className="h-[400px] overflow-auto"
        role="region"
        tabIndex={0}
      >
        <Table {...args}>
          <Table.Caption>Scroll to see sticky header effect</Table.Caption>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Product</Table.ColumnHeader>
              <Table.ColumnHeader>Category</Table.ColumnHeader>
              <Table.ColumnHeader numeric>Price</Table.ColumnHeader>
              <Table.ColumnHeader numeric>Stock</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {manyProducts.map((product) => (
              <Table.Row key={product.id}>
                <Table.Cell>{product.name}</Table.Cell>
                <Table.Cell>{product.category}</Table.Cell>
                <Table.Cell numeric>{usd.format(product.price)}</Table.Cell>
                <Table.Cell numeric>{product.stock}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
    )
  },
}

// === COMPLEX EXAMPLES ===

export const ComplexTable: Story = {
  parameters: { docs: { description: { story: "A richer inventory combines supporting labels and quantities within the same native table structure." } } },
  args: {
    variant: 'outline',
    size: 'md',
  },
  render: (args) => (
    <Table {...args}>
      <Table.Caption>Quarterly Sales Report 2024</Table.Caption>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>Region</Table.ColumnHeader>
          <Table.ColumnHeader numeric>Q1</Table.ColumnHeader>
          <Table.ColumnHeader numeric>Q2</Table.ColumnHeader>
          <Table.ColumnHeader numeric>Q3</Table.ColumnHeader>
          <Table.ColumnHeader numeric>Q4</Table.ColumnHeader>
          <Table.ColumnHeader numeric>Total</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        <Table.Row>
          <Table.Cell>North America</Table.Cell>
          <Table.Cell numeric>$125,000</Table.Cell>
          <Table.Cell numeric>$142,000</Table.Cell>
          <Table.Cell numeric>$138,000</Table.Cell>
          <Table.Cell numeric>$159,000</Table.Cell>
          <Table.Cell numeric>
            <strong>$564,000</strong>
          </Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>Europe</Table.Cell>
          <Table.Cell numeric>$98,000</Table.Cell>
          <Table.Cell numeric>$105,000</Table.Cell>
          <Table.Cell numeric>$112,000</Table.Cell>
          <Table.Cell numeric>$128,000</Table.Cell>
          <Table.Cell numeric>
            <strong>$443,000</strong>
          </Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>Asia Pacific</Table.Cell>
          <Table.Cell numeric>$87,000</Table.Cell>
          <Table.Cell numeric>$95,000</Table.Cell>
          <Table.Cell numeric>$102,000</Table.Cell>
          <Table.Cell numeric>$115,000</Table.Cell>
          <Table.Cell numeric>
            <strong>$399,000</strong>
          </Table.Cell>
        </Table.Row>
      </Table.Body>
      <Table.Footer>
        <Table.Row>
          <Table.Cell>
            <strong>Total</strong>
          </Table.Cell>
          <Table.Cell numeric>
            <strong>$310,000</strong>
          </Table.Cell>
          <Table.Cell numeric>
            <strong>$342,000</strong>
          </Table.Cell>
          <Table.Cell numeric>
            <strong>$352,000</strong>
          </Table.Cell>
          <Table.Cell numeric>
            <strong>$402,000</strong>
          </Table.Cell>
          <Table.Cell numeric>
            <strong>$1,406,000</strong>
          </Table.Cell>
        </Table.Row>
      </Table.Footer>
    </Table>
  ),
}

export const MinimalTable: Story = {
  parameters: { docs: { description: { story: "A small comparison omits unnecessary decoration while retaining meaningful column headings." } } },
  args: {
    variant: 'line',
    size: 'md',
  },
  render: (args) => (
    <Table {...args}>
      <Table.Body>
        <Table.Row>
          <Table.Cell>Simple</Table.Cell>
          <Table.Cell>Table</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>Without</Table.Cell>
          <Table.Cell>Header</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  ),
}

// === NEW FEATURES ===

export const WithColumnBorders: Story = {
  parameters: { docs: { description: { story: "Column boundaries help separate closely related values in a dense comparison." } } },
  args: {
    variant: 'outline',
    size: 'md',
    showColumnBorder: true,
  },
  render: (args) => (
    <Table {...args}>
      <Table.Caption>Table with column borders</Table.Caption>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>Product</Table.ColumnHeader>
          <Table.ColumnHeader>Category</Table.ColumnHeader>
          <Table.ColumnHeader numeric>Price</Table.ColumnHeader>
          <Table.ColumnHeader numeric>Stock</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {sampleProducts.map((product) => (
          <Table.Row key={product.id}>
            <Table.Cell>{product.name}</Table.Cell>
            <Table.Cell>{product.category}</Table.Cell>
            <Table.Cell numeric>{usd.format(product.price)}</Table.Cell>
            <Table.Cell numeric>{product.stock}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  ),
}

export const CaptionBottom: Story = {
  parameters: { docs: { description: { story: "A trailing caption provides context without pushing the column headings farther from the records." } } },
  args: {
    variant: 'line',
    size: 'md',
    captionPlacement: 'bottom',
  },
  render: (args) => (
    <Table {...args}>
      <Table.Caption>Caption positioned at the bottom</Table.Caption>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>Product</Table.ColumnHeader>
          <Table.ColumnHeader>Category</Table.ColumnHeader>
          <Table.ColumnHeader numeric>Price</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {sampleProducts.slice(0, 3).map((product) => (
          <Table.Row key={product.id}>
            <Table.Cell>{product.name}</Table.Cell>
            <Table.Cell>{product.category}</Table.Cell>
            <Table.Cell numeric>{usd.format(product.price)}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  ),
}

export const WithStickyColumn: Story = {
  parameters: { docs: { description: { story: "A sticky identity column keeps products recognizable while additional attributes scroll." } } },
  args: {
    variant: 'striped',
    size: 'md',
    interactive: true,
  },
  render: (args) => (
    <div
      aria-label="Products, sticky first column"
      className="max-w-lg overflow-auto"
      role="region"
      tabIndex={0}
    >
      <Table {...args} stickyFirstColumn>
        <Table.Caption>
          Scroll horizontally - first column stays fixed
        </Table.Caption>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>
              Product
            </Table.ColumnHeader>
            <Table.ColumnHeader>Category</Table.ColumnHeader>
            <Table.ColumnHeader>Manufacturer</Table.ColumnHeader>
            <Table.ColumnHeader>SKU</Table.ColumnHeader>
            <Table.ColumnHeader numeric>Price</Table.ColumnHeader>
            <Table.ColumnHeader numeric>Stock</Table.ColumnHeader>
            <Table.ColumnHeader>Warehouse</Table.ColumnHeader>
            <Table.ColumnHeader>Status</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {sampleProducts.map((product) => (
            <Table.Row key={product.id}>
              <Table.Cell>
                {product.name}
              </Table.Cell>
              <Table.Cell>{product.category}</Table.Cell>
              <Table.Cell>Tech Corp</Table.Cell>
              <Table.Cell>SKU-{product.id}23456</Table.Cell>
              <Table.Cell numeric>{usd.format(product.price)}</Table.Cell>
              <Table.Cell numeric>{product.stock}</Table.Cell>
              <Table.Cell>Warehouse A</Table.Cell>
              <Table.Cell>In Stock</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  ),
}

// === SELECTION EXAMPLES ===

export const WithSelection: Story = {
  parameters: { docs: { description: { story: "Checkbox selection models a temporary set of inventory records without changing their values." } } },
  args: {
    variant: 'line',
    size: 'md',
  },
  render: (args) => {
    const [selection, setSelection] = useState<number[]>([])

    const handleSelectAll = () => {
      if (selection.length === sampleProducts.length) {
        setSelection([])
      } else {
        setSelection(sampleProducts.map((p) => p.id))
      }
    }

    const handleSelectRow = (id: number) => {
      setSelection((prev) =>
        prev.includes(id)
          ? prev.filter((item) => item !== id)
          : [...prev, id]
      )
    }

    const allSelected =
      selection.length === sampleProducts.length && sampleProducts.length > 0
    const someSelected =
      selection.length > 0 && selection.length < sampleProducts.length

    return (
      <div>
        <Table {...args}>
          <Table.Caption>
            {selection.length > 0
              ? `${selection.length} item(s) selected`
              : 'Select items using checkboxes'}
          </Table.Caption>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={handleSelectAll}
                  aria-label="Select all products"
                />
              </Table.ColumnHeader>
              <Table.ColumnHeader>Product</Table.ColumnHeader>
              <Table.ColumnHeader>Category</Table.ColumnHeader>
              <Table.ColumnHeader numeric>Price</Table.ColumnHeader>
              <Table.ColumnHeader numeric>Stock</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {sampleProducts.map((product) => {
              const isSelected = selection.includes(product.id)
              return (
                <Table.Row key={product.id} selected={isSelected}>
                  <Table.Cell>
                    <Checkbox
                      checked={isSelected}
                      onChange={() => handleSelectRow(product.id)}
                      aria-label={`Select ${product.name}`}
                    />
                  </Table.Cell>
                  <Table.Cell>{product.name}</Table.Cell>
                  <Table.Cell>{product.category}</Table.Cell>
                  <Table.Cell numeric>{usd.format(product.price)}</Table.Cell>
                  <Table.Cell numeric>{product.stock}</Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table>

        {selection.length > 0 && (
          <div>
            <strong>Selected IDs:</strong> {selection.join(', ')}
          </div>
        )}
      </div>
    )
  },
}

export const WithSelectionAndActions: Story = {
  parameters: { docs: { description: { story: "A local reversible delete demonstrates a safe action on selected inventory records." } } },
  args: {
    variant: 'line',
    size: 'md',
  },
  render: (args) => {
    const [selection, setSelection] = useState<number[]>([])
    const [products, setProducts] = useState(sampleProducts)
    const [undoProducts, setUndoProducts] = useState<typeof sampleProducts | null>(null)

    const handleSelectAll = () => {
      if (selection.length === products.length) {
        setSelection([])
      } else {
        setSelection(products.map((p) => p.id))
      }
    }

    const handleSelectRow = (id: number) => {
      setSelection((prev) =>
        prev.includes(id)
          ? prev.filter((item) => item !== id)
          : [...prev, id]
      )
    }

    const handleDelete = () => {
      setUndoProducts(products)
      setProducts((prev) => prev.filter((p) => !selection.includes(p.id)))
      setSelection([])
    }

    const allSelected =
      selection.length === products.length && products.length > 0
    const someSelected =
      selection.length > 0 && selection.length < products.length

    return (
      <div>
        {undoProducts && <div className="mb-200 flex flex-wrap items-center justify-between gap-200 rounded-md bg-surface p-200">
          <StatusText status="success" size="sm">Selected products deleted from this demo.</StatusText>
          <Button theme="outlined" variant="secondary" size="sm" onClick={() => {
            setProducts(undoProducts)
            setUndoProducts(null)
          }}>Undo delete</Button>
        </div>}
        {selection.length > 0 && (
          <div className="mb-200 p-200 bg-surface rounded-md flex justify-between items-center">
            <span>
              <strong>{selection.length}</strong> products selected
            </span>
            <div className="flex gap-200">
              <Button
                variant="danger"
                theme="solid"
                size="sm"
                onClick={handleDelete}
              >
                Delete selected products
              </Button>
              <Button
                variant="secondary"
                theme="outlined"
                size="sm"
                onClick={() => setSelection([])}
              >
                Clear selection
              </Button>
            </div>
          </div>
        )}

        <Table {...args} interactive={true}>
          <Table.Caption>Product Inventory Management</Table.Caption>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={handleSelectAll}
                  aria-label="Select all products"
                />
              </Table.ColumnHeader>
              <Table.ColumnHeader>Product</Table.ColumnHeader>
              <Table.ColumnHeader>Category</Table.ColumnHeader>
              <Table.ColumnHeader numeric>Price</Table.ColumnHeader>
              <Table.ColumnHeader numeric>Stock</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {products.map((product) => {
              const isSelected = selection.includes(product.id)
              return (
                <Table.Row key={product.id} selected={isSelected}>
                  <Table.Cell>
                    <Checkbox
                      checked={isSelected}
                      onChange={() => handleSelectRow(product.id)}
                      aria-label={`Select ${product.name}`}
                    />
                  </Table.Cell>
                  <Table.Cell>{product.name}</Table.Cell>
                  <Table.Cell>{product.category}</Table.Cell>
                  <Table.Cell numeric>{usd.format(product.price)}</Table.Cell>
                  <Table.Cell numeric>{product.stock}</Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("checkbox", { name: "Select Laptop" }))
    await userEvent.click(canvas.getByRole("button", { name: "Delete selected products" }))
    await expect(canvas.queryByRole("checkbox", { name: "Select Laptop" })).not.toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Undo delete" }))
    await expect(canvas.getByRole("checkbox", { name: "Select Laptop" })).toBeInTheDocument()
  },
}

/**
 * Per-cell horizontal alignment via `data-align` (`start | center | end`).
 * Unlike `numeric` — which says "this value is a number" — `data-align` is a
 * pure presentation choice, so an icon or boolean column can be centred without
 * claiming to be numeric.
 */
export const Alignment: Story = {
  parameters: { docs: { description: { story: "Start-aligned text and end-aligned quantities make mixed inventory columns easier to scan." } } },
  args: {
    variant: 'outline',
    size: 'md',
  },
  render: (args) => (
    <Table {...args}>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader data-align="start">Product</Table.ColumnHeader>
          <Table.ColumnHeader data-align="center">In stock</Table.ColumnHeader>
          <Table.ColumnHeader data-align="end">Price</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {sampleProducts.map((product) => (
          <Table.Row key={product.id}>
            <Table.Cell data-align="start">{product.name}</Table.Cell>
            <Table.Cell data-align="center">
              {product.stock > 0 ? 'Yes' : 'No'}
            </Table.Cell>
            <Table.Cell data-align="end">
              {usd.format(product.price)}
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  ),
}
