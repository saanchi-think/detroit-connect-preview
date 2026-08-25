import { NextResponse } from "next/server";
import { z } from "zod";
import { recordSearchInteraction } from "@/lib/ai-search/analytics";
import { getCurrentUser } from "@/lib/auth/user";

const searchEventSchema = z.discriminatedUnion("eventType", [
  z.object({
    connectorId: z.string().uuid(),
    eventType: z.literal("result_click"),
    query: z.string().trim().min(1).max(240),
  }),
  z.object({
    eventType: z.literal("feedback"),
    feedbackValue: z.union([z.literal(-1), z.literal(1)]),
    query: z.string().trim().min(1).max(240),
  }),
]);

export async function POST(request: Request) {
  try {
    const event = searchEventSchema.parse(await request.json());
    const user = await getCurrentUser();
    await recordSearchInteraction({
      connectorId: event.eventType === "result_click" ? event.connectorId : undefined,
      eventType: event.eventType,
      feedbackValue: event.eventType === "feedback" ? event.feedbackValue : undefined,
      query: event.query,
      userId: user?.id ?? null,
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid search event." }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not record the search event." }, { status: 500 });
  }
}
