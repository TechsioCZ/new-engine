# Smart Suggest Shared Contracts

`@smart-suggest/shared-contracts` contains generated workspace contracts for
routes, ownership, topology, events, and public-surface readiness.

The canonical Smart Suggest HTTP protocol now lives in
`@smart-suggest/shell-super-app/api`, matching the UltraModern direct Effect API
topology:

- server implementation: `apps/shell-super-app/api/index.ts`
- shared contract: `apps/shell-super-app/shared/api.ts`
- client entry: `apps/shell-super-app/src/api/smart-suggest-client.ts`

Do not add API schema, URL builder, or error envelope definitions to this
package. API consumers should import the direct app API export.
