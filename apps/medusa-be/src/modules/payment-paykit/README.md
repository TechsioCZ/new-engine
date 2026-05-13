# PayKit Medusa Payment Providers

This module contains local Medusa v2 payment providers for PayKit-backed GoPay,
Stripe, and Comgate payments.

We intentionally do not use `@paykit-sdk/medusajs` directly. The upstream adapter
is useful as a reference, but this app needs a few Medusa-specific fixes:

- Medusa persists provider state from returned `data`, so provider payment ids
  must be stored in `data.id`.
- Medusa can call `deletePayment` during session-creation rollback before
  `data.id` exists; real `cancelPayment` remains strict and errors if `data.id`
  is missing.
- PayKit core `webhooks.handle(...)` returns `void`; this module calls the
  provider `handleWebhook(...)` directly and maps PayKit events to Medusa
  `{ action, data }`.
- GoPay uses GET callbacks, while Medusa's built-in payment hook is POST-only,
  so GoPay has a small local GET bridge.
- Provider amounts are normalized explicitly between Medusa major units and
  provider smallest units.
- Webhook data is only returned for Medusa-processable actions:
  `AUTHORIZED` and `SUCCESSFUL`.

The local adapter still keeps the useful upstream behavior where it fits Medusa's
contract:

- PayKit `cloudApiKey` is passed through when configured.
- Medusa customer billing data is passed to PayKit payment creation when present.
- `updatePayment` forwards metadata and provider metadata.
- Comgate has a provider-specific `paymentLabel` setting because PayKit Comgate
  requires that field; it is intentionally not a generic PayKit label for
  Stripe or GoPay.
- Account-holder create/retrieve/update/delete use PayKit customers when the
  provider supports them, and gracefully no-op on PayKit
  `ProviderNotSupportedError`.

Saved payment methods are intentionally not implemented here. Medusa exposes
`listPaymentMethods` and `savePaymentMethod`, but PayKit core currently does not
provide a generic payment-method facade that maps cleanly to those methods. Add
that only when PayKit exposes a public provider-agnostic API or when a
provider-specific implementation is explicitly required.
