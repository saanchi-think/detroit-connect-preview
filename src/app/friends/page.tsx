import { redirect } from "next/navigation";

type LegacyFriendsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LegacyFriendsPage({ searchParams }: LegacyFriendsPageProps) {
  const params = await searchParams;
  const nextParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => nextParams.append(key, entry));
    } else if (value) {
      nextParams.set(key, value);
    }
  });

  redirect(`/network${nextParams.size ? `?${nextParams.toString()}` : ""}`);
}
