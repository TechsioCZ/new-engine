export type HerbatikaHeaderSubmenuRootConfig = {
  rootHandle: string;
};

export const HERBATIKA_HEADER_SUBMENU_ROOT_CONFIGS = [
  { rootHandle: "trapi-ma" },
  { rootHandle: "prirodna-kozmetika" },
  { rootHandle: "doplnky-vyzivy" },
  { rootHandle: "potraviny-a-napoje" },
  { rootHandle: "eko-domacnost" },
  { rootHandle: "ucinne-zlozky-od-a-po-z" },
] as const satisfies readonly HerbatikaHeaderSubmenuRootConfig[];
