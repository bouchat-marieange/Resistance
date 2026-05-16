# Workflow après import de nouveaux éléments dans la scène

À suivre **à chaque fois** que tu importes un ou plusieurs GLB (modèles 3D) ou textures dans l'éditeur (`editor.html`). Objectif : garder `scene_data/` compact (~30 MB) pour un chargement rapide en jeu et un repo Git léger.

---

## 1. Finir la session dans l'éditeur

- [ ] Sauvegarde la scène via le bouton **"Exporter scene_data/"** de l'éditeur.
- [ ] Vérifie que `scene_data/project.json` et les nouveaux `scene_data/blobs/blob_xxx.json` ont bien été créés (date de modification du jour).
- [ ] Ferme l'onglet `editor.html`.

## 2. Compresser les nouveaux GLB (Draco)

Ouvre un terminal à la racine du projet (`C:\Users\marie\Desktop\Resistance`) et lance :

```bash
node tools/compress-blob-glbs.js
```

Ce que tu verras :
- Liste des blobs scannés avec leur poids avant / après et le pourcentage gagné.
- Les blobs déjà compressés sont automatiquement sautés (`[KEEP]`).
- Les textures images et audios sont ignorés (seuls les GLB sont touchés).
- En bas, un résumé `Total: X MB -> Y MB (-Z%)`.

**Option dry-run** (pour voir ce qui serait fait sans rien écrire) :

```bash
node tools/compress-blob-glbs.js --dry-run
```

## 3. Vérifier le rendu en local

- [ ] Lance le serveur :
  ```bash
  python -m http.server 8000
  ```
- [ ] Ouvre http://127.0.0.1:8000/room_1.html (ou la salle concernée).
- [ ] **Force-reload** avec `Ctrl+Shift+R` pour purger le cache navigateur.
- [ ] **Purge IndexedDB si tu as modifié une scène existante** : F12 → onglet *Application* → *IndexedDB* → supprimer la base `RoomEditorDB` → recharger la page.
- [ ] Vérifie que :
  - Tous les nouveaux objets s'affichent correctement (pas de modèle manquant).
  - La console (F12) n'affiche pas d'erreur `Draco` ou `Blob introuvable`.
  - Le jeu tourne fluide.

## 4. Mesurer la taille finale

```bash
du -sh scene_data
```

Si la scène pèse plus de 50 MB après compression, vérifie dans l'éditeur si certains gros GLB peuvent être remplacés par des versions low-poly, ou si des imports anciens sont devenus inutiles (voir étape 6).

## 5. Commit Git

Depuis la racine du projet :

```bash
git status
git add scene_data/ tools/ 3D/ 3D_optimized/   # ajuste selon ce que tu as modifié
git commit -m "feat: ajout [décris les nouveaux éléments]"
git push
```

**Message de commit utile** : inclure quels objets ont été ajoutés et la nouvelle taille totale de `scene_data/`.

## 6. Nettoyage périodique des blobs orphelins (facultatif, tous les 1-2 mois)

L'éditeur ne supprime pas automatiquement les blobs quand tu supprimes un objet de la scène. Ces blobs restent dans `scene_data/blobs/` et alourdissent le repo. Pour les détecter et les supprimer :

```bash
python3 tools/clean-orphan-blobs.py   # (script à écrire quand le besoin revient)
```

> Note : lors du nettoyage initial (avril 2026), on avait trouvé **110 MB d'orphelins** accumulés depuis le début du projet. Faire ce passage régulièrement évite de laisser la dette grossir.

---

## Résumé en 3 commandes

```bash
# Après chaque import
node tools/compress-blob-glbs.js
python -m http.server 8000          # tester
git add scene_data/ && git commit -m "..." && git push
```

---

## Checklist express à cocher après chaque session d'import

- [ ] Export scene_data/ depuis l'éditeur
- [ ] `node tools/compress-blob-glbs.js`
- [ ] Test en local (force-reload + IndexedDB purge si besoin)
- [ ] `git status` → `git add` → `git commit` → `git push`
- [ ] Vérifier que la taille de `scene_data/` reste raisonnable (<50 MB)
