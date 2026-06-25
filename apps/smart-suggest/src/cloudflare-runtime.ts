export type SmartSuggestD1Database = {
  readonly prepare: (query: string) => SmartSuggestD1PreparedStatement
}

export type SmartSuggestD1PreparedStatement = {
  readonly bind: (
    ...values: readonly unknown[]
  ) => SmartSuggestD1PreparedStatement
  readonly first: <
    Row extends Record<string, unknown> = Record<string, unknown>,
  >() => Promise<Row | null>
  readonly all: <
    Row extends Record<string, unknown> = Record<string, unknown>,
  >() => Promise<{
    readonly results: readonly Row[]
  }>
  readonly run: () => Promise<unknown>
}

export type SmartSuggestKvNamespace = {
  readonly get: (key: string) => Promise<string | null>
  readonly put: (
    key: string,
    value: string,
    options?: SmartSuggestKvPutOptions
  ) => Promise<void>
  readonly delete: (key: string) => Promise<void>
}

export type SmartSuggestKvPutOptions = {
  readonly expirationTtl?: number
  readonly metadata?: Record<string, unknown>
}

export type SmartSuggestWorkerHandler<Env> = {
  readonly fetch: (request: Request, env: Env) => Response | Promise<Response>
}
