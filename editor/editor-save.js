// ==================== GESTION DE LA SAUVEGARDE ====================

// Marquer qu'il y a des changements non sauvegardés
function markUnsavedChanges() {
    if (!hasUnsavedChanges) {
        hasUnsavedChanges = true;
        updateUnsavedIndicator();
    }
}

// Mettre à jour le voyant rouge de sauvegarde
function updateUnsavedIndicator() {
    const indicator = document.getElementById('unsaved-indicator');
    if (indicator) {
        indicator.style.display = hasUnsavedChanges ? 'block' : 'none';
    }
}

// Marquer comme sauvegardé
function markAsSaved() {
    hasUnsavedChanges = false;
    updateUnsavedIndicator();
}

// Disposer un matériau (simple ou Array) de manière sécurisée
function disposeMaterial(material) {
    if (!material) return;
    if (Array.isArray(material)) {
        material.forEach(m => { if (m && m.dispose) m.dispose(); });
    } else if (material.dispose) {
        material.dispose();
    }
}

// Ajouter un mur dans la liste des objets de l'éditeur (section Environnement)
function addWallToObjectList(wall) {
    if (!wall || !wall.mesh) return;

    // Ajouter le mesh dans selectableObjects s'il n'y est pas déjà
    if (!selectableObjects.includes(wall.mesh)) {
        selectableObjects.push(wall.mesh);
    }

    // Debounce: un seul rafraîchissement après ajout de tous les murs
    if (typeof scheduleUpdateObjectsList === 'function') {
        scheduleUpdateObjectsList();
    }
}

// Supprimer un mur de la liste des objets
function removeWallFromObjectList(wall) {
    if (!wall || !wall.mesh) return;

    // Retirer le mesh de selectableObjects
    const index = selectableObjects.indexOf(wall.mesh);
    if (index > -1) {
        selectableObjects.splice(index, 1);
    }

    // Debounce: un seul rafraîchissement après suppression
    if (typeof scheduleUpdateObjectsList === 'function') {
        scheduleUpdateObjectsList();
    }
}

// Mettre à jour la sélection visuelle dans la liste des murs
function updateWallListSelection() {
    // La sélection est gérée par updateObjectsList via selectedEditorObject
    // Cette fonction peut être appelée pour synchroniser si nécessaire
    if (selectedWalls.length > 0 && selectedWalls[0].mesh) {
        // Sélectionner le premier mur de la sélection dans l'éditeur
        selectedEditorObject = selectedWalls[0].mesh;
        updateObjectsList();
    }
}

// Sauvegarder le projet complet (murs + objets + personnages)
async function saveProject() {
    // Auto-sauvegarder la zone en cours d'édition avant de sauvegarder le projet
    if (currentEditingZone) {
        saveCurrentZone();
    }

    console.log('💾 Sauvegarde du projet en cours...');

    try {
        // Map pour dédupliquer les blobs (textures/GLB)
        const blobMap = new Map();

        // Helper: stocker un blob et retourner son ID
        async function storeBlobData(dataURL) {
            if (!dataURL) return null;
            if (blobMap.has(dataURL)) return blobMap.get(dataURL);
            const blobId = 'blob_' + simpleHash(dataURL);
            blobMap.set(dataURL, blobId);
            await RoomEditorDB.put(RoomEditorDB.STORE_BLOBS, {
                id: blobId,
                data: dataURL
            });
            return blobId;
        }

        // 1. Nettoyer le tableau des murs (retirer ceux qui n'ont plus de mesh dans la scène)
        const validWalls = floorPlanWalls.filter(w => w && w.mesh && w.mesh.parent);
        if (validWalls.length !== floorPlanWalls.length) {
            console.log(`🧹 Nettoyage murs: ${floorPlanWalls.length - validWalls.length} murs orphelins retirés`);
            floorPlanWalls.length = 0;
            floorPlanWalls.push(...validWalls);
        }

        // 2. Sérialiser les murs avec leurs textures
        const wallsData = [];
        console.log(`💾 Sauvegarde de ${floorPlanWalls.length} murs...`);
        for (const w of floorPlanWalls) {
            // Murs fusionnés : sauvegarder avec geometry JSON (pas de start/end)
            if (w.isMerged) {
                const mergedEntry = {
                    isMerged: true,
                    name: w.name || `Mur fusionné n°${w.id || 0}`,
                    id: w.id || 0,
                    geometryJSON: w.mesh.geometry.toJSON(),
                    sourceWallCount: w.mesh.userData.sourceWallCount || 0,
                    textureInfo: null
                };
                // Sauvegarder le polygone intérieur s'il existe
                const poly = w.roomPolygon || (w.mesh.userData && w.mesh.userData.roomPolygon);
                if (poly && poly.length >= 3) {
                    mergedEntry.roomPolygon = poly.map(p => ({ x: p.x, z: p.z }));
                }
                if (w.textureInfo) {
                    mergedEntry.textureInfo = {};
                    for (const faceIdx in w.textureInfo) {
                        const info = w.textureInfo[faceIdx];
                        if (info && info.imageDataURL) {
                            const blobId = await storeBlobData(info.imageDataURL);
                            mergedEntry.textureInfo[faceIdx] = {
                                type: info.type,
                                tileSize: info.tileSize,
                                fileName: info.fileName,
                                textureBlobId: blobId
                            };
                        }
                    }
                }
                wallsData.push(mergedEntry);
                continue;
            }
            // Murs normaux : sauvegarder start/end
            if (!w.start || !w.end) {
                console.warn(`⚠️ Mur "${w.name}" ignoré: start ou end manquant`);
                continue;
            }
            const wallEntry = {
                start: { x: w.start.x, z: w.start.z },
                end: { x: w.end.x, z: w.end.z },
                name: w.name || `Mur_${w.id || 0}`,
                id: w.id || 0,
                textureInfo: null
            };
            if (w.textureInfo) {
                wallEntry.textureInfo = {};
                for (const faceIdx in w.textureInfo) {
                    const info = w.textureInfo[faceIdx];
                    if (info && info.imageDataURL) {
                        const blobId = await storeBlobData(info.imageDataURL);
                        wallEntry.textureInfo[faceIdx] = {
                            type: info.type,
                            tileSize: info.tileSize,
                            fileName: info.fileName,
                            textureBlobId: blobId
                        };
                    }
                }
            }
            wallsData.push(wallEntry);
        }

        // 2. Sérialiser les dalles de sol
        const floorTilesData = [];
        for (const child of scene.children) {
            if (child.userData.type === 'floor-tile' && child.userData.textureDataURL) {
                const blobId = await storeBlobData(child.userData.textureDataURL);
                floorTilesData.push({
                    x: child.position.x,
                    z: child.position.z,
                    textureBlobId: blobId,
                    tileSize: child.userData.tileSize || 1
                });
            }
        }

        // 3. Sérialiser les dalles de plafond
        const ceilingTilesData = [];
        for (const child of scene.children) {
            if (child.userData.type === 'ceiling-tile' && child.userData.textureDataURL) {
                const blobId = await storeBlobData(child.userData.textureDataURL);
                ceilingTilesData.push({
                    x: child.position.x,
                    z: child.position.z,
                    textureBlobId: blobId,
                    tileSize: child.userData.tileSize || 1
                });
            }
        }

        // 3b. Sérialiser les polygones de sol
        const floorPolygonsData = [];
        for (const child of scene.children) {
            if (child.userData.type === 'floor-polygon' && child.userData.textureDataURL) {
                const blobId = await storeBlobData(child.userData.textureDataURL);
                floorPolygonsData.push({
                    polygonPoints: child.userData.polygonPoints,
                    textureBlobId: blobId,
                    tileSize: child.userData.tileSize || 1
                });
            }
        }

        // 3c. Sérialiser les polygones de plafond
        const ceilingPolygonsData = [];
        for (const child of scene.children) {
            if (child.userData.type === 'ceiling-polygon' && child.userData.textureDataURL) {
                const blobId = await storeBlobData(child.userData.textureDataURL);
                ceilingPolygonsData.push({
                    polygonPoints: child.userData.polygonPoints,
                    textureBlobId: blobId,
                    tileSize: child.userData.tileSize || 1
                });
            }
        }

        // 4. Nettoyer le tableau importedObjects des objets supprimés
        const validImportedObjects = importedObjects.filter(obj => obj && obj.parent);
        if (validImportedObjects.length !== importedObjects.length) {
            console.log(`🧹 Nettoyage: ${importedObjects.length - validImportedObjects.length} objets orphelins retirés`);
            importedObjects.length = 0;
            importedObjects.push(...validImportedObjects);
        }

        // 5. Sérialiser les objets importés (avec leurs fichiers GLB)
        const objectsData = [];
        console.log(`💾 Sauvegarde de ${importedObjects.length} objets importés...`);
        for (const obj of importedObjects) {
            if (obj.userData.fileData) {
                const blobId = await storeBlobData(obj.userData.fileData);
                objectsData.push({
                    fileName: obj.userData.fileName,
                    editorName: obj.userData.editorName,
                    position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
                    rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
                    scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
                    customRoughness: obj.userData.customRoughness,
                    isCharacter: obj.userData.isCharacter || false,
                    armatureScaleY: obj.userData.armatureScaleY || 1,
                    fileDataBlobId: blobId
                });
                console.log(`   ✅ ${obj.userData.editorName} sauvegardé (pos: ${obj.position.x.toFixed(2)}, ${obj.position.y.toFixed(2)}, ${obj.position.z.toFixed(2)})`);
            } else {
                console.warn(`   ⚠️ ${obj.userData.editorName || 'Objet'} n'a pas de fileData - impossible de sauvegarder`);
            }
        }

        // 5. Sérialiser les lumières personnalisées
        const lightsData = customLights
            .filter(light => !light.userData.isDefault)
            .map(light => {
                const data = {
                    type: light.userData.type,
                    position: { x: light.position.x, y: light.position.y, z: light.position.z },
                    color: '#' + light.color.getHexString(),
                    intensity: light.intensity,
                    positionLocked: light.userData.positionLocked || false,
                    isOn: light.userData.isOn !== false
                };
                if (light.userData.type === 'spot') {
                    data.angle = light.angle;
                    data.penumbra = light.penumbra;
                    if (light.target) {
                        data.target = { x: light.target.position.x, y: light.target.position.y, z: light.target.position.z };
                    }
                }
                if (light.userData.type === 'directional' && light.target) {
                    data.target = { x: light.target.position.x, y: light.target.position.y, z: light.target.position.z };
                }
                return data;
            });

        // 5b. Sérialiser les pièces (rooms)
        const roomsData = floorPlanRooms.map(r => ({
            id: r.id,
            bounds: r.bounds,
            polygon: r.polygon || null,
            rounding: r.rounding || 0,
            wallIds: r.walls.map(w => w.id)
        }));

        // 6. Sauvegarder le projet complet dans IndexedDB
        const projectData = {
            id: 'project_' + currentRoomName,
            version: 2,
            timestamp: Date.now(),
            wallHeight: wallHeight,
            wallThickness: wallThickness,
            gridSize: gridSize,
            wallIdCounter: wallIdCounter,
            roomIdCounter: roomIdCounter,
            walls: wallsData,
            rooms: roomsData,
            floorTiles: floorTilesData,
            ceilingTiles: ceilingTilesData,
            floorPolygons: floorPolygonsData,
            ceilingPolygons: ceilingPolygonsData,
            importedObjects: objectsData,
            lights: lightsData,
            // Intensité de la lumière ambiante par défaut
            ambientLightIntensity: window.defaultAmbientLight ? window.defaultAmbientLight.intensity : 0.7,
            // Transform de Naby (personnage animé)
            nabyTransform: babyModel ? {
                position: { x: babyModel.position.x, y: babyModel.position.y, z: babyModel.position.z },
                rotation: { x: babyModel.rotation.x, y: babyModel.rotation.y, z: babyModel.rotation.z },
                scale: { x: babyModel.scale.x, y: babyModel.scale.y, z: babyModel.scale.z }
            } : null,
            // Position de départ du joueur
            spawn: spawnSaved && spawnPosition ? {
                position: { x: spawnPosition.x, y: spawnPosition.y, z: spawnPosition.z },
                rotationY: spawnRotationY
            } : null,
            // Vitesses de déplacement
            movementSpeeds: { walk: walkSpeed, run: runSpeed },
            // Zones d'interaction
            interactionZones: interactionZones.map(zone => {
                const zd = {
                    id: zone.id, type: zone.type,
                    bounds: { minX: zone.bounds.minX, maxX: zone.bounds.maxX, minZ: zone.bounds.minZ, maxZ: zone.bounds.maxZ },
                    triggerType: zone.triggerType || 'click',
                    actionType: zone.actionType, actionValue: zone.actionValue,
                    locked: zone.locked, y: zone.y,
                    surfaceMode: zone.surfaceMode || 'floor',
                    customName: zone.customName || null
                };
                if (zone.wallRef) zd.wallRef = zone.wallRef;
                if (zone.localBounds) zd.localBounds = zone.localBounds;
                if (zone.wallPlaneData) zd.wallPlaneData = {
                    wallRotationY: zone.wallPlaneData.wallRotationY,
                    wallPosition: zone.wallPlaneData.wallPosition ? { x: zone.wallPlaneData.wallPosition.x, y: zone.wallPlaneData.wallPosition.y, z: zone.wallPlaneData.wallPosition.z } : null,
                    faceNormalLocal: zone.wallPlaneData.faceNormalLocal
                };
                if (zone.objectRef) zd.objectRef = zone.objectRef;
                if (zone.characterRef) zd.characterRef = zone.characterRef;
                if (zone.actionConfig) zd.actionConfig = zone.actionConfig;
                if (zone.videoEndAction) zd.videoEndAction = zone.videoEndAction;
                if (zone.videoEndUrl) zd.videoEndUrl = zone.videoEndUrl;
                return zd;
            }),
            interactionZoneIdCounter: interactionZoneIdCounter,
            // Pistes audio
            audioTracks: await serializeAudioTracks(storeBlobData),
            audioTrackIdCounter: audioTrackIdCounter
        };

        await RoomEditorDB.put(RoomEditorDB.STORE_PROJECTS, projectData);
        console.log(`✅ IndexedDB: ${wallsData.length} murs sauvegardés (dont ${wallsData.filter(w=>w.isMerged).length} fusionnés)`);

        // 7. Aussi sauvegarder dans localStorage (backup/compatibilité)
        saveFloorPlan();

        markAsSaved();
        console.log(`💾 Projet sauvegardé ! (${wallsData.length} murs, ${roomsData.length} pièces, ${floorTilesData.length} dalles sol, ${ceilingTilesData.length} dalles plafond, ${floorPolygonsData.length} polygones sol, ${ceilingPolygonsData.length} polygones plafond, ${objectsData.length} objets, ${lightsData.length} lumières)`);

    } catch (error) {
        console.error('❌ Erreur sauvegarde IndexedDB:', error);
        console.error('   Stack:', error.stack);
        // Fallback: au moins sauvegarder dans localStorage
        try {
            saveFloorPlan();
            console.log(`💾 Fallback localStorage: ${floorPlanWalls.length} murs sauvegardés`);
        } catch (lsError) {
            console.error('❌ Erreur sauvegarde localStorage aussi:', lsError);
        }
        markAsSaved();
        console.log('💾 Projet partiellement sauvegardé (localStorage uniquement)');
    }
}

// Migration : anciens clés room1_ → room_1_
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

// Charger le projet au démarrage
async function loadProjectOnStartup() {
    console.log('🚀 loadProjectOnStartup() appelé');
    if (typeof scene === 'undefined' || !scene) {
        console.warn('⚠️ Scene non initialisée, impossible de charger le projet');
        return;
    }

    console.log('🔄 Chargement du projet...');

    let idbData = null;
    try {
        // Essayer IndexedDB d'abord (format version 2)
        idbData = await RoomEditorDB.get(
            RoomEditorDB.STORE_PROJECTS,
            'project_' + currentRoomName
        );
    } catch (e) {
        console.warn('⚠️ IndexedDB non disponible, fallback localStorage:', e);
    }

    // Vérifier si localStorage a des données plus récentes que IndexedDB
    const savedPlanRaw = localStorage.getItem('floorPlan_' + currentRoomName);
    let lsTimestamp = 0;
    if (savedPlanRaw) {
        try {
            const lsData = JSON.parse(savedPlanRaw);
            lsTimestamp = lsData.timestamp || 0;
        } catch (e) { /* ignore */ }
    }
    const idbTimestamp = (idbData && idbData.timestamp) || 0;

    if (idbData && idbData.version === 2) {
        // Utiliser localStorage SEULEMENT si nettement plus récent (>5s = IndexedDB a échoué)
        // En fonctionnement normal, les 2 sauvegardes se font à ~100ms d'intervalle
        const timeDiff = lsTimestamp - idbTimestamp;
        if (lsTimestamp > 0 && timeDiff > 5000) {
            console.log(`⚠️ localStorage nettement plus récent (+${(timeDiff/1000).toFixed(1)}s) → chargement depuis localStorage`);
            console.log(`   IndexedDB: ${new Date(idbTimestamp).toLocaleString()}, localStorage: ${new Date(lsTimestamp).toLocaleString()}`);
            await loadProjectFromLocalStorage();
            markAsSaved();
            return;
        }
        // IndexedDB est préféré (contient textures, objets importés, etc.)
        console.log(`📂 Chargement depuis IndexedDB (timestamp: ${new Date(idbTimestamp).toLocaleString()})`);
        await loadProjectFromIndexedDB(idbData);
        markAsSaved();
        return;
    }

    // Fallback: charger depuis localStorage (ancien format ou seule source)
    console.log('📂 Pas de données IndexedDB v2, fallback localStorage');
    await loadProjectFromLocalStorage();
}

// ==================== BOOTSTRAP DEPUIS FICHIERS (GitHub Pages) ====================
// Si aucune donnée valide n'existe dans le navigateur, charger depuis scene_data/
// Les blobs (textures, modèles 3D) seront chargés à la demande via RoomEditorDB.get()
async function bootstrapFromFiles() {
    // Vérifier si IndexedDB a des données COMPLÈTES (pas corrompues)
    try {
        const existing = await RoomEditorDB.get(
            RoomEditorDB.STORE_PROJECTS,
            'project_' + currentRoomName
        );
        if (existing && existing.version === 2) {
            // Vérifier que les données ne sont pas vides/corrompues
            const hasWalls = existing.walls && existing.walls.length > 0;
            const hasObjects = existing.importedObjects && existing.importedObjects.length > 0;
            const hasLights = existing.lights && existing.lights.length > 0;
            const hasTiles = existing.floorTiles && existing.floorTiles.length > 0;

            if (hasWalls || hasObjects || hasLights || hasTiles) {
                console.log('✅ IndexedDB contient des données valides (' +
                    (existing.walls ? existing.walls.length : 0) + ' murs, ' +
                    (existing.importedObjects ? existing.importedObjects.length : 0) + ' objets, ' +
                    (existing.lights ? existing.lights.length : 0) + ' lumières)');
                return;
            } else {
                console.warn('⚠️ IndexedDB contient un projet vide/corrompu, re-bootstrap nécessaire...');
                try { await RoomEditorDB.delete(RoomEditorDB.STORE_PROJECTS, 'project_' + currentRoomName); } catch (e) {}
            }
        }
    } catch (e) { /* IndexedDB non disponible */ }

    // Nettoyer le localStorage potentiellement corrompu aussi
    localStorage.removeItem('floorPlan_' + currentRoomName);
    localStorage.removeItem(currentRoomName + '_importedObjects');
    localStorage.removeItem(currentRoomName + '_customLights');

    // Charger le manifeste depuis les fichiers
    console.log('🔄 Bootstrap depuis scene_data/...');
    const subtitle = document.querySelector('.loading-subtitle');

    try {
        if (subtitle) subtitle.textContent = 'Chargement des données de la scène...';

        const response = await fetch('scene_data/project.json');
        if (!response.ok) throw new Error('project.json introuvable (HTTP ' + response.status + ')');
        const manifest = await response.json();

        // Restaurer localStorage
        if (manifest.localStorage) {
            for (const [key, value] of Object.entries(manifest.localStorage)) {
                localStorage.setItem(key, value);
            }
            console.log('📦 localStorage restauré (3 clés)');
        }

        // Restaurer le projet dans IndexedDB (métadonnées seulement, ~0.2 MB)
        if (manifest.project) {
            await RoomEditorDB.put(RoomEditorDB.STORE_PROJECTS, manifest.project);
            console.log('📦 Projet restauré dans IndexedDB (' +
                manifest.project.walls.length + ' murs, ' +
                manifest.project.importedObjects.length + ' objets, ' +
                manifest.project.lights.length + ' lumières)');
        }

        // Les blobs seront chargés automatiquement à la demande
        // via le fallback dans RoomEditorDB.get()
        console.log('✅ Bootstrap terminé ! Les ' + (manifest.blobIds ? manifest.blobIds.length : 0) + ' textures seront chargées à la demande.');

        if (subtitle) subtitle.textContent = 'Construction de la scène...';
    } catch (e) {
        console.warn('⚠️ Bootstrap depuis fichiers échoué:', e);
        if (subtitle) subtitle.textContent = 'Chargement en cours...';
    }
}

// Charger depuis localStorage (compatibilité arrière)
async function loadProjectFromLocalStorage() {
    const savedPlan = localStorage.getItem('floorPlan_' + currentRoomName);
    if (savedPlan) {
        try {
            const planData = JSON.parse(savedPlan);

            wallHeight = planData.wallHeight || 2.5;
            wallThickness = planData.wallThickness || 0.2;
            gridSize = planData.gridSize || 1;

            if (planData.wallIdCounter) {
                wallIdCounter = planData.wallIdCounter;
            }

            if (planData.walls && planData.walls.length > 0) {
                let loadedCount = 0;
                let mergedCount = 0;
                planData.walls.forEach((w, index) => {
                    // Murs fusionnés : reconstruire depuis geometryJSON
                    if (w.isMerged && w.geometryJSON) {
                        try {
                            const loader = new THREE.BufferGeometryLoader();
                            const geo = loader.parse(w.geometryJSON);
                            let maxMatIdx = 0;
                            if (geo.groups) {
                                geo.groups.forEach(g => { maxMatIdx = Math.max(maxMatIdx, g.materialIndex); });
                            }
                            const materials = [];
                            for (let i = 0; i <= maxMatIdx; i++) {
                                // Recréer le polygonOffset différencié par mur source (6 faces par mur)
                                const sourceWallIdx = Math.floor(i / 6);
                                const pof = 1 + sourceWallIdx * 0.3;
                                materials.push(new THREE.MeshStandardMaterial({
                                    color: 0xcccccc, side: THREE.DoubleSide, roughness: 0.4, metalness: 0,
                                    polygonOffset: true,
                                    polygonOffsetFactor: pof,
                                    polygonOffsetUnits: pof
                                }));
                            }
                            const mesh = new THREE.Mesh(geo, materials);
                            mesh.castShadow = true;
                            mesh.receiveShadow = true;
                            mesh.userData.type = 'merged-wall';
                            mesh.userData.editorName = w.name;
                            mesh.userData.isMerged = true;
                            mesh.userData.isEnvironment = true;
                            mesh.userData.wallId = w.id;
                            mesh.userData.sourceWallCount = w.sourceWallCount || 0;
                            scene.add(mesh);
                            selectableObjects.push(mesh);
                            const mergedWallObj = {
                                start: null, end: null, mesh: mesh,
                                name: w.name, id: w.id, isMerged: true
                            };
                            // Restaurer le polygone intérieur
                            if (w.roomPolygon && w.roomPolygon.length >= 3) {
                                mergedWallObj.roomPolygon = w.roomPolygon;
                                mesh.userData.roomPolygon = w.roomPolygon;
                            }
                            floorPlanWalls.push(mergedWallObj);
                            loadedCount++;
                            mergedCount++;
                        } catch (e) {
                            console.warn(`⚠️ Erreur restauration mur fusionné "${w.name}":`, e);
                        }
                        return; // forEach continue
                    }
                    // Murs normaux
                    if (w.start && w.end) {
                        const wallName = w.name || `Mur_${index + 1}`;
                        const wallId = w.id || (index + 1);
                        createWallSegmentWithId(w.start, w.end, wallName, wallId);
                        loadedCount++;
                    }
                });
                if (!planData.wallIdCounter && loadedCount > 0) {
                    wallIdCounter = loadedCount + 1;
                }
                // Mettre à jour tous les biseaux après chargement
                updateAllWallMiters();
                console.log(`📂 Murs chargés depuis localStorage (${floorPlanWalls.length} murs dont ${mergedCount} fusionnés)`);
            }

            // Restaurer le compteur de rooms
            if (planData.roomIdCounter) {
                roomIdCounter = planData.roomIdCounter;
            }

            // Restaurer les pièces (rooms)
            if (planData.rooms && planData.rooms.length > 0) {
                for (const roomData of planData.rooms) {
                    const roomId = roomData.id || roomIdCounter++;
                    const roomWalls = [];
                    if (roomData.wallIds) {
                        roomData.wallIds.forEach(wid => {
                            const w = floorPlanWalls.find(fw => fw.id === wid);
                            if (w) { w.isRoomWall = true; roomWalls.push(w); }
                        });
                    }

                    let roomMesh, polygon;
                    if (roomData.polygon && roomData.polygon.length >= 3) {
                        polygon = roomData.polygon;
                        roomMesh = createPolygonRoomMesh(polygon);
                    } else if (roomData.bounds) {
                        const b = roomData.bounds;
                        polygon = [
                            { x: b.minX, z: b.minZ }, { x: b.maxX, z: b.minZ },
                            { x: b.maxX, z: b.maxZ }, { x: b.minX, z: b.maxZ }
                        ];
                        roomMesh = createRoomMesh(b.minX, b.maxX, b.minZ, b.maxZ);
                    } else {
                        continue;
                    }

                    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
                    polygon.forEach(p => {
                        minX = Math.min(minX, p.x);
                        maxX = Math.max(maxX, p.x);
                        minZ = Math.min(minZ, p.z);
                        maxZ = Math.max(maxZ, p.z);
                    });

                    const room = {
                        id: roomId,
                        walls: roomWalls,
                        mesh: roomMesh,
                        bounds: { minX, maxX, minZ, maxZ },
                        polygon: polygon,
                        rounding: roomData.rounding || 0,
                        selected: false
                    };
                    floorPlanRooms.push(room);
                    scene.add(roomMesh);
                }
                console.log(`📂 Pièces chargées depuis localStorage (${floorPlanRooms.length} pièces)`);
            }

            // Charger le transform de Naby
            if (planData.nabyTransform) {
                savedNabyTransform = planData.nabyTransform;
                if (babyModel && nabyRawHeight) {
                    babyModel.position.set(savedNabyTransform.position.x, savedNabyTransform.position.y, savedNabyTransform.position.z);
                    babyModel.rotation.set(savedNabyTransform.rotation.x || 0, savedNabyTransform.rotation.y || 0, savedNabyTransform.rotation.z || 0);
                    const restoredHeight = savedNabyTransform.scale.y * nabyRawHeight;
                    if (restoredHeight >= 0.1 && restoredHeight <= 5.0) {
                        babyModel.scale.set(savedNabyTransform.scale.x, savedNabyTransform.scale.y, savedNabyTransform.scale.z);
                    } else {
                        const safeScale = 1.70 / nabyRawHeight;
                        babyModel.scale.set(safeScale, safeScale, safeScale);
                        console.warn('⚠️ Échelle Naby invalide corrigée → 1.70m');
                    }
                    babyModel.updateMatrixWorld(true);
                } else if (babyModel) {
                    babyModel.position.set(savedNabyTransform.position.x, savedNabyTransform.position.y, savedNabyTransform.position.z);
                    babyModel.rotation.set(savedNabyTransform.rotation.x || 0, savedNabyTransform.rotation.y || 0, savedNabyTransform.rotation.z || 0);
                    babyModel.scale.set(savedNabyTransform.scale.x, savedNabyTransform.scale.y, savedNabyTransform.scale.z);
                    babyModel.updateMatrixWorld(true);
                }
                console.log('📂 Transform de Naby chargé depuis localStorage');
            }

            // Charger la position de spawn
            if (planData.spawn) {
                spawnPosition = {
                    x: planData.spawn.position.x,
                    y: planData.spawn.position.y,
                    z: planData.spawn.position.z
                };
                spawnRotationY = planData.spawn.rotationY || 0;
                spawnSaved = true;
                console.log('📂 Position de spawn chargée depuis localStorage');
            }

            // Restaurer l'intensité de la lumière ambiante
            if (planData.ambientLightIntensity !== undefined && window.defaultAmbientLight) {
                window.defaultAmbientLight.intensity = planData.ambientLightIntensity;
                window.defaultAmbientLight.userData.savedIntensity = planData.ambientLightIntensity;
                console.log(`  💡 Lumière ambiante restaurée: ${planData.ambientLightIntensity}`);
            }

            // Vitesses de déplacement — valeurs fixes (ne plus charger depuis localStorage)

            // Charger les zones d'interaction depuis localStorage
            if (planData.interactionZones && planData.interactionZones.length > 0) {
                loadInteractionZonesFromData(planData.interactionZones);
                interactionZoneIdCounter = planData.interactionZoneIdCounter || interactionZones.length;
                console.log(`📂 Zones d'interaction chargées depuis localStorage: ${interactionZones.length}`);
            }

            // Charger les pistes audio
            if (planData.audioTracks && planData.audioTracks.length > 0) {
                await restoreAudioTracks(planData.audioTracks);
                audioTrackIdCounter = planData.audioTrackIdCounter || audioTrackIdCounter;
                console.log(`📂 Pistes audio chargées: ${planData.audioTracks.length}`);
            }

            markAsSaved();
        } catch (e) {
            console.error('Erreur lors du chargement du projet:', e);
        }
    }

    // Charger aussi lumières depuis localStorage (legacy)
    loadCustomLightsFromStorage();

    // Charger les objets permanents par défaut (pas de projet IndexedDB)
    console.log('📦 Aucun projet IndexedDB - chargement des objets permanents par défaut');
    loadPermanentObjects();
}

// Charger depuis IndexedDB (format complet)
async function loadProjectFromIndexedDB(projectData) {
    console.log('📂 Chargement depuis IndexedDB...');
    console.log(`   📋 Données: ${projectData.walls?.length || 0} murs, ${projectData.importedObjects?.length || 0} objets, ${projectData.lights?.length || 0} lumières`);

    // 0. Nettoyer les murs et objets importés existants AVANT de restaurer
    // Supprimer les murs existants
    for (const wall of [...floorPlanWalls]) {
        if (wall.mesh) {
            scene.remove(wall.mesh);
            if (wall.mesh.geometry) wall.mesh.geometry.dispose();
            disposeMaterial(wall.mesh.material);
        }
    }
    floorPlanWalls.length = 0;

    // Supprimer les objets importés existants
    for (const obj of [...importedObjects]) {
        scene.remove(obj);
        const idx = selectableObjects.indexOf(obj);
        if (idx > -1) selectableObjects.splice(idx, 1);
    }
    importedObjects.length = 0;

    // Supprimer les pièces (rooms) existantes
    for (const room of [...floorPlanRooms]) {
        if (room.mesh) {
            scene.remove(room.mesh);
            if (room.mesh.geometry) room.mesh.geometry.dispose();
            if (room.mesh.material) room.mesh.material.dispose();
        }
    }
    floorPlanRooms.length = 0;

    // Supprimer les dalles et polygones de sol et plafond existants
    const tilesToRemove = scene.children.filter(c =>
        c.userData.type === 'floor-tile' || c.userData.type === 'ceiling-tile' ||
        c.userData.type === 'floor-polygon' || c.userData.type === 'ceiling-polygon'
    );
    tilesToRemove.forEach(tile => {
        scene.remove(tile);
        if (tile.geometry) tile.geometry.dispose();
        if (tile.material) {
            if (tile.material.map) tile.material.map.dispose();
            tile.material.dispose();
        }
    });

    console.log('   🧹 Scène nettoyée avant restauration');

    // 1. Restaurer les paramètres globaux
    wallHeight = projectData.wallHeight || 2.5;
    wallThickness = projectData.wallThickness || 0.2;
    gridSize = projectData.gridSize || 1;
    if (projectData.wallIdCounter) {
        wallIdCounter = projectData.wallIdCounter;
    }

    // Mettre à jour les sliders de l'UI (affichage en cm)
    const whEl = document.getElementById('wall-height');
    if (whEl) { whEl.value = wallHeight; }
    const whvEl = document.getElementById('wall-height-value');
    if (whvEl) { whvEl.textContent = Math.round(wallHeight * 100); }
    const wtEl = document.getElementById('wall-thickness');
    if (wtEl) { wtEl.value = wallThickness; }
    const wtvEl = document.getElementById('wall-thickness-value');
    if (wtvEl) { wtvEl.textContent = Math.round(wallThickness * 100); }
    const gsEl = document.getElementById('grid-size');
    if (gsEl) { gsEl.value = gridSize; }
    const gsvEl = document.getElementById('grid-size-value');
    if (gsvEl) { gsvEl.textContent = Math.round(gridSize * 100); }
    const gsv2El = document.getElementById('grid-size-value-2');
    if (gsv2El) { gsv2El.textContent = Math.round(gridSize * 100); }

    // 2. Restaurer les murs avec leurs textures
    if (projectData.walls && projectData.walls.length > 0) {
        let loadedCount = 0;
        for (const w of projectData.walls) {
            // Murs fusionnés : reconstruire depuis geometryJSON
            if (w.isMerged && w.geometryJSON) {
                try {
                    const loader = new THREE.BufferGeometryLoader();
                    const geo = loader.parse(w.geometryJSON);
                    let maxMatIdx = 0;
                    if (geo.groups) {
                        geo.groups.forEach(g => { maxMatIdx = Math.max(maxMatIdx, g.materialIndex); });
                    }
                    const materials = [];
                    for (let i = 0; i <= maxMatIdx; i++) {
                        // Recréer le polygonOffset différencié par mur source (6 faces par mur)
                        const sourceWallIdx = Math.floor(i / 6);
                        const pof = 1 + sourceWallIdx * 0.3;
                        materials.push(new THREE.MeshStandardMaterial({
                            color: 0xcccccc, side: THREE.DoubleSide, roughness: 0.4, metalness: 0,
                            polygonOffset: true,
                            polygonOffsetFactor: pof,
                            polygonOffsetUnits: pof
                        }));
                    }
                    const mesh = new THREE.Mesh(geo, materials);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    mesh.userData.type = 'merged-wall';
                    mesh.userData.editorName = w.name;
                    mesh.userData.isMerged = true;
                    mesh.userData.isEnvironment = true;
                    mesh.userData.wallId = w.id;
                    mesh.userData.sourceWallCount = w.sourceWallCount || 0;
                    scene.add(mesh);
                    selectableObjects.push(mesh);
                    const mergedWallObj = {
                        start: null, end: null, mesh: mesh,
                        name: w.name, id: w.id, isMerged: true
                    };
                    // Restaurer le polygone intérieur
                    if (w.roomPolygon && w.roomPolygon.length >= 3) {
                        mergedWallObj.roomPolygon = w.roomPolygon;
                        mesh.userData.roomPolygon = w.roomPolygon;
                    }
                    floorPlanWalls.push(mergedWallObj);
                    loadedCount++;
                    // Restaurer les textures du mur fusionné
                    if (w.textureInfo) {
                        const mergedWall = floorPlanWalls[floorPlanWalls.length - 1];
                        await restoreWallTextures(mergedWall, w.textureInfo);
                    }
                    console.log(`  ✅ Mur fusionné "${w.name}" restauré`);
                } catch (e) {
                    console.warn(`⚠️ Erreur restauration mur fusionné "${w.name}":`, e);
                }
                continue;
            }
            // Murs normaux : recréer depuis start/end
            if (w.start && w.end) {
                const wallName = w.name || `Mur_${loadedCount + 1}`;
                const wallId = w.id || (loadedCount + 1);
                const wall = createWallSegmentWithId(w.start, w.end, wallName, wallId);
                loadedCount++;

                // Restaurer les textures du mur
                if (wall && w.textureInfo) {
                    await restoreWallTextures(wall, w.textureInfo);
                }
            }
        }
        if (!projectData.wallIdCounter && loadedCount > 0) {
            wallIdCounter = loadedCount + 1;
        }
        // Mettre à jour tous les biseaux après chargement des murs
        updateAllWallMiters();
        console.log(`  ✅ ${floorPlanWalls.length} murs restaurés (dont ${floorPlanWalls.filter(w=>w.isMerged).length} fusionnés)`);
    }

    // 2b. Restaurer le roomIdCounter
    if (projectData.roomIdCounter) {
        roomIdCounter = projectData.roomIdCounter;
    }

    // 2c. Restaurer les pièces (rooms) — sans re-créer les murs
    if (projectData.rooms && projectData.rooms.length > 0) {
        for (const roomData of projectData.rooms) {
            const roomId = roomData.id || roomIdCounter++;

            // Retrouver les murs associés par wallIds
            const roomWalls = [];
            if (roomData.wallIds) {
                roomData.wallIds.forEach(wid => {
                    const w = floorPlanWalls.find(fw => fw.id === wid);
                    if (w) { w.isRoomWall = true; roomWalls.push(w); }
                });
            }

            let roomMesh, polygon;

            if (roomData.polygon && roomData.polygon.length >= 3) {
                // Pièce polygonale (arrondie ou issue d'opérations booléennes)
                polygon = roomData.polygon;
                roomMesh = createPolygonRoomMesh(polygon);
            } else if (roomData.bounds) {
                // Pièce rectangulaire classique
                const b = roomData.bounds;
                polygon = [
                    { x: b.minX, z: b.minZ }, { x: b.maxX, z: b.minZ },
                    { x: b.maxX, z: b.maxZ }, { x: b.minX, z: b.maxZ }
                ];
                roomMesh = createRoomMesh(b.minX, b.maxX, b.minZ, b.maxZ);
            } else {
                continue; // Données invalides
            }

            // Calculer les bounds depuis le polygone
            let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
            polygon.forEach(p => {
                minX = Math.min(minX, p.x);
                maxX = Math.max(maxX, p.x);
                minZ = Math.min(minZ, p.z);
                maxZ = Math.max(maxZ, p.z);
            });

            const room = {
                id: roomId,
                walls: roomWalls,
                mesh: roomMesh,
                bounds: { minX, maxX, minZ, maxZ },
                polygon: polygon,
                rounding: roomData.rounding || 0,
                selected: false
            };
            floorPlanRooms.push(room);
            scene.add(roomMesh);
        }
        console.log(`  ✅ ${floorPlanRooms.length} pièces restaurées`);
    }

    // 3. Restaurer les dalles de sol
    if (projectData.floorTiles && projectData.floorTiles.length > 0) {
        for (const tileData of projectData.floorTiles) {
            await restoreFloorTile(tileData);
        }
        console.log(`  ✅ ${projectData.floorTiles.length} dalles de sol restaurées`);
    }

    // 4. Restaurer les dalles de plafond
    if (projectData.ceilingTiles && projectData.ceilingTiles.length > 0) {
        for (const tileData of projectData.ceilingTiles) {
            await restoreCeilingTile(tileData);
        }
        console.log(`  ✅ ${projectData.ceilingTiles.length} dalles de plafond restaurées`);
    }

    // 4b. Restaurer les polygones de sol
    if (projectData.floorPolygons && projectData.floorPolygons.length > 0) {
        for (const polyData of projectData.floorPolygons) {
            await restoreFloorPolygon(polyData);
        }
        console.log(`  ✅ ${projectData.floorPolygons.length} polygones de sol restaurés`);
    }

    // 4c. Restaurer les polygones de plafond
    if (projectData.ceilingPolygons && projectData.ceilingPolygons.length > 0) {
        for (const polyData of projectData.ceilingPolygons) {
            await restoreCeilingPolygon(polyData);
        }
        console.log(`  ✅ ${projectData.ceilingPolygons.length} polygones de plafond restaurés`);
    }

    // 5. Restaurer les objets importés
    if (projectData.importedObjects && projectData.importedObjects.length > 0) {
        for (const objData of projectData.importedObjects) {
            await restoreImportedObject(objData);
        }
        console.log(`  ✅ ${projectData.importedObjects.length} objets importés en cours de restauration`);
    }

    // 6. Restaurer les lumières personnalisées
    if (projectData.lights && projectData.lights.length > 0) {
        // Supprimer les lumières non-default existantes
        const toRemove = customLights.filter(l => !l.userData.isDefault);
        toRemove.forEach(l => {
            scene.remove(l);
            const idx = customLights.indexOf(l);
            if (idx > -1) customLights.splice(idx, 1);
        });

        // Restaurer les lumières sauvegardées
        restoreLightsFromData(projectData.lights);
        console.log(`  ✅ ${projectData.lights.length} lumières restaurées`);
    }

    // Restaurer l'intensité de la lumière ambiante
    if (projectData.ambientLightIntensity !== undefined && window.defaultAmbientLight) {
        window.defaultAmbientLight.intensity = projectData.ambientLightIntensity;
        window.defaultAmbientLight.userData.savedIntensity = projectData.ambientLightIntensity;
        console.log(`  💡 Lumière ambiante restaurée: intensité = ${projectData.ambientLightIntensity}`);
    }

    // Charger le transform de Naby
    if (projectData.nabyTransform) {
        savedNabyTransform = projectData.nabyTransform;
        console.log('  📋 nabyTransform trouvé dans les données:', JSON.stringify(savedNabyTransform.scale));
        // Si Naby est déjà chargée (le GLB a terminé avant le projet), appliquer immédiatement
        if (babyModel) {
            babyModel.position.set(savedNabyTransform.position.x, savedNabyTransform.position.y, savedNabyTransform.position.z);
            babyModel.rotation.set(savedNabyTransform.rotation.x || 0, savedNabyTransform.rotation.y || 0, savedNabyTransform.rotation.z || 0);
            // Valider l'échelle si nabyRawHeight est connu
            if (nabyRawHeight) {
                const restoredHeight = savedNabyTransform.scale.y * nabyRawHeight;
                if (restoredHeight >= 0.1 && restoredHeight <= 5.0) {
                    babyModel.scale.set(savedNabyTransform.scale.x, savedNabyTransform.scale.y, savedNabyTransform.scale.z);
                } else {
                    const safeScale = 1.70 / nabyRawHeight;
                    babyModel.scale.set(safeScale, safeScale, safeScale);
                    console.warn('  ⚠️ Échelle invalide corrigée → 1.70m');
                }
            } else {
                babyModel.scale.set(savedNabyTransform.scale.x, savedNabyTransform.scale.y, savedNabyTransform.scale.z);
            }
            babyModel.updateMatrixWorld(true);
        }
        console.log('  ✅ Transform de Naby restauré');
    } else {
        console.log('  ℹ️ Pas de nabyTransform dans les données du projet');
    }

    // Charger la position de spawn du joueur
    if (projectData.spawn) {
        spawnPosition = {
            x: projectData.spawn.position.x,
            y: projectData.spawn.position.y,
            z: projectData.spawn.position.z
        };
        spawnRotationY = projectData.spawn.rotationY || 0;
        spawnSaved = true;
        console.log(`  ✅ Position de spawn restaurée: (${spawnPosition.x.toFixed(2)}, ${spawnPosition.y.toFixed(2)}, ${spawnPosition.z.toFixed(2)})`);
    }

    // Vitesses de déplacement — valeurs fixes (ne plus charger depuis IndexedDB)

    // Charger les zones d'interaction
    if (projectData.interactionZones && projectData.interactionZones.length > 0) {
        clearAllInteractionZones();
        loadInteractionZonesFromData(projectData.interactionZones);
        interactionZoneIdCounter = projectData.interactionZoneIdCounter || interactionZones.length;
        console.log(`  ✅ Zone(s) d'interaction restaurée(s): ${interactionZones.length}`);
    }

    // Charger les pistes audio
    if (projectData.audioTracks && projectData.audioTracks.length > 0) {
        await restoreAudioTracks(projectData.audioTracks);
        audioTrackIdCounter = projectData.audioTrackIdCounter || audioTrackIdCounter;
        console.log(`  ✅ Piste(s) audio restaurée(s): ${projectData.audioTracks.length}`);
    }

    console.log('📂 Projet chargé depuis IndexedDB !');
}

// Restaurer les textures d'un mur
async function restoreWallTextures(wall, textureInfoData) {
    const textureLoader = new THREE.TextureLoader();

    for (const faceIdx in textureInfoData) {
        const info = textureInfoData[faceIdx];
        if (!info || !info.textureBlobId) continue;

        try {
            const blobRecord = await RoomEditorDB.get(RoomEditorDB.STORE_BLOBS, info.textureBlobId);
            if (!blobRecord || !blobRecord.data) continue;

            const imageDataURL = blobRecord.data;

            const tex = await new Promise((resolve, reject) => {
                textureLoader.load(imageDataURL, resolve, undefined, reject);
            });

            tex.colorSpace = THREE.SRGBColorSpace;
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;

            // Calculer les dimensions de la face pour les repeats de texture
            let faceWidth, faceHeight;
            if (wall.isMerged || !wall.start || !wall.end) {
                // Mur fusionné : utiliser les dimensions spécifiques de chaque face
                const faceDims = getMergedFaceDimensions(wall.mesh, parseInt(faceIdx));
                faceWidth = faceDims.width;
                faceHeight = faceDims.height;
            } else {
                // Mur normal : longueur du mur et hauteur standard
                const dx = wall.end.x - wall.start.x;
                const dz = wall.end.z - wall.start.z;
                faceWidth = Math.sqrt(dx * dx + dz * dz);
                faceHeight = wallHeight;
                // Ajuster pour les faces de tranche
                const fi = parseInt(faceIdx);
                if (fi === 0 || fi === 1) {
                    faceWidth = wallThickness;
                } else if (fi === 2 || fi === 3) {
                    faceHeight = wallThickness;
                }
            }

            if (info.type === 'tile') {
                const repeatX = faceWidth / info.tileSize;
                const repeatY = faceHeight / info.tileSize;
                tex.repeat.set(repeatX, repeatY);
            } else {
                tex.wrapT = THREE.ClampToEdgeWrapping;
                const img = tex.image;
                const aspectRatio = img ? (img.width / img.height) : 1;
                const panelWidth = faceHeight * aspectRatio;
                const repeatX = faceWidth / panelWidth;
                tex.repeat.set(repeatX, 1);
            }

            // Récupérer le polygonOffset existant (différencié par mur source pour les murs fusionnés)
            const existingMat = Array.isArray(wall.mesh.material) ? wall.mesh.material[parseInt(faceIdx)] : null;
            const pof = (existingMat && existingMat.polygonOffsetFactor) || 1;
            const pou = (existingMat && existingMat.polygonOffsetUnits) || 1;

            const texMat = new THREE.MeshStandardMaterial({
                map: tex,
                side: THREE.DoubleSide,  // DoubleSide pour cohérence
                roughness: 0.5,
                metalness: 0,
                polygonOffset: true,
                polygonOffsetFactor: pof,
                polygonOffsetUnits: pou
            });

            ensureMultiMaterial(wall);
            if (existingMat) {
                if (existingMat.map) existingMat.map.dispose();
                existingMat.dispose();
            }
            wall.mesh.material[parseInt(faceIdx)] = texMat;

            if (!wall.textureInfo) wall.textureInfo = {};
            wall.textureInfo[faceIdx] = {
                type: info.type,
                tileSize: info.tileSize,
                imageDataURL: imageDataURL,
                fileName: info.fileName
            };

        } catch (e) {
            console.warn(`⚠️ Échec restauration texture face ${faceIdx} de ${wall.name}:`, e);
        }
    }
}

// Restaurer une dalle de sol
async function restoreFloorTile(tileData) {
    if (!tileData.textureBlobId) return;

    try {
        const blobRecord = await RoomEditorDB.get(RoomEditorDB.STORE_BLOBS, tileData.textureBlobId);
        if (!blobRecord || !blobRecord.data) return;

        const imageDataURL = blobRecord.data;
        const textureLoader = new THREE.TextureLoader();

        const tex = await new Promise((resolve, reject) => {
            textureLoader.load(imageDataURL, resolve, undefined, reject);
        });

        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        const repeat = 1 / (tileData.tileSize || 1);
        tex.repeat.set(repeat, repeat);

        const geometry = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshStandardMaterial({
            map: tex,
            side: THREE.DoubleSide,
            roughness: 0.5,
            metalness: 0
        });

        const tile = new THREE.Mesh(geometry, material);
        tile.rotation.x = -Math.PI / 2;
        tile.position.set(tileData.x, 0.02, tileData.z);
        tile.receiveShadow = true;
        tile.userData.type = 'floor-tile';
        tile.userData.isEnvironment = true;
        tile.userData.textureDataURL = imageDataURL;
        tile.userData.tileSize = tileData.tileSize || 1;
        scene.add(tile);

    } catch (e) {
        console.warn('⚠️ Échec restauration dalle de sol:', e);
    }
}

// Restaurer une dalle de plafond
async function restoreCeilingTile(tileData) {
    if (!tileData.textureBlobId) return;

    try {
        const blobRecord = await RoomEditorDB.get(RoomEditorDB.STORE_BLOBS, tileData.textureBlobId);
        if (!blobRecord || !blobRecord.data) return;

        const imageDataURL = blobRecord.data;
        const textureLoader = new THREE.TextureLoader();

        const tex = await new Promise((resolve, reject) => {
            textureLoader.load(imageDataURL, resolve, undefined, reject);
        });

        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        const repeat = 1 / (tileData.tileSize || 1);
        tex.repeat.set(repeat, repeat);

        const geometry = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshStandardMaterial({
            map: tex,
            side: THREE.DoubleSide,
            roughness: 0.5,
            metalness: 0
        });

        const tile = new THREE.Mesh(geometry, material);
        tile.rotation.x = Math.PI / 2;
        tile.position.set(tileData.x, wallHeight - 0.02, tileData.z);
        tile.receiveShadow = true;
        tile.userData.type = 'ceiling-tile';
        tile.userData.isEnvironment = true;
        tile.userData.textureDataURL = imageDataURL;
        tile.userData.tileSize = tileData.tileSize || 1;
        scene.add(tile);

    } catch (e) {
        console.warn('⚠️ Échec restauration dalle de plafond:', e);
    }
}

// Restaurer un polygone de sol
async function restoreFloorPolygon(polyData) {
    if (!polyData.textureBlobId || !polyData.polygonPoints) return;

    try {
        const blobRecord = await RoomEditorDB.get(RoomEditorDB.STORE_BLOBS, polyData.textureBlobId);
        if (!blobRecord || !blobRecord.data) return;

        const imageDataURL = blobRecord.data;
        const polygon = polyData.polygonPoints;
        if (polygon.length < 3) return;

        const textureLoader = new THREE.TextureLoader();
        const tex = await new Promise((resolve, reject) => {
            textureLoader.load(imageDataURL, resolve, undefined, reject);
        });

        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1, 1);

        // Créer le Shape à partir des points du polygone
        // Note: rotation.x = -PI/2 transforme local (x, y, 0) → world (x, 0, -y)
        // Donc on inverse le Z pour compenser : shape(x, -z) → world (x, 0, z)
        const shape = new THREE.Shape();
        shape.moveTo(polygon[0].x, -polygon[0].z);
        for (let i = 1; i < polygon.length; i++) {
            shape.lineTo(polygon[i].x, -polygon[i].z);
        }
        shape.lineTo(polygon[0].x, -polygon[0].z);

        const geometry = new THREE.ShapeGeometry(shape);

        // Recalculer les UVs pour le tiling de texture
        const posAttr = geometry.getAttribute('position');
        const uvAttr = geometry.getAttribute('uv');
        const tileSize = polyData.tileSize || 1;
        for (let i = 0; i < posAttr.count; i++) {
            // posAttr.y = -monde Z (inversé dans le Shape)
            uvAttr.setXY(i, posAttr.getX(i) / tileSize, -posAttr.getY(i) / tileSize);
        }
        uvAttr.needsUpdate = true;

        const material = new THREE.MeshStandardMaterial({
            map: tex,
            side: THREE.DoubleSide,
            roughness: 0.5,
            metalness: 0,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = 0.05;
        mesh.receiveShadow = true;
        mesh.userData.type = 'floor-polygon';
        mesh.userData.isEnvironment = true;
        mesh.userData.textureDataURL = imageDataURL;
        mesh.userData.tileSize = tileSize;
        mesh.userData.polygonPoints = polygon;
        scene.add(mesh);

    } catch (e) {
        console.warn('⚠️ Échec restauration polygone de sol:', e);
    }
}

// Restaurer un polygone de plafond
async function restoreCeilingPolygon(polyData) {
    if (!polyData.textureBlobId || !polyData.polygonPoints) return;

    try {
        const blobRecord = await RoomEditorDB.get(RoomEditorDB.STORE_BLOBS, polyData.textureBlobId);
        if (!blobRecord || !blobRecord.data) return;

        const imageDataURL = blobRecord.data;
        const polygon = polyData.polygonPoints;
        if (polygon.length < 3) return;

        const textureLoader = new THREE.TextureLoader();
        const tex = await new Promise((resolve, reject) => {
            textureLoader.load(imageDataURL, resolve, undefined, reject);
        });

        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1, 1);

        // Créer le Shape à partir des points du polygone
        const shape = new THREE.Shape();
        shape.moveTo(polygon[0].x, polygon[0].z);
        for (let i = 1; i < polygon.length; i++) {
            shape.lineTo(polygon[i].x, polygon[i].z);
        }
        shape.lineTo(polygon[0].x, polygon[0].z);

        const geometry = new THREE.ShapeGeometry(shape);

        // Recalculer les UVs pour le tiling de texture
        const posAttr = geometry.getAttribute('position');
        const uvAttr = geometry.getAttribute('uv');
        const tileSize = polyData.tileSize || 1;
        for (let i = 0; i < posAttr.count; i++) {
            uvAttr.setXY(i, posAttr.getX(i) / tileSize, posAttr.getY(i) / tileSize);
        }
        uvAttr.needsUpdate = true;

        const material = new THREE.MeshStandardMaterial({
            map: tex,
            side: THREE.DoubleSide,
            roughness: 0.5,
            metalness: 0
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = Math.PI / 2;
        mesh.position.y = wallHeight - 0.02;
        mesh.receiveShadow = true;
        mesh.userData.type = 'ceiling-polygon';
        mesh.userData.isEnvironment = true;
        mesh.userData.textureDataURL = imageDataURL;
        mesh.userData.tileSize = tileSize;
        mesh.userData.polygonPoints = polygon;
        scene.add(mesh);

    } catch (e) {
        console.warn('⚠️ Échec restauration polygone de plafond:', e);
    }
}

// Restaurer un objet importé (GLB)
async function restoreImportedObject(objData) {
    console.log(`📦 Restauration objet: ${objData.editorName}`);
    console.log(`   Position sauvegardée: ${JSON.stringify(objData.position)}`);
    console.log(`   Rotation sauvegardée: ${JSON.stringify(objData.rotation)}`);
    console.log(`   Scale sauvegardée: ${JSON.stringify(objData.scale)}`);

    if (!objData.fileDataBlobId) {
        console.warn(`⚠️ Impossible de restaurer ${objData.editorName} - pas de référence blob`);
        return;
    }

    try {
        const blobRecord = await RoomEditorDB.get(RoomEditorDB.STORE_BLOBS, objData.fileDataBlobId);
        if (!blobRecord || !blobRecord.data) {
            console.warn(`⚠️ Impossible de restaurer ${objData.editorName} - données blob manquantes`);
            return;
        }

        const fileDataBase64 = blobRecord.data;

        // Convertir base64 en Blob URL pour GLTFLoader
        const base64Data = fileDataBase64.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'model/gltf-binary' });
        const url = URL.createObjectURL(blob);

        // Ajouter fileData pour que l'objet puisse être re-sauvegardé
        const dataWithFileData = { ...objData, fileData: fileDataBase64 };

        // Utiliser la fonction existante
        loadObjectFromURL(url, dataWithFileData);

    } catch (e) {
        console.warn(`⚠️ Échec restauration objet ${objData.editorName}:`, e);
    }
}

// Restaurer les lumières depuis les données sauvegardées
function restoreLightsFromData(lightsData) {
    lightsData.forEach(data => {
        let light;
        switch (data.type) {
            case 'point':
                light = new THREE.PointLight(data.color, data.intensity, 50);
                break;
            case 'directional':
                light = new THREE.DirectionalLight(data.color, data.intensity);
                if (data.target) {
                    light.target.position.set(data.target.x, data.target.y, data.target.z);
                    scene.add(light.target);
                }
                break;
            case 'spot':
                light = new THREE.SpotLight(data.color, data.intensity, 50, data.angle || Math.PI / 6, data.penumbra || 0);
                if (data.target) {
                    light.target.position.set(data.target.x, data.target.y, data.target.z);
                    scene.add(light.target);
                }
                break;
            default:
                light = new THREE.PointLight(data.color, data.intensity, 50);
        }
        light.position.set(data.position.x, data.position.y, data.position.z);
        light.castShadow = true;
        light.shadow.bias = -0.002;
        light.shadow.normalBias = 0.02;
        if (light.shadow.mapSize) {
            light.shadow.mapSize.width = 1024;
            light.shadow.mapSize.height = 1024;
        }
        light.userData.id = `custom-light-${lightIdCounter++}`;
        light.userData.type = data.type;
        light.userData.name = data.name || `Lumière ${lightIdCounter}`;
        light.userData.positionLocked = data.positionLocked || false;
        light.userData.isOn = data.isOn !== false;
        light.userData.savedIntensity = data.intensity;
        if (!light.userData.isOn) {
            light.intensity = 0;
        }
        scene.add(light);
        if (typeof createLightHelper === 'function') {
            createLightHelper(light);
        }
        customLights.push(light);
    });
    if (typeof updateLightsList === 'function') {
        updateLightsList();
    }
}

// Créer un mur avec un ID et nom spécifiques (pour le chargement)
function createWallSegmentWithId(start, end, name, id) {
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.sqrt(dx * dx + dz * dz);

    if (length < 0.1) return null;

    // Le mur dépasse de wallThickness/2 de chaque côté (même logique que createWallSegment)
    const extendedLength = length + wallThickness;

    const geometry = new THREE.BoxGeometry(extendedLength, wallHeight, wallThickness);
    const material = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        side: THREE.DoubleSide,
        roughness: 0.4,
        metalness: 0,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1
    });

    const mesh = new THREE.Mesh(geometry, material);
    const midX = (start.x + end.x) / 2;
    const midZ = (start.z + end.z) / 2;
    mesh.position.set(midX, wallHeight / 2, midZ);

    const angle = Math.atan2(dz, dx);
    mesh.rotation.y = -angle;

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.type = 'floor-plan-wall';
    mesh.userData.isEnvironment = true;
    mesh.userData.editorName = name;
    mesh.userData.wallId = id;

    scene.add(mesh);

    const wall = {
        start: { x: start.x, z: start.z },
        end: { x: end.x, z: end.z },
        mesh: mesh,
        name: name,
        id: id
    };

    floorPlanWalls.push(wall);
    addWallToObjectList(wall);

    return wall;
}

function makeObjectsSelectable() {
    // NE PAS vider la liste ! Les objets chargés de manière asynchrone
    // s'ajoutent directement. On va plutôt reconstruire une liste unique.
    const newSelectableObjects = [];

    // Créer un Set pour éviter les doublons
    const addedObjects = new Set();

    // D'abord, garder tous les objets déjà dans la liste
    selectableObjects.forEach(obj => {
        if (obj && !addedObjects.has(obj.uuid)) {
            newSelectableObjects.push(obj);
            addedObjects.add(obj.uuid);
        }
    });

    // Puis ajouter babyModel s'il existe et n'est pas déjà dans la liste
    if (babyModel && !addedObjects.has(babyModel.uuid)) {
        babyModel.userData.editorName = 'Naby';
        newSelectableObjects.push(babyModel);
        addedObjects.add(babyModel.uuid);

        // Ajouter aussi tous les enfants du modèle pour faciliter la sélection
        babyModel.traverse((child) => {
            if (child.isMesh && !addedObjects.has(child.uuid)) {
                child.userData.editorName = 'Naby';
                newSelectableObjects.push(child);
                addedObjects.add(child.uuid);
            }
        });
    }

    // Ajouter les autres objets s'ils existent
    if (rug && !addedObjects.has(rug.uuid)) {
        rug.userData.editorName = 'Tapis';
        newSelectableObjects.push(rug);
        addedObjects.add(rug.uuid);
    }

    if (groundMesh && !addedObjects.has(groundMesh.uuid)) {
        groundMesh.userData.editorName = 'Sol';
        newSelectableObjects.push(groundMesh);
        addedObjects.add(groundMesh.uuid);
    }

    const ceiling = scene.getObjectByName('ceiling');
    if (ceiling && !addedObjects.has(ceiling.uuid)) {
        ceiling.userData.editorName = 'Plafond';
        newSelectableObjects.push(ceiling);
        addedObjects.add(ceiling.uuid);
    }

    // Ajouter les murs de la pièce par défaut
    walls.forEach((wall, index) => {
        if (wall && !addedObjects.has(wall.uuid)) {
            wall.userData.editorName = `Mur_Pièce_${index + 1}`;
            newSelectableObjects.push(wall);
            addedObjects.add(wall.uuid);
        }
    });

    // Ajouter les murs tracés dans le plan de pièce (floor plan)
    floorPlanWalls.forEach(wall => {
        if (wall && wall.mesh && !addedObjects.has(wall.mesh.uuid)) {
            wall.mesh.userData.editorName = wall.name || `Mur_${wall.id || 0}`;
            newSelectableObjects.push(wall.mesh);
            addedObjects.add(wall.mesh.uuid);
        }
    });



    // Remplacer le tableau selectableObjects par le nouveau
    selectableObjects.length = 0;
    selectableObjects.push(...newSelectableObjects);

    // Sauvegarder les états initiaux de tous les objets
    selectableObjects.forEach(obj => {
        if (!initialTransforms.has(obj)) {
            initialTransforms.set(obj, {
                position: obj.position.clone(),
                rotation: obj.rotation.clone(),
                scale: obj.scale.clone()
            });
        }
    });

    console.log(`📦 ${selectableObjects.length} objets rendus sélectionnables`);
}

// ==================== INDEXEDDB PERSISTENCE ====================

const RoomEditorDB = {
    DB_NAME: 'RoomEditorDB',
    DB_VERSION: 1,
    _db: null,

    // Store names
    STORE_PROJECTS: 'projects',      // Full project metadata
    STORE_BLOBS: 'blobs',            // Large binary data (GLB files, texture images)

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
            request.onsuccess = (event) => {
                this._db = event.target.result;
                resolve(this._db);
            };
            request.onerror = (event) => {
                console.error('IndexedDB open error:', event.target.error);
                reject(event.target.error);
            };
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

        // Fallback: si le blob n'est pas dans IndexedDB, le charger depuis scene_data/
        if (!result && storeName === this.STORE_BLOBS && key) {
            try {
                console.log(`📥 Blob ${key} absent du cache, chargement depuis scene_data/...`);
                const response = await fetch(`scene_data/blobs/${key}.json`);
                if (response.ok) {
                    const blobData = await response.json();
                    // Sauvegarder dans IndexedDB pour le prochain chargement
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

// Fonction de hash simple pour créer des IDs de blobs uniques
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

// ==================== SAUVEGARDE / CHARGEMENT PERSISTANT ====================

/**
 * Sauvegarder l'état des objets importés dans localStorage
 */
function saveImportedObjectsToStorage() {
    const objectsData = importedObjects.map(obj => {
        return {
            fileName: obj.userData.fileName,
            editorName: obj.userData.editorName,
            position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
            rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
            scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
            customRoughness: obj.userData.customRoughness, // Sauvegarder le roughness personnalisé
            isCharacter: obj.userData.isCharacter || false,
            armatureScaleY: obj.userData.armatureScaleY || 1
            // NE PAS sauvegarder fileData - fichiers GLB trop volumineux pour localStorage
        };
    });

    try {
        localStorage.setItem(currentRoomName + '_importedObjects', JSON.stringify(objectsData));
        console.log(`💾 ${objectsData.length} objet(s) sauvegardé(s)`);
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            console.warn('⚠️ Quota localStorage dépassé - objets importés non sauvegardés');
        } else {
            console.error('❌ Erreur sauvegarde:', e);
        }
    }
}

/**
 * Sauvegarder l'état des lumières personnalisées dans localStorage
 */
function saveCustomLightsToStorage() {
    const lightsData = customLights
        .filter(light => !light.userData.isDefault) // Ne pas sauvegarder la lumière ambiante par défaut
        .map(light => {
            const data = {
                type: light.userData.type,
                position: { x: light.position.x, y: light.position.y, z: light.position.z },
                color: '#' + light.color.getHexString(),
                intensity: light.intensity,
                positionLocked: light.userData.positionLocked || false,
                isOn: light.userData.isOn !== false
            };

            // Propriétés spécifiques au type de lumière
            if (light.userData.type === 'spot') {
                data.angle = light.angle;
                data.penumbra = light.penumbra;
                data.target = { x: light.target.position.x, y: light.target.position.y, z: light.target.position.z };
            }

            // Sauvegarder la cible pour lumières directionnelles
            if (light.userData.type === 'directional' && light.target) {
                data.target = { x: light.target.position.x, y: light.target.position.y, z: light.target.position.z };
            }

            return data;
        });

    localStorage.setItem(currentRoomName + '_customLights', JSON.stringify(lightsData));
    console.log(`💾 ${lightsData.length} lumière(s) personnalisée(s) sauvegardée(s)`);
}

/**
 * Charger les objets importés depuis localStorage
 */
function loadImportedObjectsFromStorage() {
    const savedData = localStorage.getItem(currentRoomName + '_importedObjects');
    if (!savedData) {
        console.log('Aucun objet sauvegardé trouvé');
        return;
    }

    try {
        const objectsData = JSON.parse(savedData);
        console.log(`📂 Tentative de chargement de ${objectsData.length} objet(s) sauvegardé(s)`);

        objectsData.forEach((data, index) => {
            if (data.fileData) {
                // Si les données du fichier sont sauvegardées, recréer le blob
                const byteCharacters = atob(data.fileData.split(',')[1]);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'model/gltf-binary' });
                const url = URL.createObjectURL(blob);

                loadObjectFromURL(url, data);
            } else {
                console.warn(`⚠️ Impossible de charger ${data.editorName} - données du fichier manquantes`);
            }
        });
    } catch (e) {
        console.error('Erreur lors du chargement des objets sauvegardés:', e);
    }
}

/**
 * Charger les lumières personnalisées depuis localStorage
 */
function loadCustomLightsFromStorage() {
    const savedData = localStorage.getItem(currentRoomName + '_customLights');
    if (!savedData) {
        console.log('Aucune lumière sauvegardée trouvée');
        return;
    }

    try {
        const lightsData = JSON.parse(savedData);
        console.log(`📂 Chargement de ${lightsData.length} lumière(s) sauvegardée(s)`);

        lightsData.forEach(data => {
            let light;

            // Créer le bon type de lumière
            switch (data.type) {
                case 'point':
                    light = new THREE.PointLight(data.color, data.intensity, 50);
                    break;
                case 'directional':
                    light = new THREE.DirectionalLight(data.color, data.intensity);
                    if (data.target) {
                        light.target.position.set(data.target.x, data.target.y, data.target.z);
                        scene.add(light.target);
                    }
                    break;
                case 'spot':
                    light = new THREE.SpotLight(data.color, data.intensity, 50, data.angle || Math.PI / 6, data.penumbra || 0);
                    if (data.target) {
                        light.target.position.set(data.target.x, data.target.y, data.target.z);
                        scene.add(light.target);
                    }
                    break;
                default:
                    light = new THREE.PointLight(data.color, data.intensity, 50);
            }

            // Restaurer la position
            light.position.set(data.position.x, data.position.y, data.position.z);

            // Configurer les métadonnées
            light.castShadow = true;
            light.userData.id = `custom-light-${lightIdCounter++}`;
            light.userData.type = data.type;
            light.userData.name = data.name || `Lumière ${lightIdCounter}`; // Nom par défaut si manquant
            light.userData.positionLocked = data.positionLocked || false;
            light.userData.isOn = data.isOn !== false;
            light.userData.savedIntensity = data.intensity;

            // Appliquer l'état allumé/éteint
            if (!light.userData.isOn) {
                light.intensity = 0;
            }

            scene.add(light);
            createLightHelper(light);
            customLights.push(light);
        });

        updateLightsList();
        console.log(`✅ ${lightsData.length} lumière(s) restaurée(s)`);
    } catch (e) {
        console.error('Erreur lors du chargement des lumières sauvegardées:', e);
    }
}

/**
 * Fonction auxiliaire pour charger un objet depuis une URL
 */
function loadObjectFromURL(url, data) {
    console.log(`📦 Chargement objet: ${data.editorName}`);
    console.log(`   Position: ${JSON.stringify(data.position)}`);
    console.log(`   Rotation: ${JSON.stringify(data.rotation)}`);
    console.log(`   Scale: ${JSON.stringify(data.scale)}`);

    const loader = new THREE.GLTFLoader();
    loader.load(
        url,
        function(gltf) {
            importedObjectCounter++;
            const model = gltf.scene;

            // Restaurer la position, rotation, échelle (avec valeurs par défaut si manquantes)
            if (data.position) {
                model.position.set(data.position.x || 0, data.position.y || 0, data.position.z || 0);
            }
            if (data.rotation) {
                model.rotation.set(data.rotation.x || 0, data.rotation.y || 0, data.rotation.z || 0);
            }
            if (data.scale) {
                model.scale.set(data.scale.x || 1, data.scale.y || 1, data.scale.z || 1);
            }

            console.log(`   ✅ Appliqué - Pos: (${model.position.x.toFixed(2)}, ${model.position.y.toFixed(2)}, ${model.position.z.toFixed(2)})`);

            // Configurer les ombres et matériaux - MÊMES CORRECTIONS QUE LORS DE L'IMPORT INITIAL
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.frustumCulled = false; // Empêcher la disparition à l'approche

                    if (child.material) {
                        const mat = child.material;

                        // Convertir MeshBasicMaterial si nécessaire
                        if (mat.type === 'MeshBasicMaterial') {
                            child.material = new THREE.MeshStandardMaterial({
                                color: mat.color,
                                map: mat.map,
                                roughness: 0.7,
                                metalness: 0.1
                            });
                        }

                        // CORRECTION CRITIQUE: Configurer l'encodage sRGB pour la texture principale
                        if (child.material.map) {
                            child.material.map.encoding = THREE.sRGBEncoding;
                            child.material.map.needsUpdate = true;
                        }

                        // CORRECTION CRITIQUE: Metalness = 1 rend les objets comme des miroirs noirs
                        if (child.material.metalness === 1) {
                            console.log(`   ⚠️ CORRECTION: Metalness de ${data.editorName} forcé de 1 à 0`);
                            child.material.metalness = 0;
                        }

                        // Désactiver ou réduire l'effet de l'aoMap qui assombrit
                        if (child.material.aoMap) {
                            child.material.aoMapIntensity = 0.3; // Réduire l'intensité
                            console.log(`   ⚠️ aoMap détectée - intensité réduite à 0.3`);
                        }

                        child.material.needsUpdate = true;
                    }
                }
            });

            // Marquer le modèle
            model.userData.editorName = data.editorName;
            model.userData.isImported = true;
            model.userData.fileName = data.fileName;
            // Restaurer fileData pour pouvoir re-sauvegarder
            if (data.fileData) {
                model.userData.fileData = data.fileData;
            }
            // Restaurer customRoughness si présent
            if (data.customRoughness !== undefined) {
                model.userData.customRoughness = data.customRoughness;
            }

            // Restaurer le flag personnage et les propriétés associées
            if (data.isCharacter) {
                model.userData.isCharacter = true;

                // Mesurer la hauteur réelle par les os (inclut les transformations d'armature)
                model.updateMatrixWorld(true);
                const charBoneMeasure = measureCharacterByBones(model);
                if (charBoneMeasure) {
                    // Les os sont mesurés à l'échelle actuelle → diviser par scale pour obtenir scale=1
                    const sy = Math.abs(model.scale.y) || 1;
                    model.userData.referenceHeightAtScale1 = charBoneMeasure.height / sy;
                    model.userData.referenceWidthAtScale1 = charBoneMeasure.width / sy;
                    model.userData.referenceDepthAtScale1 = charBoneMeasure.depth / sy;
                } else {
                    // Fallback: estimation depuis Box3
                    const charRawBox = new THREE.Box3().setFromObject(model);
                    const charRawSize = charRawBox.getSize(new THREE.Vector3());
                    const sy = Math.abs(model.scale.y) || 1;
                    model.userData.referenceHeightAtScale1 = charRawSize.y / sy;
                    model.userData.referenceWidthAtScale1 = charRawSize.x / sy;
                    model.userData.referenceDepthAtScale1 = charRawSize.z / sy;
                }

                // Setup animation si le modèle en contient
                if (gltf.animations && gltf.animations.length > 0) {
                    const charMixer = new THREE.AnimationMixer(model);
                    const action = charMixer.clipAction(gltf.animations[0]);
                    action.play();
                    model.userData.mixer = charMixer;
                    model.userData.animations = gltf.animations;
                    console.log(`🎬 Animations restaurées pour ${data.editorName}: ${gltf.animations.length} clip(s)`);
                }

                importedCharacters.push(model);
            }

            scene.add(model);
            importedObjects.push(model);

            // Rendre sélectionnable
            selectableObjects.push(model);
            model.traverse((child) => {
                if (child.isMesh) {
                    child.userData.editorName = data.editorName;
                    if (data.isCharacter) child.userData.isCharacter = true;
                    selectableObjects.push(child);
                }
            });

            // Sauvegarder l'état initial
            initialTransforms.set(model, {
                position: model.position.clone(),
                rotation: model.rotation.clone(),
                scale: model.scale.clone()
            });

            scheduleUpdateObjectsList(); // Debounce: un seul appel après tous les objets
            if (data.isCharacter) {
                if (typeof updateImportedCharactersList === 'function') updateImportedCharactersList();
                createCharacterCollisionProxy(model);
            }
            console.log(`✅ ${data.editorName} restauré${data.isCharacter ? ' (personnage)' : ''}`);
        },
        undefined,
        function(error) {
            console.warn(`⚠️ Impossible de restaurer ${data.editorName}:`, error);
        }
    );
}

