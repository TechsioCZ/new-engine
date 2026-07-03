import type {
  AddressParts,
  SmartSuggestRequest,
  SmartSuggestResponse,
  SmartSuggestSuggestion,
  SmartSuggestTenantContext,
} from "@techsio/smart-suggest-core";
import {
  detachSmartSuggestEffectAtBrowserEdge,
  type SmartSuggestAsyncState,
  type SmartSuggestEffectClient,
  useAddressSuggest,
  useSmartSuggestClient,
} from "@techsio/smart-suggest-react";
import { Combobox, type ComboboxProps } from "@techsio/ui-kit/molecules/combobox";
import { type ReactNode, useEffect, useMemo, useState } from "react";

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
  | "allowCustomValue"
  | "closeOnSelect"
> & {
  client?: SmartSuggestEffectClient;
  countryCode?: Uppercase<string>;
  countryCodes?: readonly Uppercase<string>[];
  language?: string;
  tenant?: SmartSuggestTenantContext;
  limit?: number;
  debounceMs?: number;
  minQueryLength?: number;
  autoComplete?: string;
  inputValue?: string;
  onInputValueChange?: (value: string) => void;
  onSuggestStateChange?: (state: SmartSuggestAsyncState<SmartSuggestResponse>) => void;
  onSuggestionSelect?: (suggestion: SmartSuggestSuggestion) => void;
  onAddressSelect?: (address: AddressParts) => void;
  acceptSelection?: boolean;
  error?: ReactNode;
  suggestUnavailableMessage?: ReactNode;
  renderSuggestion?: (suggestion: SmartSuggestSuggestion) => ReactNode;
};

const itemToString = (suggestion: SmartSuggestSuggestion) => suggestion.displayLabel;

const itemToValue = (suggestion: SmartSuggestSuggestion) => suggestion.id;

export const defaultRenderAddressSuggestion = (suggestion: SmartSuggestSuggestion) => (
  <span className="flex min-w-0 flex-col gap-1">
    <span className="truncate font-medium text-sm">{suggestion.displayLabel}</span>
    {suggestion.source.attribution?.label ? (
      <span className="truncate text-combobox-muted-fg text-xs">
        {suggestion.source.attribution.label}
      </span>
    ) : null}
  </span>
);

export function AddressSuggestField({
  acceptSelection = true,
  client,
  countryCode,
  countryCodes,
  debounceMs,
  error,
  inputValue,
  language,
  limit,
  minQueryLength,
  noResultsMessage,
  onAddressSelect,
  onInputValueChange,
  onSuggestStateChange,
  onSuggestionSelect,
  renderSuggestion = defaultRenderAddressSuggestion,
  suggestUnavailableMessage,
  tenant,
  ...props
}: AddressSuggestFieldProps) {
  const resolvedClient = useSmartSuggestClient(client);
  const [internalInputValue, setInternalInputValue] = useState("");
  const currentInputValue = inputValue ?? internalInputValue;
  const request = useMemo(() => {
    const nextRequest: SmartSuggestRequest = {
      kind: "address",
      query: currentInputValue,
    };

    if (countryCode !== undefined) {
      nextRequest.countryCode = countryCode;
    }

    if (countryCodes !== undefined) {
      nextRequest.countryCodes = countryCodes;
    }

    if (language !== undefined) {
      nextRequest.language = language;
    }

    if (limit !== undefined) {
      nextRequest.limit = limit;
    }

    if (tenant !== undefined) {
      nextRequest.tenant = tenant;
    }

    return nextRequest;
  }, [countryCode, countryCodes, currentInputValue, language, limit, tenant]);
  const suggestOptions: Parameters<typeof useAddressSuggest>[0] = {
    client: resolvedClient,
    request,
  };

  if (debounceMs !== undefined) {
    suggestOptions.debounceMs = debounceMs;
  }

  if (minQueryLength !== undefined) {
    suggestOptions.minQueryLength = minQueryLength;
  }

  const suggestState = useAddressSuggest(suggestOptions);
  useEffect(() => {
    onSuggestStateChange?.(suggestState);
  }, [onSuggestStateChange, suggestState]);

  // Keep previous suggestions visible while a new request is debouncing or in
  // flight, and even across a single transient fetch error, so the list stays
  // stable instead of collapsing during normal typing.
  const suggestions = suggestState.data?.suggestions ?? [];
  const selectedById = useMemo(
    () => new Map(suggestions.map((suggestion) => [suggestion.id, suggestion])),
    [suggestions],
  );
  const acceptSuggestion = (suggestion: SmartSuggestSuggestion) => {
    if (!acceptSelection) {
      return;
    }

    const requestId = suggestState.data?.requestId ?? "unknown";

    detachSmartSuggestEffectAtBrowserEdge(
      resolvedClient.accept({
        acceptedAt: new Date().toISOString(),
        requestId,
        source: suggestion.source,
        suggestionId: suggestion.id,
        ...(tenant === undefined ? {} : { tenant }),
      }),
      () => {
        // Accept telemetry must never block manual checkout completion.
      },
    );
  };
  const handleChange: NonNullable<ComboboxProps<SmartSuggestSuggestion>["onChange"]> = (value) => {
    const selectedId = Array.isArray(value) ? value[0] : value;
    const suggestion = selectedId === undefined ? undefined : selectedById.get(selectedId);

    if (suggestion === undefined) {
      return;
    }

    onSuggestionSelect?.(suggestion);

    if (suggestion.address !== undefined) {
      onAddressSelect?.(suggestion.address);
    }

    acceptSuggestion(suggestion);
  };

  // A transient fetch error while typing must not surface unavailable or
  // manual-entry UX as long as previous suggestions are still shown. Only when
  // there is no data to fall back on do we honor the opt-in unavailable message.
  const transientUnavailable =
    suggestState.status === "error" && suggestState.data === undefined
      ? suggestUnavailableMessage
      : undefined;

  return (
    <Combobox
      {...props}
      allowCustomValue
      closeOnSelect
      error={transientUnavailable ?? error}
      filterMode="remote"
      inputValue={currentInputValue}
      items={suggestions}
      itemToString={itemToString}
      itemToValue={itemToValue}
      loading={suggestState.status === "loading"}
      noResultsMessage={noResultsMessage}
      onChange={handleChange}
      onInputValueChange={(value) => {
        if (inputValue === undefined) {
          setInternalInputValue(value);
        }

        onInputValueChange?.(value);
      }}
      renderItem={({ item }) => renderSuggestion(item)}
    />
  );
}
