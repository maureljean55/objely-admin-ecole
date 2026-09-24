# Objely École · Administration

L'espace de gestion des établissements scolaires pour Objely École : suivre les déclarations
reçues sur les bornes, enregistrer et ranger les objets déposés à la vie scolaire, les rendre
à leur propriétaire, gérer le personnel, les bornes et les règles de l'établissement.

## Démarrer

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:3000 (la page `/login` mène à la démo).

## Pages

| Page | Rôle |
|---|---|
| Tableau de bord | « À traiter », registre du jour, ancienneté du stock |
| Objets en stock | Liste, recherche, filtres, export CSV ; fiche, modification, « à donner », suppression |
| Déclarations | Perdus / trouvés reçus des bornes ; panneau de détail, clôture, enregistrement d'un objet trouvé |
| Correspondances | Objets du stock qui ressemblent à une perte déclarée (suggestions à confirmer) |
| Restitutions | Registre des objets rendus, avec vérification d'identité ; export CSV |
| Bornes | Tablettes de l'établissement, état, ajout avec code d'appairage |
| Personnel | Comptes et rôles (Administrateur, Vie scolaire, Lecture seule) |
| Paramètres | Établissement, durée de conservation, réglages des bornes |
| Journal d'activité | Qui a fait quoi, et quand |

## Base de données

Toutes les données sont réelles et vivent dans le projet Supabase **objely-ecole** (`jmmqgvtucavtvxwukgpw`).
Le schéma est dans `supabase/migrations/` du dépôt `objely-ecole` (la borne). Chaque établissement ne voit que
ses propres lignes : c'est la base de données qui l'impose (RLS), pas l'interface.

Variables d'environnement (voir `.env.example`) :

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Connexion et lecture/écriture du personnel connecté (publiques) |
| `ECOLE_SUPABASE_SECRET_KEY` | **Serveur uniquement.** Créer, réinitialiser et supprimer les comptes du personnel (`src/lib/server/staff.ts`) |

- **Connexion** : Supabase Auth, e-mail + mot de passe. Le compte d'un établissement est créé par la plateforme Objely
  (portail `objely-admin`, page Organisation) avec un mot de passe généré ; il doit le changer à la première connexion.
- **Photos** : image complète dans le bucket privé `object-photos` (dossier par établissement), miniature dans la ligne.
- **Déclarations des bornes** : arrivent en direct (Realtime). Les bornes n'ont pas encore de code qui les envoie ici :
  seule la base et ses fonctions (`pair_kiosk`, `kiosk_submit_declaration`…) sont prêtes.

## Design

Inter n'est pas utilisée : titres en Bricolage Grotesque, texte en Atkinson Hyperlegible, références en
IBM Plex Mono. Le bleu (perdu) et le violet (trouvé) viennent des deux anneaux du logo. Les icônes sont
Material Symbols, auto-hébergées et réduites : après en avoir ajouté une, lancer
`node scripts/build-icon-font.mjs`.
