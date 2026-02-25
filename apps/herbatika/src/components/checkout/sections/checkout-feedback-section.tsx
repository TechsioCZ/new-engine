import { ErrorText } from "@techsio/ui-kit/atoms/error-text";

type CheckoutFeedbackSectionProps = {
  cartError: string | null;
  checkoutError: string | null;
  checkoutMessage: string | null;
};

export function CheckoutFeedbackSection({
  cartError,
  checkoutError,
  checkoutMessage: _checkoutMessage,
}: CheckoutFeedbackSectionProps) {
  return (
    <>
      {checkoutError ? <ErrorText showIcon>{checkoutError}</ErrorText> : null}
      {cartError ? <ErrorText showIcon>{cartError}</ErrorText> : null}
    </>
  );
}
