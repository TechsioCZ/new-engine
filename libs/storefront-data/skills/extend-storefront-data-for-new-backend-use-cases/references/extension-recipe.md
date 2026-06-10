# Extension recipe

Use this order when adding a new shared backend-facing capability:

1. Decide the behavior is no longer storefront-specific.
2. Add or reuse the backend-facing types.
3. Add query-key helpers through `createQueryKey()`.
4. Add the Medusa service and forward `AbortSignal`.
5. Add hooks or helper functions that match existing package patterns.
6. Wire the new surface into `createMedusaStorefrontPreset`.
7. Add regression tests in `libs/storefront-data/tests`.
8. Only then consume the new surface from apps.

## Shared extension checks

- Keep imports direct. Do not add a barrel file.
- Reuse shared helpers instead of burying generic logic inside one domain.
- Treat tests as part of the public contract.
- Prefer extending the preset surface over asking apps to assemble low-level factories.
- If the behavior is still only one-storefront-specific, stop and keep it local.
