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
    group: "flex flex-col gap-100",
    modeGroup: "mt-150 flex flex-col gap-100",
    label: "text-sm",
    row: "flex gap-50",
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
  const showModes = availableModes.length > 1
  const { root, group, modeGroup, label, row } = themeToggle()

  return (
    <div className={root({ className })}>
      <div className={group()}>
        <span className={label()}>Brand</span>
        <div className={row()}>
          {brands.map((key) => (
            <Button
              key={key}
              onClick={() => setBrand(key)}
              size="sm"
              theme={mounted && key === brand ? "solid" : "outlined"}
              variant="primary"
            >
              {getBrand(key).label}
            </Button>
          ))}
        </div>
      </div>

      {showModes && (
        <div className={modeGroup()}>
          <span className={label()}>Mode</span>
          <div className={row()}>
            {availableModes.map((value) => (
              <Button
                key={value}
                onClick={() => setMode(value)}
                size="sm"
                theme={mounted && value === mode ? "solid" : "outlined"}
                variant="secondary"
              >
                {MODE_LABELS[value]}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
