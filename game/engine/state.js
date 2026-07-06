/**
 * ============================================================
 * RESISTANCE — game/engine/state.js
 * Variables d'état partagées, réglages visuels per-objet,
 * cache de textures/matériaux, stubs éditeur (mode jeu)
 * ------------------------------------------------------------
 * Découpage mécanique de l'ancien scene-loader.js (07/2026).
 * Les modules game/engine/ se chargent DANS L'ORDRE :
 * state → db → build → audio → restore → bootstrap → player
 * ============================================================
 */

/*
 * ============================================
 * SCENE LOADER - Chargement de scène pour le jeu
 * ============================================
 * Remplace les scripts éditeur (~637 KB) pour les pages de jeu.
 * Contient uniquement les fonctions nécessaires à la reconstruction
 * de scène depuis IndexedDB/localStorage + l'audio de jeu.
 *
 * NE PAS charger ce fichier dans editor.html — l'éditeur utilise
 * les scripts complets (editor-*.js).
 */

// ==================== VARIABLES D'ÉTAT (sous-ensemble jeu) ====================

var interactionMode = (typeof interactionMode !== 'undefined') ? interactionMode : 'game';
var currentRoomName = (typeof currentRoomName !== 'undefined') ? currentRoomName : 'default';
var selectableObjects = (typeof selectableObjects !== 'undefined') ? selectableObjects : [];
var customLights = (typeof customLights !== 'undefined') ? customLights : [];
var hasUnsavedChanges = (typeof hasUnsavedChanges !== 'undefined') ? hasUnsavedChanges : false;

// Spawn
var spawnPosition = (typeof spawnPosition !== 'undefined') ? spawnPosition : null;
var spawnRotationY = (typeof spawnRotationY !== 'undefined') ? spawnRotationY : 0;
var spawnSaved = (typeof spawnSaved !== 'undefined') ? spawnSaved : false;
var PLAYER_EYE_HEIGHT = (typeof PLAYER_EYE_HEIGHT !== 'undefined') ? PLAYER_EYE_HEIGHT : 1.50;

// Zones d'interaction
var interactionZones = (typeof interactionZones !== 'undefined') ? interactionZones : [];
var interactionZoneIdCounter = (typeof interactionZoneIdCounter !== 'undefined') ? interactionZoneIdCounter : 0;
var hoveredZones = (typeof hoveredZones !== 'undefined') ? hoveredZones : new Set();
var proximityTriggeredZones = (typeof proximityTriggeredZones !== 'undefined') ? proximityTriggeredZones : new Set();
var activeGameInteraction = (typeof activeGameInteraction !== 'undefined') ? activeGameInteraction : null;
var heldZone = (typeof heldZone !== 'undefined') ? heldZone : null;
var holdStartTime = (typeof holdStartTime !== 'undefined') ? holdStartTime : 0;
var lastClickTime = (typeof lastClickTime !== 'undefined') ? lastClickTime : 0;
var lastClickZone = (typeof lastClickZone !== 'undefined') ? lastClickZone : null;

// Audio
var AUDIO_CATEGORIES = (typeof AUDIO_CATEGORIES !== 'undefined') ? AUDIO_CATEGORIES : ['musique', 'ambiance', 'bruitage', 'mouvement'];
var audioTracks = (typeof audioTracks !== 'undefined') ? audioTracks : { musique: [], ambiance: [], bruitage: [], mouvement: [] };
var audioTrackIdCounter = (typeof audioTrackIdCounter !== 'undefined') ? audioTrackIdCounter : 0;
var activeAudioElements = (typeof activeAudioElements !== 'undefined') ? activeAudioElements : [];
var activeMovementAudio = (typeof activeMovementAudio !== 'undefined') ? activeMovementAudio : {};
var loadingScreenDismissed = (typeof loadingScreenDismissed !== 'undefined') ? loadingScreenDismissed : false;
var lastHoveredAudioObject = (typeof lastHoveredAudioObject !== 'undefined') ? lastHoveredAudioObject : null;
var currentEditingAudioTrack = (typeof currentEditingAudioTrack !== 'undefined') ? currentEditingAudioTrack : null;
var MOVEMENT_ACTION_KEYS = (typeof MOVEMENT_ACTION_KEYS !== 'undefined') ? MOVEMENT_ACTION_KEYS : {
    'forward': ['z', 'w'], 'backward': ['s'], 'left': ['q', 'a'], 'right': ['d'],
    'jump': [' '], 'crouch': ['control'], 'run': ['shift'], 'grab': ['e'], 'door': ['f']
};

// ==================== RÉGLAGES VISUELS PER-OBJET ====================
// Applique luminosité, exposition, contraste, décalage, gamma à un objet 3D

function _applyVisualSettings(object) {
    var brightness = object.userData.customBrightness || 0;
    var exposure = object.userData.customExposure !== undefined ? object.userData.customExposure : 1.0;
    var contrast = object.userData.customContrast !== undefined ? object.userData.customContrast : 1.0;
    var colorOffset = object.userData.customOffset || 0;
    var gamma = object.userData.customGamma !== undefined ? object.userData.customGamma : 1.0;

    object.traverse(function(child) {
        if (!child.isMesh || !child.material) return;
        var mat = child.material;

        // Sauvegarder la couleur originale la première fois
        if (!mat.userData) mat.userData = {};
        if (!mat.userData._originalColor) {
            mat.userData._originalColor = mat.color ? mat.color.clone() : new THREE.Color(1, 1, 1);
        }

        // Luminosité via emissive
        if (brightness > 0) {
            if (!mat.emissive) mat.emissive = new THREE.Color(0xffffff);
            mat.emissive.setRGB(brightness, brightness, brightness);
            mat.emissiveIntensity = 1.0;
        }

        // Exposition, contraste, offset, gamma via modification directe de material.color
        var orig = mat.userData._originalColor;
        var r = orig.r, g = orig.g, b = orig.b;
        r *= exposure; g *= exposure; b *= exposure;
        r = (r - 0.5) * contrast + 0.5;
        g = (g - 0.5) * contrast + 0.5;
        b = (b - 0.5) * contrast + 0.5;
        r += colorOffset; g += colorOffset; b += colorOffset;
        r = Math.max(0, r); g = Math.max(0, g); b = Math.max(0, b);
        if (gamma !== 1.0) {
            var invGamma = 1.0 / gamma;
            r = Math.pow(r, invGamma);
            g = Math.pow(g, invGamma);
            b = Math.pow(b, invGamma);
        }
        mat.color.setRGB(r, g, b);

        // --- Transparence ---
        var opacity = object.userData.customOpacity;
        if (opacity !== undefined) {
            mat.transparent = opacity < 1.0;
            mat.opacity = opacity;
        }

        mat.needsUpdate = true;
    });
}

// ==================== CACHE DE TEXTURES/MATÉRIAUX PARTAGÉS ====================
// Évite de charger N copies de la même image en mémoire GPU
// Clé = textureBlobId, Valeur = THREE.Texture déjà chargée
var _textureCache = new Map();
var _textureCacheStats = { hits: 0, misses: 0 };

// Charge ou réutilise une texture depuis le cache
// fallbackUrl : URL de secours si le blob IDB est absent (ex. déploiement en ligne sans IDB)
async function _getCachedTexture(textureBlobId, fallbackUrl) {
    // Déjà en cache ?
    if (_textureCache.has(textureBlobId)) {
        _textureCacheStats.hits++;
        return _textureCache.get(textureBlobId);
    }
    _textureCacheStats.misses++;

    // Charger depuis IndexedDB
    const blobRecord = await RoomEditorDB.get(RoomEditorDB.STORE_BLOBS, textureBlobId);
    if (blobRecord && blobRecord.data) {
        const tex = await new Promise((resolve, reject) => {
            new THREE.TextureLoader().load(blobRecord.data, resolve, undefined, reject);
        });
        tex.colorSpace = THREE.SRGBColorSpace;
        _textureCache.set(textureBlobId, { texture: tex, dataURL: blobRecord.data });
        return { texture: tex, dataURL: blobRecord.data };
    }

    // Fallback URL si blob absent de l'IDB (déploiement GitHub Pages)
    if (fallbackUrl) {
        return await new Promise((resolve) => {
            new THREE.TextureLoader().load(
                fallbackUrl,
                tex => { tex.colorSpace = THREE.SRGBColorSpace; resolve({ texture: tex, dataURL: fallbackUrl }); },
                undefined,
                () => resolve(null)
            );
        });
    }

    return null;
}

// Crée un matériau qui partage la texture (clone pour repeat/wrap indépendants)
function _createSharedMaterial(cachedEntry, options = {}) {
    // Cloner la texture pour que chaque usage ait son propre repeat/wrap
    const tex = cachedEntry.texture.clone();
    tex.needsUpdate = true;
    tex.wrapS = options.wrapS !== undefined ? options.wrapS : THREE.RepeatWrapping;
    tex.wrapT = options.wrapT !== undefined ? options.wrapT : THREE.RepeatWrapping;
    if (options.repeatX !== undefined) tex.repeat.set(options.repeatX, options.repeatY || 1);

    return new THREE.MeshStandardMaterial({
        map: tex,
        side: options.side !== undefined ? options.side : THREE.DoubleSide,
        roughness: options.roughness !== undefined ? options.roughness : 0.5,
        metalness: options.metalness !== undefined ? options.metalness : 0,
        polygonOffset: options.polygonOffset || false,
        polygonOffsetFactor: options.polygonOffsetFactor || 0,
        polygonOffsetUnits: options.polygonOffsetUnits || 0,
    });
}

// Murs et plan de pièce
var floorPlanWalls = (typeof floorPlanWalls !== 'undefined') ? floorPlanWalls : [];
var wallHeight = (typeof wallHeight !== 'undefined') ? wallHeight : 2.5;
var wallThickness = (typeof wallThickness !== 'undefined') ? wallThickness : 0.2;
var gridSize = (typeof gridSize !== 'undefined') ? gridSize : 1;
var wallIdCounter = (typeof wallIdCounter !== 'undefined') ? wallIdCounter : 1;

// Pièces
var floorPlanRooms = (typeof floorPlanRooms !== 'undefined') ? floorPlanRooms : [];
var roomIdCounter = (typeof roomIdCounter !== 'undefined') ? roomIdCounter : 0;

// Lumières
var lightIdCounter = (typeof lightIdCounter !== 'undefined') ? lightIdCounter : 0;
var initialCameraSettings = (typeof initialCameraSettings !== 'undefined') ? initialCameraSettings : {
    position: new THREE.Vector3(), fov: 75
};

// Cinématique
var _cinematicPlaying = (typeof _cinematicPlaying !== 'undefined') ? _cinematicPlaying : false;
var _currentCinematicZone = (typeof _currentCinematicZone !== 'undefined') ? _currentCinematicZone : null;

// Objets importés
var importedObjectCounter = (typeof importedObjectCounter !== 'undefined') ? importedObjectCounter : 0;
var importedObjects = (typeof importedObjects !== 'undefined') ? importedObjects : [];
var importedCharacters = (typeof importedCharacters !== 'undefined') ? importedCharacters : [];


// ==================== STUBS — fonctions éditeur non nécessaires en mode jeu ====================

function markUnsavedChanges() { hasUnsavedChanges = true; }
function markAsSaved() { hasUnsavedChanges = false; }
function updateUnsavedIndicator() {}
function updateAllWallMiters() {} // Désactivé dans l'éditeur aussi (return immédiat)

var _updateObjectsListTimer = null;
function scheduleUpdateObjectsList() {
    if (_updateObjectsListTimer) clearTimeout(_updateObjectsListTimer);
    _updateObjectsListTimer = setTimeout(() => {
        if (typeof updateObjectsList === 'function') updateObjectsList();
        _updateObjectsListTimer = null;
    }, 300);
}
// Stub si non défini par la page
if (typeof updateObjectsList === 'undefined') {
    function updateObjectsList() {}
}
if (typeof updateImportedCharactersList === 'undefined') {
    var updateImportedCharactersList = function() {};
}
if (typeof updateAudioTracksList === 'undefined') {
    var updateAudioTracksList = function() {};
}


