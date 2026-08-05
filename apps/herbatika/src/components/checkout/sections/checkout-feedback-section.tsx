import { StatusText } from "@techsio/ui-kit/atoms/status-text"

interface CheckoutFeedbackSectionProps {
  cartError: string | null
  checkoutError: string | null
}

export function CheckoutFeedbackSection({
  cartError,
  checkoutError,
}: CheckoutFeedbackSectionProps) {
  return (
    <>
      {checkoutError ? (
        <StatusText showIcon status="error">
          {checkoutError}
        </StatusText>
      ) : null}
      {cartError ? (
        <StatusText showIcon status="error">
          {cartError}
        </StatusText>
      ) : null}
    </>
  )
}
