import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Link } from "@techsio/ui-kit/atoms/link"
import type { BlogTableOfContentsItem } from "@/lib/storefront/blog-content"

type BlogTableOfContentsProps = {
  chapterCount: string
  items: BlogTableOfContentsItem[]
  title: string
}

const TABLE_OF_CONTENTS_ITEM_CLASS =
  "list-inside list-disc text-fg-secondary text-sm leading-relaxed marker:text-fg-disabled marker:text-lg"

export function BlogTableOfContents({
  chapterCount,
  items,
  title,
}: BlogTableOfContentsProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <details
      className="group space-y-350 rounded-2xl border border-border-secondary bg-surface p-400"
      open
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-300 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-250">
          <span className="inline-flex items-center justify-center rounded-xs bg-highlight p-50 text-primary">
            <Icon icon="token-icon-list" size="2xl" />
          </span>
          <div>
            <h2 className="font-bold text-fg-primary text-xl leading-tight">
              {title}
            </h2>
            <p className="text-fg-secondary text-sm leading-normal">
              {chapterCount}
            </p>
          </div>
        </div>
        <Icon
          className="rotate-180 text-fg-secondary transition-transform group-open:rotate-0 motion-reduce:transition-none"
          icon="token-icon-chevron-up"
          size="2xl"
        />
      </summary>

      <ul className="space-y-100 pl-500">
        {items.map((item) => (
          <li
            className={`${TABLE_OF_CONTENTS_ITEM_CLASS} ${item.level === 3 ? "pl-400" : ""}`}
            key={item.id}
          >
            <Link
              className="text-fg-secondary hover:text-primary"
              href={`#${item.id}`}
            >
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  )
}
