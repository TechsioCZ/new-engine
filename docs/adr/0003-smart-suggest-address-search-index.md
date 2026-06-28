# ADR 0003: Smart Suggest Address Search Index

## Status

Accepted

## Context

Smart Suggest must serve Czech address autocomplete from owned replicated data
without calling live providers on every checkout keystroke. The existing storage
shape indexes addresses through `smart_suggest_address_search_tokens`, one row
per address/token/prefix. That preserves many autocomplete behaviors, but it
multiplies row count and pushes a full-country Czech import toward Cloudflare
D1's per-database storage limit before sharding and operational headroom are
considered.

Cloudflare D1 supports SQLite FTS5, so full-text search can be evaluated as a
compact derived index. D1 export does not support databases containing virtual
tables, so any FTS5 index must be treated as rebuildable derived data in backup
and restore flows.

## Decision

Use an FTS5-backed address search index as the first production strategy.

The production repository should keep canonical address rows in ordinary tables
and build a derived FTS5 search table over normalized address fields:

- display label
- street
- city
- district
- postal code
- house number
- orientation number
- normalized search label

FTS5 is only the candidate retrieval layer. Smart Suggest must keep explicit
domain ranking above retrieved candidates so exact house/orientation matches,
slash forms, postal-code searches, diacritic-insensitive input, and Czech
address ordering remain product-owned behavior instead of raw FTS scoring.

Weak-query gating is mandatory before the FTS query runs. One- and two-character
text-only fragments and locality-only inputs must not return broad address
lists. They should either return no owned address rows or wait for more specific
address signals.

Keep the compact-prefix prototype as the fallback strategy if full-shard D1 FTS5
benchmarks show unacceptable latency, query planner behavior, or operational
backup complexity.

## Evidence

The isolated prototype can be run with:

```bash
node apps/smart-suggest/scripts/smart-suggest-index-prototype.mjs --rows=10000
```

Measured with 10,000 deterministic synthetic RUIAN-like Czech rows:

| Schema | Total bytes/address | Index bytes/address | Index rows/address |
| --- | ---: | ---: | ---: |
| Records only | 338.7 | 0 | 0 |
| Current prefix-token | 5583.7 | 5244.9 | 36.64 token rows |
| FTS5 prefix | 814.7 | 476.0 | n/a |
| Compact prefix | 3949.4 | 3610.6 | 20.92 key rows |

Prototype lookup behavior showed FTS5 returning tight candidate pools for
specific inputs such as `K Louzi 1258/12`, `K Louzi 1258`, and
`10100 K Louzi`. It still needs domain ranking and explicit weak-query gates
for inputs such as `K`, `Lo`, `Lou`, and locality-only text.

## Consequences

- Production migrations need a rebuildable FTS5 table and a deterministic path
  for refreshing it after address imports and delta imports.
- Backup and export docs must treat the FTS5 table as derived data. Operators
  should back up canonical rows and import-run metadata, then recreate the FTS5
  virtual table during restore.
- D1 sharding remains required for operational headroom and future growth, but
  FTS5 significantly reduces pressure versus the prefix-token table.
- Benchmarks must compare current prefix-token behavior, FTS5 retrieval plus
  Smart Suggest ranking, and live-provider baselines with provider calls
  disabled by default.
- The compact-prefix prototype remains a contingency, not the default.

