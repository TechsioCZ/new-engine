import { Button } from "@techsio/ui-kit/atoms/button";
import { StatusText } from "@techsio/ui-kit/atoms/status-text";

type CheckoutCompleteSectionProps = {
  acceptTermsConsent: boolean;
  canCompleteOrder: boolean;
  hasPayment: boolean;
  hasShipping: boolean;
  hasStoredAddress: boolean;
  isCompletingOrder: boolean;
  onCompleteOrder: () => Promise<void>;
};

export function CheckoutCompleteSection({
  acceptTermsConsent,
  canCompleteOrder,
  hasPayment,
  hasShipping,
  hasStoredAddress,
  isCompletingOrder,
  onCompleteOrder,
}: CheckoutCompleteSectionProps) {
  return (
    <section className="space-y-300 rounded-xl border border-border-secondary bg-surface p-400">
      <h2 className="text-lg font-semibold text-fg-primary">4. Súhrn a dokončenie</h2>
      <div className="grid gap-200 sm:grid-cols-2">
        <StatusText showIcon size="sm" status={hasStoredAddress ? "success" : "warning"}>
          {hasStoredAddress ? "Údaje sú uložené." : "Najprv uložte údaje."}
        </StatusText>
        <StatusText showIcon size="sm" status={hasShipping ? "success" : "warning"}>
          {hasShipping ? "Doprava je vybraná." : "Vyberte dopravu."}
        </StatusText>
        <StatusText showIcon size="sm" status={hasPayment ? "success" : "warning"}>
          {hasPayment ? "Platba je pripravená." : "Vyberte platbu."}
        </StatusText>
        <StatusText
          showIcon
          size="sm"
          status={acceptTermsConsent ? "success" : "warning"}
        >
          {acceptTermsConsent
            ? "Súhlas s podmienkami potvrdený."
            : "Potvrďte obchodné podmienky."}
        </StatusText>
      </div>
      <Button
        block
        disabled={!canCompleteOrder}
        isLoading={isCompletingOrder}
        onClick={() => {
          void onCompleteOrder();
        }}
        type="button"
        variant="primary"
      >
        Dokončiť objednávku
      </Button>
    </section>
  );
}
