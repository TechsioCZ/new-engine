import NextLink from "next/link";
import { Link } from "@techsio/ui-kit/atoms/link";
import { ProductCard } from "@techsio/ui-kit/molecules/product-card";

type HerbaticaCompactProductCardProps = {
  eyebrow?: string;
  href?: string;
  imageAlt?: string;
  imageSrc?: string;
  price: string;
  title: string;
};

export function HerbaticaCompactProductCard({
  eyebrow,
  href = "#",
  imageAlt,
  imageSrc = "/photos/image.png",
  price,
  title,
}: HerbaticaCompactProductCardProps) {
  return (
    <ProductCard className="h-full max-w-none rounded-2xl border border-border-secondary bg-surface p-300 shadow-none">
      <Link as={NextLink} className="block overflow-hidden rounded-xl bg-base" href={href}>
        <ProductCard.Image
          alt={imageAlt ?? title}
          className="aspect-square w-full object-cover"
          src={imageSrc}
        />
      </Link>

      <div className="mt-250 flex flex-col gap-150">
        {eyebrow ? (
          <p className="text-2xs font-medium tracking-wide text-fg-secondary uppercase">
            {eyebrow}
          </p>
        ) : null}

        <ProductCard.Name className="font-open-sans text-md leading-snug font-bold text-primary">
          <Link as={NextLink} className="hover:text-primary-hover" href={href}>
            {title}
          </Link>
        </ProductCard.Name>

        <ProductCard.Price className="text-lg leading-tight font-bold text-fg-primary">
          {price}
        </ProductCard.Price>
      </div>
    </ProductCard>
  );
}
