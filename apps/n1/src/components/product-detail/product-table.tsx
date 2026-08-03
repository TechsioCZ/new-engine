import { Table } from "@techsio/ui-kit/organisms/table"

export type ProductTableRowProps = {
  key: string
  value?: string | number | null | undefined
}

export const ProductTable = ({ rows }: { rows: ProductTableRowProps[] }) => (
  <Table variant="striped">
    <Table.Body>
      {rows.map((row) => (
        <Table.Row key={row.key}>
          <Table.Cell className="capitalize">{row.key}</Table.Cell>
          <Table.Cell>{row.value}</Table.Cell>
        </Table.Row>
      ))}
    </Table.Body>
  </Table>
)
