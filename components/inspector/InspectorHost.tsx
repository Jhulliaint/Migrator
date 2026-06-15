"use client";
import React from "react";
import { useData } from "@/lib/store-client";
import { useInspector } from "@/lib/inspector";
import { UserDetailPanel } from "@/components/users/UserDetailPanel";
import { LicenseFiche, SiteFiche } from "@/components/inspector/fiches";

/** Affiche la fiche correspondant à l'entité inspectée (montée au niveau du layout). */
export function InspectorHost() {
  const { db } = useData();
  const { current, canBack, back, close } = useInspector();
  if (!db || !current) return null;

  const onBack = canBack ? back : undefined;

  switch (current.kind) {
    case "user":
      return <UserDetailPanel db={db} userId={current.key} onClose={close} onBack={onBack} />;
    case "license":
      return <LicenseFiche db={db} code={current.key} onClose={close} onBack={onBack} />;
    case "site":
      return <SiteFiche db={db} site={current.key} onClose={close} onBack={onBack} />;
    default:
      return null;
  }
}
