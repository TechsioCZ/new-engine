import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Badge } from "../src/atoms/badge"
import { Button } from "../src/atoms/button"
import { Icon } from "../src/atoms/icon"
import { Tooltip } from "../src/atoms/tooltip"
import { Tabs } from "../src/molecules/tabs"
import { BASE_UI_DEFAULTS, brandUIDefaults } from "../src/theme/theme-config"
import { UIProvider, useUIDefaults } from "../src/theme/ui-provider"

const html = (node: ReactNode) => renderToStaticMarkup(node)

function Probe({ size, appearance }: { size?: string; appearance?: string }) {
  const resolved = useUIDefaults(
    "Tabs",
    { size, appearance },
    {
      size: ["sm", "md", "lg"],
      appearance: ["underline", "line", "solid", "outline"],
    }
  )
  return (
    <output>
      {resolved.size ?? "-"}/{resolved.appearance ?? "-"}
    </output>
  )
}

describe("UIProvider resolution", () => {
  it("leaves every component on its own default without a provider", () => {
    expect(html(<Probe />)).toContain("-/-")
    const button = html(<Button>Save</Button>)
    expect(button).toContain("button-size-md")
    expect(button).toContain("bg-button-bg-primary-base")
  })

  it("applies the provider's global size and appearance", () => {
    const button = html(
      <UIProvider appearance="outline" size="lg">
        <Button>Save</Button>
      </UIProvider>
    )
    expect(button).toContain("button-size-lg")
    expect(button).toContain("border-button-border-primary")
    expect(button).not.toContain("bg-button-bg-primary-base")
  })

  it("lets an explicit prop win over every provider", () => {
    const button = html(
      <UIProvider
        appearance="outline"
        components={{ Button: { size: "lg" } }}
        size="lg"
      >
        <Button appearance="solid" size="sm">
          Save
        </Button>
      </UIProvider>
    )
    expect(button).toContain("button-size-sm")
    expect(button).toContain("bg-button-bg-primary-base")
  })

  it("prefers the per-component map over the global value of the same provider", () => {
    expect(
      html(
        <UIProvider
          appearance="solid"
          components={{ Tabs: { appearance: "line", size: "sm" } }}
          size="lg"
        >
          <Probe />
        </UIProvider>
      )
    ).toContain("sm/line")
  })

  it("resolves the nearest provider first, then walks outward", () => {
    expect(
      html(
        <UIProvider components={{ Tabs: { appearance: "outline" } }} size="sm">
          <UIProvider size="lg">
            <Probe />
          </UIProvider>
        </UIProvider>
      )
    ).toContain("lg/outline")
    // The inner global value beats the outer per-component value.
    expect(
      html(
        <UIProvider components={{ Tabs: { size: "sm" } }}>
          <UIProvider size="lg">
            <Probe />
          </UIProvider>
        </UIProvider>
      )
    ).toContain("lg/-")
  })

  it("skips values a component does not support", () => {
    // Tabs has no ghost look and no 2xl size: both fall back.
    expect(
      html(
        <UIProvider appearance="ghost" size="2xl">
          <Probe />
        </UIProvider>
      )
    ).toContain("-/-")
    // An unsupported inner value falls through to a supported outer one.
    expect(
      html(
        <UIProvider appearance="outline">
          <UIProvider appearance="ghost">
            <Probe />
          </UIProvider>
        </UIProvider>
      )
    ).toContain("-/outline")
  })

  it("reaches components with their own scales", () => {
    const tooltip = html(
      <UIProvider appearance="outline">
        <Tooltip content="Help" open>
          <Button>Trigger</Button>
        </Tooltip>
      </UIProvider>
    )
    expect(tooltip).toBeTruthy()
    const badge = html(
      <UIProvider appearance="outline" size="lg">
        <Badge severity="danger">Sold out</Badge>
      </UIProvider>
    )
    expect(badge).toContain("border-badge-border-outline-danger")
    expect(badge).toContain("bg-badge-bg-outline")
    expect(badge).not.toContain("bg-badge-bg-danger")
    expect(badge).toContain("p-badge-lg")
    expect(
      html(
        <UIProvider size="lg">
          <Icon icon="token-icon-home" />
        </UIProvider>
      )
    ).toContain("text-icon-lg")
  })

  it("keeps glyphs inside Button inheriting the label size", () => {
    const button = html(
      <UIProvider size="lg">
        <Button icon="token-icon-home" size="sm">
          Home
        </Button>
      </UIProvider>
    )
    expect(button).toContain("text-button-icon-sm")
    expect(button).not.toContain("text-icon-lg")
  })

  it("renders tabs with the provider appearance", () => {
    const tabs = html(
      <UIProvider appearance="solid">
        <Tabs defaultValue="a">
          <Tabs.List>
            <Tabs.Trigger value="a">A</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="a">Panel</Tabs.Content>
        </Tabs>
      </UIProvider>
    )
    expect(tabs).toContain("data-[selected]:bg-tabs-trigger-bg-selected")
  })
})

describe("brand UI defaults", () => {
  it("starts every brand from the md + solid baseline", () => {
    expect(BASE_UI_DEFAULTS).toEqual({ size: "md", appearance: "solid" })
    expect(brandUIDefaults("business")).toEqual(BASE_UI_DEFAULTS)
  })
})
