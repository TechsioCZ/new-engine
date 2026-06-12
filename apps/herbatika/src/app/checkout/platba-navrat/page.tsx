import { Suspense } from "react"
import { CheckoutPaymentReturnPanel } from "@/components/checkout/checkout-payment-return-panel"

function CheckoutPaymentReturnFallback() {
  return <div className="mx-auto min-h-dvh w-full max-w-max-w" />
}

export default function CheckoutPaymentReturnPage() {
  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-600 px-400 pt-600 pb-850 font-rubik lg:px-550 xl:px-700">
      <Suspense fallback={<CheckoutPaymentReturnFallback />}>
        <CheckoutPaymentReturnPanel />
      </Suspense>
    </main>
  )
}
