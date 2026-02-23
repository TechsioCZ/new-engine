"use client"

import { Icon } from "@techsio/ui-kit/atoms/icon"
import Image from "next/image"
import type { KeyboardEvent, MouseEvent } from "react"
import type {
  BrandSuggestion,
  CategorySuggestion,
  ProductSuggestion,
  SearchSuggestions,
} from "@/services/search-suggestions-service"

export const SEARCH_SUGGESTION_VIEW_ALL_ID = "action:view-all"
export const SEARCH_SUGGESTIONS_LISTBOX_ID = "search-suggestions-listbox"

export function getProductSuggestionItemId(id: string): string {
  return `product:${id}`
}

export function getCategorySuggestionItemId(id: string): string {
  return `category:${id}`
}

export function getBrandSuggestionItemId(id: string): string {
  return `brand:${id}`
}

type SearchSuggestionsPanelProps = {
  listboxId: string
  query: string
  suggestions: SearchSuggestions
  highlightedItemId: string | null
  isLoading: boolean
  isError: boolean
  onHighlight: (itemId: string) => void
  onSelectProduct: (product: ProductSuggestion) => void
  onSelectCategory: (category: CategorySuggestion) => void
  onSelectBrand: (brand: BrandSuggestion) => void
  onSelectViewAll: () => void
}

type ItemHighlightProps = {
  highlightedItemId: string | null
  onHighlight: (itemId: string) => void
}

function preventBlurOnMouseDown(event: MouseEvent<HTMLElement>) {
  event.preventDefault()
}

function handleOptionKeyDown(
  event: KeyboardEvent<HTMLElement>,
  onSelect: () => void
) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault()
    onSelect()
  }
}

function getListItemClassName(isHighlighted: boolean): string {
  return `transition-colors ${isHighlighted ? "bg-overlay" : "hover:bg-overlay"}`
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="px-200 pt-200 font-semibold text-2xs text-tertiary uppercase tracking-wide">
      {children}
    </h3>
  )
}

function ProductSection({
  products,
  highlightedItemId,
  onHighlight,
  onSelectProduct,
}: {
  products: ProductSuggestion[]
  onSelectProduct: (product: ProductSuggestion) => void
} & ItemHighlightProps) {
  if (products.length === 0) {
    return null
  }

  return (
    <section aria-label="Produkty" className="border-border border-b">
      <SectionTitle>Zboží</SectionTitle>
      <ul className="py-100">
        {products.map((product) => {
          const itemId = getProductSuggestionItemId(product.id)
          const isHighlighted = highlightedItemId === itemId

          return (
            <li key={itemId}>
              <div
                aria-selected={isHighlighted}
                className={`grid w-full cursor-pointer grid-cols-[3rem_1fr_auto] items-center gap-200 px-200 py-150 text-left text-sm ${getListItemClassName(
                  isHighlighted
                )}`}
                id={itemId}
                onClick={() => onSelectProduct(product)}
                onKeyDown={(event) =>
                  handleOptionKeyDown(event, () => onSelectProduct(product))
                }
                onMouseDown={preventBlurOnMouseDown}
                onMouseEnter={() => onHighlight(itemId)}
                role="option"
                tabIndex={-1}
              >
                <Image
                  alt={product.title}
                  className="h-12 w-12 rounded-xs border border-border object-cover"
                  height={48}
                  src={product.thumbnail || "/placeholder.jpg"}
                  width={48}
                />
                <span className="line-clamp-2 text-fg leading-5">
                  {product.title}
                </span>
                <span className="ml-200 whitespace-nowrap font-bold text-fg">
                  {product.price}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function CategorySection({
  categories,
  highlightedItemId,
  onHighlight,
  onSelectCategory,
}: {
  categories: CategorySuggestion[]
  onSelectCategory: (category: CategorySuggestion) => void
} & ItemHighlightProps) {
  if (categories.length === 0) {
    return null
  }

  return (
    <section aria-label="Kategorie" className="border-border border-b">
      <SectionTitle>Kategorie</SectionTitle>
      <ul className="py-100">
        {categories.map((category) => {
          const itemId = getCategorySuggestionItemId(category.id)
          const isHighlighted = highlightedItemId === itemId

          return (
            <li key={itemId}>
              <div
                aria-selected={isHighlighted}
                className={`flex w-full cursor-pointer items-center gap-200 px-200 py-150 text-left text-sm ${getListItemClassName(
                  isHighlighted
                )}`}
                id={itemId}
                onClick={() => onSelectCategory(category)}
                onKeyDown={(event) =>
                  handleOptionKeyDown(event, () => onSelectCategory(category))
                }
                onMouseDown={preventBlurOnMouseDown}
                onMouseEnter={() => onHighlight(itemId)}
                role="option"
                tabIndex={-1}
              >
                <Icon
                  className="text-lg text-tertiary"
                  icon="icon-[mdi--folder-outline]"
                />
                <span className="line-clamp-1 text-fg">
                  {category.displayName || category.name}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function BrandsSection({
  brands,
  highlightedItemId,
  onHighlight,
  onSelectBrand,
}: {
  brands: BrandSuggestion[]
  onSelectBrand: (brand: BrandSuggestion) => void
} & ItemHighlightProps) {
  if (brands.length === 0) {
    return null
  }

  return (
    <section aria-label="Značky" className="border-border border-b">
      <SectionTitle>Značky</SectionTitle>
      <div className="flex flex-wrap gap-150 p-200">
        {brands.map((brand) => {
          const itemId = getBrandSuggestionItemId(brand.id)
          const isHighlighted = highlightedItemId === itemId

          return (
            <div
              aria-selected={isHighlighted}
              className={`cursor-pointer rounded-xs border px-150 py-100 font-semibold text-xs transition-colors ${
                isHighlighted
                  ? "border-primary bg-primary text-base"
                  : "border-border bg-base-light text-fg hover:bg-overlay"
              }`}
              id={itemId}
              key={itemId}
              onClick={() => onSelectBrand(brand)}
              onKeyDown={(event) =>
                handleOptionKeyDown(event, () => onSelectBrand(brand))
              }
              onMouseDown={preventBlurOnMouseDown}
              onMouseEnter={() => onHighlight(itemId)}
              role="option"
              tabIndex={-1}
            >
              {brand.title}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function EmptyState({ isError, query }: { isError: boolean; query: string }) {
  return (
    <div className="px-300 py-250 text-sm text-tertiary">
      {isError
        ? "Nepodařilo se načíst našeptávač."
        : `Pro "${query}" jsme nic nenašli.`}
    </div>
  )
}

function ViewAllButton({
  highlightedItemId,
  onHighlight,
  onSelectViewAll,
}: {
  highlightedItemId: string | null
  onHighlight: (itemId: string) => void
  onSelectViewAll: () => void
}) {
  const isHighlighted = highlightedItemId === SEARCH_SUGGESTION_VIEW_ALL_ID

  return (
    <div className="sticky bottom-0 border-border border-t bg-base-light p-150">
      <div
        aria-selected={isHighlighted}
        className={`flex w-full cursor-pointer items-center justify-center gap-150 rounded-xs px-200 py-150 font-semibold text-sm transition-colors ${
          isHighlighted
            ? "bg-primary text-base"
            : "bg-secondary text-fg-reverse hover:bg-primary hover:text-base"
        }`}
        id={SEARCH_SUGGESTION_VIEW_ALL_ID}
        onClick={onSelectViewAll}
        onKeyDown={(event) => handleOptionKeyDown(event, onSelectViewAll)}
        onMouseDown={preventBlurOnMouseDown}
        onMouseEnter={() => onHighlight(SEARCH_SUGGESTION_VIEW_ALL_ID)}
        role="option"
        tabIndex={-1}
      >
        <Icon icon="token-icon-search" />
        <span>Zobrazit všechny výsledky</span>
      </div>
    </div>
  )
}

export function SearchSuggestionsPanel({
  listboxId,
  query,
  suggestions,
  highlightedItemId,
  isLoading,
  isError,
  onHighlight,
  onSelectProduct,
  onSelectCategory,
  onSelectBrand,
  onSelectViewAll,
}: SearchSuggestionsPanelProps) {
  const { products, categories, brands } = suggestions
  const trimmedQuery = query.trim()
  const hasResults =
    products.length > 0 || categories.length > 0 || brands.length > 0

  return (
    <div
      aria-label="Návrhy vyhledávání"
      className="absolute top-full right-0 left-0 z-[70] mt-100 max-h-[65vh] overflow-y-auto rounded-sm border border-border bg-base-light shadow-lg"
      id={listboxId}
      role="listbox"
    >
      {isLoading ? (
        <div className="px-300 py-250 text-sm text-tertiary">Vyhledávám…</div>
      ) : null}

      {!isLoading && hasResults ? (
        <div className="pb-100">
          <ProductSection
            highlightedItemId={highlightedItemId}
            onHighlight={onHighlight}
            onSelectProduct={onSelectProduct}
            products={products}
          />
          <CategorySection
            categories={categories}
            highlightedItemId={highlightedItemId}
            onHighlight={onHighlight}
            onSelectCategory={onSelectCategory}
          />
          <BrandsSection
            brands={brands}
            highlightedItemId={highlightedItemId}
            onHighlight={onHighlight}
            onSelectBrand={onSelectBrand}
          />
        </div>
      ) : null}

      {isLoading || hasResults ? null : (
        <EmptyState isError={isError} query={trimmedQuery} />
      )}

      {trimmedQuery ? (
        <ViewAllButton
          highlightedItemId={highlightedItemId}
          onHighlight={onHighlight}
          onSelectViewAll={onSelectViewAll}
        />
      ) : null}
    </div>
  )
}
