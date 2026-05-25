import { SearchForm } from "@techsio/ui-kit/molecules/search-form"

type AdminSearchProps = {
  ariaLabel: string
  onSearch: () => void
  onValueChange: (value: string) => void
  placeholder?: string
  searchLabel?: string
  value: string
}

export function AdminSearch({
  ariaLabel,
  onSearch,
  onValueChange,
  placeholder,
  searchLabel = "Hledat",
  value,
}: AdminSearchProps) {
  return (
    <div className="flex w-full max-w-xl flex-col items-stretch gap-200 sm:flex-row sm:items-center">
      <SearchForm
        className="min-w-0 flex-1"
        onSubmit={onSearch}
        onValueChange={onValueChange}
        size="md"
        value={value}
      >
        <SearchForm.Control>
          <SearchForm.Input
            aria-label={ariaLabel}
            className="rounded-none"
            placeholder={placeholder}
          />
          <SearchForm.ClearButton aria-label="Zrusit hledani" />
          <SearchForm.Button
            aria-label={searchLabel}
            iconSize="md"
            showSearchIcon
            theme="unstyled"
            variant="secondary"
          />
        </SearchForm.Control>
      </SearchForm>
    </div>
  )
}
