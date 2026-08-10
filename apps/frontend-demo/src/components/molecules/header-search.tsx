"use client"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Combobox } from "@techsio/ui-kit/molecules/combobox"
import { PopoverTemplate as Popover } from "@techsio/ui-kit/templates/popover"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { useSearchProducts } from "@/hooks/use-search-products"

export const HeaderSearch = () => {
  const router = useRouter()
  const searchQueryRef = useRef("")
  const [selectedValue, setSelectedValue] = useState<string[]>([])
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timer on unmount
  useEffect(
    () => () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    },
    [],
  )

  // Use search hook
  const { searchResults, searchProducts } = useSearchProducts({
    limit: 5,
  })

  const comboboxItems = searchResults.map((product) => ({
    id: product.id,
    label: product.title || "Untitled Product",
    value: product.handle || product.id,
  }))

  // Update search query and trigger debounced search
  const handleInputChange = (value: string) => {
    searchQueryRef.current = value

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      void searchProducts(value)
    }, 300)
  }

  const handleSearch = (query: string) => {
    if (query.trim()) {
      router.push(`/products?q=${encodeURIComponent(query.trim())}`)
      searchQueryRef.current = ""
      setSelectedValue([])
    }
  }

  const handleSelect = (value: string | string[]) => {
    const selectedValues = Array.isArray(value) ? value : [value]

    const [nextSelectedValue] = selectedValues
    if (nextSelectedValue !== undefined && nextSelectedValue !== "") {
      if (nextSelectedValue === "__search__") {
        handleSearch(searchQueryRef.current)
      } else if (
        searchResults.some(
          (product) =>
            (product.handle === undefined || product.handle === ""
              ? product.id
              : product.handle) === nextSelectedValue,
        )
      ) {
        router.push(`/products/${nextSelectedValue}`)
      } else {
        // Custom hodnota = search query
        handleSearch(nextSelectedValue)
      }

      searchQueryRef.current = ""
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
          if (searchQueryRef.current.trim() !== "") {
            handleSearch(searchQueryRef.current)
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
