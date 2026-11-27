/**
 * NavigationProgress — @techsio/ui-kit atom.
 *
 * @component NavigationProgress
 * @componentVersion v1.0.0
 * @skill navigation-progress-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the navigation-progress-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { Ref } from "react"
import { tv } from "../utils"

const navigationProgressVariants = tv({
  slots: {
    root: [
      "pointer-events-none absolute inset-x-0 top-0 z-10 overflow-hidden",
      "h-navigation-progress",
      // Fast navigations finish before the bar shows.
      "animate-navigation-progress-reveal",
    ],
    indicator: [
      "absolute inset-y-0 start-0 w-navigation-progress-indicator",
      "bg-navigation-progress-indicator-bg",
      "animate-navigation-progress-slide",
      "motion-reduce:w-full",
    ],
  },
})

export type NavigationProgressProps = {
  /** Names the work in progress, in the consumer's words ("Loading page"). */
  "aria-label": string
  className?: string
  ref?: Ref<HTMLDivElement>
}

/**
 * Indeterminate bar across the top of its positioned container, shown while a
 * navigation is pending. Mount it only while pending; it stays invisible for
 * the first 150 ms.
 */
export function NavigationProgress({
  "aria-label": ariaLabel,
  className,
  ref,
}: NavigationProgressProps) {
  const styles = navigationProgressVariants()

  return (
    <div
      aria-busy="true"
      aria-label={ariaLabel}
      className={styles.root({ className })}
      ref={ref}
      role="progressbar"
    >
      <span aria-hidden="true" className={styles.indicator()} />
    </div>
  )
}
