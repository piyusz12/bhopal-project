import React from "react";
import { C } from "../constants";

export function LogLine({ e }) {
  const colors = {
    info: C.muted,
    process: C.blue,
    success: C.green,
    error: C.red,
    warning: C.amber,
  };
  const icons = {
    info: "›",
    process: "⟳",
    success: "✓",
    error: "✕",
    warning: "⚠",
  };
  const textColors = {
    error: C.red,
    success: C.green,
    warning: C.amber,
    process: C.text,
    info: C.text,
  };

  const timestamp = e.ts
    ? new Date(e.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 1 })
    : null;

  return (
    <div
      className="log-line"
      style={{ borderLeftColor: colors[e.type] || C.muted }}
      role="listitem"
    >
      <span className="log-icon" style={{ color: colors[e.type] }}>
        {icons[e.type] || "›"}
      </span>
      <span className="log-text" style={{ color: textColors[e.type] || C.text }}>
        {e.msg}
      </span>
      {timestamp && <span className="log-timestamp">{timestamp}</span>}
    </div>
  );
}
