import { MessageCircle, UserPlus } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { addFriendAction } from "@/lib/friends/actions";
import { getCurrentUser } from "@/lib/auth/user";
import { getPublicMemberProfile } from "@/lib/members/repository";

type MemberPageProps = {
  params: Promise<{ id: string }>;
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "DC";
}

export default async function MemberPage({ params }: MemberPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  const member = await getPublicMemberProfile(id, user);

  if (!member) {
    notFound();
  }

  if (member.connectorProfileId) {
    redirect(`/connectors/${member.connectorProfileId}`);
  }

  return (
    <main className="page-shell member-profile-page">
      <AppHeader />
      <Link className="back-link" href="/network">Back to network</Link>
      <section className="member-profile-card" aria-labelledby="member-name">
        <span className="member-profile-avatar" aria-hidden="true">{getInitials(member.name)}</span>
        <div className="member-profile-copy">
          <span className="profile-kind">Community member</span>
          <h1 id="member-name">{member.name}</h1>
          <p>{member.detail}</p>
        </div>
        <div className="member-profile-actions">
          {member.isFriend ? (
            <Link className="profile-action-button primary" href={`/messages/friend:${encodeURIComponent(member.id)}`}>
              <MessageCircle aria-hidden="true" size={16} />
              Message
            </Link>
          ) : (
            <form action={addFriendAction}>
              <input name="friendQuery" type="hidden" value={member.email ?? member.name} />
              <button className="profile-action-button primary" type="submit">
                <UserPlus aria-hidden="true" size={16} />
                Add friend
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
