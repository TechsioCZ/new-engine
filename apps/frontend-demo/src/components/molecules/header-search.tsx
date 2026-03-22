"use client"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Combobox, type ComboboxItem } from "@techsio/ui-kit/molecules/combobox"
import { Popover } from "@techsio/ui-kit/molecules/popover"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { useSearchProducts } from "@/hooks/use-search-products"
import type { Product } from "@/types/product"

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

  // Use search hook
  const { searchResults, isSearching, searchProducts } = useSearchProducts({
    limit: 5,
  })

  const comboboxItems = searchResults.map((product) => ({
    id: product.id,
    value: product.handle || product.id,
    label: product.title || "Untitled Product",
  }))

  // Update search query and trigger debounced search
  const handleInputChange = useCallback(
    (value: string) => {
      setSearchQuery(value)

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // Set new timer
      debounceTimerRef.current = setTimeout(() => {
        searchProducts(value)
      }, 300)
    },
    [searchProducts]
  )

  // Create combobox items
  const searchItems: ComboboxItem<Product>[] = searchResults.map((product) => ({
    value: product.handle || product.id,
    label: product.title || "Untitled Product",
    data: product,
  }))

  // Add "View all results" option if there's a search query
  if (searchQuery && searchResults.length > 0) {
    searchItems.push({
      value: "__search__",
      label: `Zobrazit všechny výsledky pro "${searchQuery}"`,
      data: undefined,
    })
  }

  const handleSearch = (query: string) => {
    if (query.trim()) {
      router.push(`/products?q=${encodeURIComponent(query.trim())}`)
      setSearchQuery("")
      setSelectedValue([])
    }
  }

  const handleSelect = (value: string | string[]) => {
    const selectedValues = Array.isArray(value) ? value : [value]

    if (selectedValues.length > 0 && selectedValues[0]) {
      const selectedValue = selectedValues[0]

      // Zkontrolovat jestli je to existující produkt nebo custom search
      const isProductHandle = searchItems.some(
        (item) => item.value === selectedValue
      )

      if (isProductHandle) {
        router.push(`/products/${selectedValue}`)
      } else {
        // Custom hodnota = search query
        handleSearch(selectedValue)
      }

      setSearchQuery("")
      setSelectedValue([])
    }
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
          items={comboboxItems}
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
