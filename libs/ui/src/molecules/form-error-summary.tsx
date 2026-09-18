/**
 * FormErrorSummary — @techsio/ui-kit molecule.
 *
 * @component FormErrorSummary
 * @componentVersion v1.0.0
 * @skill form-error-summary-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the form-error-summary-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { Ref } from "react"
import { tv } from "../utils"

export type FormErrorSummaryError = {
  id: string
  label: string
  targetId: string
}

export type FormErrorSummaryProps = {
  title?: string
  errors: FormErrorSummaryError[]
  onFieldFocus?: (targetId: string) => void
  className?: string
  ref?: Ref<HTMLDivElement>
}

const formErrorSummaryVariants = tv({
  slots: {
    root: [
      "flex flex-col gap-100",
      "rounded-form-control",
      "border-(length:--border-width-validation)",
      "border-form-error-summary-border",
      "bg-form-error-summary-bg",
      "p-300",
    ],
    title: ["text-label-md", "font-medium", "text-form-error-summary-fg"],
    list: ["m-0", "flex list-none flex-col gap-100 p-0"],
    link: [
      "text-form-error-summary-fg",
      "underline",
      "underline-offset-4",
      "focus-visible:outline-(style:--default-ring-style)",
      "focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-form-error-summary-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
    ],
  },
})

export function FormErrorSummary({
  title = "There is a problem",
  errors,
  onFieldFocus,
  className,
  ref,
}: FormErrorSummaryProps) {
  if (errors.length === 0) {
    return null
  }

  const styles = formErrorSummaryVariants()

  return (
    <div className={styles.root({ className })} ref={ref} role="alert">
      <h2 className={styles.title()}>{title}</h2>
      <ul className={styles.list()}>
        {errors.map((error) => (
          <li key={error.id}>
            <a
              className={styles.link()}
              href={`#${error.targetId}`}
              onClick={() => onFieldFocus?.(error.targetId)}
            >
              {error.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

FormErrorSummary.displayName = "FormErrorSummary"
