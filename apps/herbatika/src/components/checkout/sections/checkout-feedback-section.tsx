import { StatusText } from "@techsio/ui-kit/atoms/status-text"

interface CheckoutFeedbackSectionProps {
  cartError: string | null
  checkoutError: string | null
}

export const CheckoutFeedbackSection = ({
  cartError,
  checkoutError,
}: CheckoutFeedbackSectionProps) => (
  <>
    {checkoutError !== null && checkoutError.length > 0 ? (
      <StatusText showIcon status="error">
        {checkoutError}
      </StatusText>
    ) : null}
    {cartError !== null && cartError.length > 0 ? (
      <StatusText showIcon status="error">
        {cartError}
      </StatusText>
    ) : null}
  </>
)
