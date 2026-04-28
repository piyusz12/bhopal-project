import React from "react";
import { C } from "../constants";

export function MetCard({ label, value, color }) {
  return (
    <div style={{ background: C.dim, borderRadius: 8, padding: "10px 14px", flex: 1, minWidth: 80 }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: color || C.text, fontFamily: "monospace" }}>{value}</div>
      <div style={{ fontSize: 10, color: C.muted, marginTop: 2, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
    </div>
  );
}
