# Journal des modifications

Toutes les évolutions notables de l'application **BeCloud — Pilotage de la migration
Microsoft 365** sont consignées ici.

Le format s'inspire de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le
versionnement suit [SemVer](https://semver.org/lang/fr/).

## [Non publié]

Rien pour l'instant. Voir [`CHECKLIST.md`](./CHECKLIST.md) pour les évolutions prévues
(Microsoft Graph en lecture, authentification, envoi réel des emails, migration
documentaire Dropbox → OneDrive/SharePoint, profil Exchange Plan 2 100 Go…).

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
