import { NextResponse } from "next/server"

// Pipeline smoke marker for ZaneOps deploy validation.
export function GET() {
  return NextResponse.json({ status: "ok" })
}
