/**
 * Minimal field capabilities consumed by reusable form controls.
 *
 * `TValue` describes values the control can render. `TDirectChange` describes
 * direct values it emits; TanStack's broader `Updater<T>` handler satisfies
 * this capability structurally when the field accepts those values.
 */
export interface FieldApiCompat<TValue, TDirectChange = TValue> {
  name: string
  state: {
    value: TValue
    meta: {
      errors: readonly unknown[]
      isBlurred: boolean
      isDirty: boolean
      isTouched: boolean
      isValidating: boolean
    }
  }
  handleBlur: () => void
  handleChange: (value: TDirectChange) => void
}
