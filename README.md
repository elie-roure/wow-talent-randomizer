# WoW Talent Randomizer

Choisis une classe et une spécialisation de World of Warcraft (retail) : l'application génère un build de talents **aléatoire et valide**. Elle couvre l'arbre de classe, l'arbre de spécialisation (talent Apex compris) et l'arbre de héros. Le build est fourni sous forme de **chaîne d'export à coller directement en jeu**.

- Arbres affichés comme en jeu : icônes, liens, gates (seuils de points), nœuds à choix, infobulles en français.
- Bouton « Générer un build », relance ou effacement arbre par arbre, choix de l'arbre de héros.
- Édition manuelle : clic gauche pour ajouter un point, clic droit pour le retirer. Les règles du jeu sont respectées (prérequis, gates, budget de points).
- Import d'une chaîne existante. Le lien de la page contient le build et peut être partagé tel quel.

## Lancer avec Docker (recommandé)

1. Crée un client API sur <https://develop.battle.net/access/clients> et récupère son ID et son secret.
2. Copie la configuration, puis remplis `BNET_CLIENT_ID` et `BNET_CLIENT_SECRET` :
   ```bash
   cp server/.env.example server/.env
   ```
3. Démarre l'application :
   ```bash
   docker compose up --build -d
   ```
4. Ouvre <http://localhost:3000>.

Arrêt : `docker compose down`. Les données Blizzard sont mises en cache dans un volume Docker. Le premier affichage d'une spécialisation prend quelques secondes, les suivants sont instantanés.

## Développement

Prérequis : Node.js 22 ou plus.

```bash
npm run install:all   # dépendances racine + serveur + client
npm run dev           # serveur (port 3000) + client Vite (http://localhost:5173)
npm test              # tests serveur (Jest) et client (Vitest)
npm run lint
npm run build
```

## Architecture

```
server/   Express + TypeScript : proxy vers l'API Battle.net, cache et normalisation des arbres
client/   React + Vite : interface, règles des talents, randomizer et chaîne d'export
```

### Serveur

| Route | Description |
| --- | --- |
| `GET /api/meta` | Version du jeu ciblée et budgets de points |
| `GET /api/classes` | Classes et spécialisations, avec leurs icônes |
| `GET /api/specs/:specId/talents` | Arbres normalisés d'une spécialisation (classe, spec, héros, gates, budgets, ordre des nœuds pour l'export) |
| `GET /health` | État du serveur |

Le paramètre `?locale=en_US` est accepté (`fr_FR` par défaut).

- `services/blizzardClient.ts` : token *client credentials*, limitation du débit et nouvelles tentatives en cas d'erreur 429 ou 5xx.
- `services/cache.ts` : cache en mémoire et sur disque (`CACHE_DIR`, 7 jours par défaut).
- `services/talentTreeService.ts` : transforme les documents Blizzard en arbres exploitables.
- `data/specOverrides.ts` : informations absentes de l'API (voir plus bas).

### Client

- `src/lib/talents.ts` : règles du jeu (prérequis, gates, budget, validation, retrait) et randomizer.
- `src/lib/exportString.ts` : encodage et décodage de la chaîne d'import/export du jeu. Le format est celui documenté par Blizzard dans `Blizzard_ClassTalentImportExport.lua`, version 2.
- `src/components/TalentTreeView.tsx` : rendu d'un arbre.

Les tests (`src/lib/talents.test.ts`) vérifient en particulier :
- que de vraies chaînes exportées en jeu sont ré-encodées à l'identique ;
- que tous les builds aléatoires sont valides et dépensent tous les points.

## Version du jeu ciblée

Le randomizer est calibré pour **World of Warcraft : Midnight, patch 12.1.5 (niveau 90)**.

Cette version est définie à un seul endroit : `SUPPORTED_GAME_VERSION` dans [`server/src/config.ts`](server/src/config.ts). Elle est exposée par `GET /api/meta` et affichée dans l'en-tête et le pied de page de l'application. Si l'API Blizzard sert un autre patch (le patch des données est lu dans les réponses de l'API), un avertissement apparaît sur la page de la spécialisation.

Pour passer à une nouvelle version du jeu, mets à jour ensemble les éléments ci-dessous, puis `SUPPORTED_GAME_VERSION`.

## Maintenance après un patch

- **Budgets de points** (`server/src/config.ts`) : 34 points de classe, 34 de spécialisation et 13 de héros au niveau 90 (Midnight). Les talents Apex coûtent 4 rangs (`APEX_MAX_RANKS`), alors que l'API n'en décrit qu'un.
- **`SPEC_OVERRIDES`** (`server/src/data/specOverrides.ts`) : l'API Blizzard n'indique pas trois choses :
  - l'ordre des arbres de héros dans le nœud de sélection ;
  - les nœuds accordés gratuitement à chaque spécialisation ;
  - les variantes de nœuds propres à une spécialisation.

  Ces valeurs ont été déduites en décodant de vraies chaînes d'export (patch 12.1.5). Si Blizzard ajoute une spécialisation ou un arbre de héros, il faut compléter cette table de la même façon. Il suffit de décoder un build réel de la spécialisation, avec `decodeBuild` ou le même algorithme. En l'absence d'entrée, le serveur applique une règle par défaut.
- **Cache** : après un patch, vide le cache pour forcer le rechargement, avec `docker compose down -v` ou en supprimant `server/cache/`.

## Configuration (`server/.env`)

| Variable | Défaut | Description |
| --- | --- | --- |
| `BNET_CLIENT_ID` / `BNET_CLIENT_SECRET` | (aucun, obligatoire) | Identifiants de l'API Battle.net |
| `BNET_REGION` | `eu` | `eu`, `us`, `kr` ou `tw` |
| `BNET_LOCALE` | `fr_FR` | Langue des talents |
| `PORT` | `3000` | Port HTTP |
| `CACHE_DIR` | `server/cache` | Dossier du cache disque |
| `CACHE_TTL_HOURS` | `168` | Durée de vie du cache |

World of Warcraft est une marque de Blizzard Entertainment. Ce projet n'est pas affilié à Blizzard.
