import type { AddressSuggestFieldProps } from '@techsio/smart-suggest-ui/address-suggest-field';
import { validatePhoneNumber, validatePostalCode } from '@techsio/smart-suggest-validation';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SmartSuggestAddressFieldRemote } from './smart-suggest-address-field';

const mockClient = {
  accept: () => Promise.resolve({ accepted: true }),
  suggest: () =>
    Promise.resolve({
      cacheStatus: 'miss',
      requestId: 'remote-smoke',
      suggestions: [],
    }),
  validatePhone: (request) => Promise.resolve(validatePhoneNumber(request)),
  validatePostal: (request) => Promise.resolve(validatePostalCode(request)),
} satisfies NonNullable<AddressSuggestFieldProps['client']>;

describe('SmartSuggestAddressFieldRemote', () => {
  it('renders the exposed remote with a mock Smart Suggest client', () => {
    const html = renderToString(
      createElement(SmartSuggestAddressFieldRemote, {
        client: mockClient,
        id: 'remote-address',
        label: 'Address',
      }),
    );

    expect(html).toContain('Address');
  });

  it('enforces remote defaults over consumer overrides', () => {
    const element = SmartSuggestAddressFieldRemote({
      autoComplete: 'off',
      client: mockClient,
      minQueryLength: 1,
    });

    expect(element.props).toMatchObject({
      autoComplete: 'address-line1',
      minQueryLength: 3,
    });
  });
});
