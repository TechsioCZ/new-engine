import type { QueryKey } from "../shared/query-keys"
import type {
  QueryResult,
  ReadQueryOptions,
  ReadResultBase,
  SuspenseQueryResult,
  SuspenseResultBase,
} from "../shared/hook-types"

export type AuthQueryKeys = {
  all: () => QueryKey
  customer: () => QueryKey
  session: () => QueryKey
}

export type AuthService<
  TCustomer,
  TLoginInput,
  TRegisterInput,
  TUpdateInput,
  TCreateCustomerInput = unknown,
  TLoginResult = unknown,
  TRegisterResult = unknown,
> = {
  getCustomer: (signal?: AbortSignal) => Promise<TCustomer | null>
  login: (input: TLoginInput) => Promise<TLoginResult>
  logout: () => Promise<void>
  register: (input: TRegisterInput) => Promise<TRegisterResult>
  createCustomer?: (input: TCreateCustomerInput) => Promise<TCustomer>
  updateCustomer?: (input: TUpdateInput) => Promise<TCustomer>
  refresh?: () => Promise<unknown>
}

export type AuthQueryInput<TCustomer = unknown> = {
  enabled?: boolean
  queryOptions?: ReadQueryOptions<TCustomer | null>
}

export type UseAuthResult<TCustomer> = ReadResultBase<
  QueryResult<TCustomer | null>
> & {
  customer: TCustomer | null
  isAuthenticated: boolean
}

export type UseSuspenseAuthResult<TCustomer> = SuspenseResultBase<
  SuspenseQueryResult<TCustomer | null>
> & {
  customer: TCustomer | null
  isAuthenticated: boolean
}
