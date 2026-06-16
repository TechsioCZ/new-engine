"use client"

/*
 * Reference theme toggler: a Brand selector + a Mode selector built from the
 * theme registry. The Mode group is hidden when the active brand is light-only.
 * Apps can use this directly or build their own UI on top of useAppTheme().
 */

import { Button } from "../atoms/button"
import { getBrand, type ModeSetting } from "./theme-config"
import { useAppTheme } from "./theme-provider"

const MODE_LABELS: Record<ModeSetting, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
}

export function ThemeToggle({ className }: { className?: string }) {
  const { brand, brands, setBrand, mode, setMode, availableModes } =
    useAppTheme()
  const showModes = availableModes.length > 1

  return (
    <div className={className}>
      <div className="flex flex-col gap-100">
        <span className="text-fg-secondary text-sm">Brand</span>
        <div className="flex gap-50">
          {brands.map((key) => (
            <Button
              key={key}
              onClick={() => setBrand(key)}
              size="sm"
              theme={key === brand ? "solid" : "outlined"}
              variant="primary"
            >
              {getBrand(key).label}
            </Button>
          ))}
        </div>
      </div>

      {showModes && (
        <div className="mt-150 flex flex-col gap-100">
          <span className="text-fg-secondary text-sm">Mode</span>
          <div className="flex gap-50">
            {availableModes.map((value) => (
              <Button
                key={value}
                onClick={() => setMode(value)}
                size="sm"
                theme={value === mode ? "solid" : "outlined"}
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
