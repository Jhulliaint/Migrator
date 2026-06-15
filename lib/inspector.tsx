"use client";
// =============================================================================
//  Inspecteur global — hyper-connectivité.
//  N'importe où dans l'app, un lien d'entité peut ouvrir une « fiche » pertinente
//  (utilisateur, licence, site). La navigation s'enchaîne via une pile (bouton ←).
// =============================================================================
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type InspectEntry =
  | { kind: "user"; key: string }     // key = id utilisateur
  | { kind: "license"; key: string }  // key = code licence
  | { kind: "site"; key: string };    // key = nom du site

interface InspectorCtx {
  current: InspectEntry | null;
  canBack: boolean;
  inspect: (entry: InspectEntry) => void;
  inspectUser: (id: string) => void;
  inspectLicense: (code: string) => void;
  inspectSite: (site: string) => void;
  back: () => void;
  close: () => void;
}

const Ctx = createContext<InspectorCtx | null>(null);

export function InspectorProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<InspectEntry[]>([]);

  const inspect = useCallback((entry: InspectEntry) => {
    setStack((s) => {
      const top = s[s.length - 1];
      if (top && top.kind === entry.kind && top.key === entry.key) return s; // déjà ouvert
      return [...s, entry];
    });
  }, []);

  const value = useMemo<InspectorCtx>(() => ({
    current: stack[stack.length - 1] ?? null,
    canBack: stack.length > 1,
    inspect,
    inspectUser: (id) => inspect({ kind: "user", key: id }),
    inspectLicense: (code) => inspect({ kind: "license", key: code }),
    inspectSite: (site) => inspect({ kind: "site", key: site }),
    back: () => setStack((s) => s.slice(0, -1)),
    close: () => setStack([]),
  }), [stack, inspect]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useInspector(): InspectorCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useInspector doit être utilisé dans <InspectorProvider>");
  return ctx;
}
