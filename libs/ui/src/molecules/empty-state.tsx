/**
 * EmptyState — @techsio/ui-kit molecule.
 *
 * @component EmptyState
 * @componentVersion v1.0.0
 * @skill empty-state-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the empty-state-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { HTMLAttributes, ReactNode, Ref } from "react"
import { Icon, type IconType } from "../atoms/icon"
import { hasContent } from "../internal/has-content"
import { tv } from "../utils"

const emptyStateVariants = tv({
  slots: {
    root: "flex flex-col items-center gap-empty-state p-empty-state text-center",
    icon: "text-empty-state-icon-fg",
    text: "flex flex-col items-center gap-empty-state-text",
    title:
      "m-0 font-empty-state-title text-empty-state-title-fg text-empty-state-title-size",
    description:
      "max-w-empty-state-description text-empty-state-description-fg text-empty-state-description-size",
  },
})

export type EmptyStateProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  /** What is missing, in a few words. */
  title: ReactNode
  /** Why, or what happens once something exists. */
  description?: ReactNode
  /** The one useful next step, such as a create button. */
  action?: ReactNode
  icon?: IconType
  ref?: Ref<HTMLDivElement>
}

/** Says what is missing and offers the one useful next step. */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
  ref,
  ...props
}: EmptyStateProps) {
  const styles = emptyStateVariants()
  return (
    <div className={styles.root({ className })} ref={ref} {...props}>
      {icon && (
        <Icon
          aria-hidden="true"
          className={styles.icon()}
          icon={icon}
          size="xl"
        />
      )}
      <div className={styles.text()}>
        <p className={styles.title()}>{title}</p>
        {hasContent(description) && (
          <div className={styles.description()}>{description}</div>
        )}
      </div>
      {action}
    </div>
  )
}

EmptyState.displayName = "EmptyState"
