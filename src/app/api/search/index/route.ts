import { NextRequest, NextResponse } from "next/server";
import { runPlatformSearchIndexWorker } from "@/lib/ai-search/index-worker";

export const dynamic = "force-dynamic";

async function runWorker(request: NextRequest) {
  const secret = process.env.SEARCH_INDEX_CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runPlatformSearchIndexWorker();
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search indexing failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return runWorker(request);
}

export async function POST(request: NextRequest) {
  return runWorker(request);
}
