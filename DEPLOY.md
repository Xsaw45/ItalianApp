# Deploy — ItalianApp

## Site de déploiement

**Netlify** — [https://app.netlify.com](https://app.netlify.com)

Le site est un PWA statique (pas de backend). Netlify héberge le contenu du dossier `www/`.

---

## Préparer le dossier de déploiement

Avant chaque déploiement, régénérer le dossier `www/` depuis la racine :

```bash
npm run build:www
```

Ce script copie `index.html`, `css/`, `js/`, `data/`, `icons/`, `assets/`, `manifest.webmanifest` et `sw.js` dans `www/`.

---

## Déployer sur Netlify

### Option 1 — Drag & drop (manuel)

1. Aller sur [app.netlify.com](https://app.netlify.com)
2. Ouvrir le site ItalianApp
3. Onglet **Deploys**
4. Glisser-déposer le dossier `www/` dans la zone de drop

### Option 2 — Via GitHub (automatique)

Si le site est connecté au repo GitHub (`github.com/Xsaw45/ItalianApp`) :

- **Build command :** `npm run build:www`
- **Publish directory :** `www`

Chaque push sur `main` déclenche un déploiement automatique.

---

## Checklist avant déploiement

- [ ] `npm run build:www` s'est exécuté sans erreur
- [ ] `www/data/` contient tous les `scheda-*.json` + `scheda-0a.json` + `scheda-19bis.json`
- [ ] `www/data/vocab.json` et `www/data/conjugation.json` sont présents
- [ ] `www/data/manifest.json` est à jour
- [ ] `sw.js` version bumped (actuellement **v9**) si des fichiers ont changé
- [ ] `sw.js` liste tous les nouveaux fichiers dans `ASSETS_TO_CACHE`

## Version actuelle

| Fichier | État |
|---|---|
| `sw.js` | v9 |
| Module vocabulaire | 3 niveaux, ~300 mots |
| Module conjugaison | 3 niveaux, 60 verbes (720 cartes) |
| Schede | 42 fiches (scheda-1 → scheda-40 + 0a + 19bis) |
| Langues | Italiano / Français (toggle) |
