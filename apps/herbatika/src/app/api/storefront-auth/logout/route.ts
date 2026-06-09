import { NextResponse } from "next/server";
import { clearSessionTokenCookie } from "../_lib";

type LogoutResponse = {
  ok: true;
};

export async function POST() {
  const response = NextResponse.json<LogoutResponse>({ ok: true }, { status: 200 });
  clearSessionTokenCookie(response);
  return response;
}
