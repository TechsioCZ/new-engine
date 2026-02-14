import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionTokenCookie,
  getPublishableHeaders,
  getSessionTokenFromCookieHeader,
  parseResponseJson,
  serverError,
  setSessionTokenCookie,
  buildMedusaUrl,
} from "../_lib";

type SessionResponse = {
  token: string;
};

const resolveToken = (
  payload: Record<string, unknown> | null,
  fallbackToken: string,
) => {
  if (payload && typeof payload.token === "string" && payload.token.length > 0) {
    return payload.token;
  }

  return fallbackToken;
};

export async function GET(request: NextRequest) {
  const token = getSessionTokenFromCookieHeader(request.headers.get("cookie"));

  if (!token) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  try {
    const refreshResponse = await fetch(buildMedusaUrl("/auth/token/refresh"), {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (refreshResponse.ok) {
      const refreshPayload = await parseResponseJson(refreshResponse);
      const refreshedToken = resolveToken(refreshPayload, token);
      const response = NextResponse.json<SessionResponse>(
        { token: refreshedToken },
        { status: 200 },
      );
      setSessionTokenCookie(response, refreshedToken);
      return response;
    }

    const customerResponse = await fetch(buildMedusaUrl("/store/customers/me"), {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`,
        ...getPublishableHeaders(),
      },
      cache: "no-store",
    });

    if (!customerResponse.ok) {
      const unauthorizedResponse = NextResponse.json(
        { message: "Authentication required." },
        { status: 401 },
      );
      clearSessionTokenCookie(unauthorizedResponse);
      return unauthorizedResponse;
    }

    const response = NextResponse.json<SessionResponse>(
      { token },
      { status: 200 },
    );
    setSessionTokenCookie(response, token);
    return response;
  } catch (error) {
    return serverError("Unable to restore auth session.", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
