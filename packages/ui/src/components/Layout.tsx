"use client";

import type { CSSProperties, ReactNode } from "react";
import { css, MONO, SANS } from "../css";
import {
  EMPTY_BOX,
  KPI_LABEL,
  kpiStrip,
  NUM,
  PILL_GROUP,
  pill,
  primaryButton,
  SCREEN_SUBTITLE,
  SCREEN_TITLE,
  track,
} from "../styleKit";
import { Button } from "./Button";

/**
 * The layout pieces that repeat across more than one screen of both portals.
 * Nothing here decides a business rule — it only draws what the design already
 * settled, so the views can be about what is theirs.
 */

/* -------------------------------------------------------------------------- */
/* Screen header                                                               */
/* -------------------------------------------------------------------------- */

export function ScreenHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={css(
        "display:flex;align-items:flex-end;justify-content:space-between;gap:16px;" +
          "flex-wrap:wrap;margin-bottom:18px",
      )}
    >
      <div>
        <h1 style={css(SCREEN_TITLE)}>{title}</h1>
        {subtitle && <p style={css(SCREEN_SUBTITLE)}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** A screen's main verb, with the "+" that announces something will be created. */
export function NewButton({
  text,
  onClick,
  wide,
}: {
  text: string;
  /** Returning a promise makes the button wait for it, spinner and all. */
  onClick: () => unknown;
  wide?: boolean;
}) {
  return (
    <Button
      onClick={onClick}
      className="hv-glow"
      cssText={
        "display:flex;align-items:center;justify-content:center;gap:9px;" +
        (wide ? "flex:1 0 100%;" : "") +
        primaryButton()
      }
    >
      <span style={css(`font:600 16px/1 ${MONO}`)}>+</span>
      {text}
    </Button>
  );
}

/* -------------------------------------------------------------------------- */
/* Panels                                                                      */
/* -------------------------------------------------------------------------- */

export function Panel({
  title,
  note,
  action,
  children,
  flush,
}: {
  title?: string;
  note?: string;
  action?: ReactNode;
  children: ReactNode;
  /** Drop the inner padding — for a panel filled by a table of its own. */
  flush?: boolean;
}) {
  return (
    <div
      style={css(
        "border:1px solid var(--border);border-radius:15px;background:var(--surface);" +
          "box-shadow:var(--shadow);overflow:hidden",
      )}
    >
      {title && (
        <div
          style={css(
            "display:flex;align-items:flex-end;justify-content:space-between;gap:12px;" +
              "flex-wrap:wrap;padding:15px 18px;border-bottom:1px solid var(--border)",
          )}
        >
          <div>
            <h2 style={css(`margin:0;font:700 15.5px ${SANS}`)}>{title}</h2>
            {note && (
              <p style={css(`margin:3px 0 0;font:400 12px/1.45 ${SANS};color:var(--muted)`)}>
                {note}
              </p>
            )}
          </div>
          {action}
        </div>
      )}
      <div style={css(flush ? "" : "padding:18px")}>{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Indicators                                                                  */
/* -------------------------------------------------------------------------- */

export interface Kpi {
  label: string;
  value: string;
  note?: string;
  color?: string;
}

/** The strip of glued indicators that opens the list screens. */
export function KpiStrip({ kpis, columns }: { kpis: Kpi[]; columns: string }) {
  return (
    <div style={css(kpiStrip(columns) + ";margin-bottom:14px")}>
      {kpis.map((k) => (
        <div key={k.label} style={css("padding:12px 15px;background:var(--surface)")}>
          <div style={css(KPI_LABEL)}>{k.label}</div>
          <div
            style={css(
              `margin-top:5px;font:700 19px/1.1 ${SANS};${NUM};color:${k.color ?? "var(--text)"}`,
            )}
          >
            {k.value}
          </div>
          {k.note && (
            <div style={css(`margin-top:3px;font:500 11.5px/1.35 ${SANS};color:var(--muted)`)}>
              {k.note}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Empty states                                                                */
/* -------------------------------------------------------------------------- */

export function Empty({
  title,
  text,
  action,
  onAction,
  standout,
}: {
  title: string;
  text: string;
  action?: string;
  onAction?: () => unknown;
  /** Whole-screen empty (there never was anything) vs. filter empty (no match). */
  standout?: boolean;
}) {
  return (
    <div style={css(EMPTY_BOX + (standout ? ";padding:44px 20px;border-radius:14px" : ""))}>
      <div style={css(`font:700 ${standout ? "16px" : "15px"} ${SANS}`)}>{title}</div>
      <p style={css(`margin:0;max-width:360px;font:400 12.5px/1.5 ${SANS};color:var(--muted)`)}>
        {text}
      </p>
      {action && onAction && (
        <Button onClick={onAction} className="hv-glow" cssText={`margin-top:10px;${primaryButton()}`}>
          {action}
        </Button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Filters                                                                     */
/* -------------------------------------------------------------------------- */

export function PillGroup<T extends string>({
  options,
  current,
  onPick,
  size = "md",
}: {
  options: { key: T; name: string }[];
  current: T;
  onPick: (k: T) => unknown;
  size?: "sm" | "md";
}) {
  return (
    <div style={css(PILL_GROUP)} role="tablist">
      {options.map((o) => (
        <Button
          key={o.key}
          role="tab"
          aria-selected={current === o.key}
          onClick={() => onPick(o.key)}
          cssText={pill(current === o.key, size)}
        >
          {o.name}
        </Button>
      ))}
    </div>
  );
}

export function ClearFilters({ onClick, text }: { onClick: () => unknown; text: string }) {
  return (
    <Button
      onClick={onClick}
      cssText={`padding:10px 13px;border-radius:10px;font:600 12.5px ${SANS};color:var(--accent)`}
    >
      {text}
    </Button>
  );
}

/* -------------------------------------------------------------------------- */
/* Switch                                                                      */
/* -------------------------------------------------------------------------- */

/** A switch with a title and an explanation — the pattern of the settings screens. */
export function Switch({
  on,
  onToggle,
  title,
  note,
  state,
}: {
  on: boolean;
  onToggle: () => unknown;
  title: string;
  note?: string;
  state?: string;
}) {
  return (
    <Button
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      className="hv-row2"
      cssText={
        "display:flex;align-items:center;gap:12px;padding:14px 18px;" +
        "border-bottom:1px solid var(--border);text-align:left;background:transparent"
      }
    >
      <span style={css(track(on))}>
        <span style={css("width:18px;height:18px;border-radius:50%;background:#fff")} />
      </span>
      <span style={css("flex:1;min-width:0")}>
        <span
          style={css(
            `display:block;font:600 13.5px ${SANS};color:${on ? "var(--text)" : "var(--muted)"}`,
          )}
        >
          {title}
        </span>
        {note && (
          <span
            style={css(
              `display:block;margin-top:2px;font:500 11.5px/1.4 ${SANS};color:var(--muted)`,
            )}
          >
            {note}
          </span>
        )}
      </span>
      {state && (
        <span
          style={css(
            `flex:none;font:600 11.5px ${SANS};color:${on ? "var(--accent)" : "var(--muted)"}`,
          )}
        >
          {state}
        </span>
      )}
    </Button>
  );
}

/* -------------------------------------------------------------------------- */
/* Misc                                                                        */
/* -------------------------------------------------------------------------- */

/** Quick-fill suggestions, below a field. */
export function Suggestions({
  items,
  onPick,
}: {
  items: string[];
  onPick: (v: string) => unknown;
}) {
  if (!items.length) return null;
  return (
    <div style={css("display:flex;gap:7px;margin-top:9px;flex-wrap:wrap")}>
      {items.map((x) => (
        <Button
          key={x}
          onClick={() => onPick(x)}
          className="hv-acc-border"
          cssText={
            "padding:8px 12px;border-radius:999px;border:1px solid var(--border);" +
            `background:var(--surface2);color:var(--text2);font:500 12px ${SANS}`
          }
        >
          {x}
        </Button>
      ))}
    </div>
  );
}

/** Horizontal scrolling for wide tables on a phone. */
export function HScroll({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ overflowX: "auto", ...style }}>{children}</div>;
}
