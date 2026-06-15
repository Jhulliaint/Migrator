"use client";
import React, { useMemo, useState } from "react";

// ---------------------------------------------------------------------------
//  Badges & couleurs de statut
// ---------------------------------------------------------------------------
type Tone = "green" | "orange" | "red" | "gray" | "blue" | "navy";

const TONE: Record<Tone, string> = {
  green: "bg-green-100 text-green-800 border-green-200",
  orange: "bg-amber-100 text-amber-800 border-amber-200",
  red: "bg-red-100 text-red-800 border-red-200",
  gray: "bg-slate-100 text-slate-600 border-slate-200",
  blue: "bg-blue-100 text-blue-800 border-blue-200",
  navy: "bg-navy-100 text-navy-800 border-navy-200",
};

export function Badge({ tone = "gray", children, title }: { tone?: Tone; children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[0.7rem] font-medium ${TONE[tone]}`}
    >
      {children}
    </span>
  );
}

export function Dot({ tone }: { tone: Tone }) {
  const c = { green: "bg-statusGreen", orange: "bg-statusOrange", red: "bg-statusRed", gray: "bg-statusGray", blue: "bg-blue-500", navy: "bg-navy-700" }[tone];
  return <span className={`inline-block h-2 w-2 rounded-full ${c}`} />;
}

/** Mappe un niveau de risque vers une tonalité. */
export function riskTone(risk: "vert" | "orange" | "rouge"): Tone {
  return risk === "rouge" ? "red" : risk === "orange" ? "orange" : "green";
}

const STATUS_TONES: Record<string, Tone> = {
  // migration
  "non commencé": "gray", "copie lancée": "blue", "copié": "blue", "basculé": "orange",
  "reconnecté": "blue", "validé": "green", "problème": "red",
  // mfa
  "non démarrée": "gray", "à faire": "orange", "configurée Authenticator": "green",
  "configurée SMS": "green", "bloquée": "red",
  // comm
  "non démarré": "gray", "email envoyé": "blue", "relancé": "orange", "confirmé": "green",
  // connexion compte Microsoft ("bloqué" déjà défini ci-dessus)
  "à prévenir": "gray", "mot de passe envoyé": "blue", "première connexion faite": "orange",
  "connexion confirmée": "green",
  // task ("à faire" déjà défini ci-dessus)
  "en cours": "blue", "bloqué": "red", "terminé": "green", "annulé": "gray",
  // priority / severity
  "basse": "gray", "normale": "blue", "haute": "orange", "critique": "red",
  "faible": "gray", "moyen": "blue", "élevé": "orange",
  // risk status
  "ouvert": "red", "maîtrisé": "green", "clos": "gray",
  // account status
  "actif": "green", "ancien salarié": "gray", "boîte technique": "navy",
  "boîte de service": "navy", "à arbitrer": "orange",
};

export function StatusBadge({ value }: { value: string }) {
  return <Badge tone={STATUS_TONES[value] ?? "gray"}>{value}</Badge>;
}

// ---------------------------------------------------------------------------
//  Cartes & sections
// ---------------------------------------------------------------------------
export function Card({ title, right, children, className = "" }: { title?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}>
      {title && (
        <header className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
          <h2 className="text-sm font-semibold text-navy-800">{title}</h2>
          {right}
        </header>
      )}
      <div className="p-3">{children}</div>
    </section>
  );
}

export function KpiCard({ label, value, sub, tone = "navy" }: { label: string; value: React.ReactNode; sub?: string; tone?: Tone }) {
  const accent = { green: "border-l-statusGreen", orange: "border-l-statusOrange", red: "border-l-statusRed", gray: "border-l-statusGray", blue: "border-l-blue-500", navy: "border-l-navy-700" }[tone];
  return (
    <div className={`rounded-lg border border-slate-200 border-l-4 ${accent} bg-white px-3 py-2 shadow-sm`}>
      <div className="text-[0.7rem] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-xl font-bold text-navy-900 leading-tight">{value}</div>
      {sub && <div className="text-[0.7rem] text-slate-500">{sub}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Contrôles
// ---------------------------------------------------------------------------
export function Checkbox({ checked, onChange, disabled }: { checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.checked)}
      className="h-4 w-4 cursor-pointer rounded border-slate-400 text-navy-700 accent-navy-700 disabled:opacity-50"
    />
  );
}

export function Select<T extends string>({ value, options, onChange, className = "" }: { value: T; options: readonly { value: T; label: string }[] | readonly T[]; onChange: (v: T) => void; className?: string }) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <select className={`cell-select ${className}`} value={value} onChange={(e) => onChange(e.target.value as T)}>
      {opts.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function Button({ children, onClick, variant = "default", type = "button", disabled, title, className = "" }: { children: React.ReactNode; onClick?: () => void; variant?: "default" | "primary" | "ghost" | "danger"; type?: "button" | "submit"; disabled?: boolean; title?: string; className?: string }) {
  const v = {
    default: "bg-white border-slate-300 text-slate-700 hover:bg-slate-50",
    primary: "bg-navy-700 border-navy-700 text-white hover:bg-navy-800",
    ghost: "bg-transparent border-transparent text-navy-700 hover:bg-navy-100",
    danger: "bg-white border-red-300 text-red-700 hover:bg-red-50",
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title}
      className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xms font-medium transition disabled:opacity-50 ${v} ${className}`}>
      {children}
    </button>
  );
}

export function TextInput({ value, onChange, placeholder, className = "", type = "text" }: { value: string | number; onChange: (v: string) => void; placeholder?: string; className?: string; type?: string }) {
  return (
    <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
      className={`rounded border border-slate-300 px-2 py-1 text-xms outline-none focus:border-navy-600 ${className}`} />
  );
}

// ---------------------------------------------------------------------------
//  Panneau latéral de détail
// ---------------------------------------------------------------------------
export function SidePanel({ open, title, onClose, onBack, children, footer }: { open: boolean; title: string; onClose: () => void; onBack?: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <aside className="relative z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <header className="flex items-center gap-2 border-b border-slate-200 bg-navy-800 px-4 py-3 text-white">
          {onBack && <button onClick={onBack} title="Retour" className="rounded px-2 py-0.5 text-base leading-none hover:bg-navy-700">←</button>}
          <h3 className="flex-1 truncate text-sm font-semibold">{title}</h3>
          <button onClick={onClose} title="Fermer" className="rounded px-2 py-0.5 text-lg leading-none hover:bg-navy-700">×</button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <footer className="border-t border-slate-200 px-4 py-3">{footer}</footer>}
      </aside>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-0.5 block text-[0.7rem] font-medium uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

// ---------------------------------------------------------------------------
//  Tri de tableau
// ---------------------------------------------------------------------------
export function useSort<T>(rows: T[], initialKey?: keyof T) {
  const [key, setKey] = useState<keyof T | null>(initialKey ?? null);
  const [dir, setDir] = useState<1 | -1>(1);
  const sorted = useMemo(() => {
    if (!key) return rows;
    return [...rows].sort((a, b) => {
      const va = a[key] as unknown;
      const vb = b[key] as unknown;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va ?? "").localeCompare(String(vb ?? ""), "fr") * dir;
    });
  }, [rows, key, dir]);
  const toggle = (k: keyof T) => {
    if (key === k) setDir((d) => (d === 1 ? -1 : 1));
    else { setKey(k); setDir(1); }
  };
  return { sorted, key, dir, toggle };
}

export function Th({ label, sortKey, sort, className = "" }: { label: string; sortKey?: string; sort?: { key: unknown; dir: 1 | -1; toggle: (k: never) => void }; className?: string }) {
  const active = sort && sortKey != null && sort.key === sortKey;
  return (
    <th className={`${sortKey && sort ? "sortable" : ""} ${className}`} onClick={() => sortKey && sort?.toggle(sortKey as never)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {active && <span className="text-[0.6rem]">{sort!.dir === 1 ? "▲" : "▼"}</span>}
      </span>
    </th>
  );
}
