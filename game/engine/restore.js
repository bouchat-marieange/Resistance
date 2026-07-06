/**
 * ============================================================
 * RESISTANCE — game/engine/restore.js
 * Restauration depuis les données de scène : textures,
 * dalles & polygones, objets importés (GLB), lumières
 * ------------------------------------------------------------
 * Découpage mécanique de l'ancien scene-loader.js (07/2026).
 * Les modules game/engine/ se chargent DANS L'ORDRE :
 * state → db → build → audio → restore → bootstrap → player
 * ============================================================
 */

// ==================== RESTAURATION DE TEXTURES ====================

async function restoreWallTextures(wall, textureInfoData) {
    for (const faceIdx in textureInfoData) {
        const info = textureInfoData[faceIdx];
        if (!info || !info.textureBlobId) continue;
        try {
            const _fallbackUrl = info.fileName ? 'images/textures/' + info.fileName : null;
            const cached = await _getCachedTexture(info.textureBlobId, _fallbackUrl);
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
                side: THREE.FrontSide, // PERF : murs vus de l'interieur uniquement (BoxGeometry, normales OK)
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
        // --- PERF : ombres optimisees ---
        // Une PointLight projette une ombre CUBIQUE = 6 rendus de la scene par lumiere
        // et par frame. Avec 6 PointLights (x6 faces) = 36 passes d'ombre/frame sur ~5M
        // triangles -> cause principale du lag. On desactive leurs ombres (comme l'editeur
        // le fait deja). Les Spot/Directional gardent l'ombre (1 passe) mais en map 512.
        if (light.isPointLight) {
            light.castShadow = false;
        } else {
            light.castShadow = true;
            light.shadow.bias = -0.002;
            light.shadow.normalBias = 0.02;
            if (light.shadow.mapSize) { light.shadow.mapSize.width = 512; light.shadow.mapSize.height = 512; }
        }
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


