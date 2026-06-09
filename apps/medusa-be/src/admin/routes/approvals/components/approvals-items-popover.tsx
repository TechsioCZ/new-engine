import { MagnifyingGlass } from "@medusajs/icons"
import { Popover, Table, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { formatAmount } from "../../../utils/format-amount"

export type ApprovalItem = {
  id: string
  product_title: string
  quantity: number
  thumbnail?: string
  unit_price: number
  variant_title?: string
}

const ItemsPopover = ({
  items,
  currencyCode,
}: {
  items: ApprovalItem[]
  currencyCode: string
}) => {
  const { t } = useTranslation("approvals")

  return (
    <Popover>
      <Popover.Trigger className="flex items-center gap-1 text-right hover:cursor-pointer">
        <span className="min-w-14 underline underline-offset-4">
          {t("item.count", { count: items?.length ?? 0 })}
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
                      {/* biome-ignore lint/performance/noImgElement: Medusa admin extensions run in Vite, so Next Image is not available here. */}
                      <img
                        alt={item.product_title}
                        className="mr-4 h-10 object-contain"
                        height={40}
                        src={item.thumbnail}
                        width={40}
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
                        {t("item.total")}{" "}
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
}

export default ItemsPopover
