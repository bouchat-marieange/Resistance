# 📝 Guide d'utilisation de l'Éditeur de Scène 3D

## 🎯 Vue d'ensemble

L'éditeur de scène 3D est maintenant modulaire et réutilisable sur toutes les pages de votre jeu. Il permet de :
- Positionner des objets 3D importés (GLB/GLTF)
- Gérer les lumières (ambiante, ponctuelle, directionnelle, spot)
- Ajuster la position et le FOV de la caméra
- **Exporter la configuration en JSON**
- **Importer une configuration JSON**

## 📁 Structure des fichiers

```
Sort Box Game 3D/
├── editor.js                # Code de l'éditeur (réutilisable)
├── room_1.html             # Page du jeu
├── room_1_config.json      # Configuration de la scène room_1
├── room_2_config.json      # Configuration de la scène room_2 (à créer)
└── 3D/                     # Dossier contenant les fichiers GLB/GLTF
    ├── Objet_Importé_1.glb
    └── Objet_Importé_2.glb
```

## 🚀 Utilisation

### 1. Activer l'éditeur

Pour activer l'éditeur sur une page, ajoutez le paramètre URL :
```
room_1.html?editor=true
```

Sans ce paramètre, la page se lance en **mode jeu** (éditeur désactivé).

### 2. Utiliser l'éditeur

**Raccourcis clavier :**
- `E` : Activer/Désactiver l'éditeur
- `Ctrl+Z` : Annuler (à implémenter)
- `Ctrl+Y` : Rétablir (à implémenter)

**Modes de l'éditeur :**
- **Objets** : Déplacer, tourner, redimensionner les objets 3D
- **Caméra** : Ajuster la position et le FOV de la caméra
- **Lumières** : Gérer les sources lumineuses

**Gizmos (outils de transformation) :**
- **Position** (icône main) : Déplacer l'objet
- **Rotation** (icône rotation) : Tourner l'objet
- **Échelle** (icône échelle) : Redimensionner l'objet

### 3. Importer des objets 3D

1. Cliquez sur le bouton **"Importer GLB/GLTF"**
2. Sélectionnez votre fichier `.glb` ou `.gltf`
3. L'objet apparaît au centre de la scène (position 0, 5, 0)
4. Utilisez les gizmos pour le positionner

**⚠️ Problème des objets noirs résolu !**
Les matériaux sont maintenant automatiquement convertis en `MeshStandardMaterial` pour réagir correctement à la lumière.

### 4. Gérer les lumières

**Ajouter une lumière :**
1. Allez dans l'onglet **Lumières**
2. Cliquez sur **"Ajouter une lumière"**
3. Ajustez les paramètres (type, couleur, intensité, position)

**Types de lumières disponibles :**
- **Ambiante** : Éclaire toute la scène uniformément
- **Ponctuelle** : Lumière qui rayonne dans toutes les directions depuis un point
- **Directionnelle** : Lumière parallèle (comme le soleil)
- **Spot** : Lumière conique avec angle réglable

**Icônes d'action :**
- 🔒 **Cadenas** : Verrouiller/déverrouiller la position
- 💡 **Ampoule** : Allumer/éteindre la lumière
- 🗑️ **Poubelle** : Supprimer la lumière (sauf lumière par défaut)

### 5. Exporter la configuration

**Une fois votre scène terminée :**

1. Cliquez sur le bouton **"📥 Exporter config"** (à ajouter dans l'UI)
2. Un fichier JSON est téléchargé (ex: `room_1_config.json`)
3. **Replacez ce fichier** dans le dossier du projet
4. La configuration sera automatiquement chargée au prochain démarrage

**Contenu du fichier JSON :**
```json
{
  "version": "1.0",
  "timestamp": "2026-01-23T12:00:00.000Z",
  "camera": {
    "position": { "x": 0, "y": 8, "z": 20 },
    "fov": 75
  },
  "lights": [
    {
      "type": "point",
      "position": { "x": 10, "y": 20, "z": 5 },
      "color": "#ffffff",
      "intensity": 1.5,
      "distance": 50
    }
  ],
  "importedObjects": [
    {
      "fileName": "Objet_Importé_1.glb",
      "editorName": "Objet_Importé_1",
      "position": { "x": 28.55, "y": 3.74, "z": -32.64 },
      "rotation": { "x": 0, "y": -0.593, "z": 0 },
      "scale": { "x": 16.84, "y": 16.84, "z": 16.84 }
    }
  ]
}
```

### 6. Mode Jeu (sans éditeur)

Pour désactiver l'éditeur et jouer :
```
room_1.html
```
(Sans le paramètre `?editor=true`)

La configuration sera chargée depuis `room_1_config.json` mais l'interface d'édition sera masquée.

## 🔧 Intégration dans une nouvelle page

Pour utiliser l'éditeur sur `room_2.html` :

1. **Créer le fichier de configuration :**
   ```json
   // room_2_config.json
   {
     "version": "1.0",
     "camera": { "position": { "x": 0, "y": 8, "z": 20 }, "fov": 75 },
     "lights": [],
     "importedObjects": []
   }
   ```

2. **Inclure l'éditeur dans le HTML :**
   ```html
   <script src="editor.js"></script>
   <script>
     // Après la création de scene, camera, renderer, controls
     const editor = new SceneEditor(scene, camera, renderer, controls);

     // Charger la configuration
     fetch('room_2_config.json')
       .then(res => res.json())
       .then(config => editor.loadConfiguration(config));

     // Activer si paramètre URL
     const urlParams = new URLSearchParams(window.location.search);
     if (urlParams.get('editor') === 'true') {
       editor.toggle();
     }
   </script>
   ```

3. **Ajouter le HTML du panneau d'édition** (copier depuis `room_1.html`)

## 📝 Workflow de travail

### Étapes pour concevoir une scène :

1. **Ouvrir la page avec l'éditeur :**
   ```
   room_1.html?editor=true
   ```

2. **Importer et positionner les objets 3D**

3. **Ajouter et configurer les lumières**

4. **Ajuster la caméra**

5. **Exporter la configuration :**
   - Cliquer sur "Exporter config"
   - Sauvegarder le fichier JSON téléchargé dans le dossier du projet

6. **Tester en mode jeu :**
   ```
   room_1.html
   ```

7. **Itérer** : Répéter les étapes si besoin d'ajustements

## ⚠️ Notes importantes

### Objets importés
- Les fichiers GLB doivent être présents dans le dossier `3D/`
- Les noms de fichiers doivent correspondre à ceux du JSON
- La configuration JSON ne contient **pas** les données du fichier 3D, seulement les transformations

### LocalStorage supprimé
- Le système de localStorage a été **retiré**
- Toutes les configurations sont maintenant dans les fichiers JSON
- C'est **vous** qui contrôlez quand sauvegarder (export manuel)

### Performance
- L'éditeur n'impacte pas les performances en mode jeu
- Les gizmos et helpers sont automatiquement masqués

## 🐛 Résolution de problèmes

**Les objets sont noirs :**
- ✅ CORRIGÉ : Les matériaux sont maintenant automatiquement convertis en `MeshStandardMaterial`

**La configuration ne se charge pas :**
- Vérifiez que le fichier `room_X_config.json` existe
- Vérifiez la console du navigateur pour les erreurs
- Assurez-vous que le JSON est valide

**Les objets importés ne s'affichent pas :**
- Vérifiez que les fichiers GLB sont dans le dossier `3D/`
- Vérifiez que les noms de fichiers correspondent exactement

## 📚 Référence API

### SceneEditor

```javascript
const editor = new SceneEditor(scene, camera, renderer, controls);

// Méthodes principales
editor.toggle()                    // Activer/désactiver l'éditeur
editor.switchMode('objects')       // Changer de mode ('objects', 'camera', 'lights')
editor.exportConfiguration()       // Retourne l'objet de configuration
editor.downloadConfiguration()     // Télécharge le JSON
editor.loadConfiguration(config)   // Charge une configuration
editor.importModel(file, onSuccess, onError) // Importe un fichier 3D

// Gestion des lumières
editor.addNewLight()              // Ajoute une nouvelle lumière
editor.selectLight(light)         // Sélectionne une lumière
editor.initializeDefaultLight(ambientLight) // Initialise la lumière par défaut
```

## 🎉 Avantages du nouveau système

✅ **Éditeur réutilisable** sur toutes les pages
✅ **Configuration versionnée** avec votre code
✅ **Mode jeu/éditeur séparés** via paramètre URL
✅ **Export/Import JSON** pour sauvegarder vos scènes
✅ **Matériaux corrigés** - plus de problème d'objets noirs
✅ **Pas de dépendance** au localStorage
✅ **Contrôle total** sur quand sauvegarder

## 📞 Support

Pour toute question ou problème, vérifiez la console du navigateur (F12) pour les messages de debug.
