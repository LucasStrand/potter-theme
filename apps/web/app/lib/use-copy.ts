"use client";
import { useCallback, useRef, useState } from "react";

export function useCopy(timeout = 1200) {
  const [copied, setCopied] = useState<string | null>(null);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copy = useCallback(
    (text: string) => {
      navigator.clipboard?.writeText(text).catch(() => {});
      setCopied(text);
      if (t.current) clearTimeout(t.current);
      t.current = setTimeout(() => setCopied(null), timeout);
    },
    [timeout],
  );
  return { copied, copy };
}
