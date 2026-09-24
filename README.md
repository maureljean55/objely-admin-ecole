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

## État actuel : démonstration

Il n'y a **pas encore de base de données**. Toutes les données sont des données de démonstration,
enregistrées dans le `localStorage` du navigateur (`src/lib/store.ts`, `src/lib/seed.ts`).
Rien n'est partagé entre navigateurs, et « Réinitialiser les données de démo » (menu en bas à gauche,
ou Paramètres) remet tout à zéro. Le menu « Voir comme » permet d'essayer les trois rôles.

Ce qui n'est pas branché :

- **Connexion** : la page `/login` est une maquette, il n'y a pas d'authentification.
- **Bornes** : elles n'envoient pas encore leurs déclarations ici (le bouton « Simuler une déclaration
  de la borne » montre ce que ça donnera). L'état « en ligne » et le code d'appairage sont simulés.
- **Photos** : redimensionnées et gardées dans le navigateur.

## Base de données

Le schéma existe déjà sur le projet Supabase **objely-ecole** (`jmmqgvtucavtvxwukgpw`) : voir
`supabase/migrations/20260924100000_school_schema.sql` dans le dépôt `objely-ecole` (la borne).
Ce projet-ci n'y est pas encore connecté : il lui faut l'URL du projet et sa clé publishable.

## Brancher Supabase

Toutes les écritures passent par les fonctions de `src/lib/store.ts`. Pour passer en base :
remplacer ces fonctions (et `loadStore`) par des appels Supabase, créer les tables
(objets, déclarations, restitutions, membres, bornes, paramètres, journal) avec des règles RLS
par établissement, et brancher Supabase Auth sur `/login`. Les pages n'ont pas à changer.

## Design

Inter n'est pas utilisée : titres en Bricolage Grotesque, texte en Atkinson Hyperlegible, références en
IBM Plex Mono. Le bleu (perdu) et le violet (trouvé) viennent des deux anneaux du logo. Les icônes sont
Material Symbols, auto-hébergées et réduites : après en avoir ajouté une, lancer
`node scripts/build-icon-font.mjs`.
