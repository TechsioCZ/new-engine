import { Button } from "@ui/atoms/button"
import { NumericInput } from "@ui/atoms/numeric-input"
import { Table } from "@ui/organisms/table"

export function CartTable({ size }: { size: "sm" | "md" }) {
  return (
    <Table size={size} variant="line">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>Varianta</Table.ColumnHeader>
          <Table.ColumnHeader numeric>Cena</Table.ColumnHeader>
          <Table.ColumnHeader numeric>Množství</Table.ColumnHeader>
          <Table.ColumnHeader numeric>Akce</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        <Table.Row>
          <Table.Cell>120 x 60 cm</Table.Cell>
          <Table.Cell numeric>1 280 Kč</Table.Cell>
          <Table.Cell numeric>
            <NumericInput defaultValue={1} max={99} min={0} size={size}>
              <NumericInput.Control>
                <NumericInput.Input />
                <NumericInput.TriggerContainer>
                  <NumericInput.IncrementTrigger />
                  <NumericInput.DecrementTrigger />
                </NumericInput.TriggerContainer>
              </NumericInput.Control>
            </NumericInput>
          </Table.Cell>
          <Table.Cell numeric>
            <Button size={size} variant="primary">
              Do košíku
            </Button>
          </Table.Cell>
        </Table.Row>

        <Table.Row>
          <Table.Cell>140 x 70 cm</Table.Cell>
          <Table.Cell numeric>1 490 Kč</Table.Cell>
          <Table.Cell numeric>
            <NumericInput defaultValue={2} max={99} min={0} size={size}>
              <NumericInput.Control>
                <NumericInput.Input />
                <NumericInput.TriggerContainer>
                  <NumericInput.IncrementTrigger />
                  <NumericInput.DecrementTrigger />
                </NumericInput.TriggerContainer>
              </NumericInput.Control>
            </NumericInput>
          </Table.Cell>
          <Table.Cell numeric>
            <Button size={size} theme="solid" variant="secondary">
              Balení
            </Button>
          </Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  )
}
