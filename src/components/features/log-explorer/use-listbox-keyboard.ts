"use client";

import { useCallback, type KeyboardEvent } from "react";

import type { LogLine } from "@/types/log";

type Action =
  | "navigate-next"
  | "navigate-prev"
  | "navigate-first"
  | "navigate-last"
  | "navigate-next-anchor"
  | "navigate-prev-anchor"
  | "toggle-context"
  | "expand-context";

function matchAction(event: KeyboardEvent<HTMLUListElement>): Action | null {
  if (event.metaKey || event.ctrlKey || event.altKey) return null;
  const k = event.key;
  if (event.shiftKey) {
    if (k === "G" || k === "g") return "navigate-last";
    if (k === "E" || k === "e") return "expand-context";
    return null;
  }
  if (k === "j" || k === "ArrowDown") return "navigate-next";
  if (k === "k" || k === "ArrowUp") return "navigate-prev";
  if (k === "g") return "navigate-first";
  if (k === "e" || k === "Enter") return "toggle-context";
  if (k === "]") return "navigate-next-anchor";
  if (k === "[") return "navigate-prev-anchor";
  return null;
}

export function useListboxKeyboard({
  lines,
  focusedLineId,
  setFocusedLineId,
  onToggleContext,
  onExpandContext,
  onNextAnchor,
  onPrevAnchor,
}: {
  lines: readonly LogLine[];
  focusedLineId: string | null;
  setFocusedLineId: (id: string) => void;
  onToggleContext: (lineId: string) => void;
  onExpandContext: () => void;
  onNextAnchor: () => void;
  onPrevAnchor: () => void;
}) {
  return useCallback(
    (event: KeyboardEvent<HTMLUListElement>) => {
      const action = matchAction(event);
      if (action === null) return;
      event.preventDefault();

      if (action === "toggle-context") {
        if (focusedLineId) onToggleContext(focusedLineId);
        return;
      }
      if (action === "expand-context") {
        onExpandContext();
        return;
      }
      if (action === "navigate-next-anchor") {
        onNextAnchor();
        return;
      }
      if (action === "navigate-prev-anchor") {
        onPrevAnchor();
        return;
      }

      if (lines.length === 0) return;

      const current = focusedLineId
        ? lines.findIndex((l) => l.id === focusedLineId)
        : -1;

      let next: number;
      switch (action) {
        case "navigate-next":
          next = current === -1 ? 0 : Math.min(current + 1, lines.length - 1);
          break;
        case "navigate-prev":
          next =
            current === -1
              ? lines.length - 1
              : Math.max(current - 1, 0);
          break;
        case "navigate-first":
          next = 0;
          break;
        case "navigate-last":
          next = lines.length - 1;
          break;
      }

      setFocusedLineId(lines[next].id);
    },
    [
      lines,
      focusedLineId,
      setFocusedLineId,
      onToggleContext,
      onExpandContext,
      onNextAnchor,
      onPrevAnchor,
    ],
  );
}
