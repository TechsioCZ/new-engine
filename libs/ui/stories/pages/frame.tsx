/**
 * Composable application-frame primitives for the `Pages/Layouts/*` stories.
 *
 * One `Frame` with four optional slots — top bar, leading panel, trailing
 * panel, content — covers every shell arrangement an admin, shop or CRM
 * needs. Panels are `<aside>`, navigation is `<nav>`, and the content column
 * is the only scroll owner, so keyboard order matches reading order in every
 * arrangement.
 *
 * Everything is assembled from @techsio/ui-kit components and semantic tokens;
 * the plain elements here are layout containers only.
 */
import type { ReactNode } from "react"
import { useState } from "react"
import { ActionIcon } from "../../src/atoms/action-icon"
import { Button } from "../../src/atoms/button"
import { Icon, type IconType } from "../../src/atoms/icon"
import { Tooltip } from "../../src/atoms/tooltip"
import { Dialog } from "../../src/molecules/dialog"
import { SearchForm } from "../../src/molecules/search-form"
import { type TreeNode, TreeView } from "../../src/molecules/tree-view"

type FrameProps = {
  /** Full-width bar above every column. */
  top?: ReactNode
  /** Leading panel — primary navigation in a left-to-right reading order. */
  left?: ReactNode
  /** Trailing panel — context, inspector, help, activity. */
  right?: ReactNode
  /** Remove the content column's own padding (full-bleed workspaces). */
  flush?: boolean
  children: ReactNode
}

export function Frame({ top, left, right, flush, children }: FrameProps) {
  return (
    /*
     * The shell is pinned to the viewport and `<main>` is the only scroll
     * container: the top bar and both panels stay put while content moves.
     * That is what makes a sticky page header inside the content column
     * behave, and it is the contract the layout stories describe.
     */
    <div className="flex h-screen flex-col overflow-hidden bg-base text-fg-primary">
      {top}
      <div className="flex min-h-0 flex-1">
        {left}
        <main
          className={
            flush
              ? "flex min-w-0 flex-1 flex-col overflow-y-auto"
              : "flex min-w-0 flex-1 flex-col gap-250 overflow-y-auto p-250"
          }
        >
          {children}
        </main>
        {right}
      </div>
    </div>
  )
}

/**
 * Narrow-screen escape hatch for the leading `Panel`, which is hidden below
 * `lg`. Renders the trigger *and* the drawer, so a caller only has to drop it
 * into the top bar — navigation is never unreachable on a phone.
 */
export function NavDrawer({
  nav,
  selected,
  onSelect,
  defaultExpanded,
}: NavListProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        className="lg:hidden"
        icon="icon-[mdi--menu]"
        onClick={() => setOpen(true)}
        size="sm"
        theme="borderless"
        variant="secondary"
      >
        Menu
      </Button>
      <Dialog
        customTrigger
        onOpenChange={(details) => setOpen(details.open)}
        open={open}
        placement="left"
        size="xs"
        title="Navigation"
      >
        <NavList
          defaultExpanded={defaultExpanded}
          nav={nav}
          onSelect={(value) => {
            onSelect(value)
            setOpen(false)
          }}
          selected={selected}
        />
      </Dialog>
    </>
  )
}

type PanelProps = {
  /** Which edge the panel is docked to. */
  side: "start" | "end"
  /** `xs` ≈ icon rail, `sm` ≈ nav, `md` ≈ inspector, `lg` ≈ list pane. */
  width?: "xs" | "sm" | "md" | "lg"
  label: string
  children: ReactNode
}

const panelWidths: Record<NonNullable<PanelProps["width"]>, string> = {
  xs: "w-auto",
  sm: "w-3xs",
  md: "w-2xs",
  lg: "w-sm",
}

/**
 * A docked side panel. Hidden below `lg` on purpose: a narrow viewport gets
 * the content column, and the panel's job moves into a drawer or the top bar.
 */
export function Panel({ side, width = "sm", label, children }: PanelProps) {
  return (
    <aside
      aria-label={label}
      className={[
        "hidden shrink-0 flex-col gap-250 bg-surface p-200 lg:flex",
        panelWidths[width],
        side === "start"
          ? "border-border-primary border-e"
          : "border-border-primary border-s",
      ].join(" ")}
    >
      {children}
    </aside>
  )
}

type NavListProps = {
  nav: TreeNode[]
  selected: string
  onSelect: (value: string) => void
  defaultExpanded?: string[]
  label?: string
}

/** Hierarchical navigation. TreeView owns keyboard, typeahead and expansion. */
export function NavList({
  nav,
  selected,
  onSelect,
  defaultExpanded,
  label = "Main",
}: NavListProps) {
  return (
    <nav aria-label={label} className="min-h-0 flex-1 overflow-y-auto">
      <TreeView
        data={nav}
        defaultExpandedValue={defaultExpanded}
        onSelectionChange={(details) => {
          const [next] = details.selectedValue
          if (next) {
            onSelect(next)
          }
        }}
        selectedValue={[selected]}
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
  )
}

export type RailItem = { id: string; label: string; icon: IconType }

/**
 * Icon-only navigation rail. Every target keeps a `Tooltip` *and* an
 * `aria-label`: an icon alone is not a label, and a rail without names is only
 * usable by people who already know the product.
 */
export function IconRail({
  items,
  selected,
  onSelect,
  footer,
}: {
  items: RailItem[]
  selected: string
  onSelect: (id: string) => void
  footer?: ReactNode
}) {
  return (
    <nav
      aria-label="Main"
      className="flex flex-col items-center gap-100 border-border-primary border-e bg-surface p-150"
    >
      {items.map((item) => (
        <Tooltip
          content={item.label}
          key={item.id}
          positioning={{ placement: "right" }}
        >
          <ActionIcon
            aria-current={item.id === selected ? "page" : undefined}
            aria-label={item.label}
            className={
              item.id === selected ? "bg-icon-control-bg-active" : undefined
            }
            icon={item.icon}
            onClick={() => onSelect(item.id)}
            size="md"
          />
        </Tooltip>
      ))}
      {footer && <div className="mt-auto">{footer}</div>}
    </nav>
  )
}

type BrandProps = {
  workspace?: string
  environment?: string
}

/** Product identity block — the one place a user checks which tenant they are in. */
export function Brand({
  workspace = "Northwind Commerce",
  environment = "Production",
}: BrandProps) {
  return (
    <div className="flex items-center gap-150">
      <span className="flex size-icon-control-lg items-center justify-center rounded-md bg-overlay text-fg-primary">
        <Icon icon="icon-[mdi--hexagon-multiple-outline]" size="md" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-semibold text-sm">{workspace}</span>
        <span className="text-fg-secondary text-xs">{environment}</span>
      </span>
    </div>
  )
}

type TopBarProps = {
  /** Leading slot — brand, back button, or a document title. */
  start?: ReactNode
  /** Centre slot — global search or a horizontal nav. */
  center?: ReactNode
  /** Trailing slot — account, notifications, help. */
  end?: ReactNode
}

/** Sticky global bar. Same three slots in every layout, so muscle memory holds. */
export function TopBar({ start, center, end }: TopBarProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-200 border-border-primary border-b bg-base p-150">
      {start}
      {center && (
        <div className="flex min-w-0 flex-1 justify-center">{center}</div>
      )}
      <div className="ms-auto flex items-center gap-100">
        {end ?? (
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
  )
}

/** Global search, sized for a top bar. */
export function GlobalSearch({
  placeholder = "Search orders, products, customers…",
}: {
  placeholder?: string
}) {
  return (
    <SearchForm className="w-full max-w-lg" size="sm">
      <SearchForm.Control>
        <SearchForm.Input
          aria-label="Search the workspace"
          placeholder={placeholder}
        />
        <SearchForm.Button>Search</SearchForm.Button>
      </SearchForm.Control>
    </SearchForm>
  )
}

/** Horizontal primary navigation for layouts without a sidebar. */
export function TopNav({
  items,
  selected,
  onSelect,
}: {
  items: { id: string; label: string }[]
  selected: string
  onSelect: (id: string) => void
}) {
  return (
    <nav aria-label="Main" className="flex items-center gap-50">
      {items.map((item) => (
        <Button
          aria-current={item.id === selected ? "page" : undefined}
          className={item.id === selected ? "text-fg-primary" : undefined}
          key={item.id}
          onClick={() => onSelect(item.id)}
          size="sm"
          theme="borderless"
          variant={item.id === selected ? "primary" : "secondary"}
        >
          {item.label}
        </Button>
      ))}
    </nav>
  )
}
