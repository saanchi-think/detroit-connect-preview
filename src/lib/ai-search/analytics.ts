import "server-only";
import type { AiSearchIntent } from "@/lib/ai-search/types";
import {
  createSearchQueryFingerprint,
  sanitizeSearchQueryForAnalytics,
} from "@/lib/ai-search/analytics-privacy";
import type { Json } from "@/lib/database.types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

async function insertSearchEvent(event: {
  event_type: "search_completed" | "result_click" | "feedback";
  query: string;
  result_count?: number;
  latency_ms?: number;
  used_ai?: boolean;
  unable_to_verify?: boolean;
  selected_connector_id?: string;
  feedback_value?: -1 | 1;
  intent?: AiSearchIntent;
  user_id?: string | null;
}) {
  if (!isSupabaseConfigured()) return;

  const queryText = sanitizeSearchQueryForAnalytics(event.query);
  if (!queryText) return;

  try {
    const supabase = await createClient();
    await supabase.from("search_analytics_events").insert({
      event_type: event.event_type,
      feedback_value: event.feedback_value ?? null,
      intent: (event.intent ?? {}) as Json,
      latency_ms: event.latency_ms ?? null,
      query_fingerprint: createSearchQueryFingerprint(queryText),
      query_text: queryText,
      result_count: event.result_count ?? null,
      selected_connector_id: event.selected_connector_id ?? null,
      unable_to_verify: event.unable_to_verify ?? null,
      used_ai: event.used_ai ?? null,
      user_id: event.user_id ?? null,
    });
  } catch {
    // Search must remain available if best-effort product analytics are unavailable.
  }
}

export async function recordSearchCompleted(event: {
  query: string;
  resultCount: number;
  latencyMs: number;
  usedAi: boolean;
  unableToVerify: boolean;
  intent: AiSearchIntent;
  userId: string | null;
}) {
  return insertSearchEvent({
    event_type: "search_completed",
    intent: event.intent,
    latency_ms: Math.max(0, Math.round(event.latencyMs)),
    query: event.query,
    result_count: Math.max(0, event.resultCount),
    unable_to_verify: event.unableToVerify,
    used_ai: event.usedAi,
    user_id: event.userId,
  });
}

export async function recordSearchInteraction(event: {
  eventType: "result_click" | "feedback";
  query: string;
  connectorId?: string;
  feedbackValue?: -1 | 1;
  userId: string | null;
}) {
  return insertSearchEvent({
    event_type: event.eventType,
    feedback_value: event.feedbackValue,
    query: event.query,
    selected_connector_id: event.connectorId,
    user_id: event.userId,
  });
}
