# CLAUDE.md - Medusa BE

## Commands

```bash
npx tsc --noEmit                            # typecheck
bunx biome check --write .                  # lint (monorepo root)
pnpm test:unit                              # unit tests
pnpm test:integration:modules               # module tests (isolated)
pnpm test:integration:http                  # HTTP/e2e tests
npx medusa exec ./src/scripts/my-script.ts  # run script
npx medusa db:generate MODULE               # gen migration
```

**Feature-flagged migrations:** Enable `FEATURE_*` env var before `MODULE=my_module mise run dev:medusa:migration:generate`.

## Production Build

`scripts/build-medusa.sh` (monorepo root) - used by Docker and Zerops (zerops uses project-level envs, don't add to build:envVariables if name of project-level env is the same!!!), not local dev.

**Build-time secrets:** Medusa validates `JWT_SECRET`/`COOKIE_SECRET` at build but uses them only at runtime. Script provides placeholders; real secrets via runtime env vars.

**Silent failures:** Build may exit 0 with empty `.medusa/`. Script validates `.medusa/server/medusa-config.js` exists, fails fast with log tail if missing.

## Structure

```
src/
├── admin/       # dashboard widgets, UI routes (Vite React app, own tsconfig)
├── api/         # REST routes (store/, admin/, auth/)
├── jobs/        # cron tasks
├── links/       # module relations
├── modules/     # custom modules and providers
├── scripts/     # one-off tasks (medusa exec)
├── subscribers/ # event listeners (async)
├── utils/       # shared utilities
├── workflows/   # multi-step w/ rollback
```

**Admin env vars:** `import.meta.env.VITE_*`, `.DEV`, `.PROD`

## Modules

| Aspect | Module | ModuleProvider |
|--------|--------|----------------|
| Definition | `Module("key", { service })` | `ModuleProvider(Modules.X, { services })` |
| Container | Own isolated | Parent module's |
| `__hooks` | ✅ `onApplicationStart` | ❌ Not called |
| Use case | Standalone domain | Extend existing (payment, fulfillment) |

**Naming:** Directories use hyphens (`my-module/`), keys use underscores (`my_module`).

### Isolation

Modules can't access others directly. Use: **Links** (associate), **Query** (retrieve), **Workflows** (orchestrate).
Module container ≠ framework container → Query/Link unavailable in service, use workflows.

### Loading Timing

| Phase | What Happens |
|-------|--------------|
| Module loading | Parallel bootstrap, loaders run |
| Service registration | Lazy singletons (not instantiated) |
| `onApplicationStart` | After ALL modules loaded |
| First request | Services instantiated (deps available) |

**Loaders** can't resolve cross-module deps → use `__hooks.onApplicationStart` for deferred init.

### Cross-Module Dependencies for Providers

```typescript
// medusa-config.ts
modules: {
    "my_client": { resolve: "./src/modules/my_client", options: {} },  // underscores!
    [Modules.FULFILLMENT]: {
        resolve: "@medusajs/medusa/fulfillment",
        dependencies: ["my_client"],  // injects into provider container
        options: { providers: [{ resolve: "./src/modules/my-provider", id: "my-provider" }] },
    },
}

// Provider service - lazy singleton, constructor runs at request time
import { MY_CLIENT_MODULE } from "../my_client"
class MyProviderService extends AbstractFulfillmentProviderService {
    constructor(container: { logger: Logger } & Record<typeof MY_CLIENT_MODULE, MyClientService>) {
        super()
        this.myClient = container[MY_CLIENT_MODULE]  // available at request time
    }
}
```

**Tip:** Export module key as constant (`MY_CLIENT_MODULE = "my_client"`) everywhere.

### Definition & Service

```typescript
// index.ts
export const MY_MODULE = "my_module"
export default Module(MY_MODULE, { service: MyModuleService, loaders: [initLoader] })

// service.ts - extend MedusaService for auto-CRUD (listMyConfigs, createMyConfigs, etc.)
export class MyModuleService extends MedusaService({ MyConfig }) {
    constructor(container: InjectedDependencies, options: MyModuleOptions) {
        super(container, options)  // required! Don't use super(...arguments)
    }
}

// loaders/init.ts - runs at module load time
export default async function initLoader({ container, options }: LoaderOptions<MyOptions>) {
    try {
        await service.create({ field: value })
    } catch (error) {  // handle race condition (multiple containers)
        if (String(error).includes("unique constraint")) return
        throw error
    }
}
```

## Container & Resolution

| Context | Access |
|---------|--------|
| Route | `req.scope.resolve()` |
| Job | `container.resolve()` |
| Step | 2nd param `{ container }` |
| Service | inherited via MedusaService |

```typescript
resolve<Logger>(ContainerRegistrationKeys.LOGGER)
resolve<Query>(ContainerRegistrationKeys.QUERY)
resolve<IRegionModuleService>(Modules.REGION)
resolve<ILockingModule>(Modules.LOCKING)        // NOT .LOCK!
resolve<ICachingModuleService>(Modules.CACHING)  // NOT .CACHE!
```

## Code Style (Biome)

Uses `ultracite` preset. Comments: only "why", never "what". Self-documenting code via clear naming.

```typescript
if (condition) { doSomething() }    // ✅ always braces
if (condition) doSomething()         // ❌ biome expands
const a = 1; const b = 2             // ✅ one per declaration
const value = obj.prop ?? fallback   // ✅ nullish coalescing
const value = obj.prop!              // ❌ non-null assertions forbidden
const v: unknown = result[field]     // ✅ annotate generic field access before type guards
```

**Functional core:** Extract pure functions to separate files for testability without runtime deps.
**Shadowing:** Don't name vars `config` in admin routes (shadows `export const config = defineRouteConfig()`).

## Patterns

### Data Layer

```typescript
// Model - always use soft-delete safe indexes for unique constraints
const MyEntity = model.define("my_entity", {
    id: model.id().primaryKey(),
    title: model.text().searchable(),
    rating: model.float(),      // less precision
    price: model.bigNumber(),   // high precision (money)
    items: model.hasMany(() => MyItem, { mappedBy: "parent" }),
}).indexes([
    { on: ["handle"], unique: true, where: { deleted_at: null } },  // DML format
]).checks([
    { name: "title_length", expression: (cols) => `LENGTH(${cols.title}) <= 200` },
])

// Link
defineLink(
    { linkable: ProductModule.linkable.product, isList: true },
    { linkable: MyModule.linkable.my_entity, filterable: ["id", "title"] }
)
defineLink(A.linkable.a, { linkable: B.linkable.b, deleteCascades: true }, {
    database: { extraColumns: { sort_order: { type: "integer" } } }
})
defineLink({ linkable: M.linkable.m, field: "external_id" }, External.linkable.e, { readOnly: true })

// Query + Filters
const { data } = await query.graph({ entity: "fulfillment", fields: ["id", "data"], filters: { provider_id: "my_shipping_default" } })
return data.filter(f => f.data?.status === "pending")  // JSON filter in-memory

// SQL typing
const results = await dbService.sqlRaw<{ id: string; title: string }[]>(query)
```

### API Layer

```typescript
// Route - admin routes auto-protected, no auth middleware needed
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({ entity: "my_entity", ...req.queryConfig })
    res.json({ items: data })
}

// Middleware - colocate validators.ts + middlewares.ts with route.ts
// validators.ts
export const PostSchema = z.object({ name: z.string() })
export type PostSchemaType = z.infer<typeof PostSchema>

// middlewares.ts - spread into src/api/middlewares.ts routes array
export const myRouteMiddlewares: MiddlewareRoute[] = [
    { methods: ["POST"], matcher: "/admin/my-route", middlewares: [validateAndTransformBody(PostSchema)] },
]

// route.ts - use req.validatedBody (type-safe, validated by middleware)
export async function POST(req: MedusaRequest<PostSchemaType>, res: MedusaResponse) {
    const data = req.validatedBody
}

// src/api/middlewares.ts
export default defineMiddlewares({
    routes: [
        ...myRouteMiddlewares,
        { methods: ["GET"], matcher: "/store/x", middlewares: [validateAndTransformQuery(Schema, { defaults: ["id"], isList: true })] },
        { methods: ["POST"], matcher: "/store/x", middlewares: [authenticate("customer", ["session", "bearer"]), validateAndTransformBody(Schema)] },
    ],
})

// Error handling
throw new MedusaError(MedusaError.Types.INVALID_DATA, "Missing field")
// Types: INVALID_DATA(400), NOT_FOUND(404), UNAUTHORIZED(401), NOT_ALLOWED(400), DUPLICATE_ERROR(422), CONFLICT(409)
```

### Business Logic

```typescript
// Step
export const myStep = createStep("my-step", async (input: Input, { container }) => {
    const service = container.resolve<IRegionModuleService>(Modules.REGION)
    return new StepResponse({ result })
})

// Workflow + Transform
const workflow = createWorkflow("my-workflow", (input: Input) => {
    const stepResult = myStep(input.data)
    const derived = transform({ stepResult }, (d) => ({ id: d.stepResult.id }))  // data manipulation only
    when(input, (i) => i.is_active).then(() => activeStep())  // conditionals via when-then
    return new WorkflowResponse({ result: derived })
})
// Limits: vars have no values at definition, can't reassign/iterate in body, use useQueryGraphStep for Query
```

### Background Tasks

```typescript
// Job w/ Locking
export default async function myJob(container: MedusaContainer) {
    const lock = container.resolve<ILockingModule>(Modules.LOCKING)
    try {
        await lock.execute("job-key", async () => { /* logic */ }, { timeout: 120 })
    } catch (e) {
        if (e instanceof Error && e.message.includes("Timed-out")) return
        throw e
    }
}
export const config = { name: "my-job", schedule: "*/5 * * * *" }

// Workflow Lock Steps (simpler)
const workflow = createWorkflow("protected-op", (input: { key: string }) => {
    acquireLockStep({ key: input.key, timeout: 2, ttl: 10 })
    protectedStep(input)
    releaseLockStep({ key: input.key })  // auto-releases on error
})

// Caching (Redis-backed)
const cache = container.resolve<ICachingModuleService>(Modules.CACHING)
const key = await cache.computeKey({ filters, page })  // stable hash
const cached = await cache.get({ key }) as MyType[] | null
if (cached) return cached
await cache.set({ key, data, ttl: 3600, tags: ["my_module"] })
await cache.clear({ tags: ["my_module"] })  // bulk invalidate
// Multi-container: always Redis over local vars for shared state

// External API Client Pattern - separate HTTP layer from orchestration
class MyApiClient {  // Pure HTTP: retries, parsing, no state
    async fetchData(token: string, query: Query): Promise<Data> {}
}
class MyApiModuleService {  // Orchestration: Redis tokens, rate limiting, caching
    async getData(query: Query) {
        await this.acquireRateLimitSlot()
        const token = await this.getToken()
        return this.getCached("key", () => this.client_.fetchData(token, query), ttl, tags)
    }
}

// Script (instead of HTTP endpoint)
// src/scripts/seed.ts - run: npx medusa exec ./src/scripts/seed.ts arg1 arg2
export default async function seed({ container, args }: ExecArgs) {}
// Startup: "dev": "medusa exec ./src/scripts/startup.ts && medusa develop"
```

### Provider ID Naming

| Where | Format | Example |
|-------|--------|---------|
| DB `provider_id` | `{identifier}_{id}` | `my_shipping_default` |
| Container key | `fp_{identifier}_{id}` | `fp_my_shipping_default` |

`identifier` = static property on class, `id` = config value. Keep both identical for single instance.

## Config Examples

```typescript
// Conditional module - ⚠️ evaluated at BUILD time, not runtime!
// FEATURE_ENABLED must be set during `medusa build`, not just at server start.
// For Docker: add to build args. For Zerops: add to build.envVariables.
...(FEATURE_ENABLED ? [{
    resolve: "@medusajs/medusa/fulfillment",
    dependencies: ["my_client"],
    options: { providers: [{ resolve: "./src/modules/my_provider", id: "my_provider" }] }
}] : []),

// Redis locking
{ resolve: "@medusajs/medusa/locking", options: { providers: [{
    resolve: "@medusajs/medusa/locking-redis", id: "locking-redis", is_default: true, options: { redisUrl }
}] } }
```

## Do / Don't

| DO | DON'T |
|----|-------|
| Validate before cast | `as Type` without validation |
| Use `Modules.*` / `ContainerRegistrationKeys.*` | Hardcode strings |
| Batch with `CHUNK_SIZE` | Unbounded operations |
| Lock overlapping jobs | Concurrent job conflicts |
| `medusa exec` scripts for destructive ops | Unprotected destructive GET endpoints |
| Workflows for cross-module | `Query`/`Link` in module service |

## Testing

Uses `@medusajs/test-utils` + Jest. Framework is for **integration only**; unit tests use plain Jest.

| Type | Location | Command |
|------|----------|---------|
| Unit | `src/**/__tests__/**/*.unit.spec.ts` | `pnpm test:unit` |
| Unit (jobs) | `tests/unit/jobs/*.unit.spec.ts` | `pnpm test:unit` |
| HTTP Integration | `integration-tests/http/` | `pnpm test:integration:http` |
| Module Integration | `src/modules/*/__tests__/*.spec.ts` | `pnpm test:integration:modules` |

**⚠️ Job tests in `tests/unit/jobs/`**, NOT `src/jobs/__tests__/` - Medusa loads all `src/jobs/` files at runtime.

### Unit Tests

**Focus:** Critical paths (validation, money, core logic). **Skip:** Getters, static arrays, trivial transforms.

| Anti-pattern | Why |
|--------------|-----|
| Testing constants | Catches no bugs |
| Testing Set/Map you just defined | Tautological |
| Mocking inherited MedusaService methods | Tests mock, not code |
| Testing `query.graph()` pass-through | Tests framework |
| Testing logging calls | Implementation detail |
| Testing pass-through methods | Tests mock wiring |

**Valuable tests:** Behavior users care about, catches real bugs, complex logic, security-critical, edge cases.

**Patterns:** Factory functions (`createMockEntity(overrides)`), boundary tests, `it.each()` for error types, `vi.useFakeTimers()`.

**Fake timers:**
```typescript
const promise = service.doSomething()
await vi.advanceTimersByTimeAsync(waitTime)
await promise
// vi.clearAllMocks() doesn't clear mockResolvedValueOnce -> use mockFn.mockReset()
// Use vi.setSystemTime(ts) for deterministic Date.now()
```

### Integration Tests

**HTTP** - Write for: business logic routes, security-critical middleware, multi-step DB ops.
Skip for: `query.graph()` pass-through, external API routes, seed scripts.

```typescript
medusaIntegrationTestRunner({
    testSuite: ({ api, getContainer }) => {
        it("returns data", async () => {
            const res = await api.get("/store/x")  // also: post(path, data), delete(path)
            expect(res.status).toEqual(200)
        })
    },
})
vi.setConfig({ testTimeout: 60_000 })
// Admin auth: headers: { authorization: `Bearer ${jwt.sign({actor_id, actor_type: "user", auth_identity_id}, "supersecret")}` }
// Store auth: headers: { "x-publishable-api-key": pak.token }
```

**Module** - Use when mocking inherited methods (`listMyEntities`, etc.) → test real DB instead.

```typescript
moduleIntegrationTestRunner<MyModuleService>({
    moduleName: MY_MODULE,
    moduleModels: [MyEntity],
    resolve: "./src/modules/my-module",
    moduleOptions: { environment: "testing" },
    injectedDependencies: {
        [Modules.CACHING]: { get: vi.fn(), set: vi.fn(), clear: vi.fn() },
        [Modules.LOCKING]: { execute: vi.fn(async (_key, fn) => fn()) },
    },
    testSuite: ({ service }) => {
        it("creates", async () => expect((await service.createMyEntities({ title: "Test" })).title).toBe("Test"))
    },
})
```

**Gotchas:**
- Awilix throws on missing deps even with `?? null` → wrap in try/catch
- Mock loaders: `vi.mock("../loaders/x", () => ({ __esModule: true, default: vi.fn() }))`

**Workflow tests:** Use `medusaIntegrationTestRunner`, `throwOnError: false` to capture errors.

## Env Vars

Always sync: `.env.docker`, `.env.template`, `.env.test`, `docker-compose.yml`

## Keeping This Updated

After sessions: *"[Backend] Anything to add/update in CLAUDE.MD?"*
After rejecting suggestions: Consider what to clarify for next time.

**All examples use generic names** (`my_module`, `MyService`) - never project-specific.
