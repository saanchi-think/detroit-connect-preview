import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getLocalDataPath } from "@/lib/local-data";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  FORUM_IMAGE_ACCEPT,
  MAX_FORUM_IMAGE_BYTES,
  MAX_FORUM_IMAGE_COUNT,
} from "@/lib/forum/image-constants";

type SupportedImage = {
  extension: "jpg" | "png" | "webp";
  contentType: "image/jpeg" | "image/png" | "image/webp";
};

function detectImageType(bytes: Uint8Array): SupportedImage | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { extension: "jpg", contentType: "image/jpeg" };
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { extension: "png", contentType: "image/png" };
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return { extension: "webp", contentType: "image/webp" };
  }
  return null;
}

export function validateForumImages(files: File[]) {
  if (files.length > MAX_FORUM_IMAGE_COUNT) {
    return "Add no more than 3 images.";
  }

  for (const file of files) {
    if (file.size > MAX_FORUM_IMAGE_BYTES) {
      return "Each image must be smaller than 5 MB.";
    }
    if (!FORUM_IMAGE_ACCEPT.split(",").includes(file.type)) {
      return "Use JPG, PNG, or WebP images.";
    }
  }

  return null;
}

export async function saveForumImages(files: File[], ownerId?: string | null) {
  const prepared = await Promise.all(
    files.map(async (file) => {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const detectedType = detectImageType(bytes);
      if (!detectedType) {
        throw new Error("One of the selected files is not a valid JPG, PNG, or WebP image.");
      }
      return { bytes, detectedType, fileName: `${crypto.randomUUID()}.${detectedType.extension}` };
    }),
  );

  if (isSupabaseConfigured()) {
    if (!ownerId) throw new Error("Sign in before uploading forum images.");
    const supabase = await createClient();
    const urls: string[] = [];

    for (const image of prepared) {
      const objectPath = `${ownerId}/${image.fileName}`;
      const { error } = await supabase.storage.from("forum-images").upload(objectPath, image.bytes, {
        cacheControl: "31536000",
        contentType: image.detectedType.contentType,
        upsert: false,
      });
      if (error) throw new Error(`Could not upload a forum image: ${error.message}`);
      urls.push(supabase.storage.from("forum-images").getPublicUrl(objectPath).data.publicUrl);
    }

    return urls;
  }

  const urls: string[] = [];
  for (const image of prepared) {
    const localPath = getLocalDataPath(path.join("forum-images", image.fileName));
    await mkdir(path.dirname(localPath), { recursive: true });
    await writeFile(localPath, image.bytes);
    urls.push(`/api/forum-images/${image.fileName}`);
  }
  return urls;
}
