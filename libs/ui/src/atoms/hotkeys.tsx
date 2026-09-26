/**
 * Hotkeys — @techsio/ui-kit atom.
 *
 * @component Hotkeys
 * @componentVersion v1.0.1
 * @skill hotkeys-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 */
import type { ComponentPropsWithoutRef, Ref } from "react"
import { type HotkeyFormatOptions, useFormatHotkey } from "../hotkeys"
import { tv } from "../utils"

const hotkeysStyles = tv({
  slots: {
    root: "inline-flex items-center gap-hotkeys whitespace-nowrap font-hotkeys text-hotkeys-sm",
    key: "hotkeys-key-border-width inline-flex items-center justify-center rounded-hotkeys-key border-hotkeys-key-border bg-hotkeys-key-bg px-hotkeys-key-x py-hotkeys-key-y text-hotkeys-key-fg",
    separator: "text-hotkeys-separator-fg",
  },
})

export type HotkeysProps = ComponentPropsWithoutRef<"span"> & {
  hotkey?: string
  formatOptions?: HotkeyFormatOptions
  ref?: Ref<HTMLSpanElement>
}

export function Hotkeys({
  hotkey,
  formatOptions,
  children,
  className,
  ref,
  ...props
}: HotkeysProps) {
  const format = useFormatHotkey()
  return (
    <span
      {...props}
      className={hotkeysStyles().root({ className })}
      data-part="root"
      data-scope="hotkeys"
      ref={ref}
    >
      {children ??
        (hotkey !== undefined ? (
          <Hotkeys.Key>{format(hotkey, formatOptions)}</Hotkeys.Key>
        ) : null)}
    </span>
  )
}

export type HotkeysKeyProps = ComponentPropsWithoutRef<"kbd"> & {
  ref?: Ref<HTMLElement>
}

Hotkeys.Key = function HotkeysKey({
  className,
  ref,
  ...props
}: HotkeysKeyProps) {
  return (
    <kbd
      {...props}
      className={hotkeysStyles().key({ className })}
      data-part="key"
      data-scope="hotkeys"
      ref={ref}
    />
  )
}

export type HotkeysSeparatorProps = ComponentPropsWithoutRef<"span"> & {
  ref?: Ref<HTMLSpanElement>
}

Hotkeys.Separator = function HotkeysSeparator({
  children = "+",
  className,
  ref,
  ...props
}: HotkeysSeparatorProps) {
  return (
    <span
      {...props}
      aria-hidden="true"
      className={hotkeysStyles().separator({ className })}
      data-part="separator"
      data-scope="hotkeys"
      ref={ref}
    >
      {children}
    </span>
  )
}

Hotkeys.Root = Hotkeys
Hotkeys.displayName = "Hotkeys"
