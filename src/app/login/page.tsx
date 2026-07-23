import Link from "next/link";
import { signInAction, signInWithGoogleAction, signUpAction } from "@/app/login/actions";
import { AppHeader } from "@/components/app-header";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = params.next ?? "/connectors";
  const signUpNext = params.next ?? "/create-profile";

  return (
    <main className="page-shell auth-shell">
      <AppHeader />
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-copy">
          <span>Detroit Connect</span>
          <h1 id="auth-title">Sign in</h1>
          <p>Save connectors, create a profile, and build your trusted Detroit network.</p>
        </div>

        {params.error ? <div className="auth-alert">{params.error}</div> : null}
        {params.message ? <div className="auth-alert is-success">{params.message}</div> : null}

        <form action={signInWithGoogleAction}>
          <input name="next" type="hidden" value={next} />
          <button className="google-auth-button" type="submit">
            <span className="google-mark" aria-hidden="true">
              G
            </span>
            Continue with Google
          </button>
        </form>

        <div className="auth-divider" aria-hidden="true">
          <span>or use email</span>
        </div>

        <form className="auth-form" action={signInAction}>
          <input name="next" type="hidden" value={next} />
          <label>
            <span>Email</span>
            <input autoComplete="email" name="email" placeholder="you@example.com" required type="email" />
          </label>
          <label>
            <span>Password</span>
            <input autoComplete="current-password" minLength={8} name="password" required type="password" />
          </label>
          <button className="primary-button" type="submit">
            Sign in
          </button>
        </form>

        <form className="auth-secondary" action={signUpAction}>
          <input name="next" type="hidden" value={signUpNext} />
          <label>
            <span>Name</span>
            <input autoComplete="name" maxLength={80} name="fullName" placeholder="Your name" required />
          </label>
          <label>
            <span>New account email</span>
            <input autoComplete="email" name="email" placeholder="you@example.com" required type="email" />
          </label>
          <label>
            <span>Password</span>
            <input autoComplete="new-password" minLength={8} name="password" required type="password" />
          </label>
          <button className="secondary-button" type="submit">
            Create account
          </button>
        </form>

        <Link className="auth-link" href="/">
          Back to home
        </Link>
      </section>
    </main>
  );
}
