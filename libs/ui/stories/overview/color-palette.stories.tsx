import type { Meta, StoryObj } from "@storybook/react"

import "../../src/tokens/_colors.css"
import "../../src/tokens/_semantic.css"
import { ColorSelect } from "../../src/molecules/color-select"

const meta: Meta = {
  title: "Overview/Color Palette",
  parameters: {
    layout: "fullscreen",
  },
}

export default meta
type Story = StoryObj

const semanticColors = [
  "primary",
  "secondary",
  "tertiary",
  "info",
  "success",
  "warning",
  "danger",
] as const

const colorVariants = [
  { suffix: "", label: "Default" },
  { suffix: "-light", label: "Light" },
] as const

const stateVariants = [
  { state: "", label: "Default" },
  { state: "hover", label: "Hover" },
  { state: "active", label: "Active" },
  { state: "disabled", label: "Disabled" },
] as const

export const Default: Story = {
  render: () => (
    <div className="min-h-screen bg-base p-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {semanticColors.map((color) => (
            <div key={color} className="rounded-xl bg-surface p-6 shadow-lg">
              <h3 className="mb-4 font-semibold text-fg-primary text-lg capitalize">
                {color}
              </h3>

              <div className="space-y-6">
                {colorVariants.map(({ suffix, label }) => (
                  <div key={suffix}>
                    <h4 className="mb-3 font-medium text-fg-secondary text-sm">
                      {label}
                    </h4>
                    <div className="grid grid-cols-4 gap-4">
                      {stateVariants.map(({ state }) => {
                        const baseColorVar = `--color-${color}${suffix}`
                        const computedColor =
                          state === "disabled"
                            ? `var(--color-${color}${suffix}-disabled)`
                            : state !== ""
                              ? `oklch(from var(${baseColorVar}) calc(l + var(--state-${state})) c h)`
                              : `var(${baseColorVar})`

                        const colorTokenName =
                          state === "disabled"
                            ? `--color-${color}${suffix}-disabled`
                            : state !== ""
                              ? `--color-${color}${suffix}-${state}`
                              : `--color-${color}${suffix}`

                        return (
                          <div
                            key={state}
                            className="flex min-w-0 flex-col items-center gap-2"
                          >
                            <div className="flex-shrink-0 size-16">
                              <ColorSelect
                                colors={[{ color: computedColor }]}
                                size="full"
                                radius="md"
                                layout="list"
                              />
                            </div>
                            <div className="w-full text-center">
                              <div className="truncate font-medium text-fg-primary text-xs">
                                {state || "Default"}
                              </div>
                              <div className="mt-1 break-all font-mono text-fg-secondary text-xs leading-tight">
                                {colorTokenName}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
}
