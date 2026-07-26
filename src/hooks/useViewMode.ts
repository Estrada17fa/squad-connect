import * as React from "react";

const KEY_PREFIX = "squad.view.";

export type ViewMode = "grid" | "list";

/**
 * Toggle Grid / Lista con persistencia por listado en localStorage.
 * `key` identifica el listado (p. ej. "plantel", "coord-tasks").
 */
export function useViewMode(key: string, initial: ViewMode = "grid") {
  const storageKey = `${KEY_PREFIX}${key}`;
  const [mode, setMode] = React.useState<ViewMode>(() => {
    if (typeof window === "undefined") return initial;
    const v = window.localStorage.getItem(storageKey);
    return v === "list" || v === "grid" ? v : initial;
  });
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, mode);
  }, [storageKey, mode]);
  return [mode, setMode] as const;
}
