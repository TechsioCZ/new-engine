import { NextResponse } from "next/server";
import { getStorefrontSearchHealth } from "@/lib/storefront/meili-search";

export async function GET() {
  try {
    const health = await getStorefrontSearchHealth();
    return NextResponse.json(health, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        provider: "meili",
        status: "error",
        message: "Meilisearch health check failed.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 503 },
    );
  }
}
