import { readFile } from "node:fs/promises";
import path from "node:path";
import { getLocalDataPath } from "@/lib/local-data";

type ForumImageRouteProps = {
  params: Promise<{ filename: string }>;
};

const contentTypes: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(_request: Request, { params }: ForumImageRouteProps) {
  const { filename } = await params;
  const match = filename.match(/^[0-9a-f-]{36}\.(jpg|png|webp)$/i);

  if (!match) return new Response("Not found", { status: 404 });

  try {
    const image = await readFile(getLocalDataPath(path.join("forum-images", filename)));
    return new Response(image, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": contentTypes[match[1].toLowerCase()] ?? "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
