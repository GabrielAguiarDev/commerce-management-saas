"use client";

import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { css, MONO, SANS } from "../css";
import { ChevronDownIcon, SearchIcon } from "../icons";
import { field, FIELD_LABEL, NUM } from "../styleKit";

/**
 * Form fields.
 *
 * They all use the `.field` class (see `tokens.css`), which is what guarantees
 * identical border, radius, height, type and states across input, select and
 * textarea — dark mode included, since the class only references theme
 * variables.
 *
 * `cssText` takes a CSS declaration string, the same format the rest of the
 * portals use, for one-off width tweaks that do not break the pattern.
 */

type WithCssText = { cssText?: string };

/** Room reserved for `Select`'s chevron — the same as in `select.field`. */
const CHEVRON_ROOM = 34;

export function Field({
  cssText = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & WithCssText) {
  return <input className="field" style={cssText ? css(cssText) : undefined} {...props} />;
}

export function TextArea({
  cssText = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & WithCssText) {
  return <textarea className="field" style={cssText ? css(cssText) : undefined} {...props} />;
}

/**
 * A select with the native look removed and a chevron of its own.
 *
 * The icon is an SVG in `currentColor` inside a positioned wrapper, not a
 * background image: that way it follows the light/dark theme by itself, with no
 * second copy of the icon — which was exactly what left the system arrow wrong
 * in dark mode.
 *
 * `boxCssText` sizes the wrapper (the select fills 100% of it), because in some
 * places the field is fluid and in others it sizes to its content.
 */
export function Select({
  children,
  boxCssText = "",
  cssText = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & WithCssText & { boxCssText?: string }) {
  return (
    <span
      style={css(
        "position:relative;display:inline-flex;align-items:center;min-width:0;" + boxCssText,
      )}
    >
      <select
        className="field"
        // The right-hand room comes after `cssText` on purpose: a `padding`
        // passed from outside would override the one in `.field` and push the
        // text underneath the chevron.
        style={{ ...(cssText ? css(cssText) : null), paddingRight: CHEVRON_ROOM }}
        {...props}
      >
        {children}
      </select>
      <span
        // `pointer-events:none` lets the click through to the select underneath.
        style={css(
          "position:absolute;right:11px;display:flex;pointer-events:none;color:var(--muted)",
        )}
      >
        <ChevronDownIcon />
      </span>
    </span>
  );
}

/**
 * A shortcut for the common case: a list of strings, with no hand-written
 * `<option>`. When the displayed label differs from the stored value, use
 * `Select` directly.
 */
export function SimpleSelect({
  value,
  options,
  onChange,
  cssText,
  boxCssText,
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange"> &
  WithCssText & {
    value: string;
    options: string[];
    onChange: (v: string) => void;
    boxCssText?: string;
  }) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      cssText={cssText}
      boxCssText={boxCssText}
      {...props}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </Select>
  );
}

/**
 * Search field: a borderless input inside a wrapper holding the magnifier. The
 * wrapper is what wears the border and takes the focus states, and that is what
 * keeps it in the same family as the selects next to it in a filter bar.
 */
export function SearchField({
  value,
  onChange,
  placeholder,
  boxCssText = "",
  compact,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  boxCssText?: string;
  compact?: boolean;
}) {
  return (
    <div
      className="field-box"
      style={css("display:flex;align-items:center;gap:8px;padding:0 11px;" + boxCssText)}
    >
      <span style={css("display:flex;color:var(--muted)")}>
        <SearchIcon size={compact ? 13 : 14} />
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={css(
          "flex:1;min-width:0;border:none;background:none;outline:none;color:var(--text);" +
            (compact ? "padding:9px 0;font-size:12.5px" : "padding:10px 0;font-size:13.5px"),
        )}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Labeled fields                                                              */
/* -------------------------------------------------------------------------- */

/**
 * A field with its label above and, below it, either the error message or the
 * hint — never both, because the error is what has to be read first.
 */
export function LabeledField({
  label,
  value,
  onChange,
  placeholder,
  error,
  message,
  note,
  inputMode,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: boolean;
  message?: string;
  note?: string;
  inputMode?: "numeric" | "decimal";
  mono?: boolean;
}) {
  return (
    <div>
      <label style={css(FIELD_LABEL)}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        aria-invalid={error || undefined}
        style={css(field(error) + (mono ? `;font:500 13.5px ${MONO}` : ""))}
      />
      <FieldNote error={error} message={message} note={note} />
    </div>
  );
}

/** Money field: the currency sign sits inside the border, outside what is typed. */
export function MoneyField({
  label,
  value,
  onChange,
  error,
  message,
  note,
  noteColor,
  large,
  currency = "R$",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
  message?: string;
  note?: string;
  noteColor?: string;
  large?: boolean;
  currency?: string;
}) {
  return (
    <div>
      <label style={css(FIELD_LABEL)}>{label}</label>
      <div
        style={css(
          "display:flex;align-items:center;gap:7px;padding:0 13px;border:1.5px solid " +
            `${error ? "var(--danger)" : "var(--border2)"};border-radius:11px;background:var(--surface2)`,
        )}
      >
        <span style={css(`font:600 13px ${SANS};color:var(--muted)`)}>{currency}</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0,00"
          inputMode="decimal"
          aria-invalid={error || undefined}
          style={css(
            `flex:1;min-width:0;padding:13px 0;border:0;background:none;` +
              `font:700 ${large ? "19px" : "16px"} ${SANS};${NUM};color:var(--text);outline:none`,
          )}
        />
      </div>
      <FieldNote error={error} message={message} note={note} noteColor={noteColor} />
    </div>
  );
}

function FieldNote({
  error,
  message,
  note,
  noteColor,
}: {
  error?: boolean;
  message?: string;
  note?: string;
  noteColor?: string;
}) {
  if (error && message)
    return (
      <div style={css(`margin-top:5px;font:600 11.5px ${SANS};color:var(--danger)`)}>{message}</div>
    );
  if (!error && note)
    return (
      <div style={css(`margin-top:5px;font:500 11px ${SANS};color:${noteColor ?? "var(--muted)"}`)}>
        {note}
      </div>
    );
  return null;
}

/** Label and field stacked, for when the field is not a plain `<input>`. */
export function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={css("display:flex;flex-direction:column;gap:6px")}>
      <span style={css(FIELD_LABEL + ";margin-bottom:0")}>{label}</span>
      {children}
    </label>
  );
}
