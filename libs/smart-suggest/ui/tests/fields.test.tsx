import { createElement, isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fail } from 'effect/Effect';

import type { SmartSuggestSuggestion } from '@techsio/smart-suggest-core';
import { createMockSmartSuggestClient } from '@techsio/smart-suggest-react';

const comboboxProps = vi.hoisted(() => [] as Array<Record<string, unknown>>);
const addressSuggestState = vi.hoisted(
  () =>
    ({
      current: { status: 'idle' },
    }) as {
      current:
        | { status: 'idle' | 'loading' }
        | { data: { requestId: string; suggestions: SmartSuggestSuggestion[] }; status: 'success' }
        | { error: unknown; status: 'error' };
    },
);

vi.mock('@techsio/ui-kit/molecules/combobox', () => ({
  Combobox: (props: Record<string, unknown>) => {
    comboboxProps.push(props);
    return null;
  },
}));

vi.mock('@techsio/smart-suggest-react', async () => {
  const actual = await vi.importActual<typeof import('@techsio/smart-suggest-react')>(
    '@techsio/smart-suggest-react',
  );

  return {
    ...actual,
    useAddressSuggest: () => addressSuggestState.current,
    useSmartSuggestClient: (client?: unknown) => client ?? actual.createMockSmartSuggestClient(),
  };
});

import { AddressSuggestField, defaultRenderAddressSuggestion } from '../src/address-suggest-field';
import { PhoneValidationField } from '../src/phone-validation-field';
import { PostalValidationField } from '../src/postal-validation-field';

describe('smart suggest UI wrappers', () => {
  beforeEach(() => {
    comboboxProps.length = 0;
    addressSuggestState.current = { status: 'idle' };
  });

  it('renders address suggestion item content from core suggestion contracts', () => {
    expect(
      isValidElement(
        defaultRenderAddressSuggestion({
          confidence: 0.9,
          displayLabel: 'Václavské náměstí 832/19, Praha',
          id: 'address-1',
          kind: 'address',
          source: {
            id: 'ruian',
            kind: 'owned-dataset',
            name: 'RUIAN',
          },
        }),
      ),
    ).toBe(true);
  });

  it('keeps address combobox remote wiring fixed while allowing localized messages', () => {
    const props = {
      allowCustomValue: false,
      client: createMockSmartSuggestClient(),
      closeOnSelect: false,
      filterMode: 'local',
      noResultsMessage: 'Žiadna zhoda',
      suggestUnavailableMessage: 'Návrhy adries nie sú dostupné',
    } as unknown as Parameters<typeof AddressSuggestField>[0];

    renderToStaticMarkup(createElement(AddressSuggestField, props));

    expect(comboboxProps.at(-1)).toMatchObject({
      allowCustomValue: true,
      closeOnSelect: true,
      filterMode: 'remote',
      noResultsMessage: 'Žiadna zhoda',
    });
  });

  it('keeps manual address entry controlled by the caller', () => {
    const onInputValueChange = vi.fn();

    renderToStaticMarkup(
      createElement(AddressSuggestField, {
        client: createMockSmartSuggestClient(),
        inputValue: 'Manual street',
        onInputValueChange,
      }),
    );

    expect(comboboxProps.at(-1)).toMatchObject({
      allowCustomValue: true,
      inputValue: 'Manual street',
    });
    const onInputValueChangeProp = comboboxProps.at(-1)?.['onInputValueChange'];

    expect(onInputValueChangeProp).toBeTypeOf('function');
    if (typeof onInputValueChangeProp === 'function') {
      onInputValueChangeProp('Manual street 2');
    }
    expect(onInputValueChange).toHaveBeenCalledWith('Manual street 2');
  });

  it('selects structured address suggestions and keeps accept telemetry non-blocking', () => {
    const suggestion: SmartSuggestSuggestion = {
      address: {
        city: 'Praha',
        countryCode: 'CZ',
        houseNumber: '832',
        orientationNumber: '19',
        postalCode: '110 00',
        street: 'Václavské náměstí',
      },
      confidence: 0.98,
      displayLabel: 'Václavské náměstí 832/19, 110 00 Praha',
      id: 'suggestion-1',
      kind: 'address',
      source: {
        id: 'ruian-cz-sample',
        kind: 'owned-dataset',
        name: 'RUIAN CZ sample',
      },
    };
    const accept = vi.fn(() => fail(new Error('telemetry offline')));
    const onAddressSelect = vi.fn();
    const onSuggestionSelect = vi.fn();

    addressSuggestState.current = {
      data: {
        requestId: 'request-1',
        suggestions: [suggestion],
      },
      status: 'success',
    };

    renderToStaticMarkup(
      createElement(AddressSuggestField, {
        client: createMockSmartSuggestClient({ accept }),
        onAddressSelect,
        onSuggestionSelect,
        tenant: { cartId: 'cart-1', tenantId: 'tenant-1' },
      }),
    );

    const onChange = comboboxProps.at(-1)?.['onChange'];

    expect(onChange).toBeTypeOf('function');
    if (typeof onChange === 'function') {
      expect(() => onChange('suggestion-1')).not.toThrow();
    }
    expect(onSuggestionSelect).toHaveBeenCalledWith(suggestion);
    expect(onAddressSelect).toHaveBeenCalledWith(suggestion.address);
    expect(accept).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'request-1',
        source: suggestion.source,
        suggestionId: suggestion.id,
        tenant: { cartId: 'cart-1', tenantId: 'tenant-1' },
      }),
    );
  });

  it('shows the localized unavailable message when suggestions fail', () => {
    addressSuggestState.current = {
      error: new Error('network unavailable'),
      status: 'error',
    };

    renderToStaticMarkup(
      createElement(AddressSuggestField, {
        client: createMockSmartSuggestClient(),
        error: 'Field error',
        suggestUnavailableMessage: 'Návrhy adries nie sú dostupné',
      }),
    );

    expect(comboboxProps.at(-1)).toMatchObject({
      error: 'Návrhy adries nie sú dostupné',
    });
  });

  it('exposes React components', () => {
    expect(AddressSuggestField).toBeTypeOf('function');
    expect(PhoneValidationField).toBeTypeOf('function');
    expect(PostalValidationField).toBeTypeOf('function');
    expect(isValidElement(createElement(AddressSuggestField, {}))).toBe(true);
    expect(
      isValidElement(
        createElement(PhoneValidationField, {
          defaultCountry: 'CZ',
          label: 'Phone',
        }),
      ),
    ).toBe(true);
    expect(
      isValidElement(
        createElement(PostalValidationField, {
          countryCode: 'CZ',
          id: 'postal-code',
          label: 'Postal code',
        }),
      ),
    ).toBe(true);
  });
});
