import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function CreateProfileLayout({ children }: { children: React.ReactNode }) {
  if (isSupabaseConfigured() && !(await getCurrentUser())) {
    redirect("/login?next=/create-profile");
  }

  return children;
}
