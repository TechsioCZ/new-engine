// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3100-5255
// source=https://github.com/TechsioCZ/new-engine/blob/master/libs/ui/src/organisms/sidebar.tsx
// component=Sidebar

import figma from "figma"

// Sidebar.Desktop: the persistent panel, expanded or collapsed to icons.
const instance = figma.selectedInstance
const side = instance.getEnum("side", { start: "start", end: "end" })
// Only the non-default direction is rendered.
const dir = instance.getEnum("dir", { ltr: undefined, rtl: "rtl" })
const collapsible = instance.getEnum("collapsible", {
  icon: "icon",
  offcanvas: "offcanvas",
  none: "none",
})
const expanded = instance.getEnum("expanded", { true: true, false: false })
const showRail = instance.getBoolean("showRail")

// Defaults are icon-collapsible and expanded on both sides, so only the
// differences are rendered.
const rootProps = figma.code`${
  collapsible === "icon"
    ? ""
    : figma.code` collapsible={{ ${side}: "${collapsible}" }}`
}${expanded ? "" : " defaultExpanded={[]}"}${figma.helpers.react.renderProp("dir", dir)}`

export default {
  id: "Sidebar",
  imports: [
    'import { LinkButton } from "@techsio/ui-kit/atoms/link-button"',
    'import { Sidebar } from "@techsio/ui-kit/organisms/sidebar"',
  ],
  example: figma.code`<Sidebar${rootProps}>
  <Sidebar.Panel aria-label="Primary navigation"${figma.helpers.react.renderProp(
    "side",
    side === "start" ? undefined : side
  )}>
    <Sidebar.Header>
      <div className="flex items-center gap-100">
        <LinkButton aria-label="Commerce workspace" block className="min-w-0 flex-1" href="#workspace" icon="icon-[mdi--storefront-outline]" size="sm" theme="unstyled" variant="secondary">
          <Sidebar.Label>Commerce</Sidebar.Label>
        </LinkButton>
      </div>
    </Sidebar.Header>
    <Sidebar.Content>
      <Sidebar.Group>
        <Sidebar.Expanded>
          <Sidebar.GroupLabel>Workspace</Sidebar.GroupLabel>
        </Sidebar.Expanded>
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            <Sidebar.Item>
              <LinkButton aria-current="page" aria-label="Overview" block href="#overview" icon="icon-[mdi--view-dashboard-outline]" size="sm" theme="light" variant="secondary">
                <Sidebar.Label>Overview</Sidebar.Label>
              </LinkButton>
            </Sidebar.Item>
          </Sidebar.Menu>
        </Sidebar.GroupContent>
      </Sidebar.Group>
    </Sidebar.Content>
    <Sidebar.Footer>
      <LinkButton aria-label="Account settings" block href="#settings" icon="icon-[mdi--cog-outline]" size="sm" theme="unstyled" variant="secondary">
        <Sidebar.Label>Settings</Sidebar.Label>
      </LinkButton>
    </Sidebar.Footer>
    ${showRail ? figma.code`<Sidebar.Rail aria-label="Toggle navigation" />` : ""}
  </Sidebar.Panel>
  <Sidebar.Inset>
    <Sidebar.Trigger aria-label="Toggle navigation"${figma.helpers.react.renderProp(
      "side",
      side === "start" ? undefined : side
    )} tooltip="Toggle navigation" />
  </Sidebar.Inset>
</Sidebar>`,
  metadata: { nestable: false },
}
