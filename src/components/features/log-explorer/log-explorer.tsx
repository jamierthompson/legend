"use client";

import {
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
import { Legend, type LegendItem } from "@/components/ui/legend";
import { isAtFileBoundary } from "@/lib/context-state";
import { deriveLines } from "@/lib/derive-lines";
import {
  filterReducer,
  hasAnyFilter,
  initialFilterState,
} from "@/lib/filter-state";
import type { LogLine } from "@/types/log";

import { LogList } from "./log-list";
import { useContextWindows } from "./use-context-windows";
import { useListboxKeyboard } from "./use-listbox-keyboard";

export function LogExplorer({ lines }: { lines: readonly LogLine[] }) {
  const [filterState, dispatch] = useReducer(filterReducer, initialFilterState);
  const [focusedLineId, setFocusedLineId] = useState<string | null>(null);
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

  const handleKeyDown = useListboxKeyboard({
    lines: navigableLines,
    focusedLineId,
    setFocusedLineId,
    onToggleContext: toggleContext,
    onExpandContext: expandMostRecentContext,
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
      .getElementById(`line_${focusedLineId}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [focusedLineId]);

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
          keys: ["Shift", "E"],
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
          keys: ["E"],
          label: focusedIsAnchor ? "Hide context" : "View context",
          ariaLabel: focusedIsAnchor
            ? "Hide context on focused line"
            : "View context on focused line",
          onClick: () => toggleContext(focusedLineId),
        });
      }
    }

    return items;
  }, [
    openContexts,
    linesIndexById,
    lines.length,
    expandMostRecentContext,
    expandPulseKey,
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
    </>
  );
}
