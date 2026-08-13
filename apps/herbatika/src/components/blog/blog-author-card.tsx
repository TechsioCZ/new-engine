import NextImage from "next/image"
import type { BlogPost } from "@/lib/storefront/blog-content"

type BlogAuthorCardProps = {
  post: BlogPost
}

export function BlogAuthorCard({ post }: BlogAuthorCardProps) {
  const { author } = post
  if (!author) {
    return null
  }

  return (
    <section className="flex flex-col gap-500 rounded-2xl border border-border-secondary bg-surface p-400 sm:flex-row sm:items-center">
      {author.imageSrc ? (
        <NextImage
          alt={author.name}
          className="aspect-square h-blog-detail-author-image rounded-md object-cover"
          height={124}
          quality={50}
          src={author.imageSrc}
          width={124}
        />
      ) : null}

      <div className="space-y-200">
        {author.role ? (
          <p className="text-fg-secondary text-xs leading-normal">
            {author.role}
          </p>
        ) : null}
        <h3 className="font-bold text-fg-primary text-xl leading-tight">
          {author.name}
        </h3>
        {author.bio ? (
          <p className="text-fg-secondary text-md leading-relaxed">
            {author.bio}
          </p>
        ) : null}
      </div>
    </section>
  )
}
