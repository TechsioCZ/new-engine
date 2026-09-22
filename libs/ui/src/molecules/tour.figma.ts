// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3270-87
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/molecules/tour.tsx
// component=Tour

import figma from "figma"

const instance = figma.selectedInstance
const type = instance.getEnum("type", {
  dialog: "dialog",
  tooltip: "tooltip",
  floating: "floating",
})
const dir = instance.getEnum("dir", { ltr: "ltr", rtl: "rtl" })
const title = instance.getString("title")
const description = instance.getString("description")
const progressText = instance.getString("progressText")
const showDescription = instance.getBoolean("showDescription")
const showProgress = instance.getBoolean("showProgress")
const showActions = instance.getBoolean("showActions")
const showClose = instance.getBoolean("showClose")
const showArrow = instance.getBoolean("showArrow")
const showSkip = instance.getBoolean("showSkip")
const showBack = instance.getBoolean("showBack")
const showNext = instance.getBoolean("showNext")

const buttonOpening = /<Button\b/
const actionIconOpening = /<ActionIcon\b/

// The compound triggers inherit the atom APIs, but do not support asChild.
// Adapt only the emitted atom tag; keep its dynamic props and child sections.
function actionTrigger(layerName, action) {
  const child = instance.findInstance(layerName)
  if (!child || child.type !== "INSTANCE") {
    return
  }
  return child.executeTemplate().example.map((section) => {
    if (section.type !== "CODE") {
      return section
    }
    return {
      ...section,
      code: section.code
        .replace(buttonOpening, `<Tour.ActionTrigger action={${action}}`)
        .replace("</Button>", "</Tour.ActionTrigger>"),
    }
  })
}

function closeTrigger() {
  const child = instance.findInstance("Close")
  if (!child || child.type !== "INSTANCE") {
    return
  }
  return child.executeTemplate().example.map((section) => {
    if (section.type !== "CODE") {
      return section
    }
    return {
      ...section,
      code: section.code
        .replace(actionIconOpening, "<Tour.CloseTrigger")
        .replace(' aria-label="Clear"', ' aria-label="Close tour"')
        .replace("</ActionIcon>", "</Tour.CloseTrigger>"),
    }
  })
}

const skip =
  showActions && showSkip ? actionTrigger("Skip", '"skip"') : undefined
const back =
  showActions && showBack ? actionTrigger("Back", '"prev"') : undefined
const next =
  showActions && showNext
    ? actionTrigger("Next", 'api.lastStep ? "dismiss" : "next"')
    : undefined
const close = showClose ? closeTrigger() : undefined

export default {
  id: "Tour",
  imports: [
    'import { Tour, type TourStep } from "@techsio/ui-kit/molecules/tour"',
  ],
  // Figma describes one step, not an application's workflow. The caller owns
  // stable step IDs, targets, placement, effects and the rest of the sequence.
  example: figma.code`function TourExample({ steps, stepId }: { steps: TourStep[]; stepId: string }) {
  // Include stepId in steps; tooltip steps must supply a real target callback.
  // Initial configuration only. Use Tour.Context to update a running tour.
  return (
    <Tour.Root${figma.helpers.react.renderProp("dir", dir)} steps={steps.map((step) => step.id === stepId ? {
      ...step,
      type: ${JSON.stringify(type)},
      title: ${JSON.stringify(title)},
      description: ${JSON.stringify(description)},
      arrow: ${type === "tooltip" && showArrow ? "true" : "false"},
    } : step)}>
      <Tour.Trigger stepId={stepId}>Start tour</Tour.Trigger>
      <Tour.Portal>
        <Tour.Backdrop />
        <Tour.Spotlight />
        <Tour.Positioner>
          ${type === "tooltip" && showArrow ? figma.code`<Tour.Arrow />` : ""}
          <Tour.Content>
            ${close}
            <Tour.Title />
            ${showDescription ? figma.code`<Tour.Description />` : ""}
            ${
              showProgress
                ? figma.code`<Tour.ProgressText>{${JSON.stringify(progressText)}}</Tour.ProgressText>`
                : ""
            }
            ${
              showActions
                ? figma.code`<Tour.Actions>
              ${skip}
              ${back}
              ${next ? figma.code`<Tour.Context>{(api) => (${next})}</Tour.Context>` : ""}
            </Tour.Actions>`
                : ""
            }
          </Tour.Content>
        </Tour.Positioner>
      </Tour.Portal>
    </Tour.Root>
  )
}`,
  metadata: { nestable: false },
}
