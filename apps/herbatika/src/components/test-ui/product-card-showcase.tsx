import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Link } from "@techsio/ui-kit/atoms/link";
import { ProductCard } from "@techsio/ui-kit/molecules/product-card";
import NextLink from "next/link";
import { SupportingText } from "@/components/text/supporting-text";

const PRODUCT_CARD_NOTES = [
  "Shared ProductCard už řeší shell, image ratio, title, price a CTA color tokeny.",
  "Sale chip je app composition nad ProductCard, nie dôvod pre nový shared contract.",
  "Promo badge stack stále potrebuje lokálny font-weight override, kým Badge nedostane presnejšie surface API.",
] as const;

function DefaultProductCard() {
  return (
    <ProductCard>
      <div className="relative">
        <Link as={NextLink} href="#">
          <ProductCard.Image
            alt="Sofia krém na žily s extraktom z pijavice lekárskej a pagaštanom"
            src="/file.svg"
          />
        </Link>

        <ProductCard.Badges className="absolute top-0 left-0 flex-col items-start">
          <Badge className="leading-tight font-bold" variant="discount">
            Akcia
          </Badge>
          <Badge className="leading-tight font-bold" variant="success">
            Novinka
          </Badge>
          <Badge className="leading-tight font-bold" variant="warning">
            Tip
          </Badge>
        </ProductCard.Badges>

        <div className="absolute right-0 bottom-0 rounded-md bg-tertiary px-200 py-200">
          <span className="text-xs leading-tight font-bold text-fg-reverse">
            -4,50 €
          </span>
        </div>
      </div>

      <ProductCard.Name>
        <Link as={NextLink} href="#">
          Sofia krém na žily s extraktom z pijavice lekárskej a pagaštanom...
        </Link>
      </ProductCard.Name>

      <ul className="list-disc ps-400 text-xs leading-normal text-fg-secondary">
        <li>úľava od bolesti</li>
        <li>zmierňuje kŕčové žily</li>
        <li>odstraňuje opuchy nôh</li>
      </ul>

      <div className="flex items-end justify-between gap-300">
        <div>
          <span className="text-xs leading-normal text-fg-tertiary line-through">
            20,23 €
          </span>
          <ProductCard.Price>16,83 €</ProductCard.Price>
        </div>

        <ProductCard.Actions>
          <ProductCard.Button
            buttonVariant="cart"
            icon="token-icon-cart-button"
          >
            Do košíka
          </ProductCard.Button>
        </ProductCard.Actions>
      </div>
    </ProductCard>
  );
}

export function ProductCardShowcase() {
  return (
    <div className="space-y-500">
      <section className="space-y-300 rounded-md border border-border-secondary bg-surface p-400">
        <div className="space-y-100">
          <h2 className="text-lg font-semibold text-fg-primary">
            Product card
          </h2>
          <SupportingText>
            Figma node <code>2137:2769</code> mapuje na current{" "}
            <code>ProductCard</code> compound API s badge overlay, sale chipem a
            cart CTA.
          </SupportingText>
        </div>

        <div className="rounded-md bg-highlight p-400 w-xs">
          <DefaultProductCard />
        </div>
      </section>

      <section className="space-y-250 rounded-md border border-border-secondary bg-surface p-400">
        <div className="space-y-100">
          <h2 className="text-lg font-semibold text-fg-primary">
            Product card mapping
          </h2>
          <SupportingText>
            Showcase ukazuje ProductCard mapping po token cleanupu. Zostáva len
            sale chip composition a promo badge font-weight ako aktuálny API
            gap.
          </SupportingText>
        </div>

        <div className="space-y-150">
          {PRODUCT_CARD_NOTES.map((item, index) => (
            <div
              className="flex items-start gap-200 rounded-sm bg-highlight px-300 py-250"
              key={item}
            >
              <Badge variant="secondary">{String(index + 1)}</Badge>
              <SupportingText className="text-fg-primary">
                {item}
              </SupportingText>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
