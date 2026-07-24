import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"

import { VariantContainer } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import { Checkbox } from "../../src/atoms/checkbox"
import { Table } from "../../src/organisms/table"

const meta = {
  title: "Organisms/Table",
  component: Table,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["line", "outline", "striped"],
      description: "Visual style variant of the table",
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Size of table cells and text",
    },
    interactive: {
      control: "boolean",
      description: "Enable hover effects and pointer cursor on rows",
    },
    stickyHeader: {
      control: "boolean",
      description: "Make header sticky on scroll",
    },
    showColumnBorder: {
      control: "boolean",
      description: "Show vertical borders between columns",
    },
    captionPlacement: {
      control: "select",
      options: ["top", "bottom"],
      description: "Position of table caption",
    },
  },
} satisfies Meta<typeof Table>

export default meta
type Story = StoryObj<typeof meta>

// Sample data for stories
const sampleProducts = [
  {
    id: 1,
    name: "Laptop",
    category: "Electronics",
    price: 999.99,
    stock: 50,
  },
  {
    id: 2,
    name: "Coffee Maker",
    category: "Home Appliances",
    price: 49.99,
    stock: 120,
  },
  {
    id: 3,
    name: "Desk Chair",
    category: "Furniture",
    price: 150.0,
    stock: 30,
  },
  {
    id: 4,
    name: "Smartphone",
    category: "Electronics",
    price: 799.99,
    stock: 75,
  },
  {
    id: 5,
    name: "Headphones",
    category: "Accessories",
    price: 199.99,
    stock: 200,
  },
]

// === BASIC VARIANTS ===

export const Basic: Story = {
  args: {
    variant: "line",
    size: "md",
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
            <Table.Cell numeric>${product.price.toFixed(2)}</Table.Cell>
            <Table.Cell numeric>{product.stock}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  ),
}

export const Outline: Story = {
  args: {
    variant: "outline",
    size: "md",
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
            <Table.Cell numeric>${product.price.toFixed(2)}</Table.Cell>
            <Table.Cell numeric>{product.stock}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  ),
}

export const Interactive: Story = {
  args: {
    variant: "line",
    size: "md",
    interactive: true,
  },
  render: (args) => (
    <Table {...args}>
      <Table.Caption>Click on any row to select</Table.Caption>
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
            onClick={() => alert(`Selected: ${product.name}`)}
          >
            <Table.Cell>{product.name}</Table.Cell>
            <Table.Cell>{product.category}</Table.Cell>
            <Table.Cell numeric>${product.price.toFixed(2)}</Table.Cell>
            <Table.Cell numeric>{product.stock}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  ),
}

export const Striped: Story = {
  args: {
    variant: "striped",
    size: "md",
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
            <Table.Cell numeric>${product.price.toFixed(2)}</Table.Cell>
            <Table.Cell numeric>{product.stock}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  ),
}

// === SIZE VARIANTS ===

export const Sizes: Story = {
  render: () => {
    const sizes = ["sm", "md", "lg"] as const
    const attributes = ["Product", "Category", "Price"]

    return (
      <VariantContainer>
        {sizes.map((size) => (
          <Table key={size} size={size}>
            <Table.Caption>Compact table with small size</Table.Caption>
            <Table.Header>
              <Table.Row>
                {attributes.map((attribute) => (
                  <Table.ColumnHeader
                    key={attribute}
                    numeric={attribute === "Price"}
                  >
                    {attribute}
                  </Table.ColumnHeader>
                ))}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {sampleProducts.slice(0, 3).map((product) => (
                <Table.Row key={product.id}>
                  <Table.Cell>{product.name}</Table.Cell>
                  <Table.Cell>{product.category}</Table.Cell>
                  <Table.Cell numeric>${product.price.toFixed(2)}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        ))}
      </VariantContainer>
    )
  },
}

// === ADVANCED FEATURES ===

export const WithFooter: Story = {
  args: {
    variant: "line",
    size: "md",
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
              <Table.Cell numeric>${product.price.toFixed(2)}</Table.Cell>
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
              <strong>${total.toFixed(2)}</strong>
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
  args: {
    variant: "line",
    size: "md",
    stickyHeader: true,
  },
  render: (args) => {
    // Generate more rows for scrolling demo
    const manyProducts = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      name: `Product ${i + 1}`,
      category: ["Electronics", "Furniture", "Accessories"][i % 3],
      price: Math.random() * 1000,
      stock: Math.floor(Math.random() * 200),
    }))

    return (
      <div className="h-100 overflow-auto">
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
                <Table.Cell numeric>${product.price.toFixed(2)}</Table.Cell>
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
  args: {
    variant: "outline",
    size: "md",
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
  args: {
    variant: "line",
    size: "md",
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
  args: {
    variant: "outline",
    size: "md",
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
            <Table.Cell numeric>${product.price.toFixed(2)}</Table.Cell>
            <Table.Cell numeric>{product.stock}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  ),
}

export const CaptionBottom: Story = {
  args: {
    variant: "line",
    size: "md",
    captionPlacement: "bottom",
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
            <Table.Cell numeric>${product.price.toFixed(2)}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  ),
}

export const WithStickyColumn: Story = {
  args: {
    variant: "line",
    size: "md",
  },
  render: (args) => (
    <div className="max-w-150 overflow-auto">
      <Table {...args} stickyFirstColumn>
        <Table.Caption>
          Scroll horizontally - first column stays fixed
        </Table.Caption>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Product</Table.ColumnHeader>
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
              <Table.Cell>{product.name}</Table.Cell>
              <Table.Cell>{product.category}</Table.Cell>
              <Table.Cell>Tech Corp</Table.Cell>
              <Table.Cell>SKU-{product.id}23456</Table.Cell>
              <Table.Cell numeric>${product.price.toFixed(2)}</Table.Cell>
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
  args: {
    variant: "line",
    size: "md",
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
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
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
              : "Select items using checkboxes"}
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
                  <Table.Cell numeric>${product.price.toFixed(2)}</Table.Cell>
                  <Table.Cell numeric>{product.stock}</Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table>

        {selection.length > 0 && (
          <div>
            <strong>Selected IDs:</strong> {selection.join(", ")}
          </div>
        )}
      </div>
    )
  },
}

export const WithSelectionAndActions: Story = {
  args: {
    variant: "line",
    size: "md",
  },
  render: (args) => {
    const [selection, setSelection] = useState<number[]>([])
    const [products, setProducts] = useState(sampleProducts)

    const handleSelectAll = () => {
      if (selection.length === products.length) {
        setSelection([])
      } else {
        setSelection(products.map((p) => p.id))
      }
    }

    const handleSelectRow = (id: number) => {
      setSelection((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      )
    }

    const handleDelete = () => {
      setProducts((prev) => prev.filter((p) => !selection.includes(p.id)))
      setSelection([])
    }

    const allSelected =
      selection.length === products.length && products.length > 0
    const someSelected =
      selection.length > 0 && selection.length < products.length

    return (
      <div>
        {selection.length > 0 && (
          <div className="mb-200 p-200 bg-surface rounded-md flex justify-between items-center">
            <span>
              <strong>{selection.length}</strong> item(s) selected
            </span>
            <div className="flex gap-200">
              <Button
                variant="danger"
                theme="solid"
                size="sm"
                onClick={handleDelete}
              >
                Delete Selected
              </Button>
              <Button
                variant="secondary"
                theme="outlined"
                size="sm"
                onClick={() => setSelection([])}
              >
                Clear Selection
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
                  <Table.Cell numeric>${product.price.toFixed(2)}</Table.Cell>
                  <Table.Cell numeric>{product.stock}</Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table>
      </div>
    )
  },
}
