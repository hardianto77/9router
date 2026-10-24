"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { cn } from "@/shared/utils/cn";
import useThemeStore, { THEME_IDS, ACCENT_PALETTES } from "@/store/themeStore";

const MODES = [
  {
    id: "dark",
    icon: "dark_mode",
    label: "Dark",
    desc: "Solid dark panels on a neutral warm base",
    swatches: ["#1a1a1a", "#262626", "#303030", "#333333"],
  },
  {
    id: "ember",
    icon: "local_fire_department",
    label: "Ember",
    desc: "Warm charcoal panels with a brand accent tint",
    swatches: ["#171310", "#201914", "#2b211a", "#33261d"],
  },
  {
    id: "light",
    icon: "light_mode",
    label: "Light",
    desc: "Clean light panels on soft ivory background",
    swatches: ["#FDFAF6", "#F7F3EE", "#ffffff", "#f4f4f5"],
  },
];

/**
 * Theme picker rendered as a centered modal, matching Change Log.
 *
 * The previous version expanded inline inside the grid menu, which pushed the
 * account rows downward and read as a dropdown rather than a destination. The
 * portal/overlay/animation here are the same ones ChangelogModal uses so the
 * two feel identical.
 */
export default function ThemeModal({ isOpen, onClose }) {
  const theme = useThemeStore((state) => state.theme);
  const accent = useThemeStore((state) => state.accent || "orange");
  const setTheme = useThemeStore((state) => state.setTheme);
  const setAccent = useThemeStore((state) => state.setAccent);
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    const onOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Theme"
        className="relative w-full bg-surface border border-border rounded-[6px] shadow-[var(--shadow-elev)] animate-in fade-in zoom-in-95 duration-200 max-w-md"
      >
        <div className="flex items-center justify-between gap-3 p-3 border-b border-border-subtle">
          <h2 className="text-lg font-semibold text-text-main">Theme</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-2 dark:hover:bg-surface-2 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-3 flex flex-col gap-2">
          <div className="text-xs font-semibold text-text-muted px-1 uppercase tracking-wider">Appearance Mode</div>
          {THEME_IDS.map((id) => {
            const mode = MODES.find((m) => m.id === id);
            if (!mode) return null;
            const active = id === theme;
            return (
              <button
                key={id}
                onClick={() => setTheme(id)}
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-3 w-full p-2.5 rounded-[6px] border text-left transition-colors",
                  active
                    ? "border-primary/50 bg-primary/10"
                    : "border-border-subtle hover:bg-surface-2",
                )}
              >
                <span className="flex shrink-0 overflow-hidden rounded-[6px] border border-border">
                  {mode.swatches.map((c, i) => (
                    <span key={i} className="block h-8 w-3" style={{ backgroundColor: c }} />
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "flex items-center gap-2 text-sm font-medium",
                      active ? "text-primary" : "text-text-main",
                    )}
                  >
                    <span className="material-symbols-outlined text-[18px]">{mode.icon}</span>
                    {mode.label}
                  </span>
                  <span className="block mt-0.5 text-xs text-text-muted">{mode.desc}</span>
                </span>
                {active && (
                  <span className="material-symbols-outlined text-[18px] text-primary shrink-0">
                    check
                  </span>
                )}
              </button>
            );
          })}

          <div className="text-xs font-semibold text-text-muted px-1 mt-3 uppercase tracking-wider">Accent Color Palette</div>
          <div className="grid grid-cols-3 gap-2">
            {ACCENT_PALETTES.map((pal) => {
              const active = pal.id === accent;
              return (
                <button
                  key={pal.id}
                  onClick={() => setAccent(pal.id)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-[6px] border text-left transition-all",
                    active ? "border-primary bg-primary/10 shadow-sm" : "border-border-subtle hover:bg-surface-2"
                  )}
                >
                  <span className="h-4 w-4 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: pal.primary }} />
                  <span className={cn("text-xs font-medium truncate", active ? "text-primary" : "text-text-main")}>
                    {pal.label.split(" ")[1] || pal.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

ThemeModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};