"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

type RealtimePageRefreshProps = {
  eventName: "messages" | "notifications";
};

export function RealtimePageRefresh({ eventName }: RealtimePageRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 120);
    };

    window.addEventListener(`detroit-connect:${eventName}-updated`, refresh);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener(`detroit-connect:${eventName}-updated`, refresh);
    };
  }, [eventName, router]);

  return null;
}
