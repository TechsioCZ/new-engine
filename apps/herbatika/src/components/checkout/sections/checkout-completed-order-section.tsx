import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { StatusText } from "@techsio/ui-kit/atoms/status-text";
import NextLink from "next/link";

type CheckoutCompletedOrderSectionProps = {
  completedOrderId: string;
};

export function CheckoutCompletedOrderSection({
  completedOrderId,
}: CheckoutCompletedOrderSectionProps) {
  return (
    <section className="space-y-300 rounded-sm border border-border-primary bg-surface p-350">
      <h2 className="text-xl font-semibold text-fg-primary">Objednávka dokončená</h2>
      <StatusText showIcon status="success">
        {`Objednávka bola vytvorená (${completedOrderId}).`}
      </StatusText>
      <div className="flex flex-wrap gap-200">
        <LinkButton as={NextLink} href="/" variant="secondary">
          Pokračovať v nákupe
        </LinkButton>
        <LinkButton as={NextLink} href="/account" theme="outlined" variant="secondary">
          Prejsť na účet
        </LinkButton>
      </div>
    </section>
  );
}
