import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getLocalDataPath } from "@/lib/local-data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;
export const PROFILE_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";

type SupportedPhoto = {
  extension: "jpg" | "png" | "webp";
  contentType: "image/jpeg" | "image/png" | "image/webp";
};

function detectPhotoType(bytes: Uint8Array): SupportedPhoto | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
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

export function validateProfilePhoto(file: File | null) {
  if (!file || file.size === 0) {
    return null;
  }

  if (file.size > MAX_PROFILE_PHOTO_BYTES) {
    return "Choose an image smaller than 5 MB.";
  }

  if (!PROFILE_PHOTO_ACCEPT.split(",").includes(file.type)) {
    return "Choose a JPG, PNG, or WebP image.";
  }

  return null;
}

export async function saveProfilePhoto(file: File, ownerId?: string | null) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detectedType = detectPhotoType(bytes);

  if (!detectedType) {
    throw new Error("The selected file is not a valid JPG, PNG, or WebP image.");
  }

  const fileName = `${crypto.randomUUID()}.${detectedType.extension}`;

  if (isSupabaseConfigured()) {
    if (!ownerId) {
      throw new Error("Sign in before uploading a profile photo.");
    }

    const supabase = await createClient();
    const objectPath = `${ownerId}/${fileName}`;
    const { error } = await supabase.storage
      .from("profile-photos")
      .upload(objectPath, bytes, {
        cacheControl: "31536000",
        contentType: detectedType.contentType,
        upsert: false,
      });

    if (error) {
      throw new Error(`Could not upload the profile photo: ${error.message}`);
    }

    return supabase.storage.from("profile-photos").getPublicUrl(objectPath).data.publicUrl;
  }

  const localPath = getLocalDataPath(path.join("profile-photos", fileName));
  await mkdir(path.dirname(localPath), { recursive: true });
  await writeFile(localPath, bytes);
  return `/api/profile-photos/${fileName}`;
}
