import { expect, userEvent, within } from "storybook/test"
import { DemoBoundary } from "../demo-boundary"
import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { Badge } from "../../../src/atoms/badge"
import { Button } from "../../../src/atoms/button"
import { Input } from "../../../src/atoms/input"
import { Switch } from "../../../src/molecules/switch"
import { Toaster, useToast } from "../../../src/molecules/toast"
import { Table } from "../../../src/organisms/table"
import { PageHeader, SectionCard, StatCard, StatRow } from "../shell"
import { count, productFeeds } from "./data"
import { AkrosShell, akrosDocs, Notice } from "./shared"

const meta: Meta = {
  decorators: [
    (Story) => (
      <DemoBoundary>
        <Story />
      </DemoBoundary>
    ),
  ],

  tags: ["autodocs"],
  title: "Pages/Akros admin/Product feeds",
  parameters: {
    brandLock: "akros",
    layout: "fullscreen",
    docs: {
      description: {
        component: akrosDocs([
          "Covers the brief's **Feeds**: an external SEA / marketing agency uses the",
          "product feeds, so they must stay available to external tools.",
          "",
          "**How it is built** — `Table`, `Input` (read-only URL), `Button`, `Switch`,",
          "`StatCard`, `Notice`, `Toast`.",
          "",
          "**Pattern rules**",
          "- The feed URL is the product: it is shown in full and copyable, because",
          "  it is what gets pasted into Merchant Center or Heureka.",
          "- A feed with rejected products is not *broken*, it is *partial* — the page",
          "  lists which products are excluded and why, so the fix happens in the",
          "  product editor.",
          "- Agency access is one switch with a consequence stated in help text.",
        ]),
      },
    },
  },
}

export default meta
type Story = StoryObj

const heurekaErrors = [
  { code: "HMO-UNI-M8", name: "Universal dowel M8 × 50", reason: "No image" },
  {
    code: "KOT-CHEM-300",
    name: "Chemical anchor, polyester, 300 ml",
    reason: "No image, no description",
  },
  {
    code: "ZEB-HLI-2500",
    name: "Aluminium ladder, 3 × 9 rungs",
    reason: "Missing Heureka category mapping",
  },
]

function FeedsPage() {
  const toaster = useToast()
  const [tokenProtected, setTokenProtected] = useState(true)
  const [token, setToken] = useState("demo_7f3ae21")
  const suffix = tokenProtected ? `?token=${token}` : ""

  return (
    <AkrosShell expanded={["catalog"]} selected="feeds">
      <Toaster />

      <PageHeader
        breadcrumb={[
          { label: "Home", href: "#" },
          { label: "Catalog", href: "#" },
          { label: "Product feeds" },
        ]}
        description="XML / CSV exports of the catalogue for comparison sites and ad platforms. Used by the external SEA agency."
        title="Product feeds"
      />

      <StatRow>
        <StatCard label="Feeds" value={String(productFeeds.length)} />
        <StatCard label="Products in catalogue" value={count.format(4_188)} />
        <StatCard
          hint="Excluded from at least one feed"
          label="Products with errors"
          trend="down"
          value="86"
        />
        <StatCard label="Last generated" value="06:00" />
      </StatRow>

      <SectionCard flush title="Feeds">
        <div
          className="w-full min-w-0 overflow-x-auto"
          role="region"
          aria-label="Product feed URLs"
          tabIndex={0}
        >
          <Table size="sm" variant="line">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Feed</Table.ColumnHeader>
                <Table.ColumnHeader>URL</Table.ColumnHeader>
                <Table.ColumnHeader align="end">Products</Table.ColumnHeader>
                <Table.ColumnHeader>State</Table.ColumnHeader>
                <Table.ColumnHeader align="end">Actions</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {productFeeds.map((feed) => (
                <Table.Row key={feed.id}>
                  <Table.Cell>
                    <span className="flex flex-col gap-50">
                      <span className="font-medium">{feed.name}</span>
                      <span className="text-fg-secondary text-xs">
                        {feed.format} · {feed.schedule} · {feed.generatedAt}
                      </span>
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <Input
                      className="min-w-xs"
                      aria-label={`${feed.name} URL`}
                      readOnly
                      size="sm"
                      value={`${feed.url}${suffix}`}
                    />
                  </Table.Cell>
                  <Table.Cell align="end">
                    {count.format(feed.products)}
                  </Table.Cell>
                  <Table.Cell>
                    {feed.healthy ? (
                      <Badge size="sm" variant="success">
                        OK
                      </Badge>
                    ) : (
                      <Badge size="sm" variant="warning">
                        {`${feed.errors} excluded`}
                      </Badge>
                    )}
                  </Table.Cell>
                  <Table.Cell align="end">
                    <span className="flex justify-end gap-100">
                      <Button
                        aria-label={`Copy ${feed.name} URL`}
                        icon="icon-[mdi--content-copy]"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(
                              `${feed.url}${suffix}`
                            )
                            toaster.create({
                              type: "success",
                              title: "URL copied",
                            })
                          } catch {
                            toaster.create({
                              type: "error",
                              title: "Could not copy URL",
                              description: "Select and copy the URL manually.",
                            })
                          }
                        }}
                        size="sm"
                        theme="borderless"
                        variant="secondary"
                      />
                      <Button
                        aria-label={`About regenerating ${feed.name}`}
                        icon="icon-[mdi--refresh]"
                        onClick={() =>
                          toaster.create({
                            type: "info",
                            title: `${feed.name} regeneration preview`,
                            description:
                              "In production this starts an export job. No feed was regenerated in this demo.",
                          })
                        }
                        size="sm"
                        theme="borderless"
                        variant="secondary"
                      />
                    </span>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      </SectionCard>

      <SectionCard
        description="Products left out of the Heureka.cz feed in the last run. Fix them in the product editor; the next run picks them up."
        flush
        title="Heureka.cz — excluded products"
      >
        <div className="px-250">
          <Notice title="86 products excluded, 3 shown" tone="warning">
            Most exclusions come from the September ABRA import — new products
            without images or descriptions yet.
          </Notice>
        </div>
        <div
          className="w-full min-w-0 overflow-x-auto"
          role="region"
          aria-label="Products excluded from feeds"
          tabIndex={0}
        >
          <Table size="sm" variant="line">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Product</Table.ColumnHeader>
                <Table.ColumnHeader>Reason</Table.ColumnHeader>
                <Table.ColumnHeader align="end">Fix</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {heurekaErrors.map((error) => (
                <Table.Row key={error.code}>
                  <Table.Cell>
                    <span className="flex flex-col gap-50">
                      <span>{error.name}</span>
                      <span className="text-fg-secondary text-xs">
                        {error.code}
                      </span>
                    </span>
                  </Table.Cell>
                  <Table.Cell>{error.reason}</Table.Cell>
                  <Table.Cell align="end"></Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      </SectionCard>

      <SectionCard
        description="Who can download the feeds from outside the shop."
        title="Agency access"
      >
        <Switch
          checked={tokenProtected}
          helpText={
            tokenProtected
              ? "Feed URLs carry a secret token. Send the full URLs to the agency; anyone without the token gets 403."
              : "Feeds are public. Anyone who knows the URL can download the catalogue with prices."
          }
          onCheckedChange={setTokenProtected}
        >
          Protect feeds with an access token
        </Switch>
        {tokenProtected && (
          <div className="flex flex-wrap items-center gap-150">
            <span className="text-fg-secondary text-sm">
              Token created 2026-03-02 · last used by agency 06:02 today
            </span>
            <Button
              onClick={() => {
                setToken(`demo_${crypto.randomUUID()}`)
                toaster.create({
                  type: "warning",
                  title: "Demo token rotated",
                  description:
                    "The preview URLs now contain the new token. No live credentials were changed.",
                })
              }}
              size="sm"
              theme="outlined"
              variant="warning"
            >
              Rotate token
            </Button>
          </div>
        )}
      </SectionCard>
    </AkrosShell>
  )
}

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const url = canvas.getAllByRole("textbox", {
      name: /URL$/,
    })[0]! as HTMLInputElement
    const before = url.value
    await userEvent.click(canvas.getByRole("button", { name: "Rotate token" }))
    await expect(url.value).not.toBe(before)
    const descriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard")
    let copied = ""
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          copied = text
        },
      },
    })
    try {
      await userEvent.click(
        canvas.getAllByRole("button", { name: /Copy .* URL/ })[0]!
      )
      await expect(copied).toBe(url.value)
    } finally {
      if (descriptor) Object.defineProperty(navigator, "clipboard", descriptor)
      else Reflect.deleteProperty(navigator, "clipboard")
    }
  },

  parameters: {
    docs: {
      description: {
        story:
          "Inspect feed URLs, copy them through the clipboard and rotate a local demo token without changing a live service.",
      },
    },
  },

  name: "Product feeds",
  render: () => <FeedsPage />,
}
