import { expect, userEvent, within } from "storybook/test"
import { DemoBoundary } from "./demo-boundary"
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
import {
  Brand,
  Frame,
  GlobalSearch,
  NavDrawer,
  NavList,
  Panel,
  TopBar,
} from "./frame"
import {
  BulkActionBar,
  DetailList,
  PageHeader,
  SectionCard,
  StatRow,
  StatCard,
} from "./shell"

const meta: Meta = {
  decorators: [
    (Story) => (
      <DemoBoundary>
        <Story />
      </DemoBoundary>
    ),
  ],
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

const folderItems = [
  { label: "All media", value: "media-root" },
  ...(folders[0]?.children ?? []).map((child) => ({
    label: child.name,
    value: child.id,
  })),
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
  folder: "media-products",
  tags: [] as string[],
}))

function MediaLibraryPage() {
  const toaster = useToast()
  const [nav, setNav] = useState("content-media")
  const [folder, setFolder] = useState("media-products")
  const [selected, setSelected] = useState<string[]>([])
  const [library, setLibrary] = useState(assets)
  const [preview, setPreview] = useState<(typeof assets)[number] | null>(null)
  const [altDraft, setAltDraft] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [assetType, setAssetType] = useState("all")
  const [view, setView] = useState<"grid" | "list">("grid")
  const [page, setPage] = useState(1)
  const pageSize = 4
  const assetCount = (n: number) => `${n} ${n === 1 ? "asset" : "assets"}`

  /* Bulk actions act on the selection, report, and clear it. */
  const updateSelected = (
    change: (asset: (typeof assets)[number]) => (typeof assets)[number],
  ) =>
    setLibrary((current) =>
      current.map((asset) =>
        selected.includes(asset.id) ? change(asset) : asset,
      ),
    )
  /* "All media" shows everything; a folder shows only what lives in it. */
  const visible = library.filter(
    (asset) =>
      (folder === "media-root" || asset.folder === folder) &&
      (assetType === "all" || assetType === "image"),
  )
  const pageAssets = visible.slice((page - 1) * pageSize, page * pageSize)

  const bulkDone = (title: string) => {
    toaster.create({ type: "success", title })
    setSelected([])
  }

  const selectFolder = (next: string) => {
    setFolder(next)
    setPage(1)
    /* A hidden asset must never stay selected for a bulk action. */
    setSelected([])
  }

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
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
      top={
        <TopBar
          center={<GlobalSearch placeholder="Search media…" />}
          start={
            <NavDrawer
              defaultExpanded={["content"]}
              nav={adminNav}
              onSelect={setNav}
              selected={nav}
            />
          }
        />
      }
    >
      <Toaster />

      <PageHeader
        actions={<></>}
        breadcrumb={[
          { label: "Home", href: "#" },
          { label: "Content", href: "#" },
          { label: "Media library" },
        ]}
        description="Every asset the storefront and the campaigns pull from."
        title="Media library"
      />

      <StatRow>
        <StatCard
          icon="icon-[mdi--image-multiple-outline]"
          label="Assets"
          value="1 284"
        />
        <StatCard
          icon="icon-[mdi--harddisk]"
          label="Storage used"
          value="18.4 GB"
        />
        <StatCard
          hint="Assets with no alt text"
          icon="icon-[mdi--alert-outline]"
          label="Missing alt text"
          value="37"
        />
      </StatRow>

      {/* Below lg the tree is hidden, so folders stay reachable as a select. */}
      <div className="lg:hidden">
        <SelectTemplate
          items={folderItems}
          label="Folder"
          onValueChange={(details) => {
            const [next] = details.value
            if (next) {
              selectFolder(next)
            }
          }}
          size="sm"
          value={[folder]}
        />
      </div>

      <div className="flex gap-250">
        <aside
          aria-label="Folders"
          className="hidden w-3xs shrink-0 flex-col gap-150 lg:flex"
        >
          <h2 className="font-semibold text-sm">Folders</h2>
          <TreeView
            data={folders}
            defaultExpandedValue={["media-root"]}
            onSelectionChange={(details) => {
              const [next] = details.selectedValue
              if (next) {
                selectFolder(next)
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
              {`${visible.length} matching assets in this demo`}
            </span>
            <div className="flex items-center gap-150">
              <div className="w-2xs">
                <SelectTemplate
                  value={[assetType]}
                  onValueChange={({ value }) => {
                    setAssetType(value[0] ?? "all")
                    setPage(1)
                    setSelected([])
                  }}
                  label="Asset type"
                  items={typeItems}
                  size="sm"
                />
              </div>
              <Button
                aria-label="Grid view"
                aria-pressed={view === "grid"}
                onClick={() => setView("grid")}
                icon="icon-[mdi--view-grid-outline]"
                size="sm"
                theme="solid"
                variant="secondary"
              />
              <Button
                aria-label="List view"
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
                icon="icon-[mdi--view-list-outline]"
                size="sm"
                theme="outlined"
                variant="secondary"
              />
            </div>
          </div>

          <BulkActionBar
            count={selected.length}
            onClear={() => setSelected([])}
          >
            <Button
              icon="icon-[mdi--folder-move-outline]"
              onClick={() => {
                updateSelected((asset) => ({
                  ...asset,
                  folder: "media-campaigns",
                }))
                bulkDone(`Moved ${assetCount(selected.length)} to Campaigns`)
              }}
              size="sm"
              theme="outlined"
              variant="secondary"
            >
              Move
            </Button>
            <Button
              icon="icon-[mdi--tag-outline]"
              onClick={() => {
                updateSelected((asset) => ({
                  ...asset,
                  tags: asset.tags.includes("autumn-2026")
                    ? asset.tags
                    : [...asset.tags, "autumn-2026"],
                }))
                bulkDone(`Tagged ${assetCount(selected.length)} “autumn-2026”`)
              }}
              size="sm"
              theme="outlined"
              variant="secondary"
            >
              Tag
            </Button>
            <Button
              icon="icon-[mdi--delete-outline]"
              onClick={() => setConfirmDelete(true)}
              size="sm"
              theme="outlined"
              variant="danger"
            >
              Delete
            </Button>
          </BulkActionBar>

          <Dialog
            actions={
              <>
                <Button
                  onClick={() => setConfirmDelete(false)}
                  theme="outlined"
                  variant="secondary"
                >
                  Keep assets
                </Button>
                <Button
                  onClick={() => {
                    const count = selected.length
                    setLibrary((current) =>
                      current.filter((asset) => !selected.includes(asset.id)),
                    )
                    setConfirmDelete(false)
                    bulkDone(`Deleted ${assetCount(count)}`)
                  }}
                  variant="danger"
                >
                  {`Delete ${assetCount(selected.length)}`}
                </Button>
              </>
            }
            customTrigger
            description="Pages and campaigns that embed these files will show a broken image. This cannot be undone."
            onOpenChange={(details) => setConfirmDelete(details.open)}
            open={confirmDelete}
            role="alertdialog"
            size="sm"
            title="Delete the selected assets?"
          />

          {visible.length === 0 && (
            <p role="status">
              No{" "}
              {assetType === "all"
                ? "assets"
                : assetType === "video"
                  ? "videos"
                  : assetType === "doc"
                    ? "documents"
                    : "images"}{" "}
              in this folder. Choose another asset type or folder.
            </p>
          )}
          <div
            className={
              view === "grid"
                ? "grid grid-cols-1 gap-200 sm:grid-cols-2 xl:grid-cols-4"
                : "flex flex-col gap-150"
            }
          >
            {pageAssets.map((asset) => (
              <figure
                className={
                  view === "grid"
                    ? "flex flex-col gap-100 rounded-lg border border-border-primary bg-surface p-150"
                    : "flex items-center gap-200 rounded-lg border border-border-primary bg-surface p-150"
                }
                key={asset.id}
              >
                <div
                  className={
                    view === "list" ? "relative w-3xs shrink-0" : "relative"
                  }
                >
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
                  {asset.tags.map((tag) => (
                    <Badge
                      className="self-start"
                      key={tag}
                      size="sm"
                      variant="info"
                    >
                      {tag}
                    </Badge>
                  ))}
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
              <Icon
                className="text-fg-secondary"
                icon="icon-[mdi--cloud-upload-outline]"
                size="xl"
              />
              <p className="text-sm">
                Upload is not connected in this local demo.
              </p>
              <p className="text-fg-secondary text-xs">
                Use the asset filters, preview and bulk actions to explore the
                existing library.
              </p>
            </div>
          </SectionCard>

          <div className="flex justify-center">
            <Pagination
              count={visible.length}
              page={page}
              onPageChange={setPage}
              linkProps={{ onClick: (event) => event.preventDefault() }}
              getPageUrl={() => "#media-page"}
              pageSize={pageSize}
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
                      asset.id === id ? { ...asset, alt: altDraft } : asset,
                    ),
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
                  value:
                    preview.usedIn === 0
                      ? "Nothing yet"
                      : `${preview.usedIn} pages`,
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "List view" }))
    await expect(
      canvas.getByRole("button", { name: "List view" }),
    ).toHaveAttribute("aria-pressed", "true")
    const before = window.location.href
    await userEvent.click(canvas.getByRole("link", { name: /page 2/i }))
    await expect(window.location.href).toBe(before)
    await expect(canvas.getByText("rangefinder-35.jpg")).toBeVisible()
    await userEvent.click(canvas.getByRole("link", { name: /page 1/i }))
    await userEvent.click(canvas.getByRole("button", { name: "Grid view" }))
  },

  parameters: {
    docs: {
      description: {
        story:
          "Filter the local asset library, switch between grid and list, and page through results without navigating away.",
      },
    },
  },

  name: "Asset grid",
  render: () => <MediaLibraryPage />,
}
