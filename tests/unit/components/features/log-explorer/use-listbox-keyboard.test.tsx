import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useListboxKeyboard } from "@/components/features/log-explorer/use-listbox-keyboard";
import type { LogLine } from "@/types/log";

const lines: readonly LogLine[] = [
  { id: "a", timestamp: 0, instance: "x", level: "INFO", message: "1" },
  { id: "b", timestamp: 1, instance: "x", level: "INFO", message: "2" },
  { id: "c", timestamp: 2, instance: "x", level: "INFO", message: "3" },
];

function fakeEvent(key: string, shiftKey = false) {
  return {
    key,
    shiftKey,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    preventDefault: vi.fn(),
  } as unknown as React.KeyboardEvent<HTMLUListElement>;
}

function setup(focusedLineId: string | null) {
  const setFocusedLineId = vi.fn<(id: string) => void>();
  const onToggleContext = vi.fn<(id: string) => void>();
  const onExpandContext = vi.fn<() => void>();
  const onNextAnchor = vi.fn<() => void>();
  const onPrevAnchor = vi.fn<() => void>();
  const { result } = renderHook(() =>
    useListboxKeyboard({
      lines,
      focusedLineId,
      setFocusedLineId,
      onToggleContext,
      onExpandContext,
      onNextAnchor,
      onPrevAnchor,
    }),
  );
  return {
    handleKeyDown: result.current,
    setFocusedLineId,
    onToggleContext,
    onExpandContext,
    onNextAnchor,
    onPrevAnchor,
  };
}

describe("useListboxKeyboard", () => {
  it("j engages focus at the first row when nothing is focused", () => {
    const { handleKeyDown, setFocusedLineId } = setup(null);
    handleKeyDown(fakeEvent("j"));
    expect(setFocusedLineId).toHaveBeenCalledWith("a");
  });

  it("j (with ArrowDown as alias) moves focus to the next row", () => {
    const { handleKeyDown, setFocusedLineId } = setup("a");
    handleKeyDown(fakeEvent("ArrowDown"));
    expect(setFocusedLineId).toHaveBeenCalledWith("b");
  });

  it("j stays put when focus is on the last row", () => {
    const { handleKeyDown, setFocusedLineId } = setup("c");
    handleKeyDown(fakeEvent("j"));
    expect(setFocusedLineId).toHaveBeenCalledWith("c");
  });

  it("k engages focus at the last row when nothing is focused", () => {
    const { handleKeyDown, setFocusedLineId } = setup(null);
    handleKeyDown(fakeEvent("k"));
    expect(setFocusedLineId).toHaveBeenCalledWith("c");
  });

  it("k (with ArrowUp as alias) moves focus to the previous row", () => {
    const { handleKeyDown, setFocusedLineId } = setup("c");
    handleKeyDown(fakeEvent("ArrowUp"));
    expect(setFocusedLineId).toHaveBeenCalledWith("b");
  });

  it("k stays put when focus is on the first row", () => {
    const { handleKeyDown, setFocusedLineId } = setup("a");
    handleKeyDown(fakeEvent("k"));
    expect(setFocusedLineId).toHaveBeenCalledWith("a");
  });

  it("g jumps to the first row", () => {
    const { handleKeyDown, setFocusedLineId } = setup("c");
    handleKeyDown(fakeEvent("g"));
    expect(setFocusedLineId).toHaveBeenCalledWith("a");
  });

  it("Shift+G jumps to the last row", () => {
    const { handleKeyDown, setFocusedLineId } = setup("a");
    handleKeyDown(fakeEvent("G", true));
    expect(setFocusedLineId).toHaveBeenCalledWith("c");
  });

  it("E toggles context on the focused line", () => {
    const { handleKeyDown, onToggleContext } = setup("b");
    handleKeyDown(fakeEvent("e"));
    expect(onToggleContext).toHaveBeenCalledWith("b");
  });

  it("Enter toggles context on the focused line (alias for E)", () => {
    const { handleKeyDown, onToggleContext } = setup("b");
    handleKeyDown(fakeEvent("Enter"));
    expect(onToggleContext).toHaveBeenCalledWith("b");
  });

  it("E does nothing when no line is focused", () => {
    const { handleKeyDown, onToggleContext } = setup(null);
    handleKeyDown(fakeEvent("e"));
    expect(onToggleContext).not.toHaveBeenCalled();
  });

  it("Shift+E expands the most-recent context", () => {
    const { handleKeyDown, onExpandContext } = setup("b");
    handleKeyDown(fakeEvent("E", true));
    expect(onExpandContext).toHaveBeenCalledOnce();
  });

  it("] cycles to the next anchor", () => {
    const { handleKeyDown, onNextAnchor } = setup("a");
    handleKeyDown(fakeEvent("]"));
    expect(onNextAnchor).toHaveBeenCalledOnce();
  });

  it("[ cycles to the previous anchor", () => {
    const { handleKeyDown, onPrevAnchor } = setup("a");
    handleKeyDown(fakeEvent("["));
    expect(onPrevAnchor).toHaveBeenCalledOnce();
  });

  it("ignores modified keys (cmd/ctrl/alt)", () => {
    const { handleKeyDown, setFocusedLineId, onToggleContext } = setup("a");
    const event = {
      key: "j",
      shiftKey: false,
      metaKey: true,
      ctrlKey: false,
      altKey: false,
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent<HTMLUListElement>;
    handleKeyDown(event);
    expect(setFocusedLineId).not.toHaveBeenCalled();
    expect(onToggleContext).not.toHaveBeenCalled();
  });

  it("does nothing when lines is empty", () => {
    const setFocusedLineId = vi.fn<(id: string) => void>();
    const onToggleContext = vi.fn<(id: string) => void>();
    const onExpandContext = vi.fn<() => void>();
    const onNextAnchor = vi.fn<() => void>();
    const onPrevAnchor = vi.fn<() => void>();
    const { result } = renderHook(() =>
      useListboxKeyboard({
        lines: [],
        focusedLineId: null,
        setFocusedLineId,
        onToggleContext,
        onExpandContext,
        onNextAnchor,
        onPrevAnchor,
      }),
    );
    result.current(fakeEvent("j"));
    expect(setFocusedLineId).not.toHaveBeenCalled();
  });
});
