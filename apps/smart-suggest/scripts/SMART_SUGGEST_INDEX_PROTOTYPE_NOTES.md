# Smart Suggest Index Measurement Prototype

Question: how large is the current address prefix-token index for RUIAN-like
Czech rows, and do FTS5 or bounded compact-prefix keys give enough evidence to
choose a production ADR without changing production storage/runtime behavior?

Run:

```bash
node apps/smart-suggest/scripts/smart-suggest-index-prototype.mjs --rows=10000
```

The script creates throwaway SQLite databases in the OS temp directory and
deletes them before exit. It does not call external providers, D1 bindings, or
production repositories.

Measured on 10,000 deterministic synthetic RUIAN-like CZ rows:

| Schema               | Total bytes/address | Index bytes/address | Index rows/address | Index bytes/row |
| -------------------- | ------------------: | ------------------: | -----------------: | --------------: |
| Records only         |               338.7 |                   0 |                  0 |               0 |
| Current prefix-token |              5583.7 |              5244.9 |   36.64 token rows |           143.2 |
| FTS5 prefix          |               814.7 |               476.0 |                n/a |             n/a |
| Compact prefix       |              3949.4 |              3610.6 |     20.92 key rows |           172.6 |

Prototype lookup notes:

- Current prefix-token rows preserve slash and postal forms after ranking, but
  one- and two-character fragments still hit many rows before ranking (`K` and
  `Lo` both return candidate pools).
- FTS5 with normalized fields and prefix indexes is much smaller and returns
  tight candidate pools for `K Louzi 1258/12`, `K Louzi 1258`, and
  `10100 K Louzi`. It needs explicit weak-query gating and domain ranking; raw
  FTS scoring alone is not enough for orientation-first or house/orientation
  policy.
- Compact prefix equality keys can encode exact pair, orientation, postal, and
  street-number behavior, but even with bounded prefix buckets it is still much
  larger than FTS5. It is useful as a fallback if full-shard D1 FTS5 latency or
  query-plan behavior fails.
- Weak locality-only or fragment-only queries (`K`, `Lo`, `Praha`) should be
  rejected or heavily gated before any index strategy returns address records.

Recommendation for the production index ADR: choose FTS5 as the first
production strategy, keep existing Smart Suggest indexing/ranking semantics
above it, and add explicit weak-query gates. Keep compact-prefix as the backup
strategy only if full-shard D1 FTS5 measurements expose latency or operational
issues.
