# ADR 0001: Smart Suggest Boundaries

## Status

Accepted

## Context

Smart Suggest must serve both the new React storefront core and old PHP-core
shops without leaking provider SDKs, storage internals, or UI assumptions across
package boundaries.

## Decision

Smart Suggest uses nested workspace packages only:

- `libs/smart-suggest/core`
- `libs/smart-suggest/validation`
- `libs/smart-suggest/datasets`
- `libs/smart-suggest/indexing`
- `libs/smart-suggest/storage`
- `libs/smart-suggest/integrations`
- `libs/smart-suggest/client`
- `libs/smart-suggest/react`
- `libs/smart-suggest/ui`
- `libs/smart-suggest/vanilla`
- `apps/smart-suggest`

There is no `libs/address`, no `libs/smart-address`, and no top-level
`@techsio/smart-suggest` facade package.

The new core consumes Smart Suggest by direct monorepo package imports first.
Module Federation is only a later rollout surface for the new core after direct
imports are stable.

The old PHP core consumes Smart Suggest through the API and, optionally, a tiny
global vanilla SDK served by `apps/smart-suggest`. It does not consume React,
Module Federation, or provider SDKs.

No feature flags are used in this project phase. Deployment/runtime config is
allowed for API URLs, provider priority, allowed origins, tenant settings,
bindings, and secrets.

Provider result storage is governed by explicit provider cache policy. Raw user
queries must not be stored or logged; only normalized/hash-derived values may
cross persistence boundaries.

## Consequences

Package boundaries are deliberately strict:

- `libs/smart-suggest/core` owns contracts and has no React, UI, Drizzle,
  Cloudflare, or provider SDK dependency.
- `libs/smart-suggest/validation` owns reusable validation policy and has no UI
  dependency.
- `libs/smart-suggest/storage` owns persistence adapters and repositories.
- `libs/smart-suggest/integrations` owns live provider adapters.
- `libs/smart-suggest/client` and `libs/smart-suggest/react` consume the API
  contract only.
- `libs/smart-suggest/ui` composes Design System primitives and Smart Suggest
  hooks but does not import storage, provider SDKs, or Cloudflare runtime code.
- `libs/ui` remains generic and does not import Smart Suggest.
