import NextImage from "next/image"
import type { BlogPost } from "@/lib/storefront/blog-content"

type BlogAuthorCardProps = {
  post: BlogPost
}

export function BlogAuthorCard({ post }: BlogAuthorCardProps) {
  return (
    <section className="flex flex-col gap-500 rounded-2xl border border-border-secondary bg-surface p-400 sm:flex-row sm:items-center">
      <NextImage
        alt={post.author}
        className="aspect-square h-blog-detail-author-image rounded-md object-cover"
        height={124}
        quality={50}
        src={post.authorImageSrc}
        width={124}
      />

      <div className="space-y-200">
        <p className="text-fg-secondary text-xs leading-normal">
          {post.authorRole}
        </p>
        <h3 className="font-bold text-fg-primary text-xl leading-tight">
          {post.author}
        </h3>
        <p className="text-fg-secondary text-md leading-relaxed">
          {post.authorBio}
        </p>
      </div>
    </section>
  )
}
