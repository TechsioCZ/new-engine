# `@techsio/storefront-i18n`

Shared infrastructure for storefront market resolution and backend-managed UI messages.

Applications own their market configuration and message keys. The library provides explicit integration points for resolving a market, loading messages from Medusa, converting dotted backend keys for `next-intl`, and creating a request-scoped `next-intl` configuration.

## Install

```bash
pnpm add @techsio/storefront-i18n
```

Install `@medusajs/js-sdk` when using `medusa/messages`, and install `next-intl`
when using `next-intl/request`.

The package supports ESM imports for every public subpath. It also exposes
CommonJS entry points, including `require("@techsio/storefront-i18n/medusa/messages")`.

## Development and release validation

```bash
pnpm -C libs/storefront-i18n validate:release
```

Releases are tag-gated. A tag such as `storefront-i18n-v0.1.0` must exactly
match the package version before the trusted-publishing workflow can publish it.
