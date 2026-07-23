"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/user";
import { createConnectorProfile } from "@/lib/connectors/repository";
import type { AvatarKey } from "@/lib/connectors/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const profileTypeMap = {
  "Individual helper": "person",
  "Vendor / service provider": "vendor",
  "Community organization": "organization",
} as const;

const formSchema = z.object({
  profileType: z.enum([
    "Individual helper",
    "Vendor / service provider",
    "Community organization",
  ]),
  neighborhood: z.string().trim().min(1),
  zipCode: z.string().trim().optional(),
  detroitConnection: z.string().trim().optional(),
  hereTo: z.string().trim().optional(),
  neighborhoodExpertise: z.string().trim().optional(),
  languages: z.string().trim().optional(),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.email().or(z.literal("")).optional(),
  phone: z.string().trim().optional(),
  preferredContact: z.string().trim().optional(),
  currentEmployer: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  jobTitle: z.string().trim().optional(),
  organizationType: z.string().trim().optional(),
  organizations: z.string().trim().optional(),
  yearsConnected: z.string().trim().optional(),
  otherTopic: z.string().trim().optional(),
  avatarKey: z.enum(["tire", "boat", "car", "pizza"]).optional(),
  topics: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  availability: z.array(z.string()).default([]),
});

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

function buildBio(input: {
  detroitConnection?: string;
  hereTo?: string;
  neighborhoodExpertise?: string;
  organizations?: string;
}) {
  return [
    input.detroitConnection ? `Detroit connection: ${input.detroitConnection}` : null,
    input.hereTo ? `Here to: ${input.hereTo}` : null,
    input.neighborhoodExpertise ? `Neighborhood expertise: ${input.neighborhoodExpertise}` : null,
    input.organizations ? `Affiliations: ${input.organizations}` : null,
  ]
    .filter(Boolean)
    .join(" • ");
}

export async function submitConnectorProfile(formData: FormData) {
  const user = await getCurrentUser();

  if (isSupabaseConfigured() && !user) {
    redirect("/login?next=/create-profile");
  }

  const parsed = formSchema.parse({
    profileType: stringValue(formData, "profileType"),
    neighborhood: stringValue(formData, "neighborhood"),
    zipCode: stringValue(formData, "zipCode"),
    detroitConnection: stringValue(formData, "detroitConnection"),
    hereTo: stringValue(formData, "hereTo"),
    neighborhoodExpertise: stringValue(formData, "neighborhoodExpertise"),
    languages: stringValue(formData, "languages"),
    firstName: stringValue(formData, "firstName"),
    lastName: stringValue(formData, "lastName"),
    email: stringValue(formData, "email"),
    phone: stringValue(formData, "phone"),
    preferredContact: stringValue(formData, "preferredContact"),
    currentEmployer: stringValue(formData, "currentEmployer"),
    industry: stringValue(formData, "industry"),
    jobTitle: stringValue(formData, "jobTitle"),
    organizationType: stringValue(formData, "organizationType"),
    organizations: stringValue(formData, "organizations"),
    yearsConnected: stringValue(formData, "yearsConnected"),
    otherTopic: stringValue(formData, "otherTopic"),
    avatarKey: stringValue(formData, "avatarKey") as AvatarKey | "",
    topics: listValue(formData, "topics"),
    skills: listValue(formData, "skills"),
    availability: listValue(formData, "availability"),
  });

  const topicSet = new Set(parsed.topics);
  if (parsed.otherTopic) {
    topicSet.add(parsed.otherTopic);
  }

  const fullName = `${parsed.firstName} ${parsed.lastName}`.trim();
  const headline =
    parsed.jobTitle ||
    parsed.organizationType ||
    (parsed.profileType === "Vendor / service provider"
      ? "Detroit service provider"
      : parsed.profileType === "Community organization"
        ? "Community organization"
        : "Detroit connector");

  const bio = buildBio({
    detroitConnection: parsed.detroitConnection,
    hereTo: parsed.hereTo,
    neighborhoodExpertise: parsed.neighborhoodExpertise,
    organizations: parsed.organizations,
  });

  const created = await createConnectorProfile({
    ownerId: user?.id ?? null,
    kind: profileTypeMap[parsed.profileType],
    name: fullName,
    headline,
    bio,
    organizationName: parsed.currentEmployer,
    email: parsed.email || undefined,
    phone: parsed.phone || undefined,
    preferredContactMethod: parsed.preferredContact || undefined,
    neighborhood: parsed.neighborhood,
    zipCode: parsed.zipCode || undefined,
    yearsConnected: parsed.yearsConnected || undefined,
    languages: parseCommaList(parsed.languages || ""),
    topics: Array.from(topicSet),
    skills: parsed.skills,
    availability: parsed.availability,
    avatarKey: parsed.avatarKey,
  });

  redirect(`/connectors?created=${encodeURIComponent(created.id)}`);
}
