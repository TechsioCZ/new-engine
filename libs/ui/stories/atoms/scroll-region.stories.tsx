import type { Meta, StoryObj } from "@storybook/react"
import { ScrollRegion } from "../../src/atoms/scroll-region"
import { Table } from "../../src/organisms/table"

const meta = {
  title: "Atoms/ScrollRegion",
  component: ScrollRegion,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "A named viewport for content wider or taller than its column, such as a static table or a document preview. While the content overflows, the region joins the tab order so keyboard users can focus and scroll it (WCAG 2.1.1); content that fits adds no empty tab stop.",
      },
    },
  },
  argTypes: {
    label: { control: "text", description: "Accessible name of the region." },
    orientation: { control: "inline-radio", options: ["horizontal", "vertical", "both"] },
    busy: { control: "boolean" },
    ref: { control: false, table: { disable: true } },
  },
  args: { label: "Monthly revenue by region", orientation: "horizontal", busy: false },
} satisfies Meta<typeof ScrollRegion>

export default meta
type Story = StoryObj<typeof meta>

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export const Playground: Story = {
  render: (args) => (
    <div className="max-w-sm">
      <ScrollRegion {...args}>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Region</Table.ColumnHeader>
              {months.map((month) => (
                <Table.ColumnHeader key={month}>{month}</Table.ColumnHeader>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {["North", "South"].map((region) => (
              <Table.Row key={region}>
                <Table.Cell>{region}</Table.Cell>
                {months.map((month) => (
                  <Table.Cell key={month}>€12,400</Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </ScrollRegion>
    </div>
  ),
}
