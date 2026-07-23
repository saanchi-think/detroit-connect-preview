"use client";

import {
  Bell,
  Bookmark,
  CircleUserRound,
  House,
  LogIn,
  LogOut,
  MapPin,
  MessageCircle,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/", label: "Home", mobileLabel: "Home", icon: House },
  { href: "/forum", label: "Community Forum", mobileLabel: "Forum", icon: MessageCircle },
  { href: "/explore", label: "Explore Detroit", mobileLabel: "Explore", icon: MapPin },
  { href: "/friends", label: "Friends", mobileLabel: "Friends", icon: Users },
  { href: "/favorites", label: "Favorites", mobileLabel: "Saved", icon: Bookmark },
  { href: "/notifications", label: "Notifications", mobileLabel: "Alerts", icon: Bell },
];

export function AppHeader() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    try {
      const supabase = createClient();

      supabase.auth
        .getUser()
        .then(({ data }) => {
          setEmail(data.user?.email ?? null);
        })
        .catch(() => undefined);

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setEmail(session?.user.email ?? null);
      });

      return () => subscription.unsubscribe();
    } catch {
      return undefined;
    }
  }, []);

  async function handleSignOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Missing local env should not block the visual prototype.
    }

    setEmail(null);
    window.location.href = "/";
  }

  return (
    <header className="topbar">
      <Link className="brand" href="/">
        <span className="brand-mark">DC</span>
        <span className="brand-copy">
          <strong>Detroit</strong>
          <strong>Connect</strong>
        </span>
      </Link>
      <nav aria-label="Primary navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link className={isActive ? "active" : ""} href={item.href} key={item.href}>
              <Icon aria-hidden="true" className="nav-item-icon" size={18} />
              <span className="nav-label nav-label-desktop">{item.label}</span>
              <span className="nav-label nav-label-mobile">{item.mobileLabel}</span>
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-actions">
        <Link
          className={`profile-button ${pathname.startsWith("/profile") || pathname.startsWith("/connectors/") ? "active" : ""}`}
          href={email ? "/profile" : "/create-profile"}
        >
          <CircleUserRound aria-hidden="true" size={17} />
          <span>{email ? "My profile" : "Create profile"}</span>
        </Link>
        {email ? (
          <button className="sidebar-session-action" type="button" onClick={handleSignOut}>
            <LogOut aria-hidden="true" size={15} />
            <span>Sign out</span>
          </button>
        ) : (
          <Link className="sidebar-session-action" href="/login">
            <LogIn aria-hidden="true" size={15} />
            <span>Sign in</span>
          </Link>
        )}
      </div>
    </header>
  );
}
