import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { Badge } from "../../../src/atoms/badge"
import { Button } from "../../../src/atoms/button"
import { Icon } from "../../../src/atoms/icon"
import { FileUpload } from "../../../src/molecules/file-upload"
import { type TreeNode, TreeView } from "../../../src/molecules/tree-view"
import { Toaster, useToast } from "../../../src/molecules/toast"
import { DetailList, PageHeader, SectionCard } from "../shell"
import { type AkCategory, akCategories, count } from "./data"
import { AbraOwned, AkrosShell, akrosDocs, Notice } from "./shared"

const meta: Meta = {
  globals: { brand: "business", mode: "light" },
  tags: ["autodocs"],
  title: "Pages/Akros admin/Categories",
  parameters: {
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

function CategoriesPage() {
  const toaster = useToast()
  const [categories, setCategories] = useState(akCategories)
  const [selectedId, setSelectedId] = useState("cat-anchors")

  const all = flatten(categories)
  const entry = all.find((item) => item.category.id === selectedId) ?? all[0]
  const missingImage = all.filter((item) => !item.category.hasImage)
  const empty = all.filter((item) => item.category.products === 0)
  const tree = toTree(categories)

  if (!entry) {
    return null
  }

  const setImage = (hasImage: boolean) => {
    const update = (items: AkCategory[]): AkCategory[] =>
      items.map((item) =>
        item.id === entry.category.id
          ? { ...item, hasImage }
          : {
              ...item,
              children: item.children ? update(item.children) : undefined,
            }
      )
    setCategories(update)
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
            <FileUpload
              accept="image/*"
              maxFiles={1}
              onFileAccept={() => {
                setImage(true)
                toaster.create({
                  type: "success",
                  title: "Image added",
                  description: `${entry.category.name} now shows it in the menu.`,
                })
              }}
            >
              <FileUpload.Label>Image</FileUpload.Label>
              <FileUpload.HiddenInput />
              <FileUpload.Dropzone>
                <span className="flex flex-col items-center gap-100 text-center">
                  <Icon icon="icon-[mdi--image-plus-outline]" size="xl" />
                  <span className="text-sm">Drop an image here</span>
                  <span className="text-fg-secondary text-xs">
                    JPG, PNG or WebP
                  </span>
                </span>
              </FileUpload.Dropzone>
              <FileUpload.Trigger>Choose image</FileUpload.Trigger>
            </FileUpload>
            {entry.category.hasImage && (
              <Button
                icon="icon-[mdi--delete-outline]"
                onClick={() => setImage(false)}
                size="sm"
                theme="outlined"
                variant="danger"
              >
                Remove current image
              </Button>
            )}
          </SectionCard>
        </div>
      </div>
    </AkrosShell>
  )
}

export const Default: Story = {
  name: "ABRA tree & images",
  render: () => <CategoriesPage />,
}
