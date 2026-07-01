# `@techsio/address`

Country-aware helpers for postal codes and phone numbers.

## I18n helper texts

Tree-shakeable, per-language modules for helper/error texts for postal code and phone inputs.

Supported countries (initial): `CZ`, `SK`, `DE`, `AT`, `PL`, `GB`  
Supported languages (initial): `cs`, `en`, `de`

### Usage

```tsx
import {
  getPhoneErrorText,
  getPhoneHelpText,
  getPostalErrorText,
  getPostalHelpText,
} from "@techsio/address/i18n/en"

// Postal code
getPostalHelpText("CZ") // "Format: XXX XX"
getPostalErrorText("CZ") // "Invalid postal code"

// Phone number
getPhoneHelpText("CZ") // "Format: 777 888 999"
getPhoneErrorText("CZ") // "Invalid phone number"
```

Import a different language:

```ts
import { getPostalHelpText } from "@techsio/address/i18n/cs"
```

