# Notes projet — Migrator (pilotage migration Microsoft 365 / BeCloud)

Application de suivi de la migration **Google Workspace → Microsoft 365 / Exchange
Online** du Groupe Corthay / MAGE (Next.js 14 + TypeScript + Tailwind, store JSON local).
Voir `README.md`. Lancement à la racine : `npm install && npm run dev`.

## Principes de conception à respecter (préférences utilisateur)

### Hyper-connectivité (IMPORTANT — habitude par défaut)
Construire des interfaces **fortement cross-liées**. Toute référence à une entité affichée
quelque part doit être **cliquable** et faire atterrir sur une **fiche récapitulative
pertinente**, et la navigation doit pouvoir s'**enchaîner** de fiche en fiche.

Concrètement, par défaut :
- un **utilisateur** (nom, email, membre d'une boîte, entité liée d'un risque/tâche) →
  ouvre sa fiche détaillée ;
- un **code/profil de licence** → ouvre une fiche licence (référentiel + porteurs + coûts) ;
- un **site / pays** → ouvre une fiche site (synthèse + utilisateurs) ;
- les éléments de synthèse (KPI, légendes de graphiques) renvoient vers la vue filtrée
  correspondante quand c'est pertinent.

Implémentation : inspecteur global (`lib/inspector.tsx` + `components/inspector/`)
exposant `inspectUser/inspectLicense/inspectSite`, avec pile de navigation (bouton
retour). Composants de lien réutilisables (`UserLink`, `LicenseLink`, `SiteLink`,
`EntityLink`) plutôt que du texte brut.

### Style attendu
Outil de pilotage opérationnel sobre et dense (pas « startup gadget ») : en-têtes bleu
marine, lignes alternées bleu pâle, badges de statut (vert/orange/rouge/gris), colonnes
figées, panneaux latéraux de détail.

### Sécurité
Jamais de mot de passe stocké/affiché/envoyé. Actions sensibles (DNS, désattribution de
licence, conversion boîte partagée) laissées manuelles. Pas d'écriture Microsoft Graph en V1.
