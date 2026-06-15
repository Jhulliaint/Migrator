// =============================================================================
//  Mutations serveur — appliquent les changements + journalisent l'audit.
//  (module serveur : importé uniquement par les route handlers /api)
// =============================================================================
import type {
  Database,
  User,
  Task,
  Risk,
  DistributionList,
  Milestone,
  LicenseType,
  Settings,
} from "@/lib/types";
import { mutate, appendAudit } from "@/lib/data/store";

/** Champs d'utilisateur tracés dans le journal d'audit. */
const AUDITED_USER_FIELDS: { key: keyof User; label: string }[] = [
  { key: "licenseProfile", label: "licence" },
  { key: "mailStatus", label: "statut migration" },
  { key: "mailboxSizeGB", label: "taille boîte" },
  { key: "status", label: "statut compte" },
  { key: "risk", label: "risque" },
  { key: "packBeCloud", label: "Pack BeCloud" },
];

function stringify(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function updateUser(id: string, patch: Partial<User>, author?: string): Database {
  return mutate((db) => {
    const u = db.users.find((x) => x.id === id);
    if (!u) throw new Error("Utilisateur introuvable");
    const name = `${u.firstName} ${u.lastName}`.trim();
    for (const f of AUDITED_USER_FIELDS) {
      if (f.key in patch && stringify(patch[f.key]) !== stringify(u[f.key])) {
        appendAudit(db, {
          author,
          action: "modification",
          entity: `Utilisateur ${name}`,
          field: f.label,
          oldValue: stringify(u[f.key]),
          newValue: stringify(patch[f.key]),
        });
      }
    }
    // Audit spécifique MFA
    if (patch.mfa && stringify(patch.mfa) !== stringify(u.mfa)) {
      appendAudit(db, {
        author,
        action: "modification",
        entity: `Utilisateur ${name}`,
        field: "statut MFA",
        oldValue: u.mfa.status,
        newValue: patch.mfa.status,
      });
    }
    Object.assign(u, patch, { updatedAt: new Date().toISOString() });
  });
}

export function createUser(user: User, author?: string): Database {
  return mutate((db) => {
    db.users.push(user);
    appendAudit(db, {
      author,
      action: "création",
      entity: `Utilisateur ${user.firstName} ${user.lastName}`.trim(),
      field: "—",
      oldValue: "",
      newValue: user.googleEmail,
    });
  });
}

export function deleteUser(id: string, author?: string): Database {
  return mutate((db) => {
    const idx = db.users.findIndex((x) => x.id === id);
    if (idx < 0) return;
    const [u] = db.users.splice(idx, 1);
    appendAudit(db, {
      author,
      action: "suppression",
      entity: `Utilisateur ${u.firstName} ${u.lastName}`.trim(),
      field: "—",
      oldValue: u.googleEmail,
      newValue: "",
    });
  });
}

export function updateLicenseType(code: string, patch: Partial<LicenseType>, author?: string): Database {
  return mutate((db) => {
    const lt = db.licenseTypes.find((x) => x.code === code);
    if (!lt) throw new Error("Profil introuvable");
    appendAudit(db, {
      author,
      action: "modification",
      entity: `Licence ${lt.label}`,
      field: "prix/paramètres",
      oldValue: stringify(lt.price),
      newValue: stringify(patch.price ?? lt.price),
    });
    Object.assign(lt, patch);
  });
}

export function updateSettings(patch: Partial<Settings>, author?: string): Database {
  return mutate((db) => {
    appendAudit(db, {
      author,
      action: "modification",
      entity: "Paramètres",
      field: Object.keys(patch).join(", "),
      oldValue: "",
      newValue: stringify(patch),
    });
    Object.assign(db.settings, patch);
  });
}

// --- Tâches -----------------------------------------------------------------
export function upsertTask(task: Task, author?: string): Database {
  return mutate((db) => {
    const idx = db.tasks.findIndex((t) => t.id === task.id);
    if (idx >= 0) db.tasks[idx] = task;
    else {
      db.tasks.push(task);
      appendAudit(db, { author, action: "création", entity: `Tâche`, field: "—", oldValue: "", newValue: task.title });
    }
  });
}
export function deleteTask(id: string): Database {
  return mutate((db) => {
    db.tasks = db.tasks.filter((t) => t.id !== id);
  });
}

// --- Risques manuels --------------------------------------------------------
export function upsertRisk(risk: Risk): Database {
  return mutate((db) => {
    const idx = db.risks.findIndex((r) => r.id === risk.id);
    if (idx >= 0) db.risks[idx] = risk;
    else db.risks.push(risk);
  });
}
export function deleteRisk(id: string): Database {
  return mutate((db) => {
    db.risks = db.risks.filter((r) => r.id !== id);
  });
}

// --- Listes de distribution -------------------------------------------------
export function upsertDistributionList(dl: DistributionList): Database {
  return mutate((db) => {
    const idx = db.distributionLists.findIndex((d) => d.id === dl.id);
    if (idx >= 0) db.distributionLists[idx] = dl;
    else db.distributionLists.push(dl);
  });
}
export function deleteDistributionList(id: string): Database {
  return mutate((db) => {
    db.distributionLists = db.distributionLists.filter((d) => d.id !== id);
  });
}

// --- Jalons -----------------------------------------------------------------
export function updateMilestone(id: string, patch: Partial<Milestone>): Database {
  return mutate((db) => {
    const m = db.milestones.find((x) => x.id === id);
    if (m) Object.assign(m, patch);
  });
}

// --- Import (fusion d'utilisateurs par email) -------------------------------
export function importUsers(incoming: User[], mode: "merge" | "replace", author?: string): Database {
  return mutate((db) => {
    if (mode === "replace") {
      db.users = incoming;
    } else {
      const byEmail = new Map(db.users.map((u) => [u.googleEmail.toLowerCase(), u]));
      for (const inc of incoming) {
        const existing = byEmail.get(inc.googleEmail.toLowerCase());
        if (existing) Object.assign(existing, inc, { id: existing.id, updatedAt: new Date().toISOString() });
        else db.users.push(inc);
      }
    }
    appendAudit(db, {
      author,
      action: "import",
      entity: "Utilisateurs",
      field: mode,
      oldValue: "",
      newValue: `${incoming.length} lignes`,
    });
  });
}
