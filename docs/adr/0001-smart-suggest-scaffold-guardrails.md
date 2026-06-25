# ADR 0001: Smart Suggest Scaffold Guardrails

## Status

Accepted

## Context

Smart Suggest will support checkout address suggestion, validation, owned/open
dataset workflows, provider integrations, and shared UI surfaces. The first
workspace change is only a scaffold so follow-up lanes can build inside stable
package boundaries without leaking provider code into UI packages or creating a
single facade package too early.

## Decision

Create only nested workspace packages under `libs/smart-suggest`:

- `core`
- `validation`
- `datasets`
- `indexing`
- `storage`
- `integrations`
- `client`
- `react`
- `ui`
- `vanilla`

Do not create `libs/address`, `libs/smart-address`, any
`libs/smart-suggest/smart-suggest-*` folder, or a top-level
`@techsio/smart-suggest` facade package.

Old core integrations are API-first. The old PHP core may use only Smart
Suggest HTTP APIs and, later, an optional tiny global vanilla SDK surface. It
must not depend on React, Module Federation, or heavy client JavaScript.

New core integrations use direct monorepo imports first, through the nested
workspace packages. Module Federation is deferred to a later new-core /
MicroVertical rollout and is not part of this scaffold phase.

This phase does not use feature flags. Smart Suggest is not live yet, so merged
Smart Suggest work represents the default in-development behavior. Runtime and
deployment configuration remains allowed for API URLs, provider priority,
allowed origins, tenant configuration, API keys, and provider secrets.

Provider SDKs and provider-specific persistence belong outside generic UI
surfaces. `libs/ui` and `libs/smart-suggest/ui` must not import provider SDKs.
Smart Suggest domain UI should wrap or extend design-system primitives, with the
existing design-system combobox preferred for async and remote suggestions
before introducing a new suggestion primitive.

External provider results may be cached or stored only when a provider declares
an explicit `ProviderCachePolicy`. Follow-up storage and integration work must
make this policy visible in typed APIs before any provider cache writes are
possible. Raw user queries must not be logged or stored; only hashes or
normalized derived data may be persisted.

## Consequences

Follow-up PRs can add behavior to a single package without changing package
topology. Consumers will import the narrow package they need, such as
`@techsio/smart-suggest-client` or `@techsio/smart-suggest-validation`, instead
of depending on a facade package.

The scaffold intentionally contains no suggestion, validation, storage,
provider, API, React, or vanilla SDK runtime behavior.
