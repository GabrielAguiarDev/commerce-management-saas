"use client";

import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type MouseEvent,
  type Ref,
} from "react";
import { css } from "../css";

/**
 * The button used across every portal.
 *
 * It is a plain `<button>` in everything — same attributes, same `style`, same
 * hover classes — plus one rule: **while the action is running, the button is
 * inert and shows a spinner**. A handler that returns a promise gets that for
 * free; a synchronous one (opening a modal, switching a filter) behaves exactly
 * as before, because there is nothing to wait for.
 *
 * Why it exists: two clicks on "Registrar venda" used to record two sales, and
 * every screen solved it its own way — one swapped the label for "Salvando…",
 * another only dimmed the button, most did nothing at all. Now the rule ships
 * with the button itself.
 *
 * The button never shrinks while loading: the content keeps its space (it is
 * only made invisible) and the spinner is drawn on top of it, centered.
 * Without that, the action bar jumped on every save.
 */
export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  /**
   * The button's action. When it returns a promise, the button waits for it:
   * it stays disabled and shows the spinner until the promise settles.
   */
  onClick?: (e: MouseEvent<HTMLButtonElement>) => unknown;
  /** Style as a CSS declaration string — an alternative to `style={css(...)}`. */
  cssText?: string;
  /**
   * Externally driven loading — for when the wait does not belong to this
   * button's own click (a `useActionState`, a screen-wide `useTransition`).
   */
  loading?: boolean;
  /**
   * The name a screen reader announces while the label is hidden. The default
   * is English on purpose: this library never hardcodes text the customer
   * reads, so every app passes its own translated one.
   */
  loadingLabel?: string;
  ref?: Ref<HTMLButtonElement>;
};

export function Button({
  onClick,
  cssText,
  style,
  loading,
  disabled,
  className,
  loadingLabel = "Loading…",
  children,
  ...rest
}: ButtonProps) {
  const [running, setRunning] = useState(false);

  // An action that closes its own modal unmounts the button before it settles;
  // without this guard the final `setRunning` would land on a gone component.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const busy = loading || running;
  const inert = busy || disabled;

  // `disabled` only takes effect on the next render, so a fast double click can
  // still get two events through. This ref closes that window on the spot.
  const pending = useRef(false);

  const handleClick = async (e: MouseEvent<HTMLButtonElement>) => {
    if (inert || pending.current || !onClick) return;

    const result = onClick(e);
    if (!isPromise(result)) return;

    pending.current = true;
    setRunning(true);
    try {
      await result;
    } finally {
      pending.current = false;
      if (mounted.current) setRunning(false);
    }
  };

  // The design's style string comes first; an explicit `style` still wins.
  const base: CSSProperties = { ...(cssText ? css(cssText) : null), ...style };

  return (
    <button
      {...rest}
      style={{
        ...base,
        // The spinner is drawn over the label, so the button anchors it.
        position: base.position ?? "relative",
        ...(inert ? { cursor: busy ? "progress" : "not-allowed" } : null),
        // Dimmed only when it is plainly unavailable: while it works, full
        // strength keeps the spinner readable. Screens that already dress
        // their own disabled state keep the look they chose.
        ...(disabled && !busy ? { opacity: base.opacity ?? 0.6 } : null),
      }}
      className={inert ? withoutHover(className) : className}
      disabled={inert}
      aria-busy={busy || undefined}
      // With the label hidden the button would be left with no accessible name.
      aria-label={busy ? (rest["aria-label"] ?? loadingLabel) : rest["aria-label"]}
      onClick={handleClick}
    >
      {/* `display:contents` keeps the children in the button's own layout — a
          flex row with a gap stays a flex row with a gap. `visibility` is
          inherited, so it hides everything inside without giving up the space
          it already took. */}
      <span style={busy ? HIDDEN_CONTENT : CONTENT}>{children}</span>

      {busy && (
        <span style={SPINNER_LAYER}>
          <Spinner />
        </span>
      )}
    </button>
  );
}

/** The spinning ring. Sized in `em`, so it follows its host's font size. */
export function Spinner({ style }: { style?: CSSProperties }) {
  return <span className="spinner" aria-hidden style={style} />;
}

const CONTENT: CSSProperties = { display: "contents" };
const HIDDEN_CONTENT: CSSProperties = { display: "contents", visibility: "hidden" };

const SPINNER_LAYER: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

function isPromise(value: unknown): value is Promise<unknown> {
  return typeof (value as Promise<unknown> | null)?.then === "function";
}

/**
 * Hover classes paint with `!important` to beat the inline style, and `:hover`
 * still applies to a disabled button — which would light up a button that
 * cannot be pressed. Only those classes are dropped; the rest stays.
 */
function withoutHover(className?: string): string | undefined {
  if (!className) return className;
  const kept = className
    .split(" ")
    .filter((c) => c && !c.startsWith("hv-"))
    .join(" ");
  return kept || undefined;
}
