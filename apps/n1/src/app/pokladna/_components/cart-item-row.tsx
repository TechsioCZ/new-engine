import Image from "next/image"
import Link from "next/link"

import type { CartLineItem } from "@/services/cart-service"
import { formatToTaxIncluded } from "@/utils/format/format-product"

interface CartItemRowProps {
  item: CartLineItem
  currencyCode: string
}

export const CartItemRow = ({ item, currencyCode }: CartItemRowProps) => {
  const taxRate = item.tax_lines?.[0]?.rate
  const tax = typeof taxRate === "number" ? taxRate * 0.01 : 0
  const price = formatToTaxIncluded({
    amount: item.unit_price,
    currency: currencyCode,
    tax,
  })
  return (
    <div className="flex gap-200">
      {typeof item.thumbnail === "string" && item.thumbnail.length > 0 && (
        <Image
          alt={item.title}
          className="h-cart-thumbnail w-cart-thumbnail rounded object-cover"
          height={64}
          src={item.thumbnail}
          width={64}
        />
      )}
      <div className="flex flex-1 flex-col">
        <Link
          className="font-medium text-fg-primary text-sm underline hover:no-underline"
          href={`/produkt/${item.title}?variant=${item.variant_title}`}
        >
          {item.title}
        </Link>
        <span className="text-fg-secondary text-xs">{item.variant_title}</span>
        <span className="text-fg-secondary text-xs">Kusů: {item.quantity}</span>
      </div>
      <div className="text-right">
        <p className="font-semibold text-fg-primary text-sm">{price}</p>
      </div>
    </div>
  )
}
