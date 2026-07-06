/**
 * ============================================================
 * RESISTANCE — game/engine/build.js
 * Construction des murs et pièces, spawn du joueur, zones
 * ------------------------------------------------------------
 * Découpage mécanique de l'ancien scene-loader.js (07/2026).
 * Les modules game/engine/ se chargent DANS L'ORDRE :
 * state → db → build → audio → restore → bootstrap → player
 * ============================================================
 */

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
        color: 0xcccccc, side: THREE.FrontSide, roughness: 0.4, metalness: 0, // PERF : murs vus de l'interieur
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
            side: THREE.FrontSide, // PERF : murs vus de l'interieur uniquement
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


