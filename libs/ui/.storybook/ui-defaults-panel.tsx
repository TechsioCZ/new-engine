import { useEffect, useState } from "react"
import { Button } from "../src/atoms/button"

type Channel = {
  on: (event: string, listener: (payload: Payload) => void) => void
  off: (event: string, listener: (payload: Payload) => void) => void
  emit: (event: string, payload: unknown) => void
  last: (event: string) => Payload[] | undefined
}
type Payload = { globals: Record<string, unknown> }

export const COMPONENT_DEFAULT = "default"

const AXES = [
  {
    key: "uiSize",
    label: "Size",
    options: [
      [COMPONENT_DEFAULT, "Component default"],
      ["sm", "sm"],
      ["md", "md"],
      ["lg", "lg"],
    ],
  },
  {
    key: "uiAppearance",
    label: "Appearance",
    options: [
      [COMPONENT_DEFAULT, "Component default"],
      ["solid", "solid"],
      ["subtle", "subtle"],
      ["outline", "outline"],
      ["ghost", "ghost"],
      ["plain", "plain"],
    ],
  },
] as const

type AxisKey = (typeof AXES)[number]["key"]
type Values = Record<AxisKey, string>

function read(globals: Record<string, unknown> | undefined): Values {
  return {
    uiSize: String(globals?.uiSize ?? COMPONENT_DEFAULT),
    uiAppearance: String(globals?.uiAppearance ?? COMPONENT_DEFAULT),
  }
}

/**
 * Storybook-only control above every component docs page. It drives the same
 * `uiSize` / `uiAppearance` globals as the toolbar, so every story on the page
 * re-renders inside a `UIProvider` with those values. An explicit prop on a
 * story still wins, and a value a component does not support is skipped.
 */
export function UIDefaultsPanel({
  channel,
  initialGlobals,
}: {
  channel: Channel
  initialGlobals?: Record<string, unknown>
}) {
  const [values, setValues] = useState<Values>(() =>
    read(
      channel.last("globalsUpdated")?.[0]?.globals ??
        channel.last("setGlobals")?.[0]?.globals ??
        initialGlobals
    )
  )
  useEffect(() => {
    const update = ({ globals }: Payload) => setValues(read(globals))
    channel.on("globalsUpdated", update)
    return () => channel.off("globalsUpdated", update)
  }, [channel])

  const set = (key: AxisKey, value: string) => {
    setValues((current) => ({ ...current, [key]: value }))
    channel.emit("updateGlobals", { globals: { [key]: value } })
  }

  return (
    <section
      aria-label="UIProvider defaults"
      className="mb-400 flex flex-col gap-200 rounded-md border border-border-secondary bg-surface p-300"
    >
      <p className="text-fg-secondary text-sm">
        <strong className="text-fg-primary">UIProvider</strong> — set a global
        size and appearance for every story on this page. Explicit story props
        still win; unsupported values fall back to the component default.
      </p>
      {AXES.map((axis) => (
        <fieldset
          className="m-0 flex min-w-0 flex-wrap items-center gap-100 border-0 p-0"
          key={axis.key}
        >
          <legend className="float-left w-2xs text-fg-secondary text-sm">
            {axis.label}
          </legend>
          {axis.options.map(([value, title]) => (
            <Button
              appearance={values[axis.key] === value ? "solid" : "outline"}
              aria-pressed={values[axis.key] === value}
              key={value}
              onClick={() => set(axis.key, value)}
              severity="secondary"
              size="sm"
            >
              {title}
            </Button>
          ))}
        </fieldset>
      ))}
    </section>
  )
}
