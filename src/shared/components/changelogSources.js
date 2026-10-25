/**
 * Which changelog the modal is showing.
 *
 * X Router Go (v0.0.x), Node.js engine (v0.6.x), and Upstream (Decolua 9router)
 * are separate documents, so they get dedicated tabs instead of one confusing scroll.
 */

export const GO_SOURCE = {
  id: "go",
  label: "X Router Go",
  heading: "Official Releases (X Router Go)",
  accent: {
    color: "#00ADD8",
    border: "rgba(0,173,216,0.35)",
    bg: "rgba(0,173,216,0.06)",
    icon: "rocket_launch",
  },
};

export const NODE_SOURCE = {
  id: "node",
  label: "Node.js Legacy",
  heading: "Historical Releases (Node.js Engine)",
  accent: {
    color: "#10B981",
    border: "rgba(16,185,129,0.35)",
    bg: "rgba(16,185,129,0.06)",
    icon: "code",
  },
};

export const DECOLUA_SOURCE = {
  id: "decolua",
  label: "Upstream",
  heading: "Upstream Base Releases (9Router)",
  accent: {
    color: "rgba(148,163,184,0.95)",
    border: "rgba(148,163,184,0.25)",
    bg: "rgba(148,163,184,0.05)",
    icon: "history_edu",
  },
};

// Backward-compatible alias
export const SERENHOPE_SOURCE = GO_SOURCE;

export const CHANGELOG_SOURCES = [GO_SOURCE, NODE_SOURCE, DECOLUA_SOURCE];

export const DEFAULT_CHANGELOG_SOURCE = GO_SOURCE.id;

/** Sources that actually have rendered content, in display order. */
export function availableChangelogSources(htmlBySource) {
  if (!htmlBySource || typeof htmlBySource !== "object") return [];
  return CHANGELOG_SOURCES.filter((source) => {
    const html = htmlBySource[source.id] || (source.id === "go" && htmlBySource.serenhope);
    return typeof html === "string" && html.trim().length > 0;
  });
}

/**
 * The source to render. Falls back to the first one that has content, so a
 * stale or emptied selection never leaves the body blank.
 */
export function pickChangelogSource(htmlBySource, activeSource) {
  if (availableChangelogSources(htmlBySource).some((s) => s.id === activeSource)) {
    return activeSource;
  }
  return availableChangelogSources(htmlBySource)[0]?.id || DEFAULT_CHANGELOG_SOURCE;
}
