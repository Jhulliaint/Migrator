# Journal des modifications

Toutes les évolutions notables de l'application **BeCloud — Pilotage de la migration
Microsoft 365** sont consignées ici.

Le format s'inspire de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le
versionnement suit [SemVer](https://semver.org/lang/fr/).

## [Non publié]

### Ajouté
- **Statut de connexion au compte Microsoft** (`msAccountStatus`) : nouveau suivi
  d'activation par utilisateur — *à prévenir → mot de passe envoyé → première connexion
  faite → connexion confirmée → bloqué*. Éditable dans la fiche, en colonne sur la page
  **Migration**, en édition de masse et en colonne personnalisable ; tracé dans l'audit
  et exporté (CSV / XLSX pilotage). *(Aucun mot de passe n'est stocké : seul l'état du
  workflow est suivi.)*
- **Applications Office utilisées** (`officeApps`) par utilisateur (Outlook, Word, Excel,
  PowerPoint, Teams, OneDrive, SharePoint, OneNote) : sélection dans la fiche, colonne
  personnalisable et export. Valeurs initiales déduites du profil de licence.
- **Comptes non humains gérés / accès** : sur la fiche d'un utilisateur **humain**, une
  liste cochable des boîtes partagées / de service / techniques qu'il gère ou auxquelles
  il a accès (champ `linkedMailboxes`, relation inverse des membres de boîte partagée).
  Affiché aussi dans le bandeau « Relations » (liens cliquables) et en colonne.
- **Colonne « Licence » unique** dans la liste utilisateurs : les 5 cases à cocher
  exclusives sont remplacées par une **liste déroulante** (P1/P2/P3/P4a/P4b/partagée),
  triable, avec cohérence Pack BeCloud conservée.
- **Colonnes personnalisables** dans la liste : un sélecteur « ➕ Ajouter une colonne »
  permet d'afficher **n'importe quel paramètre utilisateur** (email Microsoft, rôle,
  téléphone, VIP, système, statut migration/communication, MFA, type/membres/alias de
  boîte, boîtes liées, remarques, dates…). Chaque colonne ajoutée est retirable (×) et
  la configuration est **mémorisée localement** (`localStorage`).
- **Éditeur d'alias** dans la fiche utilisateur : ajout via champ + bouton et
  suppression par puce (au lieu d'un champ texte séparé par « ; »).
- **Suppression d'utilisateurs depuis la liste** : icône 🗑 par ligne (avec
  confirmation) et **suppression groupée** dans la barre d'édition en masse — en
  complément du bouton déjà présent dans le panneau de détail.
- **Édition des statuts depuis la liste** : le statut de compte devient un menu
  déroulant **éditable en ligne** ; la barre d'édition en masse gère désormais aussi le
  **statut de compte** et le **risque** (en plus du profil de licence, du statut de
  migration et de l'engagement).

### Données
- **Reseed complet depuis le fichier de migration réel** (`MAGE SAS`) via le nouveau
  script `scripts/build_seed_mage.mjs` : **39 utilisateurs** réels (dont 9 boîtes
  partagées), répartition des licences fidèle à l'Excel (P1×11, P4a×8, P3×5, P4b×3,
  P2×3, partagées×9), **liens de boîtes partagées** (membres ↔ boîtes) reconstruits, la
  liste de distribution **« Fermeture »**, le risque par défaut déduit de la taille de
  boîte (> 100 Go = rouge, > 50 Go = orange) et le fournisseur DNS positionné sur
  **WIX**. Les mots de passe de l'Excel ne sont jamais lus ni stockés (cf. CLAUDE.md).
  En production (Vercel KV), appliquer le nouveau jeu via **Paramètres → Réinitialiser**
  ou `npm run seed`.

### Modifié
- **Persistance / déploiement Vercel** : la couche d'accès aux données
  (`lib/data/store.ts`) gère désormais **deux back-ends derrière la même interface**,
  choisis automatiquement : **Vercel KV (Redis)** quand `KV_REST_API_URL` +
  `KV_REST_API_TOKEN` sont définis (état complet sous la clé `migrator:db`), sinon le
  fichier local `data/db.json` (repli mémoire conservé). Résout la perte de données en
  serverless (FS lecture seule, `/tmp` éphémère).
- Interface du store rendue **asynchrone** (`getDb` / `saveDb` / `mutate` / `resetDb`
  renvoient des `Promise`) ; `await` ajouté dans `lib/data/mutations.ts` et les routes
  `app/api/*`. **Aucun changement** d'UI ni de règles métier (`lib/domain/`), qui ne
  dépendent que de l'API REST.
- `scripts/seed.mjs` : amorce **Vercel KV** quand il est configuré (sinon réinitialise
  `data/db.json`). Section *Déploiement* du README réécrite (Vercel + KV).
- Dépendance ajoutée : `@vercel/kv`.

Voir [`CHECKLIST.md`](./CHECKLIST.md) pour les autres évolutions prévues (Microsoft
Graph en lecture, authentification, envoi réel des emails, migration documentaire
Dropbox → OneDrive/SharePoint, profil Exchange Plan 2 100 Go…).

## [1.1.0] — 2026-06-15

### Ajouté
- **Hyper-connectivité** : un inspecteur global (panneau latéral + pile de navigation
  avec bouton retour) permet de cliquer n'importe quelle référence d'entité pour ouvrir
  une **fiche récapitulative pertinente**, et d'enchaîner la navigation :
  - tout **utilisateur** (nom, email, membre de boîte, entité liée d'un risque/tâche) →
    sa fiche détaillée ;
  - tout **code de licence** → fiche licence (référentiel, porteurs, coûts) ;
  - tout **site / pays** → fiche site (synthèse, profils, utilisateurs).
  Composants de lien réutilisables `UserLink` / `LicenseLink` / `SiteLink` / `EntityLink`
  (`lib/inspector.tsx`, `components/inspector/`).

### Documentation
- README détaillé (présentation, écrans, règles métier, architecture, API, tests,
  déploiement) et ce CHANGELOG.
- `CLAUDE.md` (notes projet / préférences de conception, dont l'hyper-connectivité) et
  `CHECKLIST.md` (éléments laissés à brancher en V2).

## [1.0.0] — 2026-06-14

Première version (MVP fonctionnel et autonome). Remplace le suivi Excel
`BECLOUD ANALYSE.xlsx` par une application web locale de pilotage.

### Ajouté

**Écrans (15)**
- Dashboard : KPI parc/licences/coûts, graphiques (répartition licences, coût par
  profil, statut migration, MFA, risques), comparatif des 3 scénarios d'engagement.
- Utilisateurs : tri, filtres, recherche, édition inline, cases à cocher licence façon
  Excel + Pack BeCloud, sélection multiple & édition en masse, panneau de détail,
  indication des incohérences, export CSV/XLSX.
- Boîtes mail : type actuel/cible, seuil, statut de stockage, action recommandée.
- Boîtes partagées : membres/droits/alias, assistant de décision et conversion.
- Listes de distribution : CRUD complet.
- Licences : référentiel profils × engagement × paiement, ventilation, récap et coûts
  par profil, comparatif scénarios et comparatif Google/Dropbox, alertes d'incohérence.
- Migration mail : avancement copie → bascule → reconnexion → validation + KPIs de
  préparation.
- MFA : méthode, configuration, blocage, assistance, instruction, première connexion.
- Tâches : tâches préchargées + création, catégories/responsables/priorités/échéances.
- Risques : registre auto-généré par règles + risques manuels, score gravité × proba.
- Communications : générateur d'emails FR/EN par profil (copie / téléchargement).
- Calendrier : jalons projet (étapes 2 → 7), statut, dépendances, risques bloquants.
- Imports / Exports : import Excel/CSV avec mapping + aperçu ; exports CSV, XLSX de
  pilotage et XLSX de migration BeCloud (5 onglets).
- Paramètres : prix de licences éditables + hypothèses de comparaison.
- Journal d'audit : traçabilité des modifications.

**Moteur métier (pur, testé — 29 tests)**
- Calcul des coûts : licence, Pack BeCloud, total mensuel/annuel, totaux du parc,
  récap par profil, comparatif des scénarios EA-PA / EA-PM / EM-PM, comparatif
  Google Workspace + Dropbox, impact d'un passage en boîte partagée.
- Règles de stockage : seuils 50 Go (élevé), 100 Go (critique), 45–50 Go (à surveiller) ;
  dépassement de capacité de licence (avec prise en compte du nettoyage).
- Validation des incohérences : Pack BeCloud hors P1, boîte > capacité, boîte partagée
  > 50 Go / accès externe / membre hors organisation, suggestion de boîte partagée.
- Génération automatique des risques (stockage, VIP, MFA, DNS, scan-to-mail).
- Modèles d'emails FR/EN garantis sans mot de passe.

**Données & intégrations**
- Jeu de démonstration généré depuis le fichier réel `BECLOUD ANALYSE.xlsx`
  (45 comptes, 11 Business Premium → Pack BeCloud 467,50 €/mois, boîtes volumineuses,
  comptes à arbitrer, scan-to-mail, liste de distribution « ventes quotidiennes »).
- Store JSON local (`data/db.json`) initialisé depuis `data/seed.json`, couche d'accès
  isolée (remplaçable par SQLite/Postgres).
- API REST locale (bootstrap, CRUD utilisateurs/tâches/risques/listes, prix de licences,
  paramètres, jalons, import, exports, reset).
- Script `scripts/build_seed.py` (Excel → seed) et `npm run seed` (réinitialisation).

### Sécurité
- Aucun mot de passe stocké, affiché ou envoyé (vérifié par test sur tous les modèles
  d'emails).
- Actions sensibles (DNS, désattribution de licence, conversion de boîte) laissées
  manuelles ; aucune écriture Microsoft Graph.

### Notes
- Les 11 comptes « à arbitrer » reçoivent un profil provisoire (P4a) et le statut
  « à arbitrer », d'où un coût total mensuel légèrement supérieur à l'Excel d'origine
  (qui ne les chiffrait pas).
- Fournisseur DNS par défaut : Gandi (paramétrable).

[Non publié]: https://github.com/Jhulliaint/Migrator
[1.1.0]: https://github.com/Jhulliaint/Migrator
[1.0.0]: https://github.com/Jhulliaint/Migrator
