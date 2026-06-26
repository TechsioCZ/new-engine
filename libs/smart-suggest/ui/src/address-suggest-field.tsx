import type { SmartSuggestClient } from "@techsio/smart-suggest-client"
import type {
  AddressParts,
  SmartSuggestSuggestion,
  SmartSuggestTenantContext,
} from "@techsio/smart-suggest-core"
import {
  useAddressSuggest,
  useSmartSuggestClient,
} from "@techsio/smart-suggest-react"
import {
  Combobox,
  type ComboboxProps,
} from "@techsio/ui-kit/molecules/combobox"
import { type ReactNode, useMemo, useState } from "react"

export type AddressSuggestFieldProps = Omit<
  ComboboxProps<SmartSuggestSuggestion>,
  | "error"
  | "filterMode"
  | "inputValue"
  | "itemToString"
  | "itemToValue"
  | "items"
  | "loading"
  | "onChange"
  | "onInputValueChange"
  | "renderItem"
> & {
  client?: SmartSuggestClient
  countryCode?: Uppercase<string>
  language?: string
  tenant?: SmartSuggestTenantContext
  debounceMs?: number
  minQueryLength?: number
  autoComplete?: string
  inputValue?: string
  onInputValueChange?: (value: string) => void
  onSuggestionSelect?: (suggestion: SmartSuggestSuggestion) => void
  onAddressSelect?: (address: AddressParts) => void
  acceptSelection?: boolean
  error?: ReactNode
  renderSuggestion?: (suggestion: SmartSuggestSuggestion) => ReactNode
}

const itemToString = (suggestion: SmartSuggestSuggestion) =>
  suggestion.displayLabel

const itemToValue = (suggestion: SmartSuggestSuggestion) => suggestion.id

export const defaultRenderAddressSuggestion = (
  suggestion: SmartSuggestSuggestion
) => (
  <span className="flex min-w-0 flex-col gap-1">
    <span className="truncate font-medium text-sm">
      {suggestion.displayLabel}
    </span>
    {suggestion.source.attribution?.label ? (
      <span className="truncate text-combobox-muted-fg text-xs">
        {suggestion.source.attribution.label}
      </span>
    ) : null}
  </span>
)

export function AddressSuggestField({
  acceptSelection = true,
  client,
  countryCode,
  debounceMs,
  inputValue,
  language,
  minQueryLength,
  onAddressSelect,
  onInputValueChange,
  onSuggestionSelect,
  renderSuggestion = defaultRenderAddressSuggestion,
  tenant,
  ...props
}: AddressSuggestFieldProps) {
  const resolvedClient = useSmartSuggestClient(client)
  const [internalInputValue, setInternalInputValue] = useState("")
  const currentInputValue = inputValue ?? internalInputValue
  const request = useMemo(
    () => ({
      countryCode,
      kind: "address" as const,
      language,
      query: currentInputValue,
      tenant,
    }),
    [countryCode, currentInputValue, language, tenant]
  )
  const suggestState = useAddressSuggest({
    client: resolvedClient,
    debounceMs,
    minQueryLength,
    request,
  })
  const suggestions =
    suggestState.status === "success" ? suggestState.data.suggestions : []
  const selectedById = useMemo(
    () => new Map(suggestions.map((suggestion) => [suggestion.id, suggestion])),
    [suggestions]
  )

  return (
    <Combobox
      allowCustomValue
      closeOnSelect
      filterMode="remote"
      inputValue={currentInputValue}
      items={suggestions}
      itemToString={itemToString}
      itemToValue={itemToValue}
      loading={suggestState.status === "loading"}
      noResultsMessage="No matching address"
      onChange={(value) => {
        const selectedId = Array.isArray(value) ? value[0] : value
        const suggestion =
          selectedId === undefined ? undefined : selectedById.get(selectedId)

        if (suggestion === undefined) {
          return
        }

        onSuggestionSelect?.(suggestion)

        if (suggestion.address !== undefined) {
          onAddressSelect?.(suggestion.address)
        }

        if (acceptSelection) {
          resolvedClient
            .accept({
              acceptedAt: new Date().toISOString(),
              requestId:
                suggestState.status === "success"
                  ? suggestState.data.requestId
                  : "unknown",
              source: suggestion.source,
              suggestionId: suggestion.id,
              tenant,
            })
            .catch(() => {
              // Accept telemetry must never block manual checkout completion.
            })
        }
      }}
      onInputValueChange={(value) => {
        if (inputValue === undefined) {
          setInternalInputValue(value)
        }

        onInputValueChange?.(value)
      }}
      renderItem={({ item }) => renderSuggestion(item)}
      {...props}
      error={
        suggestState.status === "error"
          ? "Address suggestions are unavailable"
          : props.error
      }
    />
  )
}
