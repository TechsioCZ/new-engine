// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-39180
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/organisms/table.tsx
// component=Table

import figma from "figma"

const variant = figma.selectedInstance.getEnum("variant", {
  line: "line",
  outline: "outline",
  striped: "striped",
})
const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
})

export default {
  id: "Table",
  imports: ['import { Table } from "@techsio/ui-kit/organisms/table"'],
  example: figma.code`<Table${figma.helpers.react.renderProp(
    "size",
    size,
  )}${figma.helpers.react.renderProp("variant", variant)}>
        <Table.Caption>Recent orders</Table.Caption>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Order</Table.ColumnHeader>
            <Table.ColumnHeader>Status</Table.ColumnHeader>
            <Table.ColumnHeader>Total</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row>
            <Table.Cell>#1001</Table.Cell>
            <Table.Cell>Shipped</Table.Cell>
            <Table.Cell>$99.00</Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>#1002</Table.Cell>
            <Table.Cell>Pending</Table.Cell>
            <Table.Cell>$149.00</Table.Cell>
          </Table.Row>
        </Table.Body>
        <Table.Footer>
          <Table.Row>
            <Table.Cell>Total</Table.Cell>
            <Table.Cell />
            <Table.Cell>$248.00</Table.Cell>
          </Table.Row>
        </Table.Footer>
      </Table>`,
  metadata: { nestable: true },
}
