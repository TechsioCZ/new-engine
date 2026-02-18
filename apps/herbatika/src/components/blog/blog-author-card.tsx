import { Image } from "@techsio/ui-kit/atoms/image";
import type { BlogPost } from "@/lib/storefront/blog-content";

type BlogAuthorCardProps = {
  post: BlogPost;
};

export function BlogAuthorCard({ post }: BlogAuthorCardProps) {
  return (
    <section className="flex flex-col gap-300 rounded-2xl border border-border-secondary bg-surface p-400 sm:flex-row sm:items-center">
      <Image
        alt={post.author}
        className="blog-author-image rounded-lg object-cover"
        height={200}
        src={post.authorImageSrc}
        width={200}
      />

      <div className="space-y-150">
        <p className="text-xs leading-normal text-fg-secondary">
          {post.authorRole}
        </p>
        <h3 className="text-xl leading-tight font-bold text-fg-primary">
          {post.author}
        </h3>
        <p className="text-sm leading-relaxed text-fg-secondary">
          {post.authorBio}
        </p>
      </div>
    </section>
  );
}
