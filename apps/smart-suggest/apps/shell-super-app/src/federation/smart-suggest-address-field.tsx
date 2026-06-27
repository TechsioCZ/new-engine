import { AddressSuggestField } from '@techsio/smart-suggest-ui/address-suggest-field';
import type { AddressSuggestFieldProps } from '@techsio/smart-suggest-ui/address-suggest-field';
import { createElement } from 'react';

export type SmartSuggestAddressFieldRemoteProps = AddressSuggestFieldProps;

export const SmartSuggestAddressFieldRemote = (props: SmartSuggestAddressFieldRemoteProps) =>
  createElement(AddressSuggestField, {
    ...props,
    autoComplete: 'address-line1',
    minQueryLength: 3,
  });

export default SmartSuggestAddressFieldRemote;
