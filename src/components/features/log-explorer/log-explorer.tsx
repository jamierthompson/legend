"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import {
  ScenarioChips,
  SCENARIOS,
} from "@/components/features/scenario-chips/scenario-chips";
import { ShortcutSheet } from "@/components/features/shortcut-sheet/shortcut-sheet";
import { Legend, type LegendItem } from "@/components/ui/legend";
import { isAtFileBoundary } from "@/lib/context-state";
import { deriveLines } from "@/lib/derive-lines";
import {
  filterReducer,
  hasAnyFilter,
  initialFilterState,
} from "@/lib/filter-state";
import { SHORTCUTS } from "@/lib/keyboard-shortcuts";
import type { LogLine } from "@/types/log";

import { LogList, lineDomId } from "./log-list";
import { useContextWindows } from "./use-context-windows";
import { useListboxKeyboard } from "./use-listbox-keyboard";

export function LogExplorer({ lines }: { lines: readonly LogLine[] }) {
  const [filterState, dispatch] = useReducer(filterReducer, initialFilterState);
  const [focusedLineId, setFocusedLineId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  const linesById = useMemo(() => {
    const m = new Map<string, LogLine>();
    for (const l of lines) m.set(l.id, l);
    return m;
  }, [lines]);

  const linesIndexById = useMemo(() => {
    const m = new Map<string, number>();
    lines.forEach((l, i) => m.set(l.id, i));
    return m;
  }, [lines]);

  const {
    openContexts,
    toggleContext,
    expandMostRecentContext,
    closeMostRecentContext,
    closeAllContexts,
    selectedContextLineIds,
    expandPulseKey,
  } = useContextWindows({
    lines,
    linesById,
    linesIndexById,
    filterState,
    scenarios: SCENARIOS,
  });

  const derivedLines = useMemo(
    () => deriveLines(lines, filterState, openContexts),
    [lines, filterState, openContexts],
  );

  const visibleLines = useMemo(
    () => derivedLines.filter((l) => l.isVisible),
    [derivedLines],
  );

  /*
   * Keyboard navigation hops between actionable rows only — dimmed
   * lines are visible context but offer no toggle target, so skipping
   * them keeps j/k feeling quick.
   */
  const navigableLines = useMemo(
    () => visibleLines.filter((l) => !l.isDimmed),
    [visibleLines],
  );

  /*
   * Anchor-cycling: from the focused anchor, move to the next or
   * previous anchor in openContexts order, wrapping at the ends. When
   * the focus isn't on any anchor, the next-anchor binding lands on
   * the first anchor and the previous-anchor binding lands on the
   * last. No-op when no contexts are open.
   */
  const navigateNextAnchor = useCallback(() => {
    if (openContexts.length === 0) return;
    const currentIdx = focusedLineId
      ? openContexts.findIndex((c) => c.selectedLineId === focusedLineId)
      : -1;
    const nextIdx =
      currentIdx === -1 ? 0 : (currentIdx + 1) % openContexts.length;
    setFocusedLineId(openContexts[nextIdx].selectedLineId);
  }, [openContexts, focusedLineId]);

  const navigatePrevAnchor = useCallback(() => {
    if (openContexts.length === 0) return;
    const currentIdx = focusedLineId
      ? openContexts.findIndex((c) => c.selectedLineId === focusedLineId)
      : -1;
    const prevIdx =
      currentIdx === -1
        ? openContexts.length - 1
        : (currentIdx - 1 + openContexts.length) % openContexts.length;
    setFocusedLineId(openContexts[prevIdx].selectedLineId);
  }, [openContexts, focusedLineId]);

  const handleKeyDown = useListboxKeyboard({
    lines: navigableLines,
    focusedLineId,
    setFocusedLineId,
    onToggleContext: toggleContext,
    onExpandContext: expandMostRecentContext,
    onNextAnchor: navigateNextAnchor,
    onPrevAnchor: navigatePrevAnchor,
  });

  /*
   * Land at the newest line on first paint, matching how tail-style log
   * viewers open. useLayoutEffect runs before the browser paints, so
   * the user never sees the unscrolled position flash by.
   */
  useLayoutEffect(() => {
    const v = viewportRef.current;
    if (!v) return;
    v.scrollTop = v.scrollHeight;
  }, []);

  useEffect(() => {
    if (!focusedLineId) return;
    document
      .getElementById(lineDomId(focusedLineId))
      ?.scrollIntoView({ block: "nearest" });
  }, [focusedLineId]);

  /*
   * Document-level bindings. Esc / Shift+Esc dismiss contexts and
   * filters; ? opens the shortcut sheet. Bails on
   * event.defaultPrevented so the open sheet can consume Esc first,
   * and on editable targets so inputs keep their own key semantics.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      // `?` is Shift+/ on most layouts; match the produced character.
      if (event.key === "?") {
        event.preventDefault();
        setSheetOpen(true);
        return;
      }

      if (event.key !== "Escape") return;

      if (event.shiftKey) {
        if (openContexts.length > 0) {
          event.preventDefault();
          closeAllContexts();
        }
        return;
      }

      if (openContexts.length > 0) {
        event.preventDefault();
        closeMostRecentContext();
      } else if (hasAnyFilter(filterState)) {
        event.preventDefault();
        dispatch({ type: "clear" });
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [
    openContexts.length,
    closeAllContexts,
    closeMostRecentContext,
    filterState,
    dispatch,
  ]);

  /*
   * Translate app state into Legend entries. Items appear left to right
   * in the order they're pushed; the rightmost entry is the stable
   * "ground" position. Each entry is gated on whether its action is
   * currently meaningful.
   */
  const legendItems = useMemo<readonly LegendItem[]>(() => {
    const items: LegendItem[] = [];

    const mostRecent = openContexts[openContexts.length - 1];
    if (mostRecent) {
      const anchorIdx = linesIndexById.get(mostRecent.selectedLineId) ?? -1;
      if (!isAtFileBoundary(anchorIdx, mostRecent.range, lines.length)) {
        items.push({
          keys: SHORTCUTS.expandContext.keys,
          label: "Expand context",
          ariaLabel: "Expand the most recent context window",
          onClick: expandMostRecentContext,
          pulseKey: expandPulseKey,
        });
      }
    }

    if (focusedLineId) {
      const focusedIsAnchor = selectedContextLineIds.has(focusedLineId);
      const focusedLine = visibleLines.find((l) => l.id === focusedLineId);
      const focusedCanToggle =
        hasAnyFilter(filterState) &&
        focusedLine !== undefined &&
        focusedLine.isVisible &&
        !focusedLine.isDimmed;

      if (focusedCanToggle || focusedIsAnchor) {
        items.push({
          keys: SHORTCUTS.toggleContext.keys,
          label: focusedIsAnchor ? "Hide context" : "View context",
          ariaLabel: focusedIsAnchor
            ? "Hide context on focused line"
            : "View context on focused line",
          onClick: () => toggleContext(focusedLineId),
        });
      }
    }

    if (openContexts.length > 0) {
      items.push({
        keys: SHORTCUTS.closeRecent.keys,
        label: "Close recent",
        ariaLabel: "Close the most recent context",
        onClick: closeMostRecentContext,
      });
    } else if (hasAnyFilter(filterState)) {
      items.push({
        keys: SHORTCUTS.closeRecent.keys,
        label: "Clear filter",
        ariaLabel: "Clear active filters",
        onClick: () => dispatch({ type: "clear" }),
      });
    }

    // Fallback: keep the toolbar visible with a pointer to the full
    // shortcut sheet whenever nothing else is contextually relevant.
    if (items.length === 0) {
      items.push({
        keys: SHORTCUTS.openShortcuts.keys,
        label: "for all shortcuts",
        ariaLabel: "Show keyboard shortcuts",
        onClick: () => setSheetOpen(true),
      });
    }

    return items;
  }, [
    openContexts,
    linesIndexById,
    lines.length,
    expandMostRecentContext,
    expandPulseKey,
    closeMostRecentContext,
    focusedLineId,
    selectedContextLineIds,
    visibleLines,
    filterState,
    toggleContext,
  ]);

  return (
    <>
      <Legend items={legendItems} />
      <ScenarioChips state={filterState} dispatch={dispatch} />
      <LogList
        lines={visibleLines}
        focusedLineId={focusedLineId}
        selectedContextLineIds={selectedContextLineIds}
        hasAnyFilter={hasAnyFilter(filterState)}
        onKeyDown={handleKeyDown}
        onLineFocus={setFocusedLineId}
        onToggleContext={toggleContext}
        viewportRef={viewportRef}
      />
      <ShortcutSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}
