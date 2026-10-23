import { expect, userEvent, within } from "storybook/test"
import { DemoBoundary } from "./demo-boundary"
import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { Badge } from "../../src/atoms/badge"
import { Button } from "../../src/atoms/button"
import { Icon } from "../../src/atoms/icon"
import { Dialog } from "../../src/molecules/dialog"
import { FormInput } from "../../src/molecules/form-input"
import { FormTextarea } from "../../src/molecules/form-textarea"
import { Switch } from "../../src/molecules/switch"
import { Tabs } from "../../src/molecules/tabs"
import { Toaster, useToast } from "../../src/molecules/toast"
import { TreeView } from "../../src/molecules/tree-view"
import { SelectTemplate } from "../../src/templates/select"
import { adminNav, categoryTree, formatDate } from "./data"
import {
  AdminShell,
  DetailList,
  PageHeader,
  SectionCard,
  StatusBadge,
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
  title: "Pages/CMS/Record editor",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: [
          "The detail half of a CRUD pair: the list navigates here, this screen owns one",
          "record. It is a two-column split — the record's own content on the left, the",
          "metadata that governs it (publishing, placement, ownership) on the right.",
          "",
          "**Pattern rules**",
          "- Long forms are sectioned with `Tabs`, never one endless scroll; the first tab",
          "  is always the content the user came for.",
          "- The save bar is sticky and only enabled while the form is dirty, so “did it",
          "  save?” is answered by the page itself.",
          "- Leaving with unsaved work goes through an `alertdialog`; saving confirms with",
          "  a toast, because the user stays on the page.",
          "- Destructive record-level actions sit in their own bottom section, visually",
          "  separated, never beside `Save`.",
        ].join("\n"),
      },
    },
  },
}

export default meta
type Story = StoryObj

const statusItems = [
  { label: "Draft", value: "draft" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
]

const authorItems = [
  { label: "Nora Kessler", value: "nora" },
  { label: "Tom Hayes", value: "tom" },
  { label: "Alicia Moreau", value: "alicia" },
]

function RecordEditorPage({
  initialStatus = "draft",
}: {
  initialStatus?: string
}) {
  const toaster = useToast()
  const [nav, setNav] = useState("content-pages")
  const [title, setTitle] = useState("Autumn collection 2026")
  const [slug, setSlug] = useState("/autumn-collection")
  const [excerpt, setExcerpt] = useState(
    "Layered knitwear, shells and boots — the full autumn drop, shot in Bohemian Switzerland."
  )
  const [status, setStatus] = useState(initialStatus)
  const [indexable, setIndexable] = useState(true)
  const [dirty, setDirty] = useState(false)
  const [titleInvalid, setTitleInvalid] = useState(false)
  const [revisions, setRevisions] = useState<number[]>([])
  const [leaving, setLeaving] = useState(false)
  const [metaTitle, setMetaTitle] = useState("")
  const [metaDescription, setMetaDescription] = useState("")
  const [publishAt, setPublishAt] = useState("")
  const [author, setAuthor] = useState(["nora"])
  const [placement, setPlacement] = useState(["apparel-outerwear"])
  const [savedDraft, setSavedDraft] = useState({
    title,
    slug,
    excerpt,
    status,
    indexable,
    metaTitle,
    metaDescription,
    publishAt,
    author,
    placement,
  })

  const markDirty = () => setDirty(true)

  const save = () => {
    if (!title.trim()) {
      setTitleInvalid(true)
      document.getElementById("page-title")?.focus()
      return
    }
    const revision = 12 + revisions.length
    setRevisions((current) => [revision, ...current])
    setSavedDraft({
      title,
      slug,
      excerpt,
      status,
      indexable,
      metaTitle,
      metaDescription,
      publishAt,
      author,
      placement,
    })
    setDirty(false)
    toaster.create({
      type: "success",
      title: "Changes saved",
      description: `Revision ${revision} created in this local demo.`,
    })
  }

  return (
    <AdminShell
      defaultExpandedNav={["content"]}
      nav={adminNav}
      onNavChange={setNav}
      selectedNav={nav}
    >
      <Toaster />

      <div className="sticky top-700 z-10 flex flex-wrap items-center justify-between gap-150 rounded-lg border border-border-primary bg-surface p-150">
        <span role="status" className="text-sm">
          {dirty ? "Unsaved changes" : "All changes saved locally"}
        </span>
        <Button
          disabled={!dirty}
          icon="icon-[mdi--content-save-outline]"
          onClick={save}
          size="sm"
          variant="primary"
        >
          Save
        </Button>
      </div>
      <PageHeader
        actions={
          <>
            <Button
              icon="icon-[mdi--arrow-left]"
              onClick={() => {
                if (dirty) {
                  setLeaving(true)
                  return
                }
                toaster.create({ type: "info", title: "Back to Pages" })
              }}
              size="sm"
              theme="borderless"
              variant="secondary"
            >
              Back to list
            </Button>
          </>
        }
        breadcrumb={[
          { label: "Home", href: "#" },
          { label: "Content", href: "#" },
          { label: "Pages", href: "#" },
          { label: title },
        ]}
        meta={
          <>
            <StatusBadge status={status} />
            {dirty && (
              <Badge size="sm" variant="warning">
                Unsaved changes
              </Badge>
            )}
          </>
        }
        title={title}
      />

      <div className="grid grid-cols-1 items-start gap-250 xl:grid-cols-3">
        <div className="flex flex-col gap-250 xl:col-span-2">
          <SectionCard flush>
            <Tabs defaultValue="content" variant="line">
              <Tabs.List className="px-250">
                <Tabs.Trigger value="content">Content</Tabs.Trigger>
                <Tabs.Trigger value="seo">SEO</Tabs.Trigger>
                <Tabs.Trigger value="media">Media</Tabs.Trigger>
                <Tabs.Trigger value="revisions">Revisions</Tabs.Trigger>
                <Tabs.Indicator />
              </Tabs.List>

              <Tabs.Content
                className="flex flex-col gap-250 p-250"
                value="content"
              >
                <FormInput
                  id="page-title"
                  label="Title"
                  validateStatus={titleInvalid ? "error" : "default"}
                  helpText={
                    titleInvalid
                      ? "Enter a title before saving this page."
                      : undefined
                  }
                  onChange={(event) => {
                    setTitle(event.target.value)
                    setTitleInvalid(false)
                    markDirty()
                  }}
                  required
                  value={title}
                />
                <FormInput
                  helpText="Shown in the address bar and in every internal link."
                  id="page-slug"
                  label="URL slug"
                  onChange={(event) => {
                    setSlug(event.target.value)
                    markDirty()
                  }}
                  value={slug}
                />
                <FormTextarea
                  helpText="Used in listings and social cards. Around 160 characters reads best."
                  id="page-excerpt"
                  label="Excerpt"
                  onChange={(event) => {
                    setExcerpt(event.target.value)
                    markDirty()
                  }}
                  rows={4}
                  value={excerpt}
                />
              </Tabs.Content>

              <Tabs.Content className="flex flex-col gap-250 p-250" value="seo">
                <FormInput
                  helpText="Falls back to the page title when empty."
                  id="seo-title"
                  label="Meta title"
                  value={metaTitle}
                  onChange={(event) => {
                    setMetaTitle(event.target.value)
                    markDirty()
                  }}
                  placeholder={title}
                />
                <FormTextarea
                  id="seo-description"
                  label="Meta description"
                  value={metaDescription}
                  onChange={(event) => {
                    setMetaDescription(event.target.value)
                    markDirty()
                  }}
                  rows={3}
                />
                <Switch
                  checked={indexable}
                  helpText="Search engines may index this page and follow its links."
                  onCheckedChange={(checked) => {
                    setIndexable(checked)
                    markDirty()
                  }}
                >
                  Allow indexing
                </Switch>
              </Tabs.Content>

              <Tabs.Content
                className="flex flex-col gap-200 p-250"
                value="media"
              >
                <p className="text-fg-secondary text-sm">
                  Hero and gallery assets are managed in the media library. This
                  local record editor does not upload files.
                </p>
                <div className="flex flex-col items-center gap-150 rounded-md border border-border-primary border-dashed p-350 text-center">
                  <Icon
                    className="text-fg-secondary"
                    icon="icon-[mdi--cloud-upload-outline]"
                    size="xl"
                  />
                  <p className="text-sm">
                    No media upload is connected in this example.
                  </p>
                </div>
              </Tabs.Content>

              <Tabs.Content
                className="flex flex-col gap-150 p-250"
                value="revisions"
              >
                <DetailList
                  items={[
                    ...revisions.map((revision) => ({
                      term: `Revision ${revision}`,
                      value: "Nora Kessler · saved in this local session",
                    })),
                    {
                      term: "Revision 11",
                      value: "Nora Kessler · 2026-09-04 14:02",
                    },
                    {
                      term: "Revision 10",
                      value: "Tom Hayes · 2026-09-01 09:18",
                    },
                    {
                      term: "Revision 9",
                      value: "Nora Kessler · 2026-08-26 17:44",
                    },
                    {
                      term: "Created",
                      value: `Nora Kessler · ${formatDate("2026-08-11 10:03")}`,
                    },
                  ]}
                />
              </Tabs.Content>
            </Tabs>
          </SectionCard>

          <SectionCard
            description="Irreversible operations for this record. Kept away from the save controls on purpose."
            title="Danger zone"
          >
            <div className="flex flex-wrap items-center justify-between gap-150">
              <p className="text-fg-secondary text-sm">
                Deleting removes the page, its revisions and its redirects.
              </p>
            </div>
          </SectionCard>
        </div>

        <div className="flex flex-col gap-250">
          <SectionCard title="Publishing">
            <SelectTemplate
              items={statusItems}
              label="Status"
              onValueChange={(details) => {
                const [next] = details.value
                if (next) {
                  setStatus(next)
                  markDirty()
                }
              }}
              size="sm"
              value={[status]}
            />
            <FormInput
              id="publish-at"
              label="Publish at"
              value={publishAt}
              onChange={(event) => {
                setPublishAt(event.target.value)
                markDirty()
              }}
              size="sm"
              type="datetime-local"
            />
            <SelectTemplate
              items={authorItems}
              label="Author"
              value={author}
              onValueChange={({ value }) => {
                setAuthor(value)
                markDirty()
              }}
              size="sm"
            />
          </SectionCard>

          <SectionCard
            description="Where the page appears in the storefront navigation."
            title="Placement"
          >
            <TreeView
              data={categoryTree}
              defaultExpandedValue={["root-apparel"]}
              selectedValue={placement}
              onSelectionChange={({ selectedValue }) => {
                setPlacement(selectedValue)
                markDirty()
              }}
              selectionBehavior="all"
              selectionMode="single"
              size="sm"
            >
              <TreeView.Tree>
                {categoryTree.map((node, index) => (
                  <TreeView.Node
                    indexPath={[index]}
                    key={node.id}
                    node={node}
                  />
                ))}
              </TreeView.Tree>
            </TreeView>
          </SectionCard>

          <SectionCard title="At a glance">
            <DetailList
              items={[
                { term: "Slug", value: slug },
                { term: "Indexable", value: indexable ? "Yes" : "No" },
                {
                  term: "Excerpt length",
                  value: `${excerpt.length} characters`,
                },
                { term: "Locale", value: "en-GB" },
              ]}
            />
          </SectionCard>
        </div>
      </div>

      <Dialog
        actions={
          <>
            <Button
              onClick={() => setLeaving(false)}
              theme="outlined"
              variant="secondary"
            >
              Keep editing
            </Button>
            <Button
              onClick={() => {
                setLeaving(false)
                setTitle(savedDraft.title)
                setTitleInvalid(false)
                setSlug(savedDraft.slug)
                setExcerpt(savedDraft.excerpt)
                setStatus(savedDraft.status)
                setIndexable(savedDraft.indexable)
                setMetaTitle(savedDraft.metaTitle)
                setMetaDescription(savedDraft.metaDescription)
                setPublishAt(savedDraft.publishAt)
                setAuthor(savedDraft.author)
                setPlacement(savedDraft.placement)
                setDirty(false)
                toaster.create({
                  type: "info",
                  title: "Changes discarded",
                  description: "Back to Pages.",
                })
              }}
              variant="danger"
            >
              Discard changes
            </Button>
          </>
        }
        customTrigger
        description="This page has edits that were never saved. Leaving now throws them away."
        onOpenChange={(details) => setLeaving(details.open)}
        open={leaving}
        role="alertdialog"
        size="sm"
        title="Leave without saving?"
      />
    </AdminShell>
  )
}

export const Draft: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const title = canvas.getByRole("textbox", { name: /^Title/ })
    const original = (title as HTMLInputElement).value
    await userEvent.clear(title)
    await userEvent.type(title, "Unsaved draft title")
    await userEvent.click(canvas.getByRole("button", { name: /Back/ }))
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(body.getByRole("button", { name: "Discard changes" }))
    await expect(title).toHaveValue(original)
    await expect(canvas.getByRole("button", { name: "Save" })).toBeDisabled()
    await userEvent.clear(title)
    await userEvent.click(canvas.getByRole("button", { name: "Save" }))
    await expect(title).toHaveAttribute("aria-invalid", "true")
    await expect(title).toHaveAccessibleDescription(
      "Enter a title before saving this page."
    )
    await expect(title).toHaveFocus()
    await userEvent.type(title, original)
    await userEvent.click(canvas.getByRole("button", { name: "Save" }))
    await userEvent.click(canvas.getByRole("tab", { name: "Revisions" }))
    await expect(canvas.getByText("Revision 12", { exact: true })).toBeVisible()
    await userEvent.click(canvas.getByRole("tab", { name: /^Content$/ }))
  },

  parameters: {
    docs: {
      description: {
        story:
          "Edit a content draft, save a local revision, or discard changes back to the last saved values.",
      },
    },
  },

  render: () => <RecordEditorPage />,
}

export const Published: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Same layout for a live record — only the status badge and the publishing panel change. Edit an input to see the dirty state, the enabled save bar and the leave-confirmation flow.",
      },
    },
  },
  render: () => <RecordEditorPage initialStatus="published" />,
}
