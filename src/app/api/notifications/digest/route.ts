import { NextRequest, NextResponse } from "next/server";
import { deliverNotificationEmails } from "@/lib/notifications/email-delivery";

export const dynamic = "force-dynamic";

async function deliver(request: NextRequest) {
  const secret = process.env.NOTIFICATION_CRON_SECRET ?? process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await deliverNotificationEmails();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Notification delivery failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return deliver(request);
}

export async function POST(request: NextRequest) {
  return deliver(request);
}
