# Web / PWA (GitHub Pages)

Mobile-first web build of Riftbound Companion for
`https://odimeae.github.io/riftbound-companion/`.

Data stays in the browser via AsyncStorage (localStorage). No backend.

## Build

```bash
cd riftbound-companion-expo
npm install
npm run export:web
```

Output: **`dist/`** (static HTML + JS/CSS + `public/` assets).

Dev server:

```bash
npm run web
```

## Deploy to GitHub Pages

Repo name must match `experiments.baseUrl` in `app.json`
(`/riftbound-companion`).

1. Export:

   ```bash
   npm run export:web
   ```

2. Publish the **contents** of `dist/` (not the folder name itself) to the
   `gh-pages` branch, or to `/docs` if you use that Pages source.

   Example with [`gh-pages`](https://www.npmjs.com/package/gh-pages):

   ```bash
   npx gh-pages --nojekyll -d dist
   ```

   Or manually:

   ```bash
   # from repo root after export
   git checkout --orphan gh-pages-tmp
   git rm -rf . >/dev/null 2>&1 || true
   cp -R dist/. .
   # ensure these exist at site root:
   #   .nojekyll  manifest.json  riot.txt  icon-*.png
   git add -A
   git commit -m "Deploy web PWA"
   git push -f origin HEAD:gh-pages
   git checkout main   # or your default branch
   ```

3. GitHub → **Settings → Pages** → Source: **Deploy from a branch** →
   `gh-pages` / root (or `docs` if you copied there).

4. Wait a minute, then open:
   `https://odimeae.github.io/riftbound-companion/`

`public/.nojekyll` is copied into `dist/` so GitHub does not ignore
`_expo/` folders. `public/riot.txt` is served at
`/riftbound-companion/riot.txt` (site root of this Pages project).

If you deploy `dist/` by hand and `riot.txt` is missing, copy it from
`public/riot.txt` or the repo root next to the exported files.

## iPhone — Zum Home-Bildschirm (Safari)

1. Safari öffnen → `https://odimeae.github.io/riftbound-companion/`
2. Teilen-Button (Quadrat mit Pfeil nach oben)
3. **Zum Home-Bildschirm** tippen
4. Name bestätigen → **Hinzufügen**

Die App öffnet sich danach im Standalone-Modus (ohne Safari-UI).

## Known gaps

- **Dynamic routes** (`/match/[id]`, …): `export:web` copies `index.html` →
  `404.html` so GitHub Pages can fall back into the client router on unknown
  paths. Prefer navigating from in-app lists; a cold deep-link still depends
  on that 404 fallback.
- **Alerts**: web uses `window.alert` / `confirm` (native Alert is a no-op on web).
- **Offline / service worker**: not bundled (installable PWA via manifest only).
- **Style A** and English UI are unchanged from the native app.
