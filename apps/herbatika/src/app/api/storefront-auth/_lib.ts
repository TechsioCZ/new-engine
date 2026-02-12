import { NextResponse } from "next/server";

const MEDUSA_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000";
const MEDUSA_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "";

type ErrorPayload = {
  message: string;
  details?: unknown;
};

export const buildMedusaUrl = (path: string) => {
  return new URL(path, MEDUSA_BACKEND_URL).toString();
};

export const parseResponseJson = async (response: Response) => {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const fallbackErrorMessage = (status: number) => {
  if (status === 400) {
    return "Invalid auth request payload.";
  }

  if (status === 401 || status === 403) {
    return "Authentication failed.";
  }

  return `Auth request failed with status ${status}.`;
};

export const buildErrorResponse = async (response: Response) => {
  const payload = await parseResponseJson(response);
  const messageFromPayload =
    payload && typeof payload.message === "string" ? payload.message : null;

  return NextResponse.json<ErrorPayload>(
    {
      message: messageFromPayload ?? fallbackErrorMessage(response.status),
      details: payload ?? undefined,
    },
    { status: response.status || 500 },
  );
};

export const badRequest = (message: string) => {
  return NextResponse.json<ErrorPayload>({ message }, { status: 400 });
};

export const serverError = (message: string, details?: unknown) => {
  return NextResponse.json<ErrorPayload>(
    {
      message,
      details,
    },
    { status: 500 },
  );
};

export const getPublishableHeaders = (): Record<string, string> => {
  if (!MEDUSA_PUBLISHABLE_KEY) {
    return {};
  }

  return {
    "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY,
  };
};
