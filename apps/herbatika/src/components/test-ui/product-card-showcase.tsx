import NextLink from "next/link";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { Link } from "@techsio/ui-kit/atoms/link";
import { ProductCard } from "@techsio/ui-kit/molecules/product-card";
import { SupportingText } from "@/components/text/supporting-text";

const PRODUCT_CARD_NOTES = [
  "Shared ProductCard řeší card shell, image slot, title, price a action area.",
  "Badge stack, discount chip a bullet description jsou app composition nad shared primitives.",
  "Compact card pravděpodobně zůstane app wrapper pattern, ne samostatný shared contract.",
] as const;

function DefaultProductCard() {
  return (
    <ProductCard className="h-full max-w-none rounded-2xl border-transparent bg-surface p-500 pb-550 shadow-none">
      <div className="relative pb-250">
        <Link as={NextLink} className="block" href="#">
          <ProductCard.Image
            alt="Sofia krém"
            className="w-full object-contain"
            src="/file.svg"
          />
        </Link>

        <ProductCard.Badges className="absolute top-0 left-0 flex-col gap-100">
          <Badge className="rounded-md px-200 py-100 text-xs leading-tight font-bold" variant="discount">
            Akcia
          </Badge>
          <Badge className="rounded-md px-200 py-100 text-xs leading-tight font-bold" variant="success">
            Novinka
          </Badge>
          <Badge className="rounded-md px-200 py-100 text-xs leading-tight font-bold" variant="warning">
            Tip
          </Badge>
        </ProductCard.Badges>

        <div className="absolute right-0 bottom-0 rounded-md bg-tertiary px-200 py-200">
          <span className="text-xs leading-tight font-bold text-fg-reverse">-4,50 €</span>
        </div>
      </div>

      <div className="flex h-full flex-col gap-450">
        <div className="flex flex-col gap-250">
          <ProductCard.Name className="min-h-750 text-lg leading-snug font-semibold text-fg-primary">
            <Link as={NextLink} className="hover:text-primary" href="#">
              Sofia krém na žily s extraktom z pijavice lekárskej a pagaštano...
            </Link>
          </ProductCard.Name>

          <ul className="list-disc ps-400 text-xs leading-normal text-fg-secondary">
            <li>úľava od bolesti</li>
            <li>zmierňuje kŕčové žily</li>
            <li>odstraňuje opuchy nôh</li>
          </ul>
        </div>

        <div className="mt-auto flex items-end justify-between gap-300">
          <div className="flex min-h-750 flex-col justify-end">
            <span className="text-xs leading-normal text-fg-tertiary line-through">
              20,23 €
            </span>
            <ProductCard.Price className="text-xl leading-tight font-bold text-fg-primary">
              16,83 €
            </ProductCard.Price>
          </div>

          <ProductCard.Actions className="mt-0 shrink-0">
            <Button
              className="inline-flex h-750 min-w-900 items-center gap-200 rounded-md border border-primary bg-primary px-450 text-sm leading-normal font-medium text-fg-reverse hover:bg-primary-hover"
              icon="token-icon-cart"
              size="current"
              type="button"
            >
              Do košíka
            </Button>
          </ProductCard.Actions>
        </div>
      </div>
    </ProductCard>
  );
}

function CompactProductCard() {
  return (
    <ProductCard className="h-full max-w-none rounded-2xl border-transparent bg-surface p-300 shadow-none">
      <Link as={NextLink} className="block" href="#">
        <ProductCard.Image
          alt="Naposledy navštívený produkt"
          className="aspect-square w-full rounded-none object-contain"
          src="/file.svg"
        />
      </Link>

      <div className="mt-250 flex flex-col gap-150">
        <ProductCard.Name className="text-md leading-snug font-bold text-primary">
          <Link as={NextLink} className="hover:text-primary-hover" href="#">
            Naposledy navštívený produkt
          </Link>
        </ProductCard.Name>
        <ProductCard.Price className="text-lg leading-tight font-bold text-fg-primary">
          16,83 €
        </ProductCard.Price>
      </div>
    </ProductCard>
  );
}

export function ProductCardShowcase() {
  return (
    <div className="space-y-500">
      <section className="grid gap-300 xl:grid-cols-2">
        <article className="space-y-300 rounded-md border border-border-secondary bg-surface p-400">
          <div className="space-y-100">
            <h2 className="text-lg font-semibold text-fg-primary">Default product card</h2>
            <SupportingText>
              Figma node `1:50` kombinuje badge stack, image, bullet description,
              crossed price a add-to-cart CTA.
            </SupportingText>
          </div>
          <div className="rounded-md bg-highlight p-400">
            <DefaultProductCard />
          </div>
        </article>

        <article className="space-y-300 rounded-md border border-border-secondary bg-surface p-400">
          <div className="space-y-100">
            <h2 className="text-lg font-semibold text-fg-primary">Compact product card</h2>
            <SupportingText>
              Compact varianta reprezentuje lehčí listing surface pro sekundární
              produktové bloky.
            </SupportingText>
          </div>
          <div className="rounded-md bg-highlight p-400">
            <CompactProductCard />
          </div>
        </article>
      </section>

      <section className="space-y-250 rounded-md border border-border-secondary bg-surface p-400">
        <div className="space-y-100">
          <h2 className="text-lg font-semibold text-fg-primary">Product card mapping</h2>
          <SupportingText>
            Tady půjde rychle vidět, co už zvládá current `ProductCard` contract a
            co je ještě app composition navíc.
          </SupportingText>
        </div>

        <div className="space-y-150">
          {PRODUCT_CARD_NOTES.map((item, index) => (
            <div className="flex items-start gap-200 rounded-sm bg-highlight px-300 py-250" key={item}>
              <Badge variant="secondary">{String(index + 1)}</Badge>
              <SupportingText className="text-fg-primary">{item}</SupportingText>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
