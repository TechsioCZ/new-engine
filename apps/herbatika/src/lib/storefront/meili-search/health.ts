import { fetchMeili } from "./client";
import { resolveMeiliSearchConfig } from "./config";
import type {
  MeiliIndexStatsPayload,
  MeiliSearchConfig,
  StorefrontSearchHealth,
} from "./types";

const fetchIndexStats = async (
  config: MeiliSearchConfig,
  indexName: string,
): Promise<{ name: string; numberOfDocuments: number; isIndexing: boolean }> => {
  const payload = await fetchMeili<MeiliIndexStatsPayload>(
    config,
    `/indexes/${encodeURIComponent(indexName)}/stats`,
    {
      method: "GET",
    },
  );

  return {
    name: indexName,
    numberOfDocuments:
      typeof payload.numberOfDocuments === "number" ? payload.numberOfDocuments : 0,
    isIndexing: payload.isIndexing === true,
  };
};

export const getStorefrontSearchHealth =
  async (): Promise<StorefrontSearchHealth> => {
    const config = resolveMeiliSearchConfig();

    await fetchMeili<Record<string, unknown>>(config, "/health", {
      method: "GET",
    });

    const [products, categories, producers] = await Promise.all([
      fetchIndexStats(config, config.indexes.products),
      fetchIndexStats(config, config.indexes.categories),
      fetchIndexStats(config, config.indexes.producers),
    ]);

    return {
      provider: "meili",
      status: "ok",
      host: config.host,
      indexes: {
        products,
        categories,
        producers,
      },
    };
  };
