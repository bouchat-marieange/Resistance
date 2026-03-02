# 🔧 Guide d'intégration de l'éditeur dans vos pages

## Étapes pour intégrer l'éditeur

### 1. Inclure le fichier JavaScript

Dans votre HTML, avant la fermeture de `</body>` :

```html
<!-- Inclure l'éditeur modulaire -->
<script src="editor.js"></script>
```

### 2. Initialiser l'éditeur dans votre code

Après avoir créé `scene`, `camera`, `renderer`, et `controls` :

```javascript
// Créer l'instance de l'éditeur
let sceneEditor = null;

function initEditor() {
    sceneEditor = new SceneEditor(scene, camera, renderer, controls);

    // Initialiser la lumière ambiante par défaut
    if (window.defaultAmbientLight) {
        sceneEditor.initializeDefaultLight(window.defaultAmbientLight);
    }

    // Charger la configuration de la scène
    loadSceneConfiguration();

    // Activer l'éditeur si paramètre URL présent
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('editor') === 'true') {
        sceneEditor.toggle();
    }
}

function loadSceneConfiguration() {
    // Charger le fichier JSON de configuration
    fetch('room_1_config.json')
        .then(response => {
            if (!response.ok) {
                console.warn('Fichier de configuration non trouvé, utilisation des valeurs par défaut');
                return null;
            }
            return response.json();
        })
        .then(config => {
            if (config) {
                sceneEditor.loadConfiguration(config);
                console.log('✅ Configuration de la scène chargée');
            }
        })
        .catch(error => {
            console.error('Erreur lors du chargement de la configuration:', error);
        });
}

// Appeler initEditor() après avoir créé la scène
function init() {
    // ... votre code d'initialisation de la scène ...

    // Initialiser l'éditeur
    initEditor();

    // Lancer l'animation
    animate();
}
```

### 3. Ajouter les boutons d'export/import dans le HTML

Dans votre panneau d'éditeur, ajoutez ces boutons :

```html
<!-- Dans le panneau objets -->
<div style="padding: 8px; border-top: 1px solid #3a3a3a;">
    <button id="export-config-btn" class="btn btn-primary" style="width: 100%; margin-bottom: 4px;">
        📥 Exporter configuration
    </button>
    <label for="import-config-input" class="btn btn-success" style="width: 100%; margin: 0;">
        📤 Importer configuration
    </label>
    <input type="file" id="import-config-input" accept=".json" style="display: none;">
</div>
```

### 4. Connecter les boutons aux fonctions de l'éditeur

```javascript
// Export de la configuration
document.getElementById('export-config-btn').addEventListener('click', function() {
    const configName = 'room_1_config.json'; // Adaptez selon la page
    sceneEditor.downloadConfiguration(configName);

    // Feedback utilisateur
    this.textContent = '✅ Configuration exportée !';
    this.style.background = '#27ae60';

    setTimeout(() => {
        this.textContent = '📥 Exporter configuration';
        this.style.background = '';
    }, 2000);
});

// Import de la configuration
document.getElementById('import-config-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const config = JSON.parse(event.target.result);
            sceneEditor.loadConfiguration(config);
            alert('✅ Configuration importée avec succès !');
        } catch (error) {
            alert('❌ Erreur lors de l\'import : fichier JSON invalide');
            console.error(error);
        }
    };
    reader.readAsText(file);

    // Réinitialiser l'input
    e.target.value = '';
});
```

### 5. Gérer l'import d'objets 3D

Pour le bouton d'import de modèles 3D :

```javascript
document.getElementById('import-model-btn').addEventListener('click', function() {
    document.getElementById('model-file-input').click();
});

document.getElementById('model-file-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const btn = document.getElementById('import-model-btn');
    const originalText = btn.textContent;
    btn.textContent = '⏳ Chargement...';
    btn.disabled = true;

    sceneEditor.importModel(
        file,
        // Succès
        (model) => {
            btn.textContent = '✅ Importé !';
            btn.style.background = '#27ae60';

            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
                btn.disabled = false;
            }, 2000);

            // Mettre à jour la liste des objets importés
            updateImportedObjectsList();
        },
        // Erreur
        (error) => {
            alert(`❌ Erreur lors de l'import : ${error}`);
            btn.textContent = originalText;
            btn.disabled = false;
        }
    );

    e.target.value = '';
});
```

### 6. Connecter les boutons de mode

```javascript
document.getElementById('mode-objects').onclick = () => sceneEditor.switchMode('objects');
document.getElementById('mode-camera').onclick = () => sceneEditor.switchMode('camera');
document.getElementById('mode-lights').onclick = () => sceneEditor.switchMode('lights');
```

### 7. Connecter les boutons de lumière

```javascript
document.getElementById('add-light-btn').onclick = () => sceneEditor.addNewLight();
document.getElementById('apply-light-settings-btn').onclick = () => sceneEditor.applyLightSettings();
```

### 8. Raccourci clavier pour toggle l'éditeur

```javascript
window.addEventListener('keydown', (e) => {
    // Appuyer sur 'E' pour activer/désactiver l'éditeur
    if (e.key === 'e' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        // Vérifier qu'on n'est pas dans un input
        if (document.activeElement.tagName !== 'INPUT' &&
            document.activeElement.tagName !== 'TEXTAREA') {
            sceneEditor.toggle();
        }
    }
});
```

## Exemple complet minimal

```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Ma Scène 3D</title>
    <!-- Vos styles -->
</head>
<body>
    <!-- Votre HTML de l'éditeur (copié depuis room_1.html) -->
    <div id="editor-panel" class="card bg-base-100 shadow-xl flex flex-row collapsed">
        <!-- ... contenu du panneau ... -->
    </div>

    <!-- Three.js et dépendances -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/cannon.js/0.6.2/cannon.min.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/js/loaders/GLTFLoader.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/js/controls/OrbitControls.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/js/controls/TransformControls.js"></script>

    <!-- Éditeur modulaire -->
    <script src="editor.js"></script>

    <script>
        // Votre code de jeu
        let scene, camera, renderer, controls;
        let sceneEditor;

        function init() {
            // Créer la scène
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.shadowMap.enabled = true;
            document.body.appendChild(renderer.domElement);

            // Contrôles
            controls = new THREE.OrbitControls(camera, renderer.domElement);

            // Lumière ambiante par défaut
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
            ambientLight.userData.id = 'default-ambient';
            ambientLight.userData.type = 'ambient';
            ambientLight.userData.isDefault = true;
            ambientLight.userData.name = 'Lumière Ambiante';
            ambientLight.position.set(0, 120, 0);
            scene.add(ambientLight);
            window.defaultAmbientLight = ambientLight;

            // Initialiser l'éditeur
            sceneEditor = new SceneEditor(scene, camera, renderer, controls);
            sceneEditor.initializeDefaultLight(ambientLight);

            // Charger la configuration
            fetch('room_1_config.json')
                .then(res => res.json())
                .then(config => sceneEditor.loadConfiguration(config))
                .catch(err => console.warn('Config non trouvée:', err));

            // Activer si URL contient ?editor=true
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('editor') === 'true') {
                sceneEditor.toggle();
            }

            // Connecter les event listeners
            setupEditorEventListeners();

            // Lancer l'animation
            animate();
        }

        function setupEditorEventListeners() {
            // Modes
            document.getElementById('mode-objects').onclick = () => sceneEditor.switchMode('objects');
            document.getElementById('mode-camera').onclick = () => sceneEditor.switchMode('camera');
            document.getElementById('mode-lights').onclick = () => sceneEditor.switchMode('lights');

            // Export/Import
            document.getElementById('export-config-btn').onclick = () => {
                sceneEditor.downloadConfiguration('room_1_config.json');
            };

            // Import de modèles 3D
            document.getElementById('import-model-btn').onclick = () => {
                document.getElementById('model-file-input').click();
            };

            document.getElementById('model-file-input').onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    sceneEditor.importModel(file,
                        (model) => console.log('Modèle importé:', model),
                        (error) => alert('Erreur:', error)
                    );
                }
            };

            // Lumières
            document.getElementById('add-light-btn').onclick = () => sceneEditor.addNewLight();
            document.getElementById('apply-light-settings-btn').onclick = () => sceneEditor.applyLightSettings();

            // Toggle avec 'E'
            window.addEventListener('keydown', (e) => {
                if (e.key === 'e' && document.activeElement.tagName !== 'INPUT') {
                    sceneEditor.toggle();
                }
            });
        }

        function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }

        window.onload = init;
    </script>
</body>
</html>
```

## Notes importantes

1. **Fichiers GLB** : Les objets importés doivent être dans le dossier `3D/` avec les noms correspondants au JSON

2. **Configuration par défaut** : Si le fichier JSON n'existe pas, l'éditeur fonctionne quand même avec les valeurs par défaut

3. **Mode jeu vs éditeur** :
   - `room_1.html` → Mode jeu (éditeur masqué)
   - `room_1.html?editor=true` → Mode éditeur

4. **Sauvegarde** : C'est **vous** qui décidez quand exporter (bouton "Exporter configuration")

5. **Objets noirs** : Le problème est résolu dans `editor.js` avec la conversion automatique des matériaux
