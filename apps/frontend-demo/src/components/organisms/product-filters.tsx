"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { Dialog } from "@techsio/ui-kit/molecules/dialog"
import { useState } from "react"
import data, { categoryTree } from "@/lib/static-data/categories"
import { CategoryTreeFilter } from "../category-tree-filter"
import { FilterSection } from "../molecules/filter-section"

export interface FilterState {
  categories: Set<string>
  sizes: Set<string>
}

interface ProductFiltersProps {
  className?: string
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  hideCategories?: boolean
}

export function ProductFilters({
  className,
  filters,
  onFiltersChange,
  hideCategories = false,
}: ProductFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleCategoryChange = (newCategoryIds: string[]) => {
    updateFilters({ categories: new Set(newCategoryIds) })
  }

  const updateFilters = (updates: Partial<FilterState>) => {
    onFiltersChange({
      ...filters,
      ...updates,
    })
  }

  const clearAllFilters = () => {
    onFiltersChange({
      categories: new Set(),
      sizes: new Set(),
    })
  }

  const hasActiveFilters = filters.categories.size > 0 || filters.sizes.size > 0

  // Count active filters for mobile button
  const activeFilterCount = filters.categories.size + filters.sizes.size

  const SIZES = ["XS", "S", "M", "L", "XL", "XXL"]

  const renderCategories = () => (
    <FilterSection title="Kategorie">
      {categoryTree.length > 0 && (
        <>
          <div className="mb-2 text-gray-500 text-xs">
            Tip: Filtry se aplikují pouze na koncové podkategorie
          </div>
          <CategoryTreeFilter
            categories={categoryTree}
            leafCategories={data.leafCategories}
            leafParents={data.leafParents}
            onSelectionChange={handleCategoryChange}
          />
        </>
      )}
    </FilterSection>
  )

  const renderSizes = () => {
    return (
      <FilterSection
        onClear={
          filters.sizes.size > 0
            ? () => updateFilters({ sizes: new Set() })
            : undefined
        }
        title="Velikost"
      >
        <div className="flex flex-wrap gap-2">
          {SIZES.map((size) => {
            const isSelected = filters.sizes.has(size)
            return (
              <Button
                className="rounded-sm border"
                key={size}
                onClick={() => {
                  const newSizes = new Set<string>()
                  // If clicking on already selected size, deselect it
                  // Otherwise, select only this size
                  if (!isSelected) {
                    newSizes.add(size)
                  }
                  updateFilters({ sizes: newSizes })
                }}
                size="sm"
                theme={isSelected ? "solid" : "borderless"}
              >
                {size}
              </Button>
            )
          })}
        </div>
      </FilterSection>
    )
  }

  const filterContent = (
    <>
      {/* Clear All Filters */}
      {hasActiveFilters && (
        <div className="mb-4 text-right">
          <Button
            className="cursor-pointer text-primary text-sm hover:underline"
            onClick={clearAllFilters}
            theme="borderless"
          >
            Vymazat všechny filtry
          </Button>
        </div>
      )}

      {/* Categories Filter */}
      {!hideCategories && renderCategories()}

      {/* Sizes Filter */}
      {renderSizes()}
    </>
  )

  return (
    <div className={`w-full ${className || ""}`}>
      {/* Mobile Filter Button */}
      <Button
        className="flex items-center bg-surface md:hidden"
        icon="icon-[mdi--filter-variant]"
        onClick={() => setIsOpen(true)}
        size="sm"
        theme="outlined"
      >
        Filtry
        {activeFilterCount > 0 && (
          <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-white text-xs">
            {activeFilterCount}
          </span>
        )}
      </Button>

      {/* Desktop Filters */}
      <div className="hidden md:block">{filterContent}</div>

      {/* Mobile Filter Dialog */}
      <div className="hidden">
        <Dialog
          description="Upřesněte hledání produktů"
          onOpenChange={({ open }) => setIsOpen(open)}
          open={isOpen}
          title="Filtry"
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="font-semibold text-lg">Filtry</h2>
              <Button
                aria-label="Zavřít filtry"
                icon="icon-[mdi--close]"
                onClick={() => setIsOpen(false)}
                size="sm"
                theme="borderless"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4">{filterContent}</div>
            <div className="flex gap-2 border-t p-4">
              <Button
                className="flex-1"
                onClick={() => {
                  clearAllFilters()
                  setIsOpen(false)
                }}
                size="sm"
                theme="outlined"
              >
                Vymazat vše
              </Button>
              <Button
                className="flex-1"
                onClick={() => setIsOpen(false)}
                size="sm"
                theme="solid"
              >
                Použít filtry
              </Button>
            </div>
          </div>
        </Dialog>
      </div>
    </div>
  )
}
