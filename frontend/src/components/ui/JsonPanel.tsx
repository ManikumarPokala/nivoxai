"use client";

import { useMemo } from "react";
import { Copy } from "lucide-react";
import { useI18n } from "@/i18n";

type JsonPanelProps = {
  title: string;
  data: unknown;
  defaultOpen?: boolean;
  className?: string;
};

export default function JsonPanel({ title, data, defaultOpen, className }: JsonPanelProps) {
  const { t } = useI18n();
  const text = useMemo(() => {
    if (typeof data === "string") {
      return data;
    }
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }, [data]);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore clipboard failures
    }
  };

  return (
    <details
      open={defaultOpen}
      className={`rounded-2xl border border-slate-200 bg-white ${className ?? ""}`}
    >
      <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-xs text-slate-600">
        <span className="font-semibold text-slate-900">{title}</span>
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void copyText();
          }}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600"
        >
          <Copy className="h-3 w-3" />
          {t("action_copy")}
        </button>
      </summary>
      <pre className="max-h-72 overflow-auto rounded-b-2xl bg-slate-900 p-4 text-xs text-slate-100">
        {text}
      </pre>
    </details>
  );
}
