import { Image } from "@techsio/ui-kit/atoms/image";
import { Link } from "@techsio/ui-kit/atoms/link";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import NextLink from "next/link";
import type { BlogTeaserItem } from "@/components/homepage/homepage.data";
import { HomepageSectionHeader } from "./homepage-section-header";

type HomepageBlogSectionProps = {
  posts: BlogTeaserItem[];
};

export function HomepageBlogSection({ posts }: HomepageBlogSectionProps) {
  return (
    <section className="space-y-400" id="blog">
      <HomepageSectionHeader
        ctaHref="/blog"
        ctaIcon="icon-[mdi--open-in-new]"
        ctaLabel="Všetky články"
        title="Blog o zdravom životnom štýle"
        subtitle="Nové články o prírode, vitalite a každodennej rovnováhe."
      />

      <div className="grid grid-cols-1 gap-400 lg:grid-cols-3">
        {posts.map((post) => (
          <article
            className="overflow-hidden rounded-2xl border border-border-secondary bg-surface shadow-sm"
            key={post.id}
          >
            <Link as={NextLink} className="block" href={post.href}>
              <Image
                alt={post.title}
                className="home-blog-card-image w-full object-cover"
                src={post.imageSrc}
              />
            </Link>
            <div className="space-y-200 p-400">
              <h3 className="line-clamp-2 text-sm leading-snug font-bold text-fg-primary">
                <Link as={NextLink} className="hover:text-primary" href={post.href}>
                  {post.title}
                </Link>
              </h3>
              <p className="line-clamp-3 text-sm text-fg-secondary">{post.excerpt}</p>
              <LinkButton
                as={NextLink}
                className="rounded-md px-300 py-200 text-xs font-semibold"
                href={post.href}
                icon="icon-[mdi--arrow-right]"
                iconPosition="right"
                size="sm"
                theme="light"
                variant="secondary"
              >
                Čítať článok
              </LinkButton>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
