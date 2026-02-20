export type StorefrontSearchHit = {
  id: string;
  title: string;
  handle: string;
  thumbnail: string | null;
  descriptionSnippet: string;
};

export type StorefrontSearchResult = {
  provider: "meili";
  query: string;
  hits: StorefrontSearchHit[];
  estimatedTotalHits: number;
  processingTimeMs: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type StorefrontSearchHealth = {
  provider: "meili";
  status: "ok";
  host: string;
  indexes: {
    products: {
      name: string;
      numberOfDocuments: number;
      isIndexing: boolean;
    };
    categories: {
      name: string;
      numberOfDocuments: number;
      isIndexing: boolean;
    };
    producers: {
      name: string;
      numberOfDocuments: number;
      isIndexing: boolean;
    };
  };
};

export type MeiliSearchPayload = {
  hits?: unknown[];
  estimatedTotalHits?: number;
  processingTimeMs?: number;
};

export type MeiliIndexStatsPayload = {
  numberOfDocuments?: number;
  isIndexing?: boolean;
};

export type MeiliSearchConfig = {
  host: string;
  apiKey: string;
  indexes: {
    products: string;
    categories: string;
    producers: string;
  };
};
