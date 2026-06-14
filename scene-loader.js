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
async function _getCachedTexture(textureBlobId) {
    // Déjà en cache ?
    if (_textureCache.has(textureBlobId)) {
        _textureCacheStats.hits++;
        return _textureCache.get(textureBlobId);
    }
    _textureCacheStats.misses++;

    // Charger depuis IndexedDB
    const blobRecord = await RoomEditorDB.get(RoomEditorDB.STORE_BLOBS, textureBlobId);
    if (!blobRecord || !blobRecord.data) return null;

    const tex = await new Promise((resolve, reject) => {
        new THREE.TextureLoader().load(blobRecord.data, resolve, undefined, reject);
    });
    tex.colorSpace = THREE.SRGBColorSpace;

    // Stocker dans le cache (texture de base, les clones auront leur propre repeat/wrap)
    _textureCache.set(textureBlobId, { texture: tex, dataURL: blobRecord.data });
    return { texture: tex, dataURL: blobRecord.data };
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
        side: THREE.DoubleSide,
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


// ==================== INDEXEDDB PERSISTENCE ====================

const RoomEditorDB = {
    DB_NAME: 'RoomEditorDB',
    DB_VERSION: 1,
    _db: null,
    STORE_PROJECTS: 'projects',
    STORE_BLOBS: 'blobs',

    open() {
        return new Promise((resolve, reject) => {
            if (this._db) { resolve(this._db); return; }
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.STORE_PROJECTS)) {
                    db.createObjectStore(this.STORE_PROJECTS, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(this.STORE_BLOBS)) {
                    db.createObjectStore(this.STORE_BLOBS, { keyPath: 'id' });
                }
            };
            request.onsuccess = (event) => { this._db = event.target.result; resolve(this._db); };
            request.onerror = (event) => { reject(event.target.error); };
        });
    },

    async put(storeName, data) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async get(storeName, key) {
        const db = await this.open();
        const result = await new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        // Fallback: charger depuis scene_data/ si absent de IndexedDB
        if (!result && storeName === this.STORE_BLOBS && key) {
            try {
                console.log(`📥 Blob ${key} absent du cache, chargement depuis scene_data/...`);
                const response = await fetch(`scene_data/blobs/${key}.json`);
                if (response.ok) {
                    const blobData = await response.json();
                    try { await this.put(this.STORE_BLOBS, blobData); } catch (e) { /* ignore */ }
                    console.log(`✅ Blob ${key} chargé et mis en cache`);
                    return blobData;
                }
            } catch (e) {
                console.warn(`⚠️ Impossible de charger blob ${key} depuis scene_data/:`, e);
            }
        }
        return result;
    },

    async delete(storeName, key) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
};


// ==================== UTILITAIRES ====================

function simpleHash(str) {
    let hash = 0;
    const sample = str.substring(0, 200) + str.length;
    for (let i = 0; i < sample.length; i++) {
        const char = sample.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
}

// Liste exhaustive des slots de texture d'un MeshStandardMaterial / MeshPhysicalMaterial
// + autres matériaux courants. Les slots absents sur certains matériaux sont ignorés.
const _TEXTURE_SLOTS = [
    'map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap',
    'aoMap', 'displacementMap', 'bumpMap', 'alphaMap', 'envMap',
    'lightMap', 'specularMap', 'gradientMap', 'matcap',
    'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap',
    'sheenColorMap', 'sheenRoughnessMap', 'transmissionMap', 'thicknessMap'
];

// Dispose une texture en vérifiant qu'elle n'est pas encore en cache partagé.
// Les textures du _textureCache sont partagées et ne doivent PAS être disposées
// à chaque objet détruit — elles le seront via clearTextureCache() en fin de vie.
function _disposeTextureIfNotCached(tex) {
    if (!tex || !tex.dispose) return;
    for (const cached of _textureCache.values()) {
        if (cached.texture === tex) return; // encore partagée, on garde
    }
    tex.dispose();
}

function disposeMaterial(material) {
    if (!material) return;
    if (Array.isArray(material)) {
        material.forEach(m => disposeMaterial(m));
        return;
    }
    // Dispose toutes les textures attachées au matériau
    for (const slot of _TEXTURE_SLOTS) {
        if (material[slot]) {
            _disposeTextureIfNotCached(material[slot]);
            material[slot] = null;
        }
    }
    if (material.dispose) material.dispose();
}

// Nettoie en profondeur un Object3D (modèle GLB, groupe, mesh, ...).
// Détache du parent, dispose geometries + matériaux + textures pour chaque
// descendant. À appeler à la place de scene.remove(obj) quand on veut
// réellement libérer la mémoire GPU.
function disposeObject3D(root) {
    if (!root) return;
    root.traverse(child => {
        if (child.isMesh || child.isSkinnedMesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) disposeMaterial(child.material);
        } else if (child.isSprite) {
            if (child.material) disposeMaterial(child.material);
        }
    });
    if (root.parent) root.parent.remove(root);
}

// Vide le cache de textures partagées et libère leur mémoire GPU.
// À n'appeler qu'en toute fin de vie de la scène (beforeunload, changement
// de salle) — sinon on casse les matériaux encore en scène.
function clearTextureCache() {
    for (const entry of _textureCache.values()) {
        if (entry && entry.texture && entry.texture.dispose) entry.texture.dispose();
    }
    _textureCache.clear();
    _textureCacheStats.hits = 0;
    _textureCacheStats.misses = 0;
}

function measureCharacterByBones(model) {
    model.updateMatrixWorld(true);
    model.traverse(child => {
        if (child.isSkinnedMesh && child.skeleton) child.skeleton.update();
    });
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    let boneCount = 0;
    const worldPos = new THREE.Vector3();
    model.traverse(child => {
        if (child.isBone) {
            child.getWorldPosition(worldPos);
            if (worldPos.x < minX) minX = worldPos.x;
            if (worldPos.x > maxX) maxX = worldPos.x;
            if (worldPos.y < minY) minY = worldPos.y;
            if (worldPos.y > maxY) maxY = worldPos.y;
            if (worldPos.z < minZ) minZ = worldPos.z;
            if (worldPos.z > maxZ) maxZ = worldPos.z;
            boneCount++;
        }
    });
    if (boneCount >= 5 && maxY > minY) {
        const boneHeight = (maxY - minY) * 1.10;
        const boneWidth = Math.max((maxX - minX) * 1.15, boneHeight * 0.25);
        const boneDepth = Math.max((maxZ - minZ) * 1.15, boneHeight * 0.15);
        return { height: boneHeight, width: boneWidth, depth: boneDepth, method: 'bones', boneCount };
    }
    return null;
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (!loadingScreen) return;
    // Terminer la progression à 100 % (arrête le trickle, fixe la barre pleine)
    if (typeof window.completeLoading === 'function') {
        window.completeLoading();
    } else {
        const bar = document.getElementById('loading-bar');
        if (bar) { bar.style.animation = 'none'; bar.style.width = '100%'; }
    }
    setTimeout(() => {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            loadingScreenDismissed = true;
            if (interactionMode === 'game') startGameAudio();
        }, 600);
    }, 400);
}


// ==================== CONSTRUCTION DE MURS ====================

function addWallToObjectList(wall) {
    if (!wall || !wall.mesh) return;
    if (!selectableObjects.includes(wall.mesh)) selectableObjects.push(wall.mesh);
    scheduleUpdateObjectsList();
}

function createWallSegmentWithId(start, end, name, id) {
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    if (length < 0.1) return null;

    const extendedLength = length + wallThickness;
    const geometry = new THREE.BoxGeometry(extendedLength, wallHeight, wallThickness);
    const material = new THREE.MeshStandardMaterial({
        color: 0xcccccc, side: THREE.DoubleSide, roughness: 0.4, metalness: 0,
        polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set((start.x + end.x) / 2, wallHeight / 2, (start.z + end.z) / 2);
    mesh.rotation.y = -Math.atan2(dz, dx);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.type = 'floor-plan-wall';
    mesh.userData.isEnvironment = true;
    mesh.userData.editorName = name;
    mesh.userData.wallId = id;
    scene.add(mesh);

    const wall = { start: { x: start.x, z: start.z }, end: { x: end.x, z: end.z }, mesh, name, id };
    floorPlanWalls.push(wall);
    addWallToObjectList(wall);
    return wall;
}

function ensureMultiMaterial(wall) {
    if (!wall || !wall.mesh) return;
    if (!Array.isArray(wall.mesh.material)) {
        const baseMat = wall.mesh.material;
        const defaultMat = new THREE.MeshStandardMaterial({
            color: baseMat.color ? baseMat.color.clone() : new THREE.Color(0xcccccc),
            side: THREE.DoubleSide,
            roughness: baseMat.roughness !== undefined ? baseMat.roughness : 0.9,
            metalness: baseMat.metalness !== undefined ? baseMat.metalness : 0,
            polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1
        });
        wall.mesh.material = [
            defaultMat.clone(), defaultMat.clone(), defaultMat.clone(),
            defaultMat.clone(), defaultMat.clone(), defaultMat.clone()
        ];
    }
}

function getMergedFaceDimensions(mesh, materialIndex) {
    const geo = mesh.geometry;
    const posAttr = geo.getAttribute('position');
    const groups = geo.groups;
    const group = groups ? groups.find(g => g.materialIndex === materialIndex) : null;
    if (!group) return { width: 1, height: wallHeight };

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    for (let i = group.start; i < group.start + group.count; i++) {
        const vi = geo.index ? geo.index.getX(i) : i;
        const x = posAttr.getX(vi), y = posAttr.getY(vi), z = posAttr.getZ(vi);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    }
    const sizeX = maxX - minX, sizeY = maxY - minY, sizeZ = maxZ - minZ;
    if (sizeY < 0.01) return { width: Math.max(sizeX, sizeZ), height: Math.min(sizeX, sizeZ) || wallThickness };
    return { width: Math.max(sizeX, sizeZ) || wallThickness, height: sizeY || wallHeight };
}


// ==================== CONSTRUCTION DE PIÈCES ====================

function createRoomMesh(minX, maxX, minZ, maxZ) {
    const geometry = new THREE.PlaneGeometry(maxX - minX, maxZ - minZ);
    const material = new THREE.MeshBasicMaterial({
        color: 0x4488ff, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthTest: true
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set((minX + maxX) / 2, 0.05, (minZ + maxZ) / 2);
    mesh.userData.type = 'floor-plan-room';
    return mesh;
}

function createPolygonRoomMesh(polygon) {
    const shape = new THREE.Shape();
    shape.moveTo(polygon[0].x, -polygon[0].z);
    for (let i = 1; i < polygon.length; i++) shape.lineTo(polygon[i].x, -polygon[i].z);
    shape.lineTo(polygon[0].x, -polygon[0].z);
    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({
        color: 0x4488ff, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthTest: true
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.05;
    mesh.userData.type = 'floor-plan-room';
    return mesh;
}


// ==================== SPAWN & ZONES ====================

function applySpawnToCamera() {
    if (interactionMode === 'game') {
        if (spawnPosition && spawnSaved) {
            const eyeY = spawnPosition.y + PLAYER_EYE_HEIGHT;
            camera.position.set(spawnPosition.x, eyeY, spawnPosition.z);
            const lookDir = new THREE.Vector3(-Math.sin(spawnRotationY), 0, -Math.cos(spawnRotationY));
            if (typeof controls !== 'undefined' && controls && controls.target) {
                controls.target.set(
                    camera.position.x + lookDir.x * 0.01, eyeY,
                    camera.position.z + lookDir.z * 0.01
                );
            }
            camera.lookAt(
                camera.position.x + lookDir.x * 10, eyeY,
                camera.position.z + lookDir.z * 10
            );
            console.log(`🎯 Caméra positionnée au spawn`);
        }
        if (typeof setupFPSCamera === 'function') setupFPSCamera();
    }
}

function clearAllInteractionZones() {
    interactionZones.forEach(z => {
        if (z.meshGroup) {
            scene.remove(z.meshGroup);
            z.meshGroup.traverse(c => {
                if (c.geometry) c.geometry.dispose();
                if (c.material) { if (c.material.map) c.material.map.dispose(); c.material.dispose(); }
            });
        }
        if (z.labelSprite) {
            scene.remove(z.labelSprite);
            if (z.labelSprite.material.map) z.labelSprite.material.map.dispose();
            z.labelSprite.material.dispose();
        }
    });
    interactionZones.length = 0;
}

// Version allégée pour le mode jeu : pas de création de meshes visuels
function loadInteractionZonesFromData(zonesData) {
    zonesData.forEach(zd => {
        const zone = {
            id: zd.id, type: zd.type, bounds: zd.bounds,
            triggerType: zd.triggerType || 'click',
            actionType: zd.actionType, actionValue: zd.actionValue,
            locked: zd.locked || false, y: zd.y || 0,
            meshGroup: null, labelSprite: null,
            surfaceMode: zd.surfaceMode || 'floor',
            customName: zd.customName || null
        };
        if (zd.wallRef) zone.wallRef = zd.wallRef;
        if (zd.localBounds) zone.localBounds = zd.localBounds;
        if (zd.objectRef) zone.objectRef = zd.objectRef;
        if (zd.characterRef) zone.characterRef = zd.characterRef;
        if (zd.actionConfig) zone.actionConfig = zd.actionConfig;
        if (zd.videoEndAction) zone.videoEndAction = zd.videoEndAction;
        if (zd.videoEndUrl) zone.videoEndUrl = zd.videoEndUrl;
        if (zd.wallPlaneData) {
            zone.wallPlaneData = zd.wallPlaneData;
            if (zd.wallPlaneData.wallPosition && !(zd.wallPlaneData.wallPosition instanceof THREE.Vector3)) {
                zone.wallPlaneData.wallPosition = new THREE.Vector3(
                    zd.wallPlaneData.wallPosition.x,
                    zd.wallPlaneData.wallPosition.y,
                    zd.wallPlaneData.wallPosition.z
                );
            }
        }
        interactionZones.push(zone);
    });
}


// ==================== AUDIO DU JEU ====================

function createAudioElement(track) {
    if (!track.dataURL) return null;
    const audio = new Audio(track.dataURL);
    const masterVol = (typeof getMasterVolume === 'function') ? getMasterVolume(track.category) : 1.0;
    audio.volume = track.muted ? 0 : (track.volume / 100) * masterVol;
    audio.loop = track.loop;
    audio.muted = track.muted;
    audio._trackCategory = track.category;
    audio._trackVolume = track.volume;
    track.audioElement = audio;
    return audio;
}

function startGameAudio() {
    for (const cat of AUDIO_CATEGORIES) {
        for (const track of audioTracks[cat]) {
            if (track.triggerAction === 'load' && !track.muted && track.dataURL) {
                const audio = createAudioElement(track);
                if (audio) {
                    audio.play().catch(err => console.warn('Autoplay blocked for "' + track.name + '":', err));
                    activeAudioElements.push(audio);
                }
            }
        }
    }
    console.log('🎵 Audio de jeu démarré (' + activeAudioElements.length + ' pistes auto)');
}

let _savedAudioVolumes = [];
function _muteGameAudio() {
    _savedAudioVolumes = [];
    activeAudioElements.forEach(audio => {
        _savedAudioVolumes.push({ element: audio, volume: audio.volume });
        audio.volume = 0;
    });
    for (const cat of AUDIO_CATEGORIES) {
        for (const track of audioTracks[cat]) {
            if (track.audioElement && !track.audioElement.paused) {
                _savedAudioVolumes.push({ element: track.audioElement, volume: track.audioElement.volume });
                track.audioElement.volume = 0;
            }
        }
    }
    for (const key in activeMovementAudio) {
        if (activeMovementAudio[key]) {
            _savedAudioVolumes.push({ element: activeMovementAudio[key], volume: activeMovementAudio[key].volume });
            activeMovementAudio[key].volume = 0;
        }
    }
}

function _unmuteGameAudio() {
    _savedAudioVolumes.forEach(entry => { if (entry.element) entry.element.volume = entry.volume; });
    _savedAudioVolumes = [];
}

function stopAllGameAudio() {
    activeAudioElements.forEach(audio => { audio.pause(); audio.currentTime = 0; });
    activeAudioElements = [];
    for (const cat of AUDIO_CATEGORIES) {
        for (const track of audioTracks[cat]) {
            if (track.audioElement) { track.audioElement.pause(); track.audioElement.currentTime = 0; track.audioElement = null; }
        }
    }
    for (const key in activeMovementAudio) {
        if (activeMovementAudio[key]) { activeMovementAudio[key].pause(); activeMovementAudio[key].currentTime = 0; }
    }
    activeMovementAudio = {};
}

async function restoreAudioTracks(tracksData) {
    for (const cat of AUDIO_CATEGORIES) {
        audioTracks[cat].forEach(t => { if (t.audioElement) { t.audioElement.pause(); t.audioElement = null; } });
        audioTracks[cat] = [];
    }
    for (const td of tracksData) {
        const cat = td.category || 'musique';
        if (!audioTracks[cat]) continue;
        let dataURL = null;
        if (td.blobId) {
            try {
                const blobRecord = await RoomEditorDB.get(RoomEditorDB.STORE_BLOBS, td.blobId);
                if (blobRecord && blobRecord.data) dataURL = blobRecord.data;
            } catch (e) { console.warn('Audio blob not found:', td.blobId); }
        }
        audioTracks[cat].push({
            id: td.id, name: td.name, category: cat, blobId: td.blobId,
            dataURL: dataURL, volume: td.volume !== undefined ? td.volume : 80,
            muted: td.muted || false, loop: td.loop !== undefined ? td.loop : true,
            triggerAction: td.triggerAction || 'none', triggerObjectName: td.triggerObjectName || '',
            audioElement: null, movementAction: td.movementAction || '', movementPlayMode: td.movementPlayMode || ''
        });
    }
}

// --- Mouvement Audio ---
function checkMovementAudioKeyDown(key) {
    if (interactionMode !== 'game') return;
    const lowerKey = key.toLowerCase();
    const rhythmActions = ['forward', 'backward', 'left', 'right', 'run'];
    for (const track of audioTracks.mouvement) {
        if (!track.movementAction || track.muted || !track.dataURL) continue;
        if (rhythmActions.includes(track.movementAction)) continue;
        const keys = MOVEMENT_ACTION_KEYS[track.movementAction];
        if (!keys || !keys.includes(lowerKey)) continue;
        const trackKey = track.id + '_' + track.movementAction;
        if (track.movementPlayMode === 'while-held') {
            if (!activeMovementAudio[trackKey]) {
                const audio = createAudioElement(track);
                if (audio) { audio.loop = true; audio.play().catch(() => {}); activeMovementAudio[trackKey] = audio; }
            }
        } else if (track.movementPlayMode === 'once-per-action') {
            if (!activeMovementAudio[trackKey] || activeMovementAudio[trackKey].ended) {
                const audio = createAudioElement(track);
                if (audio) { audio.loop = false; audio.play().catch(() => {}); audio.onended = () => { delete activeMovementAudio[trackKey]; }; activeMovementAudio[trackKey] = audio; }
            }
        } else if (track.movementPlayMode === 'loop-during') {
            if (!activeMovementAudio[trackKey]) {
                const audio = createAudioElement(track);
                if (audio) { audio.loop = true; audio.play().catch(() => {}); activeMovementAudio[trackKey] = audio; }
            }
        }
    }
}

function checkMovementAudioKeyUp(key) {
    if (interactionMode !== 'game') return;
    const lowerKey = key.toLowerCase();
    const rhythmActions = ['forward', 'backward', 'left', 'right', 'run'];
    for (const track of audioTracks.mouvement) {
        if (!track.movementAction) continue;
        if (rhythmActions.includes(track.movementAction)) continue;
        const keys = MOVEMENT_ACTION_KEYS[track.movementAction];
        if (!keys || !keys.includes(lowerKey)) continue;
        const trackKey = track.id + '_' + track.movementAction;
        if (track.movementPlayMode === 'while-held' || track.movementPlayMode === 'loop-during') {
            if (activeMovementAudio[trackKey]) {
                activeMovementAudio[trackKey].pause();
                activeMovementAudio[trackKey].currentTime = 0;
                delete activeMovementAudio[trackKey];
            }
        }
    }
}

let movementMouseTimer = null;
function checkMovementAudioMouse() {
    if (interactionMode !== 'game') return;
    for (const track of audioTracks.mouvement) {
        if (track.movementAction !== 'camera' || track.muted || !track.dataURL) continue;
        const trackKey = track.id + '_camera';
        if (track.movementPlayMode === 'once-per-action') {
            if (!activeMovementAudio[trackKey] || activeMovementAudio[trackKey].ended) {
                const audio = createAudioElement(track);
                if (audio) { audio.loop = false; audio.play().catch(() => {}); audio.onended = () => { delete activeMovementAudio[trackKey]; }; activeMovementAudio[trackKey] = audio; }
            }
        } else {
            if (!activeMovementAudio[trackKey]) {
                const audio = createAudioElement(track);
                if (audio) { audio.loop = true; audio.play().catch(() => {}); activeMovementAudio[trackKey] = audio; }
            }
        }
    }
    clearTimeout(movementMouseTimer);
    movementMouseTimer = setTimeout(() => {
        for (const track of audioTracks.mouvement) {
            if (track.movementAction !== 'camera') continue;
            const trackKey = track.id + '_camera';
            if (track.movementPlayMode !== 'once-per-action' && activeMovementAudio[trackKey]) {
                activeMovementAudio[trackKey].pause();
                activeMovementAudio[trackKey].currentTime = 0;
                delete activeMovementAudio[trackKey];
            }
        }
    }, 150);
}

function initFootstepAudio() {
    if (typeof FOOTSTEP_WALK_SRC === 'undefined' || typeof FOOTSTEP_RUN_SRC === 'undefined') return;
    _footstepWalkAudio = new Audio(FOOTSTEP_WALK_SRC);
    _footstepWalkAudio.preload = 'auto';
    _footstepWalkAudio.loop = true;
    _footstepWalkAudio.volume = 0.8;
    _footstepWalkAudio.load();
    _footstepRunAudio = new Audio(FOOTSTEP_RUN_SRC);
    _footstepRunAudio.preload = 'auto';
    _footstepRunAudio.loop = true;
    _footstepRunAudio.volume = 0.8;
    _footstepRunAudio.load();
    console.log('👟 Audio de pas: chargement en cours...', FOOTSTEP_WALK_SRC, FOOTSTEP_RUN_SRC);
}

function updateFootstepAudio(delta) {
    if (interactionMode !== 'game') return;
    if (typeof isMoving === 'undefined' || typeof wasMoving === 'undefined') return;
    if (!isMoving && wasMoving) stopAllFootstepAudio();
    wasMoving = isMoving;
    if (!isMoving) return;
    const kbSprint  = typeof keysPressed !== 'undefined' && !!keysPressed['shift'];
    const gpSprint  = typeof GamepadManager !== 'undefined' && GamepadManager.connected && GamepadManager.getActionValue('run') > 0.5;
    const isSprinting = kbSprint || gpSprint;
    if (typeof _footstepWasSprinting !== 'undefined' && isSprinting !== _footstepWasSprinting) {
        _footstepWasSprinting = isSprinting;
        if (isSprinting) {
            if (_footstepWalkAudio) { _footstepWalkAudio.pause(); _footstepWalkAudio.currentTime = 0; }
            if (_footstepRunAudio && _footstepRunAudio.paused) { _footstepRunAudio.currentTime = 0; _footstepRunAudio.play().catch(() => {}); }
        } else {
            if (_footstepRunAudio) { _footstepRunAudio.pause(); _footstepRunAudio.currentTime = 0; }
            if (_footstepWalkAudio && _footstepWalkAudio.paused) { _footstepWalkAudio.currentTime = 0; _footstepWalkAudio.play().catch(() => {}); }
        }
        return;
    }
    const audio = isSprinting ? _footstepRunAudio : _footstepWalkAudio;
    if (audio && audio.paused) { audio.currentTime = 0; audio.play().catch(() => {}); }
}

function stopAllFootstepAudio() {
    if (typeof _footstepWalkAudio !== 'undefined' && _footstepWalkAudio) { _footstepWalkAudio.pause(); _footstepWalkAudio.currentTime = 0; }
    if (typeof _footstepRunAudio !== 'undefined' && _footstepRunAudio) { _footstepRunAudio.pause(); _footstepRunAudio.currentTime = 0; }
    for (const key in activeMovementAudio) {
        if (activeMovementAudio[key]) { activeMovementAudio[key].pause(); activeMovementAudio[key].currentTime = 0; }
    }
    activeMovementAudio = {};
    if (typeof _footstepWasSprinting !== 'undefined') _footstepWasSprinting = false;
}

function playTrackForTrigger(track) {
    if (!track.dataURL || track.muted) return;
    if (track.audioElement && !track.audioElement.paused) return;
    const audio = createAudioElement(track);
    if (audio) { audio.play().catch(() => {}); activeAudioElements.push(audio); }
}

function checkAudioClickTriggers(clickedObjectName) {
    if (interactionMode !== 'game') return;
    for (const cat of AUDIO_CATEGORIES) {
        for (const track of audioTracks[cat]) {
            if (track.triggerAction === 'click' && track.triggerObjectName === clickedObjectName) playTrackForTrigger(track);
        }
    }
}

function checkAudioHoverTriggers(hoveredObjectName) {
    if (interactionMode !== 'game') return;
    if (hoveredObjectName === lastHoveredAudioObject) return;
    lastHoveredAudioObject = hoveredObjectName;
    for (const cat of AUDIO_CATEGORIES) {
        for (const track of audioTracks[cat]) {
            if (track.triggerAction === 'hover' && track.triggerObjectName === hoveredObjectName) playTrackForTrigger(track);
        }
    }
}


// ==================== RESTAURATION DE TEXTURES ====================

async function restoreWallTextures(wall, textureInfoData) {
    for (const faceIdx in textureInfoData) {
        const info = textureInfoData[faceIdx];
        if (!info || !info.textureBlobId) continue;
        try {
            const cached = await _getCachedTexture(info.textureBlobId);
            if (!cached) continue;

            let faceWidth, faceHeight;
            if (wall.isMerged || !wall.start || !wall.end) {
                const faceDims = getMergedFaceDimensions(wall.mesh, parseInt(faceIdx));
                faceWidth = faceDims.width; faceHeight = faceDims.height;
            } else {
                const dx = wall.end.x - wall.start.x, dz = wall.end.z - wall.start.z;
                faceWidth = Math.sqrt(dx * dx + dz * dz);
                faceHeight = wallHeight;
                const fi = parseInt(faceIdx);
                if (fi === 0 || fi === 1) faceWidth = wallThickness;
                else if (fi === 2 || fi === 3) faceHeight = wallThickness;
            }

            let repeatX, repeatY, wrapT = THREE.RepeatWrapping;
            if (info.type === 'tile') {
                repeatX = faceWidth / info.tileSize;
                repeatY = faceHeight / info.tileSize;
            } else {
                wrapT = THREE.ClampToEdgeWrapping;
                const img = cached.texture.image;
                const aspectRatio = img ? (img.width / img.height) : 1;
                repeatX = faceWidth / (faceHeight * aspectRatio);
                repeatY = 1;
            }

            const existingMat = Array.isArray(wall.mesh.material) ? wall.mesh.material[parseInt(faceIdx)] : null;
            const pof = (existingMat && existingMat.polygonOffsetFactor) || 1;
            const texMat = _createSharedMaterial(cached, {
                wrapT, repeatX, repeatY,
                polygonOffset: true, polygonOffsetFactor: pof, polygonOffsetUnits: pof
            });
            ensureMultiMaterial(wall);
            if (existingMat) { if (existingMat.map) existingMat.map.dispose(); existingMat.dispose(); }
            wall.mesh.material[parseInt(faceIdx)] = texMat;

            if (!wall.textureInfo) wall.textureInfo = {};
            wall.textureInfo[faceIdx] = { type: info.type, tileSize: info.tileSize, imageDataURL: cached.dataURL, fileName: info.fileName };
        } catch (e) {
            console.warn(`⚠️ Échec restauration texture face ${faceIdx} de ${wall.name}:`, e);
        }
    }
}


// ==================== RESTAURATION DALLES & POLYGONES ====================

async function restoreFloorTile(tileData) {
    if (!tileData.textureBlobId) return;
    try {
        const cached = await _getCachedTexture(tileData.textureBlobId);
        if (!cached) return;
        const tileSize = tileData.tileSize || 1;
        const mat = _createSharedMaterial(cached, {
            repeatX: 1 / tileSize, repeatY: 1 / tileSize
        });
        const tile = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
        tile.rotation.x = -Math.PI / 2;
        tile.position.set(tileData.x, 0.02, tileData.z);
        tile.receiveShadow = true;
        tile.userData = { type: 'floor-tile', isEnvironment: true, textureDataURL: cached.dataURL, tileSize };
        scene.add(tile);
    } catch (e) { console.warn('⚠️ Échec restauration dalle de sol:', e); }
}

async function restoreCeilingTile(tileData) {
    if (!tileData.textureBlobId) return;
    try {
        const cached = await _getCachedTexture(tileData.textureBlobId);
        if (!cached) return;
        const tileSize = tileData.tileSize || 1;
        const mat = _createSharedMaterial(cached, {
            repeatX: 1 / tileSize, repeatY: 1 / tileSize
        });
        const tile = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
        tile.rotation.x = Math.PI / 2;
        tile.position.set(tileData.x, wallHeight - 0.02, tileData.z);
        tile.receiveShadow = true;
        tile.userData = { type: 'ceiling-tile', isEnvironment: true, textureDataURL: cached.dataURL, tileSize };
        scene.add(tile);
    } catch (e) { console.warn('⚠️ Échec restauration dalle de plafond:', e); }
}

async function restoreFloorPolygon(polyData) {
    if (!polyData.textureBlobId || !polyData.polygonPoints) return;
    try {
        const cached = await _getCachedTexture(polyData.textureBlobId);
        if (!cached) return;
        const polygon = polyData.polygonPoints;
        if (polygon.length < 3) return;
        const shape = new THREE.Shape();
        shape.moveTo(polygon[0].x, -polygon[0].z);
        for (let i = 1; i < polygon.length; i++) shape.lineTo(polygon[i].x, -polygon[i].z);
        shape.lineTo(polygon[0].x, -polygon[0].z);
        const geometry = new THREE.ShapeGeometry(shape);
        const posAttr = geometry.getAttribute('position');
        const uvAttr = geometry.getAttribute('uv');
        const tileSize = polyData.tileSize || 1;
        for (let i = 0; i < posAttr.count; i++) uvAttr.setXY(i, posAttr.getX(i) / tileSize, -posAttr.getY(i) / tileSize);
        uvAttr.needsUpdate = true;
        const mat = _createSharedMaterial(cached, {
            polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1
        });
        const mesh = new THREE.Mesh(geometry, mat);
        mesh.rotation.x = -Math.PI / 2; mesh.position.y = 0.05; mesh.receiveShadow = true;
        mesh.userData = { type: 'floor-polygon', isEnvironment: true, textureDataURL: cached.dataURL, tileSize, polygonPoints: polygon };
        scene.add(mesh);
    } catch (e) { console.warn('⚠️ Échec restauration polygone de sol:', e); }
}

async function restoreCeilingPolygon(polyData) {
    if (!polyData.textureBlobId || !polyData.polygonPoints) return;
    try {
        const cached = await _getCachedTexture(polyData.textureBlobId);
        if (!cached) return;
        const polygon = polyData.polygonPoints;
        if (polygon.length < 3) return;
        const shape = new THREE.Shape();
        shape.moveTo(polygon[0].x, polygon[0].z);
        for (let i = 1; i < polygon.length; i++) shape.lineTo(polygon[i].x, polygon[i].z);
        shape.lineTo(polygon[0].x, polygon[0].z);
        const geometry = new THREE.ShapeGeometry(shape);
        const posAttr = geometry.getAttribute('position');
        const uvAttr = geometry.getAttribute('uv');
        const tileSize = polyData.tileSize || 1;
        for (let i = 0; i < posAttr.count; i++) uvAttr.setXY(i, posAttr.getX(i) / tileSize, posAttr.getY(i) / tileSize);
        uvAttr.needsUpdate = true;
        const mat = _createSharedMaterial(cached, {});
        const mesh = new THREE.Mesh(geometry, mat);
        mesh.rotation.x = Math.PI / 2; mesh.position.y = wallHeight - 0.02; mesh.receiveShadow = true;
        mesh.userData = { type: 'ceiling-polygon', isEnvironment: true, textureDataURL: cached.dataURL, tileSize, polygonPoints: polygon };
        scene.add(mesh);
    } catch (e) { console.warn('⚠️ Échec restauration polygone de plafond:', e); }
}


// ==================== RESTAURATION OBJETS IMPORTÉS ====================

async function restoreImportedObject(objData) {
    // Les objets procéduraux (tapis) n'ont pas de blob GLB — ils sont recréés par la page
    if (!objData.fileDataBlobId) return;
    try {
        const blobRecord = await RoomEditorDB.get(RoomEditorDB.STORE_BLOBS, objData.fileDataBlobId);
        if (!blobRecord || !blobRecord.data) {
            // Blob introuvable → libérer les pending sets pour que loadPermanentObject() prenne le relais
            console.warn(`⚠️ Blob absent pour ${objData.editorName} — libération pending sets`);
            if (window._idbPendingObjects) window._idbPendingObjects.delete(objData.editorName);
            if (window._idbPendingFileNames && objData.fileName) window._idbPendingFileNames.delete(objData.fileName);
            return;
        }
        const base64Data = blobRecord.data.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
        const url = URL.createObjectURL(new Blob([new Uint8Array(byteNumbers)], { type: 'model/gltf-binary' }));
        loadObjectFromURL(url, { ...objData, fileData: blobRecord.data });
    } catch (e) {
        console.warn(`⚠️ Échec restauration objet ${objData.editorName}:`, e);
        // En cas d'erreur, aussi libérer les pending sets
        if (window._idbPendingObjects) window._idbPendingObjects.delete(objData.editorName);
        if (window._idbPendingFileNames && objData.fileName) window._idbPendingFileNames.delete(objData.fileName);
    }
}

function loadObjectFromURL(url, data) {
    const loader = (typeof sharedGLTFLoader !== 'undefined') ? sharedGLTFLoader : new THREE.GLTFLoader();
    loader.load(url, function(gltf) {
        importedObjectCounter++;
        const model = gltf.scene;
        if (data.position) model.position.set(data.position.x || 0, data.position.y || 0, data.position.z || 0);
        if (data.rotation) model.rotation.set(data.rotation.x || 0, data.rotation.y || 0, data.rotation.z || 0);
        if (data.scale) model.scale.set(data.scale.x || 1, data.scale.y || 1, data.scale.z || 1);

        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true; child.receiveShadow = true; child.frustumCulled = false;
                if (child.material) {
                    if (child.material.type === 'MeshBasicMaterial') {
                        child.material = new THREE.MeshStandardMaterial({
                            color: child.material.color, map: child.material.map, roughness: 0.7, metalness: 0.1
                        });
                    }
                    if (child.material.map) { child.material.map.encoding = THREE.sRGBEncoding; child.material.map.needsUpdate = true; }
                    if (child.material.metalness === 1) child.material.metalness = 0;
                    if (child.material.aoMap) child.material.aoMapIntensity = 0.3;
                    child.material.needsUpdate = true;
                }
            }
        });

        model.userData.editorName = data.editorName;
        model.userData.isImported = true;
        model.userData.fileName = data.fileName;
        if (data.fileData) model.userData.fileData = data.fileData;
        if (data.customRoughness !== undefined) model.userData.customRoughness = data.customRoughness;
        if (data.customBrightness !== undefined) model.userData.customBrightness = data.customBrightness;
        if (data.customExposure !== undefined) model.userData.customExposure = data.customExposure;
        if (data.customContrast !== undefined) model.userData.customContrast = data.customContrast;
        if (data.customOffset !== undefined) model.userData.customOffset = data.customOffset;
        if (data.customGamma !== undefined) model.userData.customGamma = data.customGamma;
        if (data.customOpacity !== undefined) model.userData.customOpacity = data.customOpacity;

        // Appliquer roughness personnalisé
        if (data.customRoughness !== undefined) {
            model.traverse(function(child) {
                if (child.isMesh && child.material && child.material.roughness !== undefined) {
                    child.material.roughness = data.customRoughness;
                    child.material.needsUpdate = true;
                }
            });
        }

        // Appliquer les réglages visuels (luminosité, exposition, contraste, offset, gamma)
        var _hasVisual = (data.customBrightness || data.customExposure || data.customContrast || data.customOffset || data.customGamma);
        if (_hasVisual) {
            console.log('🎨 Réglages visuels pour ' + data.editorName + ':', JSON.stringify({
                brightness: data.customBrightness, exposure: data.customExposure,
                contrast: data.customContrast, offset: data.customOffset, gamma: data.customGamma
            }));
        }
        _applyVisualSettings(model);

        if (data.isCharacter) {
            model.userData.isCharacter = true;
            model.updateMatrixWorld(true);
            const charBoneMeasure = measureCharacterByBones(model);
            if (charBoneMeasure) {
                const sy = Math.abs(model.scale.y) || 1;
                model.userData.referenceHeightAtScale1 = charBoneMeasure.height / sy;
                model.userData.referenceWidthAtScale1 = charBoneMeasure.width / sy;
                model.userData.referenceDepthAtScale1 = charBoneMeasure.depth / sy;
            } else {
                const box = new THREE.Box3().setFromObject(model);
                const size = box.getSize(new THREE.Vector3());
                const sy = Math.abs(model.scale.y) || 1;
                model.userData.referenceHeightAtScale1 = size.y / sy;
                model.userData.referenceWidthAtScale1 = size.x / sy;
                model.userData.referenceDepthAtScale1 = size.z / sy;
            }
            importedCharacters.push(model);
        }

        // Créer un AnimationMixer pour tout objet GLB ayant des animations,
        // qu'il soit marqué isCharacter ou non (ex : Raya importée comme objet standard).
        // L'objet est ajouté à importedCharacters pour que la boucle animate() l'update.
        if (gltf.animations && gltf.animations.length > 0) {
            const objMixer = new THREE.AnimationMixer(model);
            objMixer.clipAction(gltf.animations[0]).play();
            model.userData.mixer = objMixer;
            model.userData.animations = gltf.animations;
            console.log('🎬 Animation auto-démarrée pour ' + data.editorName + ' (' + gltf.animations[0].name + ', ' + gltf.animations[0].duration.toFixed(2) + 's)');
            if (!importedCharacters.includes(model)) {
                importedCharacters.push(model);
            }
        }

        scene.add(model);
        importedObjects.push(model);
        // Retirer des Sets en attente IndexedDB APRÈS l'ajout à importedObjects
        // (important : l'intervalle dans loadPermanentObject détecte la fin du chargement
        //  en cherchant l'objet dans importedObjects ET en vérifiant les pending sets)
        if (window._idbPendingObjects) window._idbPendingObjects.delete(data.editorName);
        if (window._idbPendingFileNames && data.fileName) window._idbPendingFileNames.delete(data.fileName);
        selectableObjects.push(model);
        model.traverse((child) => {
            if (child.isMesh) {
                child.userData.editorName = data.editorName;
                if (data.isCharacter) child.userData.isCharacter = true;
                selectableObjects.push(child);
            }
        });

        scheduleUpdateObjectsList();
        if (data.isCharacter) {
            if (typeof updateImportedCharactersList === 'function') updateImportedCharactersList();
            if (typeof createCharacterCollisionProxy === 'function') createCharacterCollisionProxy(model);
        }
        console.log(`✅ ${data.editorName} restauré${data.isCharacter ? ' (personnage)' : ''}`);
    }, undefined, function(error) {
        console.warn(`⚠️ Impossible de restaurer ${data.editorName}:`, error);
        // CRITIQUE: libérer les pending sets pour que loadPermanentObject() détecte l'échec
        // et déclenche le fallback depuis l'URL (sinon l'objet disparaît après le timeout)
        if (window._idbPendingObjects) window._idbPendingObjects.delete(data.editorName);
        if (window._idbPendingFileNames && data.fileName) window._idbPendingFileNames.delete(data.fileName);
    });
}


// ==================== RESTAURATION LUMIÈRES ====================

function restoreLightsFromData(lightsData) {
    lightsData.forEach(data => {
        let light;
        switch (data.type) {
            case 'point': light = new THREE.PointLight(data.color, data.intensity, 50); break;
            case 'directional':
                light = new THREE.DirectionalLight(data.color, data.intensity);
                if (data.target) { light.target.position.set(data.target.x, data.target.y, data.target.z); scene.add(light.target); }
                break;
            case 'spot':
                light = new THREE.SpotLight(data.color, data.intensity, 50, data.angle || Math.PI / 6, data.penumbra || 0);
                if (data.target) { light.target.position.set(data.target.x, data.target.y, data.target.z); scene.add(light.target); }
                break;
            default: light = new THREE.PointLight(data.color, data.intensity, 50);
        }
        light.position.set(data.position.x, data.position.y, data.position.z);
        light.castShadow = true;
        light.shadow.bias = -0.002;
        light.shadow.normalBias = 0.02;
        if (light.shadow.mapSize) { light.shadow.mapSize.width = 1024; light.shadow.mapSize.height = 1024; }
        light.userData.id = `custom-light-${lightIdCounter++}`;
        light.userData.type = data.type;
        light.userData.name = data.name || `Lumière ${lightIdCounter}`;
        light.userData.positionLocked = data.positionLocked || false;
        light.userData.isOn = data.isOn !== false;
        light.userData.savedIntensity = data.intensity;
        if (!light.userData.isOn) light.intensity = 0;
        scene.add(light);
        if (typeof createLightHelper === 'function') createLightHelper(light);
        customLights.push(light);
    });
    if (typeof updateLightsList === 'function') updateLightsList();
}

function loadCustomLightsFromStorage() {
    const savedData = localStorage.getItem(currentRoomName + '_customLights');
    if (!savedData) return;
    try {
        const lightsData = JSON.parse(savedData);
        restoreLightsFromData(lightsData);
    } catch (e) { console.error('Erreur chargement lumières:', e); }
}


// ==================== CHARGEMENT PRINCIPAL ====================

// Migration anciennes clés
(function migrateOldKeys() {
    if (localStorage.getItem('room1_importedObjects') && !localStorage.getItem('room_1_importedObjects')) {
        localStorage.setItem('room_1_importedObjects', localStorage.getItem('room1_importedObjects'));
        localStorage.removeItem('room1_importedObjects');
    }
    if (localStorage.getItem('room1_customLights') && !localStorage.getItem('room_1_customLights')) {
        localStorage.setItem('room_1_customLights', localStorage.getItem('room1_customLights'));
        localStorage.removeItem('room1_customLights');
    }
})();

// Migration narrative TFE (18/04/2026) : room_1 → sas_securite, room_2 → la_villa
// Renomme les clés localStorage pour que les donnees editeur existantes soient retrouvees
// par les nouveaux fichiers HTML nommes selon la narration.
(function migrateTFENarrativeKeysLS() {
    const renames = [
        ['room_1', 'sas_securite'],
        ['room_2', 'la_villa']
    ];
    const suffixes = ['_importedObjects', '_customLights'];
    for (const [oldName, newName] of renames) {
        for (const suffix of suffixes) {
            const oldKey = oldName + suffix;
            const newKey = newName + suffix;
            const oldVal = localStorage.getItem(oldKey);
            if (oldVal && !localStorage.getItem(newKey)) {
                localStorage.setItem(newKey, oldVal);
                localStorage.removeItem(oldKey);
            }
        }
        const oldFP = 'floorPlan_' + oldName;
        const newFP = 'floorPlan_' + newName;
        const oldFPVal = localStorage.getItem(oldFP);
        if (oldFPVal && !localStorage.getItem(newFP)) {
            localStorage.setItem(newFP, oldFPVal);
            localStorage.removeItem(oldFP);
        }
    }
})();

// Migration narrative TFE - IndexedDB (async, appelee en debut de loadProjectOnStartup)
async function migrateTFENarrativeKeysIDB() {
    if (typeof RoomEditorDB === 'undefined' || !RoomEditorDB) return;
    const renames = [
        ['project_room_1', 'project_sas_securite'],
        ['project_room_2', 'project_la_villa']
    ];
    for (const [oldId, newId] of renames) {
        try {
            const oldRec = await RoomEditorDB.get(RoomEditorDB.STORE_PROJECTS, oldId);
            if (!oldRec) continue;
            const newRec = await RoomEditorDB.get(RoomEditorDB.STORE_PROJECTS, newId);
            if (newRec) {
                // Nouvelle version deja presente : on supprime juste l'ancienne
                await RoomEditorDB.delete(RoomEditorDB.STORE_PROJECTS, oldId);
                continue;
            }
            oldRec.id = newId;
            await RoomEditorDB.put(RoomEditorDB.STORE_PROJECTS, oldRec);
            await RoomEditorDB.delete(RoomEditorDB.STORE_PROJECTS, oldId);
            console.log('[migration TFE] IndexedDB: ' + oldId + ' -> ' + newId);
        } catch (e) { /* silent — IDB indispo ou racing */ }
    }
}

async function bootstrapFromFiles() {
    // Toujours vérifier si project.json est plus récent que l'IDB
    // (efface le cache navigateur ne vide PAS IndexedDB — il faut comparer les timestamps)
    let fileManifest = null;
    const subtitle = document.querySelector('.loading-subtitle');
    try {
        if (subtitle) subtitle.textContent = 'Vérification des données de la scène...';
        // Fetch avec cache-busting pour contourner le cache HTTP
        const response = await fetch('scene_data/project.json?_=' + Date.now());
        if (response.ok) fileManifest = await response.json();
    } catch (e) { /* project.json inaccessible — on continue avec IDB */ }

    try {
        const existing = await RoomEditorDB.get(RoomEditorDB.STORE_PROJECTS, 'project_' + currentRoomName);
        if (existing && existing.version === 2) {
            const hasData = (existing.walls && existing.walls.length > 0) ||
                            (existing.importedObjects && existing.importedObjects.length > 0) ||
                            (existing.lights && existing.lights.length > 0) ||
                            (existing.floorTiles && existing.floorTiles.length > 0);

            // Si project.json est plus récent que l'IDB → forcer le rechargement
            const idbTimestamp = existing.timestamp || 0;
            const fileTimestamp = (fileManifest && fileManifest.project && fileManifest.project.timestamp) || 0;
            if (hasData && fileTimestamp > idbTimestamp) {
                console.log(`🔄 project.json plus récent (${new Date(fileTimestamp).toLocaleTimeString()}) que IDB (${new Date(idbTimestamp).toLocaleTimeString()}) — rechargement forcé`);
                // Ne pas faire return — on continue pour écraser l'IDB
            } else if (hasData) {
                console.log('✅ IndexedDB à jour — pas de rechargement');
                return;
            }
            try { await RoomEditorDB.delete(RoomEditorDB.STORE_PROJECTS, 'project_' + currentRoomName); } catch (e) {}
        }
    } catch (e) { /* IndexedDB non disponible */ }

    if (!fileManifest) {
        console.warn('⚠️ Bootstrap impossible : project.json introuvable');
        if (subtitle) subtitle.textContent = 'Chargement en cours...';
        return;
    }

    localStorage.removeItem('floorPlan_' + currentRoomName);
    localStorage.removeItem(currentRoomName + '_importedObjects');
    localStorage.removeItem(currentRoomName + '_customLights');

    console.log('🔄 Bootstrap depuis scene_data/...');
    try {
        if (subtitle) subtitle.textContent = 'Chargement des données de la scène...';
        if (fileManifest.localStorage) {
            for (const [key, value] of Object.entries(fileManifest.localStorage)) localStorage.setItem(key, value);
        }
        if (fileManifest.project) {
            await RoomEditorDB.put(RoomEditorDB.STORE_PROJECTS, fileManifest.project);
            console.log('📦 Projet restauré dans IndexedDB (timestamp: ' + new Date(fileManifest.project.timestamp || 0).toLocaleTimeString() + ')');
        }

        // ── Restaurer UNIQUEMENT les blobs de textures au démarrage ──────
        // Les blobs GLB (modèles 3D) et audio sont lourds (jusqu'à 55 Mo) et chargés
        // à la demande par les objets eux-mêmes. Les pré-charger tous au boot causerait
        // plusieurs centaines de Mo de téléchargement inutile en ligne.
        // Seules les textures (murs, sol, plafond) sont nécessaires immédiatement.
        const project = fileManifest.project || {};
        const _textureBlobSet = new Set();
        function _collectTexBlobId(obj) {
            if (!obj) return;
            if (obj.textureBlobId) _textureBlobSet.add(obj.textureBlobId);
            if (obj.textureInfo) Object.values(obj.textureInfo).forEach(function(ti) {
                if (ti && ti.textureBlobId) _textureBlobSet.add(ti.textureBlobId);
            });
        }
        (project.walls          || []).forEach(_collectTexBlobId);
        (project.floorTiles     || []).forEach(_collectTexBlobId);
        (project.ceilingTiles   || []).forEach(_collectTexBlobId);
        (project.floorPolygons  || []).forEach(_collectTexBlobId);
        (project.ceilingPolygons|| []).forEach(_collectTexBlobId);

        // Ajouter les blobs audio (quelques Mo max — nécessaires pour les sons de jeu)
        (project.audioTracks || []).forEach(function(a) {
            if (a && a.blobId) _textureBlobSet.add(a.blobId);
        });

        // Les blobs GLB des objets sont chargés à la demande par restoreImportedObject
        // (leurs fichiers JSON sont dans scene_data/blobs/ — fallback URL automatique)

        const textureBlobIds = [..._textureBlobSet];
        if (textureBlobIds.length > 0) {
            if (subtitle) subtitle.textContent = 'Restauration des textures et sons...';
            let blobsOk = 0, blobsFail = 0;
            await Promise.all(textureBlobIds.map(async function(blobId) {
                try {
                    const existing = await RoomEditorDB.get(RoomEditorDB.STORE_BLOBS, blobId);
                    if (existing) { blobsOk++; return; }
                    const resp = await fetch('scene_data/blobs/' + blobId + '.json?_=' + Date.now());
                    if (!resp.ok) { blobsFail++; return; }
                    const blobRecord = await resp.json();
                    await RoomEditorDB.put(RoomEditorDB.STORE_BLOBS, blobRecord);
                    blobsOk++;
                } catch (e) {
                    console.warn('⚠️ Blob ' + blobId + ' non restauré:', e);
                    blobsFail++;
                }
            }));
            console.log('🖼️ Textures + sons restaurés : ' + blobsOk + ' OK, ' + blobsFail + ' échec(s)');
        }

        // Les blobs GLB des objets importés (fileDataBlobId) sont chargés à la demande
        // via restoreImportedObject — pas besoin de les pré-charger ici.

        if (subtitle) subtitle.textContent = 'Construction de la scène...';
    } catch (e) {
        console.warn('⚠️ Bootstrap depuis fichiers échoué:', e);
        if (subtitle) subtitle.textContent = 'Chargement en cours...';
    }
}

async function loadProjectOnStartup() {
    console.log('🚀 loadProjectOnStartup() appelé');
    if (typeof scene === 'undefined' || !scene) { console.warn('⚠️ Scene non initialisée'); return; }

    // Migration narrative TFE : room_1/room_2 → sas_securite/la_villa dans IndexedDB
    await migrateTFENarrativeKeysIDB();

    let idbData = null;
    try {
        idbData = await RoomEditorDB.get(RoomEditorDB.STORE_PROJECTS, 'project_' + currentRoomName);
    } catch (e) { console.warn('⚠️ IndexedDB non disponible:', e); }

    const savedPlanRaw = localStorage.getItem('floorPlan_' + currentRoomName);
    let lsTimestamp = 0;
    if (savedPlanRaw) {
        try { lsTimestamp = JSON.parse(savedPlanRaw).timestamp || 0; } catch (e) { /* ignore */ }
    }
    const idbTimestamp = (idbData && idbData.timestamp) || 0;

    if (idbData && idbData.version === 2) {
        // IDB version 2 = source de vérité (contient floorTiles, ceilingPolygons, etc.)
        // On n'utilise JAMAIS le localStorage s'il existe en IDB : le format localStorage
        // ne stocke pas les floorTiles et provoquerait la disparition des textures de sol.
        console.log(`📂 Chargement depuis IndexedDB (timestamp: ${new Date(idbTimestamp).toLocaleTimeString()})`);
        await loadProjectFromIndexedDB(idbData);
        return;
    }

    console.log('📂 Fallback localStorage');
    await loadProjectFromLocalStorage();
}

async function loadProjectFromLocalStorage() {
    const savedPlan = localStorage.getItem('floorPlan_' + currentRoomName);
    if (savedPlan) {
        try {
            const planData = JSON.parse(savedPlan);
            wallHeight = planData.wallHeight || 2.5;
            wallThickness = planData.wallThickness || 0.2;
            gridSize = planData.gridSize || 1;
            if (planData.wallIdCounter) wallIdCounter = planData.wallIdCounter;

            if (planData.walls && planData.walls.length > 0) {
                let loadedCount = 0;
                planData.walls.forEach((w, index) => {
                    if (w.isMerged && w.geometryJSON) {
                        try {
                            const loader = new THREE.BufferGeometryLoader();
                            const geo = loader.parse(w.geometryJSON);
                            let maxMatIdx = 0;
                            if (geo.groups) geo.groups.forEach(g => { maxMatIdx = Math.max(maxMatIdx, g.materialIndex); });
                            const materials = [];
                            for (let i = 0; i <= maxMatIdx; i++) {
                                const sourceWallIdx = Math.floor(i / 6);
                                const pof = 1 + sourceWallIdx * 0.3;
                                materials.push(new THREE.MeshStandardMaterial({
                                    color: 0xcccccc, side: THREE.DoubleSide, roughness: 0.4, metalness: 0,
                                    polygonOffset: true, polygonOffsetFactor: pof, polygonOffsetUnits: pof
                                }));
                            }
                            const mesh = new THREE.Mesh(geo, materials);
                            mesh.castShadow = true; mesh.receiveShadow = true;
                            mesh.userData = { type: 'merged-wall', editorName: w.name, isMerged: true, isEnvironment: true, wallId: w.id, sourceWallCount: w.sourceWallCount || 0 };
                            scene.add(mesh);
                            selectableObjects.push(mesh);
                            const mergedWallObj = { start: null, end: null, mesh, name: w.name, id: w.id, isMerged: true };
                            if (w.roomPolygon && w.roomPolygon.length >= 3) {
                                mergedWallObj.roomPolygon = w.roomPolygon;
                                mesh.userData.roomPolygon = w.roomPolygon;
                            }
                            floorPlanWalls.push(mergedWallObj);
                            loadedCount++;
                        } catch (e) { console.warn(`⚠️ Erreur mur fusionné "${w.name}":`, e); }
                        return;
                    }
                    if (w.start && w.end) {
                        createWallSegmentWithId(w.start, w.end, w.name || `Mur_${index + 1}`, w.id || (index + 1));
                        loadedCount++;
                    }
                });
                if (!planData.wallIdCounter && loadedCount > 0) wallIdCounter = loadedCount + 1;
                updateAllWallMiters();
            }

            if (planData.roomIdCounter) roomIdCounter = planData.roomIdCounter;
            if (planData.rooms && planData.rooms.length > 0) {
                for (const roomData of planData.rooms) {
                    const roomId = roomData.id || roomIdCounter++;
                    const roomWalls = [];
                    if (roomData.wallIds) roomData.wallIds.forEach(wid => {
                        const w = floorPlanWalls.find(fw => fw.id === wid);
                        if (w) { w.isRoomWall = true; roomWalls.push(w); }
                    });
                    let roomMesh, polygon;
                    if (roomData.polygon && roomData.polygon.length >= 3) {
                        polygon = roomData.polygon;
                        roomMesh = createPolygonRoomMesh(polygon);
                    } else if (roomData.bounds) {
                        const b = roomData.bounds;
                        polygon = [{ x: b.minX, z: b.minZ }, { x: b.maxX, z: b.minZ }, { x: b.maxX, z: b.maxZ }, { x: b.minX, z: b.maxZ }];
                        roomMesh = createRoomMesh(b.minX, b.maxX, b.minZ, b.maxZ);
                    } else continue;
                    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
                    polygon.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); });
                    floorPlanRooms.push({ id: roomId, walls: roomWalls, mesh: roomMesh, bounds: { minX, maxX, minZ, maxZ }, polygon, rounding: roomData.rounding || 0, selected: false });
                    scene.add(roomMesh);
                }
            }

            // Naby transform
            if (planData.nabyTransform) {
                if (typeof savedNabyTransform !== 'undefined') savedNabyTransform = planData.nabyTransform;
                else window.savedNabyTransform = planData.nabyTransform;
                if (typeof babyModel !== 'undefined' && babyModel) {
                    babyModel.position.set(planData.nabyTransform.position.x, planData.nabyTransform.position.y, planData.nabyTransform.position.z);
                    babyModel.rotation.set(planData.nabyTransform.rotation.x || 0, planData.nabyTransform.rotation.y || 0, planData.nabyTransform.rotation.z || 0);
                    babyModel.scale.set(planData.nabyTransform.scale.x, planData.nabyTransform.scale.y, planData.nabyTransform.scale.z);
                    babyModel.updateMatrixWorld(true);
                }
            }

            // Spawn
            if (planData.spawn) {
                spawnPosition = { x: planData.spawn.position.x, y: planData.spawn.position.y, z: planData.spawn.position.z };
                spawnRotationY = planData.spawn.rotationY || 0;
                spawnSaved = true;
            }

            // Lumière ambiante
            if (planData.ambientLightIntensity !== undefined && window.defaultAmbientLight) {
                window.defaultAmbientLight.intensity = planData.ambientLightIntensity;
                window.defaultAmbientLight.userData.savedIntensity = planData.ambientLightIntensity;
            }

            // Zones d'interaction
            if (planData.interactionZones && planData.interactionZones.length > 0) {
                loadInteractionZonesFromData(planData.interactionZones);
                interactionZoneIdCounter = planData.interactionZoneIdCounter || interactionZones.length;
            }

            // Audio
            if (planData.audioTracks && planData.audioTracks.length > 0) {
                await restoreAudioTracks(planData.audioTracks);
                audioTrackIdCounter = planData.audioTrackIdCounter || audioTrackIdCounter;
            }
        } catch (e) { console.error('Erreur chargement projet:', e); }
    }

    loadCustomLightsFromStorage();

    // Charger les overrides de position/matériaux des objets importés depuis localStorage
    // (écrits par saveImportedObjectsToStorage() à chaque modification dans l'éditeur)
    // Ils seront appliqués par loadPermanentObjects() via window._permanentObjectOverrides
    window._permanentObjectOverrides = {};
    try {
        const objOverridesRaw = localStorage.getItem(currentRoomName + '_importedObjects');
        if (objOverridesRaw) {
            const objOverrides = JSON.parse(objOverridesRaw);
            objOverrides.forEach(function(obj) {
                if (obj.editorName) window._permanentObjectOverrides[obj.editorName] = obj;
            });
            console.log('📦 Overrides objets chargés depuis localStorage :', Object.keys(window._permanentObjectOverrides).length, 'objets');
        }
    } catch (e) {
        console.warn('⚠️ Erreur lecture _importedObjects localStorage :', e);
    }

    if (typeof loadPermanentObjects === 'function') loadPermanentObjects();

    // Invalider le cache de collision pour inclure les murs/objets fraîchement chargés
    if (typeof invalidateCollisionCache === 'function') invalidateCollisionCache();
    freezeStaticObjects();
}

async function loadProjectFromIndexedDB(projectData) {
    console.log('📂 Chargement depuis IndexedDB...');

    // Nettoyer la scène existante
    for (const wall of [...floorPlanWalls]) {
        if (wall.mesh) { scene.remove(wall.mesh); if (wall.mesh.geometry) wall.mesh.geometry.dispose(); disposeMaterial(wall.mesh.material); }
    }
    floorPlanWalls.length = 0;
    for (const obj of [...importedObjects]) {
        const idx = selectableObjects.indexOf(obj);
        if (idx > -1) selectableObjects.splice(idx, 1);
        disposeObject3D(obj); // retire de la scène + dispose geo/mat/textures de tout le sous-arbre
    }
    importedObjects.length = 0;
    for (const room of [...floorPlanRooms]) {
        if (room.mesh) { scene.remove(room.mesh); if (room.mesh.geometry) room.mesh.geometry.dispose(); if (room.mesh.material) room.mesh.material.dispose(); }
    }
    floorPlanRooms.length = 0;
    scene.children.filter(c => c.userData.type === 'floor-tile' || c.userData.type === 'ceiling-tile' || c.userData.type === 'floor-polygon' || c.userData.type === 'ceiling-polygon')
        .forEach(tile => { scene.remove(tile); if (tile.geometry) tile.geometry.dispose(); if (tile.material) { if (tile.material.map) tile.material.map.dispose(); tile.material.dispose(); } });

    // Paramètres globaux
    wallHeight = projectData.wallHeight || 2.5;
    wallThickness = projectData.wallThickness || 0.2;
    gridSize = projectData.gridSize || 1;
    if (projectData.wallIdCounter) wallIdCounter = projectData.wallIdCounter;

    // Murs
    if (projectData.walls && projectData.walls.length > 0) {
        let loadedCount = 0;
        for (const w of projectData.walls) {
            if (w.isMerged && w.geometryJSON) {
                try {
                    const loader = new THREE.BufferGeometryLoader();
                    const geo = loader.parse(w.geometryJSON);
                    let maxMatIdx = 0;
                    if (geo.groups) geo.groups.forEach(g => { maxMatIdx = Math.max(maxMatIdx, g.materialIndex); });
                    const materials = [];
                    for (let i = 0; i <= maxMatIdx; i++) {
                        const pof = 1 + Math.floor(i / 6) * 0.3;
                        materials.push(new THREE.MeshStandardMaterial({
                            color: 0xcccccc, side: THREE.DoubleSide, roughness: 0.4, metalness: 0,
                            polygonOffset: true, polygonOffsetFactor: pof, polygonOffsetUnits: pof
                        }));
                    }
                    const mesh = new THREE.Mesh(geo, materials);
                    mesh.castShadow = true; mesh.receiveShadow = true;
                    mesh.userData = { type: 'merged-wall', editorName: w.name, isMerged: true, isEnvironment: true, wallId: w.id, sourceWallCount: w.sourceWallCount || 0 };
                    scene.add(mesh); selectableObjects.push(mesh);
                    const mergedWallObj = { start: null, end: null, mesh, name: w.name, id: w.id, isMerged: true };
                    if (w.roomPolygon && w.roomPolygon.length >= 3) { mergedWallObj.roomPolygon = w.roomPolygon; mesh.userData.roomPolygon = w.roomPolygon; }
                    floorPlanWalls.push(mergedWallObj);
                    loadedCount++;
                    if (w.textureInfo) await restoreWallTextures(floorPlanWalls[floorPlanWalls.length - 1], w.textureInfo);
                } catch (e) { console.warn(`⚠️ Erreur mur fusionné "${w.name}":`, e); }
                continue;
            }
            if (w.start && w.end) {
                const wall = createWallSegmentWithId(w.start, w.end, w.name || `Mur_${loadedCount + 1}`, w.id || (loadedCount + 1));
                loadedCount++;
                if (wall && w.textureInfo) await restoreWallTextures(wall, w.textureInfo);
            }
        }
        if (!projectData.wallIdCounter && loadedCount > 0) wallIdCounter = loadedCount + 1;
        updateAllWallMiters();
    }

    // Pièces
    if (projectData.roomIdCounter) roomIdCounter = projectData.roomIdCounter;
    if (projectData.rooms && projectData.rooms.length > 0) {
        for (const roomData of projectData.rooms) {
            const roomId = roomData.id || roomIdCounter++;
            const roomWalls = [];
            if (roomData.wallIds) roomData.wallIds.forEach(wid => {
                const w = floorPlanWalls.find(fw => fw.id === wid);
                if (w) { w.isRoomWall = true; roomWalls.push(w); }
            });
            let roomMesh, polygon;
            if (roomData.polygon && roomData.polygon.length >= 3) { polygon = roomData.polygon; roomMesh = createPolygonRoomMesh(polygon); }
            else if (roomData.bounds) {
                const b = roomData.bounds;
                polygon = [{ x: b.minX, z: b.minZ }, { x: b.maxX, z: b.minZ }, { x: b.maxX, z: b.maxZ }, { x: b.minX, z: b.maxZ }];
                roomMesh = createRoomMesh(b.minX, b.maxX, b.minZ, b.maxZ);
            } else continue;
            let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
            polygon.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); });
            floorPlanRooms.push({ id: roomId, walls: roomWalls, mesh: roomMesh, bounds: { minX, maxX, minZ, maxZ }, polygon, rounding: roomData.rounding || 0, selected: false });
            scene.add(roomMesh);
        }
    }

    // Dalles et polygones
    if (projectData.floorTiles) for (const t of projectData.floorTiles) await restoreFloorTile(t);
    if (projectData.ceilingTiles) for (const t of projectData.ceilingTiles) await restoreCeilingTile(t);
    if (projectData.floorPolygons) for (const p of projectData.floorPolygons) await restoreFloorPolygon(p);
    if (projectData.ceilingPolygons) for (const p of projectData.ceilingPolygons) await restoreCeilingPolygon(p);

    // Objets importés — marquer les editorNames ET fileNames en cours de chargement
    // pour que loadPermanentObjects() / loadSasSecuriteObjects() ne double-charge pas
    window._idbPendingObjects = new Set();   // par editorName
    window._idbPendingFileNames = new Set(); // par fileName
    if (projectData.importedObjects) {
        projectData.importedObjects.forEach(function(obj) {
            if (obj.editorName) window._idbPendingObjects.add(obj.editorName);
            if (obj.fileName) window._idbPendingFileNames.add(obj.fileName);
        });
    }
    // Charger tous les blobs GLB en parallèle (bien plus rapide que séquentiel)
    // restoreImportedObject attend le fetch blob mais PAS la fin du chargement GLB
    if (projectData.importedObjects) await Promise.all(projectData.importedObjects.map(obj => restoreImportedObject(obj)));

    // Lumières
    if (projectData.lights && projectData.lights.length > 0) {
        const toRemove = customLights.filter(l => !l.userData.isDefault);
        toRemove.forEach(l => { scene.remove(l); const idx = customLights.indexOf(l); if (idx > -1) customLights.splice(idx, 1); });
        restoreLightsFromData(projectData.lights);
    }

    // Lumière ambiante
    if (projectData.ambientLightIntensity !== undefined && window.defaultAmbientLight) {
        window.defaultAmbientLight.intensity = projectData.ambientLightIntensity;
        window.defaultAmbientLight.userData.savedIntensity = projectData.ambientLightIntensity;
    }

    // Naby transform
    if (projectData.nabyTransform) {
        if (typeof savedNabyTransform !== 'undefined') savedNabyTransform = projectData.nabyTransform;
        else window.savedNabyTransform = projectData.nabyTransform;
        if (typeof babyModel !== 'undefined' && babyModel) {
            babyModel.position.set(projectData.nabyTransform.position.x, projectData.nabyTransform.position.y, projectData.nabyTransform.position.z);
            babyModel.rotation.set(projectData.nabyTransform.rotation.x || 0, projectData.nabyTransform.rotation.y || 0, projectData.nabyTransform.rotation.z || 0);
            if (typeof nabyRawHeight !== 'undefined' && nabyRawHeight) {
                const restoredHeight = projectData.nabyTransform.scale.y * nabyRawHeight;
                if (restoredHeight >= 0.1 && restoredHeight <= 5.0) {
                    babyModel.scale.set(projectData.nabyTransform.scale.x, projectData.nabyTransform.scale.y, projectData.nabyTransform.scale.z);
                } else {
                    const safeScale = 1.70 / nabyRawHeight;
                    babyModel.scale.set(safeScale, safeScale, safeScale);
                }
            } else {
                babyModel.scale.set(projectData.nabyTransform.scale.x, projectData.nabyTransform.scale.y, projectData.nabyTransform.scale.z);
            }
            babyModel.updateMatrixWorld(true);
        }
    }

    // Spawn
    if (projectData.spawn) {
        spawnPosition = { x: projectData.spawn.position.x, y: projectData.spawn.position.y, z: projectData.spawn.position.z };
        spawnRotationY = projectData.spawn.rotationY || 0;
        spawnSaved = true;
    }

    // Zones d'interaction
    if (projectData.interactionZones && projectData.interactionZones.length > 0) {
        clearAllInteractionZones();
        loadInteractionZonesFromData(projectData.interactionZones);
        interactionZoneIdCounter = projectData.interactionZoneIdCounter || interactionZones.length;
    }

    // Audio
    if (projectData.audioTracks && projectData.audioTracks.length > 0) {
        await restoreAudioTracks(projectData.audioTracks);
        audioTrackIdCounter = projectData.audioTrackIdCounter || audioTrackIdCounter;
    }

    console.log('📂 Projet chargé depuis IndexedDB !');
    console.log(`🎨 Cache textures: ${_textureCacheStats.misses} images chargées, ${_textureCacheStats.hits} réutilisées (${_textureCache.size} uniques)`);

    // Charger les overrides position/matériaux depuis localStorage
    // (nécessaire pour le fallback URL dans loadPermanentObject quand un blob est manquant)
    if (!window._permanentObjectOverrides) {
        window._permanentObjectOverrides = {};
        try {
            const objOverridesRaw = localStorage.getItem(currentRoomName + '_importedObjects');
            if (objOverridesRaw) {
                const objOverrides = JSON.parse(objOverridesRaw);
                objOverrides.forEach(function(obj) {
                    if (obj.editorName) window._permanentObjectOverrides[obj.editorName] = obj;
                });
                console.log('📦 Overrides objets (chemin IDB) :', Object.keys(window._permanentObjectOverrides).length, 'objets');
            }
        } catch (e) { console.warn('⚠️ Erreur lecture _importedObjects localStorage (IDB path):', e); }
    }

    // Charger les objets permanents codés en dur (borne arcade, etc.) — manquait dans ce chemin IDB
    if (typeof loadPermanentObjects === 'function') loadPermanentObjects();

    // Invalider le cache de collision pour inclure les murs/objets fraîchement chargés
    if (typeof invalidateCollisionCache === 'function') invalidateCollisionCache();
    // Figer les matrices des objets statiques (gros gain perf: skip updateMatrixWorld par frame)
    freezeStaticObjects();
}

// Désactive matrixAutoUpdate pour les objets statiques (murs, sol, mobilier)
// Les personnages animés (isCharacter) gardent matrixAutoUpdate = true
function freezeStaticObjects() {
    if (typeof scene === 'undefined' || !scene) return;
    scene.traverse(child => {
        if (!child.isMesh && !child.isGroup) return;
        // Ne pas figer les personnages animés
        if (child.userData.isCharacter) return;
        if (child.userData.isCollisionProxy) return;
        // Ne pas figer les gizmos/helpers interactifs
        if (child.userData.isGizmo) return;
        // Vérifier les parents (enfants de personnages)
        let p = child.parent;
        while (p) {
            if (p.userData.isCharacter) return;
            p = p.parent;
        }
        child.matrixAutoUpdate = false;
        child.updateMatrix();
    });
}

// ==================== GAME INTERACTION SYSTEM ====================
// Fonctions de gameplay extraites de editor-floorplan.js pour le mode jeu allégé

function findObjectByRef(objectRef) {
    if (!objectRef) return null;
    // 1) Match exact UUID
    for (const obj of importedObjects) {
        if (obj.uuid === objectRef.objectUUID) return obj;
    }
    if (objectRef.editorName) {
        const searchName = objectRef.editorName.toLowerCase().trim();
        // 2) Exact editorName (case-insensitive)
        for (const obj of importedObjects) {
            const n = (obj.userData.editorName || obj.name || '').toLowerCase().trim();
            if (n === searchName) return obj;
        }
        // 3) Partial match fallback (editorName contient le nom cherché)
        for (const obj of importedObjects) {
            const n = (obj.userData.editorName || obj.name || '').toLowerCase().trim();
            if (n.includes(searchName) || searchName.includes(n)) return obj;
        }
    }
    return null;
}

function findCharacterByRef(characterRef) {
    if (!characterRef) return null;
    const allChars = [...importedCharacters];
    if (typeof babyModel !== 'undefined' && babyModel && !allChars.includes(babyModel)) allChars.push(babyModel);
    for (const char of allChars) {
        if (char.uuid === characterRef.characterUUID) return char;
    }
    if (characterRef.editorName) {
        for (const char of allChars) {
            if ((char.userData.editorName || char.name) === characterRef.editorName) return char;
        }
    }
    return null;
}

// Vecteurs pré-alloués pour getZoneDistance (zéro allocation par frame)
const _zdVec3 = new THREE.Vector3();

function getZoneDistance(zone, cameraPos) {
    const sm = zone.surfaceMode || 'floor';
    const cx = (zone.bounds.minX + zone.bounds.maxX) / 2;
    const cz = (zone.bounds.minZ + zone.bounds.maxZ) / 2;
    if (sm === 'wall' || sm === 'object' || sm === 'character') {
        _zdVec3.set(cx, zone.y, cz);
        return cameraPos.distanceTo(_zdVec3);
    }
    // Distance 2D XZ — calcul direct sans allocation
    const dx = cameraPos.x - cx;
    const dz = cameraPos.z - cz;
    return Math.sqrt(dx * dx + dz * dz);
}

// --- Hotspot turquoise pulsatile ---
const highlightedInteractionObjects = new Map();

function _createInteractionHotspot(position, radius) {
    const geo = new THREE.SphereGeometry(radius, 16, 12);
    const mat = new THREE.MeshBasicMaterial({
        color: 0x00CED1, transparent: true, opacity: 0.35,
        depthTest: false, depthWrite: false
    });
    const hotspot = new THREE.Mesh(geo, mat);
    hotspot.renderOrder = 999;
    hotspot.position.copy(position);
    hotspot.userData.isGizmo = true;
    hotspot.userData.isInteractionHotspot = true;
    hotspot.userData._baseScale = 1.0;
    hotspot.userData._pulsePhase = Math.random() * Math.PI * 2;
    return hotspot;
}

// Cache bone thorax par UUID (évite traverse() à chaque frame)
const _chestBoneCache = new Map();
const _chestWorldPos = new THREE.Vector3(); // Pré-alloué
const _chestFallbackBox = new THREE.Box3(); // Pré-alloué

function _getCharacterChestPosition(char) {
    // Chercher dans le cache
    let chestBone = _chestBoneCache.get(char.uuid);
    if (chestBone === undefined) {
        // Première fois : traverse + cache le résultat
        chestBone = null;
        char.traverse(child => {
            if (child.isBone && !chestBone) {
                const n = child.name.toLowerCase();
                if (n.includes('spine1') || n.includes('spine2') || n.includes('chest') || n.includes('spine_01') || n.includes('spine_02')) {
                    chestBone = child;
                }
            }
        });
        _chestBoneCache.set(char.uuid, chestBone || null);
    }
    if (chestBone) {
        chestBone.getWorldPosition(_chestWorldPos);
        return _chestWorldPos;
    }
    // Fallback : 60% de la hauteur
    _chestFallbackBox.setFromObject(char);
    const h = _chestFallbackBox.max.y - _chestFallbackBox.min.y;
    _chestWorldPos.set(
        (_chestFallbackBox.min.x + _chestFallbackBox.max.x) / 2,
        _chestFallbackBox.min.y + h * 0.6,
        (_chestFallbackBox.min.z + _chestFallbackBox.max.z) / 2
    );
    return _chestWorldPos;
}

function _updateInteractionHotspots() {
    const t = performance.now() * 0.003;
    highlightedInteractionObjects.forEach((data) => {
        if (data.hotspot) {
            const phase = data.hotspot.userData._pulsePhase || 0;
            const pulse = 0.85 + 0.15 * Math.sin(t + phase);
            data.hotspot.scale.setScalar(pulse);
            data.hotspot.material.opacity = 0.25 + 0.15 * Math.sin(t + phase);
        }
    });
}

function highlightObjectForInteraction(obj, zone) {
    if (!obj || highlightedInteractionObjects.has(obj.uuid)) return;
    const isCharacter = zone && zone.surfaceMode === 'character';
    if (isCharacter) {
        const chestPos = _getCharacterChestPosition(obj);
        const hotspot = _createInteractionHotspot(chestPos, 0.07);
        scene.add(hotspot);
        highlightedInteractionObjects.set(obj.uuid, { helper: null, object: obj, hotspot: hotspot, zone: zone });
    } else {
        const helper = new THREE.BoxHelper(obj, 0x00CED1);
        helper.material.transparent = true;
        helper.material.opacity = 0.45;
        helper.material.depthTest = true;
        helper.userData.isGizmo = true;
        scene.add(helper);
        highlightedInteractionObjects.set(obj.uuid, { helper, object: obj, hotspot: null, zone: zone });
    }
}

function unhighlightObjectForInteraction(obj) {
    if (!obj) return;
    const data = highlightedInteractionObjects.get(obj.uuid);
    if (!data) return;
    if (data.helper) { scene.remove(data.helper); data.helper.geometry.dispose(); data.helper.material.dispose(); }
    if (data.hotspot) { scene.remove(data.hotspot); data.hotspot.geometry.dispose(); data.hotspot.material.dispose(); }
    highlightedInteractionObjects.delete(obj.uuid);
}

// --- Zone proximity check (hotspots turquoise) ---
function checkZoneProximity() {
    if (typeof interactionMode !== 'undefined' && interactionMode !== 'game') return;
    const activeObjectUuids = new Set();
    interactionZones.forEach(zone => {
        const distance = getZoneDistance(zone, camera.position);
        const proxRange = (zone.surfaceMode === 'wall' || zone.surfaceMode === 'object' || zone.surfaceMode === 'character') ? 2.5 : 1.5;
        const visible = distance < proxRange;
        if (zone.meshGroup) zone.meshGroup.visible = visible;
        if (zone.surfaceMode === 'object' && zone.objectRef) {
            const obj = findObjectByRef(zone.objectRef);
            if (obj && visible) { highlightObjectForInteraction(obj, zone); activeObjectUuids.add(obj.uuid); }
        }
        if (zone.surfaceMode === 'character' && zone.characterRef) {
            const char = findCharacterByRef(zone.characterRef);
            if (char && visible) { highlightObjectForInteraction(char, zone); activeObjectUuids.add(char.uuid); }
        }
    });
    highlightedInteractionObjects.forEach((data, uuid) => {
        if (!activeObjectUuids.has(uuid)) {
            if (data.helper) { scene.remove(data.helper); data.helper.geometry.dispose(); data.helper.material.dispose(); }
            if (data.hotspot) { scene.remove(data.hotspot); data.hotspot.geometry.dispose(); data.hotspot.material.dispose(); }
            highlightedInteractionObjects.delete(uuid);
        } else {
            if (data.helper && data.object) data.helper.update();
            if (data.hotspot && data.object) {
                const newChestPos = _getCharacterChestPosition(data.object);
                data.hotspot.position.copy(newChestPos);
            }
        }
    });
    _updateInteractionHotspots();
}

// --- Hold trigger ---
function checkHoldTrigger() {
    if (typeof heldZone === 'undefined' || !heldZone || (typeof holdStartTime !== 'undefined' && holdStartTime === 0)) return;
    const elapsed = performance.now() - holdStartTime;
    if (elapsed >= 1000) {
        executeZoneAction(heldZone);
        heldZone = null;
        holdStartTime = 0;
    }
}

// --- Hover & proximity triggers ---
var hoveredZones = (typeof hoveredZones !== 'undefined') ? hoveredZones : new Set();
var proximityTriggeredZones = (typeof proximityTriggeredZones !== 'undefined') ? proximityTriggeredZones : new Set();

function checkHoverAndProximityTriggers() {
    if (typeof interactionMode !== 'undefined' && interactionMode !== 'game') return;
    const hoverRaycaster = new THREE.Raycaster();
    hoverRaycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const currentHovered = new Set();
    const currentProximity = new Set();

    for (const zone of interactionZones) {
        const zoneTrigger = zone.triggerType || 'click';
        if (!zone.actionValue) continue;
        const distance = getZoneDistance(zone, camera.position);
        const interactRange = (zone.surfaceMode === 'wall' || zone.surfaceMode === 'object' || zone.surfaceMode === 'character') ? 2.5 : 1.5;
        const inRange = distance < interactRange;

        if (zoneTrigger === 'hover' && inRange) {
            const meshes = [];
            if (zone.surfaceMode === 'object' && zone.objectRef) {
                const obj = findObjectByRef(zone.objectRef);
                if (obj) obj.traverse(child => { if (child.isMesh) meshes.push(child); });
            }
            if (zone.surfaceMode === 'character' && zone.characterRef) {
                const char = findCharacterByRef(zone.characterRef);
                if (char) char.traverse(child => { if (child.isMesh) meshes.push(child); });
            }
            if (meshes.length > 0) {
                const hits = hoverRaycaster.intersectObjects(meshes, false);
                if (hits.length > 0) {
                    currentHovered.add(zone.id);
                    if (!hoveredZones.has(zone.id)) {
                        hoveredZones.add(zone.id);
                        executeZoneAction(zone);
                    }
                }
            }
        }
        if (zoneTrigger === 'proximity' && inRange) {
            currentProximity.add(zone.id);
            if (!proximityTriggeredZones.has(zone.id)) {
                proximityTriggeredZones.add(zone.id);
                executeZoneAction(zone);
            }
        }
    }
    hoveredZones.forEach(id => { if (!currentHovered.has(id)) hoveredZones.delete(id); });
    proximityTriggeredZones.forEach(id => { if (!currentProximity.has(id)) proximityTriggeredZones.delete(id); });
}

// --- Zone click interaction ---
function checkZoneInteraction(event, eventType) {
    if (typeof interactionMode !== 'undefined' && interactionMode !== 'game') return false;
    eventType = eventType || 'click';
    const clickRaycaster = new THREE.Raycaster();
    const isPointerLocked = typeof renderer !== 'undefined' && document.pointerLockElement === renderer.domElement;
    if (isPointerLocked) {
        clickRaycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    } else if (event && event.clientX !== undefined) {
        const mx = (event.clientX / window.innerWidth) * 2 - 1;
        const my = -(event.clientY / window.innerHeight) * 2 + 1;
        clickRaycaster.setFromCamera(new THREE.Vector2(mx, my), camera);
    } else {
        clickRaycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    }

    for (const zone of interactionZones) {
        if (!zone.actionValue) continue;
        const zoneTrigger = zone.triggerType || 'click';
        if (zoneTrigger !== eventType) continue;
        const distance = getZoneDistance(zone, camera.position);
        const interactRange = (zone.surfaceMode === 'wall' || zone.surfaceMode === 'object' || zone.surfaceMode === 'character') ? 2.5 : 1.5;
        if (distance < interactRange) {
            const clickTriggers = ['click', 'double-click', 'right-click', 'hold'];
            if (clickTriggers.includes(eventType)) {
                let hitZone = false;
                // Character: test hotspot
                if (zone.surfaceMode === 'character' && zone.characterRef) {
                    const char = findCharacterByRef(zone.characterRef);
                    if (char) {
                        const highlightData = highlightedInteractionObjects.get(char.uuid);
                        if (highlightData && highlightData.hotspot) {
                            highlightData.hotspot.updateMatrixWorld(true);
                            const hotspotHits = clickRaycaster.intersectObject(highlightData.hotspot, false);
                            if (hotspotHits.length > 0) hitZone = true;
                        }
                        if (!hitZone) continue;
                    } else continue;
                }
                // Object: test meshes
                if (!hitZone && zone.surfaceMode === 'object' && zone.objectRef) {
                    const obj = findObjectByRef(zone.objectRef);
                    if (obj) {
                        const objMeshes = [];
                        obj.traverse(child => { if (child.isMesh) objMeshes.push(child); });
                        const hits = clickRaycaster.intersectObjects(objMeshes, false);
                        if (hits.length > 0) hitZone = true;
                        else continue;
                    } else continue;
                }
                // Floor/wall zone: test bounds
                if (!hitZone && (zone.surfaceMode === 'floor' || zone.surfaceMode === 'ceiling')) {
                    hitZone = true; // proximity is enough for floor zones
                }
                if (!hitZone && zone.surfaceMode === 'wall') {
                    hitZone = true;
                }
                if (!hitZone) continue;
            }
            executeZoneAction(zone);
            return true;
        }
    }
    return false;
}

// --- Execute zone action ---
var _videoProgressInterval = null;
var _closingVideoOverlay = false;

function _stopVideoProgressUpdate() {
    if (_videoProgressInterval) { clearInterval(_videoProgressInterval); _videoProgressInterval = null; }
}

function executeZoneAction(zone) {
    switch (zone.actionType) {
        case 'link':
            if (zone.actionValue) {
                let navUrl = zone.actionValue;

                // 1. Normaliser les backslashes Windows en forward slashes
                navUrl = navUrl.replace(/\\/g, '/');

                // 2. Si chemin absolu Windows (ex: C:/Users/.../fichier.html),
                //    extraire la partie relative à partir du dossier "Resistance/"
                //    ou construire une URL file:// correcte
                if (/^[A-Za-z]:\//.test(navUrl)) {
                    // Chercher le dossier racine du projet dans le chemin
                    const rootMatch = navUrl.match(/\/Resistance\/(.+)$/i);
                    if (rootMatch) {
                        // Chemin relatif depuis la racine Resistance
                        navUrl = './' + rootMatch[1];
                    } else {
                        // Fallback : URL file:// bien formée
                        navUrl = 'file:///' + navUrl;
                    }
                }

                // 3. Encoder les espaces et caractères spéciaux (sauf si déjà encodé)
                const encodedUrl = navUrl.includes('%') ? navUrl : encodeURI(navUrl);
                console.log('🔗 Navigation zone link :', zone.actionValue, '→', encodedUrl);
                window.location.href = encodedUrl;
            } else {
                console.warn('⚠️ Zone link sans actionValue (id:', zone.id, '— nom:', zone.customName, ')');
            }
            break;
        case 'message':
            if (zone.actionValue) alert(zone.actionValue);
            break;
        case 'teleport':
            if (zone.actionValue) {
                const coords = zone.actionValue.split(',').map(Number);
                if (coords.length >= 3 && coords.every(n => !isNaN(n))) {
                    camera.position.set(coords[0], coords[1], coords[2]);
                }
            }
            break;
        case 'video':
            showVideoOverlay(zone.actionValue, zone);
            break;
        case 'lightbox-image':
            showImageLightbox(zone.actionValue);
            break;
        case 'lightbox-text':
            showTextLightbox(zone.actionValue);
            break;
        case 'dialogue':
            // Ouvrir le panneau de dialogue avec le personnage (actionValue = nom du personnage)
            if (typeof DialogueManager !== 'undefined' && zone.actionValue) {
                DialogueManager.start(zone.actionValue);
            }
            break;
        case 'music':
            if (zone.actionValue && typeof triggerMusicInteraction === 'function') {
                triggerMusicInteraction(zone);
            }
            break;
        default:
            break;
    }
}

function showVideoOverlay(url, zone) {
    if (!url) return;
    _currentCinematicZone = zone || null;
    // Suspendre le tutoriel : évite que les bulles/spots restent visibles
    // au-dessus de la vidéo ou réapparaissent à la sortie du plein écran
    if (typeof TutorialManager !== 'undefined') TutorialManager.suspend();
    const overlay = document.getElementById('video-overlay');
    const video = document.getElementById('overlay-video-player');
    const iframe = document.getElementById('video-iframe');
    const skipHint = document.getElementById('video-skip-hint');
    if (!overlay || !video) return;

    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
    if (ytMatch) {
        video.style.display = 'none';
        if (iframe) { iframe.style.display = 'block'; iframe.src = 'https://www.youtube.com/embed/' + ytMatch[1] + '?autoplay=1&rel=0&controls=0&modestbranding=1'; }
    } else {
        if (iframe) iframe.style.display = 'none';
        video.style.display = 'block';
        video.src = url;
        video.volume = 1;
        video.onended = () => {
            const z = _currentCinematicZone;
            if (z && z.videoEndAction === 'navigate' && z.videoEndUrl) {
                _navigateAfterVideo(z.videoEndUrl);
            } else {
                closeVideoOverlay();
            }
        };
        video.play().catch(() => {});
    }
    _cinematicPlaying = true;
    _muteGameAudio();
    overlay.style.display = 'block';
    const requestFS = overlay.requestFullscreen || overlay.webkitRequestFullscreen || overlay.msRequestFullscreen;
    if (requestFS) requestFS.call(overlay).catch(() => {});
    if (skipHint) {
        skipHint.style.opacity = '1';
        clearTimeout(overlay._hintTimeout);
        overlay._hintTimeout = setTimeout(() => { skipHint.style.opacity = '0'; }, 3000);
    }
    overlay._cinematicClickHandler = (e) => {
        if (iframe && e.target === iframe) return;
        closeVideoOverlay();
    };
    overlay.addEventListener('click', overlay._cinematicClickHandler);
    overlay._cinematicKeyHandler = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeVideoOverlay(); }
    };
    document.addEventListener('keydown', overlay._cinematicKeyHandler, true);
}

function closeVideoOverlay() {
    if (_closingVideoOverlay) return;
    _closingVideoOverlay = true;
    _stopVideoProgressUpdate();
    const overlay = document.getElementById('video-overlay');
    const video = document.getElementById('overlay-video-player');
    const iframe = document.getElementById('video-iframe');
    if (!overlay) { _closingVideoOverlay = false; return; }
    if (overlay._cinematicClickHandler) { overlay.removeEventListener('click', overlay._cinematicClickHandler); overlay._cinematicClickHandler = null; }
    if (overlay._cinematicKeyHandler) { document.removeEventListener('keydown', overlay._cinematicKeyHandler, true); overlay._cinematicKeyHandler = null; }
    if (overlay._fullscreenChangeHandler) { document.removeEventListener('fullscreenchange', overlay._fullscreenChangeHandler); document.removeEventListener('webkitfullscreenchange', overlay._fullscreenChangeHandler); overlay._fullscreenChangeHandler = null; }
    clearTimeout(overlay._hintTimeout);
    if (video) { video.onended = null; video.pause(); video.src = ''; }
    if (iframe) iframe.src = '';
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        const exitFS = document.exitFullscreen || document.webkitExitFullscreen;
        if (exitFS) exitFS.call(document).then(() => { overlay.style.display = 'none'; }).catch(() => { overlay.style.display = 'none'; });
    } else {
        overlay.style.display = 'none';
    }
    _cinematicPlaying = false;
    _currentCinematicZone = null;
    if (typeof clock !== 'undefined') clock.getDelta();
    _unmuteGameAudio();
    // Réactiver le tutoriel (les watchers peuvent reprendre si nécessaire)
    if (typeof TutorialManager !== 'undefined' && typeof TutorialManager.resume === 'function') {
        TutorialManager.resume();
    }
    setTimeout(() => { _closingVideoOverlay = false; }, 200);
}

function _navigateAfterVideo(targetUrl) {
    closeVideoOverlay();
    const ls = document.getElementById('loading-screen');
    if (ls) {
        ls.style.display = 'flex';
        ls.classList.remove('fade-out');
        ls.style.opacity = '1';
        const bar = document.getElementById('loading-bar');
        if (bar) { bar.style.animation = 'none'; bar.style.width = '0%'; requestAnimationFrame(() => { bar.style.animation = 'loading-progress 2.5s ease-out forwards'; }); }
        const subtitle = ls.querySelector('.loading-subtitle');
        if (subtitle) subtitle.textContent = 'Chargement de la nouvelle salle...';
    }
    setTimeout(() => { window.location.href = targetUrl; }, 400);
}

function showImageLightbox(url) {
    if (!url) return;
    const overlay = document.getElementById('lightbox-image-overlay');
    const img = document.getElementById('lightbox-image');
    if (overlay && img) { img.src = url; overlay.style.display = 'block'; }
}

function closeImageLightbox() {
    const overlay = document.getElementById('lightbox-image-overlay');
    const img = document.getElementById('lightbox-image');
    if (overlay) overlay.style.display = 'none';
    if (img) img.src = '';
}

function showTextLightbox(textOrHtml) {
    if (!textOrHtml) return;
    const overlay = document.getElementById('lightbox-text-overlay');
    const content = document.getElementById('lightbox-text-content');
    if (overlay && content) { content.innerHTML = textOrHtml; overlay.style.display = 'block'; }
}

function closeTextLightbox() {
    const overlay = document.getElementById('lightbox-text-overlay');
    const content = document.getElementById('lightbox-text-content');
    if (overlay) overlay.style.display = 'none';
    if (content) content.innerHTML = '';
}

function closeAllOverlays() {
    closeVideoOverlay();
    closeImageLightbox();
    closeTextLightbox();
}

// ==================== CLEANUP DE FIN DE VIE ====================
// Libère la mémoire GPU quand l'utilisateur quitte la page ou change de salle.
// Sinon les textures, géométries et matériaux restent alloués côté WebGL jusqu'à
// ce que le GC récupère le contexte — ce qui peut mettre 30+ secondes et laisser
// la mémoire gonflée si l'utilisateur enchaîne plusieurs salles.
function disposeSceneAndRelease() {
    try {
        if (typeof scene !== 'undefined' && scene) {
            // Dispose tous les enfants restants de la scène
            const children = [...scene.children];
            for (const child of children) disposeObject3D(child);
        }
        clearTextureCache();
        if (typeof renderer !== 'undefined' && renderer) {
            if (renderer.renderLists && renderer.renderLists.dispose) renderer.renderLists.dispose();
            if (renderer.dispose) renderer.dispose();
            if (renderer.forceContextLoss) renderer.forceContextLoss();
        }
    } catch (e) {
        // Page en train de mourir — on n'a pas besoin de gérer l'erreur
    }
}

// beforeunload : navigation vers une autre page / fermeture d'onglet
// pagehide : équivalent plus fiable sur iOS et pour bfcache
window.addEventListener('beforeunload', disposeSceneAndRelease);
window.addEventListener('pagehide', disposeSceneAndRelease);

console.log('✅ scene-loader.js chargé (mode jeu léger)');
