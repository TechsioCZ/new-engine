import NextImage from "next/image";
import type { BlogPost } from "@/lib/storefront/blog-content";

type BlogAuthorCardProps = {
  post: BlogPost;
};

export function BlogAuthorCard({ post }: BlogAuthorCardProps) {
  return (
    <section className="flex flex-col gap-500 rounded-2xl border border-border-secondary bg-surface p-400 sm:flex-row sm:items-center">
      <NextImage
        alt={post.author}
        className="h-blog-detail-author-image aspect-square rounded-md object-cover"
        height={124}
        src={post.authorImageSrc}
        width={124}
        quality={50}
      />

      <div className="space-y-200">
        <p className="text-xs leading-normal text-fg-secondary">
          {post.authorRole}
        </p>
        <h3 className="text-xl leading-tight font-bold text-fg-primary">
          {post.author}
        </h3>
        <p className="text-md leading-relaxed text-fg-secondary">
          {post.authorBio}
        </p>
      </div>
    </section>
  );
}
