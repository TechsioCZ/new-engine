import { NextResponse } from "next/server";
import {
  getMedusaPublishableHeaders,
  MEDUSA_BACKEND_URL,
} from "@/lib/storefront/public-env";
const AUTH_SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

type ErrorPayload = {
  message: string;
  details?: unknown;
};

export const AUTH_SESSION_COOKIE_NAME = "herbatika_auth_session_token";

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
    return "Neplatné údaje autentifikačnej požiadavky.";
  }

  if (status === 401 || status === 403) {
    return "Autentifikácia zlyhala.";
  }

  return `Autentifikačná požiadavka zlyhala so stavom ${status}.`;
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
  return getMedusaPublishableHeaders();
};

export const setSessionTokenCookie = (
  response: NextResponse,
  token: string,
) => {
  response.cookies.set({
    name: AUTH_SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: AUTH_SESSION_COOKIE_MAX_AGE_SECONDS,
  });
};

export const clearSessionTokenCookie = (response: NextResponse) => {
  response.cookies.set({
    name: AUTH_SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
};

export const getSessionTokenFromCookieHeader = (cookieHeader: string | null) => {
  if (!cookieHeader) {
    return null;
  }

  const entries = cookieHeader.split(";");
  for (const entry of entries) {
    const [rawName, ...valueParts] = entry.trim().split("=");
    if (rawName !== AUTH_SESSION_COOKIE_NAME) {
      continue;
    }

    const encodedValue = valueParts.join("=");
    if (!encodedValue) {
      return null;
    }

    try {
      return decodeURIComponent(encodedValue);
    } catch {
      return encodedValue;
    }
  }

  return null;
};
