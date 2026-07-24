/**
 * Form types and utilities for TanStack Form
 */

/**
 * A permissive FieldApi type that accepts any field from any form.
 * Use this for reusable field components that should work with any form structure.
 *
 * This type extracts only the properties used by field components,
 * avoiding variance issues with generic parameters.
 */
type BivariantChangeHandler = {
  bivarianceHack(value: unknown): void
}["bivarianceHack"]

export type AnyFieldApiCompat = {
  name: string
  state: {
    value: unknown
    meta: {
      isTouched: boolean
      isBlurred: boolean
      isDirty: boolean
      isValidating: boolean
      errors: readonly unknown[]
      errorMap: Record<string, unknown>
    }
  }
  handleChange: BivariantChangeHandler
  handleBlur: () => void
}
