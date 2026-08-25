import {
  BadgeCheck,
  EyeOff,
  Flag,
  HeartHandshake,
  Scale,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";

const guidelines = [
  {
    icon: HeartHandshake,
    title: "Be helpful and respectful",
    body: "Treat people with patience. Harassment, discrimination, threats, and targeted insults are not allowed.",
  },
  {
    icon: BadgeCheck,
    title: "Be honest about your experience",
    body: "Share what you know firsthand, identify professional affiliations, and do not impersonate people or organizations.",
  },
  {
    icon: EyeOff,
    title: "Protect personal information",
    body: "Do not publish another person's address, phone number, private messages, financial information, or identifying documents.",
  },
  {
    icon: Scale,
    title: "Offer guidance responsibly",
    body: "Do not present community advice as guaranteed medical, legal, financial, or safety guidance. Encourage professional help when appropriate.",
  },
  {
    icon: ShieldCheck,
    title: "Keep recommendations trustworthy",
    body: "Recommend people you genuinely trust. Disclose personal or business relationships and avoid paid, misleading, or coordinated endorsements.",
  },
  {
    icon: Flag,
    title: "Keep the platform useful",
    body: "No scams, spam, deceptive links, repetitive promotion, illegal activity, or content unrelated to helping people connect with Detroit.",
  },
] as const;

export default function CommunityGuidelinesPage() {
  return (
    <main className="page-shell guidelines-page">
      <AppHeader />
      <section className="page-hero compact guidelines-hero">
        <span className="guidelines-eyebrow">Community standards</span>
        <h1>Community Guidelines</h1>
        <p>Simple standards for a useful, welcoming, and trustworthy Detroit Connect.</p>
      </section>

      <div className="guidelines-layout">
        <aside className="guidelines-summary" aria-label="Guidelines summary">
          <ShieldCheck aria-hidden="true" size={24} />
          <strong>Help neighbors connect safely.</strong>
          <p>Use your real experience, respect privacy, and report behavior that puts people at risk.</p>
          <Link href="/forum">Return to the forum</Link>
        </aside>

        <article className="guidelines-content">
          <div className="guidelines-grid">
            {guidelines.map(({ body, icon: Icon, title }, index) => (
              <section key={title}>
                <span className="guideline-number">{String(index + 1).padStart(2, "0")}</span>
                <Icon aria-hidden="true" size={19} />
                <div>
                  <h2>{title}</h2>
                  <p>{body}</p>
                </div>
              </section>
            ))}
          </div>

          <section className="guidelines-enforcement">
            <div>
              <h2>Reporting and enforcement</h2>
              <p>
                Use the report option on a profile, post, comment, or message. Detroit Connect may
                remove content, limit features, suspend accounts, or permanently remove accounts
                when these guidelines are violated.
              </p>
            </div>
            <Link href="/settings#safety-controls">Manage safety controls</Link>
          </section>
        </article>
      </div>
    </main>
  );
}
