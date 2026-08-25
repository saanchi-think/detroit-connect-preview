import { Flag, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { reportContentAction } from "@/lib/safety/actions";

type ReportContentMenuProps = {
  reportedUserId: string | null;
  returnTo: string;
  targetId: string;
  targetType: "post" | "comment" | "message";
  trigger?: "flag" | "overflow";
};

export function ReportContentMenu({
  reportedUserId,
  returnTo,
  targetId,
  targetType,
  trigger = "flag",
}: ReportContentMenuProps) {
  const isOverflow = trigger === "overflow";

  return (
    <details className={`report-content-menu${isOverflow ? " report-content-menu-quiet" : ""}`}>
      <summary
        aria-label={isOverflow ? `More ${targetType} actions` : `Report ${targetType}`}
        title={isOverflow ? "More actions" : `Report ${targetType}`}
      >
        {isOverflow ? <MoreHorizontal aria-hidden="true" size={16} /> : <Flag aria-hidden="true" size={15} />}
      </summary>
      <form action={reportContentAction}>
        <input name="reportedUserId" type="hidden" value={reportedUserId ?? ""} />
        <input name="targetType" type="hidden" value={targetType} />
        <input name="targetId" type="hidden" value={targetId} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <label>
          <span>Report {targetType}</span>
          <select defaultValue="" name="reason" required>
            <option disabled value="">Choose a reason</option>
            <option value="spam">Spam</option>
            <option value="harassment">Harassment</option>
            <option value="misinformation">Misinformation</option>
            <option value="unsafe_advice">Unsafe advice</option>
            <option value="impersonation">Impersonation</option>
            <option value="other">Other</option>
          </select>
        </label>
        <textarea
          aria-label="Additional details"
          maxLength={600}
          name="details"
          placeholder="Add details (optional)"
          rows={3}
        />
        <Link className="report-guidelines-link" href="/community-guidelines">
          Review community guidelines
        </Link>
        <button type="submit">Submit report</button>
      </form>
    </details>
  );
}
