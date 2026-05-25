import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Switch } from "@techsio/ui-kit/molecules/switch"
import { useAdminTheme } from "../hooks/use-admin-theme"

export function AdminThemeToggle() {
  const { resolvedTheme, setPreference } = useAdminTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <Switch
      checked={isDark}
      onCheckedChange={(checked) => {
        setPreference(checked ? "dark" : "light")
      }}
    >
      <span className="flex items-center gap-2">
        <Icon
          className="text-fg-tertiary"
          icon={isDark ? "token-icon-theme-dark" : "token-icon-theme-light"}
          size="sm"
        />
      </span>
    </Switch>
  )
}
