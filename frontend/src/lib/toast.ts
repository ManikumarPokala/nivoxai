export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant?: "success" | "error" | "info";
};

const listeners = new Set<(items: ToastItem[]) => void>();
let queue: ToastItem[] = [];

export function pushToast(toast: Omit<ToastItem, "id">) {
  const record: ToastItem = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...toast,
  };
  queue = [record, ...queue].slice(0, 4);
  listeners.forEach((listener) => listener([...queue]));
  setTimeout(() => {
    queue = queue.filter((item) => item.id !== record.id);
    listeners.forEach((listener) => listener([...queue]));
  }, 4000);
}

export type ToastUnsubscribe = () => void;

export function subscribeToasts(listener: (items: ToastItem[]) => void): ToastUnsubscribe {
  listeners.add(listener);
  listener([...queue]);
  return () => {
    listeners.delete(listener);
  };
}
