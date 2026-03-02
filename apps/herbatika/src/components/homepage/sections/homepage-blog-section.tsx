import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Image } from "@techsio/ui-kit/atoms/image";
import { Link } from "@techsio/ui-kit/atoms/link";
import NextLink from "next/link";
import { formatBlogDate, formatTopicFromKey } from "@/components/blog/blog-formatters";
import type { BlogTeaserItem } from "@/components/homepage/homepage.data";

type HomepageBlogSectionProps = {
  posts: BlogTeaserItem[];
};

export function HomepageBlogSection({ posts }: HomepageBlogSectionProps) {
  return (
    <section className="space-y-400" id="blog">
      <h2 className="text-4xl leading-tight font-bold text-fg-primary">
        Blog o zdraví a kráse
      </h2>

      <div className="grid grid-cols-1 gap-400 lg:grid-cols-3">
        {posts.map((post) => (
          <article
            className="flex h-full flex-col overflow-hidden rounded-2xl border border-border-secondary bg-surface"
            key={post.id}
          >
            <Link as={NextLink} className="block" href={post.href}>
              <Image
                alt={post.title}
                className="aspect-video w-full object-cover"
                src={post.imageSrc}
              />
            </Link>

            <div className="flex h-full flex-col gap-200 p-300">
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

              <h3 className="line-clamp-2 text-lg leading-snug font-bold text-fg-primary">
                <Link as={NextLink} className="hover:text-primary" href={post.href}>
                  {post.title}
                </Link>
              </h3>

              <p className="line-clamp-3 text-xs leading-relaxed text-fg-secondary">
                {post.excerpt}
              </p>

              <div className="mt-auto flex items-center justify-between gap-300">
                <Link
                  as={NextLink}
                  className="text-xs leading-normal font-semibold text-fg-primary underline underline-offset-2 hover:text-primary"
                  href={post.href}
                >
                  Prejsť na článok
                </Link>
                <span className="text-2xs leading-normal text-fg-secondary">
                  {post.readingTime}
                </span>
              </div>

            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
