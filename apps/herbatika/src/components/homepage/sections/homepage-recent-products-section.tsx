import type { HttpTypes } from "@medusajs/types";
import { ExtraText } from "@techsio/ui-kit/atoms/extra-text";
import { Image } from "@techsio/ui-kit/atoms/image";
import { Link } from "@techsio/ui-kit/atoms/link";
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton";
import NextLink from "next/link";
import { getProductPriceLabel } from "@/components/product-card/product-card.pricing";
import { RECENT_PRODUCT_SKELETON_KEYS } from "@/components/homepage/homepage.data";

type HomepageRecentProductsSectionProps = {
  products: HttpTypes.StoreProduct[];
  shouldShowProductSkeleton: boolean;
};

export function HomepageRecentProductsSection({
  products,
  shouldShowProductSkeleton,
}: HomepageRecentProductsSectionProps) {
  return (
    <section className="space-y-400" id="naposledy-navstivene">
      <header>
        <h2 className="text-2xl font-bold text-fg-primary">Naposledy navštívené</h2>
        <p className="mt-100 text-sm text-fg-secondary">
          Produkty, ktoré ste si naposledy prezerali.
        </p>
      </header>

      {shouldShowProductSkeleton ? (
        <div className="grid grid-cols-2 gap-300 md:grid-cols-4">
          {RECENT_PRODUCT_SKELETON_KEYS.map((skeletonKey) => (
            <div
              className="rounded-xl border border-border-secondary bg-surface p-300"
              key={skeletonKey}
            >
              <Skeleton.Rectangle className="h-900 rounded-lg" />
              <Skeleton.Text className="mt-200" noOfLines={2} size="sm" />
            </div>
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 gap-300 md:grid-cols-4">
          {products.map((product, index) => (
            <Link
              as={NextLink}
              className="rounded-xl border border-border-secondary bg-surface p-300 hover:border-primary/30"
              href={product.handle ? `/p/${product.handle}` : "/#"}
              key={`recent-product-${product.id}-${index}`}
            >
              <Image
                alt={product.title || "Produkt"}
                className="h-900 w-full rounded-lg border border-border-secondary object-cover"
                src={product.thumbnail || "/file.svg"}
              />
              <p className="mt-200 line-clamp-2 text-sm leading-snug font-semibold text-fg-primary">
                {product.title}
              </p>
              <p className="mt-100 text-sm font-bold text-primary">
                {getProductPriceLabel(product)}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <ExtraText className="text-sm text-fg-secondary">
          Zatiaľ nemáte žiadne naposledy navštívené produkty.
        </ExtraText>
      )}
    </section>
  );
}
