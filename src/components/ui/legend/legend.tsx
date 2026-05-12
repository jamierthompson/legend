"use client";

import { KeycapSequence } from "@/components/ui/keycap/keycap";

import styles from "./legend.module.css";

type LegendItemBase = {
  /** Cap labels rendered as adjacent keycaps. */
  readonly keys: readonly string[];
  /** User-facing description; rendered next to keycaps. */
  readonly label: string;
  /** Bump to re-trigger the entry's mount animation. */
  readonly pulseKey?: number;
};

/*
 * Entries either render as static text or as a clickable button; the
 * button form requires an accessible name. Encoding the pair as a
 * discriminated union means TS can prove the aria-label is a string
 * on the button branch — no runtime check needed.
 */
export type LegendItem = LegendItemBase &
  (
    | { readonly onClick?: undefined; readonly ariaLabel?: undefined }
    | { readonly onClick: () => void; readonly ariaLabel: string }
  );

export function Legend({ items }: { items: readonly LegendItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className={styles.legend} role="toolbar" aria-label="Keyboard hints">
      {items.map((item) => (
        <LegendEntry key={`${item.label}-${item.pulseKey ?? 0}`} item={item} />
      ))}
    </div>
  );
}

function LegendEntry({ item }: { item: LegendItem }) {
  const content = (
    <>
      <KeycapSequence keys={item.keys} />
      <span className={styles.label}>{item.label}</span>
    </>
  );

  if (item.onClick) {
    return (
      <button
        type="button"
        className={styles.entry}
        aria-label={item.ariaLabel}
        onClick={item.onClick}
      >
        {content}
      </button>
    );
  }

  return <div className={styles.entry}>{content}</div>;
}
