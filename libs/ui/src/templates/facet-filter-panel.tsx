/**
 * FacetFilterPanel - @techsio/ui-kit template.
 *
 * @component FacetFilterPanel
 * @componentVersion v1.0.1
 * @skill facet-filter-panel-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 */
import type { ReactNode } from "react"
import { useEffect, useId, useRef, useState } from "react"
import { Button } from "../atoms/button"
import { Accordion } from "../molecules/accordion"
import { Dialog } from "../molecules/dialog"
import { FormCheckbox } from "../molecules/form-checkbox"
import { Slider } from "../molecules/slider"
import { tv } from "../utils"

const facetFilterPanelStyles = tv({
  slots: {
    root: [
      "flex w-full min-w-0 flex-col overflow-y-auto",
      "max-h-(--container-facet-filter-panel-max-h) rounded-facet-filter-panel",
      "border-(length:--border-width-facet-filter-panel) border-facet-filter-panel-border",
      "bg-facet-filter-panel-bg text-facet-filter-panel-fg",
      "p-facet-filter-panel",
    ],
    content: "flex min-h-0 flex-col gap-facet-filter-panel",
    title:
      "font-facet-filter-panel-title text-facet-filter-panel-title text-facet-filter-panel-title-fg",
    pending:
      "text-(length:--text-facet-filter-panel-status) text-facet-filter-panel-muted-fg",
    groups: "min-h-0 gap-facet-filter-panel-group bg-facet-filter-panel-bg",
    rangeGroup:
      "border-b-(length:--border-width-facet-filter-panel) border-facet-filter-panel-border p-facet-filter-panel-group",
    optionList: "flex flex-col gap-facet-filter-panel-item",
    optionLabel:
      "flex min-w-0 flex-1 items-center justify-between gap-facet-filter-panel-item",
    optionText: "min-w-0 break-words",
    optionCount:
      "shrink-0 text-facet-filter-panel-count text-facet-filter-panel-muted-fg",
    empty:
      "text-(length:--text-facet-filter-panel-status) text-facet-filter-panel-muted-fg",
    overflowAction: "mt-facet-filter-panel-overflow self-start",
    drawerTrigger: "self-start",
    drawerContent: "min-w-0",
    triggerCount:
      "inline-flex min-w-facet-filter-panel-count items-center justify-center rounded-facet-filter-panel-count bg-facet-filter-panel-count-bg px-facet-filter-panel-count text-facet-filter-panel-count text-facet-filter-panel-count-fg",
    activeRoot:
      "border-b-(length:--border-width-facet-filter-panel) flex flex-col gap-facet-filter-panel-active border-facet-filter-panel-border pb-facet-filter-panel-active",
    activeHeader:
      "flex flex-wrap items-center justify-between gap-facet-filter-panel-active",
    activeTitle:
      "font-facet-filter-panel-active-title text-facet-filter-panel-active-title",
    activeList: "flex flex-wrap gap-facet-filter-panel-active",
  },
})

export type FacetFilterOption = {
  value: string
  label: ReactNode
  count?: number
  disabled?: boolean
}

type FacetFilterGroupBase = {
  id: string
  disabled?: boolean
}

export type FacetFilterOptionsGroup = FacetFilterGroupBase & {
  type: "options"
  label: ReactNode
  options: readonly FacetFilterOption[]
  collapseAfter?: number
  emptyLabel?: ReactNode
}

export type FacetFilterRangeGroup = FacetFilterGroupBase & {
  type: "range"
  label: string
  min: number
  max: number
  step?: number
  minStepsBetweenThumbs?: number
  value: readonly [number, number]
  formatValue?: (value: number) => string
  formatRangeText?: (values: number[]) => string
}

export type FacetFilterGroup = FacetFilterOptionsGroup | FacetFilterRangeGroup

export type FacetFilterActiveItem = {
  id: string
  label: ReactNode
  removeLabel: string
}

export type FacetFilterOptionChangeDetails = {
  groupId: string
  value: string
  checked: boolean
}

export type FacetFilterRangeChangeDetails = {
  groupId: string
  value: [number, number]
}

export type FacetFilterPanelProps = {
  title: ReactNode
  groups: readonly FacetFilterGroup[]
  selectedValues?: Readonly<Record<string, readonly string[]>>
  activeFilters?: readonly FacetFilterActiveItem[]
  presentation?: "inline" | "drawer"
  disabled?: boolean
  pending?: boolean
  pendingLabel?: ReactNode
  activeFiltersLabel?: ReactNode
  resetLabel?: ReactNode
  showMoreLabel?: (hiddenCount: number) => ReactNode
  showLessLabel?: ReactNode
  expandedGroups?: string[]
  defaultExpandedGroups?: string[]
  onExpandedGroupsChange?: (groupIds: string[]) => void
  drawerTriggerLabel?: ReactNode
  drawerPlacement?: "left" | "right"
  drawerSize?: "xs" | "sm" | "md" | "lg" | "xl" | "full"
  drawerOpen?: boolean
  defaultDrawerOpen?: boolean
  onDrawerOpenChange?: (open: boolean) => void
  className?: string
  onOptionChange?: (details: FacetFilterOptionChangeDetails) => void
  onRangeChange?: (details: FacetFilterRangeChangeDetails) => void
  onRangeChangeEnd?: (details: FacetFilterRangeChangeDetails) => void
  onRemoveFilter?: (id: string) => void
  onReset?: () => void
}

export type FacetFilterActiveFiltersProps = {
  items: readonly FacetFilterActiveItem[]
  label?: ReactNode
  resetLabel?: ReactNode
  disabled?: boolean
  className?: string
  onRemove?: (id: string) => void
  onReset?: () => void
}

type FacetFilterOptionsProps = {
  group: FacetFilterOptionsGroup
  selectedValues: readonly string[]
  disabled: boolean
  showMoreLabel: (hiddenCount: number) => ReactNode
  showLessLabel: ReactNode
  onOptionChange?: (details: FacetFilterOptionChangeDetails) => void
}

const toRangeTuple = (
  values: number[],
  group: FacetFilterRangeGroup
): [number, number] => [values[0] ?? group.min, values[1] ?? group.max]

function FacetFilterOptions({
  group,
  selectedValues,
  disabled,
  showMoreLabel,
  showLessLabel,
  onOptionChange,
}: FacetFilterOptionsProps) {
  const [expanded, setExpanded] = useState(false)
  const styles = facetFilterPanelStyles()
  const collapseAfter = Math.max(0, group.collapseAfter ?? group.options.length)
  const hasOverflow = group.options.length > collapseAfter
  const visibleOptions =
    expanded || !hasOverflow
      ? group.options
      : group.options.slice(0, collapseAfter)

  if (group.options.length === 0) {
    return group.emptyLabel ? (
      <div className={styles.empty()}>{group.emptyLabel}</div>
    ) : null
  }

  return (
    <div className="flex flex-col">
      <ul className={styles.optionList()}>
        {visibleOptions.map((option) => (
          <li key={option.value}>
            <FormCheckbox
              checked={selectedValues.includes(option.value)}
              disabled={disabled || option.disabled}
              label={
                <span className={styles.optionLabel()}>
                  <span className={styles.optionText()}>{option.label}</span>
                  {option.count !== undefined ? (
                    <span className={styles.optionCount()}>{option.count}</span>
                  ) : null}
                </span>
              }
              name={group.id}
              onCheckedChange={(checked) =>
                onOptionChange?.({
                  groupId: group.id,
                  value: option.value,
                  checked,
                })
              }
              value={option.value}
            />
          </li>
        ))}
      </ul>
      {hasOverflow ? (
        <Button
          aria-expanded={expanded}
          className={styles.overflowAction()}
          disabled={disabled}
          onClick={() => setExpanded((current) => !current)}
          size="sm"
          theme="borderless"
          type="button"
          variant="primary"
        >
          {expanded
            ? showLessLabel
            : showMoreLabel(group.options.length - collapseAfter)}
        </Button>
      ) : null}
    </div>
  )
}

function FacetFilterPanelContent({
  title,
  groups,
  selectedValues = {},
  activeFilters = [],
  disabled = false,
  pending = false,
  pendingLabel,
  activeFiltersLabel = "Active filters",
  resetLabel = "Clear filters",
  showMoreLabel = (hiddenCount) => `Show ${hiddenCount} more`,
  showLessLabel = "Show less",
  expandedGroups,
  defaultExpandedGroups,
  onExpandedGroupsChange,
  onOptionChange,
  onRangeChange,
  onRangeChangeEnd,
  onRemoveFilter,
  onReset,
  showTitle,
  titleId,
}: FacetFilterPanelProps & { showTitle: boolean; titleId?: string }) {
  const styles = facetFilterPanelStyles()
  const interactionDisabled = disabled || pending
  const optionGroupIds = groups
    .filter((group) => group.type === "options")
    .map((group) => group.id)
  const [localExpandedGroups, setLocalExpandedGroups] = useState(
    () => defaultExpandedGroups ?? optionGroupIds
  )
  const previousGroupIds = useRef(new Set(optionGroupIds))

  useEffect(() => {
    const addedGroupIds = optionGroupIds.filter(
      (id) => !previousGroupIds.current.has(id)
    )
    previousGroupIds.current = new Set(optionGroupIds)

    if (
      expandedGroups === undefined &&
      defaultExpandedGroups === undefined &&
      addedGroupIds.length > 0
    ) {
      setLocalExpandedGroups((current) => [
        ...new Set([...current, ...addedGroupIds]),
      ])
    }
  }, [optionGroupIds, expandedGroups, defaultExpandedGroups])

  return (
    <div aria-busy={pending || undefined} className={styles.content()}>
      {showTitle ? (
        <h2 className={styles.title()} id={titleId}>
          {title}
        </h2>
      ) : null}

      {pending && pendingLabel ? (
        <output aria-live="polite" className={styles.pending()}>
          {pendingLabel}
        </output>
      ) : null}

      <FacetFilterPanel.ActiveFilters
        disabled={interactionDisabled}
        items={activeFilters}
        label={activeFiltersLabel}
        onRemove={onRemoveFilter}
        onReset={onReset}
        resetLabel={resetLabel}
      />

      <Accordion
        className={styles.groups()}
        disabled={disabled}
        multiple
        onChange={(groupIds) => {
          if (expandedGroups === undefined) {
            setLocalExpandedGroups(groupIds)
          }
          onExpandedGroupsChange?.(groupIds)
        }}
        value={expandedGroups ?? localExpandedGroups}
        variant="child"
      >
        {groups.map((group) => {
          if (group.type === "range") {
            return (
              <section className={styles.rangeGroup()} key={group.id}>
                <Slider
                  disabled={interactionDisabled || group.disabled}
                  formatRangeText={group.formatRangeText}
                  formatValue={group.formatValue}
                  label={group.label}
                  max={group.max}
                  min={group.min}
                  minStepsBetweenThumbs={group.minStepsBetweenThumbs}
                  onChange={(value) =>
                    onRangeChange?.({
                      groupId: group.id,
                      value: toRangeTuple(value, group),
                    })
                  }
                  onChangeEnd={(value) =>
                    onRangeChangeEnd?.({
                      groupId: group.id,
                      value: toRangeTuple(value, group),
                    })
                  }
                  showValueText
                  step={group.step}
                  value={[...group.value]}
                />
              </section>
            )
          }

          return (
            <Accordion.Item
              disabled={group.disabled}
              key={group.id}
              value={group.id}
            >
              <Accordion.Header>
                <Accordion.Title>{group.label}</Accordion.Title>
                <Accordion.Indicator />
              </Accordion.Header>
              <Accordion.Content>
                <FacetFilterOptions
                  disabled={interactionDisabled || Boolean(group.disabled)}
                  group={group}
                  onOptionChange={onOptionChange}
                  selectedValues={selectedValues[group.id] ?? []}
                  showLessLabel={showLessLabel}
                  showMoreLabel={showMoreLabel}
                />
              </Accordion.Content>
            </Accordion.Item>
          )
        })}
      </Accordion>
    </div>
  )
}

export function FacetFilterPanel({
  presentation = "inline",
  drawerTriggerLabel,
  drawerPlacement = "right",
  drawerSize = "sm",
  drawerOpen,
  defaultDrawerOpen = false,
  onDrawerOpenChange,
  className,
  ...props
}: FacetFilterPanelProps) {
  const styles = facetFilterPanelStyles()
  const inlineTitleId = useId()
  const drawerTriggerRef = useRef<HTMLButtonElement>(null)
  const [uncontrolledDrawerOpen, setUncontrolledDrawerOpen] =
    useState(defaultDrawerOpen)
  const resolvedDrawerOpen = drawerOpen ?? uncontrolledDrawerOpen
  const activeCount = props.activeFilters?.length ?? 0

  const setDrawerOpen = (open: boolean) => {
    if (drawerOpen === undefined) {
      setUncontrolledDrawerOpen(open)
    }
    onDrawerOpenChange?.(open)
  }

  if (presentation === "drawer") {
    return (
      <>
        <Button
          aria-expanded={resolvedDrawerOpen}
          aria-haspopup="dialog"
          className={styles.drawerTrigger()}
          icon="token-icon-facet-filter-panel-filter"
          onClick={() => setDrawerOpen(true)}
          ref={drawerTriggerRef}
          type="button"
          variant="primary"
        >
          {drawerTriggerLabel ?? props.title}
          {activeCount > 0 ? (
            <span aria-hidden="true" className={styles.triggerCount()}>
              {activeCount}
            </span>
          ) : null}
        </Button>
        <Dialog
          className={styles.drawerContent({ className })}
          customTrigger
          finalFocusEl={() => drawerTriggerRef.current}
          onOpenChange={({ open }) => setDrawerOpen(open)}
          open={resolvedDrawerOpen}
          placement={drawerPlacement}
          size={drawerSize}
          title={props.title}
        >
          <FacetFilterPanelContent {...props} showTitle={false} />
        </Dialog>
      </>
    )
  }

  return (
    <aside
      aria-labelledby={inlineTitleId}
      className={styles.root({ className })}
    >
      <FacetFilterPanelContent {...props} showTitle titleId={inlineTitleId} />
    </aside>
  )
}

FacetFilterPanel.ActiveFilters = function FacetFilterActiveFilters({
  items,
  label = "Active filters",
  resetLabel = "Clear filters",
  disabled = false,
  className,
  onRemove,
  onReset,
}: FacetFilterActiveFiltersProps) {
  const styles = facetFilterPanelStyles()

  if (items.length === 0) {
    return null
  }

  return (
    <section className={styles.activeRoot({ className })}>
      <div className={styles.activeHeader()}>
        <h3 className={styles.activeTitle()}>{label}</h3>
        <Button
          disabled={disabled}
          onClick={onReset}
          size="sm"
          theme="borderless"
          type="button"
          variant="primary"
        >
          {resetLabel}
        </Button>
      </div>
      <div className={styles.activeList()}>
        {items.map((item) => (
          <Button
            aria-label={item.removeLabel}
            disabled={disabled}
            icon="token-icon-close"
            iconPosition="right"
            key={item.id}
            onClick={() => onRemove?.(item.id)}
            size="sm"
            theme="outlined"
            type="button"
            variant="primary"
          >
            {item.label}
          </Button>
        ))}
      </div>
    </section>
  )
}
