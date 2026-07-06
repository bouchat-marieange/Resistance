/**
 * ============================================================
 * RESISTANCE — game/engine/bootstrap.js
 * Chargement principal : migrations, bootstrapFromFiles
 * (manifeste scene_data + blobs), loadScene
 * ------------------------------------------------------------
 * Découpage mécanique de l'ancien scene-loader.js (07/2026).
 * Les modules game/engine/ se chargent DANS L'ORDRE :
 * state → db → build → audio → restore → bootstrap → player
 * ============================================================
 */

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
        // Fetch avec cache-busting pour contourner le cache HTTP (+ retry : sans
        // manifeste, toute la scène resterait vide pour un navigateur vierge)
        const response = await RoomEditorDB.fetchAvecRetry('scene_data/project.json?_=' + Date.now());
        if (response && response.ok) fileManifest = await response.json();
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
                    const resp = await RoomEditorDB.fetchAvecRetry('scene_data/blobs/' + blobId + '.json?_=' + Date.now());
                    if (!resp || !resp.ok) { blobsFail++; return; }
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

