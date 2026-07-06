# Plan de réorganisation — Resistance

> Proposé le 5 juillet 2026 (suite à l'audit complet du même jour). À exécuter phase par phase, chaque phase se termine par un test du parcours complet (`__lancer-serveur.bat` → index → blackbox → bruxelles → sas → arcade → éditeur).

## Contraintes non négociables (pourquoi on ne déplace PAS tout)

1. **URLs publiques stables** : GitHub Pages sert la racine du repo. `index.html` et les pages de jeu (`test-blackbox.html`, `sas_securite.html`, `la_villa.html`, `cocoon_nexus.html`, etc.) gardent leur nom et leur place — les profils joueurs stockent `lastRoom` avec ces noms de fichiers dans localStorage, et les zones de `scene_data/project.json` pointent vers ces URLs.
2. **Pas de bundler** (choix assumé du projet) : la modularisation se fait par balises `<script>` ordonnées, comme le fait déjà `editor/`.
3. **Les dossiers d'assets ne bougent pas** : `3D/`, `audios/`, `images/`, `videos/`, `icones/`, `scene_data/`, `assets/` sont référencés par les manifestes de scène (`project.json`, blobs, fallbacks `images/textures/<nom>`). Les déplacer = casser les scènes exportées.

## Architecture cible

```
Resistance/
├── index.html ··············· connexion / profils (inchangé)
├── test-blackbox.html ········ mini-jeu Décodeur (inchangé de nom, JS extrait → game/pages/)
├── bruxelles_dystopique.html · transition (inchangé)
├── bruxelles_diaporama.html ·· aperçus (inchangé)
├── sas_securite.html ········· salle principale (inchangé de nom, JS extrait → game/pages/)
├── la_villa.html ············· salle Villa (inchangé)
├── cocoon_nexus.html ┐
├── salle_controle_nexus.html ├ pages WIP Nexus — dédupliquées via game/core/
├── hall_entree_nexus.html ───┘
├── room_model.html ··········· pièces personnalisées (inchangé)
├── editor.html ··············· éditeur (inchangé)
│
├── game/
│   ├── core/ ················· NOUVEAU — code partagé extrait des pages
│   │   ├── env.js ············ IS_LOCAL, resolveURL, constantes globales
│   │   ├── profiles.js ······· gestion profils localStorage (aujourd'hui dupliquée dans 6+ pages)
│   │   ├── video-gate.js ····· overlay vidéo local/YouTube + skip + fullscreen (dupliqué index/blackbox)
│   │   └── page-boot.js ······ enregistrement lastRoom, icône réglages, boilerplate commun
│   ├── engine/ ··············· NOUVEAU — scene-loader.js découpé (phase 4)
│   │   ├── db.js ············· RoomEditorDB (IndexedDB + fallback fetch + RETRY)
│   │   ├── scene-bootstrap.js  bootstrapFromFiles, comparaison timestamps
│   │   ├── scene-restore.js ·· murs, sols, objets importés, lumières
│   │   ├── scene-audio.js ···· pistes audio, zones, mouvements
│   │   └── player.js ········· caméra FPS, collisions, zones d'interaction
│   ├── pages/ ················ NOUVEAU — JS inline extrait des grosses pages
│   │   ├── sas-securite.js ··· ~2 900 lignes actuellement inline dans sas_securite.html
│   │   └── blackbox.js ······· ~2 500 lignes actuellement inline dans test-blackbox.html
│   ├── dialogues/naby.js ····· (inchangé)
│   ├── *-manager.js ·········· les 11 managers existants (inchangés)
│   ├── ui-panels.css ········· (inchangé)
│   └── controls-screen.html ·· (inchangé)
│
├── editor/ ··················· (inchangé — déjà bien modulaire)
│   └── ⚠️ editor.js RACINE = code mort (chargé par aucune page) → supprimer (git garde l'historique)
│
├── ai-mythology/ ············· RENOMMAGE OPTIONNEL de "AI Mythology - mini jeu" (phase 5)
├── 3D/  audios/  images/  videos/  icones/  scene_data/  assets/  dialogues/   (inchangés)
├── docs/ ····················· NOUVEAU — EDITOR_README.md, GUIDE-COMPRESSION-3D.md, ce plan
├── tools/ ···················· scripts pipeline (inchangé)
├── __serveur.py  __lancer-serveur.bat   (restent à la racine — double-clic pratique)
├── README.md  CLAUDE.md  package.json  .gitignore  .gitattributes  .nojekyll
```

## Phases

### Phase 0 — Sécuriser AVANT tout (URGENT, avant LUDOVIA 10/07)
- [x] Committer les réparations de l'audit du 5/07 (project.json/version.json remis en place, 3 blobs audio restaurés, la_villa/room_model restaurés) sur `dev`, merger dans `main`, pousser.
- [x] Taguer `v-ludovia` (état stable de référence).
- [ ] **Aucun refactor avant le 10/07.** Toutes les phases suivantes = après la deadline, sur une branche `refactor/architecture`.

### Phase 1 — Corrections & nettoyage sans risque (~1 h)
- [x] Fix soft-lock : dans `test-blackbox.html`, `exitNexus()` → fallback `goToBruxelles()` si la vidéo de transition est absente (événement `error` / `readyState`).
- [x] Fix portrait par défaut : `game/dialogue-manager.js` → `images/Portraits/Portrait Naby.jpg` au lieu de `assets/portraits/naby.png`.
- [x] Fix icône carnet : remplacer `icones/map-pin.svg` par `icones/pin.svg` (existe) dans `test-blackbox.html`.
- [x] Supprimer le double `<script game/score-manager.js>` dans `room_model.html`, `cocoon_nexus.html`, `hall_entree_nexus.html`, `salle_controle_nexus.html`.
- [x] Supprimer `editor.js` (racine, mort). Mettre à jour la mention dans `CLAUDE.md` et `EDITOR_README.md`.
- [x] Créer `docs/` et y déplacer `EDITOR_README.md`, `GUIDE-COMPRESSION-3D.md` (README.md et CLAUDE.md restent à la racine).
- [x] Supprimer `desktop.ini` (déjà gitignoré).

### Phase 2 — Poids & performances (~1 journée, gain massif)
- [x] `images/apercu bruxelles dystopique` : 48 PNG × ~13 Mo = 464 Mo → WebP qualité 80, max 1920 px ≈ 15-20 Mo. Mettre à jour les 48 `src` de `bruxelles_diaporama.html` (script sed simple).
- [x] AI Mythology : basculer les 19 voix de cartes `.wav` → `.mp3` (les mp3 existent déjà ; seul Oracle-7 l'utilise). Vérifier le mapping nom par nom (2 wav référencés n'ont pas de mp3 au nom identique : « Medbot-X Natural » et « Tutor-IA »). Les `.wav` remplacés partent aux archives hors repo.
- [x] AI Mythology : précharger les images des boutons animés dans des objets `Image` au lieu de re-swapper `src` en boucle (rafales de requêtes annulées constatées).
- [x] `3D/arcade-ai-mythology.glb` (42 Mo, versionné, non utilisé par le jeu qui charge `arcade-compressed.glb`) → sortir du repo.
- [x] `scene-loader.js` : ajouter 2-3 tentatives avec délai croissant sur le fetch des blobs (échecs transitoires constatés en local sous 19 requêtes parallèles), ou limiter la concurrence à 4-6 téléchargements simultanés.
- [x] Nettoyage git : supprimer les 8 worktrees `.claude/worktrees/*` (1,8 Go) et les branches `claude/*` obsolètes ; supprimer les branches locales mergées (`clean-start`, `optim-speed`, `feature/*`, `tfe-optimization-sprint` si mergées) ; `git gc --aggressive` (le `.git` fait 3 Go).

### Phase 3 — Déduplication du code des pages (~2-3 jours)
Objectif : le même code copié-collé dans 6+ pages devient 4 modules `game/core/`.
- [x] `game/core/profiles.js` : extraire `getAllProfiles / saveProfile / getActiveProfile / setActiveProfile / markIntroWatched` (aujourd'hui dans index.html, + variantes lastRoom dans chaque page de jeu). En profiter pour **échapper le pseudo** (textContent, jamais innerHTML) et valider `lastRoom` contre une liste blanche de pages.
- [x] `game/core/env.js` *(fait — resolveURL laissé dans sas-securite.js, seule page qui l'utilise)* : `IS_LOCAL`, `resolveURL` (dupliqués dans index, blackbox, sas, editor).
- [x] `game/core/video-gate.js` *(primitives plein écran + chargeur API YouTube ; l'unification complète des overlays se fera avec les 12 vidéos personnages)* : logique overlay vidéo locale/YouTube + bouton skip + fullscreen (dupliquée index/blackbox, bientôt nécessaire pour les 12 vidéos personnages).
- [x] `game/core/page-boot.js` : enregistrement lastRoom + icône réglages + overlay « pseudo » commun aux 4 pages Nexus WIP (leurs ~100 lignes identiques chacune).
- [x] Extraire le JS inline de `sas_securite.html` → `game/pages/sas-securite.js` et celui de `test-blackbox.html` → `game/pages/blackbox.js` (extraction brute d'abord, sans réécriture — le HTML passe de 144 Ko à ~30 Ko et le JS devient diffable/versionnable proprement).
- [x] Même opération pour le CSS *(blackbox.css 55 Ko ; les styles de sas_securite sont petits et restent inline)* inline volumineux → `game/pages/*.css`.

### Phase 4 — Découpage du moteur scene-loader.js (~2-3 jours, le plus délicat)
- [ ] Scinder `scene-loader.js` (114 Ko) en 5 modules `game/engine/` (voir arbre) chargés dans l'ordre par les pages, pattern identique à `editor/`.
- [ ] Règle : découpage **mécanique** par sections existantes du fichier, pas de renommage de fonctions/globales dans un premier temps (les pages et l'éditeur partagent ces globales).
- [ ] Namespace progressif ensuite : `window.RES = { db, engine, profiles, ... }` pour sortir du « tout global ».
- [ ] Test complet obligatoire : sas + room_model + cocoon + éditeur (ouverture, édition, export scene_data, rechargement IDB vierge).

### Phase 5 — Renommage « AI Mythology - mini jeu » → `ai-mythology/` (optionnel, ~1 h)
URL propre sans espaces/accents. Points à mettre à jour (liste exhaustive vérifiée) :
- [ ] `sas_securite.html` : `actionValue: './AI Mythology - mini jeu/index.html'` (zone borne arcade, recréée à chaque chargement — l'IDB des joueurs existants se corrige donc toute seule).
- [ ] `scene_data/project.json` : même chaîne dans la zone exportée.
- [ ] `ai-mythology/index.html` : les 3 retours `../sas_securite.html?spawn=arcade` (inchangés) — rien à faire côté retour.
- [ ] Re-tester l'aller-retour sas ↔ arcade.

### Règles pour la suite (nouvelles créations)
1. Nouveaux fichiers : kebab-case, sans espaces ni accents (`salle-cartographie.html`, pas `Salle Cartographie.html`).
2. 1 page = 1 fichier JS dédié dans `game/pages/` + modules partagés `game/core/` — plus jamais 3 000 lignes inline.
3. Les fichiers sources (PSD, WAV bruts, sessions Audition, générations IA non retenues) ne rentrent plus dans le repo : dossier d'archives hors projet.
4. Chaque nouvelle salle réutilise `page-boot.js` au lieu de copier une page existante.
