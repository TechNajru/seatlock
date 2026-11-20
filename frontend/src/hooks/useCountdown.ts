"use client";
import { useEffect, useState } from "react";

/** Counts down from `start` seconds (re-syncs whenever `start` changes). */
export function useCountdown(start: number | null, onZero?: () => void) {
  const [left, setLeft] = useState<number | null>(start);
  useEffect(() => { setLeft(start); }, [start]);
  useEffect(() => {
    if (left === null) return;
    if (left <= 0) { onZero?.(); return; }
    const t = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(t);
  }, [left, onZero]);
  return left;
}
