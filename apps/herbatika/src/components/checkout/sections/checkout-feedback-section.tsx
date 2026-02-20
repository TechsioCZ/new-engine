import { ErrorText } from "@techsio/ui-kit/atoms/error-text";
import { StatusText } from "@techsio/ui-kit/atoms/status-text";

type CheckoutFeedbackSectionProps = {
  cartError: string | null;
  checkoutError: string | null;
  checkoutMessage: string | null;
};

export function CheckoutFeedbackSection({
  cartError,
  checkoutError,
  checkoutMessage,
}: CheckoutFeedbackSectionProps) {
  return (
    <>
      {checkoutMessage ? (
        <StatusText showIcon status="success">
          {checkoutMessage}
        </StatusText>
      ) : null}
      {checkoutError ? <ErrorText showIcon>{checkoutError}</ErrorText> : null}
      {cartError ? <ErrorText showIcon>{cartError}</ErrorText> : null}
    </>
  );
}
