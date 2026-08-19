# URL registry initial population

The first release population command is deliberately two-phase. It reads a
frozen, complete source inventory in dry-run mode before it can write anything.
It never creates slugs from Medusa handles, Payload legacy slugs, titles, or
labels, and it never appends numeric collision suffixes.

## Zane production cutover procedure

This is a clean cutover release. The image contains no legacy public-route
fallback, so a gates-off container must never receive production traffic. Every
URL architecture gate defaults to `0` only to prevent a partially configured
registry from becoming public. Use the production image as a private one-off or
maintenance deployment for the migration and population work, then switch
traffic only after the full resolver is enabled and verified.

1. Start the new Git hash as a private one-off or maintenance deployment with
   `URL_REGISTRY_ENABLED=0`,
   `URL_PRODUCT_RESOLVER_ENABLED=0`, `URL_ARCHITECTURE_M00_ENABLED=0`, and
   `URL_ARCHITECTURE_ENABLED=0`. Do not attach the production domains or send
   customer traffic to this container. Configure the runtime database URL and
   exact four-market bindings, but keep every producer/resolver gate off.
2. Temporarily add the migration-owner connection as the private Herbatika
   service variable `URL_REGISTRY_MIGRATION_DATABASE_URL`. Open the Herbatika
   container shell in ZaneOps (or use `docker exec` on the Zane host) and run:

   ```bash
   node scripts/url-registry/migrate.mjs
   ```

   The command uses a Postgres advisory lock, verifies checksums, and is safe to
   rerun. Remove `URL_REGISTRY_MIGRATION_DATABASE_URL` from the service
   immediately after it succeeds; the runtime must never retain the DDL role.
3. Set only `URL_REGISTRY_ENABLED=1` on the private deployment and restart it.
   Startup must verify migration manifest V4 before the service becomes ready.
   The public URL resolver is still off and the deployment must remain outside
   the production request path while population is prepared.
4. Freeze Medusa/Payload publishing, export the complete authoritative manifest,
   obtain the four required G1 editorial/legal approvals, and store the manifest
   on the Zane host as a mode-`0600` file. Resolve the current Herbatika
   container ID from the Zane service, then stream the file over stdin; do not
   copy it into the image or an environment variable:

   ```bash
   docker exec <herbatika-container-id> \
     node scripts/url-registry/populate.mjs --print-taxonomy-hash

   docker exec -i <herbatika-container-id> \
     node scripts/url-registry/populate.mjs --manifest - --batch-size 25 \
     < /secure/urlr-authoritative.json \
     > /secure/urlr-dry-run.json
   ```

   Exit code `2` or any blocker aborts the cutover. Review and record the exact
   dry-run `manifestHash`, then apply the same bytes and hash:

   ```bash
   docker exec -i <herbatika-container-id> \
     node scripts/url-registry/populate.mjs --manifest - --apply \
       --confirm-manifest-hash 'sha256:...' --batch-size 25 \
     < /secure/urlr-authoritative.json \
     > /secure/urlr-apply.json
   ```

   In the same private window, audit every Payload hero carousel. Any banner
   with CTA text or a legacy `buttonHref` must have an editor-approved stable
   `buttonTarget` before traffic moves. Legacy hrefs are never interpreted,
   copied, or exposed by this release; an unresolved CTA is a cutover blocker.

5. Rerun the dry-run command with the same manifest. Continue only when it
   reports zero creates, zero blockers, and only no-ops. Drain and verify the
   invalidation outbox.
6. Enable the authenticated command/invalidation/content-projection/product-
   lifecycle producers, verify their health, then enable
   `URL_PRODUCT_RESOLVER_ENABLED=1`. Run the four-host GET/HEAD/RSC M00 target
   matrix. Enable `URL_ARCHITECTURE_M00_ENABLED=1`, rerun the matrix and bounded
   crawl, and only then enable `URL_ARCHITECTURE_ENABLED=1`. Verify the complete
   four-host matrix once more, then atomically move production traffic to this
   deployment.
7. Run the seeded release harness from a trusted operator machine. On any hard
   failure, route traffic back to the previously deployed image; never expose
   the gates-off new image, delete URLR history, or reverse migrations.

The tracked stack bootstrap deliberately does not inject the migration-owner
URL. It supplies only the runtime DML credential and disabled gates. The new
hash is therefore not a drop-in gates-off storefront: deployment must follow the
private preparation and atomic traffic-switch procedure above.

## Authoritative inventory requirements

Produce the JSON manifest immediately before the deployment window. It must
contain exactly one binding for each `sk`, `cz`, `hu`, and `ro` market and the
exact runtime Sales Channel and BCP-47 locale for that market.

Catalog rows are eligible only when all of the following evidence comes from
Medusa in one frozen export:

- the stable product/category/brand/collection ID exists;
- the product is published in the exact Sales Channel, or the M21 URL
  assignment has `publicationStatus=published` for that exact channel;
- `publicSlug` is the explicit URL assignment, not `handle`;
- an exact `Translation` record exists for `sk-SK`, `cs-CZ`, `hu-HU`, or
  `ro-RO`; a localized Store API fallback is not evidence;
- the assignment/source version and event ID are preserved.

Use the authenticated admin source export rather than enumerating Store URLs:

```text
GET /admin/url-registry/population-source?sourceKind=product&market=sk&limit=100&offset=0
GET /admin/url-registry/population-source?sourceKind=category&market=sk&limit=100&offset=0
GET /admin/url-registry/population-source?sourceKind=brand&market=sk&limit=100&offset=0
GET /admin/url-registry/population-source?sourceKind=collection&market=sk&limit=100&offset=0
GET /admin/url-registry/population-source?sourceKind=article&market=sk&limit=100&offset=0
GET /admin/url-registry/population-source?sourceKind=page&market=sk&limit=100&offset=0
```

Repeat all six source kinds for all four markets, following `nextOffset` until
`complete=true`. Pages are capped at 100. Product pages count scanned published
products and may contain fewer eligible items; this is expected and the caller
must still follow `nextOffset`. The endpoint fails closed with `503` for an
invalid assignment, missing source entity, absent exact Translation proof,
ambiguous response, corrupt product publication metadata, missing Payload
`updatedAt`, or an upstream dependency failure. Freeze Medusa/Payload publishing
during the export and abort on total/count drift between pages.

The bounded Store surfaces remain useful for storefront reads, but are not the
population inventory: `/store/url-registry/{categories|brands|collections}/assignments`
and `/store/url-registry/products/:id/source?market=...` require a market's
server-only publishable key and cannot enumerate every product.

CMS rows in the admin export come from the internal authenticated Payload reader
for published articles/pages at the exact locale, using stable document IDs and
`updatedAt` lifecycle versions. The export labels Payload `slug` as
`legacySlug`; it is never accepted directly as a URLR slug. Every CMS manifest
row therefore requires a non-empty `slugMappingId` referring to an explicitly
approved first-release mapping. Root-static content additionally requires the
deployment's complete `HERBATIKA_CMS_STATIC_PAGE_IDS` binding.

Campaigns are intentionally absent until a real campaign source and M21
assignment contract exists.

## G1 and taxonomy gate

Get the build's deterministic taxonomy hash with:

```bash
pnpm -C apps/herbatika populate:url-registry -- --print-taxonomy-hash
```

The manifest must carry that exact hash plus non-empty editorial and legal
approval references for every market. The command rejects an old or different
build hash. Code-level `SEGMENT_REGISTRY_G1` remains
`proposed-unverified`; the external approval artifact is required before apply.

## Dry-run and apply

Required runtime configuration:

- `URL_REGISTRY_ENABLED=1`
- `URL_REGISTRY_DATABASE_URL` for the migrated URLR Postgres database
- all exact market/channel/locale/publishable-key bindings used to produce the
  source inventory
- `HERBATIKA_CMS_STATIC_PAGE_IDS` and the approved CMS slug mapping artifact

Required pre-deploy seed/config state:

- URLR migrations applied by the migration owner and the runtime role granted
  only the documented URLR DML privileges;
- `MARKET_SALES_CHANNEL_SK`, `_CZ`, `_HU`, and `_RO` each contain exactly one
  real Sales Channel ID, matching every exported catalog item for that market;
- Medusa product `metadata.url_registry_publication` is schema version 1 and
  categories/brands/collections have M21 assignment rows for every intended
  published market;
- exact Medusa Translation records exist for every published catalog entity;
- `PAYLOAD_SERVER_URL` and `PAYLOAD_API_KEY` can read the exact-locale internal
  article/page inventories, with no fallback locale;
- `HERBATIKA_CMS_STATIC_PAGE_IDS` is complete for every `StaticRootPageKey` and
  the separately reviewed CMS stable-ID-to-public-slug mapping is available;
- every CTA-bearing Payload hero has an explicit stable `buttonTarget`; no
  legacy `buttonHref` is accepted as routing authority;
- publishing is paused for the bounded export, and the generated manifest's
  `sourceSnapshotHash`, G1 taxonomy hash, and four editorial/legal approval
  references are recorded in the release artifact.

Run the read-only plan and preserve its exclusive audit file:

```bash
pnpm -C apps/herbatika populate:url-registry -- \
  --manifest /secure/urlr-authoritative.json \
  --batch-size 25 \
  --output /secure/urlr-dry-run.json
```

Dry-run emits the canonical manifest hash, source snapshot hash, taxonomy hash,
create/no-op/retirement counts, and every blocker. Exit code `2` means the plan
is valid JSON but cannot be applied. No registry mutation occurs.

Only after reviewing the exact artifact, apply the same file and hash:

```bash
pnpm -C apps/herbatika populate:url-registry -- \
  --manifest /secure/urlr-authoritative.json \
  --apply \
  --confirm-manifest-hash 'sha256:...' \
  --batch-size 25 \
  --output /secure/urlr-apply.json
```

Batch size is bounded to `1..100`. Static parents are created before children;
entity writes use bounded parallel batches. Each create uses a deterministic
idempotency key and the URLR command transaction writes its command record,
audit record, current slug/path, and invalidation outbox together. Population
does not fabricate lifecycle stream sequence receipts; subsequent Medusa and
Payload changes remain owned by their transactional outbox consumers.

Immediately rerun dry-run with the same manifest. A converged result has zero
creates, zero blockers, and only no-ops. Do not enable producers or resolver
flags until this check, the pending invalidation drain, and release gates pass.

## Conflicts, retirement, and rollback

Population is initial-create-only. If an existing route differs in slug,
metadata, status, source identity, or taxonomy path, apply stops. The owning
Medusa/Payload lifecycle must reconcile it; population never steals ownership
or turns the old slug into an unreviewed alias.

A complete manifest also detects active registry rows absent from its source
inventory. They are emitted as a retirement plan and block apply. Retirement
requires an explicit owner event; rows are never deleted and tombstones/aliases
are never reclaimed.

The apply report includes route IDs, resulting versions, owners, audit IDs, and
a rollback plan. Rollback means disabling resolver/producers first, then having
each owner issue explicit `retire-route` commands at those exact versions.
Static routes are retired by the deployment/taxonomy owner. There is no
destructive SQL rollback and no attempt to restore a slug after immutable
history has been created.
