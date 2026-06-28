# @techsio/smart-suggest-client

Browser-safe Smart Suggest API client.

## Effect client

Use `createSmartSuggestEffectClient`. Requests are lazy Effect programs backed
by the generated `SmartSuggestHttpApi` client.

```ts
import { createSmartSuggestEffectClient } from "@techsio/smart-suggest-client"

const client = createSmartSuggestEffectClient({ apiBaseUrl: "/api" })

const program = client.suggest({
  countryCode: "CZ",
  kind: "address",
  query: "Praha",
})
```
