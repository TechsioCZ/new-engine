"use client"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Combobox, type ComboboxItem } from "@techsio/ui-kit/molecules/combobox"
import { Popover } from "@techsio/ui-kit/molecules/popover"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { useSearchProducts } from "@/hooks/use-search-products"
import { buildProductsHref, PRODUCTS_ROUTE } from "@/lib/url-state/products"
import type { Product } from "@/types/product"

const VIEW_ALL_RESULTS_VALUE = "__search__"

export function HeaderSearch() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedValue, setSelectedValue] = useState<string[]>([])
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timer on unmount
  useEffect(
    () => () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    },
    []
  )

  const { searchResults, searchProducts } = useSearchProducts({
    limit: 5,
  })

  const handleInputChange = useCallback(
    (value: string) => {
      setSearchQuery(value)

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      debounceTimerRef.current = setTimeout(() => {
        searchProducts(value)
      }, 300)
    },
    [searchProducts]
  )

  const searchItems: ComboboxItem<Product>[] = searchResults.map((product) => ({
    value: product.handle || product.id,
    label: product.title || "Untitled Product",
    data: product,
  }))

  if (searchQuery.trim() && searchResults.length > 0) {
    searchItems.push({
      value: VIEW_ALL_RESULTS_VALUE,
      label: `Zobrazit vsechny vysledky pro "${searchQuery.trim()}"`,
      data: undefined,
    })
  }

  const handleSearch = (query: string) => {
    const href = buildProductsHref({ q: query })
    if (href !== PRODUCTS_ROUTE) {
      router.push(href)
      setSearchQuery("")
      setSelectedValue([])
    }
  }

  const handleSelect = (value: string | string[]) => {
    const selected = Array.isArray(value) ? value[0] : value

    if (!selected) {
      return
    }

    if (selected === VIEW_ALL_RESULTS_VALUE) {
      handleSearch(searchQuery)
      return
    }

    const selectedProduct = searchResults.find(
      (item) => (item.handle || item.id) === selected
    )

    if (selectedProduct) {
      if (selectedProduct.handle) {
        router.push(`/products/${selectedProduct.handle}`)
      } else if (searchQuery.trim()) {
        handleSearch(searchQuery)
      }

      setSearchQuery("")
      setSelectedValue([])
      return
    }

    handleSearch(selected)
  }

  return (
    <Popover
      contentClassName="z-10"
      id="header-search-popover"
      trigger={
        <Icon
          className="text-header-icon-size text-tertiary"
          icon="token-icon-search"
        />
      }
      triggerClassName="data-[state=open]:outline-none"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (searchQuery.trim()) {
            handleSearch(searchQuery)
          }
        }}
      >
        <Combobox
          allowCustomValue={true}
          autoFocus={true}
          clearable={false}
          closeOnSelect
          items={searchItems}
          onChange={handleSelect}
          onInputValueChange={handleInputChange}
          placeholder="Hledat produkty..."
          size="sm"
          value={selectedValue}
        />
      </form>
    </Popover>
  )
}
