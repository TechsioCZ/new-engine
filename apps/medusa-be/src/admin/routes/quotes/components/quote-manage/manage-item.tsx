import type { AdminOrder, AdminOrderPreview } from "@medusajs/framework/types"
import {
  ArrowUturnLeft,
  DocumentSeries,
  PencilSquare,
  XCircle,
  XMark,
} from "@medusajs/icons"
import {
  Badge,
  CurrencyInput,
  IconButton,
  Input,
  Text,
  toast,
} from "@medusajs/ui"
import { getErrorMessage } from "@techsio/std/object"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { ActionMenu, AmountCell, Thumbnail } from "../../../../components"
import { Form } from "../../../../components/common/form"
import {
  useAddItemsToQuote,
  useRemoveQuoteItem,
  useUpdateAddedQuoteItem,
  useUpdateQuoteItem,
} from "../../../../hooks/api"
import { currencySymbolMap } from "../../../../utils"

interface ManageItemProps {
  originalItem?: AdminOrder["items"][0] | undefined
  item: AdminOrderPreview["items"][0]
  currencyCode: string
  orderId: string
}

const getCurrencySymbol = (currencyCode: string) =>
  currencySymbolMap[currencyCode as keyof typeof currencySymbolMap] ??
  currencyCode.toUpperCase()

function ManageItem({
  originalItem,
  item,
  currencyCode,
  orderId,
}: ManageItemProps) {
  const { t } = useTranslation("quotes")
  const [showPriceForm, setShowPriceForm] = useState(false)

  const { mutateAsync: addItems } = useAddItemsToQuote(orderId)
  const { mutateAsync: updateAddedItem } = useUpdateAddedQuoteItem(orderId)
  const { mutateAsync: updateOriginalItem } = useUpdateQuoteItem(orderId)
  const { mutateAsync: undoAction } = useRemoveQuoteItem(orderId)

  const isAddedItem = !!item.actions?.find((a) => a.action === "ITEM_ADD")
  const isItemUpdated = !!item.actions?.find((a) => a.action === "ITEM_UPDATE")
  // To be removed item needs to have updated quantity
  const updateAction = item.actions?.find((a) => a.action === "ITEM_UPDATE")
  const isItemRemoved =
    !!updateAction && item.quantity === item.detail.fulfilled_quantity

  /**
   * HANDLERS
   */
  const onUpdate = async ({
    quantity,
    unit_price,
  }: {
    quantity?: number
    unit_price?: number
  }) => {
    if (
      typeof quantity === "number" &&
      quantity <= item.detail.fulfilled_quantity
    ) {
      toast.error(t("validation.quantityLowerThanFulfillment"))
      return
    }

    const addItemAction = item.actions?.find((a) => a.action === "ITEM_ADD")

    try {
      if (addItemAction) {
        await updateAddedItem({
          ...(quantity === undefined ? {} : { quantity }),
          ...(unit_price === undefined ? {} : { unit_price }),
          actionId: addItemAction.id,
        })
      } else {
        await updateOriginalItem({
          ...(quantity === undefined ? {} : { quantity }),
          ...(unit_price === undefined ? {} : { unit_price }),
          itemId: item.id,
        })
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const onRemove = async () => {
    const addItemAction = item.actions?.find((a) => a.action === "ITEM_ADD")

    try {
      if (addItemAction) {
        await undoAction(addItemAction.id)
      } else {
        await updateOriginalItem({
          itemId: item.id,
          quantity: item.detail.fulfilled_quantity,
        })
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const onRemoveUndo = async () => {
    const updateItemAction = item.actions?.find(
      (a) => a.action === "ITEM_UPDATE",
    )

    try {
      if (updateItemAction) {
        await undoAction(updateItemAction.id)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const onDuplicate = async () => {
    if (!item.variant_id) {
      return
    }

    try {
      await addItems({
        items: [
          {
            quantity: item.quantity,
            variant_id: item.variant_id,
          },
        ],
      })
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  return (
    <div
      className="my-2 rounded-xl bg-ui-bg-subtle shadow-elevation-card-rest"
      key={item.quantity}
    >
      <div className="flex flex-col items-center gap-x-2 gap-y-2 p-3 text-sm md:flex-row">
        <div className="flex flex-1 items-center justify-between">
          <div className="flex flex-row items-center gap-x-3">
            <Thumbnail src={item.thumbnail} />

            <div className="flex flex-col">
              <div>
                <Text as="span" className="txt-small" weight="plus">
                  {item.title}{" "}
                </Text>

                {item.variant_sku && <span>({item.variant_sku})</span>}
              </div>
              <Text as="div" className="txt-small text-ui-fg-subtle">
                {item.product_title}
              </Text>
            </div>
          </div>

          {isAddedItem && (
            <Badge className="mr-1" color="blue" rounded="full" size="2xsmall">
              {t("badges.new")}
            </Badge>
          )}

          {isItemRemoved ? (
            <Badge className="mr-1" color="red" rounded="full" size="2xsmall">
              {t("badges.removed")}
            </Badge>
          ) : (
            isItemUpdated && (
              <Badge
                className="mr-1"
                color="orange"
                rounded="full"
                size="2xsmall"
              >
                {t("badges.modified")}
              </Badge>
            )
          )}
        </div>

        <div className="flex flex-1 justify-between">
          <div className="flex flex-grow items-center gap-2">
            <Input
              className="txt-small w-[67px] rounded-lg bg-ui-bg-base [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              defaultValue={item.quantity}
              disabled={item.detail.fulfilled_quantity === item.quantity}
              min={item.detail.fulfilled_quantity}
              onBlur={(e) => {
                const val = e.target.value
                const quantity = val === "" ? null : Number(val)

                if (quantity) {
                  void onUpdate({ quantity })
                }
              }}
              type="number"
            />
            <Text className="txt-small text-ui-fg-subtle">
              {t("fields.qty")}
            </Text>
          </div>

          <div className="txt-small mr-2 flex flex-shrink-0 text-ui-fg-subtle">
            <AmountCell
              amount={item.total}
              currencyCode={currencyCode}
              originalAmount={originalItem?.total ?? null}
            />
          </div>

          <ActionMenu
            groups={[
              {
                actions: [
                  {
                    icon: <PencilSquare />,
                    label: t("actions.updatePrice"),
                    onClick: () => {
                      setShowPriceForm(!showPriceForm)
                    },
                  },
                  {
                    icon: <DocumentSeries />,
                    label: t("actions.duplicate"),
                    onClick: onDuplicate,
                  },
                ],
              },
              {
                actions: [
                  isItemRemoved
                    ? {
                        icon: <ArrowUturnLeft />,
                        label: t("actions.undo"),
                        onClick: onRemoveUndo,
                      }
                    : {
                        disabled:
                          item.detail.fulfilled_quantity === item.quantity,
                        icon: <XCircle />,
                        label: t("actions.remove"),
                        onClick: onRemove,
                      },
                ].filter(Boolean),
              },
            ]}
          />
        </div>
      </div>

      {showPriceForm && (
        <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-2">
          <div>
            <Form.Label>{t("fields.price")}</Form.Label>
            <Form.Hint className="!mt-1">{t("form.unitPriceHint")}</Form.Hint>
          </div>

          <div className="flex items-center gap-1">
            <div className="flex-grow">
              <Form.Field
                name={`inbound_items.${item.id}.unit_price`}
                render={({ field }) => (
                  <Form.Item>
                    <Form.Control>
                      <CurrencyInput
                        {...field}
                        className="bg-ui-bg-field-component hover:bg-ui-bg-field-component-hover"
                        code={currencyCode}
                        defaultValue={item.unit_price}
                        min={0}
                        onBlur={() => {
                          field.onChange(field.value)

                          void onUpdate({
                            quantity: item.quantity,
                            unit_price: Number.parseFloat(field.value),
                          })
                        }}
                        symbol={getCurrencySymbol(currencyCode)}
                        type="numeric"
                      />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
            </div>

            <IconButton
              className="flex-shrink"
              onClick={() => {
                setShowPriceForm(false)
              }}
              type="button"
              variant="transparent"
            >
              <XMark className="text-ui-fg-muted" />
            </IconButton>
          </div>
        </div>
      )}
    </div>
  )
}

export { ManageItem }
