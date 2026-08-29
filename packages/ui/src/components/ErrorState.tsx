"use client";

import type { ReactNode } from "react";
import { css, SANS, MONO } from "../css";
import { primaryButton, secondaryButton } from "../styleKit";
import { Button } from "./Button";

/**
 * The screen a portal shows when something threw.
 *
 * WHY IT LIVES HERE: both portals need the same four things — say what broke in
 * words the shopkeeper can act on, offer to try again, offer a way out, and
 * carry the digest that makes the incident findable in the logs. Written twice,
 * the second copy is the one that never gets the improvement.
 *
 * Every string arrives as a prop, already in the reader's language: this
 * package never hardcodes text the customer reads.
 *
 * ┌─ WHAT IT DELIBERATELY DOES NOT DO ─────────────────────────────────────┐
 * │ It does not print `error.message`. A thrown Postgres error names the   │
 * │ table, the policy and sometimes the column — that is a map of the      │
 * │ database handed to whoever is looking at the screen. What it shows is  │
 * │ the DIGEST, which Next generates precisely so the server log can be    │
 * │ matched to the incident without the message crossing over.             │
 * └────────────────────────────────────────────────────────────────────────┘
 */
export function ErrorPanel({
  title,
  text,
  retryLabel,
  onRetry,
  secondaryLabel,
  onSecondary,
  digest,
  digestLabel,
  /**
   * Fill the viewport and paint the page background. `true` is for the boundary
   * that replaced the whole layout (`global-error`), where nothing else is on
   * screen; `false` is for the boundary that sits inside the portal's shell,
   * which still has the sidebar and the top bar around it.
   */
  fullScreen = false,
  icon,
}: {
  title: string;
  text: string;
  retryLabel?: string;
  onRetry?: () => unknown;
  secondaryLabel?: string;
  onSecondary?: () => unknown;
  digest?: string;
  digestLabel?: string;
  fullScreen?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div
      style={css(
        "display:flex;align-items:center;justify-content:center;padding:32px 20px;" +
          (fullScreen ? "min-height:100vh;background:var(--bg)" : "min-height:min(58vh,460px)"),
      )}
    >
      <div
        style={css(
          "display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;" +
            "width:100%;max-width:420px;padding:38px 26px;border:1px dashed var(--border2);" +
            "border-radius:14px;background:var(--surface2)",
        )}
        role="alert"
      >
        {icon}

        <h1 style={css(`margin:0;font:700 17px/1.3 ${SANS};color:var(--text)`)}>{title}</h1>

        <p style={css(`margin:0;max-width:340px;font:400 13px/1.55 ${SANS};color:var(--muted)`)}>
          {text}
        </p>

        {(onRetry || onSecondary) && (
          <div
            style={css(
              "display:flex;flex-wrap:wrap;justify-content:center;gap:9px;margin-top:10px",
            )}
          >
            {retryLabel && onRetry && (
              <Button onClick={onRetry} className="hv-glow" cssText={primaryButton()}>
                {retryLabel}
              </Button>
            )}
            {secondaryLabel && onSecondary && (
              <Button onClick={onSecondary} cssText={secondaryButton()}>
                {secondaryLabel}
              </Button>
            )}
          </div>
        )}

        {/*
          The digest, and only when Next produced one. It is what turns "the
          portal broke" into a line someone can find in the server log — so it
          is selectable text, not decoration, and it is quiet enough not to
          look like part of the message.
        */}
        {digest && (
          <p
            style={css(
              `margin:14px 0 0;font:400 10.5px/1.4 ${MONO};color:var(--muted);` +
                "letter-spacing:.02em;user-select:all;word-break:break-all",
            )}
          >
            {digestLabel ? `${digestLabel} ` : ""}
            {digest}
          </p>
        )}
      </div>
    </div>
  );
}
