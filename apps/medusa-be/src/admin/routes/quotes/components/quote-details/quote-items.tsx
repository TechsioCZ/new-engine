import type {
  AdminOrder,
  AdminOrderLineItem,
  AdminOrderPreview,
} from "@medusajs/framework/types"
import { Badge, Copy, Text } from "@medusajs/ui"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { AmountCell, Thumbnail } from "../../../../components/common"

export const QuoteItems = ({
  order,
  preview,
}: {
  order: AdminOrder
  preview: AdminOrderPreview
}) => {
  const originalItemsMap = useMemo(
    () => new Map(order.items.map((item) => [item.id, item])),
    [order]
  )

  return (
    <div>
      {preview.items?.map((item) => (
        <QuoteItem
          currencyCode={order.currency_code}
          item={item}
          key={item.id}
          originalItem={originalItemsMap.get(item.id)}
        />
      ))}
    </div>
  )
}

export const QuoteItem = ({
  item,
  originalItem,
  currencyCode,
}: {
  item: AdminOrderPreview["items"][0] & {
    unit_price: number
  }
  originalItem?: AdminOrderLineItem
  currencyCode: string
}) => {
  const { t } = useTranslation()

  const isAddedItem = useMemo(
    () => !!item.actions?.find((a) => a.action === "ITEM_ADD"),
    [item]
  )

  const isItemUpdated = useMemo(
    () => !!item.actions?.find((a) => a.action === "ITEM_UPDATE"),
    [item]
  )

  const isItemRemoved = useMemo(() => {
    const updateAction = item.actions?.find((a) => a.action === "ITEM_UPDATE")

    return !!updateAction && item.quantity === item.detail.fulfilled_quantity
  }, [item])

  return (
    <>
      <div
        className="grid grid-cols-2 items-center gap-x-4 px-6 py-4 text-left text-ui-fg-subtle"
        key={item.id}
      >
        <div className="flex items-start gap-x-4">
          <Thumbnail src={item.thumbnail} />

          <div>
            <Text
              className="text-ui-fg-base"
              leading="compact"
              size="small"
              weight="plus"
            >
              {item.title}
            </Text>

            {item.variant_sku && (
              <div className="flex items-center gap-x-1">
                <Text size="small">{item.variant_sku}</Text>
                <Copy className="text-ui-fg-muted" content={item.variant_sku} />
              </div>
            )}
            <Text size="small">
              {item.variant?.options?.map((o) => o.value).join(" · ")}
            </Text>
          </div>
        </div>

        <div className="grid grid-cols-3 items-center gap-x-4">
          <div className="flex items-center justify-end gap-x-4">
            <AmountCell
              amount={item.unit_price}
              className="items-end justify-end text-right text-sm"
              currencyCode={currencyCode}
              originalAmount={
                isAddedItem ? item.unit_price : originalItem?.unit_price
              }
            />
          </div>

          <div className="flex items-center gap-x-2">
            <div className="w-fit min-w-[27px]">
              <Badge color="grey" size="xsmall">
                <span className="text-xs tabular-nums">{item.quantity}</span>x
              </Badge>
            </div>

            <div>
              {isAddedItem && (
                <Badge
                  className="mr-1"
                  color="blue"
                  rounded="full"
                  size="2xsmall"
                >
                  {t("general.new")}
                </Badge>
              )}

              {isItemRemoved ? (
                <Badge
                  className="mr-1"
                  color="red"
                  rounded="full"
                  size="2xsmall"
                >
                  {t("general.removed")}
                </Badge>
              ) : (
                isItemUpdated && (
                  <Badge
                    className="mr-1"
                    color="orange"
                    rounded="full"
                    size="2xsmall"
                  >
                    {t("general.modified")}
                  </Badge>
                )
              )}
            </div>

            <div className="overflow-visible" />
          </div>

          <AmountCell
            amount={
              isAddedItem ? item.detail.quantity * item.unit_price : item.total
            }
            className="items-end justify-end text-right text-sm"
            currencyCode={currencyCode}
            originalAmount={isAddedItem ? item?.total : originalItem?.total}
          />
        </div>
      </div>
    </>
  )
}
