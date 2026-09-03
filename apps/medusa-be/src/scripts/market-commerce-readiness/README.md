# Four-market commerce readiness collector

This collector is read-only. It queries product, inventory, region, shipping,
tax, and payment-provider configuration through Medusa's query graph. It has no
cart, order, payment-session, workflow, or mutation dependency.

All expected market bindings, approved prices, checkout canaries, and shared
catalog/inventory baselines come from exact SHA-256-bound reviewed artifacts.
The runtime environment must exactly match the reviewed release identity before
the first Medusa query runs.

Run with repeated `medusa exec` argument tokens:

```sh
pnpm exec medusa exec ./src/scripts/market-commerce-readiness/cli.ts \
  --args=--authority \
  --args=/review/four-market-commerce-authority.json \
  --args=--expected-authority-sha256 \
  --args=<lowercase-sha256> \
  --args=--proof-output-directory \
  --args=/evidence/markets \
  --args=--receipt-output \
  --args=/evidence/operations/four-market-commerce-collection.json
```

The collector writes four canonical JSON+LF market proofs with mode `0600`,
then publishes the shared collection receipt last. Publication uses a same-dir
temporary file and an atomic hard link, so existing evidence fails with
`EEXIST` and is never overwritten.

Required runtime identity variables:

- `BACKEND_BUILD_HASH`
- `ZANE_DEPLOYMENT_ID`
- `RELEASE_SHA`
- `ZANE_DEPLOYMENT_SLOT` (`blue` or `green`)
- `MARKET_COMMERCE_RELEASE_ID` (or `RELEASE_ID`)
- `MARKET_COMMERCE_ENVIRONMENT_ID` (or `RO_DEMO_ENVIRONMENT_ID`)
- `MARKET_COMMERCE_DATABASE_INSTANCE_ID` (or `RO_DEMO_DATABASE_INSTANCE_ID`)
- `DATABASE_URL` (credentials are never emitted or hashed)
