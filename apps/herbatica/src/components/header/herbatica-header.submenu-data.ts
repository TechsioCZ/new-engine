export type HerbaticaHeaderSubmenuRootConfig = {
  rootHandle: string
}

export const HERBATICA_HEADER_SUBMENU_ROOT_CONFIGS = [
  { rootHandle: "trapi-ma" },
  { rootHandle: "prirodna-kozmetika" },
  { rootHandle: "doplnky-vyzivy" },
  { rootHandle: "potraviny-a-napoje" },
  { rootHandle: "eko-domacnost" },
  { rootHandle: "ucinne-zlozky-od-a-po-z" },
] as const satisfies readonly HerbaticaHeaderSubmenuRootConfig[]
