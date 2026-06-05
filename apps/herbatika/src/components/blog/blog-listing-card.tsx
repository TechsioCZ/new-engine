import { Badge } from "@techsio/ui-kit/atoms/badge";
import NextLink from "next/link";
import { routes } from "@/lib/routes";
import type { BlogPost } from "@/lib/storefront/blog-content";
import { formatBlogDate, formatTopicFromKey } from "./blog-formatters";
import { BlogImage } from "./blog-image";

type BlogListingCardProps = {
  post: BlogPost;
};

export function BlogListingCard({ post }: BlogListingCardProps) {
  const href = routes.blog.detail(post.slug);

  return (
    <article className="flex h-full min-h-950 flex-col overflow-hidden rounded-2xl border border-border-secondary bg-surface">
      <NextLink className="block" href={href}>
        <BlogImage
          alt={post.title}
          className="aspect-video w-full object-cover"
          height={360}
          loading="lazy"
          src={post.imageSrc}
          width={640}
          quality={50}
        />
      </NextLink>

      <div className="flex h-full flex-col gap-200 p-300">
        <div className="flex items-center justify-between gap-200">
          <p className="text-2xs leading-normal text-fg-secondary">
            {formatBlogDate(post.publishedAt)}
          </p>
          <Badge
            className="text-xs font-normal leading-[15px]"
            variant="secondary"
          >
            {formatTopicFromKey(post.topic)}
          </Badge>
        </div>

        <NextLink
          className="line-clamp-2 text-lg leading-snug font-bold text-fg-primary hover:text-primary"
          href={href}
        >
          {post.title}
        </NextLink>

        <p className="line-clamp-3 font-verdana text-xs leading-relaxed text-fg-secondary">
          {post.excerpt}
        </p>

        <div className="mt-auto flex items-center justify-between gap-300">
          <NextLink
            className="text-xs leading-normal font-semibold text-fg-primary underline underline-offset-2 hover:text-primary"
            href={href}
          >
            Prejsť na článok →
          </NextLink>
          <span className="text-2xs leading-normal text-fg-secondary">
            {post.readingTime}
          </span>
        </div>
      </div>
    </article>
  );
}
