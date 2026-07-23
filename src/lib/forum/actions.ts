"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/user";
import { createForumComment, createForumPost } from "@/lib/forum/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const forumPostSchema = z.object({
  title: z.string().trim().min(5).max(120),
  body: z.string().trim().min(10).max(2000),
  topic: z.enum(["Housing", "Schools", "Business", "Moving", "City Services"]),
});

export async function createForumPostAction(formData: FormData) {
  const user = await getCurrentUser();

  if (isSupabaseConfigured() && !user) {
    redirect("/login?next=/forum");
  }

  const parsed = forumPostSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    topic: String(formData.get("topic") ?? ""),
  });

  if (!parsed.success) {
    redirect("/forum?error=Add+a+title%2C+details%2C+and+topic.");
  }

  let errorMessage = "";

  try {
    await createForumPost(parsed.data, user);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not publish the post.";
  }

  if (errorMessage) {
    redirect(`/forum?error=${encodeURIComponent(errorMessage)}`);
  }

  revalidatePath("/forum");
  redirect("/forum?posted=1");
}

export async function createForumCommentAction(formData: FormData) {
  const user = await getCurrentUser();
  const postId = String(formData.get("postId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (isSupabaseConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent(`/forum#post-${postId}`)}`);
  }

  if (!postId || body.length < 2 || body.length > 500) {
    redirect("/forum?error=Add+a+short+comment.");
  }

  let errorMessage = "";

  try {
    await createForumComment(postId, body, user);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not publish the comment.";
  }

  if (errorMessage) {
    redirect(`/forum?error=${encodeURIComponent(errorMessage)}`);
  }

  revalidatePath("/forum");
  redirect(`/forum?commented=1#post-${postId}`);
}
