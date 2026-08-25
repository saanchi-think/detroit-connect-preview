import { KeyRound } from "lucide-react";
import Link from "next/link";
import { updateRecoveredPasswordAction } from "@/app/account/actions";
import { AppHeader } from "@/components/app-header";

type ResetPasswordPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;

  return (
    <main className="page-shell auth-shell">
      <AppHeader />
      <section className="auth-card account-auth-card" aria-labelledby="new-password-title">
        <div className="auth-copy">
          <span>Account recovery</span>
          <h1 id="new-password-title">Choose a new password</h1>
          <p>Use at least 10 characters and avoid a password used elsewhere.</p>
        </div>
        {params.error ? <div className="auth-alert">{params.error}</div> : null}
        <form className="auth-form" action={updateRecoveredPasswordAction}>
          <label>
            <span>New password</span>
            <input autoComplete="new-password" minLength={10} name="password" required type="password" />
          </label>
          <label>
            <span>Confirm new password</span>
            <input autoComplete="new-password" minLength={10} name="confirmation" required type="password" />
          </label>
          <button className="primary-button" type="submit">
            <KeyRound aria-hidden="true" size={16} /> Update password
          </button>
        </form>
        <Link className="auth-link" href="/login">Back to sign in</Link>
      </section>
    </main>
  );
}
