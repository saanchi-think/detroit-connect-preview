import {
  Ban,
  Bell,
  BellOff,
  Clock3,
  Download,
  Eye,
  KeyRound,
  LockKeyhole,
  Mail,
  MessageCircle,
  Power,
  ShieldCheck,
  Share2,
  Trash2,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import {
  deactivateAccountAction,
  deleteAccountAction,
  updateAccountEmailAction,
  updateAccountPasswordAction,
} from "@/app/account/actions";
import { AppHeader } from "@/components/app-header";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { isCurrentUserAdmin } from "@/lib/admin/repository";
import { getCurrentUser } from "@/lib/auth/user";
import { setMemberBlockedAction, setMemberMutedAction } from "@/lib/safety/actions";
import { getSafetyControls } from "@/lib/safety/repository";
import { getAccountPrivacyPreferences, getNotificationPreferences } from "@/lib/settings/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { savePrivacySettingsAction, saveSettingsAction } from "@/app/settings/actions";

export const dynamic = "force-dynamic";

type SettingsPageProps = {
  searchParams: Promise<{
    error?: string;
    account?: string;
    accountError?: string;
    privacy?: string;
    saved?: string;
    security?: string;
    safety?: string;
    safetyError?: string;
  }>;
};

const preferenceRows = [
  {
    name: "connectionRequests",
    label: "Connection requests",
    detail: "When someone asks to join your network.",
    icon: UserPlus,
  },
  {
    name: "directMessages",
    label: "Direct messages",
    detail: "When a new private message is waiting.",
    icon: MessageCircle,
  },
  {
    name: "forumReplies",
    label: "Forum replies",
    detail: "When someone replies to your post or comment.",
    icon: Bell,
  },
  {
    name: "recommendations",
    label: "Recommendations",
    detail: "When someone recommends you or shares a recommendation.",
    icon: Share2,
  },
] as const;

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const needsSignIn = isSupabaseConfigured() && !user;
  const [preferences, privacy, safetyControls, isAdmin] = await Promise.all([
    getNotificationPreferences(user),
    getAccountPrivacyPreferences(user),
    getSafetyControls(user),
    isCurrentUserAdmin(user),
  ]);

  return (
    <main className="page-shell settings-page">
      <AppHeader />
      <section className="page-hero compact">
        <h1>Settings</h1>
      </section>

      {needsSignIn ? (
        <section className="empty-panel settings-sign-in">
          <p>Sign in to manage your account settings.</p>
          <Link href="/login?next=/settings">Sign in</Link>
        </section>
      ) : (
        <div className="settings-stack">
          {params.error ? <div className="page-notice is-error">{params.error}</div> : null}
          {params.accountError ? <div className="page-notice is-error">{params.accountError}</div> : null}
          {params.safetyError ? <div className="page-notice is-error">{params.safetyError}</div> : null}
          {params.saved === "1" ? <div className="page-notice" role="status">Settings saved.</div> : null}
          {params.safety ? <div className="page-notice" role="status">Safety controls updated.</div> : null}
          {params.privacy === "saved" ? <div className="page-notice" role="status">Privacy settings saved.</div> : null}
          {params.security === "email-sent" ? <div className="page-notice" role="status">Check both email addresses to confirm the change.</div> : null}
          {params.security === "password" ? <div className="page-notice" role="status">Password updated.</div> : null}
          {params.security?.endsWith("-demo") ? <div className="page-notice" role="status">This control is ready; account changes require the connected sign-in environment.</div> : null}
          {params.account === "reactivated" ? <div className="page-notice" role="status">Your account is active again.</div> : null}

          <form action={savePrivacySettingsAction} className="settings-panel" id="privacy-controls">
            <header>
              <div>
                <h2>Privacy</h2>
                <p>Control who can find and contact you.</p>
              </div>
            </header>
            <div className="settings-choice-list">
              <label className="settings-choice-row">
                <span className="settings-row-icon"><Eye aria-hidden="true" size={18} /></span>
                <span className="settings-row-copy">
                  <strong>Profile visibility</strong>
                  <small>Choose who can see your connector profile.</small>
                </span>
                <select defaultValue={privacy.profileVisibility} name="profileVisibility">
                  <option value="public">Anyone</option>
                  <option value="members">Detroit Connect members</option>
                  <option value="network">My network only</option>
                </select>
              </label>
              <label className="settings-choice-row">
                <span className="settings-row-icon"><Mail aria-hidden="true" size={18} /></span>
                <span className="settings-row-copy">
                  <strong>Contact details</strong>
                  <small>Choose who can use your email or phone.</small>
                </span>
                <select defaultValue={privacy.contactVisibility} name="contactVisibility">
                  <option value="members">Detroit Connect members</option>
                  <option value="network">My network only</option>
                  <option value="private">Only me</option>
                </select>
              </label>
              <label className="settings-choice-row">
                <span className="settings-row-icon"><MessageCircle aria-hidden="true" size={18} /></span>
                <span className="settings-row-copy">
                  <strong>New messages</strong>
                  <small>Existing conversations remain available.</small>
                </span>
                <select defaultValue={privacy.messagePermission} name="messagePermission">
                  <option value="members">Any Detroit Connect member</option>
                  <option value="network">My network only</option>
                  <option value="none">No new messages</option>
                </select>
              </label>
            </div>
            <button className="settings-save" type="submit">Save privacy</button>
          </form>

          <form action={saveSettingsAction} className="settings-panel" id="notification-delivery">
            <header>
              <div>
                <h2>Notifications</h2>
                <p>Choose which activity appears in your notifications.</p>
              </div>
            </header>
            <div className="settings-list">
              {preferenceRows.map(({ detail, icon: Icon, label, name }) => (
                <label className="settings-row" key={name}>
                  <span className="settings-row-icon"><Icon aria-hidden="true" size={18} /></span>
                  <span className="settings-row-copy">
                    <strong>{label}</strong>
                    <small>{detail}</small>
                  </span>
                  <input defaultChecked={preferences[name]} name={name} type="checkbox" />
                  <span aria-hidden="true" className="settings-toggle" />
                </label>
              ))}
            </div>
            <div className="settings-delivery">
              <div className="settings-delivery-heading">
                <Mail aria-hidden="true" size={18} />
                <div>
                  <h3>Email delivery</h3>
                  <p>Receive selected notifications at your account email.</p>
                </div>
              </div>
              <label className="settings-digest-row">
                <span className="settings-row-icon"><Clock3 aria-hidden="true" size={18} /></span>
                <span className="settings-row-copy">
                  <strong>Email schedule</strong>
                  <small>Choose whether and how often notification emails arrive.</small>
                </span>
                <select
                  defaultValue={preferences.emailNotifications ? preferences.digestFrequency : "off"}
                  name="digestSchedule"
                >
                  <option value="off">Off</option>
                  <option value="immediate">As activity happens</option>
                  <option value="daily">Daily digest</option>
                  <option value="weekly">Weekly digest</option>
                </select>
              </label>
            </div>
            <button className="settings-save" type="submit">Save changes</button>
          </form>

          <section className="settings-panel" id="account-security">
            <header>
              <div>
                <h2>Account security</h2>
                <p>Keep your sign-in details current.</p>
              </div>
            </header>
            <div className="account-settings-forms">
              <form action={updateAccountEmailAction} className="account-settings-form">
                <div className="account-settings-form-heading">
                  <span className="settings-row-icon"><Mail aria-hidden="true" size={18} /></span>
                  <div><strong>Email address</strong><small>A confirmation is sent before it changes.</small></div>
                </div>
                <div className="account-settings-control-row">
                  <input autoComplete="email" defaultValue={user?.email ?? ""} name="email" placeholder="you@example.com" required type="email" />
                  <button type="submit">Update email</button>
                </div>
              </form>
              <form action={updateAccountPasswordAction} className="account-settings-form">
                <div className="account-settings-form-heading">
                  <span className="settings-row-icon"><KeyRound aria-hidden="true" size={18} /></span>
                  <div><strong>Password</strong><small>Use at least 10 characters.</small></div>
                </div>
                <div className="account-settings-password-grid">
                  <input autoComplete="new-password" minLength={10} name="password" placeholder="New password" required type="password" />
                  <input autoComplete="new-password" minLength={10} name="confirmation" placeholder="Confirm password" required type="password" />
                  <button type="submit">Update password</button>
                </div>
                <Link href="/forgot-password">Send a password reset email instead</Link>
              </form>
            </div>
          </section>

          <section className="settings-panel account-data-panel" id="account-data">
            <div className="account-data-copy">
              <span className="settings-row-icon"><Download aria-hidden="true" size={18} /></span>
              <div>
                <h2>Your data</h2>
                <p>Download your profile, network, saved items, posts, and messages as JSON.</p>
              </div>
            </div>
            <a className="account-download-button" href="/api/account/export" download>
              <Download aria-hidden="true" size={16} /> Download my data
            </a>
          </section>

          <section className="settings-panel safety-settings-panel" id="safety-controls">
            <header>
              <div>
                <h2>Muted and blocked</h2>
                <p>Review people you have limited. These changes can be undone at any time.</p>
              </div>
            </header>
            {safetyControls.length > 0 ? (
              <div className="safety-settings-list">
                {safetyControls.map((control) => (
                  <article key={control.targetId}>
                    <Link href={control.profileHref}>
                      <span className="safety-member-avatar" aria-hidden="true">
                        {control.targetName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}
                      </span>
                      <span>
                        <strong>{control.targetName}</strong>
                        <small>
                          {control.isBlocked && control.isMuted
                            ? "Blocked and muted"
                            : control.isBlocked
                              ? "Blocked"
                              : "Muted"}
                        </small>
                      </span>
                    </Link>
                    <div className="safety-member-actions">
                      {control.isMuted ? (
                        <form action={setMemberMutedAction}>
                          <input name="targetId" type="hidden" value={control.targetId} />
                          <input name="targetName" type="hidden" value={control.targetName} />
                          <input name="profileHref" type="hidden" value={control.profileHref} />
                          <input name="returnTo" type="hidden" value="/settings#safety-controls" />
                          <input name="muted" type="hidden" value="false" />
                          <button type="submit"><BellOff aria-hidden="true" size={15} /> Unmute</button>
                        </form>
                      ) : null}
                      {control.isBlocked ? (
                        <form action={setMemberBlockedAction}>
                          <input name="targetId" type="hidden" value={control.targetId} />
                          <input name="targetName" type="hidden" value={control.targetName} />
                          <input name="profileHref" type="hidden" value={control.profileHref} />
                          <input name="returnTo" type="hidden" value="/settings#safety-controls" />
                          <input name="blocked" type="hidden" value="false" />
                          <ConfirmSubmitButton
                            confirmMessage={`Unblock ${control.targetName}? They will be able to find and contact you again.`}
                            type="submit"
                          >
                            <Ban aria-hidden="true" size={15} /> Unblock
                          </ConfirmSubmitButton>
                        </form>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="settings-empty-row">
                <ShieldCheck aria-hidden="true" size={18} />
                <span>No muted or blocked members.</span>
              </div>
            )}
          </section>

          <section className="settings-panel account-lifecycle-panel" id="account-lifecycle">
            <header>
              <div>
                <h2>Account status</h2>
                <p>Deactivate temporarily or permanently delete your account.</p>
              </div>
            </header>
            <details className="account-lifecycle-option">
              <summary>
                <span className="settings-row-icon"><Power aria-hidden="true" size={18} /></span>
                <span><strong>Deactivate account</strong><small>Hide your profile until you reactivate.</small></span>
              </summary>
              <form action={deactivateAccountAction}>
                <p>Your profile becomes unavailable and notifications stop. Sign in again to reactivate.</p>
                <label><span>Type DEACTIVATE</span><input autoComplete="off" name="confirmation" required /></label>
                <ConfirmSubmitButton confirmMessage="Deactivate your Detroit Connect account?" type="submit">
                  Deactivate account
                </ConfirmSubmitButton>
              </form>
            </details>
            <details className="account-lifecycle-option is-danger">
              <summary>
                <span className="settings-row-icon"><Trash2 aria-hidden="true" size={18} /></span>
                <span><strong>Delete account</strong><small>Permanently remove your account and personal activity.</small></span>
              </summary>
              <form action={deleteAccountAction}>
                <div className="account-danger-note"><LockKeyhole aria-hidden="true" size={16} /> This cannot be undone.</div>
                <label><span>Account email</span><input autoComplete="email" name="email" required type="email" /></label>
                <label><span>Type DELETE</span><input autoComplete="off" name="confirmation" required /></label>
                <ConfirmSubmitButton confirmMessage="Permanently delete your Detroit Connect account and personal data?" type="submit">
                  Delete account permanently
                </ConfirmSubmitButton>
              </form>
            </details>
          </section>

          {isAdmin ? (
            <section className="settings-panel admin-settings-link">
              <ShieldCheck aria-hidden="true" size={20} />
              <div>
                <h2>Administration</h2>
                <p>Review reports, manage member access, and download data exports.</p>
              </div>
              <Link href="/admin">Open admin</Link>
            </section>
          ) : null}
        </div>
      )}
    </main>
  );
}
