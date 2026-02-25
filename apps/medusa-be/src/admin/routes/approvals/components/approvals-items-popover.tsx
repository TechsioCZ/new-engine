import { MagnifyingGlass } from "@medusajs/icons"
import { Popover, Table, Text } from "@medusajs/ui"
import { formatAmount } from "../../../utils/format-amount"

const ItemsPopover = ({
  items,
  currencyCode,
}: {
  items: Record<string, any>[]
  currencyCode: any
}) => (
  <Popover>
    <Popover.Trigger className="flex items-center gap-1 text-right hover:cursor-pointer">
      <span className="min-w-14 underline underline-offset-4">
        {items?.length} item
        {items?.length !== 1 ? "s" : ""}
      </span>
      <MagnifyingGlass />
    </Popover.Trigger>
    <Popover.Content className="mr-10 p-0">
      <div className="max-h-1/3 overflow-y-auto">
        <Table>
          <Table.Body>
            {items?.map((item) => (
              <Table.Row className="py-2 hover:bg-transparent" key={item.id}>
                <Table.Cell>
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden">
                    <img
                      alt={item.product_title}
                      className="mr-4 h-10 object-contain"
                      src={item.thumbnail}
                    />
                  </div>
                </Table.Cell>
                <Table.Cell className="py-2">
                  <Text className="max-w-60 truncate font-medium">
                    {item.product_title}
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    {item.variant_title}
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    {item.quantity} x{" "}
                    {formatAmount(item.unit_price, currencyCode)}
                    <br />
                    <Text className="font-medium">
                      Item total:{" "}
                      {formatAmount(
                        item.quantity * item.unit_price,
                        currencyCode
                      )}
                    </Text>
                  </Text>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
    </Popover.Content>
  </Popover>
)

export default ItemsPopover
