/**
 * SectionCard — @techsio/ui-kit molecule.
 *
 * @component SectionCard
 * @componentVersion v1.0.0
 * @skill section-card-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the section-card-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { HTMLAttributes, ReactNode, Ref } from "react"
import { hasContent } from "../internal/has-content"
import { tv } from "../utils"

const sectionCardVariants = tv({
  slots: {
    root: "surface-card flex min-w-0 flex-col gap-section-card",
    header:
      "flex flex-wrap items-start justify-between gap-section-card-header",
    heading: "flex min-w-0 flex-col gap-section-card-heading",
    title:
      "m-0 font-section-card-title text-section-card-title-fg text-section-card-title-size",
    description:
      "m-0 text-section-card-description-fg text-section-card-description-size",
    actions: "flex flex-wrap items-center gap-section-card-actions",
  },
  variants: {
    flush: {
      false: { root: "p-section-card" },
      true: { header: "px-section-card pt-section-card" },
    },
  },
  defaultVariants: { flush: false },
})

export type SectionCardProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  /** The section's `h2`. */
  title?: ReactNode
  description?: ReactNode
  /** Actions for this section only. */
  actions?: ReactNode
  /** No padding, for a child that draws its own edges, such as a Table. The header keeps its inset. */
  flush?: boolean
  ref?: Ref<HTMLElement>
}

/**
 * A titled block of one page: the one outlined surface level. Inside another SectionCard or a
 * SidePanel it drops its outline and padding, so cards never stack.
 */
export function SectionCard({
  title,
  description,
  actions,
  flush = false,
  className,
  children,
  ref,
  ...props
}: SectionCardProps) {
  const styles = sectionCardVariants({ flush })
  const hasHeader =
    hasContent(title) || hasContent(description) || hasContent(actions)
  return (
    <section className={styles.root({ className })} ref={ref} {...props}>
      {hasHeader && (
        <div className={styles.header()}>
          <div className={styles.heading()}>
            {hasContent(title) && <h2 className={styles.title()}>{title}</h2>}
            {hasContent(description) && (
              <p className={styles.description()}>{description}</p>
            )}
          </div>
          {hasContent(actions) && (
            <div className={styles.actions()}>{actions}</div>
          )}
        </div>
      )}
      {children}
    </section>
  )
}

SectionCard.displayName = "SectionCard"
