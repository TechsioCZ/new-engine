/**
 * Reusable admin-shell scaffolding for the `Pages/*` composition stories.
 *
 * Nothing here is a new design-system component — it is the *layout layer* an
 * app is expected to own: a sidebar + topbar frame, a page header, a card
 * section, stat tiles and an empty state, all assembled from @techsio/ui-kit
 * components and semantic tokens only. Copy these into an app and swap the
 * fixtures for real data.
 */
import type { ReactNode } from "react"
import { useState } from "react"
import { ActionIcon } from "../../src/atoms/action-icon"
import { Badge } from "../../src/atoms/badge"
import { Button } from "../../src/atoms/button"
import { Icon, type IconType } from "../../src/atoms/icon"
import { Dialog } from "../../src/molecules/dialog"
import { Menu, type MenuItem } from "../../src/molecules/menu"
import { SearchForm } from "../../src/molecules/search-form"
import { type TreeNode, TreeView } from "../../src/molecules/tree-view"
import {
  BreadcrumbTemplate,
  type BreadcrumbTemplateItem,
} from "../../src/templates/breadcrumb"

type BadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "secondary"
  | "outline"

/* ----------------------------------------------------------------- shell -- */

type AdminShellProps = {
  /** Navigation tree rendered in the sidebar. */
  nav: TreeNode[]
  /** Selected navigation node id (single-selection). */
  selectedNav: string
  onNavChange?: (value: string) => void
  /** Branch ids expanded on first render. */
  defaultExpandedNav?: string[]
  /** Product/workspace name in the sidebar header. */
  workspace?: string
  /** Environment hint next to the workspace name (staging, sandbox, …). */
  environment?: string
  /** Trailing topbar controls — notifications, help, account menu. */
  topbarActions?: ReactNode
  children: ReactNode
}

const accountMenu: MenuItem[] = [
  {
    type: "action",
    value: "profile",
    label: "Profile",
    icon: "icon-[mdi--account-outline]",
  },
  {
    type: "action",
    value: "preferences",
    label: "Preferences",
    icon: "icon-[mdi--tune]",
  },
  { type: "separator", id: "account" },
  {
    type: "action",
    value: "sign-out",
    label: "Sign out",
    icon: "icon-[mdi--logout]",
  },
]

/**
 * Two-zone application frame: a persistent sidebar for navigation and a
 * scrolling content column with a sticky topbar for global search + account.
 *
 * UX rules this encodes:
 * - navigation lives in one place and never moves between screens;
 * - global search is reachable from every screen without opening a menu;
 * - the content column owns its own spacing so pages stay visually aligned.
 */
export function AdminShell({
  nav,
  selectedNav,
  onNavChange,
  defaultExpandedNav,
  workspace = "Northwind Commerce",
  environment = "Production",
  topbarActions,
  children,
}: AdminShellProps) {
  const [navDrawer, setNavDrawer] = useState(false)

  return (
    <div className="flex min-h-screen bg-base text-fg-primary">
      <aside className="hidden w-3xs shrink-0 flex-col gap-250 border-border-primary border-e bg-surface p-200 lg:flex">
        <div className="flex items-center gap-150">
          <span className="flex size-icon-control-lg items-center justify-center rounded-md bg-overlay text-fg-primary">
            <Icon icon="icon-[mdi--hexagon-multiple-outline]" size="md" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-semibold text-sm">{workspace}</span>
            <span className="text-fg-secondary text-xs">{environment}</span>
          </span>
        </div>

        <nav aria-label="Main" className="min-h-0 flex-1 overflow-y-auto">
          <TreeView
            data={nav}
            defaultExpandedValue={defaultExpandedNav}
            onSelectionChange={(details) => {
              const [next] = details.selectedValue
              if (next) {
                onNavChange?.(next)
              }
            }}
            selectedValue={[selectedNav]}
            selectionMode="single"
            size="sm"
          >
            <TreeView.Tree>
              {nav.map((node, index) => (
                <TreeView.Node indexPath={[index]} key={node.id} node={node} />
              ))}
            </TreeView.Tree>
          </TreeView>
        </nav>

        <Menu
          aria-label="Account"
          customTrigger={
            <Button
              block
              icon="icon-[mdi--account-circle-outline]"
              size="sm"
              theme="borderless"
              variant="secondary"
            >
              Nora Kessler
            </Button>
          }
          items={accountMenu}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-200 border-border-primary border-b bg-base p-150">
          {/* The sidebar is hidden below lg, so navigation moves in here. */}
          <Button
            className="lg:hidden"
            icon="icon-[mdi--menu]"
            onClick={() => setNavDrawer(true)}
            size="sm"
            theme="borderless"
            variant="secondary"
          >
            Menu
          </Button>
          <SearchForm className="max-w-lg flex-1" size="sm">
            <SearchForm.Control>
              <SearchForm.Input
                aria-label="Search the workspace"
                placeholder="Search orders, products, customers…"
              />
              <SearchForm.Button>Search</SearchForm.Button>
            </SearchForm.Control>
          </SearchForm>
          <div className="ms-auto flex items-center gap-100">
            {topbarActions ?? (
              <>
                <ActionIcon
                  aria-label="Notifications"
                  icon="icon-[mdi--bell-outline]"
                  size="md"
                />
                <ActionIcon
                  aria-label="Help"
                  icon="icon-[mdi--help-circle-outline]"
                  size="md"
                />
              </>
            )}
          </div>
        </header>

        <main className="flex min-w-0 flex-1 flex-col gap-250 p-250">
          {children}
        </main>
      </div>

      <Dialog
        customTrigger
        onOpenChange={(details) => setNavDrawer(details.open)}
        open={navDrawer}
        placement="left"
        size="xs"
        title="Navigation"
      >
        <TreeView
          data={nav}
          defaultExpandedValue={defaultExpandedNav}
          onSelectionChange={(details) => {
            const [next] = details.selectedValue
            if (next) {
              onNavChange?.(next)
              setNavDrawer(false)
            }
          }}
          selectedValue={[selectedNav]}
          selectionMode="single"
          size="sm"
        >
          <TreeView.Tree>
            {nav.map((node, index) => (
              <TreeView.Node indexPath={[index]} key={node.id} node={node} />
            ))}
          </TreeView.Tree>
        </TreeView>
      </Dialog>
    </div>
  )
}

/* ----------------------------------------------------------- page header -- */

type PageHeaderProps = {
  breadcrumb?: BreadcrumbTemplateItem[]
  title: string
  description?: ReactNode
  /** Status/meta chips rendered beside the title. */
  meta?: ReactNode
  /** Primary action last, secondary actions before it. */
  actions?: ReactNode
}

/**
 * One page-level header per screen: where am I (breadcrumb), what is this
 * (title + description), what can I do (actions, primary one last).
 */
export function PageHeader({
  breadcrumb,
  title,
  description,
  meta,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-150">
      {breadcrumb && breadcrumb.length > 0 && (
        <BreadcrumbTemplate items={breadcrumb} maxItems={4} size="sm" />
      )}
      <div className="flex flex-wrap items-start justify-between gap-200">
        <div className="flex min-w-0 flex-col gap-100">
          <div className="flex flex-wrap items-center gap-150">
            <h1 className="font-semibold text-xl">{title}</h1>
            {meta}
          </div>
          {description && (
            <p className="max-w-prose text-fg-secondary text-sm">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-100">{actions}</div>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ containers -- */

type SectionCardProps = {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  /** Drop the card padding when the child owns its own edges (a table). */
  flush?: boolean
  className?: string
  children?: ReactNode
}

/** Bounded content block: one heading, one job, optional local actions. */
export function SectionCard({
  title,
  description,
  actions,
  flush,
  className,
  children,
}: SectionCardProps) {
  return (
    <section
      className={[
        "flex flex-col gap-200 rounded-lg border border-border-primary bg-surface",
        flush ? "p-0" : "p-250",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {(title || actions) && (
        <div
          className={[
            "flex flex-wrap items-start justify-between gap-150",
            flush ? "px-250 pt-250" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="flex flex-col gap-50">
            {title && <h2 className="font-semibold text-md">{title}</h2>}
            {description && (
              <p className="text-fg-secondary text-sm">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-100">{actions}</div>
          )}
        </div>
      )}
      {children}
    </section>
  )
}

type StatCardProps = {
  label: string
  value: string
  /** Signed change vs. the previous period, already formatted. */
  delta?: string
  trend?: "up" | "down" | "flat"
  icon?: IconType
  hint?: string
}

/** KPI tile — label first, value dominant, trend as a badge, never a chart. */
export function StatCard({
  label,
  value,
  delta,
  trend = "flat",
  icon,
  hint,
}: StatCardProps) {
  const trendVariants: Record<
    NonNullable<StatCardProps["trend"]>,
    BadgeVariant
  > = { up: "success", down: "danger", flat: "secondary" }
  const trendVariant = trendVariants[trend]

  return (
    <div className="flex flex-1 flex-col gap-100 rounded-lg border border-border-primary bg-surface p-200">
      <div className="flex items-center gap-100 text-fg-secondary">
        {icon && <Icon icon={icon} size="sm" />}
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex flex-wrap items-baseline gap-150">
        <span className="font-semibold text-xl">{value}</span>
        {delta && (
          <Badge size="sm" variant={trendVariant}>
            {delta}
          </Badge>
        )}
      </div>
      {hint && <span className="text-fg-secondary text-xs">{hint}</span>}
    </div>
  )
}

/** Responsive KPI row — tiles wrap instead of shrinking below readability. */
export function StatRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-200">{children}</div>
}

type EmptyStateProps = {
  icon?: IconType
  title: string
  description?: string
  action?: ReactNode
}

/** Empty result set: say what is missing and offer the one useful next step. */
export function EmptyState({
  icon = "icon-[mdi--inbox-outline]",
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-150 p-450 text-center">
      <Icon className="text-fg-secondary" icon={icon} size="xl" />
      <div className="flex flex-col gap-50">
        <p className="font-semibold text-md">{title}</p>
        {description && (
          <p className="max-w-prose text-fg-secondary text-sm">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

type BulkActionBarProps = {
  count: number
  /** Actions applied to the selection; destructive ones last. */
  children: ReactNode
  onClear: () => void
}

/**
 * Selection bar. It replaces nothing — it appears above the grid only while a
 * selection exists, so the table's own toolbar never changes shape.
 */
export function BulkActionBar({
  count,
  children,
  onClear,
}: BulkActionBarProps) {
  if (count === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-150 rounded-md border border-border-primary bg-overlay p-150">
      <span className="font-medium text-sm">{count} selected</span>
      <div className="flex flex-wrap items-center gap-100">{children}</div>
      <Button
        className="ms-auto"
        onClick={onClear}
        size="sm"
        theme="borderless"
        variant="secondary"
      >
        Clear selection
      </Button>
    </div>
  )
}

type DetailItem = { term: string; value: ReactNode }

/** Read-only key/value block used in detail panes and drawers. */
export function DetailList({ items }: { items: DetailItem[] }) {
  return (
    <dl className="grid grid-cols-1 gap-150 sm:grid-cols-2">
      {items.map((item) => (
        <div className="flex flex-col gap-50" key={item.term}>
          <dt className="text-fg-secondary text-xs">{item.term}</dt>
          <dd className="text-sm">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/* --------------------------------------------------------------- badges --- */

const statusVariants: Record<string, BadgeVariant> = {
  published: "success",
  active: "success",
  paid: "success",
  fulfilled: "info",
  vip: "success",
  customer: "info",
  draft: "outline",
  lead: "warning",
  scheduled: "warning",
  pending: "warning",
  archived: "outline",
  discontinued: "outline",
  refunded: "warning",
  cancelled: "danger",
  churned: "danger",
}

const statusLabels: Record<string, string> = {
  published: "Published",
  active: "Active",
  paid: "Paid",
  fulfilled: "Fulfilled",
  draft: "Draft",
  scheduled: "Scheduled",
  archived: "Archived",
  discontinued: "Discontinued",
  pending: "Pending",
  refunded: "Refunded",
  cancelled: "Cancelled",
  lead: "Lead",
  customer: "Customer",
  vip: "VIP",
  churned: "Churned",
}

/**
 * Status is a badge, not a coloured word: one variant per state, mapped in a
 * single place so every screen tells the same colour story.
 */
export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge size="sm" variant={statusVariants[status] ?? "outline"}>
      {statusLabels[status] ?? status}
    </Badge>
  )
}
