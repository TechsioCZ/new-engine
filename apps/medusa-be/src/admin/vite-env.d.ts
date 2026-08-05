/// <reference types="vite/client" />

// interface required for declaration merging
interface ImportMetaEnv {
  readonly VITE_BACKEND_URL?: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
}

// interface required for declaration merging
interface ImportMeta {
  readonly env: ImportMetaEnv
}
