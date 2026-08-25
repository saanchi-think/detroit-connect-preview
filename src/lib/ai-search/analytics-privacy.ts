import { createHash } from "node:crypto";

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/g;

export function sanitizeSearchQueryForAnalytics(query: string) {
  return query
    .replace(EMAIL_PATTERN, "[email]")
    .replace(PHONE_PATTERN, "[phone]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

export function createSearchQueryFingerprint(query: string) {
  return createHash("sha256").update(query.toLocaleLowerCase("en-US")).digest("hex");
}
