"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Switch } from "@techsio/ui-kit/molecules/switch"
import { getBrand } from "@techsio/ui-kit/theme/theme-config"
import { useTheme } from "@/hooks/use-theme"

export function ThemeToggle() {
  const {
    theme,
    toggleTheme,
    mounted,
    brand,
    setBrand,
    brands,
    canToggleMode,
  } = useTheme()

  const isDark = theme === "dark"

  return (
    <div className="flex items-center gap-theme-toggle-gap">
      {/* Brand selector */}
      <div className="flex items-center gap-50">
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

      {/* Mode switch (hidden for light-only brands) */}
      {canToggleMode && (
        <div className="flex items-center gap-theme-toggle-icon-gap">
          <Icon
            className="text-theme-toggle-icon-size text-theme-toggle-sun-inactive transition-colors data-[active]:text-theme-toggle-sun-active"
            data-active={mounted && isDark ? undefined : ""}
            icon="token-icon-sun"
          />
          <Switch
            checked={mounted ? isDark : false}
            className="w-theme-toggle-width"
            onCheckedChange={toggleTheme}
          >
            <span className="sr-only">Přepnout tmavý režim</span>
          </Switch>
          <Icon
            className="text-theme-toggle-icon-size text-theme-toggle-moon-inactive transition-colors data-[active]:text-theme-toggle-moon-active"
            data-active={mounted && isDark ? "" : undefined}
            icon="token-icon-moon"
          />
        </div>
      )}
    </div>
  )
}
