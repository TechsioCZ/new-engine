# `@techsio/storefront-i18n`

Shared infrastructure for storefront market resolution and backend-managed UI messages.

Applications own their market configuration and message keys. The library provides explicit integration points for resolving a market, loading messages from Medusa, converting dotted backend keys for `next-intl`, and creating a request-scoped `next-intl` configuration.
