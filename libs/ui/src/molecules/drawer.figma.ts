// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3032-297
// source=https://github.com/TechsioCZ/new-engine/blob/master/libs/ui/src/molecules/drawer.tsx
// component=Drawer

import figma from "figma"

// Drawer.Side: a drawer entering from the start or end edge.
const instance = figma.selectedInstance
const placement = instance.getEnum("placement", { end: "end", start: "start" })
const size = instance.getEnum("size", {
  xs: "xs",
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "xl",
  full: "full",
})
// Only the non-default direction is rendered.
const dir = instance.getEnum("dir", { ltr: undefined, rtl: "rtl" })
const open = instance.getBoolean("open")
const backdrop = instance.getBoolean("backdrop")
const showHeader = instance.getBoolean("showHeader")
const showBody = instance.getBoolean("showBody")
const showFooter = instance.getBoolean("showFooter")
const showGrabber = instance.getBoolean("showGrabber")

function text(name, path) {
  const layer = instance.findText(name, { traverseInstances: true, path })
  return layer.type === "TEXT" ? layer.textContent : undefined
}

const title = text("children", ["Title"])
const description = text("children", ["Description"])
const body = text("children", ["Body", "children"])
const closeLabel = text("Label", ["CloseTrigger"])

export default {
  id: "Drawer",
  imports: ['import { Drawer } from "@techsio/ui-kit/molecules/drawer"'],
  example: figma.code`<Drawer${figma.helpers.react.renderProp(
    "defaultOpen",
    open || undefined
  )}${figma.helpers.react.renderProp("dir", dir)}${figma.helpers.react.renderProp(
    "placement",
    placement
  )}${figma.helpers.react.renderProp("size", size)}>
  <Drawer.Trigger>Open drawer</Drawer.Trigger>
  <Drawer.Portal>
    ${backdrop ? figma.code`<Drawer.Backdrop />` : ""}
    <Drawer.Positioner>
      <Drawer.Content${
        // Without the header there is no Drawer.Title, so name the dialog here.
        showHeader ? "" : figma.helpers.react.renderProp("aria-label", title ?? "Drawer")
      }>
        ${
          showGrabber
            ? figma.code`<Drawer.Grabber>
          <Drawer.GrabberIndicator />
        </Drawer.Grabber>`
            : ""
        }
        ${
          showHeader
            ? figma.code`<Drawer.Header>
          <Drawer.Title>${figma.helpers.react.renderChildren(title)}</Drawer.Title>
          <Drawer.Description>${figma.helpers.react.renderChildren(
            description
          )}</Drawer.Description>
        </Drawer.Header>`
            : ""
        }
        ${showBody ? figma.code`<Drawer.Body>${figma.helpers.react.renderChildren(body)}</Drawer.Body>` : ""}
        ${
          showFooter
            ? figma.code`<Drawer.Footer>
          <Drawer.CloseTrigger theme="outlined" variant="secondary">${figma.helpers.react.renderChildren(
            closeLabel
          )}</Drawer.CloseTrigger>
        </Drawer.Footer>`
            : ""
        }
      </Drawer.Content>
    </Drawer.Positioner>
  </Drawer.Portal>
</Drawer>`,
  metadata: { nestable: false },
}
