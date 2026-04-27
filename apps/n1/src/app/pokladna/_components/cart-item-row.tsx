import Image from "next/image"
import Link from "next/link"
import { formatCartLineItemUnitPrice } from "@/lib/pricing/cart-pricing"
import type { CartLineItem } from "@/types/cart"

type CartItemRowProps = {
  item: CartLineItem
  currencyCode: string
}

export function CartItemRow({ item, currencyCode }: CartItemRowProps) {
  const price = formatCartLineItemUnitPrice(item, currencyCode)
  return (
    <div className="flex gap-200">
      {item.thumbnail && (
        <Image
          alt={item.title}
          className="h-16 w-16 rounded object-cover"
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
