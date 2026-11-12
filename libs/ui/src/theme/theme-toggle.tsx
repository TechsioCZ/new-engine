"use client"

/*
 * Reference theme toggler: a Brand selector + a Mode selector built from the
 * theme registry. The Mode group is hidden when the active brand is light-only.
 * Apps can use this directly or build their own UI on top of useAppTheme().
 */

import { Button } from "../atoms/button"
import { useUiMessages } from "../messages/ui-messages-provider"
import { tv } from "../utils"
import { getBrand, type ModeSetting } from "./theme-config"
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
  const showModes = mounted && availableModes.length > 1
  const { root, group, modeGroup, label, row, choice } = themeToggle()

  return (
    <div className={root({ className })}>
      <fieldset className={group()}>
        <legend className={label()}>{messages.themeToggle.brand}</legend>
        <div className={row()}>
          {brands.map((key) => (
            <Button
              aria-pressed={mounted && key === brand}
              className={choice()}
              key={key}
              onClick={() => setBrand(key)}
              size="sm"
              theme={mounted && key === brand ? "solid" : "outlined"}
              type="button"
              variant="primary"
            >
              {getBrand(key).label}
            </Button>
          ))}
        </div>
      </fieldset>

      {showModes && (
        <fieldset className={modeGroup()}>
          <legend className={label()}>{messages.themeToggle.mode}</legend>
          <div className={row()}>
            {availableModes.map((value) => (
              <Button
                aria-pressed={mounted && value === mode}
                className={choice()}
                key={value}
                onClick={() => setMode(value)}
                size="sm"
                theme={mounted && value === mode ? "solid" : "outlined"}
                type="button"
                variant="secondary"
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
