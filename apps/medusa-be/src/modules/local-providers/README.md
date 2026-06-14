# Local Provider Wrappers

These wrappers exist for Medusa test and local provider selection in `medusa-config.ts`.

Medusa 2.15.2's local event bus and local file providers can be resolved directly from `@medusajs/medusa`, but in this pnpm install their package locations do not provide app-owned `migrations/` directories. During in-app integration tests, Medusa's migration discovery expects provider migration paths to exist. If the provider resolves inside `node_modules`, that can become an attempted write under `node_modules`, which fails in sandboxed or read-only installs.

The wrappers re-export the official Medusa local providers from an app-owned path and keep empty `migrations/` directories checked in. This gives Medusa a discoverable app-local migration path without changing provider behavior.

Do not put business logic here. Runtime provider selection remains env-driven in `medusa-config.ts`: `EVENT_BUS_PROVIDER=local` and `FILE_PROVIDER=local` use these wrappers.
