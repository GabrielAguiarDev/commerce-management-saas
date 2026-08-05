"use client";

import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  size,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import type { ReactNode } from "react";
import { css } from "../css";
import { highlightedMenuItem, MENU_BUTTON, MENU_ITEM, MENU_PANEL } from "../styleKit";
import { Button } from "./Button";

/** Gap between the button and the panel. */
const GAP = 6;
/** Minimum breathing room from the window edges. */
const MARGIN = 10;

export interface MenuAction {
  text: string;
  onClick: () => unknown;
  /** Destructive action, or one that needs attention — gets a color of its own. */
  color?: string;
  disabled?: boolean;
}

/**
 * A row's "⋯" button and the menu it opens — one component for every table in
 * the portals.
 *
 * The panel goes into a portal on `<body>`: inside the row it was clipped by
 * the table panel's `overflow`, which exists for horizontal scrolling and is
 * not going away.
 *
 * Floating UI does the positioning. `autoUpdate` re-anchors the panel to the
 * button in real time — scrolling (of the window and of the table itself),
 * resizing, layout shifts — and not only on open: `flip` turns the menu upwards
 * as soon as it stops fitting below, `shift` keeps it inside the window
 * horizontally, and `size` caps its height to the room left. It is the same
 * mechanism the Radix/Headless UI dropdowns use underneath.
 *
 * The component is controlled from outside because both portals keep "which
 * menu is open" in their own state — only one at a time, on any screen.
 */
export function ActionsMenu({
  open,
  onOpenChange,
  label,
  minWidth = 180,
  placement = "bottom-end",
  buttonCssText,
  children,
}: {
  open: boolean;
  /** Called both on open and on close (click outside, Esc, action picked). */
  onOpenChange: (open: boolean) => void;
  /** The button's `aria-label`. */
  label: string;
  minWidth?: number;
  placement?: "bottom-end" | "bottom-start";
  buttonCssText?: string;
  children: ReactNode;
}) {
  // `setReference`/`setFloating` are stable callback refs from Floating UI —
  // destructured here so they do not look like a ref read during render.
  const {
    refs: { setReference, setFloating },
    floatingStyles,
    context,
  } = useFloating({
    open,
    onOpenChange,
    // Aligned to the right of the button, as the actions column asks.
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(GAP),
      flip({ padding: MARGIN }),
      shift({ padding: MARGIN }),
      size({
        padding: MARGIN,
        apply({ availableHeight, elements }) {
          // Only comes into play in very short windows; there the menu scrolls
          // inside itself instead of spilling off screen.
          elements.floating.style.maxHeight = `${Math.max(120, availableHeight)}px`;
        },
      }),
    ],
  });

  // Open/close from the button, close on outside click or Esc, and the menu
  // semantics (`aria-haspopup`/`aria-expanded`) — all from the library's
  // interaction hooks.
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useClick(context),
    useDismiss(context),
    useRole(context, { role: "menu" }),
  ]);

  return (
    <>
      <Button
        ref={setReference}
        aria-label={label}
        className="hv-menu"
        cssText={buttonCssText ?? MENU_BUTTON}
        {...getReferenceProps()}
      >
        ⋯
      </Button>

      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={setFloating}
              style={{ ...css(MENU_PANEL), minWidth, ...floatingStyles }}
              {...getFloatingProps({
                // Picking an action closes the menu: the item's click bubbles here.
                onClick: () => onOpenChange(false),
              })}
            >
              {children}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
}

/** One menu item. The color shows up only on a destructive or risky action. */
export function MenuItem({ text, onClick, color, disabled }: MenuAction) {
  return (
    <Button
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className="hv-row2"
      cssText={(color ? highlightedMenuItem(color) : MENU_ITEM) + (disabled ? ";opacity:.5" : "")}
    >
      {text}
    </Button>
  );
}

/**
 * The common case: a menu built from a list of actions. When an item needs more
 * than text (an icon, a separator), use `ActionsMenu` with hand-written
 * `MenuItem`s.
 */
export function ActionMenu({
  open,
  onOpenChange,
  label,
  actions,
  minWidth,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  actions: MenuAction[];
  minWidth?: number;
}) {
  return (
    <ActionsMenu open={open} onOpenChange={onOpenChange} label={label} minWidth={minWidth}>
      {actions.map((a) => (
        <MenuItem key={a.text} {...a} />
      ))}
    </ActionsMenu>
  );
}
