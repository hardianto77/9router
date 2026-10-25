"use client";

import { CAPACITY_META } from "@/shared/constants/models";
import Tooltip from "./Tooltip";

// Render the badges for a model: its capabilities, plus the marks of the custom
// plugins active on it.
//
// The two are separate on purpose. A plugin used to signal itself by setting a
// capability - Image Vision set caps.vision, which is identical to native vision -
// so enabling it drew nothing and the badge could not be told apart from a
// built-in. `marks` is the payload's explicit pluginMarks list, falling back to
// the caps flags for older payloads.
// Which native capabilities a plugin already speaks for. imageVision is the
// only overlap that is a pure alias: the plugin turns caps.vision on itself, so
// showing both would print the same fact twice. The other plugin keys used to be
// handled by dropping the PLUGIN MARK - which is how the old material ligature
// (`psychology`, `bolt`, `compress`) kept appearing on model rows. The mark is
// the explicit signal now and it always renders.
const PLUGIN_COVERED_CAPS = {};

export default function CapacityBadges({ caps, marks, className = "", colorOverride, size = 16 }) {
  const active = caps ? Object.keys(CAPACITY_META).filter((k) => caps[k]) : [];
  const pluginKeys = pluginMarksFor({ caps, pluginMarks: marks });
  const covered = new Set(pluginKeys.map((k) => PLUGIN_COVERED_CAPS[k] || k));
  const nativeKeys = active.filter((k) => !covered.has(k));
  if (active.length === 0 && pluginKeys.length === 0) return null;

  // Every mark is a monogram in one ink now, so the colour is decided once here
  // instead of per plugin: muted by default because these ride on dense model
  // rows, overridable by a surface that wants the accent.
  const tone = colorOverride || "text-text-muted";

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {active.map((k) => (
        <Tooltip key={k} text={`${CAPACITY_META[k].label} — ${CAPACITY_META[k].desc}`}>
          <span
            className={`material-symbols-outlined leading-none cursor-help ${colorOverride || CAPACITY_META[k].color}`}
            style={{ fontSize: `${size}px` }}
          >
            {CAPACITY_META[k].icon}
          </span>
        </Tooltip>
      ))}
    </span>
  );
}
