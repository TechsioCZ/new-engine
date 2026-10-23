"use client"

/*
 * Reference theme toggler: a Brand selector + a Mode selector built from the
 * theme registry. The Mode group is hidden when the active brand is light-only.
 * Apps can use this directly or build their own UI on top of useAppTheme().
 */

import { Button } from "../atoms/button"
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

const MODE_LABELS: Record<ModeSetting, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
}

export function ThemeToggle({ className }: { className?: string }) {
  const { brand, brands, setBrand, mode, setMode, availableModes, mounted } =
    useAppTheme()
  const showModes = mounted && availableModes.length > 1
  const { root, group, modeGroup, label, row, choice } = themeToggle()

  return (
    <div className={root({ className })}>
      <fieldset className={group()}>
        <legend className={label()}>Brand</legend>
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
          <legend className={label()}>Mode</legend>
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
                {MODE_LABELS[value]}
              </Button>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  )
}
