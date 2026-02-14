import { NextResponse } from "next/server";
import {
  badRequest,
  buildErrorResponse,
  buildMedusaUrl,
  getPublishableHeaders,
  parseResponseJson,
  setSessionTokenCookie,
  serverError,
} from "../_lib";

type RegisterBody = {
  email?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
};

type RegisterResponse = {
  token: string;
};

const asStringOrUndefined = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const isConflictStatus = (status: number) => {
  return status === 409;
};

export async function POST(request: Request) {
  let body: RegisterBody;

  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  const email = asStringOrUndefined(body.email);
  const password = asStringOrUndefined(body.password);
  const firstName = asStringOrUndefined(body.first_name);
  const lastName = asStringOrUndefined(body.last_name);

  if (!(email && password)) {
    return badRequest("Both email and password are required.");
  }

  try {
    const registerResponse = await fetch(
      buildMedusaUrl("/auth/customer/emailpass/register"),
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
        cache: "no-store",
      },
    );

    if (!registerResponse.ok) {
      return buildErrorResponse(registerResponse);
    }

    const loginResponse = await fetch(buildMedusaUrl("/auth/customer/emailpass"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
      cache: "no-store",
    });

    if (!loginResponse.ok) {
      return buildErrorResponse(loginResponse);
    }

    const loginPayload = await parseResponseJson(loginResponse);
    const loginToken =
      loginPayload && typeof loginPayload.token === "string"
        ? loginPayload.token
        : null;

    if (!loginToken) {
      return serverError("Customer login succeeded but no token was returned.");
    }

    const createCustomerResponse = await fetch(buildMedusaUrl("/store/customers"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${loginToken}`,
        ...getPublishableHeaders(),
      },
      body: JSON.stringify({
        email,
        first_name: firstName,
        last_name: lastName,
      }),
      cache: "no-store",
    });

    if (!createCustomerResponse.ok && !isConflictStatus(createCustomerResponse.status)) {
      return buildErrorResponse(createCustomerResponse);
    }

    const refreshResponse = await fetch(buildMedusaUrl("/auth/token/refresh"), {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginToken}`,
      },
      cache: "no-store",
    });

    if (!refreshResponse.ok) {
      const fallbackResponse = NextResponse.json<RegisterResponse>(
        {
          token: loginToken,
        },
        { status: 200 },
      );

      setSessionTokenCookie(fallbackResponse, loginToken);
      return fallbackResponse;
    }

    const refreshPayload = await parseResponseJson(refreshResponse);
    const refreshedToken =
      refreshPayload && typeof refreshPayload.token === "string"
        ? refreshPayload.token
        : loginToken;

    const response = NextResponse.json<RegisterResponse>(
      {
        token: refreshedToken,
      },
      { status: 200 },
    );

    setSessionTokenCookie(response, refreshedToken);
    return response;
  } catch (error) {
    return serverError("Unable to complete customer registration.", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
