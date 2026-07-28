"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/user";
import {
  saveProfilePhoto,
  validateProfilePhoto,
} from "@/lib/connectors/profile-photo";
import { createConnectorProfile } from "@/lib/connectors/repository";
import type { AvatarKey } from "@/lib/connectors/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const profileTypeMap = {
  User: "person",
  Organization: "organization",
} as const;

const optionalText = (maximum: number) => z.string().trim().max(maximum);
const optionalUrl = z.union([
  z.literal(""),
  z.url({ protocol: /^https?$/ }).max(300),
]);
const personNamePattern = /^[\p{L}][\p{L}' -]*$/u;

const formSchema = z.object({
  profileType: z.enum(["User", "Organization"]),
  neighborhood: z.string().trim().min(2, "Enter a neighborhood.").max(80),
  zipCode: z.union([z.literal(""), z.string().regex(/^48\d{3}$/, "Enter a five-digit Detroit ZIP code.")]),
  detroitConnection: optionalText(60),
  hereTo: optionalText(40),
  neighborhoodExpertise: optionalText(200),
  languages: optionalText(160),
  firstName: optionalText(50),
  lastName: optionalText(50),
  organizationName: optionalText(100),
  email: z.email("Enter a valid email address.").max(254),
  phone: z.union([
    z.literal(""),
    z.string().trim().regex(/^\+?[0-9() .-]{7,20}$/, "Enter a valid phone number."),
  ]),
  preferredContact: optionalText(40),
  currentEmployer: optionalText(100),
  industry: optionalText(100),
  jobTitle: optionalText(100),
  organizationType: optionalText(80),
  affiliationNames: z.array(optionalText(100)).default([]),
  affiliationUrls: z.array(optionalUrl).default([]),
  yearsConnected: optionalText(40),
  otherTopic: optionalText(60),
  avatarKey: z.enum(["tire", "boat", "car", "pizza"]).optional(),
  topics: z.array(z.string().max(80)).max(30).default([]),
  skills: z.array(z.string().max(80)).max(20).default([]),
  availability: z.array(z.string().max(80)).max(10).default([]),
}).superRefine((value, context) => {
  if (value.profileType === "User") {
    if (value.firstName.length < 2) {
      context.addIssue({ code: "custom", message: "Enter your first name.", path: ["firstName"] });
    } else if (!personNamePattern.test(value.firstName)) {
      context.addIssue({ code: "custom", message: "Use letters, spaces, apostrophes, or hyphens.", path: ["firstName"] });
    }
    if (value.lastName.length < 2) {
      context.addIssue({ code: "custom", message: "Enter your last name.", path: ["lastName"] });
    } else if (!personNamePattern.test(value.lastName)) {
      context.addIssue({ code: "custom", message: "Use letters, spaces, apostrophes, or hyphens.", path: ["lastName"] });
    }
  }
  if (value.profileType === "Organization" && value.organizationName.length < 2) {
    context.addIssue({ code: "custom", message: "Add the organization name.", path: ["organizationName"] });
  }
});

export type ProfileFormState = {
  message: string;
  fieldErrors: Record<string, string[] | undefined>;
};

function stringValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function listValue(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function parseCommaList(raw: string) {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function nameFromWebsiteUrl(url: string) {
  try {
    const root = new URL(url).hostname.replace(/^www\./i, "").split(".")[0] ?? "";
    return root
      .replace(/[-_]+/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
      .trim();
  } catch {
    return "";
  }
}

function buildBio(input: {
  detroitConnection?: string;
  hereTo?: string;
  neighborhoodExpertise?: string;
  affiliations?: Array<{ name: string; url: string }>;
}) {
  const affiliationSummary = input.affiliations
    ?.filter((affiliation) => affiliation.name || affiliation.url)
    .map((affiliation) => {
      const name = affiliation.name || nameFromWebsiteUrl(affiliation.url);
      return affiliation.url ? `${name || "Website"} (${affiliation.url})` : name;
    })
    .join(", ");

  return [
    input.detroitConnection ? `Detroit connection: ${input.detroitConnection}` : null,
    input.hereTo ? `Here to: ${input.hereTo}` : null,
    input.neighborhoodExpertise ? `Neighborhood expertise: ${input.neighborhoodExpertise}` : null,
    affiliationSummary ? `Affiliations: ${affiliationSummary}` : null,
  ]
    .filter(Boolean)
    .join(" • ");
}

export async function submitConnectorProfile(
  _previousState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await getCurrentUser();

  if (isSupabaseConfigured() && !user) {
    redirect("/login?next=/create-profile");
  }

  const result = formSchema.safeParse({
    profileType: stringValue(formData, "profileType"),
    neighborhood: stringValue(formData, "neighborhood"),
    zipCode: stringValue(formData, "zipCode"),
    detroitConnection: stringValue(formData, "detroitConnection"),
    hereTo: stringValue(formData, "hereTo"),
    neighborhoodExpertise: stringValue(formData, "neighborhoodExpertise"),
    languages: stringValue(formData, "languages"),
    firstName: stringValue(formData, "firstName"),
    lastName: stringValue(formData, "lastName"),
    organizationName: stringValue(formData, "organizationName"),
    email: stringValue(formData, "email"),
    phone: stringValue(formData, "phone"),
    preferredContact: stringValue(formData, "preferredContact"),
    currentEmployer: stringValue(formData, "currentEmployer"),
    industry: stringValue(formData, "industry"),
    jobTitle: stringValue(formData, "jobTitle"),
    organizationType: stringValue(formData, "organizationType"),
    affiliationNames: formData.getAll("affiliationName").map((value) => String(value).trim()),
    affiliationUrls: formData.getAll("affiliationUrl").map((value) => String(value).trim()),
    yearsConnected: stringValue(formData, "yearsConnected"),
    otherTopic: stringValue(formData, "otherTopic"),
    avatarKey: stringValue(formData, "avatarKey") as AvatarKey | "",
    topics: listValue(formData, "topics"),
    skills: listValue(formData, "skills"),
    availability: listValue(formData, "availability"),
  });
  const profilePhotoValue = formData.get("profilePhoto");
  const profilePhoto = profilePhotoValue instanceof File && profilePhotoValue.size > 0
    ? profilePhotoValue
    : null;
  const profilePhotoError = validateProfilePhoto(profilePhoto);

  if (!result.success || profilePhotoError) {
    return {
      message: "Review the highlighted fields.",
      fieldErrors: {
        ...(result.success ? {} : result.error.flatten().fieldErrors),
        ...(profilePhotoError ? { profilePhoto: [profilePhotoError] } : {}),
      },
    };
  }

  const parsed = result.data;
  const topicSet = new Set(parsed.topics);
  if (parsed.otherTopic) {
    topicSet.add(parsed.otherTopic);
  }

  const fullName = parsed.profileType === "Organization"
    ? parsed.organizationName!
    : `${parsed.firstName} ${parsed.lastName}`.trim();
  const headline =
    parsed.jobTitle ||
    parsed.organizationType ||
    (parsed.profileType === "Organization" ? "Detroit organization" : "Detroit connector");

  const bio = buildBio({
    detroitConnection: parsed.detroitConnection,
    hereTo: parsed.hereTo,
    neighborhoodExpertise: parsed.neighborhoodExpertise,
    affiliations: parsed.affiliationNames.map((name, index) => ({
      name,
      url: parsed.affiliationUrls[index] ?? "",
    })),
  });
  let avatarUrl: string | undefined;

  if (profilePhoto) {
    try {
      avatarUrl = await saveProfilePhoto(profilePhoto, user?.id);
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

  const created = await createConnectorProfile({
    ownerId: user?.id ?? null,
    kind: profileTypeMap[parsed.profileType],
    name: fullName,
    headline,
    bio,
    organizationName: parsed.profileType === "Organization" ? parsed.organizationName : parsed.currentEmployer,
    email: parsed.email,
    phone: parsed.phone || undefined,
    preferredContactMethod: parsed.preferredContact || undefined,
    neighborhood: parsed.neighborhood,
    zipCode: parsed.zipCode || undefined,
    yearsConnected: parsed.yearsConnected || undefined,
    languages: parseCommaList(parsed.languages || ""),
    topics: Array.from(topicSet),
    skills: Array.from(new Set(parsed.skills)),
    availability: parsed.availability,
    avatarKey: parsed.avatarKey,
    avatarUrl,
  });

  redirect(`/connectors?created=${encodeURIComponent(created.id)}`);
}
