import type { Meta, StoryObj } from "@storybook/react"
import { type CSSProperties, type ReactNode, useEffect, useState } from "react"
import { expect, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Badge } from "../../src/atoms/badge"

const meta: Meta = {
  title: "Overview/Shape",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Shape utilities from `src/tokens/_shape.css`. `corner-*` sets CSS `corner-shape`: it reshapes the curve a `rounded-*` radius draws, and background, border, outline and shadow follow it. Without a radius it does nothing; browsers without support keep the plain rounded corner. `border-shape-*` is experimental (Chrome 147+) and draws the border along a CSS shape.",
      },
    },
  },
}

export default meta
type Story = StoryObj

function Tile({
  className,
  children,
  style,
  dir,
}: {
  className: string
  children: ReactNode
  style?: CSSProperties
  dir?: "ltr" | "rtl"
}) {
  return (
    <div
      className={`flex min-h-800 min-w-950 items-center justify-center border border-border-primary bg-surface-secondary p-300 text-center text-fg-primary text-sm shadow-sm ${className}`}
      dir={dir}
      style={style}
    >
      {children}
    </div>
  )
}

const KEYWORDS = [
  ["round", "corner-round"],
  ["squircle", "corner-squircle"],
  ["bevel", "corner-bevel"],
  ["scoop", "corner-scoop"],
  ["notch", "corner-notch"],
  ["square", "corner-square"],
] as const

const RADII = [
  ["rounded-md", "rounded-md"],
  ["rounded-lg", "rounded-lg"],
  ["rounded-2xl", "rounded-2xl"],
] as const

type PlaygroundArgs = {
  shape: (typeof KEYWORDS)[number][0]
  radius: (typeof RADII)[number][0]
}

export const Playground: StoryObj<PlaygroundArgs> = {
  parameters: {
    docs: {
      description: {
        story:
          "Pick a `corner-*` keyword and a `rounded-*` radius. The radius sets how far the shape reaches into the corner; the keyword sets the curve.",
      },
    },
  },
  argTypes: {
    shape: {
      control: "select",
      options: KEYWORDS.map(([name]) => name),
      description: "corner-shape keyword (`corner-*`)",
    },
    radius: {
      control: "select",
      options: RADII.map(([name]) => name),
      description: "border-radius the shape applies to (`rounded-*`)",
    },
  },
  args: { shape: "squircle", radius: "rounded-2xl" },
  render: ({ shape, radius }) => {
    const corner = KEYWORDS.find(([name]) => name === shape)?.[1] ?? ""
    return (
      <Tile className={`${radius} ${corner}`}>
        {`${radius} corner-${shape}`}
      </Tile>
    )
  },
}

export const Keywords: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Every `corner-shape` keyword at three radii. The radius sets how far the shape reaches into the corner; the keyword sets the curve.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      {RADII.map(([label, radius]) => (
        <VariantGroup key={radius} title={label}>
          {KEYWORDS.map(([name, corner]) => (
            <Tile className={`${radius} ${corner}`} key={name}>
              {name}
            </Tile>
          ))}
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
}

const SUPERELLIPSES = [
  ["-2", "corner-[superellipse(-2)]"],
  ["-1 (scoop)", "corner-[superellipse(-1)]"],
  ["-0.5", "corner-[superellipse(-0.5)]"],
  ["0 (bevel)", "corner-[superellipse(0)]"],
  ["0.5", "corner-[superellipse(0.5)]"],
  ["1 (round)", "corner-[superellipse(1)]"],
  ["1.5", "corner-[superellipse(1.5)]"],
  ["2 (squircle)", "corner-[superellipse(2)]"],
  ["4", "corner-[superellipse(4)]"],
] as const

export const Superellipse: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Arbitrary values reach every curve between the keywords: `corner-[superellipse(1.5)]`. Negative values curve inward, 0 is a straight bevel, 1 is round, 2 is a squircle.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <VariantGroup title="superellipse(n) on rounded-2xl">
        {SUPERELLIPSES.map(([label, corner]) => (
          <Tile className={`rounded-2xl ${corner}`} key={label}>
            {label}
          </Tile>
        ))}
      </VariantGroup>
    </VariantContainer>
  ),
}

const PHYSICAL = [
  ["corner-t-bevel", "corner-t-bevel"],
  ["corner-b-scoop", "corner-b-scoop"],
  ["corner-tl-notch", "corner-tl-notch"],
  ["corner-br-squircle", "corner-br-squircle"],
] as const

const LOGICAL = [
  ["corner-s-bevel", "corner-s-bevel"],
  ["corner-ee-scoop", "corner-ee-scoop"],
] as const

export const SidesAndCorners: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Side (`t r b l`, logical `s e`) and corner (`tl tr br bl`, logical `ss se es ee`) utilities, mirroring `rounded-*`. Logical ones follow the writing direction: the RTL row mirrors the LTR row.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <VariantGroup title="Physical">
        {PHYSICAL.map(([label, corner]) => (
          <Tile className={`rounded-2xl ${corner}`} key={label}>
            {label}
          </Tile>
        ))}
      </VariantGroup>
      <VariantGroup title="Logical — LTR">
        {LOGICAL.map(([label, corner]) => (
          <Tile className={`rounded-2xl ${corner}`} dir="ltr" key={label}>
            {label}
          </Tile>
        ))}
      </VariantGroup>
      <VariantGroup title="Logical — RTL">
        {LOGICAL.map(([label, corner]) => (
          <Tile className={`rounded-2xl ${corner}`} dir="rtl" key={label}>
            {label}
          </Tile>
        ))}
      </VariantGroup>
    </VariantContainer>
  ),
}

export const BrandToken: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`corner-base` reads `--corner-shape-base` (default `round`). A brand overrides that one token to reshape everything using `corner-base`; here the second row overrides it inline to squircle.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <VariantGroup title="Default (--corner-shape-base: round)">
        <Tile className="rounded-2xl corner-base">corner-base</Tile>
      </VariantGroup>
      <VariantGroup title="Brand override (--corner-shape-base: squircle)">
        <Tile
          className="rounded-2xl corner-base"
          style={
            {
              "--corner-shape-base": "var(--corner-shape-squircle)",
            } as CSSProperties
          }
        >
          corner-base
        </Tile>
      </VariantGroup>
    </VariantContainer>
  ),
}

function useSupports(property: string, value: string) {
  const [supported, setSupported] = useState<boolean | null>(null)
  useEffect(() => {
    setSupported(CSS.supports(property, value))
  }, [property, value])
  return supported
}

function SupportBadge({ property, value }: { property: string; value: string }) {
  const supported = useSupports(property, value)
  if (supported === null) {
    return null
  }
  return (
    <Badge size="sm" severity={supported ? "success" : "warning"}>
      {supported
        ? `${property} supported in this browser`
        : `${property} not supported here — showing the fallback`}
    </Badge>
  )
}

export const BorderShapeExperimental: Story = {
  name: "Border shape (experimental)",
  parameters: {
    docs: {
      description: {
        story:
          "`border-shape` is experimental (Chrome 147+). One shape strokes the border along it; two shapes fill the border between an outer and an inner edge. While it is set, `rounded-*` and `corner-*` are ignored, and the shape becomes the hit area. Other browsers show the plain rectangular border.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <VariantGroup title="Support">
        <SupportBadge property="border-shape" value="circle(50%)" />
        <SupportBadge property="corner-shape" value="squircle" />
      </VariantGroup>
      <VariantGroup title="Stroke (one shape)">
        <Tile className="border-shape-[circle(50%)]">circle(50%)</Tile>
        <Tile className="border-shape-[polygon(50%_0,100%_50%,50%_100%,0_50%)]">
          diamond
        </Tile>
      </VariantGroup>
      <VariantGroup title="Fill (outer and inner shape)">
        <Tile className="border-8 border-shape-[rect(0_100%_100%_0_round_var(--radius-lg))_circle(40%)]">
          rect + circle
        </Tile>
      </VariantGroup>
      <VariantGroup title="Reset">
        <Tile className="rounded-lg border-shape-none">border-shape-none</Tile>
      </VariantGroup>
    </VariantContainer>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      await canvas.findByText(/border-shape (supported|not supported)/)
    ).toBeVisible()
  },
}
