# Guide : Compression des personnages 3D (Meshy + Mixamo)

## Pourquoi compresser ?

Un personnage Meshy anime avec Mixamo pese en moyenne 20-30 MB en sortie.
Apres compression, il descend a 2-5 MB sans perte de qualite visible.
Cela accelere le chargement du jeu de plusieurs secondes par personnage.

## Pre-requis

Node.js doit etre installe sur ta machine (deja fait).
L'outil `gltf-transform` est installe dans le projet (`npm install` suffit).

## Marche a suivre pour chaque nouveau personnage

### 1. Creer et animer le personnage

1. Creer le personnage 3D sur **Meshy** (https://meshy.ai)
2. Telecharger le modele au format **GLB**
3. Importer le GLB sur **Mixamo** (https://www.mixamo.com)
4. Choisir une animation (danse, marche, idle, etc.)
5. Telecharger depuis Mixamo au format **GLB** (pas FBX)
6. Placer le fichier dans `3D/perso/` (ex: `3D/perso/mon-perso.glb`)

### 2. Compresser le fichier

Ouvre un terminal dans le dossier `Resistance/` et lance ces 2 commandes :

```bash
# Etape A : Reduire les textures de 2048x2048 a 1024x1024
npx gltf-transform resize --width 1024 --height 1024 "3D/perso/mon-perso.glb" "3D/perso/mon-perso-resized.glb"

# Etape B : Appliquer la compression Draco sur la geometrie
npx gltf-transform draco "3D/perso/mon-perso-resized.glb" "3D/perso/mon-perso-final.glb"
```

### 3. Verifier le resultat

```bash
# Comparer les tailles
ls -lh "3D/perso/mon-perso.glb" "3D/perso/mon-perso-final.glb"

# Inspecter le contenu (optionnel)
npx gltf-transform inspect "3D/perso/mon-perso-final.glb"
```

Tu devrais voir une reduction de 80-90% (ex: 27 MB -> 3 MB).

### 4. Remplacer le fichier dans le projet

```bash
# Garder une copie de l'original (au cas ou)
mv "3D/perso/mon-perso.glb" "3D/perso/mon-perso-original.glb"

# Renommer le fichier compresse
mv "3D/perso/mon-perso-final.glb" "3D/perso/mon-perso.glb"

# Supprimer le fichier intermediaire
rm "3D/perso/mon-perso-resized.glb"
```

### 5. Tester dans le jeu

Ouvre la page du jeu et verifie que :
- Le personnage s'affiche correctement
- Les textures sont nettes (1024x1024 est suffisant pour un personnage vu a quelques metres)
- L'animation fonctionne normalement

Si les textures paraissent floues de pres, tu peux garder la resolution 2048 en sautant l'etape A et en lancant directement la compression Draco sur le fichier original.

## Commande rapide tout-en-un

Pour aller plus vite, copie-colle cette commande en remplacant `NOM` par le nom de ton fichier :

```bash
NOM="mon-perso" && npx gltf-transform resize --width 1024 --height 1024 "3D/perso/${NOM}.glb" "3D/perso/${NOM}-tmp.glb" && npx gltf-transform draco "3D/perso/${NOM}-tmp.glb" "3D/perso/${NOM}-compressed.glb" && rm "3D/perso/${NOM}-tmp.glb" && echo "Termine : $(ls -lh 3D/perso/${NOM}-compressed.glb | awk '{print $5}')"
```

## Comment ca marche techniquement

- **gltf-transform resize** : Reduit la resolution des textures embarquees dans le GLB
  (2048x2048 -> 1024x1024). Divise la taille des textures par 4.
- **gltf-transform draco** : Compresse les donnees de geometrie (vertices, normales, UV)
  avec l'algorithme Draco de Google. Le navigateur decompresse a la volee grace au
  DRACOLoader integre dans le jeu.

## Fichiers dans le projet

- `DRACOLoader.js` : Charge automatiquement depuis le CDN Three.js r128
- `sharedGLTFLoader` : Loader global configure dans room_1.html, utilise partout
- Le jeu supporte les GLB compresses ET non-compresses (le loader detecte automatiquement)

## Exemple concret : nabydance.glb

```
AVANT compression : 27.0 MB (281 593 vertices, textures 2048x2048)
APRES compression :  2.9 MB (meme qualite visible, textures 1024x1024)
Gain             : -89%
```
