import { describe, expect, it } from 'vitest';
import {
  getAddressStatus,
  resolveDeliverySuggestKind,
  shouldOfferManualEntry,
} from './smart-suggest-demo-state';
import type { CheckoutStateCopy, DemoAddressSuggestState } from './smart-suggest-demo-state';

const checkoutCopy = {
  addressError: 'Suggestions are unavailable. You can enter the address manually.',
  addressManual: 'Manual address entry',
  addressManualAction: 'Enter address manually',
  addressScopeBlocked: 'The selected country is not supported for this field.',
  addressSelected: 'Address selected from suggestions.',
  formInvalid: 'Check the highlighted fields before continuing.',
  phoneInvalid: 'Check the courier phone number.',
  postalInvalid: 'Check the postal code for the selected country.',
  postalSelected: 'City and postal code are filled. Add the street and house number.',
  saved: 'Delivery details are ready for the next step.',
} satisfies CheckoutStateCopy;

const emptySuggestState = {
  data: {
    suggestions: [],
  },
  status: 'success',
} satisfies DemoAddressSuggestState;

describe('smart suggest demo state', () => {
  it('routes postal-code-only search text to locality lookup', () => {
    expect(resolveDeliverySuggestKind('101 00')).toBe('postal');
    expect(resolveDeliverySuggestKind('10100')).toBe('postal');
    expect(resolveDeliverySuggestKind('Vinohradska 12 Praha')).toBe('address');
  });

  it('keeps address lookup loading state visually quiet', () => {
    expect(
      getAddressStatus({
        addressInput: 'Javo',
        addressSuggestState: { status: 'loading' },
        copy: checkoutCopy,
        manualAddress: false,
        postalLocalitySelected: false,
        selectedAddress: undefined,
      }),
    ).toBeUndefined();
  });

  it('keeps empty suggestion results quiet until manual entry is selected', () => {
    expect(
      shouldOfferManualEntry({
        addressInput: 'Unseededova 404',
        addressSuggestState: emptySuggestState,
        manualAddress: false,
        selectedAddress: undefined,
      }),
    ).toBe(false);

    expect(
      getAddressStatus({
        addressInput: 'Unseededova 404',
        addressSuggestState: emptySuggestState,
        copy: checkoutCopy,
        manualAddress: false,
        postalLocalitySelected: false,
        selectedAddress: undefined,
      }),
    ).toBeUndefined();

    expect(
      getAddressStatus({
        addressInput: 'Unseededova 404',
        addressSuggestState: emptySuggestState,
        copy: checkoutCopy,
        manualAddress: true,
        postalLocalitySelected: false,
        selectedAddress: undefined,
      }),
    ).toEqual({
      status: 'warning',
      text: checkoutCopy.addressManual,
    });
  });

  it('surfaces blocked supported-country scope as a warning', () => {
    const blockedState = { status: 'blocked' } satisfies DemoAddressSuggestState;

    expect(
      shouldOfferManualEntry({
        addressInput: 'B',
        addressSuggestState: blockedState,
        manualAddress: false,
        selectedAddress: undefined,
      }),
    ).toBe(true);

    expect(
      getAddressStatus({
        addressInput: 'B',
        addressSuggestState: blockedState,
        copy: checkoutCopy,
        manualAddress: false,
        postalLocalitySelected: false,
        selectedAddress: undefined,
      }),
    ).toEqual({
      status: 'warning',
      text: checkoutCopy.addressScopeBlocked,
    });
  });

  it('keeps selected suggestion and postal locality states distinct', () => {
    expect(
      getAddressStatus({
        addressInput: '',
        addressSuggestState: { status: 'idle' },
        copy: checkoutCopy,
        manualAddress: false,
        postalLocalitySelected: true,
        selectedAddress: undefined,
      }),
    ).toEqual({
      status: 'default',
      text: checkoutCopy.postalSelected,
    });

    expect(
      getAddressStatus({
        addressInput: 'Vinohradska 12',
        addressSuggestState: emptySuggestState,
        copy: checkoutCopy,
        manualAddress: false,
        postalLocalitySelected: false,
        selectedAddress: {
          city: 'Praha',
          countryCode: 'CZ',
          line1: 'Vinohradska 12',
          postalCode: '101 00',
        },
      }),
    ).toEqual({
      status: 'success',
      text: checkoutCopy.addressSelected,
    });
  });
});
