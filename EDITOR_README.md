# Guide de l'Éditeur 3D — Résistance

## Vue d'ensemble

L'éditeur 3D de Résistance est un **outil autonome** (`editor.html`), entièrement séparé des pages de jeu. Il permet de composer, placer et configurer les objets, lumières et éléments de gameplay de chaque pièce du bunker, puis de sauvegarder ces configurations dans le navigateur. Les pages de jeu récupèrent ensuite ces données via `scene-loader.js` au moment du chargement — sans jamais embarquer le code de l'éditeur.

Cette séparation est délibérée : elle évite de faire peser plusieurs centaines de kilooctets de code d'édition sur chaque page de jeu, et maintient une frontière nette entre l'outil de création et l'expérience jouée.

---

## Architecture des fichiers

```
Résistance/
├── editor.html                    # Application éditeur autonome
├── scene-loader.js                # Chargeur léger côté jeu (remplace les scripts éditeur)
│
└── editor/                        # Modules de l'éditeur
    ├── editor-state.js            # Variables d'état globales partagées
    ├── editor-core.js             # Gizmos (TransformControls), sélection, undo/redo
    ├── editor-objects.js          # Import GLB/GLTF, gestion des objets, sélection multiple
    ├── editor-camera-lights.js    # Caméra (position, FOV) et sources lumineuses
    ├── editor-audio.js            # Système de pistes audio (4 catégories)
    ├── editor-save.js             # Sauvegarde/chargement IndexedDB + localStorage, réglages visuels
    ├── editor-floorplan.js        # Vue de dessus, plan de pièce, création de murs
    ├── editor-panel.html          # Interface du panneau (chargé dynamiquement dans editor.html)
    └── editor.css                 # Styles du panneau éditeur
```

> `editor.js` (à la racine) est une version legacy de la classe `SceneEditor` conservée pour compatibilité. Il n'est **pas** utilisé par `editor.html`.

---

## Lancer l'éditeur

Ouvrir `editor.html` dans le navigateur (via serveur local ou GitHub Pages). Un **sélecteur de pièce** s'affiche au démarrage.

### Sélecteur de pièce

La liste propose les pièces prédéfinies du projet ainsi que toutes les pièces créées par l'utilisateur :

| Identifiant | Titre affiché |
|---|---|
| `cocoon_nexus` | Cocoon du Nexus |
| `salle_controle_nexus` | Salle de contrôle du Nexus |
| `hall_entree_nexus` | Hall d'entrée du Nexus |
| `la_villa` | La Villa |
| `sas_securite` | Sas de sécurité — Naby |

Pour créer une nouvelle pièce, cliquer **« + Nouvelle pièce »**, saisir un identifiant (ex : `couloir`) et un titre affiché.

### Ouverture directe via URL

```
editor.html?room=sas_securite&title=Sas%20de%20sécurité
```

> ⚠️ L'ancienne syntaxe `?editor=true` sur les pages de jeu est **obsolète** et n'est plus supportée. L'éditeur est désormais une application à part entière.

---

## Navigation dans l'éditeur

L'éditeur utilise une caméra orbitale (vue libre, non subjective) :

| Touche / Action | Effet |
|---|---|
| `Z` / `W` | Avancer |
| `S` | Reculer |
| `Q` / `A` | Glisser à gauche |
| `D` / `E` | Glisser à droite |
| `Shift` | Courir (déplacement rapide) |
| Clic droit + glisser | Faire pivoter la vue |
| Molette | Zoom avant / arrière |
| `Ctrl+S` | Sauvegarder la pièce (IndexedDB) |
| `Ctrl+Z` | Annuler (undo, 20 niveaux) |
| `Ctrl+Y` | Rétablir (redo) |

---

## Structure du panneau d'édition

Le panneau latéral est organisé en trois zones :

### 1. Barre latérale d'icônes (gauche)

Six icônes d'onglets en haut, puis des boutons d'action en bas :

| Icône | Fonction |
|---|---|
| Boîte 3D | Onglet **Objets** |
| Caméra | Onglet **Caméra** |
| Ampoule | Onglet **Lumières** |
| Plan | Onglet **Plan de pièce** |
| Pion (chess) | Onglet **Éléments de jeu** |
| Ondes audio | Onglet **Audio** |
| `+` vert | **Créer une nouvelle pièce** (ouvre le sélecteur) |
| Disquette | **Sauvegarder** (Ctrl+S) — un point rouge s'affiche si des changements ne sont pas sauvegardés |
| 📥 | **Exporter pour le jeu** — génère un fichier `project.json` à placer dans `scene_data/` (synchronise lumières et réglages vers les pages de jeu sans passer par IndexedDB) |
| Switch | **Mode Jeu / Développeur** — bascule l'interaction entre manipulation (développeur) et test de navigation (jeu) |

### 2. Barre supérieure sticky (commune à tous les onglets)

Toujours visible en haut du contenu, deux sections :

**Vues standards :**
- **Haut** — vue de dessus (caméra à la verticale)
- **Face** — vue frontale
- **Libre** — vue libre orbitale sans restriction de rotation
- **Gauche** — vue de gauche
- **Droite** — vue de droite
- **Reset** — réinitialise la caméra à sa position par défaut

**Mode de transformation (gizmos) :**
- **Position** (`Alt+<`) — déplacer l'objet sélectionné
- **Rotation** (`Alt+W`) — faire pivoter l'objet
- **Échelle** (`Alt+X`) — redimensionner l'objet

### 3. Zone de contenu scrollable (par onglet)

---

## Onglets — Description détaillée

### Onglet Objets

- **Liste des objets** : tous les objets présents dans la scène (importés + murs + personnages), avec possibilité de les renommer et de les organiser en dossiers
- **Importer un GLB/GLTF** : ouvre un sélecteur de fichier local ; le modèle apparaît au centre de la scène (position 0, 5, 0)
- **Gizmos de transformation** : après sélection d'un objet (clic dans la scène ou dans la liste), les gizmos Position/Rotation/Échelle s'activent
- **Indicateur de dimensions** : affiche L × l × H en centimètres pour l'objet sélectionné
- **Réglages visuels par objet** : luminosité (via emissive), exposition, contraste, décalage couleur, correction gamma — modifications non destructives appliquées au rechargement dans les pages de jeu
- **Sélection multiple** : possible pour déplacer plusieurs objets ensemble

> ⚠️ Les matériaux des objets importés ne sont **pas automatiquement corrigés**. Si un objet apparaît noir, c'est qu'il ne réagit pas à la lumière ambiante de la scène. Utiliser les réglages visuels (luminosité / exposition) ou ajouter une lumière plus forte.

### Onglet Caméra

- **Gizmo caméra** : une sphère verte filaire représente la position de départ du joueur dans la scène
- Régler la **position** du point de spawn via le gizmo ou les champs numériques
- Ajuster le **champ de vision (FOV)** de la caméra de jeu
- La **rotation initiale** (direction du regard au démarrage) est définie dans le panneau

### Onglet Lumières

Types disponibles : **ambiante · ponctuelle · directionnelle · spot**

Pour chaque source lumineuse :
- **Couleur** (sélecteur de couleur)
- **Intensité** (curseur)
- **Portée / distance** (ponctuelle et spot)
- **Angle** (spot uniquement)
- Activer / désactiver individuellement (ampoule)
- Verrouiller la position (cadenas)
- Supprimer (corbeille, sauf lumière ambiante par défaut)

> Les ombres des **lumières ponctuelles** sont désactivées (coût GPU élevé). Pour des ombres portées, utiliser des **spots** ou des **directionnelles**.

### Onglet Plan de pièce

- Bascule en **vue de dessus** avec grille
- Permet de dessiner des **murs** au sol en cliquant pour définir les contours
- Retour à la vue 3D via le même bouton

### Onglet Éléments de jeu

- Définir le **spawn du joueur** (point de départ dans la pièce)
- Créer des **zones d'interaction** (triggers) :
  - Dessin de la zone au sol (cliquer-déposer)
  - Type de déclencheur : clic / proximité / maintien
  - Action associée : dialogue, vidéo, mini-jeu, etc.
  - Affichage d'un indicateur visuel au survol (F pour interagir)

### Onglet Audio

Quatre catégories de pistes : **Musique · Ambiance · Bruitage · Mouvement**

- **Formats supportés** : MP3 et WAV uniquement
- **Limite de taille** : avertissement au-dessus de 15 Mo (les fichiers volumineux ralentissent la sauvegarde)
- **Volume individuel** par piste (curseur 0–100)
- **Mode de lecture** : en boucle (auto pour musique et ambiance) / ponctuel / déclenché
- **Déclencheur** : au chargement (`load`) / aucun (`none`) / par proximité ou action pour les bruitages et sons de mouvement

---

## Sauvegarde et chargement

### Système de stockage principal — IndexedDB

Les configurations de scène sont stockées dans la base de données locale du navigateur (IndexedDB). Cette sauvegarde :
- persiste entre les sessions
- peut stocker des données volumineuses (modèles GLB encodés en base64)
- est déclenchée par `Ctrl+S` ou automatiquement après chaque transformation d'un objet importé
- est indiquée par un **voyant rouge** sur le bouton de sauvegarde quand des changements ne sont pas encore enregistrés

### Système de secours — localStorage

Les surcharges de position, de rotation et de réglages matériaux sont également stockées en localStorage. Ce système prend le relais si IndexedDB échoue, et gère aussi la liste des pièces créées par l'utilisateur.

### Export JSON pour le jeu (📥)

Le bouton 📥 génère un fichier `project.json` à placer dans le dossier `scene_data/` du projet. Ce fichier sert à synchroniser lumières et réglages visuels vers les pages de jeu dans les cas où le cache IndexedDB aurait été effacé ou pour un déploiement sur un autre navigateur. Il est complémentaire (et non substitut) à la sauvegarde IndexedDB.

**Format du fichier :**
```json
{
  "version": "1.0",
  "timestamp": "2026-05-20T12:00:00.000Z",
  "camera": { "position": { "x": 0, "y": 1.5, "z": 5 }, "fov": 75 },
  "lights": [
    { "type": "spot", "position": { "x": 0, "y": 8, "z": 0 },
      "color": "#ffffff", "intensity": 2.0, "distance": 20, "angle": 0.6 }
  ],
  "importedObjects": [
    { "fileName": "arcade-ai-mythology.glb", "editorName": "Borne Arcade AI Mythology",
      "position": { "x": 0.5, "y": 0.85, "z": -7.5 },
      "rotation": { "x": 0, "y": 1.5708, "z": 0 },
      "scale": { "x": 1.0, "y": 1.0, "z": 1.0 } }
  ],
  "spawnPosition": { "x": 0, "y": 0, "z": 3 },
  "spawnRotationY": 0
}
```

---

## Chargement côté jeu — `scene-loader.js`

Les pages de jeu (`sas_securite.html`, etc.) **ne chargent pas les scripts de l'éditeur**. Elles embarquent uniquement `scene-loader.js`, qui reconstruit la scène depuis IndexedDB/localStorage.

`scene-loader.js` contient :
- La reconstruction des objets (positions / rotations / échelles)
- L'application des réglages visuels par objet (luminosité, exposition, contraste, gamma)
- La restauration des lumières
- Les zones d'interaction (triggers de dialogue, mini-jeux, vidéos)
- Le positionnement du joueur au spawn
- Le système audio (4 catégories, gestion du volume)

**Ce que `scene-loader.js` ne contient pas** : aucun gizmo, aucun panneau d'édition, aucun import de fichiers, aucun undo/redo.

> L'éditeur et les pages de jeu doivent être ouverts depuis le **même serveur local** (ou le même domaine GitHub Pages) pour partager la même base IndexedDB.

---

## Objets permanents par pièce

Certains objets sont chargés directement par `editor.html` pour chaque pièce, car ils font partie de l'identité fixe de la salle. Ils ne sont pas sauvegardés via l'import manuel, mais peuvent avoir leurs positions modifiées (sauvegardées dans localStorage via les surcharges).

**Sas de sécurité (`sas_securite`) :**
- **Naby** — personnage animé (`nabydance.glb`), chargé avec ses animations Three.js (AnimationMixer), hauteur cible 1,70 m
- **Berger Allemand Debout** — `berger-allemand-debout.glb`
- **Borne Arcade AI Mythology** — `arcade-ai-mythology.glb`
- **Tapis** — généré en code (PlaneGeometry procédural, texture `images/tapis.jpg`), pas de GLB

Un système anti-doublon vérifie si chaque objet est déjà en scène avant de le recharger.

---

## Workflow de conception d'une pièce

1. Ouvrir `editor.html` dans le navigateur
2. Sélectionner ou créer la pièce dans le sélecteur
3. Importer les objets GLB (onglet Objets)
4. Positionner / orienter / redimensionner avec les gizmos
5. Configurer les lumières (onglet Lumières)
6. Définir le spawn (onglet Éléments de jeu ou onglet Caméra)
7. Ajouter les zones d'interaction si nécessaire
8. Régler le son ambiant (onglet Audio)
9. Sauvegarder — `Ctrl+S` — voyant rouge disparaît
10. Ouvrir la page de jeu dans le même navigateur pour tester

---

## Résolution de problèmes courants

| Problème | Cause probable | Solution |
|---|---|---|
| Les objets n'apparaissent pas dans le jeu | IndexedDB différent (serveur ou domaine différent) | Ouvrir les deux pages depuis le même serveur local |
| Objet noir dans la scène | Matériaux non réactifs à la lumière — pas de correction automatique | Augmenter luminosité/exposition dans les réglages visuels, ou ajouter une lumière ambiante forte |
| La configuration ne se charge pas | Pièce non sauvegardée ou identifiant de pièce différent | Vérifier que `currentRoomName` dans la page de jeu correspond exactement au nom utilisé dans l'éditeur |
| Perte de configuration | Nettoyage des données du navigateur | Exporter régulièrement le JSON via 📥 comme backup externe |
| Objet en double | Objet permanent + import manuel portant le même `editorName` | Supprimer le doublon dans la liste Objets |
| Voyant rouge persistant après sauvegarde | Erreur IndexedDB silencieuse | Vérifier la console (F12) — espace disque navigateur insuffisant possible |

---

## Dépendances CDN (chargées par `editor.html`)

| Bibliothèque | Version | Usage |
|---|---|---|
| Three.js | r128 | Moteur 3D |
| Cannon.js | 0.6.2 | Bridge physique (compatibilité scripts jeu) |
| GLTFLoader | r128 | Import modèles GLB/GLTF |
| DRACOLoader | r128 | Décompression modèles Draco |
| OrbitControls | r128 | Navigation caméra orbitale de l'éditeur |
| TransformControls | r128 | Gizmos de transformation |
| Tailwind CSS + DaisyUI | 4.12.14 | Interface du panneau éditeur |
| polygon-clipping | 0.15.7 | Utilitaire géométrie (plans de pièce) |
