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

- [ ] Tous les fichiers `data/scheda-*.json` sont présents dans `www/data/`
- [ ] Le `sw.js` liste tous les fichiers dans `ASSETS_TO_CACHE`
- [ ] `npm run build:www` s'est exécuté sans erreur
