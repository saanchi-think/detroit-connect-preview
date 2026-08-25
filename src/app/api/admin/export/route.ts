import { NextRequest, NextResponse } from "next/server";
import { getAdminExport } from "@/lib/admin/repository";
import { getCurrentUser } from "@/lib/auth/user";

const allowedDatasets = ["members", "profiles", "forum", "reports"] as const;

export async function GET(request: NextRequest) {
  const dataset = request.nextUrl.searchParams.get("dataset");

  if (!allowedDatasets.includes(dataset as (typeof allowedDatasets)[number])) {
    return NextResponse.json({ error: "Unsupported export." }, { status: 400 });
  }

  try {
    const data = await getAdminExport(
      dataset as (typeof allowedDatasets)[number],
      await getCurrentUser(),
    );
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="detroit-connect-${dataset}-${date}.json"`,
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export unavailable." },
      { status: 403 },
    );
  }
}
