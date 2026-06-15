"use client";
import React from "react";

export interface Slice {
  label: string;
  value: number;
  color: string;
}

const PALETTE = ["#1f4e79", "#2f7ed8", "#16a34a", "#ea8a00", "#dc2626", "#7c3aed", "#0891b2", "#64748b"];

export function colorAt(i: number): string {
  return PALETTE[i % PALETTE.length];
}

/** Donut chart en SVG pur. */
export function Donut({ slices, size = 150, thickness = 26 }: { slices: Slice[]; size?: number; thickness?: number }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eef2f7" strokeWidth={thickness} />
        {slices.map((s, i) => {
          const len = (s.value / total) * circ;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={thickness}
              strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`} />
          );
          offset += len;
          return el;
        })}
        <text x={cx} y={cy - 2} textAnchor="middle" className="fill-navy-900" fontSize="20" fontWeight="700">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="fill-slate-500" fontSize="9">total</text>
      </svg>
      <ul className="space-y-1 text-xms">
        {slices.filter((s) => s.value > 0).map((s, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: s.color }} />
            <span className="text-slate-700">{s.label}</span>
            <span className="ml-auto font-semibold text-navy-900">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Liste de barres horizontales (label cliquable si `onClick` fourni). */
export function BarList({ items }: { items: { label: string; value: number; color?: string; suffix?: string; onClick?: () => void }[] }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i}>
          <div className="flex justify-between text-xms">
            {it.onClick ? (
              <button type="button" onClick={it.onClick} className="cursor-pointer text-navy-700 underline decoration-dotted underline-offset-2 hover:text-navy-900 hover:decoration-solid">{it.label}</button>
            ) : (
              <span className="text-slate-700">{it.label}</span>
            )}
            <span className="font-semibold text-navy-900">
              {it.value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}{it.suffix ?? ""}
            </span>
          </div>
          <div className="mt-0.5 h-2.5 w-full overflow-hidden rounded bg-slate-100">
            <div className="h-full rounded" style={{ width: `${(it.value / max) * 100}%`, background: it.color ?? colorAt(i) }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
