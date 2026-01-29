import type { QueryKey } from "../shared/query-keys"

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

export type AuthQueryInput = {
  enabled?: boolean
}

export type UseAuthResult<TCustomer> = {
  customer: TCustomer | null
  isAuthenticated: boolean
  isLoading: boolean
  isFetching: boolean
  isSuccess: boolean
  error: string | null
}

export type UseSuspenseAuthResult<TCustomer> = {
  customer: TCustomer | null
  isAuthenticated: boolean
  isFetching: boolean
}
