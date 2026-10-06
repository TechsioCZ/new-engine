import { createRef } from "react"
import { Tour, type TourApi, type TourStep } from "../src/molecules/tour"

export const tourSteps: TourStep[] = [
  {
    id: "welcome",
    type: "dialog",
    title: "Welcome",
    description: "Start here.",
  },
]

export const tourContract = (
  <Tour steps={tourSteps}>
    <Tour.Trigger>Start tour</Tour.Trigger>
    <Tour.Portal>
      <Tour.Backdrop />
      <Tour.Spotlight />
      <Tour.Positioner>
        <Tour.Content>
          <Tour.Title />
          <Tour.Description />
          <Tour.ProgressText />
          <Tour.ActionTrigger action="next">Next</Tour.ActionTrigger>
          <Tour.CloseTrigger aria-label="Close walkthrough" />
        </Tour.Content>
      </Tour.Positioner>
    </Tour.Portal>
  </Tour>
)

const controlRef = createRef<HTMLButtonElement>()
export const triggerRefContract = (
  <Tour.Trigger ref={controlRef}>Start</Tour.Trigger>
)
export const actionRefContract = (
  <Tour.ActionTrigger action="next" ref={controlRef}>
    Next
  </Tour.ActionTrigger>
)

export const invalidActionContract = (
  // @ts-expect-error Navigation uses Zag's prev action, not a parallel action vocabulary.
  <Tour.ActionTrigger action="previous">Back</Tour.ActionTrigger>
)

export const invalidControlledContract = (
  // @ts-expect-error The pinned machine exposes imperative step control, not a controlled stepId prop.
  <Tour stepId="welcome" steps={tourSteps}>
    Content
  </Tour>
)

export const invalidTimeoutContract = (
  // @ts-expect-error Do not invent a configurable target timeout absent from the pinned machine.
  <Tour steps={tourSteps} targetTimeout={1000}>
    Content
  </Tour>
)

// @ts-expect-error Dismiss is an action, not an extra context API method.
export type InvalidDismissContract = TourApi["dismiss"]

// @ts-expect-error Skip is an action, not an extra context API method.
export type InvalidSkipContract = TourApi["skip"]
