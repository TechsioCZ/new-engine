import type {
  AdminOrder,
  AdminOrderLineItem,
  AdminOrderPreview,
} from "@medusajs/framework/types"
import { Button, Heading, Input, toast } from "@medusajs/ui"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  RouteFocusModal,
  StackedFocusModal,
  useStackedModal,
} from "../../../../components/common/modals/route-focus-modal"
import { useAddItemsToQuote } from "../../../../hooks/api"
import { ManageItem } from "./manage-item"
import { ManageItemsTable } from "./manage-items-table"

type ManageItemsSectionProps = {
  order: AdminOrder
  preview: AdminOrderPreview
}

let addedVariants: string[] = []

export const ManageItemsSection = ({
  order,
  preview,
}: ManageItemsSectionProps) => {
  const { t } = useTranslation()
  /**
   * STATE
   */
  const { setIsOpen } = useStackedModal()
  const [filterTerm, setFilterTerm] = useState("")

  /*
   * MUTATIONS
   */
  const { mutateAsync: addItems, isPending } = useAddItemsToQuote(preview.id)

  /**
   * CALLBACKS
   */
  const onItemsSelected = async () => {
    try {
      await addItems({
        items: addedVariants.map((i) => ({
          variant_id: i,
          quantity: 1,
        })),
      })
    } catch (e) {
      toast.error(e.message)
    }

    setIsOpen("inbound-items", false)
  }

  const filteredItems = useMemo(
    () =>
      preview.items.filter(
        (i) =>
          i.title.toLowerCase().includes(filterTerm) ||
          i.product_title?.toLowerCase().includes(filterTerm)
      ) as AdminOrderLineItem[],
    [preview, filterTerm]
  )

  const originalItemsMap = useMemo(
    () => new Map(order.items.map((item) => [item.id, item])),
    [order, filterTerm]
  )

  return (
    <div>
      <div className="mt-8 mb-3 flex items-center justify-between">
        <Heading level="h2">{t("fields.items")}</Heading>

        <div className="flex gap-2">
          <Input
            autoComplete="off"
            onChange={(e) => setFilterTerm(e.target.value)}
            placeholder={t("fields.search")}
            type="search"
            value={filterTerm}
          />

          <StackedFocusModal id="inbound-items">
            <StackedFocusModal.Trigger asChild>
              <Button size="small" variant="secondary">
                {t("actions.addItems")}
              </Button>
            </StackedFocusModal.Trigger>

            <StackedFocusModal.Content>
              <StackedFocusModal.Header />

              <ManageItemsTable
                currencyCode={order.currency_code}
                onSelectionChange={(finalSelection) => {
                  addedVariants = finalSelection
                }}
              />

              <StackedFocusModal.Footer>
                <div className="flex w-full items-center justify-end gap-x-4">
                  <div className="flex items-center justify-end gap-x-2">
                    <RouteFocusModal.Close asChild>
                      <Button size="small" type="button" variant="secondary">
                        {t("actions.cancel")}
                      </Button>
                    </RouteFocusModal.Close>
                    <Button
                      disabled={isPending}
                      key="submit-button"
                      onClick={async () => await onItemsSelected()}
                      role="button"
                      size="small"
                      type="submit"
                      variant="primary"
                    >
                      {t("actions.save")}
                    </Button>
                  </div>
                </div>
              </StackedFocusModal.Footer>
            </StackedFocusModal.Content>
          </StackedFocusModal>
        </div>
      </div>

      {filteredItems.map((item) => (
        <ManageItem
          currencyCode={order.currency_code}
          item={item}
          key={item.id}
          orderId={order.id}
          originalItem={originalItemsMap.get(item.id)!}
        />
      ))}

      {filterTerm && !filteredItems.length && (
        <div
          className="mt-4 block h-[56px] w-full rounded-lg border border-dashed bg-ui-bg-field"
          style={{
            background:
              "repeating-linear-gradient(-45deg, rgb(212, 212, 216, 0.15), rgb(212, 212, 216,.15) 10px, transparent 10px, transparent 20px)",
          }}
        />
      )}
    </div>
  )
}
