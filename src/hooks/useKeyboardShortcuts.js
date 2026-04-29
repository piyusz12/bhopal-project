import { useEffect } from "react";

/**
 * Global keyboard shortcuts for power-user navigation.
 * Ctrl+H — Toggle query history
 * Ctrl+K — Focus search / chat input
 * Escape — Close any open panel
 */
export function useKeyboardShortcuts({
  onToggleHistory,
  onFocusInput,
  onClosePanel,
  historyOpen,
}) {
  useEffect(() => {
    const handler = (e) => {
      // Ctrl+H — Toggle history
      if ((e.ctrlKey || e.metaKey) && e.key === "h") {
        e.preventDefault();
        onToggleHistory?.();
        return;
      }

      // Ctrl+K — Focus chat input
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        onFocusInput?.();
        return;
      }

      // Escape — Close open panels
      if (e.key === "Escape") {
        if (historyOpen) {
          e.preventDefault();
          onClosePanel?.();
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onToggleHistory, onFocusInput, onClosePanel, historyOpen]);
}
