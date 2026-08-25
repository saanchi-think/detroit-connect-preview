import { Power, RotateCcw } from "lucide-react";
import Link from "next/link";
import { reactivateAccountAction } from "@/app/account/actions";
import { AppHeader } from "@/components/app-header";

type AccountDeactivatedPageProps = {
  searchParams: Promise<{ changed?: string; error?: string }>;
};

export default async function AccountDeactivatedPage({ searchParams }: AccountDeactivatedPageProps) {
  const params = await searchParams;

  return (
    <main className="page-shell account-suspended-page">
      <AppHeader />
      <section className="empty-panel account-state-panel">
        <Power aria-hidden="true" size={26} />
        <h1>Account deactivated</h1>
        <p>Your profile is hidden and you will not receive new Detroit Connect activity.</p>
        {params.error ? <div className="page-notice is-error">{params.error}</div> : null}
        {params.changed === "1" ? <div className="page-notice">Your account is now deactivated.</div> : null}
        <form action={reactivateAccountAction}>
          <button className="primary-button" type="submit">
            <RotateCcw aria-hidden="true" size={16} /> Reactivate account
          </button>
        </form>
        <Link href="/login">Sign in with another account</Link>
      </section>
    </main>
  );
}
