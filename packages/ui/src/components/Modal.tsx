"use client";

import type { ReactNode } from "react";
import { css, SANS } from "../css";
import { CloseIcon } from "../icons";
import { secondaryButton, toneBackground, type Tone } from "../styleKit";
import { Button } from "./Button";

/**
 * The frame of every modal in the portals.
 *
 * On a phone it rises from the bottom and touches the edges — a sheet, not a
 * little centered box with the keyboard on top of it. On a desktop it sits in
 * the middle of the screen.
 *
 * `mobile` comes from outside because each app already knows its breakpoint;
 * the library does not watch the window itself, to avoid duplicating that
 * listener.
 */
export function ModalFrame({
  title,
  subtitle,
  icon,
  width = 470,
  onClose,
  footer,
  mobile,
  closeLabel,
  children,
}: {
  title: string;
  subtitle?: string;
  /** The visual mark left of the title — a warning of what the action will do. */
  icon?: ReactNode;
  width?: number;
  onClose: () => void;
  footer?: ReactNode;
  mobile?: boolean;
  closeLabel: string;
  children?: ReactNode;
}) {
  return (
    <div
      onClick={onClose}
      style={css(
        "position:fixed;inset:0;z-index:105;display:flex;justify-content:center;" +
          `align-items:${mobile ? "flex-end" : "center"};padding:${mobile ? "0" : "20px"};` +
          "background:rgba(8,17,24,.55);animation:fadein .15s ease",
      )}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-label={title}
        style={css(
          `width:100%;max-width:${width}px;max-height:94vh;overflow-y:auto;` +
            `background:var(--surface);border:1px solid var(--border);` +
            `border-radius:${mobile ? "16px 16px 0 0" : "16px"};` +
            "box-shadow:var(--shadow-lg);animation:rise .2s ease",
        )}
      >
        <div
          style={css(
            "display:flex;align-items:flex-start;justify-content:space-between;gap:12px;" +
              "padding:16px 18px;border-bottom:1px solid var(--border)",
          )}
        >
          <div style={css("display:flex;align-items:flex-start;gap:13px;min-width:0")}>
            {icon}
            <div style={css("min-width:0")}>
              <h2 style={css(`margin:0;font:700 17.5px/1.2 ${SANS}`)}>{title}</h2>
              {subtitle && (
                <p style={css(`margin:3px 0 0;font:400 12px/1.5 ${SANS};color:var(--muted)`)}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <Button
            onClick={onClose}
            aria-label={closeLabel}
            className="hv-text"
            cssText={
              "flex:none;width:32px;height:32px;display:flex;align-items:center;" +
              "justify-content:center;border-radius:8px;border:1px solid var(--border);" +
              "background:var(--surface2);color:var(--muted)"
            }
          >
            <CloseIcon />
          </Button>
        </div>

        {children && (
          <div style={css("padding:16px 18px;display:flex;flex-direction:column;gap:14px")}>
            {children}
          </div>
        )}

        {footer}
      </div>
    </div>
  );
}

/** Cancel on the left, confirm on the right — and stuck to the bottom on scroll. */
export function ModalFooter({
  onCancel,
  onConfirm,
  confirmText,
  cancelText,
  confirmColor = "var(--accent)",
  confirmInk = "var(--accent-ink)",
  blocked,
  extra,
}: {
  onCancel: () => unknown;
  /**
   * The main verb. When it returns a promise — the usual case, since almost
   * every modal writes something — the button waits with a spinner in place of
   * its label.
   */
  onConfirm: () => unknown;
  confirmText: string;
  cancelText: string;
  confirmColor?: string;
  confirmInk?: string;
  /** Confirmation pending — the main verb stays inert until it is released. */
  blocked?: boolean;
  /** A third action, to the left of the other two (an export, for instance). */
  extra?: ReactNode;
}) {
  return (
    <div
      style={css(
        "display:flex;gap:10px;padding:14px 18px;border-top:1px solid var(--border);" +
          "background:var(--surface2);position:sticky;bottom:0",
      )}
    >
      {extra}
      <Button onClick={onCancel} cssText={`flex:1;padding:14px;${secondaryButton()}`}>
        {cancelText}
      </Button>
      <Button
        onClick={onConfirm}
        disabled={blocked}
        className="hv-glow"
        cssText={
          `flex:1;padding:14px;border-radius:11px;background:${confirmColor};color:${confirmInk};` +
          `font:700 13.5px ${SANS};` +
          (blocked ? "opacity:.5;" : "")
        }
      >
        {confirmText}
      </Button>
    </div>
  );
}

/** An exclusive-choice button — cost type, stock movement type. */
export function ChoiceCard({
  name,
  note,
  active,
  onClick,
}: {
  name: string;
  note?: string;
  active: boolean;
  onClick: () => unknown;
}) {
  return (
    <Button
      onClick={onClick}
      aria-pressed={active}
      cssText={
        `padding:12px 10px;border:1.5px solid ${active ? "var(--accent)" : "var(--border2)"};` +
        `border-radius:11px;background:${active ? "var(--accent-soft)" : "var(--surface2)"};` +
        `color:${active ? "var(--accent)" : "var(--text2)"};text-align:left`
      }
    >
      <span style={css(`display:block;font:700 13px ${SANS}`)}>{name}</span>
      {note && (
        <span style={css(`display:block;margin-top:3px;font:500 11px/1.35 ${SANS};opacity:.85`)}>
          {note}
        </span>
      )}
    </Button>
  );
}

/** A choice pill — categories, inside a modal. */
export function ChoicePill({
  name,
  active,
  onClick,
}: {
  name: string;
  active: boolean;
  onClick: () => unknown;
}) {
  return (
    <Button
      onClick={onClick}
      aria-pressed={active}
      cssText={
        `padding:9px 13px;border-radius:999px;border:1px solid ${active ? "var(--accent)" : "var(--border)"};` +
        `background:${active ? "var(--accent-soft)" : "var(--surface2)"};` +
        `color:${active ? "var(--accent)" : "var(--text2)"};font:600 12px ${SANS}`
      }
    >
      {name}
    </Button>
  );
}

/**
 * The square mark next to a confirmation modal's title.
 *
 * The tone tells the weight of the action before the text is read: red for what
 * cannot be undone, amber for what is a chore to undo, accent for the rest.
 */
export function ModalIcon({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <div
      style={css(
        "flex:none;width:34px;height:34px;border-radius:9px;display:flex;align-items:center;" +
          "justify-content:center;font-size:15px;font-weight:700;" +
          toneBackground(tone),
      )}
    >
      {children}
    </div>
  );
}
