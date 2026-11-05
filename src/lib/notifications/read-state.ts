import { readFile } from "node:fs/promises";
import { getLocalDataPath, writeLocalJson } from "@/lib/local-data";

type NotificationReadState = {
  readIds: string[];
  unreadIds: string[];
};

type NotificationReadStore = Record<string, NotificationReadState>;

const STATE_PATH = getLocalDataPath("local-dev-notification-read-state.json");

async function readStore(): Promise<NotificationReadStore> {
  try {
    return JSON.parse(await readFile(STATE_PATH, "utf8")) as NotificationReadStore;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

export async function getLocalNotificationReadState(userId: string) {
  const store = await readStore();
  return store[userId] ?? { readIds: [], unreadIds: [] };
}

export async function setLocalNotificationsRead(
  userId: string,
  notificationIds: string[],
  shouldBeRead: boolean,
) {
  const store = await readStore();
  const current = store[userId] ?? { readIds: [], unreadIds: [] };
  const changedIds = new Set(notificationIds);
  const readIds = new Set(current.readIds.filter((id) => !changedIds.has(id)));
  const unreadIds = new Set(current.unreadIds.filter((id) => !changedIds.has(id)));

  notificationIds.forEach((id) => {
    if (shouldBeRead) readIds.add(id);
    else unreadIds.add(id);
  });

  store[userId] = {
    readIds: Array.from(readIds),
    unreadIds: Array.from(unreadIds),
  };
  await writeLocalJson(STATE_PATH, store);
}

export async function clearLocalNotificationReadState(userId: string) {
  const store = await readStore();
  delete store[userId];
  await writeLocalJson(STATE_PATH, store);
}
