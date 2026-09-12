import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { Badge } from "../../src/atoms/badge"
import { Button } from "../../src/atoms/button"
import { Checkbox } from "../../src/atoms/checkbox"
import { Icon } from "../../src/atoms/icon"
import { Image } from "../../src/atoms/image"
import { Dialog } from "../../src/molecules/dialog"
import { FormInput } from "../../src/molecules/form-input"
import { Pagination } from "../../src/molecules/pagination"
import { Toaster, useToast } from "../../src/molecules/toast"
import { TreeView } from "../../src/molecules/tree-view"
import { SelectTemplate } from "../../src/templates/select"
import { adminNav, storefrontProducts } from "./data"
import { Brand, Frame, GlobalSearch, NavList, Panel, TopBar } from "./frame"
import {
  BulkActionBar,
  DetailList,
  PageHeader,
  SectionCard,
  StatRow,
  StatCard,
} from "./shell"

const meta: Meta = {
  /*
   * Business is the brand these back-office pages are designed against: it is the
   * light-only, high-contrast blue scale. Set at meta level so every page opens in
   * it; the Brand toolbar still switches the whole set to Default or Neo.
   */
  globals: { brand: "business", mode: "light" },
  tags: ["autodocs"],
  title: "Pages/CMS/Media library",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: [
          "A grid of assets instead of a grid of rows. Everything a list screen does —",
          "folders, filters, selection, bulk actions, detail — still applies; only the",
          "row is replaced by a tile.",
          "",
          "**Pattern rules**",
          "- Folders are a `TreeView` in the leading panel: media is hierarchical and the",
          "  hierarchy is how people remember where things are.",
          "- Selection is per-tile with a visible checkbox, not a hidden hover state, so a",
          "  touch user can select at all.",
          "- The preview opens in a right-placement `Dialog` and carries the metadata a",
          "  content editor actually needs — alt text first, dimensions second.",
          "- Alt text is a first-class editable field on the preview, not something buried",
          "  in a settings tab; it is the one property that decides accessibility.",
          "- Upload is always reachable: primary action in the header *and* a drop zone.",
        ].join("\n"),
      },
    },
  },
}

export default meta
type Story = StoryObj

const folders = [
  {
    id: "media-root",
    name: "All media",
    children: [
      { id: "media-products", name: "Product shots" },
      { id: "media-campaigns", name: "Campaigns" },
      { id: "media-editorial", name: "Editorial" },
      { id: "media-icons", name: "Icons & logos" },
    ],
  },
]

const typeItems = [
  { label: "All types", value: "all" },
  { label: "Images", value: "image" },
  { label: "Video", value: "video" },
  { label: "Documents", value: "doc" },
]

const assets = storefrontProducts.map((product, index) => ({
  id: product.id,
  name: `${product.name.toLowerCase().replace(/\s+/g, "-")}.jpg`,
  src: product.image,
  alt: `${product.name} on a neutral background`,
  size: `${(320 + index * 84).toLocaleString("en-GB")} kB`,
  dimensions: index % 2 === 0 ? "2400 × 1600" : "1600 × 1600",
  uploadedAt: `2026-09-${String(11 - index).padStart(2, "0")}`,
  usedIn: index % 3,
}))

function MediaLibraryPage() {
  const toaster = useToast()
  const [nav, setNav] = useState("content-media")
  const [folder, setFolder] = useState("media-products")
  const [selected, setSelected] = useState<string[]>([])
  const [library, setLibrary] = useState(assets)
  const [preview, setPreview] = useState<(typeof assets)[number] | null>(null)
  const [altDraft, setAltDraft] = useState("")

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id]
    )

  return (
    <Frame
      left={
        <Panel label="Main navigation" side="start">
          <Brand />
          <NavList
            defaultExpanded={["content"]}
            nav={adminNav}
            onSelect={setNav}
            selected={nav}
          />
        </Panel>
      }
      top={<TopBar center={<GlobalSearch placeholder="Search media…" />} />}
    >
      <Toaster />

      <PageHeader
        actions={
          <>
            <Button icon="icon-[mdi--folder-plus-outline]" size="sm" theme="outlined" variant="secondary">
              New folder
            </Button>
            <Button icon="icon-[mdi--cloud-upload-outline]" size="sm" variant="primary">
              Upload
            </Button>
          </>
        }
        breadcrumb={[
          { label: "Home", href: "#" },
          { label: "Content", href: "#" },
          { label: "Media library" },
        ]}
        description="Every asset the storefront and the campaigns pull from."
        title="Media library"
      />

      <StatRow>
        <StatCard icon="icon-[mdi--image-multiple-outline]" label="Assets" value="1 284" />
        <StatCard icon="icon-[mdi--harddisk]" label="Storage used" value="18.4 GB" />
        <StatCard
          hint="Assets with no alt text"
          icon="icon-[mdi--alert-outline]"
          label="Missing alt text"
          value="37"
        />
      </StatRow>

      <div className="flex gap-250">
        <aside aria-label="Folders" className="hidden w-3xs shrink-0 flex-col gap-150 lg:flex">
          <h2 className="font-semibold text-sm">Folders</h2>
          <TreeView
            data={folders}
            defaultExpandedValue={["media-root"]}
            onSelectionChange={(details) => {
              const [next] = details.selectedValue
              if (next) {
                setFolder(next)
              }
            }}
            selectedValue={[folder]}
            selectionMode="single"
            size="sm"
          >
            <TreeView.Tree>
              {folders.map((node, index) => (
                <TreeView.Node indexPath={[index]} key={node.id} node={node} />
              ))}
            </TreeView.Tree>
          </TreeView>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-200">
          <div className="flex flex-wrap items-center justify-between gap-150">
            <span className="text-fg-secondary text-sm">
              {`${library.length} of 1 284 assets`}
            </span>
            <div className="flex items-center gap-150">
              <div className="w-2xs">
                <SelectTemplate defaultValue={["all"]} items={typeItems} size="sm" />
              </div>
              <Button
                aria-label="Grid view"
                icon="icon-[mdi--view-grid-outline]"
                size="sm"
                theme="solid"
                variant="secondary"
              />
              <Button
                aria-label="List view"
                icon="icon-[mdi--view-list-outline]"
                size="sm"
                theme="outlined"
                variant="secondary"
              />
            </div>
          </div>

          <BulkActionBar count={selected.length} onClear={() => setSelected([])}>
            <Button icon="icon-[mdi--folder-move-outline]" size="sm" theme="outlined" variant="secondary">
              Move
            </Button>
            <Button icon="icon-[mdi--tag-outline]" size="sm" theme="outlined" variant="secondary">
              Tag
            </Button>
            <Button icon="icon-[mdi--delete-outline]" size="sm" theme="outlined" variant="danger">
              Delete
            </Button>
          </BulkActionBar>

          <div className="grid grid-cols-2 gap-200 md:grid-cols-3 xl:grid-cols-4">
            {library.map((asset) => (
              <figure
                className="flex flex-col gap-100 rounded-lg border border-border-primary bg-surface p-150"
                key={asset.id}
              >
                <div className="relative">
                  <Button
                    aria-label={`Preview ${asset.name}`}
                    className="block w-full overflow-hidden rounded-md p-0"
                    onClick={() => {
                      setPreview(asset)
                      setAltDraft(asset.alt)
                    }}
                    size="current"
                    theme="unstyled"
                    variant="secondary"
                  >
                    <Image
                      alt={asset.alt}
                      className="aspect-square w-full object-cover"
                      src={asset.src}
                    />
                  </Button>
                  <span className="absolute start-100 top-100">
                    <Checkbox
                      aria-label={`Select ${asset.name}`}
                      checked={selected.includes(asset.id)}
                      onChange={() => toggle(asset.id)}
                    />
                  </span>
                </div>
                <figcaption className="flex flex-col gap-50">
                  <span className="truncate text-sm">{asset.name}</span>
                  <span className="flex items-center gap-100 text-fg-secondary text-xs">
                    {asset.dimensions} · {asset.size}
                  </span>
                  {asset.usedIn === 0 ? (
                    <Badge className="self-start" size="sm" variant="warning">
                      Unused
                    </Badge>
                  ) : (
                    <Badge className="self-start" size="sm" variant="outline">
                      {`Used in ${asset.usedIn}`}
                    </Badge>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>

          <SectionCard>
            <div className="flex flex-col items-center gap-150 rounded-md border border-border-primary border-dashed p-350 text-center">
              <Icon className="text-fg-secondary" icon="icon-[mdi--cloud-upload-outline]" size="xl" />
              <p className="text-sm">Drop files anywhere on this page to upload</p>
              <p className="text-fg-secondary text-xs">
                JPEG, PNG, WebP, AVIF, MP4 · up to 50 MB each
              </p>
            </div>
          </SectionCard>

          <div className="flex justify-center">
            <Pagination
              count={1284}
              defaultPage={1}
              getPageUrl={({ page }) => `?page=${page}`}
              pageSize={library.length}
              siblingCount={1}
            />
          </div>
        </div>
      </div>

      <Dialog
        actions={
          <>
            <Button
              onClick={() => setPreview(null)}
              theme="outlined"
              variant="secondary"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                const id = preview?.id
                if (id) {
                  setLibrary((current) =>
                    current.map((asset) =>
                      asset.id === id ? { ...asset, alt: altDraft } : asset
                    )
                  )
                }
                toaster.create({ type: "success", title: "Alt text saved" })
                setPreview(null)
              }}
              variant="primary"
            >
              Save
            </Button>
          </>
        }
        customTrigger
        onOpenChange={(details) => {
          if (!details.open) {
            setPreview(null)
          }
        }}
        open={preview !== null}
        placement="right"
        size="md"
        title={preview?.name ?? ""}
      >
        {preview && (
          <div className="flex flex-col gap-200 py-200">
            <Image
              alt={preview.alt}
              className="aspect-square w-full rounded-md object-cover"
              src={preview.src}
            />
            <FormInput
              helpText="Describe what the image shows, not that it is an image."
              id="asset-alt"
              label="Alt text"
              onChange={(event) => setAltDraft(event.target.value)}
              required
              value={altDraft}
            />
            <DetailList
              items={[
                { term: "Dimensions", value: preview.dimensions },
                { term: "File size", value: preview.size },
                { term: "Uploaded", value: preview.uploadedAt },
                {
                  term: "Used in",
                  value: preview.usedIn === 0 ? "Nothing yet" : `${preview.usedIn} pages`,
                },
              ]}
            />
          </div>
        )}
      </Dialog>
    </Frame>
  )
}

export const Default: Story = {
  name: "Asset grid",
  render: () => <MediaLibraryPage />,
}
