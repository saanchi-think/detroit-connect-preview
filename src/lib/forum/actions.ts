"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/user";
import { saveForumImages, validateForumImages } from "@/lib/forum/images";
import {
  createForumComment,
  createForumPost,
  deleteForumPost,
  toggleForumPostFollow,
  toggleForumCommentLike,
  toggleForumPostLike,
  toggleForumPostMute,
  toggleForumPostSave,
  updateForumPost,
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

export async function toggleForumCommentLikeAction(formData: FormData) {
  const user = await getCurrentUser();
  const commentId = String(formData.get("commentId") ?? "").trim();

  if (isSupabaseConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent(`/forum#comment-${commentId}`)}`);
  }
  if (!commentId) redirect("/forum?error=That+comment+is+not+available.");

  try {
    await toggleForumCommentLike(commentId, user);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update the comment like.";
    redirect(`/forum?error=${encodeURIComponent(message)}#comment-${commentId}`);
  }

  revalidatePath("/forum");
  redirect(`/forum#comment-${commentId}`);
}

export async function editForumPostAction(formData: FormData) {
  const user = await getCurrentUser();
  const postId = String(formData.get("postId") ?? "").trim();
  const parsed = forumPostSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    topic: String(formData.get("topic") ?? ""),
  });

  if (isSupabaseConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent(`/forum?edit=${postId}#post-${postId}`)}`);
  }
  if (!postId || !parsed.success) {
    redirect(`/forum?error=${encodeURIComponent("Add a title, details, and topic.")}#post-${postId}`);
  }

  try {
    await updateForumPost({ postId, ...parsed.data }, user);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not edit the post.";
    redirect(`/forum?error=${encodeURIComponent(message)}&edit=${encodeURIComponent(postId)}#post-${postId}`);
  }

  revalidatePath("/forum");
  revalidatePath("/favorites");
  redirect(`/forum?updated=1#post-${postId}`);
}

export async function deleteForumPostAction(formData: FormData) {
  const user = await getCurrentUser();
  const postId = String(formData.get("postId") ?? "").trim();

  if (isSupabaseConfigured() && !user) {
    redirect("/login?next=/forum");
  }
  if (!postId) redirect("/forum?error=That+post+is+not+available.");

  try {
    await deleteForumPost(postId, user);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete the post.";
    redirect(`/forum?error=${encodeURIComponent(message)}#post-${postId}`);
  }

  revalidatePath("/forum");
  revalidatePath("/favorites");
  revalidatePath("/notifications");
  redirect("/forum?deleted=1");
}

async function runForumControl(
  formData: FormData,
  operation: "save" | "follow" | "mute",
) {
  const user = await getCurrentUser();
  const postId = String(formData.get("postId") ?? "").trim();
  const requestedReturnTo = String(formData.get("returnTo") ?? `/forum#post-${postId}`);
  const returnTo =
    requestedReturnTo.startsWith("/") && !requestedReturnTo.startsWith("//")
      ? requestedReturnTo
      : `/forum#post-${postId}`;

  if (isSupabaseConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }
  if (!postId) redirect("/forum?error=That+post+is+not+available.");

  try {
    if (operation === "save") await toggleForumPostSave(postId, user);
    if (operation === "follow") await toggleForumPostFollow(postId, user);
    if (operation === "mute") await toggleForumPostMute(postId, user);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update the post.";
    redirect(`/forum?error=${encodeURIComponent(message)}#post-${postId}`);
  }

  revalidatePath("/forum");
  revalidatePath("/favorites");
  revalidatePath("/notifications");
  redirect(returnTo);
}

export async function toggleForumPostSaveAction(formData: FormData) {
  await runForumControl(formData, "save");
}

export async function toggleForumPostFollowAction(formData: FormData) {
  await runForumControl(formData, "follow");
}

export async function toggleForumPostMuteAction(formData: FormData) {
  await runForumControl(formData, "mute");
}
