/**
 * Admin-shell scaffolding for the `Pages/*` composition stories: the sidebar +
 * topbar frame and the demo status vocabulary an app owns. Page headers,
 * sections, stat tiles, empty states, bulk actions and detail lists are kit
 * components (PageHeader, SectionCard, StatCard, EmptyState, BulkActionBar,
 * DetailList).
 */
import type { ReactNode } from "react"
import { useState } from "react"
import { Badge } from "../../src/atoms/badge"
import { Button } from "../../src/atoms/button"
import { Icon } from "../../src/atoms/icon"
import { Dialog } from "../../src/molecules/dialog"
import type { MenuItem } from "../../src/molecules/menu"
import { type TreeNode, TreeView } from "../../src/molecules/tree-view"
import { DemoMenu } from "./demo-boundary"
import { DemoUtilities, GlobalSearch } from "./frame"

type BadgeSeverity =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "secondary"
  | "neutral"

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
      <aside className="sticky top-0 hidden h-screen w-3xs shrink-0 flex-col gap-250 border-border-primary border-e bg-surface p-200 lg:flex">
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
            /* Branches are groupings, not destinations. */
            onSelectionChange={(details) => {
              const [next] = details.selectedValue
              if (next) {
                onNavChange?.(next)
              }
            }}
            selectedValue={[selectedNav]}
            selectionBehavior="leaf-only"
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

        <DemoMenu
          aria-label="Account"
          customTrigger={
            <Button
              appearance="ghost"
              block
              icon="icon-[mdi--account-circle-outline]"
              severity="secondary"
              size="sm"
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
            appearance="ghost"
            className="lg:hidden"
            icon="icon-[mdi--menu]"
            onClick={() => setNavDrawer(true)}
            severity="secondary"
            size="sm"
          >
            Menu
          </Button>
          <GlobalSearch />
          <div className="ms-auto flex items-center gap-100">
            {topbarActions ?? <DemoUtilities />}
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
          selectionBehavior="leaf-only"
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

/* --------------------------------------------------------------- badges --- */

const statusVariants: Record<string, BadgeSeverity> = {
  published: "success",
  active: "success",
  paid: "success",
  fulfilled: "info",
  vip: "success",
  customer: "info",
  draft: "neutral",
  lead: "warning",
  scheduled: "warning",
  pending: "warning",
  archived: "neutral",
  discontinued: "neutral",
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
    <Badge severity={statusVariants[status] ?? "neutral"} size="sm">
      {statusLabels[status] ?? status}
    </Badge>
  )
}
