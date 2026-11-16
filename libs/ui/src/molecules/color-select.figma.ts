// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-31312
// source=https://github.com/TechsioCZ/new-engine/blob/master/libs/ui/src/molecules/color-select.tsx
// component=ColorSelect

import figma from "figma"

// Figma models one swatch ("ColorSwatch"); the code renders a group of them
// from `colors`, so the swatch maps to a one-item ColorSelect.
const instance = figma.selectedInstance
const size = instance.getEnum("size", { sm: "sm", md: "md", lg: "lg" })
const radius = instance.getEnum("radius", {
  sm: "sm",
  md: "md",
  lg: "lg",
  full: "full",
})
const state = instance.getEnum("state", {
  default: "default",
  hover: "default",
  focus: "default",
  selected: "selected",
  disabled: "disabled",
})
const itemFlags = {
  default: "",
  selected: ", selected: true",
  disabled: ", disabled: true",
}
const item = `{ color: "#1d4ed8", label: "Modrá"${itemFlags[state]} }`

export default {
  id: "ColorSelect",
  imports: [
    'import { ColorSelect } from "@techsio/ui-kit/molecules/color-select"',
  ],
  example: figma.code`<ColorSelect
  colors={[${item}]}${figma.helpers.react.renderProp("size", size)}${figma.helpers.react.renderProp(
    "radius",
    radius
  )}
  onColorClick={(color) => console.log(color)}
/>`,
  metadata: { nestable: true },
}
