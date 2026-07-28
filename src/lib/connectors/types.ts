import type { ProfileKind } from "@/lib/database.types";

export type ConnectorCardModel = {
  id: string;
  kind: ProfileKind;
  name: string;
  role: string;
  neighborhood: string;
  topics: string[];
  languages: string[];
  friendSignal: string;
  avatarKey?: AvatarKey | null;
  avatarUrl?: string | null;
};

export type AvatarKey = "tire" | "boat" | "car" | "pizza";

export type ConnectorProfileModel = ConnectorCardModel & {
  ownerId: string | null;
  bio: string | null;
  organizationName: string | null;
  email: string | null;
  phone: string | null;
  websiteUrl: string | null;
  preferredContactMethod: string | null;
  zipCode: string | null;
  yearsConnected: string | null;
  skills: string[];
  availability: string[];
  trustBadges: string[];
  avatarKey: AvatarKey | null;
  avatarUrl: string | null;
};

export type CreateConnectorProfileInput = {
  ownerId?: string | null;
  kind: ProfileKind;
  name: string;
  headline?: string;
  bio?: string;
  organizationName?: string;
  email?: string;
  phone?: string;
  preferredContactMethod?: string;
  neighborhood?: string;
  zipCode?: string;
  yearsConnected?: string;
  languages: string[];
  topics: string[];
  skills: string[];
  availability: string[];
  avatarKey?: AvatarKey;
  avatarUrl?: string;
};

export type UpdateConnectorProfileInput = CreateConnectorProfileInput & {
  id: string;
};
