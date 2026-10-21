/**
 * FormErrorSummary — @techsio/ui-kit molecule.
 *
 * @component FormErrorSummary
 * @componentVersion v1.2.0
 * @skill form-error-summary-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the form-error-summary-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { type Ref, useId } from "react"
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
  revealField?: (targetId: string) => void | Promise<void>
  className?: string
  ref?: Ref<HTMLDivElement>
}

const formErrorSummaryVariants = tv({
  slots: {
    root: [
      "wrap-anywhere flex min-w-0 flex-col gap-100",
      "rounded-form-control",
      "border-(length:--border-width-validation)",
      "border-form-error-summary-border",
      "bg-form-error-summary-bg",
      "p-300",
      "focus-visible:form-error-summary-focus-ring",
    ],
    title: ["text-label-md", "font-medium", "text-form-error-summary-fg"],
    list: ["m-0", "flex list-none flex-col gap-100 p-0"],
    link: [
      "wrap-anywhere text-form-error-summary-fg",
      "underline",
      "underline-offset-4",
      "focus-visible:form-error-summary-focus-ring",
    ],
  },
})

export function FormErrorSummary({
  title = "There is a problem",
  errors,
  onFieldFocus,
  revealField,
  className,
  ref,
}: FormErrorSummaryProps) {
  const titleId = useId()
  if (errors.length === 0) {
    return null
  }

  const styles = formErrorSummaryVariants()

  return (
    <div
      aria-labelledby={titleId}
      className={styles.root({ className })}
      ref={ref}
      role="alert"
      tabIndex={-1}
    >
      <h2 className={styles.title()} id={titleId}>
        {title}
      </h2>
      <ul className={styles.list()}>
        {errors.map((error) => (
          <li key={error.id}>
            <a
              className={styles.link()}
              href={`#${error.targetId}`}
              onClick={async (event) => {
                const document = event.currentTarget.ownerDocument
                if (!(revealField || document.getElementById(error.targetId))) {
                  return
                }
                event.preventDefault()
                // Custom reveal promises resolve after the field is mounted.
                try {
                  await revealField?.(error.targetId)
                } catch {
                  // The application owns reveal-error feedback; keep the link focused.
                  return
                }
                const target = document.getElementById(error.targetId)
                if (!target) {
                  return
                }
                for (
                  let ancestor = target.parentElement;
                  ancestor;
                  ancestor = ancestor.parentElement
                ) {
                  if (ancestor instanceof HTMLDetailsElement) {
                    ancestor.open = true
                  }
                }
                target.focus()
                target.scrollIntoView({ block: "nearest" })
                if (document.activeElement === target) {
                  onFieldFocus?.(error.targetId)
                }
              }}
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
