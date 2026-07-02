import type { AddressParts, SmartSuggestRequest } from '@techsio/smart-suggest-core';

export type DeliveryValidationStatus = 'idle' | 'valid' | 'invalid' | 'unknown';

export type DemoAddressSuggestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; data: { suggestions: readonly unknown[] } };

export interface CheckoutStateCopy {
  addressEmpty: string;
  addressError: string;
  addressLoading: string;
  addressManual: string;
  addressManualAction: string;
  addressSelected: string;
  formInvalid: string;
  phoneInvalid: string;
  postalSelected: string;
  postalInvalid: string;
  saved: string;
}

export interface AddressStatus {
  status: 'default' | 'success' | 'warning';
  text: string;
}

const checkoutStateCopy = {
  cs: {
    addressEmpty: 'Nenašli jsme shodu. Zkontrolujte text nebo adresu zadejte ručně.',
    addressError: 'Našeptávání teď není dostupné. Adresu můžete zadat ručně.',
    addressLoading: 'Hledáme odpovídající adresy...',
    addressManual: 'Ručně zadaná adresa',
    addressManualAction: 'Zadat adresu ručně',
    addressSelected: 'Adresa vybraná z našeptávání.',
    formInvalid: 'Zkontrolujte zvýrazněná pole a pokračujte znovu.',
    phoneInvalid: 'Zkontrolujte telefonní číslo pro kurýra.',
    postalInvalid: 'Zkontrolujte PSČ pro vybraný stát.',
    postalSelected: 'Město a PSČ jsou vyplněné. Doplňte ulici a číslo domu.',
    saved: 'Doručovací údaje jsou připravené pro další krok.',
  },
  en: {
    addressEmpty: 'No match found. Check the text or enter the address manually.',
    addressError: 'Suggestions are unavailable. You can enter the address manually.',
    addressLoading: 'Looking up matching addresses...',
    addressManual: 'Manual address entry',
    addressManualAction: 'Enter address manually',
    addressSelected: 'Address selected from suggestions.',
    formInvalid: 'Check the highlighted fields before continuing.',
    phoneInvalid: 'Check the courier phone number.',
    postalInvalid: 'Check the postal code for the selected country.',
    postalSelected: 'City and postal code are filled. Add the street and house number.',
    saved: 'Delivery details are ready for the next step.',
  },
} satisfies Record<'cs' | 'en', CheckoutStateCopy>;

export const resolveDeliverySuggestKind = (query: string): SmartSuggestRequest['kind'] => {
  const postalDigits = query.replaceAll(/\D/gu, '');
  const postalOnly = /^\s*\d[\d\s-]*\s*$/u.test(query);

  return postalOnly && postalDigits.length >= 5 ? 'postal' : 'address';
};

export const validationStatusFromBoolean = (
  isValid: boolean | 'unknown' | undefined,
): DeliveryValidationStatus => {
  if (isValid === undefined) {
    return 'idle';
  }

  if (isValid === 'unknown') {
    return 'unknown';
  }

  return isValid ? 'valid' : 'invalid';
};

export const getCheckoutCopy = (language: string): CheckoutStateCopy => {
  if (language.startsWith('cs')) {
    return checkoutStateCopy.cs;
  }

  return checkoutStateCopy.en;
};

export const shouldOfferManualEntry = ({
  addressInput,
  addressSuggestState,
  manualAddress,
  selectedAddress,
}: {
  addressInput: string;
  addressSuggestState: DemoAddressSuggestState;
  manualAddress: boolean;
  selectedAddress: AddressParts | undefined;
}) => {
  if (selectedAddress === undefined && addressInput.trim().length > 0) {
    return (
      manualAddress ||
      addressSuggestState.status === 'error' ||
      (addressSuggestState.status === 'success' &&
        addressSuggestState.data.suggestions.length === 0)
    );
  }

  return false;
};

export const getAddressStatus = ({
  addressInput,
  addressSuggestState,
  copy,
  manualAddress,
  selectedAddress,
  postalLocalitySelected,
}: {
  addressInput: string;
  addressSuggestState: DemoAddressSuggestState;
  copy: CheckoutStateCopy;
  manualAddress: boolean;
  postalLocalitySelected: boolean;
  selectedAddress: AddressParts | undefined;
}): AddressStatus | undefined => {
  if (selectedAddress === undefined) {
    if (postalLocalitySelected) {
      return { status: 'default', text: copy.postalSelected };
    }

    if (manualAddress && addressInput.trim().length > 0) {
      return { status: 'warning', text: copy.addressManual };
    }

    if (addressSuggestState.status === 'loading') {
      return { status: 'default', text: copy.addressLoading };
    }

    if (addressSuggestState.status === 'error') {
      return { status: 'warning', text: copy.addressError };
    }

    if (
      addressSuggestState.status === 'success' &&
      addressSuggestState.data.suggestions.length === 0 &&
      addressInput.trim().length >= 3
    ) {
      return { status: 'warning', text: copy.addressEmpty };
    }

    return undefined;
  }

  return { status: 'success', text: copy.addressSelected };
};

export const shouldShowAddressStatusIcon = (status: AddressStatus['status']) =>
  status === 'success' || status === 'warning';
