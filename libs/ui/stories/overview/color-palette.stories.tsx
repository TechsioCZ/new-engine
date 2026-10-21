import type { Meta, StoryObj } from "@storybook/react"

const meta = {
  title: "Overview/Color Palette",
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "Inspect the actual semantic surface, foreground and interaction tokens of the active brand. The toolbar controls the same token graph used by components; these are display swatches, not selection controls." } },
  },
} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const families = ["primary", "secondary", "tertiary", "warning", "danger"] as const
const states = ["base", "hover", "active"] as const

function Swatch({ token, label }: { token: string; label: string }) {
  return <figure className="min-w-0 space-y-100">
    <div aria-hidden="true" className="h-16 w-full rounded-md border border-border-primary" style={{ backgroundColor: `var(${token})` }} />
    <figcaption className="space-y-50"><p className="font-semibold text-fg-primary text-sm">{label}</p><code className="block break-words text-fg-secondary text-xs">{token}</code></figcaption>
  </figure>
}

export const Default: Story = {
  parameters: { docs: { description: { story: "Switch brands or modes to inspect real base, hover and active tokens, including the opaque popup and readable text surfaces." } } },
  render: () => <div className="min-h-screen bg-base p-300 text-fg-primary md:p-600"><div className="mx-auto max-w-7xl space-y-600">
    <header className="space-y-100"><h1 className="font-bold text-xl">Theme palette</h1><p className="text-fg-secondary text-sm">Live semantic tokens from the selected brand and mode. Hover and active swatches use exported tokens, not approximations.</p></header>
    <div className="grid gap-400 md:grid-cols-2 xl:grid-cols-3">{families.map((family) => <section key={family} className="space-y-300 rounded-lg border border-border-primary bg-surface p-300"><h2 className="font-semibold text-lg capitalize">{family}</h2><div className="grid grid-cols-1 gap-200 sm:grid-cols-3">{states.map((state) => <Swatch key={state} label={state === "base" ? "Base" : state === "hover" ? "Hover" : "Active"} token={`--color-bg-${family}-${state}`} />)}</div></section>)}</div>
    <section className="space-y-300"><h2 className="font-semibold text-lg">Surfaces and feedback</h2><div className="grid grid-cols-1 gap-300 sm:grid-cols-2 md:grid-cols-4">{([["Page", "--color-base"], ["Popup", "--color-popup-bg"], ["Disabled", "--color-bg-disabled"], ["Selection", "--color-fill-selected"], ["Information", "--color-bg-info"], ["Success", "--color-bg-success"], ["Text", "--color-fg-primary"], ["Link", "--color-link"]] as const).map(([label, token]) => <Swatch key={token} label={label} token={token} />)}</div></section>
  </div></div>,
}
