import { Button } from "@techsio/ui-kit/atoms/button"
import { SearchForm } from "@techsio/ui-kit/molecules/search-form"

type AdminSearchProps = {
  ariaLabel: string
  clearLabel?: string
  isClearVisible?: boolean
  onClear: () => void
  onSearch: () => void
  onValueChange: (value: string) => void
  placeholder?: string
  searchLabel?: string
  value: string
}

export function AdminSearch({
  ariaLabel,
  clearLabel = "Zrusit",
  isClearVisible = false,
  onClear,
  onSearch,
  onValueChange,
  placeholder,
  searchLabel = "Hledat",
  value,
}: AdminSearchProps) {
  return (
    <div className="flex w-full max-w-xl flex-col items-stretch gap-4 sm:flex-row sm:items-center">
      <SearchForm
        className="min-w-0 flex-1"
        onSubmit={onSearch}
        onValueChange={onValueChange}
        size="md"
        value={value}
      >
        <SearchForm.Control>
          <SearchForm.Input aria-label={ariaLabel} placeholder={placeholder} className="rounded-none"/>
          <SearchForm.Button
            showSearchIcon
            theme="unstyled"
            variant="secondary"
            iconSize="md"
          >
          </SearchForm.Button>
        </SearchForm.Control>
      </SearchForm>
    </div>
  )
}
