import { CalendarDate } from "@internationalized/date"
import { type ComponentType, createElement, Fragment } from "react"
import { renderToString } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { datePickerInputMachine } from "../../src/internal/date-picker-input"
import {
  DatePicker,
  type DatePickerDayRootProps,
} from "../../src/molecules/date-picker"

// Captures every machine DatePicker hands to useMachine while the real hook still runs.
const captured = vi.hoisted(() => ({ machines: [] as unknown[] }))

vi.mock("@zag-js/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@zag-js/react")>()
  return {
    ...actual,
    useMachine: (machine: unknown, props: unknown) => {
      captured.machines.push(machine)
      return (actual.useMachine as (m: unknown, p: unknown) => unknown)(
        machine,
        props
      )
    },
  }
})

type AnnounceAction = (params: unknown) => void

const Picker = DatePicker as ComponentType<DatePickerDayRootProps>

function renderLocalizedPicker() {
  captured.machines.length = 0
  renderToString(
    createElement(Picker, {
      id: "announce-machine",
      locale: "en-US",
      name: "delivery",
      defaultValue: new CalendarDate(2026, 10, 2),
      translations: {
        segmentLabels: { day: "Den", month: "Měsíc", year: "Rok" },
        emptySegment: "Prázdné",
      },
      // biome-ignore lint/correctness/noChildrenProp: React createElement requires mandatory children in the typed props argument.
      children: createElement(
        Fragment,
        null,
        createElement(
          DatePicker.Control,
          null,
          createElement(DatePicker.Segments)
        )
      ),
    })
  )
}

describe("DatePicker date-input machine announcements", () => {
  it("the base date-input machine exposes an announceSegmentValue action", () => {
    expect(
      datePickerInputMachine.implementations?.actions?.announceSegmentValue
    ).toBeTypeOf("function")
  })

  it("passes segmentLabels text from the rendered DatePicker machine to the announcer", () => {
    renderLocalizedPicker()

    const baseAnnounce =
      datePickerInputMachine.implementations?.actions?.announceSegmentValue
    const localized = captured.machines.find((machine) => {
      const action = (
        machine as {
          implementations?: { actions?: { announceSegmentValue?: unknown } }
        }
      ).implementations?.actions?.announceSegmentValue
      return typeof action === "function" && action !== baseAnnounce
    }) as
      | {
          implementations: { actions: { announceSegmentValue: AnnounceAction } }
        }
      | undefined
    expect(localized).toBeDefined()

    const announce = vi.fn()
    const props: Record<string, unknown> = {
      segmentLabels: { day: "Den", month: "Měsíc", year: "Rok" },
      emptySegmentLabel: "Prázdné",
    }
    const refs = new Map<string, unknown>([
      ["announcer", { announce }],
      ["segmentToAnnounceIndex", 0],
    ])
    const params = {
      prop: (key: string) => props[key],
      refs: {
        get: (key: string) => refs.get(key),
        set: (key: string, value: unknown) => refs.set(key, value),
      },
      context: {
        get: (key: string) => (key === "activeIndex" ? 0 : 0),
      },
      computed: (key: string) =>
        key === "segments"
          ? [[{ type: "day", text: "2", isPlaceholder: false }]]
          : [],
    }

    localized?.implementations.actions.announceSegmentValue(params)

    expect(announce).toHaveBeenCalledTimes(1)
    expect(announce).toHaveBeenCalledWith("Den, 2")
  })
})
