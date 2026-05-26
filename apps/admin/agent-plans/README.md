# Admin Plan Graph

These plans define the current implementation graph for turning `apps/admin` into a practical replacement for the default Medusa Admin dashboard.

Use these plans with `plan-graph` / `dag`; do not rely on filename order alone.

## Plan Selection

```powershell
python .codex\skills\plan-graph\scripts\plan_graph.py validate --plans-root apps\admin\local\agent-plans --glob "admin-*.plan.md" `
  --depends admin-00-operating-contract:admin-01-boundary-adr `
  --depends admin-00-operating-contract:admin-02-source-map-and-contracts `
  --depends admin-01-boundary-adr:admin-02-source-map-and-contracts `
  --depends admin-02-source-map-and-contracts:admin-03-shell-settings-parity `
  --depends admin-02-source-map-and-contracts:admin-04-orders-workflow-parity `
  --depends admin-02-source-map-and-contracts:admin-05-products-workflow-parity `
  --depends admin-02-source-map-and-contracts:admin-06-customers-b2b-workflow `
  --depends admin-02-source-map-and-contracts:admin-07-extensions-workflow-parity `
  --depends admin-02-source-map-and-contracts:admin-09-catalog-taxonomy-workflow `
  --depends admin-03-shell-settings-parity:admin-08-quality-deploy-verification `
  --depends admin-04-orders-workflow-parity:admin-08-quality-deploy-verification `
  --depends admin-05-products-workflow-parity:admin-08-quality-deploy-verification `
  --depends admin-06-customers-b2b-workflow:admin-08-quality-deploy-verification `
  --depends admin-07-extensions-workflow-parity:admin-08-quality-deploy-verification `
  --depends admin-09-catalog-taxonomy-workflow:admin-08-quality-deploy-verification
```

For frontier/status, run the same selection through `dag.py` and write generated snapshots to local-only state:

```powershell
python .codex\skills\dag\scripts\dag.py --plans-root apps\admin\local\agent-plans --glob "admin-*.plan.md" --state-dir apps\admin\local\plan-graphs --lanes 4 --max-depth 2 `
  --depends admin-00-operating-contract:admin-01-boundary-adr `
  --depends admin-00-operating-contract:admin-02-source-map-and-contracts `
  --depends admin-01-boundary-adr:admin-02-source-map-and-contracts `
  --depends admin-02-source-map-and-contracts:admin-03-shell-settings-parity `
  --depends admin-02-source-map-and-contracts:admin-04-orders-workflow-parity `
  --depends admin-02-source-map-and-contracts:admin-05-products-workflow-parity `
  --depends admin-02-source-map-and-contracts:admin-06-customers-b2b-workflow `
  --depends admin-02-source-map-and-contracts:admin-07-extensions-workflow-parity `
  --depends admin-02-source-map-and-contracts:admin-09-catalog-taxonomy-workflow `
  --depends admin-03-shell-settings-parity:admin-08-quality-deploy-verification `
  --depends admin-04-orders-workflow-parity:admin-08-quality-deploy-verification `
  --depends admin-05-products-workflow-parity:admin-08-quality-deploy-verification `
  --depends admin-06-customers-b2b-workflow:admin-08-quality-deploy-verification `
  --depends admin-07-extensions-workflow-parity:admin-08-quality-deploy-verification `
  --depends admin-09-catalog-taxonomy-workflow:admin-08-quality-deploy-verification
```

## Ownership Notes

- `admin-02-source-map-and-contracts` owns shared admin API/types/rules surfaces.
- Domain workflow lanes should not independently rewrite shared contracts.
- `admin-05-products-workflow-parity` owns product routes; `admin-09-catalog-taxonomy-workflow` owns category and collection routes.
- `admin-08-quality-deploy-verification` is a merge lane, not a bucket for unfinished feature work.
