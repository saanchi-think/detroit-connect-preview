import { createAdminClient } from "@/lib/supabase/admin";

type DigestFrequency = "immediate" | "daily" | "weekly";

type DeliverySetting = {
  connection_requests: boolean;
  direct_messages: boolean;
  email_digest_frequency: string;
  forum_replies: boolean;
  last_email_digest_at: string | null;
  recommendations: boolean;
  updated_at: string;
  user_id: string;
};

type DeliveryEvent = {
  actor_id: string | null;
  created_at: string;
  detail: string;
  group_key: string;
  href: string;
  id: string;
  kind: "friend" | "recommendation" | "comment" | "mention" | "message";
  title: string;
};

type DeliverySafetyControl = {
  actor_id: string;
  blocked_at: string | null;
  muted_at: string | null;
  target_id: string;
};

type MutedForumPost = {
  post_id: string;
  user_id: string;
};

type DeliveryProfile = {
  display_name: string;
  email: string | null;
  id: string;
};

const groupLabels: Record<DeliveryEvent["kind"], string> = {
  friend: "Network",
  recommendation: "Recommendations",
  comment: "Community replies",
  mention: "Mentions",
  message: "Messages",
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeFrequency(value: string): DigestFrequency {
  if (value === "immediate" || value === "weekly") return value;
  return "daily";
}

function isDeliveryDue(setting: DeliverySetting, now: Date) {
  const frequency = normalizeFrequency(setting.email_digest_frequency);
  if (frequency === "immediate") return true;

  const lastDelivery = setting.last_email_digest_at
    ? new Date(setting.last_email_digest_at).getTime()
    : new Date(setting.updated_at).getTime();
  const interval = frequency === "weekly" ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

  return Number.isFinite(lastDelivery) && now.getTime() - lastDelivery >= interval;
}

function eventIsEnabled(event: DeliveryEvent, setting: DeliverySetting) {
  if (event.kind === "friend") return setting.connection_requests;
  if (event.kind === "message") return setting.direct_messages;
  if (event.kind === "comment" || event.kind === "mention") return setting.forum_replies;
  return setting.recommendations;
}

function buildEmailHtml(profile: DeliveryProfile, events: DeliveryEvent[], siteUrl: string) {
  const groups = new Map<string, DeliveryEvent[]>();

  events.forEach((event) => {
    const label = groupLabels[event.kind];
    groups.set(label, [...(groups.get(label) ?? []), event]);
  });

  const sections = Array.from(groups.entries())
    .map(([label, items]) => `
      <section style="margin:24px 0">
        <h2 style="margin:0 0 10px;font-size:15px;color:#193743">${escapeHtml(label)}</h2>
        ${items.map((item) => `
          <a href="${escapeHtml(new URL(item.href, siteUrl).toString())}" style="display:block;margin:0 0 8px;padding:14px 16px;border:1px solid #dce4e7;border-radius:8px;color:#17252b;text-decoration:none">
            <strong style="display:block;font-size:14px">${escapeHtml(item.title)}</strong>
            <span style="display:block;margin-top:4px;color:#64757d;font-size:12px;line-height:1.45">${escapeHtml(item.detail)}</span>
          </a>
        `).join("")}
      </section>
    `)
    .join("");

  return `
    <!doctype html>
    <html>
      <body style="margin:0;background:#f4f7f8;font-family:Arial,sans-serif;color:#17252b">
        <main style="max-width:620px;margin:0 auto;padding:32px 20px">
          <div style="padding:24px;border:1px solid #dce4e7;border-top:4px solid #193743;border-radius:10px;background:#fff">
            <p style="margin:0;color:#9b6a18;font-size:11px;font-weight:700;text-transform:uppercase">Detroit Connect</p>
            <h1 style="margin:8px 0 4px;font-size:24px">Your community updates</h1>
            <p style="margin:0;color:#64757d;font-size:13px">Hi ${escapeHtml(profile.display_name)}, here is what happened since your last email.</p>
            ${sections}
            <a href="${escapeHtml(new URL("/notifications", siteUrl).toString())}" style="display:inline-block;padding:11px 16px;border-radius:7px;background:#193743;color:#fff;font-size:13px;font-weight:700;text-decoration:none">View notifications</a>
          </div>
        </main>
      </body>
    </html>
  `;
}

async function sendEmail(profile: DeliveryProfile, events: DeliveryEvent[], frequency: DigestFrequency) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_EMAIL_FROM;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:5200";

  if (!apiKey || !from) {
    throw new Error("Missing notification email environment variables.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [profile.email],
      subject:
        frequency === "weekly"
          ? "Your weekly Detroit Connect updates"
          : frequency === "daily"
            ? "Your daily Detroit Connect updates"
            : "New activity on Detroit Connect",
      html: buildEmailHtml(profile, events, siteUrl),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Email provider rejected the notification: ${detail}`);
  }
}

export async function deliverNotificationEmails(now = new Date()) {
  const admin = createAdminClient();
  const { data: settingRows, error: settingsError } = await admin
    .from("user_settings")
    .select(
      "user_id, connection_requests, direct_messages, forum_replies, recommendations, email_digest_frequency, last_email_digest_at, updated_at",
    )
    .eq("email_notifications", true);

  if (settingsError) {
    throw new Error(`Could not load notification delivery settings: ${settingsError.message}`);
  }

  const dueSettings = (settingRows as DeliverySetting[]).filter((setting) =>
    isDeliveryDue(setting, now),
  );
  const userIds = dueSettings.map((setting) => setting.user_id);

  if (userIds.length === 0) {
    return { delivered: 0, recipients: 0 };
  }

  const { data: profileRows, error: profilesError } = await admin
    .from("user_profiles")
    .select("id, display_name, email")
    .in("id", userIds);

  if (profilesError) {
    throw new Error(`Could not load notification recipients: ${profilesError.message}`);
  }

  const profiles = new Map(
    (profileRows as DeliveryProfile[]).map((profile) => [profile.id, profile]),
  );
  const [{ data: safetyRows, error: safetyError }, { data: mutedPostRows, error: mutedPostsError }] =
    await Promise.all([
      admin
        .from("user_safety_controls")
        .select("actor_id, target_id, blocked_at, muted_at")
        .in("actor_id", userIds),
      admin
        .from("forum_post_subscriptions")
        .select("user_id, post_id")
        .in("user_id", userIds)
        .eq("status", "muted"),
    ]);

  if (safetyError || mutedPostsError) {
    throw new Error(
      `Could not load notification suppression controls: ${(safetyError ?? mutedPostsError)!.message}`,
    );
  }

  const suppressedActorsByUser = new Map<string, Set<string>>();
  (safetyRows as DeliverySafetyControl[]).forEach((control) => {
    if (!control.blocked_at && !control.muted_at) return;
    const actorIds = suppressedActorsByUser.get(control.actor_id) ?? new Set<string>();
    actorIds.add(control.target_id);
    suppressedActorsByUser.set(control.actor_id, actorIds);
  });
  const mutedPostsByUser = new Map<string, Set<string>>();
  (mutedPostRows as MutedForumPost[]).forEach((subscription) => {
    const postIds = mutedPostsByUser.get(subscription.user_id) ?? new Set<string>();
    postIds.add(subscription.post_id);
    mutedPostsByUser.set(subscription.user_id, postIds);
  });
  let delivered = 0;
  let recipients = 0;

  for (const setting of dueSettings) {
    const profile = profiles.get(setting.user_id);
    if (!profile?.email) continue;

    const cutoff = setting.last_email_digest_at ?? setting.updated_at;
    const { data: eventRows, error: eventsError } = await admin
      .from("notification_events")
      .select("id, actor_id, kind, title, detail, href, group_key, created_at")
      .eq("recipient_id", setting.user_id)
      .gt("created_at", cutoff)
      .is("email_sent_at", null)
      .order("created_at", { ascending: true })
      .limit(50);

    if (eventsError) {
      throw new Error(`Could not load pending notification emails: ${eventsError.message}`);
    }

    const suppressedActors = suppressedActorsByUser.get(setting.user_id) ?? new Set<string>();
    const mutedPosts = mutedPostsByUser.get(setting.user_id) ?? new Set<string>();
    const events = (eventRows as DeliveryEvent[]).filter((event) => {
      if (!eventIsEnabled(event, setting)) return false;
      if (event.actor_id && suppressedActors.has(event.actor_id)) return false;
      return !Array.from(mutedPosts).some((postId) =>
        event.group_key === `forum-comment:${postId}` ||
        event.group_key === `forum-mention:${postId}`,
      );
    });
    if (events.length === 0) continue;

    const frequency = normalizeFrequency(setting.email_digest_frequency);
    await sendEmail(profile, events, frequency);
    const deliveredAt = now.toISOString();
    const eventIds = events.map((event) => event.id);
    const { error: eventUpdateError } = await admin
      .from("notification_events")
      .update({ email_sent_at: deliveredAt })
      .in("id", eventIds);
    const { error: settingUpdateError } = await admin
      .from("user_settings")
      .update({ last_email_digest_at: deliveredAt })
      .eq("user_id", setting.user_id);

    if (eventUpdateError || settingUpdateError) {
      throw new Error(
        `Email sent but delivery status could not be saved: ${(eventUpdateError ?? settingUpdateError)!.message}`,
      );
    }

    delivered += events.length;
    recipients += 1;
  }

  return { delivered, recipients };
}
