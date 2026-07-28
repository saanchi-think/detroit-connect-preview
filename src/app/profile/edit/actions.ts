"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/user";
import {
  LOCAL_DEMO_USER_ID,
  getConnectorProfileById,
  updateConnectorProfile,
} from "@/lib/connectors/repository";
import {
  saveProfilePhoto,
  validateProfilePhoto,
} from "@/lib/connectors/profile-photo";
import type { AvatarKey } from "@/lib/connectors/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const editProfileSchema = z.object({
  profileId: z.string().uuid(),
  name: z.string().trim().min(2, "Enter a name.").max(100),
  headline: z.string().trim().min(2, "Enter a short role or headline.").max(120),
  bio: z.string().trim().max(1000),
  email: z.email("Enter a valid email address.").max(254),
  phone: z.union([
    z.literal(""),
    z.string().trim().regex(/^\+?[0-9() .-]{7,20}$/, "Enter a valid phone number."),
  ]),
  neighborhood: z.string().trim().min(2, "Enter a neighborhood.").max(80),
  zipCode: z.union([
    z.literal(""),
    z.string().regex(/^48\d{3}$/, "Enter a five-digit Detroit ZIP code."),
  ]),
  languages: z.string().trim().max(200),
  topics: z.string().trim().min(2, "Add at least one help topic.").max(500),
  skills: z.string().trim().max(500),
  avatarKey: z.enum(["tire", "boat", "car", "pizza"]),
  availability: z.array(z.string().max(80)).max(10).default([]),
});

export type EditProfileFormState = {
  message: string;
  fieldErrors: Record<string, string[] | undefined>;
};

function stringValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function listValue(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export async function updateProfileAction(
  _previousState: EditProfileFormState,
  formData: FormData,
): Promise<EditProfileFormState> {
  const user = await getCurrentUser();

  if (isSupabaseConfigured() && !user) {
    redirect("/login?next=/profile/edit");
  }

  const result = editProfileSchema.safeParse({
    profileId: stringValue(formData, "profileId"),
    name: stringValue(formData, "name"),
    headline: stringValue(formData, "headline"),
    bio: stringValue(formData, "bio"),
    email: stringValue(formData, "email"),
    phone: stringValue(formData, "phone"),
    neighborhood: stringValue(formData, "neighborhood"),
    zipCode: stringValue(formData, "zipCode"),
    languages: stringValue(formData, "languages"),
    topics: stringValue(formData, "topics"),
    skills: stringValue(formData, "skills"),
    avatarKey: stringValue(formData, "avatarKey") as AvatarKey,
    availability: formData.getAll("availability").map((item) => String(item)),
  });
  const photoValue = formData.get("profilePhoto");
  const photo = photoValue instanceof File && photoValue.size > 0 ? photoValue : null;
  const photoError = validateProfilePhoto(photo);

  if (!result.success || photoError) {
    return {
      message: "Review the highlighted fields.",
      fieldErrors: {
        ...(result.success ? {} : result.error.flatten().fieldErrors),
        ...(photoError ? { profilePhoto: [photoError] } : {}),
      },
    };
  }

  const parsed = result.data;
  const current = await getConnectorProfileById(parsed.profileId);
  const ownerId = user?.id ?? LOCAL_DEMO_USER_ID;

  if (!current || current.ownerId !== ownerId) {
    return {
      message: "You can only edit your own profile.",
      fieldErrors: {},
    };
  }

  let avatarUrl: string | undefined;
  if (photo) {
    try {
      avatarUrl = await saveProfilePhoto(photo, user?.id);
    } catch (error) {
      return {
        message: "We could not upload that photo.",
        fieldErrors: {
          profilePhoto: [
            error instanceof Error ? error.message : "Choose another image and try again.",
          ],
        },
      };
    }
  }

  await updateConnectorProfile({
    id: current.id,
    ownerId,
    kind: current.kind,
    name: parsed.name,
    headline: parsed.headline,
    bio: parsed.bio,
    organizationName: current.organizationName ?? undefined,
    email: parsed.email,
    phone: parsed.phone || undefined,
    preferredContactMethod: current.preferredContactMethod ?? undefined,
    neighborhood: parsed.neighborhood,
    zipCode: parsed.zipCode || undefined,
    yearsConnected: current.yearsConnected ?? undefined,
    languages: listValue(parsed.languages),
    topics: listValue(parsed.topics),
    skills: listValue(parsed.skills),
    availability: parsed.availability,
    avatarKey: parsed.avatarKey,
    avatarUrl,
  });

  revalidatePath(`/connectors/${current.id}`);
  revalidatePath("/connectors");
  revalidatePath("/profile");
  redirect(`/connectors/${current.id}?updated=1`);
}
