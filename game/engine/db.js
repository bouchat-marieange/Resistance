/**
 * ============================================================
 * RESISTANCE — game/engine/db.js
 * RoomEditorDB : persistance IndexedDB + fallback fetch avec
 * retry (fetchAvecRetry) + utilitaires généraux
 * ------------------------------------------------------------
 * Découpage mécanique de l'ancien scene-loader.js (07/2026).
 * Les modules game/engine/ se chargent DANS L'ORDRE :
 * state → db → build → audio → restore → bootstrap → player
 * ============================================================
 */

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

    // Fetch avec 3 tentatives (délai croissant 500 ms / 1 s) : les chargements
    // parallèles de gros blobs peuvent échouer transitoirement (serveur local,
    // réseau instable) — un échec unique ne doit pas priver la scène d'un objet.
    async fetchAvecRetry(url, tentatives = 3) {
        for (let i = 1; i <= tentatives; i++) {
            try {
                const response = await fetch(url);
                if (response.ok) return response;
                if (response.status === 404) return response; // fichier absent : inutile de réessayer
            } catch (e) {
                if (i === tentatives) throw e;
            }
            if (i < tentatives) await new Promise(r => setTimeout(r, 500 * i));
        }
        return null;
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
                const response = await this.fetchAvecRetry(`scene_data/blobs/${key}.json`);
                if (response && response.ok) {
                    const blobData = await response.json();
                    try { await this.put(this.STORE_BLOBS, blobData); } catch (e) { /* ignore */ }
                    console.log(`✅ Blob ${key} chargé et mis en cache`);
                    return blobData;
                }
            } catch (e) {
                console.warn(`⚠️ Impossible de charger blob ${key} depuis scene_data/ (après 3 tentatives):`, e);
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


