import { Mail } from "lucide-react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/app/login/actions";
import { AppHeader } from "@/components/app-header";

type ForgotPasswordPageProps = {
  searchParams: Promise<{ error?: string; sent?: string }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;
  const sent = params.sent === "1" || params.sent === "demo";

  return (
    <main className="page-shell auth-shell">
      <AppHeader />
      <section className="auth-card account-auth-card" aria-labelledby="recovery-title">
        <div className="auth-copy">
          <span>Account recovery</span>
          <h1 id="recovery-title">Reset your password</h1>
          <p>Enter the email used for your Detroit Connect account.</p>
        </div>

        {params.error ? <div className="auth-alert">{params.error}</div> : null}
        {sent ? (
          <div className="account-recovery-sent" role="status">
            <Mail aria-hidden="true" size={20} />
            <div>
              <strong>Check your email</strong>
              <p>If an account matches that address, a secure reset link is on its way.</p>
            </div>
          </div>
        ) : (
          <form className="auth-form" action={requestPasswordResetAction}>
            <label>
              <span>Email</span>
              <input autoComplete="email" name="email" placeholder="you@example.com" required type="email" />
            </label>
            <button className="primary-button" type="submit">Send reset link</button>
          </form>
        )}

        <Link className="auth-link" href="/login">Back to sign in</Link>
      </section>
    </main>
  );
}
