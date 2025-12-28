"use client";

import { useEffect, useState } from "react";
import { subscribeToasts, type ToastItem } from "@/lib/toast";

export default function ToastViewport() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsub = subscribeToasts(setToasts);
    return () => {
      unsub();
    };
  }, []);

  if (!toasts.length) {
    return null;
  }

  return (
    <div className="fixed right-4 top-20 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`w-72 rounded-2xl border px-4 py-3 text-sm shadow-lg ${
            toast.variant === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : toast.variant === "error"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-slate-200 bg-white text-slate-700"
          }`}
        >
          <p className="font-semibold">{toast.title}</p>
          {toast.description ? (
            <p className="mt-1 text-xs text-slate-600">{toast.description}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
