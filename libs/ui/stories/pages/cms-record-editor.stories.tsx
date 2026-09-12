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
import { adminNav, categoryTree } from "./data"
import { AdminShell, DetailList, PageHeader, SectionCard, StatusBadge } from "./shell"

const meta: Meta = {
  /*
   * Business is the brand these back-office pages are designed against: it is the
   * light-only, high-contrast blue scale. Set at meta level so every page opens in
   * it; the Brand toolbar still switches the whole set to Default or Neo.
   */
  globals: { brand: "business", mode: "light" },
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

function RecordEditorPage({ initialStatus = "draft" }: { initialStatus?: string }) {
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
  const [leaving, setLeaving] = useState(false)

  const markDirty = () => setDirty(true)

  const save = () => {
    setDirty(false)
    toaster.create({
      type: "success",
      title: "Changes saved",
      description: "Revision 12 created.",
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

      <PageHeader
        actions={
          <>
            <Button
              icon="icon-[mdi--arrow-left]"
              onClick={() => (dirty ? setLeaving(true) : undefined)}
              size="sm"
              theme="borderless"
              variant="secondary"
            >
              Back to list
            </Button>
            <Button
              icon="icon-[mdi--eye-outline]"
              size="sm"
              theme="outlined"
              variant="secondary"
            >
              Preview
            </Button>
            <Button
              disabled={!dirty}
              icon="icon-[mdi--content-save-outline]"
              onClick={save}
              size="sm"
              variant="primary"
            >
              Save
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

              <Tabs.Content className="flex flex-col gap-250 p-250" value="content">
                <FormInput
                  id="page-title"
                  label="Title"
                  onChange={(event) => {
                    setTitle(event.target.value)
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
                  onChange={markDirty}
                  placeholder={title}
                />
                <FormTextarea
                  id="seo-description"
                  label="Meta description"
                  onChange={markDirty}
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

              <Tabs.Content className="flex flex-col gap-200 p-250" value="media">
                <p className="text-fg-secondary text-sm">
                  Hero and gallery assets for this page. Drop a file or pick from
                  the media library.
                </p>
                <div className="flex flex-col items-center gap-150 rounded-md border border-border-primary border-dashed p-350 text-center">
                  <Icon
                    className="text-fg-secondary"
                    icon="icon-[mdi--cloud-upload-outline]"
                    size="xl"
                  />
                  <p className="text-sm">Drop images here</p>
                  <Button size="sm" theme="outlined" variant="secondary">
                    Browse library
                  </Button>
                </div>
              </Tabs.Content>

              <Tabs.Content className="flex flex-col gap-150 p-250" value="revisions">
                <DetailList
                  items={[
                    { term: "Revision 11", value: "Nora Kessler · 2026-09-04 14:02" },
                    { term: "Revision 10", value: "Tom Hayes · 2026-09-01 09:18" },
                    { term: "Revision 9", value: "Nora Kessler · 2026-08-26 17:44" },
                    { term: "Created", value: "Nora Kessler · 2026-08-11 10:03" },
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
              <Button
                icon="icon-[mdi--delete-outline]"
                size="sm"
                theme="outlined"
                variant="danger"
              >
                Delete page
              </Button>
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
              onChange={markDirty}
              size="sm"
              type="datetime-local"
            />
            <SelectTemplate
              defaultValue={["nora"]}
              items={authorItems}
              label="Author"
              onValueChange={markDirty}
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
              defaultSelectedValue={["apparel-outerwear"]}
              onSelectionChange={markDirty}
              selectionBehavior="all"
              selectionMode="single"
              size="sm"
            >
              <TreeView.Tree>
                {categoryTree.map((node, index) => (
                  <TreeView.Node indexPath={[index]} key={node.id} node={node} />
                ))}
              </TreeView.Tree>
            </TreeView>
          </SectionCard>

          <SectionCard title="At a glance">
            <DetailList
              items={[
                { term: "Slug", value: slug },
                { term: "Indexable", value: indexable ? "Yes" : "No" },
                { term: "Excerpt length", value: `${excerpt.length} characters` },
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
                setDirty(false)
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
