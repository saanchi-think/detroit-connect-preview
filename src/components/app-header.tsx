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
  Send,
  Settings,
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
  { href: "/network", label: "Network", mobileLabel: "Network", icon: Users },
  { href: "/favorites", label: "Favorites", mobileLabel: "Saved", icon: Bookmark },
  { href: "/messages", label: "Messages", mobileLabel: "Messages", icon: Send },
  { href: "/notifications", label: "Notifications", mobileLabel: "Alerts", icon: Bell },
];

export function AppHeader() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const previewAccountName = process.env.NEXT_PUBLIC_DETROIT_CONNECT_PREVIEW_ACCOUNT?.trim() || null;

  useEffect(() => {
    function refreshUnreadMessages() {
      fetch("/api/messages/unread-count", { cache: "no-store" })
        .then((response) => response.json())
        .then((payload: { count?: number }) => {
          setUnreadMessageCount(Number.isFinite(payload.count) ? Math.max(0, Number(payload.count)) : 0);
        })
        .catch(() => undefined);
    }

    function refreshUnreadNotifications() {
      fetch("/api/notifications/unread-count", { cache: "no-store" })
        .then((response) => response.json())
        .then((payload: { count?: number }) => {
          setUnreadNotificationCount(
            Number.isFinite(payload.count) ? Math.max(0, Number(payload.count)) : 0,
          );
        })
        .catch(() => undefined);
    }

    refreshUnreadMessages();
    refreshUnreadNotifications();

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
        refreshUnreadMessages();
        refreshUnreadNotifications();
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
              {item.href === "/messages" && unreadMessageCount > 0 ? (
                <span
                  aria-label={`${unreadMessageCount} unread ${unreadMessageCount === 1 ? "message" : "messages"}`}
                  className="nav-unread-badge"
                >
                  {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                </span>
              ) : null}
              {item.href === "/notifications" && unreadNotificationCount > 0 ? (
                <span
                  aria-label={`${unreadNotificationCount} unread ${unreadNotificationCount === 1 ? "notification" : "notifications"}`}
                  className="nav-unread-badge nav-notification-badge"
                >
                  {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-actions">
        <div className="sidebar-account-links">
          <Link
            className={`profile-button ${pathname.startsWith("/profile") || pathname.startsWith("/connectors/") ? "active" : ""}`}
            href="/profile"
          >
            <CircleUserRound aria-hidden="true" size={17} />
            <span>My profile</span>
          </Link>
          <Link
            aria-label="Settings"
            className={`settings-button ${pathname.startsWith("/settings") ? "active" : ""}`}
            href="/settings"
            title="Settings"
          >
            <Settings aria-hidden="true" size={17} />
          </Link>
        </div>
        {email ? (
          <button className="sidebar-session-action" type="button" onClick={handleSignOut}>
            <LogOut aria-hidden="true" size={15} />
            <span>Sign out</span>
          </button>
        ) : previewAccountName ? (
          <div
            aria-label={`Signed-in local preview for ${previewAccountName}`}
            className="sidebar-session-action sidebar-preview-account"
            title="Local preview account"
          >
            <CircleUserRound aria-hidden="true" size={15} />
            <span>{previewAccountName}</span>
          </div>
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
