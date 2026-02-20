import type { MeiliSearchConfig } from "./types";

export const fetchMeili = async <TPayload>(
  config: MeiliSearchConfig,
  path: string,
  init: RequestInit,
): Promise<TPayload> => {
  const response = await fetch(`${config.host}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const responseBody = await response.text().catch(() => "");
    throw new Error(
      `Meilisearch request failed (${response.status}) for ${path}${responseBody ? `: ${responseBody}` : ""}`,
    );
  }

  return (await response.json()) as TPayload;
};
