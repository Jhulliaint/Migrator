# Checklist — ce qui reste à brancher plus tard (V1 → V2)

La V1 est un **MVP fonctionnel et autonome**. Voici les éléments volontairement
laissés en attente, avec l'emplacement prévu pour les brancher.

## Intégrations Microsoft / Google (hors périmètre V1)
- [ ] **Microsoft Graph (lecture)** : récupérer comptes, licences attribuées, tailles
      réelles de boîtes, statut MFA. → nouvelle source dans `lib/data/` + mapping vers `User`.
- [ ] **Microsoft Graph (écriture)** : NON prévu en V1 (création de compte, attribution
      de licence, conversion boîte partagée restent **manuelles** dans l'Admin Center).
- [ ] **Google Workspace API / Takeout** : import automatique des utilisateurs et des
      tailles de boîtes (aujourd'hui via export CSV/XLSX → écran Import).
- [ ] **Bascule DNS / MX** : action manuelle (Gandi). L'app suit le **statut** uniquement.

## Persistance & multi-utilisateurs
- [ ] Passage du store JSON à **SQLite/Prisma ou Postgres** : ne toucher qu'à
      `lib/data/store.ts` (interface `getDb/saveDb/mutate` déjà isolée).
- [ ] **Authentification** + rôles (aujourd'hui auteur d'audit = « Julien » par défaut).
- [ ] Verrouillage optimiste / multi-onglets (la V1 recharge l'état complet à chaque mutation).

## Communications
- [ ] **Envoi réel** des emails (aujourd'hui : copier / télécharger .txt). Brancher un
      service mail — sans jamais inclure de mot de passe.
- [ ] Modèles d'emails **éditables** et stockés (aujourd'hui générés par `lib/domain/emails.ts`).
- [ ] Suivi d'accusé de réception / relances automatiques.

## Migration documentaire (phase ultérieure)
- [ ] Suivi **Dropbox → OneDrive/SharePoint** (les colonnes TAKEOUT/NAS sont déjà
      importées dans les remarques ; ajouter une vue dédiée).
- [ ] Archivage PST des boîtes inactives (statut « à archiver » déjà géré).

## Confort / pilotage
- [ ] Import dédié **CSV tailles de boîtes** et **fichier de migration BeCloud** (le
      mapping générique de l'écran Import les couvre déjà partiellement).
- [ ] Export des **emails générés** en lot et export **risques/tâches** en CSV dédié
      (déjà inclus dans le XLSX de pilotage).
- [ ] Colonnes de tableau **configurables** (afficher/masquer) et vues sauvegardées.
- [ ] **Exchange Plan 2 (100 Go)** comme profil de licence à part entière pour les
      boîtes proches de 100 Go (aujourd'hui : recommandation/risque, profil non ajouté).
- [ ] Notifications (échéances de jalons, MFA bloquées, boîtes critiques).

## Données
- [ ] Réconciliation fine des comptes « à arbitrer » (11) avec un profil définitif —
      la V1 leur attribue un profil provisoire (P4a) et le statut « à arbitrer ».
