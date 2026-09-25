import type { Meta, StoryObj } from "@storybook/react"
import { useMemo, useState } from "react"
import { Badge } from "../../../src/atoms/badge"
import { Button } from "../../../src/atoms/button"
import { FormInput } from "../../../src/molecules/form-input"
import { FormTextarea } from "../../../src/molecules/form-textarea"
import { Switch } from "../../../src/molecules/switch"
import { Tabs } from "../../../src/molecules/tabs"
import { Toaster, useToast } from "../../../src/molecules/toast"
import type { ColumnDef } from "../../../src/organisms/data-table"
import { DataTable } from "../../../src/organisms/data-table"
import { SelectTemplate } from "../../../src/templates/select"
import { DetailList, PageHeader, SectionCard, StatusBadge } from "../shell"
import { type AkContent, akContent } from "./data"
import { AkrosShell, akrosDocs } from "./shared"

const meta: Meta = {
  globals: { brand: "akros", mode: "light" },
  tags: ["autodocs"],
  title: "Pages/Akros admin/Pages & blog",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: akrosDocs([
          "Covers the brief's **Text pages and blog** (not required at launch): create",
          "text pages, edit their content, publish articles / blog, and manage the basic",
          "SEO data those pages need.",
          "",
          "**How it is built** — `DataTable`, `Tabs`, `FormInput`, `FormTextarea`,",
          "`SelectTemplate`, `Switch`, `DetailList`, `Toast`.",
          "",
          "**Pattern rules**",
          "- Pages and articles share one list with a type filter — they are the same",
          "  record shape, only where they appear differs.",
          "- SEO is its own tab with live length counters and a search-result preview;",
          "  a page with missing SEO is flagged in the list, not discovered later.",
          "- Publishing is a status with a date, so an article can be scheduled.",
        ]),
      },
    },
  },
}

export default meta
type Story = StoryObj

const kindOptions = [
  { label: "Page", value: "page" },
  { label: "Article", value: "article" },
]

const statusItems = [
  { label: "Draft", value: "draft" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Published", value: "published" },
]

function ContentListPage() {
  const columns = useMemo<ColumnDef<AkContent, unknown>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Title",
        meta: { type: "string", width: 320 },
        cell: (info) => (
          <span className="flex flex-col gap-50">
            <span className="font-medium">{info.getValue<string>()}</span>
            <span className="text-fg-secondary text-xs">
              {info.row.original.slug}
            </span>
          </span>
        ),
      },
      {
        accessorKey: "kind",
        header: "Type",
        meta: { type: "enum", options: kindOptions, width: 120 },
        cell: (info) =>
          info.getValue<string>() === "page" ? "Page" : "Article",
      },
      {
        accessorKey: "status",
        header: "Status",
        meta: { type: "string", width: 130 },
        cell: (info) => <StatusBadge status={info.getValue<string>()} />,
      },
      {
        accessorKey: "seoOk",
        header: "SEO",
        meta: { type: "boolean", width: 130 },
        cell: (info) =>
          info.getValue<boolean>() ? (
            <Badge size="sm" variant="success">
              Complete
            </Badge>
          ) : (
            <Badge size="sm" variant="warning">
              Missing
            </Badge>
          ),
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        meta: { type: "date", width: 130 },
      },
    ],
    []
  )

  return (
    <AkrosShell expanded={["marketing"]} selected="content">
      <PageHeader
        actions={
          <>
            <Button
              icon="icon-[mdi--file-plus-outline]"
              size="sm"
              theme="outlined"
              variant="secondary"
            >
              New page
            </Button>
            <Button
              icon="icon-[mdi--pencil-plus-outline]"
              size="sm"
              variant="primary"
            >
              New article
            </Button>
          </>
        }
        breadcrumb={[
          { label: "Home", href: "#" },
          { label: "Marketing", href: "#" },
          { label: "Pages & blog" },
        ]}
        description="General pages (about us, contact, shipping) and blog articles."
        meta={
          <Badge size="sm" variant="outline">
            After launch
          </Badge>
        }
        title="Pages & blog"
      />

      <SectionCard flush>
        <DataTable
          columns={columns}
          data={akContent}
          enableColumnFilters
          enableGlobalFilter
          enableSorting
          getRowId={(row) => row.id}
          getRowLabel={(row) => row.original.title}
          size="sm"
          translations={{ searchPlaceholder: "Title or URL…" }}
        />
      </SectionCard>
    </AkrosShell>
  )
}

function ArticleEditorPage() {
  const toaster = useToast()
  const [title, setTitle] = useState("Workshop safety checklist")
  const [slug, setSlug] = useState("/blog/bezpecnost-v-dilne")
  const [metaTitle, setMetaTitle] = useState("")
  const [metaDescription, setMetaDescription] = useState("")
  const [status, setStatus] = useState("draft")
  const [indexable, setIndexable] = useState(true)

  const seoTitle = metaTitle || `${title} | Akros`
  const titleTooLong = seoTitle.length > 60
  const descriptionTooLong = metaDescription.length > 160

  return (
    <AkrosShell expanded={["marketing"]} selected="content">
      <Toaster />

      <PageHeader
        actions={
          <Button
            icon="icon-[mdi--content-save-outline]"
            onClick={() =>
              toaster.create({
                type: "success",
                title:
                  status === "published" ? "Article published" : "Draft saved",
              })
            }
            size="sm"
            variant="primary"
          >
            {status === "published" ? "Publish" : "Save"}
          </Button>
        }
        breadcrumb={[
          { label: "Home", href: "#" },
          { label: "Pages & blog", href: "#" },
          { label: title },
        ]}
        meta={<StatusBadge status={status} />}
        title={title}
      />

      <div className="grid grid-cols-1 items-start gap-250 xl:grid-cols-3">
        <SectionCard className="xl:col-span-2" flush>
          <Tabs defaultValue="content" variant="line">
            <Tabs.List className="px-250 pt-250">
              <Tabs.Trigger value="content">Content</Tabs.Trigger>
              <Tabs.Trigger value="seo">
                SEO
                {!metaDescription && (
                  <Badge size="sm" variant="warning">
                    Missing
                  </Badge>
                )}
              </Tabs.Trigger>
              <Tabs.Indicator />
            </Tabs.List>

            <Tabs.Content
              className="flex flex-col gap-250 p-250"
              value="content"
            >
              <FormInput
                id="article-title"
                label="Title"
                onChange={(event) => setTitle(event.target.value)}
                required
                value={title}
              />
              <FormInput
                id="article-slug"
                label="URL"
                onChange={(event) => setSlug(event.target.value)}
                value={slug}
              />
              <FormTextarea
                defaultValue="Before every shift: check guards on power tools, wear eye protection and keep the floor clear of offcuts…"
                id="article-body"
                label="Text"
                rows={12}
              />
            </Tabs.Content>

            <Tabs.Content className="flex flex-col gap-250 p-250" value="seo">
              <FormInput
                helpText={`${seoTitle.length} / 60 characters${metaTitle ? "" : " — falls back to the title"}`}
                id="seo-title"
                label="Meta title"
                onChange={(event) => setMetaTitle(event.target.value)}
                placeholder={`${title} | Akros`}
                validateStatus={titleTooLong ? "warning" : "default"}
                value={metaTitle}
              />
              <FormTextarea
                helpText={`${metaDescription.length} / 160 characters`}
                id="seo-description"
                label="Meta description"
                onChange={(event) => setMetaDescription(event.target.value)}
                rows={3}
                validateStatus={descriptionTooLong ? "warning" : "default"}
                value={metaDescription}
              />
              <Switch
                checked={indexable}
                helpText="Search engines may index this page."
                onCheckedChange={setIndexable}
              >
                Allow indexing
              </Switch>
              <div className="flex flex-col gap-50 rounded-md border border-border-primary p-200">
                <span className="text-fg-secondary text-xs">
                  Search result preview
                </span>
                <span className="text-info text-md">{seoTitle}</span>
                <span className="text-fg-secondary text-xs">
                  www.akros.cz{slug}
                </span>
                <span className="text-sm">
                  {metaDescription ||
                    "Add a meta description — search engines otherwise pick a random sentence."}
                </span>
              </div>
            </Tabs.Content>
          </Tabs>
        </SectionCard>

        <div className="flex flex-col gap-250">
          <SectionCard title="Publishing">
            <SelectTemplate
              items={statusItems}
              label="Status"
              onValueChange={(details) => {
                const [next] = details.value
                if (next) {
                  setStatus(next)
                }
              }}
              size="sm"
              value={[status]}
            />
            <FormInput
              id="publish-at"
              label="Publish at"
              size="sm"
              type="datetime-local"
            />
          </SectionCard>
          <SectionCard title="At a glance">
            <DetailList
              items={[
                { term: "Type", value: "Article" },
                { term: "Indexable", value: indexable ? "Yes" : "No" },
                { term: "Author", value: "Nora Kessler" },
                { term: "Last saved", value: "2026-09-13 16:40" },
              ]}
            />
          </SectionCard>
        </div>
      </div>
    </AkrosShell>
  )
}

export const Default: Story = {
  name: "Pages & articles",
  render: () => <ContentListPage />,
}

export const ArticleEditor: Story = {
  name: "Article editor with SEO",
  parameters: {
    docs: {
      description: {
        story:
          "A draft article. Open the SEO tab: meta title and description show live length counters and a search-result preview.",
      },
    },
  },
  render: () => <ArticleEditorPage />,
}
