import type { HttpTypes } from "@medusajs/types"
import { useTranslations } from "next-intl"

import { resolveOrderAddresses } from "@/lib/storefront/order-detail-format"

type OrderAddress = ReturnType<typeof resolveOrderAddresses>["shipping"]

const OrderAddressBlock = ({
  address,
  title,
  unavailableText,
}: {
  address: OrderAddress
  title: string
  unavailableText: string
}) => (
  <article className="space-y-150">
    <h3 className="font-semibold">{title}</h3>
    {address ? (
      <div className="space-y-50 text-fg-secondary text-sm">
        {typeof address.fullName === "string" &&
          address.fullName.length > 0 && (
            <p className="font-medium text-fg-primary">{address.fullName}</p>
          )}
        {typeof address.company === "string" && address.company.length > 0 && (
          <p>{address.company}</p>
        )}
        {address.lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    ) : (
      <p className="text-fg-secondary text-sm">{unavailableText}</p>
    )}
  </article>
)

export const AccountOrderDetailAddresses = ({
  order,
}: {
  order: HttpTypes.StoreOrder
}) => {
  const t = useTranslations("auth")
  const addresses = resolveOrderAddresses(order)
  const unavailableText = t("account.orders.detail.address_unavailable")
  return (
    <div className="grid gap-300 rounded-md border border-border-secondary bg-base p-350 md:grid-cols-2">
      <OrderAddressBlock
        address={addresses.shipping}
        title={t("account.orders.detail.shipping_address")}
        unavailableText={unavailableText}
      />
      <OrderAddressBlock
        address={addresses.billing}
        title={t("account.orders.detail.billing_address")}
        unavailableText={unavailableText}
      />
    </div>
  )
}
