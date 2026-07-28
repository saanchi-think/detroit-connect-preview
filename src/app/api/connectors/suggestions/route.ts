import { NextResponse } from "next/server";
import { searchConnectorCards } from "@/lib/connectors/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const query = searchParams.get("q")?.trim() ?? "";
  const type = searchParams.get("type") ?? "all";

  if (query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const connectors = await searchConnectorCards({
    query,
    type,
    pageSize: 7,
  });

  return NextResponse.json({
    suggestions: connectors.map((connector) => ({
      id: connector.id,
      kind: connector.kind,
      name: connector.name,
      role: connector.role,
      neighborhood: connector.neighborhood,
      href: `/connectors/${connector.id}`,
    })),
  });
}
