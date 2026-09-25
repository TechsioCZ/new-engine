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
  globals: { brand: "business", mode: "light" },
  tags: ["autodocs"],
  title: "Pages/Akros admin/Product feeds",
  parameters: {
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
  const suffix = tokenProtected ? "?token=ak_7f3a…e21" : ""

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
                      onClick={() =>
                        toaster.create({ type: "info", title: "URL copied" })
                      }
                      size="sm"
                      theme="borderless"
                      variant="secondary"
                    />
                    <Button
                      aria-label={`Regenerate ${feed.name}`}
                      icon="icon-[mdi--refresh]"
                      onClick={() =>
                        toaster.create({
                          type: "success",
                          title: `${feed.name} is regenerating`,
                          description: "Usually takes about two minutes.",
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
                <Table.Cell align="end">
                  <Button size="sm" theme="borderless" variant="secondary">
                    Open product
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
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
              onClick={() =>
                toaster.create({
                  type: "warning",
                  title: "Token rotated",
                  description:
                    "Send the new URLs to the agency — the old ones stop working now.",
                })
              }
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
  name: "Product feeds",
  render: () => <FeedsPage />,
}
