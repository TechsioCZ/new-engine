"use client"
import { Button } from "@techsio/ui-kit/atoms/button"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Link } from "@techsio/ui-kit/atoms/link"
import { SearchForm } from "@techsio/ui-kit/molecules/search-form"
import { Header } from "@techsio/ui-kit/organisms/header"
import dynamic from "next/dynamic"
import Image from "next/image"
import NextLink from "next/link"
import { useRouter } from "next/navigation"
import { type FormEvent, type KeyboardEvent, useMemo, useState } from "react"
import logo from "@/assets/logo-n1.webp"
import { buildSearchHref } from "@/lib/url-state/search"
import { CartPopover } from "./cart-popover"
import { DesktopSubmenu } from "./desktop-submenu"
import { LoginPopover } from "./login-popover"
import {
  getBrandSuggestionItemId,
  getCategorySuggestionItemId,
  getProductSuggestionItemId,
  SEARCH_SUGGESTION_VIEW_ALL_ID,
  SEARCH_SUGGESTIONS_LISTBOX_ID,
  SearchSuggestionsPanel,
} from "./search-suggestions-panel"
import { useSearchSuggestions } from "./use-search-suggestions"

// MobileMenu uses usePathname() which is runtime data
// Skip SSR to avoid "uncached data outside Suspense" during prerender
const MobileMenu = dynamic(
  () => import("./mobile-menu").then((m) => m.MobileMenu),
  {
    ssr: false,
  }
)

type SearchSuggestionItem =
  | {
      id: string
      type: "product"
      product: ReturnType<
        typeof useSearchSuggestions
      >["suggestions"]["products"][number]
    }
  | {
      id: string
      type: "category"
      category: ReturnType<
        typeof useSearchSuggestions
      >["suggestions"]["categories"][number]
    }
  | {
      id: string
      type: "brand"
      brand: ReturnType<
        typeof useSearchSuggestions
      >["suggestions"]["brands"][number]
    }
  | {
      id: typeof SEARCH_SUGGESTION_VIEW_ALL_ID
      type: "view-all"
    }

export const N1Header = () => {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const trimmedSearchQuery = searchQuery.trim()
  const isQueryLongEnough = trimmedSearchQuery.length >= 2

  const { suggestions, isLoading, isError } = useSearchSuggestions({
    query: searchQuery,
    enabled: isSearchFocused,
  })

  const suggestionItems = useMemo(() => {
    const items: SearchSuggestionItem[] = [
      ...suggestions.products.map((product) => ({
        id: getProductSuggestionItemId(product.id),
        type: "product" as const,
        product,
      })),
      ...suggestions.categories.map((category) => ({
        id: getCategorySuggestionItemId(category.id),
        type: "category" as const,
        category,
      })),
      ...suggestions.brands.map((brand) => ({
        id: getBrandSuggestionItemId(brand.id),
        type: "brand" as const,
        brand,
      })),
    ]

    if (trimmedSearchQuery) {
      items.push({
        id: SEARCH_SUGGESTION_VIEW_ALL_ID,
        type: "view-all" as const,
      })
    }

    return items
  }, [suggestions, trimmedSearchQuery])

  const highlightedItem =
    highlightedIndex >= 0 ? suggestionItems[highlightedIndex] : null
  const shouldShowSuggestions = isSearchFocused && isQueryLongEnough
  const activeDescendantId =
    shouldShowSuggestions && highlightedItem ? highlightedItem.id : undefined

  const closeSuggestions = () => {
    setIsSearchFocused(false)
    setHighlightedIndex(-1)
  }

  const navigateToSearch = (query: string) => {
    const normalizedQuery = query.trim()
    if (!normalizedQuery) {
      return
    }

    closeSuggestions()
    router.push(buildSearchHref({ q: normalizedQuery }))
  }

  const navigateToHighlightedItem = () => {
    if (!highlightedItem) {
      return false
    }

    if (highlightedItem.type === "product") {
      closeSuggestions()
      router.push(`/produkt/${highlightedItem.product.handle}`)
      return true
    }

    if (highlightedItem.type === "category") {
      closeSuggestions()
      router.push(
        buildSearchHref({
          q: trimmedSearchQuery,
          category_id: highlightedItem.category.id,
        })
      )
      return true
    }

    if (highlightedItem.type === "brand") {
      navigateToSearch(highlightedItem.brand.title)
      return true
    }

    if (highlightedItem.type === "view-all") {
      navigateToSearch(trimmedSearchQuery)
      return true
    }

    return false
  }

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    navigateToSearch(searchQuery)
  }

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      closeSuggestions()
      return
    }

    if (!shouldShowSuggestions || suggestionItems.length === 0) {
      return
    }

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setHighlightedIndex((prev) => (prev + 1) % suggestionItems.length)
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      setHighlightedIndex((prev) =>
        prev <= 0 ? suggestionItems.length - 1 : prev - 1
      )
      return
    }

    if (event.key === "Enter" && highlightedItem) {
      event.preventDefault()
      navigateToHighlightedItem()
    }
  }

  const handleSuggestionHighlight = (itemId: string) => {
    const index = suggestionItems.findIndex((item) => item.id === itemId)
    setHighlightedIndex(index)
  }

  const handleProductSelect = (handle: string) => {
    closeSuggestions()
    router.push(`/produkt/${handle}`)
  }

  const handleCategorySelect = (categoryId: string) => {
    closeSuggestions()
    router.push(
      buildSearchHref({
        q: trimmedSearchQuery,
        category_id: categoryId,
      })
    )
  }

  const topHeaderLinks = [
    {
      href: "/obchodni-podminky",
      label: "Obchodní podmínky",
    },
    {
      href: "/novinky",
      label: "Novinky",
    },
    {
      href: "/kontakty",
      label: "Kontakty",
    },
  ]

  return (
    <Header
      className="z-50 flex h-fit max-h-96 w-full flex-col"
      direction="vertical"
    >
      <Header.Container className="flex items-center justify-between bg-highlight px-400 py-150">
        <div className="flex items-center gap-200 font-normal text-2xs text-fg-reverse">
          <Link as={NextLink} href="mailto:office@n1shop.cz">
            <Icon className="mr-200" icon="icon-[mdi--email-outline]" />
            <span className="hover:text-primary hover:underline">
              office@n1shop.cz
            </span>
          </Link>
          <span className="h-1.5 w-1.5 bg-secondary" />
          {topHeaderLinks.map((link) => (
            <Link
              as={NextLink}
              className="hover:text-primary hover:underline"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex gap-200">
          <Icon icon="icon-[cif--cz]" />
          <Icon icon="icon-[cif--gb]" />
        </div>
      </Header.Container>
      <Header.Container className="z-40 flex h-header-container justify-between bg-base-dark px-500 py-300">
        <div className="flex h-full items-center gap-750">
          <NextLink href="/">
            <Image
              alt="N1 Shop Logo"
              className="h-auto w-auto"
              height={250}
              src={logo}
              width={250}
            />
          </NextLink>
          <div className="relative w-search max-header-desktop:hidden">
            <SearchForm
              className="w-full"
              onSubmit={handleSearchSubmit}
              onValueChange={(value) => {
                setSearchQuery(value)
                setHighlightedIndex(-1)
              }}
              size="sm"
              value={searchQuery}
            >
              <SearchForm.Control>
                <SearchForm.Input
                  aria-activedescendant={activeDescendantId}
                  aria-autocomplete="list"
                  aria-controls={
                    shouldShowSuggestions
                      ? SEARCH_SUGGESTIONS_LISTBOX_ID
                      : undefined
                  }
                  aria-expanded={shouldShowSuggestions}
                  className="bg-base-light"
                  name="q"
                  onBlur={() => closeSuggestions()}
                  onFocus={() => setIsSearchFocused(true)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Hledat produkty..."
                  role="combobox"
                />
                <SearchForm.Button showSearchIcon />
              </SearchForm.Control>
            </SearchForm>

            {shouldShowSuggestions ? (
              <SearchSuggestionsPanel
                highlightedItemId={highlightedItem?.id || null}
                isError={isError}
                isLoading={isLoading}
                listboxId={SEARCH_SUGGESTIONS_LISTBOX_ID}
                onHighlight={handleSuggestionHighlight}
                onSelectBrand={(brand) => navigateToSearch(brand.title)}
                onSelectCategory={(category) =>
                  handleCategorySelect(category.id)
                }
                onSelectProduct={(product) =>
                  handleProductSelect(product.handle)
                }
                onSelectViewAll={() => navigateToSearch(trimmedSearchQuery)}
                query={trimmedSearchQuery}
                suggestions={suggestions}
              />
            ) : null}
          </div>
        </div>

        <Header.Actions className="relative text-2xl">
          <Header.Hamburger className="text-2xl text-fg-reverse" />
          <Button
            className="text-white"
            icon="icon-[mdi--heart-outline]"
            size="current"
            theme="unstyled"
          />
          <LoginPopover />
          <CartPopover />
        </Header.Actions>
      </Header.Container>

      <DesktopSubmenu />
      <MobileMenu />
    </Header>
  )
}
