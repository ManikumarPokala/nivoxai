export type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  time: string;
  campaignId?: string | null;
};

const STORAGE_KEY = "nivoxai_activity";
const listeners = new Set<(items: ActivityItem[]) => void>();

export function recordActivity(item: Omit<ActivityItem, "id" | "time">) {
  const record: ActivityItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    time: new Date().toLocaleTimeString(),
  };
  const list = [record, ...getActivityLog()].slice(0, 20);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
  listeners.forEach((listener) => listener(list));
}

export function getActivityLog(): ActivityItem[] {
  if (typeof window === "undefined") {
    return [];
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as ActivityItem[];
  } catch {
    return [];
  }
}

export type ActivityUnsubscribe = () => void;

export function subscribeActivity(
  listener: (items: ActivityItem[]) => void
): ActivityUnsubscribe {
  listeners.add(listener);
  listener(getActivityLog());
  return () => {
    listeners.delete(listener);
  };
}
