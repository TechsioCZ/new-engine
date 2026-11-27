/**
 * DetailList — @techsio/ui-kit molecule.
 *
 * @component DetailList
 * @componentVersion v1.0.0
 * @skill detail-list-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the detail-list-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { HTMLAttributes, ReactNode, Ref } from "react"
import { tv } from "../utils"

const detailListVariants = tv({
  slots: {
    root: "m-0 grid min-w-0 grid-cols-1 gap-detail-list sm:grid-cols-2",
    item: "flex min-w-0 flex-col gap-detail-list-item",
    term: "wrap-anywhere text-detail-list-term-fg text-detail-list-term-size",
    value:
      "wrap-anywhere m-0 text-detail-list-value-fg text-detail-list-value-size",
  },
})

export type DetailListItem = {
  /** Stable key; defaults to the label when it is text. */
  id?: string
  label: ReactNode
  value: ReactNode
}

export type DetailListProps = HTMLAttributes<HTMLDListElement> & {
  items: DetailListItem[]
  ref?: Ref<HTMLDListElement>
}

const itemKey = (item: DetailListItem, index: number) =>
  item.id ?? (typeof item.label === "string" ? item.label : `detail-${index}`)

/** Read-only label and value grid for detail pages and panels. Two columns from `sm`. */
export function DetailList({
  items,
  className,
  ref,
  ...props
}: DetailListProps) {
  const styles = detailListVariants()
  return (
    <dl className={styles.root({ className })} ref={ref} {...props}>
      {items.map((item, index) => (
        <div className={styles.item()} key={itemKey(item, index)}>
          <dt className={styles.term()}>{item.label}</dt>
          <dd className={styles.value()}>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

DetailList.displayName = "DetailList"
