import NextLink from "next/link";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Image } from "@techsio/ui-kit/atoms/image";
import { Link } from "@techsio/ui-kit/atoms/link";

type HerbaticaBlogCardProps = {
  badge: string;
  date: string;
  excerpt: string;
  href?: string;
  imageAlt?: string;
  imageSrc?: string;
  readingTime?: string;
  title: string;
  variant?: "listing" | "related";
};

export function HerbaticaBlogCard({
  badge,
  date,
  excerpt,
  href = "#",
  imageAlt,
  imageSrc = "/photos/image.png",
  readingTime,
  title,
  variant = "listing",
}: HerbaticaBlogCardProps) {
  const isListing = variant === "listing";

  return (
    <article className="flex h-full min-h-950 flex-col overflow-hidden rounded-2xl border border-border-secondary bg-surface">
      <Link as={NextLink} className="block" href={href}>
        <Image
          alt={imageAlt ?? title}
          className="aspect-video w-full object-cover"
          height={360}
          loading="lazy"
          src={imageSrc}
          width={640}
        />
      </Link>

      <div className="flex h-full flex-col gap-200 p-300">
        <div className="flex items-center justify-between gap-200">
          <p className="text-2xs leading-normal text-fg-secondary">{date}</p>
          <Badge className="rounded-full px-200 py-100 text-2xs font-medium" variant="secondary">
            {badge}
          </Badge>
        </div>

        <Link
          as={NextLink}
          className="line-clamp-2 text-lg leading-snug font-bold text-fg-primary hover:text-primary"
          href={href}
        >
          {title}
        </Link>

        <p className="line-clamp-3 font-verdana text-xs leading-relaxed text-fg-secondary">
          {excerpt}
        </p>

        {isListing ? (
          <div className="mt-auto flex items-center justify-between gap-300">
            <Link
              as={NextLink}
              className="text-xs leading-normal font-semibold text-fg-primary underline underline-offset-2 hover:text-primary"
              href={href}
            >
              Prejsť na článok →
            </Link>
            {readingTime ? (
              <span className="text-2xs leading-normal text-fg-secondary">
                {readingTime}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
