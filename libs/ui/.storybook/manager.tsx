/*
 * Custom "Mode" toolbar.
 *
 * Storybook's `globalTypes` toolbar items are static config — they are read
 * once at load time and cannot react to the value of another global. We need
 * exactly that: a light-only brand (see theme-config THEMES) must not offer
 * Dark/System, otherwise the control is present but inert.
 *
 * So the Mode axis is rendered here instead of via `globalTypes.toolbar`,
 * reading `brand` from globals and deriving the allowed settings from the
 * same `availableModeSettings()` the app and the preview decorator use. The
 * registry stays the single source of truth.
 */
import {
  IconButton,
  TooltipLinkList,
  WithTooltip,
} from "storybook/internal/components"
import { addons, types, useGlobals } from "storybook/manager-api"
import {
  availableModeSettings,
  type BrandKey,
  DEFAULT_BRAND,
  isBrandKey,
  type ModeSetting,
} from "../src/theme/theme-config"

const MODE_LABELS: Record<ModeSetting, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
}

const ALL_MODES: ModeSetting[] = ["light", "dark", "system"]

function ModeToolbar() {
  const [globals, updateGlobals] = useGlobals()

  const rawBrand = globals.brand as string | undefined
  const brand: BrandKey =
    rawBrand && isBrandKey(rawBrand) ? rawBrand : DEFAULT_BRAND
  const allowed = availableModeSettings(brand)
  const active = (globals.mode as ModeSetting) ?? "light"

  // A brand with a single mode has nothing to choose — render the toolbar as
  // a disabled indicator rather than a dropdown that cannot change anything.
  const onlyMode = allowed.length === 1 ? allowed[0] : undefined

  if (onlyMode) {
    return (
      <IconButton
        disabled
        title={`${MODE_LABELS[onlyMode]} — this brand ships no dark variant`}
      >
        {MODE_LABELS[onlyMode]}
      </IconButton>
    )
  }

  return (
    <WithTooltip
      closeOnOutsideClick
      placement="top"
      tooltip={({ onHide }) => (
        <TooltipLinkList
          links={ALL_MODES.map((mode) => ({
            id: mode,
            title: MODE_LABELS[mode],
            active: mode === active,
            // Keep unsupported modes visible but non-selectable, so it is
            // obvious the brand is the reason rather than the option missing.
            disabled: !allowed.includes(mode),
            onClick: () => {
              if (!allowed.includes(mode)) {
                return
              }
              updateGlobals({ mode })
              onHide()
            },
          }))}
        />
      )}
    >
      <IconButton title="Color mode">{MODE_LABELS[active]}</IconButton>
    </WithTooltip>
  )
}

addons.register("techsio/mode-toolbar", () => {
  addons.add("techsio/mode-toolbar", {
    type: types.TOOL,
    title: "Mode",
    // Storybook renders TOOLs on every view; restrict to story/docs canvases.
    match: ({ tabId, viewMode }) =>
      !tabId && (viewMode === "story" || viewMode === "docs"),
    render: () => <ModeToolbar />,
  })
})
