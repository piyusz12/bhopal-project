import React from "react";
import { C } from "../constants";

export function LogLine({ e }) {
  const colors = { info: C.muted, process: C.blue, success: C.green, error: C.red, warning: C.amber };
  const icons = { info: "›", process: "⟳", success: "✓", error: "✕", warning: "⚠" };
  return (
    <div style={{ display: "flex", gap: 8, padding: "3px 0", borderLeft: `2px solid ${colors[e.type] || C.muted}`, paddingLeft: 10, marginLeft: 2 }}>
      <span style={{ color: colors[e.type], fontFamily: "monospace", fontSize: 11, minWidth: 12 }}>{icons[e.type]}</span>
      <span style={{ color: e.type === "error" ? C.red : e.type === "success" ? C.green : e.type === "warning" ? C.amber : C.text, fontFamily: "monospace", fontSize: 11, lineHeight: 1.4 }}>{e.msg}</span>
    </div>
  );
}
