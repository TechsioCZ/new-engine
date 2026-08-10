import type { HttpTypes } from "@medusajs/types"
import type { ReactNode } from "react"

import { CheckoutInlineProductsSection } from "./sections/checkout-inline-products-section"

interface CheckoutStepLayoutProps {
  aside: ReactNode
  cartItems?: HttpTypes.StoreCartLineItem[]
  children: ReactNode
  header?: ReactNode
}

export const CheckoutStepLayout = ({
  aside,
  cartItems,
  children,
  header,
}: CheckoutStepLayoutProps) => (
  <div className="mx-auto w-full max-w-max-w space-y-900">
    <div className="mx-auto grid w-full max-w-checkout gap-x-700 gap-y-400 xl:grid-cols-12 xl:items-start">
      {header}
      <div className="space-y-350 xl:col-span-7">{children}</div>
      <aside className="space-y-300 xl:sticky xl:top-400 xl:col-span-5 xl:self-start">
        {aside}
      </aside>
    </div>
    {cartItems && <CheckoutInlineProductsSection cartItems={cartItems} />}
  </div>
)
