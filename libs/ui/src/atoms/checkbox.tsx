/**
 * Checkbox — @techsio/ui-kit atom.
 *
 * @component Checkbox
 * @componentVersion v1.2.0
 * @skill checkbox-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the checkbox-usage skill's component_version and a changelog entry. Bump all three together.
 */
import {
  type ComponentPropsWithRef,
  type InputHTMLAttributes,
  type Ref,
  useLayoutEffect,
  useRef,
} from "react"
import { tv } from "../utils"

/** @internal Keep React responsible for native restoration after rejected proposals. */
export function getControlledChoiceInputProps(
  props: ComponentPropsWithRef<"input">,
  checked: boolean,
  indeterminate?: boolean
): ComponentPropsWithRef<"input"> {
  const { defaultChecked: _defaultChecked, ...inputProps } = props
  return {
    ...inputProps,
    checked,
    onChange(event) {
      // Native activation clears the mixed property even when checked is refused.
      if (indeterminate !== undefined) {
        event.currentTarget.indeterminate = indeterminate
      }
      props.onChange?.(event)
    },
  }
}

/** @internal Form association and deferred reset shared by choice controls. */
export function trackChoiceFormControl(
  root: HTMLElement | null,
  onReset: () => void,
  onDisabled: (disabled: boolean) => void
) {
  if (!root) {
    return
  }
  let owner: HTMLFormElement | null = null
  let active = true
  const reset = (event: Event) => {
    // Reset listeners run before the native default action and before later
    // listeners can cancel it. Never activate an input to synchronize a reset.
    queueMicrotask(() => {
      if (active && !event.defaultPrevented) {
        onReset()
      }
    })
  }
  const updateOwner = () => {
    const form = root.querySelector<HTMLInputElement>("input")?.form ?? null
    if (owner === form) {
      return
    }
    owner?.removeEventListener("reset", reset)
    owner = form
    owner?.addEventListener("reset", reset)
  }
  updateOwner()
  const observer = new MutationObserver(updateOwner)
  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["form"],
  })
  const fieldset = root.closest("fieldset")
  const disabledObserver = new MutationObserver(() =>
    onDisabled(!!fieldset?.disabled)
  )
  if (fieldset) {
    onDisabled(fieldset.disabled)
    disabledObserver.observe(fieldset, {
      attributes: true,
      attributeFilter: ["disabled"],
    })
  }
  return () => {
    active = false
    owner?.removeEventListener("reset", reset)
    observer.disconnect()
    disabledObserver.disconnect()
  }
}

/** @internal Recover focus, not selection, when a focused choice is invalidated. */
export function useChoiceFocusRecovery(selector = 'input[type="radio"]') {
  const rootRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) {
      return
    }
    const doc = root.ownerDocument
    let focused: HTMLElement | null = null
    let previous: HTMLElement[] = []
    const inputs = () =>
      Array.from(root.querySelectorAll<HTMLElement>(selector))
    const isEnabled = (input: HTMLElement) =>
      !input.matches(
        ":disabled, [aria-disabled=true], [data-disabled]:not([data-disabled=false])"
      )
    const recordFocus = () => {
      const current = inputs()
      focused = current.find((input) => input === doc.activeElement) ?? null
      previous = current
    }
    recordFocus()
    doc.addEventListener("focusin", recordFocus)
    const observer = new MutationObserver(() => {
      if (!focused) {
        return
      }
      if (focused.isConnected && isEnabled(focused)) {
        previous = inputs()
        return
      }
      if (doc.activeElement !== doc.body && doc.activeElement !== focused) {
        focused = null
        return
      }
      const current = inputs()
      const enabled = current.filter(isEnabled)
      const index = previous.indexOf(focused)
      const next =
        previous.slice(index + 1).find((input) => enabled.includes(input)) ??
        previous
          .slice(0, index)
          .reverse()
          .find((input) => enabled.includes(input)) ??
        enabled[Math.min(index, enabled.length - 1)]
      focused = null
      const target = next ?? root
      target.focus({ preventScroll: true })
    })
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled", "aria-disabled", "data-disabled"],
    })
    return () => {
      doc.removeEventListener("focusin", recordFocus)
      observer.disconnect()
    }
  }, [selector])
  return rootRef
}

const checkboxVariants = tv({
  base: [
    "form-control-readonly relative shrink-0 cursor-pointer appearance-none",
    "data-readonly:checked:text-checkbox-fg-readonly",
    "data-readonly:indeterminate:after:bg-checkbox-fg-readonly",
    "border-(length:--border-width-checkbox) rounded-checkbox-control border-checkbox-border-base",
    "bg-checkbox-bg-base",
    "after:-translate-1/2 after:absolute after:top-1/2 after:left-1/2",
    "checked:bg-checkbox-bg-checked",
    "checked:border-checkbox-border-checked",
    "checked:not-indeterminate:after:token-icon-checkbox",
    "checked:text-checkbox-fg-checked",
    "indeterminate:bg-checkbox-bg-indeterminate",
    "indeterminate:border-checkbox-border-indeterminate",
    "indeterminate:after:w-checkbox-indeterminate-icon",
    "indeterminate:after:h-checkbox-indeterminate-stroke",
    "indeterminate:after:rounded-full",
    "indeterminate:after:bg-checkbox-fg-indeterminate",
    "disabled:cursor-not-allowed",
    "disabled:bg-checkbox-bg-disabled",
    "disabled:text-checkbox-fg-disabled",
    "disabled:border-checkbox-border-disabled",
    "disabled:checked:bg-checkbox-bg-disabled",
    "disabled:checked:text-checkbox-fg-disabled",
    "disabled:checked:border-checkbox-border-disabled",
    "disabled:indeterminate:bg-checkbox-bg-disabled",
    "disabled:indeterminate:border-checkbox-border-disabled",
    "disabled:indeterminate:after:bg-checkbox-fg-disabled",
    "transition duration-200 motion-reduce:transition-none",
    "focus-visible:checkbox-focus-outline",
    "data-invalid:border-(length:--border-width-validation)",
    "data-invalid:border-checkbox-border-error",
  ],
  variants: {
    size: {
      sm: "size-form-checkbox-control-sm",
      md: "size-form-checkbox-control-md",
      lg: "size-form-checkbox-control-lg",
    },
  },
  defaultVariants: { size: "md" },
})

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size"
> & {
  size?: "sm" | "md" | "lg"
  ref?: Ref<HTMLInputElement>
  indeterminate?: boolean
  invalid?: boolean
}

export function Checkbox({
  className,
  size = "md",
  indeterminate,
  invalid,
  ref,
  readOnly = false,
  onClick,
  onChange,
  onKeyDown,
  ...props
}: CheckboxProps) {
  const setIndeterminate = (node: HTMLInputElement | null) => {
    if (node) {
      node.indeterminate = indeterminate ?? false
    }
    if (typeof ref === "function") {
      return ref(node)
    }
    if (ref) {
      ref.current = node
    }
  }

  return (
    <input
      aria-invalid={invalid || undefined}
      className={checkboxVariants({ size, className })}
      data-invalid={invalid || undefined}
      ref={setIndeterminate}
      type="checkbox"
      {...props}
      aria-readonly={(readOnly && !props.disabled) || undefined}
      data-readonly={readOnly && !props.disabled ? "" : undefined}
      onChange={(event) => {
        if (!(readOnly || props.disabled)) {
          onChange?.(event)
          event.currentTarget.indeterminate = indeterminate ?? false
        }
      }}
      onClick={(event) => {
        if (readOnly) {
          event.preventDefault()
          return
        }
        onClick?.(event)
      }}
      onKeyDown={(event) => {
        if (readOnly && event.key === " ") {
          event.preventDefault()
          return
        }
        onKeyDown?.(event)
      }}
      readOnly={readOnly}
    />
  )
}

Checkbox.displayName = "Checkbox"
