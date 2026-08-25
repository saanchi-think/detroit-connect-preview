import { Ban, BellOff, BellRing, Flag, MoreHorizontal, Undo2 } from "lucide-react";
import Link from "next/link";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import {
  reportContentAction,
  setMemberBlockedAction,
  setMemberMutedAction,
} from "@/lib/safety/actions";
import type { SafetyState } from "@/lib/safety/repository";

type ProfileSafetyMenuProps = {
  profileHref: string;
  profileId: string;
  targetId: string;
  targetName: string;
  state: SafetyState;
};

export function ProfileSafetyMenu({
  profileHref,
  profileId,
  targetId,
  targetName,
  state,
}: ProfileSafetyMenuProps) {
  return (
    <details className="profile-safety-menu">
      <summary
        aria-label={`More options for ${targetName}`}
        className="profile-action-button icon-only"
        data-tooltip="More options"
        title="More options"
      >
        <MoreHorizontal aria-hidden="true" size={18} />
      </summary>
      <div className="profile-safety-popover">
        <form action={setMemberMutedAction}>
          <input name="targetId" type="hidden" value={targetId} />
          <input name="targetName" type="hidden" value={targetName} />
          <input name="profileHref" type="hidden" value={profileHref} />
          <input name="returnTo" type="hidden" value={profileHref} />
          <input name="muted" type="hidden" value={String(!state.isMuted)} />
          <button type="submit">
            {state.isMuted
              ? <BellRing aria-hidden="true" size={16} />
              : <BellOff aria-hidden="true" size={16} />}
            {state.isMuted ? "Unmute member" : "Mute member"}
          </button>
        </form>
        <form action={setMemberBlockedAction}>
          <input name="targetId" type="hidden" value={targetId} />
          <input name="targetName" type="hidden" value={targetName} />
          <input name="profileHref" type="hidden" value={profileHref} />
          <input name="returnTo" type="hidden" value={state.isBlocked ? profileHref : "/settings"} />
          <input name="blocked" type="hidden" value={String(!state.isBlocked)} />
          <ConfirmSubmitButton
            className="is-danger"
            confirmMessage={
              state.isBlocked
                ? `Unblock ${targetName}? They will be able to find and contact you again.`
                : `Block ${targetName}? This removes the connection and stops messages, requests, and mentions.`
            }
            type="submit"
          >
            {state.isBlocked
              ? <Undo2 aria-hidden="true" size={16} />
              : <Ban aria-hidden="true" size={16} />}
            {state.isBlocked ? "Unblock member" : "Block member"}
          </ConfirmSubmitButton>
        </form>
        <details className="profile-report-form">
          <summary>
            <Flag aria-hidden="true" size={16} />
            Report profile
          </summary>
          <form action={reportContentAction}>
            <input name="reportedUserId" type="hidden" value={targetId} />
            <input name="targetType" type="hidden" value="profile" />
            <input name="targetId" type="hidden" value={profileId} />
            <input name="returnTo" type="hidden" value={profileHref} />
            <label>
              <span>Reason</span>
              <select name="reason" required defaultValue="">
                <option disabled value="">Choose a reason</option>
                <option value="spam">Spam</option>
                <option value="harassment">Harassment</option>
                <option value="misinformation">Misinformation</option>
                <option value="unsafe_advice">Unsafe advice</option>
                <option value="impersonation">Impersonation</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              <span>Details (optional)</span>
              <textarea maxLength={600} name="details" rows={3} />
            </label>
            <Link className="report-guidelines-link" href="/community-guidelines">
              Review community guidelines
            </Link>
            <button className="report-submit" type="submit">Submit report</button>
          </form>
        </details>
      </div>
    </details>
  );
}
