# BeCloud — Pilotage de la migration Microsoft 365

> Application web **locale** de suivi de la migration **Google Workspace → Microsoft 365 /
> Exchange Online** du **Groupe Corthay / MAGE**, menée avec **BeCloud**.

Elle remplace le suivi Excel artisanal (`BECLOUD ANALYSE.xlsx`) par un véritable outil de
pilotage opérationnel : dense, visuel et exploitable, tout en conservant une logique
familière de **tableur amélioré** (tableaux larges, lignes alternées, cases à cocher,
filtres, panneaux de synthèse).

**Statut :** V1 (MVP fonctionnel et autonome) · sans dépendance à un service externe ·
aucune écriture Microsoft Graph.

---

## Sommaire

1. [Pourquoi cette application](#1-pourquoi-cette-application)
2. [Démarrage rapide](#2-démarrage-rapide)
3. [Les écrans](#3-les-écrans)
4. [Règles métier appliquées](#4-règles-métier-appliquées)
5. [Données de démonstration](#5-données-de-démonstration)
6. [Import / Export](#6-import--export)
7. [Sécurité & conformité](#7-sécurité--conformité)
8. [Architecture & stack](#8-architecture--stack)
9. [Modèle de données](#9-modèle-de-données)
10. [API REST locale](#10-api-rest-locale)
11. [Tests](#11-tests)
12. [Scripts npm](#12-scripts-npm)
13. [Déploiement](#13-déploiement)
14. [Feuille de route](#14-feuille-de-route)

---

## 1. Pourquoi cette application

Corthay migre de Google Workspace (+ Dropbox) vers Microsoft 365 / Exchange Online. Le
suivi se faisait dans un classeur Excel difficile à exploiter (onglets « Liste Users »,
« Suivi Licences », « Analyse »). L'application centralise et fiabilise ce suivi :

- **qui est prêt, qui bloque** — statut de migration, MFA, reconnexion, validation ;
- **quelle licence coûte quoi** — moteur de calcul des coûts, comparatifs, scénarios ;
- **quelles boîtes doivent être nettoyées** — alertes automatiques de stockage ;
- **quelles actions restent avant la bascule** — tâches, jalons, risques ;
- **qui relancer** — suivi des communications.

Les utilisateurs non techniques visualisent l'état du projet d'un coup d'œil ; les
décisions sensibles (DNS, désattribution de licence, conversion en boîte partagée)
restent **manuelles** — l'application ne fait que suivre leur statut.

## 2. Démarrage rapide

> Pré-requis : **Node.js ≥ 18.18** (testé sous Node 22).

```bash
npm install
npm run dev            # interface + API sur http://localhost:3000
```

Au premier lancement, la base de travail `data/db.json` est créée automatiquement à
partir du jeu de démonstration `data/seed.json` (45 comptes réels). Aucune autre
installation n'est nécessaire (pas de base de données à provisionner).

```bash
npm test               # 29 tests des règles métier (licences, stockage, risques, emails)
npm run build          # build de production
npm run seed           # réinitialise data/db.json au jeu de démonstration
```

## 3. Les écrans

> **Hyper-connectivité** — partout dans l'application, les références d'entités sont
> cliquables et ouvrent une **fiche récapitulative** dans un panneau latéral, avec
> navigation enchaînée (bouton retour) : un **utilisateur** → sa fiche ; un **code de
> licence** → fiche licence (référentiel + porteurs + coûts) ; un **site** → fiche site
> (synthèse + utilisateurs). Par ex. depuis une fiche licence on clique un porteur pour
> rebondir sur sa fiche, puis sur son site, etc.

Navigation latérale, 15 vues :

| Écran | Contenu |
| --- | --- |
| **Dashboard** | Cartes KPI (comptes, profils, boîtes > 50/100 Go, MFA, coûts, économies, risques critiques, tâches en retard) + graphiques (répartition licences, coût par profil, statut migration, MFA, risques) + comparatif des 3 scénarios d'engagement. |
| **Utilisateurs** | Vue principale façon onglet « Liste Users » : tri, filtres, recherche, **édition inline**, cases à cocher licence (2 Go / 50 Go / F3 / F3+50 / Business) + Pack BeCloud, **sélection multiple & édition en masse**, panneau latéral de détail, indication visuelle des incohérences, export CSV/XLSX. |
| **Boîtes mail** | Type actuel/cible, taille, seuil applicable, statut stockage, licence cible, envoi auto / scan, **action recommandée** par boîte. |
| **Boîtes partagées** | Boîtes de service / anciens salariés : membres, droits, alias, taille. **Assistant de décision** (« cette boîte peut-elle être partagée ? ») + conversion en un clic. |
| **Listes de distribution** | CRUD : membres internes/externes, expéditeurs externes, usage, statut de création. |
| **Licences** | Logique de l'onglet « Suivi Licences » : référentiel profils × engagement × paiement, ventilation des utilisateurs, récap & coûts par profil, **comparatif des 3 scénarios** (EA-PA / EA-PM / EM-PM), comparatif Google/Dropbox, alertes d'incohérence. |
| **Migration mail** | Avancement copie → bascule → reconnexion → validation, KPIs de préparation, édition rapide du statut et du nettoyage. |
| **MFA** | Méthode, configuration, blocage, assistance, instruction envoyée, première connexion. |
| **Tâches** | Tâches préchargées + ajout, catégorie / responsable / priorité / statut / échéance, repérage des retards. |
| **Risques** | Registre **auto-généré par règles** + risques saisis manuellement, score = gravité × probabilité. |
| **Communications** | Générateur de modèles d'emails **FR / EN** par profil, copie / téléchargement, **sans mot de passe**. |
| **Calendrier** | Jalons projet (timeline), statut, dépendances, risques bloquants, indicateurs de préparation. |
| **Imports / Exports** | Import Excel/CSV avec **mapping de colonnes** + aperçu ; exports CSV / XLSX de pilotage et **XLSX de migration BeCloud** (5 onglets). |
| **Paramètres** | Prix des licences **éditables** + hypothèses de comparaison (Google, Dropbox, DNS…). Les coûts se recalculent partout. |
| **Journal d'audit** | Traçabilité des créations, changements de licence, statuts, imports… |

## 4. Règles métier appliquées

Toutes ces règles sont implémentées dans `lib/domain/` (fonctions pures) et **couvertes
par des tests** :

- Le **Pack BeCloud** (42,50 €/mois) ne s'applique **qu'aux Business Premium (P1)** ; coché
  ailleurs, il est ignoré et l'incohérence est signalée.
- Une **boîte partagée** est **gratuite sous 50 Go**, **non comptée** dans les licences,
  **sans accès externe**, avec des membres internes licenciés.
- **Stockage** : `> 100 Go` = **critique**, `> 50 Go` = **élevé**, `45–50 Go` = **à surveiller**.
- Boîte **> capacité de sa licence** ⇒ alerte ; proche de la limite ⇒ alerte orange.
- Boîte en **envoi automatique / scan-to-mail** ⇒ nécessite une licence (impossible en
  boîte partagée pure).
- **Ne jamais** désattribuer une licence avant que la cible (boîte partagée) soit
  opérationnelle.
- **Engagement** : EA-PA (annuel/annuel, le + économique) → EA-PM (annuel/mensuel, défaut)
  → EM-PM (mensuel/mensuel, le + flexible).
- **Risques automatiques** : boîte > 100 Go (critique), > 50 Go sans nettoyage (élevé),
  boîte partagée > 50 Go (élevé), VIP non prêt (élevé), MFA non configurée avant
  reconnexion (moyen/élevé), DNS non préparé avant cutover (critique), boîte auto/scan
  sans licence (élevé).

## 5. Données de démonstration

Le jeu de démonstration (`data/seed.json`) est **généré à partir du fichier réel**
`BECLOUD ANALYSE.xlsx` (onglets « Liste Users » + « Suivi Licences ») :

- **45 comptes** avec noms, emails, dernière connexion et taille de boîte réels ;
- **11 Business Premium** ⇒ Pack BeCloud = **467,50 €/mois** (11 × 42,50) ;
- boîtes critiques **Xavier 131 Go** (VIP), **Claire 116 Go**, et > 50 Go : Fabien, Roald,
  Yue ;
- profils P1 / P2 / P3 / P4a / P4b, comptes « à arbitrer », boîtes boutiques, scan-to-mail ;
- 15 tâches préchargées, 6 jalons (étapes 2 → 7), 1 liste de distribution « ventes
  quotidiennes ».

Pour régénérer le jeu depuis l'Excel :

```bash
python3 scripts/build_seed.py "/chemin/vers/BECLOUD ANALYSE.xlsx" data/seed.json
```

## 6. Import / Export

**Import** (écran *Imports / Exports*, traitement côté navigateur) : déposer
`BECLOUD ANALYSE.xlsx` ou un CSV Google Workspace → choix de l'onglet → **mapping
automatique** des colonnes (First Name, Last Name, Email, Status, Last Sign In, Email
Usage, cases licence), ajustable manuellement → aperçu → import en **fusion (par email)**
ou **remplacement**.

**Exports** :

- **Utilisateurs (CSV)** — comptes, licences, coûts ;
- **XLSX de pilotage** — onglets Utilisateurs / Tâches / Risques ;
- **XLSX de migration BeCloud** — onglets **Utilisateurs / Boîtes partagées / Listes de
  distribution / Boîtes ressources / Domaines**.

## 7. Sécurité & conformité

- **Aucun mot de passe** n'est stocké, affiché ou envoyé. Les emails générés mentionnent
  uniquement « *mot de passe temporaire transmis par un canal séparé* ». Un test
  garde-fou (`containsPassword`) vérifie que **tous** les modèles en sont exempts.
- Les statuts sensibles (« MFA réalisée », « mot de passe à communiquer », …) sont de
  simples indicateurs.
- **Actions sensibles manuelles** : DNS/MX, suppression/désattribution de licence,
  conversion en boîte partagée, modifications Admin Center.
- **Pas d'intégration Microsoft Graph en écriture** en V1 (architecture prévue pour
  l'ajouter plus tard).

## 8. Architecture & stack

| Couche | Choix | Pourquoi |
| --- | --- | --- |
| Framework | **Next.js 14 (App Router) + TypeScript** | Un seul process (`npm run dev`) pour l'UI et l'API |
| Style | **Tailwind CSS** + composants maison (façon shadcn/ui) | Sobre, dense, sans dépendance lourde |
| Données | **Store JSON local** (`data/db.json`) | MVP simple, 100 % local, sans binaire à compiler (Prisma/SQLite) |
| Import/Export | **SheetJS (`xlsx`)** | Lecture Excel, exports CSV/XLSX |
| Graphiques | **SVG / CSS maison** | Aucune dépendance graphique externe |
| Tests | **Vitest** | Règles licences / stockage / risques / emails |

Séparation stricte des responsabilités :

```
. (racine du dépôt Migrator)
├── app/                      Pages (App Router) + routes API (/api/*)
├── components/               UI : Sidebar, primitives, charts, panneau détail user
├── lib/
│   ├── types.ts              Types métier (source de vérité)
│   ├── domain/               RÈGLES MÉTIER PURES & TESTÉES
│   │   ├── licensing.ts        coûts, totaux, scénarios, comparatif Google
│   │   ├── storage.ts          seuils 50/100 Go, capacité licence
│   │   ├── validation.ts       incohérences (Pack BeCloud, boîte partagée…)
│   │   ├── risks.ts            génération automatique des risques
│   │   ├── emails.ts           modèles FR/EN (jamais de mot de passe)
│   │   ├── timeline.ts         indicateurs de préparation
│   │   └── factory.ts          fabrique d'utilisateurs (import + création)
│   ├── data/                 ACCÈS DONNÉES (serveur) : store.ts, mutations.ts
│   ├── store-client.tsx      provider React (état + mutations)
│   └── format.ts             formatage € / dates
├── data/seed.json            jeu de démo (45 comptes réels) — versionné
├── scripts/                  build_seed.py (Excel → seed), seed.mjs (reset db)
└── test/                     tests Vitest
```

> **Pourquoi un store JSON plutôt que SQLite/Prisma ?** Pour un MVP 100 % local sans
> binaire à télécharger/compiler. La couche d'accès (`lib/data/store.ts`) est isolée
> derrière une interface simple (`getDb` / `saveDb` / `mutate`) : on peut basculer vers
> SQLite ou Postgres **sans toucher** à l'UI ni aux règles métier.

## 9. Modèle de données

Entités : `User` (compte, avec sous-objets `MailboxInfo` et `MfaInfo`) · `LicenseType` ·
`Task` · `Risk` · `DistributionList` · `Milestone` · `AuditEntry` · `Settings`.

> Choix MVP : ici **une boîte = un email**, donc les attributs de boîte mail sont
> **embarqués** sur le compte (`user.mailbox`). Les vues « Boîtes mail » / « Boîtes
> partagées » sont des lentilles sur cette donnée. Une table `Mailboxes` dédiée pourra
> être introduite ultérieurement.

## 10. API REST locale

| Méthode | Route | Rôle |
| --- | --- | --- |
| GET | `/api/bootstrap` | État complet |
| POST / PATCH / DELETE | `/api/users[/:id]` | CRUD utilisateurs (+ audit) |
| PATCH | `/api/license-types/:code` | Prix d'un profil |
| PATCH | `/api/settings` | Hypothèses |
| POST / PATCH / DELETE | `/api/tasks`, `/api/risks`, `/api/distribution-lists` | CRUD |
| PATCH | `/api/milestones/:id` | Statut d'un jalon |
| POST | `/api/import` | Import d'utilisateurs (fusion / remplacement) |
| GET | `/api/export/{users-csv,pilotage-xlsx,migration-xlsx}` | Exports |
| POST | `/api/reset` | Réinitialise au jeu de démonstration |

## 11. Tests

`npm test` — **29 tests** (Vitest) sur les règles critiques :

- **licences** : prix selon engagement/paiement, Pack BeCloud limité à P1, total
  licence + pack, boîte partagée = 0 € non comptée, totaux du parc, scénarios EA-PA <
  EM-PM, comparatif Google ;
- **stockage** : seuils 50/100 Go et zone 45–50, dépassement de capacité (avec prise en
  compte du nettoyage), proximité de limite ;
- **règles** : incohérences (Pack non-P1, boîte > capacité, partagée > 50 Go / externe),
  risques auto (critique > 100 Go, VIP non prêt, DNS, score) ;
- **emails** : aucun modèle FR/EN ne contient de mot de passe, mention du canal séparé.

## 12. Scripts npm

| Script | Effet |
| --- | --- |
| `npm run dev` | Démarre l'application (UI + API) |
| `npm run build` | Build de production |
| `npm start` | Sert le build de production |
| `npm test` | Exécute la suite de tests |
| `npm run seed` | Réinitialise `data/db.json` depuis `data/seed.json` |

## 13. Déploiement

Conçue pour un usage **local**. Le store écrit dans `data/db.json` ; si le système de
fichiers est en lecture seule (ex. fonction serverless), un **repli en mémoire** est
automatique (les données ne sont alors pas persistées entre invocations). Pour un
déploiement multi-utilisateurs persistant, basculer la couche `lib/data/store.ts` vers
une base hébergée (voir [`CHECKLIST.md`](./CHECKLIST.md)).

## 14. Feuille de route

Voir [`CHANGELOG.md`](./CHANGELOG.md) pour l'historique des versions et
[`CHECKLIST.md`](./CHECKLIST.md) pour « ce qui reste à brancher plus tard » (Microsoft
Graph en lecture, authentification, envoi réel des emails, migration documentaire
Dropbox → OneDrive/SharePoint, profil Exchange Plan 2 100 Go…).

---

*Outil interne — Groupe Corthay / MAGE. Corthay reste propriétaire de l'environnement et
des données.*
