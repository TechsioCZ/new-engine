---
name: storefront-data-customers
description: Customer profile/address integration for @techsio/storefront-data. Use when implementing customer address CRUD, profile updates, address input normalization/validation, and auth profile cache synchronization.
---

# Storefront Data Customers

Use customer hooks for account profile + address book operations.

## Workflow

1. Create service with `createMedusaCustomerService(sdk)`.
2. Create hooks with `createCustomerHooks`.
3. Pass `authQueryKeys.customer` when custom auth keys are used.
4. Add input normalization and validation callbacks for address write safety.

## Example

```ts
import {
  createCustomerHooks,
  createCustomerQueryKeys,
  createMedusaCustomerService,
} from "@techsio/storefront-data"
import { authQueryKeys } from "@/lib/storefront-data/auth"
import { cacheConfig, sdk, STOREFRONT_NAMESPACE } from "@/lib/storefront-data/shared"

const customerService = createMedusaCustomerService(sdk)
const customerQueryKeys = createCustomerQueryKeys(STOREFRONT_NAMESPACE)

export const customerHooks = createCustomerHooks({
  service: customerService,
  queryKeys: customerQueryKeys,
  authQueryKeys,
  cacheConfig,
  validateCreateAddressInput: (input) => {
    if (!input.first_name || !input.address_1 || !input.country_code) {
      return "Missing required address fields"
    }
    return null
  },
})
```

## Returned Hooks

- `useCustomerAddresses`, `useSuspenseCustomerAddresses`
- `useCreateCustomerAddress`, `useUpdateCustomerAddress`, `useDeleteCustomerAddress`
- `useUpdateCustomer`

## Rules

- In `useUpdateCustomerAddress`, provide `addressId` and remove it from payload mapper.
- Keep profile/address data on `userData` cache strategy.
- Invalidate both customer profile and auth customer keys after profile updates.
