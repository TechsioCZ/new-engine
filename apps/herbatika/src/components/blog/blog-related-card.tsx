import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Link } from "@techsio/ui-kit/atoms/link";
import NextLink from "next/link";
import NextImage from "next/image";
import { routes } from "@/lib/routes";
import type { BlogPost } from "@/lib/storefront/blog-content";
import { formatBlogDate, formatTopicFromKey } from "./blog-formatters";

type BlogRelatedCardProps = {
  post: BlogPost;
};

export function BlogRelatedCard({ post }: BlogRelatedCardProps) {
  const href = routes.blog.detail(post.slug);

  return (
    <article className="min-h-950 overflow-hidden rounded-2xl border border-border-secondary bg-surface">
      <Link as={NextLink} className="block" href={href}>
        <NextImage
          alt={post.title}
          className="aspect-video w-full object-cover"
          height={320}
          loading="lazy"
          src={post.imageSrc}
          width={520}
          quality={50}
        />
      </Link>

      <div className="space-y-200 p-300">
        <div className="flex items-center justify-between gap-200">
          <p className="text-2xs leading-normal text-fg-secondary">
            {formatBlogDate(post.publishedAt)}
          </p>
          <Badge
            className="rounded-full px-200 py-100 text-2xs font-medium"
            variant="secondary"
          >
            {formatTopicFromKey(post.topic)}
          </Badge>
        </div>

        <Link
          as={NextLink}
          className="line-clamp-2 text-lg leading-snug font-bold text-fg-primary hover:text-primary"
          href={href}
        >
          {post.title}
        </Link>

        <p className="line-clamp-3 text-xs leading-relaxed text-fg-secondary">
          {post.excerpt}
        </p>
      </div>
    </article>
  );
}
