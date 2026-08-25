import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";

export default function AccountSuspendedPage() {
  return (
    <main className="page-shell account-suspended-page">
      <AppHeader />
      <section className="empty-panel">
        <ShieldAlert aria-hidden="true" size={26} />
        <h1>Account access paused</h1>
        <p>Your Detroit Connect account is under review. Contact the site administrator for help.</p>
        <Link href="mailto:support@detroitconnect.org">Contact support</Link>
      </section>
    </main>
  );
}
