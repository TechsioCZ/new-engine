/**
 * PageHeader — @techsio/ui-kit organism.
 *
 * @component PageHeader
 * @componentVersion v1.0.0
 * @skill page-header-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the page-header-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { HTMLAttributes, ReactNode, Ref } from "react"
import { hasContent } from "../internal/has-content"
import { tv } from "../utils"

const pageHeaderVariants = tv({
  slots: {
    root: "flex min-w-0 flex-col gap-page-header",
    row: "flex flex-wrap items-start justify-between gap-page-header-row",
    heading: "flex min-w-0 flex-col gap-page-header-heading",
    titleRow: "flex flex-wrap items-center gap-page-header-meta",
    title:
      "m-0 font-page-header-title text-page-header-title-fg text-page-header-title-size",
    description:
      "m-0 max-w-page-header-description text-page-header-description-fg text-page-header-description-size",
    actions: "flex flex-wrap items-center gap-page-header-actions",
  },
})

export type PageHeaderProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  /** The page's one `h1`. */
  title: ReactNode
  description?: ReactNode
  /** Status badges beside the title. */
  meta?: ReactNode
  /** Page actions, primary last. */
  actions?: ReactNode
  /** Where you are: a `BreadcrumbTemplate` or a back link, above the title. */
  breadcrumb?: ReactNode
  ref?: Ref<HTMLElement>
}

/** One header per page: where you are, what this is, what you can do. */
export function PageHeader({
  title,
  description,
  meta,
  actions,
  breadcrumb,
  className,
  ref,
  ...props
}: PageHeaderProps) {
  const styles = pageHeaderVariants()
  return (
    <header className={styles.root({ className })} ref={ref} {...props}>
      {hasContent(breadcrumb) && breadcrumb}
      <div className={styles.row()}>
        <div className={styles.heading()}>
          <div className={styles.titleRow()}>
            <h1 className={styles.title()}>{title}</h1>
            {meta}
          </div>
          {hasContent(description) && (
            <p className={styles.description()}>{description}</p>
          )}
        </div>
        {hasContent(actions) && (
          <div className={styles.actions()}>{actions}</div>
        )}
      </div>
    </header>
  )
}

PageHeader.displayName = "PageHeader"
