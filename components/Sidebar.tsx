"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useData } from "@/lib/store-client";

const NAV: { href: string; label: string; icon: string }[] = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/utilisateurs", label: "Utilisateurs", icon: "👤" },
  { href: "/boites-mail", label: "Boîtes mail", icon: "✉" },
  { href: "/boites-partagees", label: "Boîtes partagées", icon: "👥" },
  { href: "/listes-distribution", label: "Listes distribution", icon: "📋" },
  { href: "/licences", label: "Licences", icon: "€" },
  { href: "/migration", label: "Migration mail", icon: "⇄" },
  { href: "/mfa", label: "MFA", icon: "🔐" },
  { href: "/taches", label: "Tâches", icon: "☑" },
  { href: "/risques", label: "Risques", icon: "⚠" },
  { href: "/communications", label: "Communications", icon: "✎" },
  { href: "/calendrier", label: "Calendrier", icon: "🗓" },
  { href: "/import-export", label: "Imports / Exports", icon: "⇩" },
  { href: "/parametres", label: "Paramètres", icon: "⚙" },
  { href: "/audit", label: "Journal d'audit", icon: "≡" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { error, loading } = useData();
  return (
    <nav className="flex h-screen w-56 flex-col bg-navy-900 text-slate-200">
      <div className="border-b border-navy-800 px-4 py-3">
        <div className="text-sm font-bold text-white">BeCloud · Migration</div>
        <div className="text-[0.7rem] text-navy-100/70">Groupe Corthay / MAGE</div>
      </div>
      <ul className="flex-1 overflow-y-auto py-2">
        {NAV.map((n) => {
          const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
          return (
            <li key={n.href}>
              <Link href={n.href}
                className={`flex items-center gap-2.5 px-4 py-1.5 text-[0.82rem] transition ${
                  active ? "bg-navy-700 font-semibold text-white border-l-2 border-blue-400" : "hover:bg-navy-800 border-l-2 border-transparent"
                }`}>
                <span className="w-4 text-center text-xs opacity-80">{n.icon}</span>
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-navy-800 px-4 py-2 text-[0.68rem] text-navy-100/60">
        {loading ? "Chargement…" : error ? <span className="text-red-300">⚠ {error}</span> : "Microsoft 365 · V1 MVP"}
      </div>
    </nav>
  );
}
