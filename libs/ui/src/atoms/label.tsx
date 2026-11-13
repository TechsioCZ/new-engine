/**
 * Label — @techsio/ui-kit atom.
 *
 * @component Label
 * @componentVersion v1.3.0
 * @skill label-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the label-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { ComponentPropsWithRef, ReactNode } from "react"
import type { VariantProps } from "tailwind-variants"
import { RequiredLabelText } from "../internal/required-label-text"
import { useUIDefaults } from "../theme/ui-provider"
import { tv } from "../utils"

const labelVariants = tv({
  base: ["block", "text-label-fg", "font-label"],
  variants: {
    size: {
      sm: "text-label-sm",
      md: "text-label-md",
      lg: "text-label-lg",
      current: "",
    },
    disabled: {
      true: "text-label-fg-disabled",
    },
  },
  defaultVariants: {
    size: "current",
    disabled: false,
  },
})

export type LabelProps = ComponentPropsWithRef<"label"> &
  VariantProps<typeof labelVariants> & {
    required?: boolean
    /** Screen-reader text announced after the label when required; "" omits it. Defaults to the UiMessagesProvider catalog's `label.required` ("(required)" in English). */
    requiredLabel?: string
    children: ReactNode
    className?: string
  }

export function Label({
  size: sizeProp,
  disabled,
  required,
  requiredLabel,
  children,
  className,
  ...props
}: LabelProps) {
  const { size } = useUIDefaults("Label", { size: sizeProp }, labelVariants)
  return (
    <label
      className={labelVariants({
        size,
        disabled,
        className,
      })}
      {...props}
      htmlFor={props.htmlFor}
    >
      {children}
      {required && (
        <>
          <span
            aria-hidden="true"
            className="ms-label-required text-label-fg-required"
          >
            *
          </span>
          {requiredLabel === undefined ? (
            <RequiredLabelText />
          ) : (
            requiredLabel && (
              <span className="sr-only">{` ${requiredLabel}`}</span>
            )
          )}
        </>
      )}
    </label>
  )
}
