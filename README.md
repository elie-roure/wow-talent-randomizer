# wow-talent-random

Squelette de projet Node.js + TypeScript + Express.

Quick start

1) Installer les dépendances

```powershell
npm install
```

2) En développement

```powershell
npm run dev
```

3) Build + démarrer

```powershell
npm run build; npm start
```

4) Linter

```powershell
npm run lint
```

5) Tests

```powershell
npm run test
```

Structure recommandée

- `src/` : code source
- `src/routes` : routes express
- `src/controllers` : logique des endpoints
- `src/services` : logique métier
- `src/models` : interfaces / types
- `tests/` : tests

Personnalisation

- Adapter les dépendances et scripts selon vos besoins (DB, auth, etc.).

Authentification Battle.net (Passport)

1) Créez une application Battle.net et récupérez les identifiants (client ID / secret) sur le portail développeur Blizzard.
2) Copiez `.env.example` vers `.env` et remplissez `BNET_CLIENT_ID`, `BNET_CLIENT_SECRET`, `BNET_CALLBACK_URL` et `BNET_REGION`.
3) Les routes d'auth sont exposées sous `/auth` :
	- Démarrer l'auth: GET /auth/bnet
	- Callback: GET /auth/bnet/callback
4) Exemple minimal : la stratégie Passport est configurée dans `src/auth/passport.ts` et les routes dans `src/routes/auth.ts`.

Notes de sécurité
- Ne committez jamais `.env` dans le dépôt.
- Changez `SESSION_SECRET` en valeur forte pour la production.
