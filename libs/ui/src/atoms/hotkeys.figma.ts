// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3320-2
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/atoms/hotkeys.tsx
// component=Hotkeys

import figma from "figma"

const type = figma.selectedInstance.getEnum("type", {
  single: "single",
  compound: "compound",
})
const platform = figma.selectedInstance.getEnum("platform", {
  auto: "auto",
  mac: "mac",
  windows: "windows",
  linux: "linux",
  custom: "custom",
})

function singleExample() {
  const displayHotkey = figma.selectedInstance.getString("Hotkey")
  // The Figma property is the rendered keycap label; the component API uses
  // Zag's canonical `mod+...` syntax.
  const hotkey =
    displayHotkey === "Ctrl K" || displayHotkey === "⌘ K"
      ? "mod+K"
      : displayHotkey
  const formatOptions =
    platform === "auto" || platform === "custom" ? undefined : { platform }

  return figma.code`<Hotkeys${figma.helpers.react.renderProp(
    "formatOptions",
    formatOptions
  )}${figma.helpers.react.renderProp("hotkey", hotkey)} />`
}

function compoundExample() {
  const firstKey = figma.selectedInstance.getString("First key")
  const secondKey = figma.selectedInstance.getString("Second key")

  return figma.code`<Hotkeys.Root>
        <Hotkeys.Key>${firstKey}</Hotkeys.Key>
        <Hotkeys.Separator />
        <Hotkeys.Key>${secondKey}</Hotkeys.Key>
      </Hotkeys.Root>`
}

export default {
  id: "Hotkeys",
  imports: ['import { Hotkeys } from "@techsio/ui-kit/atoms/hotkeys"'],
  example: type === "compound" ? compoundExample() : singleExample(),
  metadata: { nestable: true },
}
