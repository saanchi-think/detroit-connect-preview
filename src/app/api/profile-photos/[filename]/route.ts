import { readFile } from "node:fs/promises";
import path from "node:path";
import { getLocalDataPath } from "@/lib/local-data";

type ProfilePhotoRouteProps = {
  params: Promise<{ filename: string }>;
};

const contentTypes: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(_request: Request, { params }: ProfilePhotoRouteProps) {
  const { filename } = await params;
  const match = filename.match(/^[0-9a-f-]{36}\.(jpg|png|webp)$/i);

  if (!match) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const photo = await readFile(getLocalDataPath(path.join("profile-photos", filename)));
    return new Response(photo, {
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
