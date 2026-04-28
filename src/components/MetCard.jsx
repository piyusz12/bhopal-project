import React from "react";
import { C } from "../constants";

export function MetCard({ label, value, color }) {
  return (
    <div className="met-card" role="status" aria-label={`${label}: ${value}`}>
      <div className="met-card-stripe" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color || C.teal, borderRadius: '2px 2px 0 0', opacity: 0.5 }} />
      <div className="met-value" style={{ color: color || C.text }}>{value}</div>
      <div className="met-label">{label}</div>
    </div>
  );
}
