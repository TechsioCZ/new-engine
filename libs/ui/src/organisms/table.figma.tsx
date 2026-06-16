import figma from "@figma/code-connect"
import { Table } from "./table"

figma.connect(
  Table,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1393-232",
  {
    imports: ['import { Table } from "@libs/ui/organisms/table"'],
    props: {
      variant: figma.enum("variant", {
        line: "line",
        outline: "outline",
        striped: "striped",
      }),
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
      }),
    },
    example: ({ variant, size }) => (
      <Table size={size} variant={variant}>
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
      </Table>
    ),
  }
)
