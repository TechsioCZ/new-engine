import { ExtraText } from "@techsio/ui-kit/atoms/extra-text";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import NextLink from "next/link";

export function CheckoutEmptyCartSection() {
  return (
    <section className="space-y-300 rounded-sm border border-border-primary bg-surface p-350">
      <h2 className="text-xl font-semibold text-fg-primary">Košík je prázdny</h2>
      <ExtraText>Pred checkoutom pridajte aspoň jeden produkt.</ExtraText>
      <div className="flex flex-wrap gap-200">
        <LinkButton as={NextLink} href="/" variant="secondary">
          Ísť na domovskú stránku
        </LinkButton>
        <LinkButton as={NextLink} href="/c/trapi-ma" theme="outlined" variant="secondary">
          Otvoriť kategóriu
        </LinkButton>
      </div>
    </section>
  );
}
