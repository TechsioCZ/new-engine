import type { AuthProxyResponse } from "./types";

const parseProxyError = async (response: Response) => {
  try {
    const payload = (await response.json()) as { message?: string };
    if (payload?.message) {
      return payload.message;
    }
  } catch {
    // noop
  }

  return `Auth request failed with status ${response.status}`;
};

export const requestAuthProxy = async <TBody extends Record<string, unknown>>(
  path: "login" | "register",
  body: TBody,
): Promise<AuthProxyResponse> => {
  const response = await fetch(`/api/storefront-auth/${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await parseProxyError(response));
  }

  const payload = (await response.json()) as Partial<AuthProxyResponse>;
  if (typeof payload.token !== "string" || payload.token.length === 0) {
    throw new Error("Auth proxy did not return a token.");
  }

  return {
    token: payload.token,
  };
};

export const requestSessionProxy = async (): Promise<AuthProxyResponse | null> => {
  const response = await fetch("/api/storefront-auth/session", {
    method: "GET",
    cache: "no-store",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await parseProxyError(response));
  }

  const payload = (await response.json()) as Partial<AuthProxyResponse>;
  if (typeof payload.token !== "string" || payload.token.length === 0) {
    return null;
  }

  return {
    token: payload.token,
  };
};

export const requestLogoutProxy = async () => {
  const response = await fetch("/api/storefront-auth/logout", {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await parseProxyError(response));
  }
};
