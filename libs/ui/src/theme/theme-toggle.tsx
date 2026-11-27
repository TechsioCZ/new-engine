"use client"

/*
 * Reference theme toggler: a Brand selector + a Mode selector built from the
 * brands given to AppThemeProvider. Each group is hidden when it offers no
 * choice: a single brand, or a brand that supports only one mode.
 * Apps can use this directly or build their own UI on top of useAppTheme().
 */

import { Button } from "../atoms/button"
import { useUiMessages } from "../messages/ui-messages-provider"
import { tv } from "../utils"
import type { ModeSetting } from "./theme-config"
import { useAppTheme } from "./theme-provider"

const themeToggle = tv({
  slots: {
    root: "",
    group: "flex min-w-0 flex-col gap-theme-toggle-group",
    modeGroup:
      "mt-theme-toggle-mode flex min-w-0 flex-col gap-theme-toggle-group",
    label: "text-theme-toggle-label-size",
    row: "flex flex-wrap gap-theme-toggle-choice",
    choice:
      "h-auto min-h-form-control-sm min-w-0 whitespace-normal break-words",
  },
})

export function ThemeToggle({ className }: { className?: string }) {
  const { brand, brands, setBrand, mode, setMode, availableModes, mounted } =
    useAppTheme()
  const messages = useUiMessages()
  const modeLabels: Record<ModeSetting, string> = {
    light: messages.themeToggle.light,
    dark: messages.themeToggle.dark,
    system: messages.themeToggle.system,
  }
  const showBrands = brands.length > 1
  const showModes = mounted && availableModes.length > 1
  const { root, group, modeGroup, label, row, choice } = themeToggle()

  return (
    <div className={root({ className })}>
      {showBrands && (
        <fieldset className={group()}>
          <legend className={label()}>{messages.themeToggle.brand}</legend>
          <div className={row()}>
            {brands.map((entry) => (
              <Button
                appearance={
                  mounted && entry.key === brand.key ? "solid" : "outline"
                }
                aria-pressed={mounted && entry.key === brand.key}
                className={choice()}
                key={entry.key}
                onClick={() => setBrand(entry.key)}
                severity="primary"
                size="sm"
                type="button"
              >
                {entry.label}
              </Button>
            ))}
          </div>
        </fieldset>
      )}

      {showModes && (
        <fieldset className={modeGroup()}>
          <legend className={label()}>{messages.themeToggle.mode}</legend>
          <div className={row()}>
            {availableModes.map((value) => (
              <Button
                appearance={mounted && value === mode ? "solid" : "outline"}
                aria-pressed={mounted && value === mode}
                className={choice()}
                key={value}
                onClick={() => setMode(value)}
                severity="secondary"
                size="sm"
                type="button"
              >
                {modeLabels[value]}
              </Button>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  )
}
