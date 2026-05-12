"use client";

import * as ScrollArea from "@radix-ui/react-scroll-area";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  Ref,
} from "react";

import type { DerivedLogLine } from "@/types/log";

import { LogLine } from "./log-line";
import styles from "./log-list.module.css";

/** DOM id for a log-line row. Exported so callers that need to focus
 * or scroll to a specific line can use the same value the list
 * renders. */
export const lineDomId = (lineId: string) => `line_${lineId}`;

export function LogList({
  lines,
  focusedLineId,
  selectedContextLineIds,
  hasAnyFilter,
  onKeyDown,
  onLineFocus,
  onToggleContext,
  viewportRef,
}: {
  lines: readonly DerivedLogLine[];
  focusedLineId: string | null;
  selectedContextLineIds: ReadonlySet<string>;
  hasAnyFilter: boolean;
  onKeyDown: (event: ReactKeyboardEvent<HTMLUListElement>) => void;
  onLineFocus: (lineId: string) => void;
  onToggleContext: (lineId: string) => void;
  viewportRef?: Ref<HTMLDivElement>;
}) {
  const handleClick = (
    line: DerivedLogLine,
    isSelected: boolean,
    canToggle: boolean,
    event: ReactMouseEvent<HTMLLIElement>,
  ) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    onLineFocus(line.id);
    if (isSelected || canToggle) {
      onToggleContext(line.id);
    }
  };

  return (
    <ScrollArea.Root className={styles.scrollRoot} type="hover">
      <ScrollArea.Viewport
        ref={viewportRef}
        className={styles.scrollViewport}
      >
        <ul
          className={styles.list}
          role="listbox"
          tabIndex={0}
          aria-label="Log lines"
          aria-activedescendant={
            focusedLineId ? lineDomId(focusedLineId) : undefined
          }
          onKeyDown={onKeyDown}
        >
          {lines.map((line) => {
            const isFocused = line.id === focusedLineId;
            const isSelected = selectedContextLineIds.has(line.id);
            const canToggle =
              hasAnyFilter && line.isVisible && !line.isDimmed;
            const isClickable = isSelected || canToggle;
            return (
              <li
                key={line.id}
                id={lineDomId(line.id)}
                role="option"
                aria-selected={isFocused}
                data-focused={isFocused || undefined}
                data-selected={isSelected || undefined}
                data-dimmed={line.isDimmed || undefined}
                data-clickable={isClickable || undefined}
                onClick={(e) => handleClick(line, isSelected, canToggle, e)}
              >
                <LogLine line={line} />
              </li>
            );
          })}
        </ul>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar
        orientation="vertical"
        className={styles.scrollbar}
      >
        <ScrollArea.Thumb className={styles.scrollbarThumb} />
      </ScrollArea.Scrollbar>
      <ScrollArea.Corner />
    </ScrollArea.Root>
  );
}
