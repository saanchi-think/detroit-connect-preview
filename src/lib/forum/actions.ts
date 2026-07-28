"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/user";
import { saveForumImages, validateForumImages } from "@/lib/forum/images";
import {
  createForumComment,
  createForumPost,
  toggleForumPostLike,
  updateForumComment,
} from "@/lib/forum/repository";
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

  const images = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  const imageError = validateForumImages(images);
  if (imageError) {
    redirect(`/forum?error=${encodeURIComponent(imageError)}`);
  }

  let errorMessage = "";

  try {
    const imageUrls = images.length ? await saveForumImages(images, user?.id) : [];
    await createForumPost({ ...parsed.data, imageUrls }, user);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not publish the post.";
  }

  if (errorMessage) {
    redirect(`/forum?error=${encodeURIComponent(errorMessage)}`);
  }

  revalidatePath("/forum");
  redirect("/forum?posted=1");
}

export async function editForumCommentAction(formData: FormData) {
  const user = await getCurrentUser();
  const commentId = String(formData.get("commentId") ?? "").trim();
  const postId = String(formData.get("postId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (isSupabaseConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent(`/forum#comment-${commentId}`)}`);
  }

  if (!commentId || !postId || body.length < 2 || body.length > 500) {
    redirect(`/forum?error=${encodeURIComponent("Add a comment between 2 and 500 characters.")}`);
  }

  try {
    await updateForumComment({ commentId, postId, body }, user);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not edit the comment.";
    redirect(`/forum?error=${encodeURIComponent(message)}#comment-${commentId}`);
  }

  revalidatePath("/forum");
  redirect(`/forum?commented=edited#comment-${commentId}`);
}

export async function createForumCommentAction(formData: FormData) {
  const user = await getCurrentUser();
  const postId = String(formData.get("postId") ?? "").trim();
  const parentCommentId = String(formData.get("parentCommentId") ?? "").trim() || null;
  const body = String(formData.get("body") ?? "").trim();

  if (isSupabaseConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent(`/forum#post-${postId}`)}`);
  }

  if (!postId || body.length < 2 || body.length > 500) {
    redirect("/forum?error=Add+a+short+comment.");
  }

  let errorMessage = "";

  try {
    await createForumComment({ postId, body, parentCommentId }, user);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not publish the comment.";
  }

  if (errorMessage) {
    redirect(`/forum?error=${encodeURIComponent(errorMessage)}`);
  }

  revalidatePath("/forum");
  redirect(`/forum?commented=1#post-${postId}`);
}

export async function toggleForumPostLikeAction(formData: FormData) {
  const user = await getCurrentUser();
  const postId = String(formData.get("postId") ?? "").trim();

  if (isSupabaseConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent(`/forum#post-${postId}`)}`);
  }

  if (!postId) {
    redirect("/forum?error=That+post+is+not+available.");
  }

  let errorMessage = "";

  try {
    await toggleForumPostLike(postId, user);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not update the like.";
  }

  if (errorMessage) {
    redirect(`/forum?error=${encodeURIComponent(errorMessage)}`);
  }

  revalidatePath("/forum");
  redirect(`/forum#post-${postId}`);
}
