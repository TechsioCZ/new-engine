import { expect, userEvent, waitFor, within } from "storybook/test"
import { DemoBoundary } from "../demo-boundary"
import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { Badge } from "../../../src/atoms/badge"
import { Button } from "../../../src/atoms/button"
import { Icon } from "../../../src/atoms/icon"
import { Image } from "../../../src/atoms/image"
import { FileUpload } from "../../../src/molecules/file-upload"
import { type TreeNode, TreeView } from "../../../src/molecules/tree-view"
import { Toaster, useToast } from "../../../src/molecules/toast"
import { DetailList, PageHeader, SectionCard } from "../shell"
import { type AkCategory, akCategories, count } from "./data"
import { AbraOwned, AkrosShell, akrosDocs, Notice } from "./shared"

const meta: Meta = {
  decorators: [
    (Story) => (
      <DemoBoundary>
        <Story />
      </DemoBoundary>
    ),
  ],

  tags: ["autodocs"],
  title: "Pages/Akros admin/Categories",
  parameters: {
    brandLock: "akros",
    layout: "fullscreen",
    docs: {
      description: {
        component: akrosDocs([
          "Covers the brief's **Categories**: the category / stock menu is a tree",
          "imported from ABRA. In the CMS it is used to *check the structure* and to",
          "*add images* to each category and tree level — nothing else.",
          "",
          "**How it is built** — `TreeView`, `FileUpload`, `DetailList`, `Badge`,",
          "`Notice`, `Toast`.",
          "",
          "**Pattern rules**",
          "- The tree is read-only: no drag, no rename, no add. Structure changes",
          "  happen in ABRA, and the page says so instead of offering controls that",
          "  the next import would undo.",
          "- Structure check runs over the whole tree and lists concrete problems",
          "  (no image, no products) with a way to jump to the category.",
          "- The one CMS-owned field — the image — is the only editable control.",
        ]),
      },
    },
  },
}

export default meta
type Story = StoryObj

function flatten(categories: AkCategory[], path: string[] = []) {
  return categories.flatMap(
    (category): { category: AkCategory; path: string[] }[] => [
      { category, path: [...path, category.name] },
      ...flatten(category.children ?? [], [...path, category.name]),
    ]
  )
}

function toTree(categories: AkCategory[]): TreeNode[] {
  return categories.map((category) => ({
    id: category.id,
    name: `${category.name} (${count.format(category.products)})`,
    icons: {
      branch: "icon-[mdi--folder-outline]",
      leaf: category.hasImage
        ? "icon-[mdi--image-outline]"
        : "icon-[mdi--image-off-outline]",
    },
    children: category.children ? toTree(category.children) : undefined,
  }))
}

type CategoryAsset = { source: string; name: string } | { file: File }

function seededCategoryAsset(category: AkCategory): CategoryAsset {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="600" height="600" fill="#eef1f4"/><path d="M160 200h280v240H160zM220 140h160v60H220z" fill="none" stroke="#64748b" stroke-width="14"/><text x="300" y="500" text-anchor="middle" font-family="sans-serif" font-size="26" fill="#334155">${category.name.replaceAll("&", "&amp;")}</text></svg>`
  return {
    source: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    name: `${category.name} — demo category illustration`,
  }
}

/** Kept separate and keyed by category so processing/rejection never leaks records. */
function CategoryImageEditor({
  asset,
  onChange,
}: {
  asset?: CategoryAsset
  onChange: (asset?: CategoryAsset) => void
}) {
  const [error, setError] = useState<string>()
  return (
    <FileUpload
      accept="image/*"
      maxFiles={1}
      acceptedFiles={asset && "file" in asset ? [asset.file] : []}
      transformFiles={async (files) => {
        setError(undefined)
        for (const file of files) {
          let bitmap: ImageBitmap | undefined
          try {
            bitmap = await createImageBitmap(file)
            if (
              bitmap.width < 600 ||
              bitmap.height < 600 ||
              bitmap.width !== bitmap.height
            )
              throw new Error(
                `This image is ${bitmap.width} × ${bitmap.height} px. Choose a square image at least 600 × 600 px.`
              )
          } catch (cause) {
            const message =
              cause instanceof Error && cause.message.startsWith("This image")
                ? cause.message
                : "This file could not be decoded. Choose a square JPG, PNG or WebP at least 600 × 600 px."
            setError(message)
            throw new Error(message)
          } finally {
            bitmap?.close()
          }
        }
        return files
      }}
      onFileChange={({ acceptedFiles }) => {
        const next = acceptedFiles[0]
        if (next && (!asset || !("file" in asset) || asset.file !== next))
          onChange({ file: next })
        else if (!next && asset && "file" in asset) onChange(undefined)
      }}
    >
      <FileUpload.Label>Image</FileUpload.Label>
      <FileUpload.HiddenInput />
      <FileUpload.Dropzone>
        <span className="flex flex-col items-center gap-100 text-center">
          <Icon icon="icon-[mdi--image-plus-outline]" size="xl" />
          <span className="text-sm">Drop an image here</span>
          <span className="text-fg-secondary text-xs">
            Square JPG, PNG or WebP, at least 600 × 600 px
          </span>
        </span>
      </FileUpload.Dropzone>
      <FileUpload.Trigger>Choose image</FileUpload.Trigger>
      {error && (
        <FileUpload.StatusText status="error">{error}</FileUpload.StatusText>
      )}
      {asset && "source" in asset && (
        <figure className="flex flex-col gap-100">
          <Image
            src={asset.source}
            alt={asset.name}
            className="w-3xs max-w-full rounded-md object-contain"
            size="custom"
          />
          <figcaption className="text-sm">{asset.name}</figcaption>
        </figure>
      )}
      <FileUpload.Context>
        {(api) => (
          <>
            <FileUpload.ItemGroup type="accepted">
              {api.acceptedFiles.map((file) => (
                <FileUpload.Item
                  file={file}
                  key={`${file.name}-${file.lastModified}`}
                >
                  <FileUpload.ItemPreview>
                    <FileUpload.ItemPreviewImage />
                  </FileUpload.ItemPreview>
                  <FileUpload.ItemName />
                  <FileUpload.ItemDeleteTrigger />
                </FileUpload.Item>
              ))}
            </FileUpload.ItemGroup>
            {asset && (
              <Button
                icon="icon-[mdi--delete-outline]"
                onClick={() => {
                  if ("file" in asset) api.clearFiles()
                  else onChange(undefined)
                  setError(undefined)
                }}
                size="sm"
                theme="outlined"
                variant="danger"
              >
                Remove current image
              </Button>
            )}
          </>
        )}
      </FileUpload.Context>
    </FileUpload>
  )
}

function CategoriesPage() {
  const toaster = useToast()
  const [assets, setAssets] = useState<
    Record<string, CategoryAsset | undefined>
  >(() =>
    Object.fromEntries(
      flatten(akCategories)
        .filter(({ category }) => category.hasImage)
        .map(({ category }) => [category.id, seededCategoryAsset(category)])
    )
  )
  const withMedia = (items: AkCategory[]): AkCategory[] =>
    items.map((item) => ({
      ...item,
      hasImage: Boolean(assets[item.id]),
      children: item.children ? withMedia(item.children) : undefined,
    }))
  const categories = withMedia(akCategories)
  const [selectedId, setSelectedId] = useState("cat-anchors")

  const all = flatten(categories)
  const entry = all.find((item) => item.category.id === selectedId) ?? all[0]
  const missingImage = all.filter((item) => !item.category.hasImage)
  const empty = all.filter((item) => item.category.products === 0)
  const tree = toTree(categories)

  if (!entry) {
    return null
  }

  return (
    <AkrosShell expanded={["catalog"]} selected="categories">
      <Toaster />

      <PageHeader
        breadcrumb={[
          { label: "Home", href: "#" },
          { label: "Catalog", href: "#" },
          { label: "Categories" },
        ]}
        description="The tree comes from ABRA and is refreshed with every import. Here you check it and add images."
        meta={<AbraOwned />}
        title="Categories"
      />

      <SectionCard
        description={`Last ABRA import 2026-09-14 05:00 · ${all.length} categories`}
        title="Structure check"
      >
        <div className="flex flex-col gap-150">
          {missingImage.length > 0 && (
            <Notice
              title={`${missingImage.length} categories have no image`}
              tone="warning"
            >
              {missingImage.map((item) => item.path.join(" › ")).join(" · ")}
            </Notice>
          )}
          {empty.length > 0 && (
            <Notice
              title={`${empty.length} category has no products`}
              tone="info"
            >
              {empty.map((item) => item.path.join(" › ")).join(" · ")} — it is
              hidden in the shop until ABRA assigns products to it.
            </Notice>
          )}
          {missingImage.length === 0 && empty.length === 0 && (
            <Notice title="The tree is complete" tone="success" />
          )}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 items-start gap-250 xl:grid-cols-5">
        <SectionCard
          className="xl:col-span-2"
          description="Product counts in brackets. The icon shows whether a category has an image."
          title="ABRA category tree"
        >
          <TreeView
            data={tree}
            defaultExpandedValue={categories.map((category) => category.id)}
            onSelectionChange={(details) => {
              const [next] = details.selectedValue
              if (next) {
                setSelectedId(next)
              }
            }}
            selectedValue={[selectedId]}
            selectionBehavior="all"
            selectionMode="single"
            size="sm"
          >
            <TreeView.Tree>
              {tree.map((node, index) => (
                <TreeView.Node indexPath={[index]} key={node.id} node={node} />
              ))}
            </TreeView.Tree>
          </TreeView>
        </SectionCard>

        <div className="flex flex-col gap-250 xl:col-span-3">
          <SectionCard
            description={entry.path.join(" › ")}
            title={
              <span className="flex flex-wrap items-center gap-150">
                {entry.category.name}
                <Badge
                  size="sm"
                  variant={entry.category.hasImage ? "success" : "warning"}
                >
                  {entry.category.hasImage ? "Has image" : "No image"}
                </Badge>
              </span>
            }
          >
            <DetailList
              items={[
                { term: "ABRA code", value: entry.category.abraCode },
                {
                  term: "Products",
                  value: count.format(entry.category.products),
                },
                {
                  term: "Subcategories",
                  value: String(entry.category.children?.length ?? 0),
                },
                { term: "Level", value: String(entry.path.length) },
              ]}
            />
          </SectionCard>

          <SectionCard
            description="Shown in the category menu and on the category page. Square, at least 600 × 600 px."
            title="Category image"
          >
            <CategoryImageEditor
              key={entry.category.id}
              asset={assets[entry.category.id]}
              onChange={(asset) => {
                setAssets((current) => ({
                  ...current,
                  [entry.category.id]: asset,
                }))
                toaster.create({
                  type: "info",
                  title: asset
                    ? "Category image saved locally"
                    : "Category image removed locally",
                  description: `${entry.category.name}; no upload service was contacted.`,
                })
              }}
            />
          </SectionCard>
        </div>
      </div>
    </AkrosShell>
  )
}

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const imageFile = async (name: string, width: number, height: number) => {
      const imageCanvas = canvasElement.ownerDocument.createElement("canvas")
      imageCanvas.width = width
      imageCanvas.height = height
      const blob = await new Promise<Blob>((resolve, reject) =>
        imageCanvas.toBlob(
          (result) =>
            result
              ? resolve(result)
              : reject(new Error("PNG generation failed")),
          "image/png"
        )
      )
      return new File([blob], name, { type: "image/png" })
    }
    const picker = () => {
      const input =
        canvasElement.querySelector<HTMLInputElement>('input[type="file"]')
      if (!input) throw new Error("Missing image picker")
      return input
    }
    await userEvent.upload(picker(), await imageFile("tiny.png", 1, 1))
    await waitFor(() =>
      expect(canvas.getByText(/This image is 1 × 1 px/)).toBeVisible()
    )
    await expect(
      canvas.queryByText("Has image", { exact: true })
    ).not.toBeInTheDocument()
    await userEvent.upload(
      picker(),
      new File(["not an image"], "broken.png", { type: "image/png" })
    )
    await waitFor(() =>
      expect(canvas.getByText(/This file could not be decoded/)).toBeVisible()
    )
    await userEvent.upload(picker(), await imageFile("anchors.png", 600, 600))
    await waitFor(() =>
      expect(canvas.getByText("anchors.png", { exact: true })).toBeVisible()
    )
    await userEvent.click(canvas.getByRole("treeitem", { name: /^Tapes/ }))
    await expect(
      canvas.queryByText("anchors.png", { exact: true })
    ).not.toBeInTheDocument()
    await userEvent.upload(picker(), await imageFile("tapes.png", 600, 600))
    await waitFor(() =>
      expect(canvas.getByText("tapes.png", { exact: true })).toBeVisible()
    )
    await userEvent.click(canvas.getByRole("treeitem", { name: /^Anchors/ }))
    await expect(canvas.getByText("anchors.png", { exact: true })).toBeVisible()
    await userEvent.upload(picker(), await imageFile("wide.png", 800, 600))
    await waitFor(() =>
      expect(canvas.getByText(/This image is 800 × 600 px/)).toBeVisible()
    )
    await expect(canvas.getByText("anchors.png", { exact: true })).toBeVisible()
    await userEvent.click(
      canvas.getByRole("button", { name: "Remove current image" })
    )
    await expect(
      canvas.queryByText("anchors.png", { exact: true })
    ).not.toBeInTheDocument()
    await userEvent.click(canvas.getByRole("treeitem", { name: /^Tapes/ }))
    await userEvent.click(
      canvas.getByRole("button", { name: "Remove current image" })
    )
    await userEvent.click(canvas.getByRole("treeitem", { name: /^Anchors/ }))
  },
  parameters: {
    docs: {
      description: {
        story:
          "Compare default in categories to choose a suitable presentation for real product content.",
      },
    },
  },

  name: "ABRA tree & images",
  render: () => <CategoriesPage />,
}
