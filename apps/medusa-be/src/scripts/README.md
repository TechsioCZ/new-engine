# Custom CLI Script

A custom CLI script is a function to execute through Medusa's CLI tool. This is useful when creating custom Medusa tooling to run as a CLI tool.

## How to Create a Custom CLI Script?

To create a custom CLI script, create a TypeScript or JavaScript file under the `src/scripts` directory. The file must default export a function.

For example, create the file `src/scripts/my-script.ts` with the following content:

```ts title="src/scripts/my-script.ts"
import { 
  ExecArgs,
  IProductModuleService
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export default async function myScript ({
  container
}: ExecArgs) {
  const productModuleService: IProductModuleService = 
    container.resolve(Modules.PRODUCT)

  const [, count] = await productModuleService.listAndCountProducts()

  console.log(`You have ${count} product(s)`)
}
```

The function receives as a parameter an object having a `container` property, which is an instance of the Medusa Container. Use it to resolve resources in your Medusa application.

---

## How to Run Custom CLI Script?

To run the custom CLI script, run the `exec` command:

```bash
npx medusa exec ./src/scripts/my-script.ts
```

---

## Custom CLI Script Arguments

Your script can accept arguments from the command line. Arguments are passed to the function's object parameter in the `args` property.

For example:

```ts
import { ExecArgs } from "@medusajs/framework/types"

export default async function myScript ({
  args
}: ExecArgs) {
  console.log(`The arguments you passed: ${args}`)
}
```

Then, pass the arguments in the `exec` command after the file path:

```bash
npx medusa exec ./src/scripts/my-script.ts arg1 arg2
```

## Herbatica four-market seed

`herbatica-seed.ts` configures only the `sk`, `cz`, `hu`, and `ro` markets,
using `EUR`, `CZK`, `HUF`, and `RON` respectively. Before reading the catalog
feed or running the Medusa workflow, it requires
`HERBATICA_SHIPPING_PRICE_AMOUNTS_JSON`.

The value must be a reviewed JSON object with exactly the lowercase keys
`eur`, `czk`, `huf`, and `ron`. Every amount must be a finite positive number:

```text
{"eur":<approved EUR amount>,"czk":<approved CZK amount>,"huf":<approved HUF amount>,"ron":<approved RON amount>}
```

There are deliberately no exchange-rate-derived or placeholder shipping
defaults. Missing, extra, zero, negative, non-numeric, or non-finite amounts
stop the seed before the workflow runs. The generic seed does not replace the
separately reviewed Romanian demo commerce cutover and its carrier-specific
shipping authority.

The seed also requires every storefront-visible variant to already contain
exactly one finite positive base price in each of `EUR`, `CZK`, `HUF`, and
`RON`. It never converts or invents catalog prices. Missing CZK/HUF/RON price
authority is therefore an external commercial-content blocker and stops the
seed before any workflow writes.

The seed reconciles four market-isolated Sales Channels and four distinct
publishable API-key identities. Stable channel handles are stored in metadata;
stable key titles are used only to idempotently find or create Medusa
publishable keys:

| Market | Sales Channel | Publishable key title |
| --- | --- | --- |
| SK | `Herbatica Storefront SK` | `Herbatica Storefront SK Publishable Key` |
| CZ | `Herbatica Storefront CZ` | `Herbatica Storefront CZ Publishable Key` |
| HU | `Herbatica Storefront HU` | `Herbatica Storefront HU Publishable Key` |
| RO | `Herbatica Storefront RO` | `Herbatica Storefront RO Publishable Key` |

Each key is linked to exactly its one channel. Duplicate active titles,
duplicate handles, shared channels, or pre-existing multi-key/multi-channel
links stop reconciliation. The seed never logs or exports key values. After
provisioning, an operator must review the resulting Medusa IDs and place the
four Sales Channel IDs into `MARKET_SALES_CHANNEL_{SK,CZ,HU,RO}` and the four
API-key IDs into `MARKET_PUBLISHABLE_KEY_ID_{SK,CZ,HU,RO}`. Public key values
remain separately managed runtime credentials in
`MARKET_PUBLISHABLE_KEY_{SK,CZ,HU,RO}`.
