import { AddressSuggestField } from '@techsio/smart-suggest-ui/address-suggest-field';
import type { AddressSuggestFieldProps } from '@techsio/smart-suggest-ui/address-suggest-field';

export type SmartSuggestAddressFieldRemoteProps = AddressSuggestFieldProps;

export const SmartSuggestAddressFieldRemote = (props: SmartSuggestAddressFieldRemoteProps) => (
  <AddressSuggestField autoComplete="address-line1" minQueryLength={3} {...props} />
);

export default SmartSuggestAddressFieldRemote;
