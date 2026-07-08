/**
 * ============================================================
 * RESISTANCE — editor/floorplan/floorplan-zones.js
 * Zones d'interaction (dessin, édition, types de déclencheurs —
 * lien/vidéo/image/texte/défi). Le plus gros module : concern autonome.
 * ------------------------------------------------------------
 * Découpage mécanique de l'ancien editor-floorplan.js (E0-bis,
 * 07/2026), même méthode que game/engine/ (Phase 4) : frontières
 * de sections existantes, globales/fonctions inchangées.
 * ============================================================
 */

// ==================== ZONES D'INTERACTION ====================

function setZoneSurfaceMode(mode) {
    zoneSurfaceMode = mode;
    ['floor', 'ceiling', 'wall', 'object', 'character'].forEach(m => {
        const btn = document.getElementById('zone-mode-' + m);
        if (btn) {
            btn.classList.toggle('btn-primary', m === mode);
            btn.classList.toggle('btn-outline', m !== mode);
        }
    });
    deactivateZoneTool();
    const shapeTools = document.getElementById('zone-shape-tools');
    if (mode === 'object') {
        if (shapeTools) shapeTools.style.display = 'none';
        activateZoneTool('object-select');
    } else if (mode === 'character') {
        if (shapeTools) shapeTools.style.display = 'none';
        activateZoneTool('character-select');
    } else {
        if (shapeTools) shapeTools.style.display = '';
    }
    console.log(`🟦 Zone surface mode: ${mode}`);
}

function activateZoneTool(type) {
    if (isSpawnToolActive) deactivateSpawnTool();
    if (activeZoneTool) deactivateZoneTool();

    activeZoneTool = type;
    const canvas = renderer.domElement;

    if (type === 'character-select') {
        canvas.classList.add('game-cursor-zone-character');
    } else if (type === 'object-select') {
        canvas.classList.add('game-cursor-zone-object');
    } else if (zoneSurfaceMode === 'wall') {
        canvas.classList.add('game-cursor-zone-wall');
    } else {
        canvas.classList.add(type === 'rect' ? 'game-cursor-zone-rect' : 'game-cursor-zone-oval');
    }

    if (type === 'rect' || type === 'oval') {
        const btnId = type === 'rect' ? 'tool-zone-rect' : 'tool-zone-oval';
        document.getElementById(btnId).classList.remove('btn-outline');
        document.getElementById(btnId).classList.add('btn-primary');
    }

    console.log(`🟦 Outil zone ${type} activé (surface: ${zoneSurfaceMode})`);
}

function deactivateZoneTool() {
    if (!activeZoneTool) return;

    const canvas = renderer.domElement;
    canvas.classList.remove('game-cursor-zone-rect', 'game-cursor-zone-oval', 'game-cursor-zone-wall', 'game-cursor-zone-object', 'game-cursor-zone-character');

    // Restore buttons to outline
    const rectBtn = document.getElementById('tool-zone-rect');
    const ovalBtn = document.getElementById('tool-zone-oval');
    if (rectBtn) { rectBtn.classList.remove('btn-primary'); rectBtn.classList.add('btn-outline'); }
    if (ovalBtn) { ovalBtn.classList.remove('btn-primary'); ovalBtn.classList.add('btn-outline'); }

    // Clean up preview if drawing was in progress
    if (zonePreviewMesh) {
        scene.remove(zonePreviewMesh);
        zonePreviewMesh.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
        zonePreviewMesh = null;
    }
    isDrawingZone = false;
    zoneDrawStart = null;
    zoneDrawWallRef = null;
    activeZoneTool = null;

    console.log('🟦 Outil zone désactivé');
}

function cleanupZonePreview() {
    if (zonePreviewMesh) {
        scene.remove(zonePreviewMesh);
        zonePreviewMesh.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
        zonePreviewMesh = null;
    }
}

// --- Zone Drawing Mouse Handlers (Multi-Surface) ---

// --- Dispatcher: onZoneMouseDown ---
function onZoneMouseDown(event) {
    if (currentEditorMode !== 'game-setup' || !activeZoneTool) return;
    if (event.button !== 0) return;
    if (event.target !== renderer.domElement) return;

    const rect = renderer.domElement.getBoundingClientRect();
    editorMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    editorMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    editorRaycaster.setFromCamera(editorMouse, camera);

    if (zoneSurfaceMode === 'wall') { onZoneMouseDown_Wall(event); return; }
    if (zoneSurfaceMode === 'object') { onZoneMouseDown_Object(event); return; }
    if (zoneSurfaceMode === 'character') { onZoneMouseDown_Character(event); return; }

    // Floor or Ceiling mode
    const targetY = (zoneSurfaceMode === 'ceiling') ? (wallHeight - 0.02) : 0;
    const allObjects = [];
    scene.traverse(child => {
        if (child.isMesh && child.visible && !child.userData.isGizmo && !child.userData.isInteractionZone) {
            allObjects.push(child);
        }
    });
    const intersects = editorRaycaster.intersectObjects(allObjects, false);
    let hitPoint = null;
    let hitY = targetY;

    if (intersects.length > 0) {
        hitPoint = intersects[0].point.clone();
        const normal = intersects[0].face ? intersects[0].face.normal.clone() : new THREE.Vector3(0, 1, 0);
        intersects[0].object.updateMatrixWorld();
        normal.transformDirection(intersects[0].object.matrixWorld);
        hitY = Math.abs(normal.y) > 0.5 ? hitPoint.y : targetY;
    } else {
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -targetY);
        const pt = new THREE.Vector3();
        if (editorRaycaster.ray.intersectPlane(plane, pt)) { hitPoint = pt; hitY = targetY; }
    }
    if (!hitPoint) return;

    isDrawingZone = true;
    zoneDrawStart = { x: hitPoint.x, z: hitPoint.z, y: hitY };
    controls.enabled = false;
    event.preventDefault();
    event.stopPropagation();
}

// --- Wall mode mousedown ---
function onZoneMouseDown_Wall(event) {
    const wallMeshes = floorPlanWalls.map(w => w.mesh).filter(m => m);
    const intersects = editorRaycaster.intersectObjects(wallMeshes);
    if (intersects.length === 0) return;

    const hitInfo = intersects[0];
    const clickedMesh = hitInfo.object;
    const wall = floorPlanWalls.find(w => w.mesh === clickedMesh);
    if (!wall) return;

    const faceIndex = wall.isMerged ? getMergedWallFaceGroup(hitInfo) : getClickedFaceIndex(hitInfo);

    const faceNormals = [
        new THREE.Vector3(1,0,0), new THREE.Vector3(-1,0,0),
        new THREE.Vector3(0,1,0), new THREE.Vector3(0,-1,0),
        new THREE.Vector3(0,0,1), new THREE.Vector3(0,0,-1),
    ];
    const localNormal = faceNormals[faceIndex].clone();
    const worldNormal = localNormal.clone().applyEuler(clickedMesh.rotation).normalize();
    const facePlane = new THREE.Plane().setFromNormalAndCoplanarPoint(worldNormal, hitInfo.point);

    let localRight, localUp;
    if (faceIndex === 4 || faceIndex === 5) {
        localRight = new THREE.Vector3(1,0,0).applyEuler(clickedMesh.rotation).normalize();
        localUp = new THREE.Vector3(0,1,0);
        if (faceIndex === 5) localRight.negate();
    } else if (faceIndex === 0 || faceIndex === 1) {
        localRight = new THREE.Vector3(0,0,1).applyEuler(clickedMesh.rotation).normalize();
        localUp = new THREE.Vector3(0,1,0);
        if (faceIndex === 1) localRight.negate();
    } else {
        localRight = new THREE.Vector3(1,0,0).applyEuler(clickedMesh.rotation).normalize();
        localUp = new THREE.Vector3(0,0,1).applyEuler(clickedMesh.rotation).normalize();
        if (faceIndex === 3) localUp.negate();
    }

    const meshCenter = clickedMesh.position.clone();
    const offset = hitInfo.point.clone().sub(meshCenter);
    const u = offset.dot(localRight);
    const v = offset.dot(localUp);

    zoneDrawWallRef = { wall, faceIndex, facePlane, localRight, localUp, meshCenter };
    isDrawingZone = true;
    zoneDrawStart = { u, v, wallRef: zoneDrawWallRef };
    controls.enabled = false;
    event.preventDefault();
    event.stopPropagation();
}

// --- Object mode mousedown ---
function onZoneMouseDown_Object(event) {
    const allMeshes = [];
    importedObjects.forEach(obj => {
        obj.traverse(child => { if (child.isMesh) allMeshes.push(child); });
    });
    const intersects = editorRaycaster.intersectObjects(allMeshes, false);
    if (intersects.length === 0) return;

    let hitObject = intersects[0].object;
    let importedRoot = null;
    let current = hitObject;
    while (current) {
        if (current.userData.isImported && importedObjects.includes(current)) {
            importedRoot = current; break;
        }
        current = current.parent;
    }
    if (!importedRoot) return;

    const zone = finalizeObjectZone(importedRoot);
    showZoneConfigForNewZone(zone);
    event.preventDefault();
    event.stopPropagation();
}

// --- Character mode mousedown ---
function onZoneMouseDown_Character(event) {
    // Construire la liste complète des personnages (importedCharacters + babyModel)
    const allChars = [...importedCharacters];
    if (babyModel && !allChars.includes(babyModel)) allChars.push(babyModel);

    // Raycast sur les meshes des personnages (SkinnedMesh + enfants)
    const allMeshes = [];
    allChars.forEach(char => {
        char.traverse(child => { if (child.isMesh) allMeshes.push(child); });
    });
    // Aussi tester les proxies de collision (plus fiable pour SkinnedMesh)
    characterCollisionProxies.forEach(entry => {
        if (entry.proxy) allMeshes.push(entry.proxy);
    });
    const intersects = editorRaycaster.intersectObjects(allMeshes, false);
    if (intersects.length === 0) return;

    // Trouver le personnage parent
    let hitObject = intersects[0].object;
    let characterRoot = null;

    // Si c'est un proxy de collision, trouver le personnage associé
    if (hitObject.userData.isCollisionProxy) {
        const entry = characterCollisionProxies.find(e => e.proxy === hitObject);
        if (entry) characterRoot = entry.character;
    }

    // Sinon, remonter l'arbre pour trouver le personnage
    if (!characterRoot) {
        let current = hitObject;
        while (current) {
            if (current.userData.isCharacter && allChars.includes(current)) {
                characterRoot = current; break;
            }
            current = current.parent;
        }
    }
    if (!characterRoot) return;

    const zone = finalizeCharacterZone(characterRoot);
    showZoneConfigForNewZone(zone);
    event.preventDefault();
    event.stopPropagation();
}

// --- Dispatcher: onZoneMouseMove ---
function onZoneMouseMove(event) {
    if (!isDrawingZone || !zoneDrawStart || !activeZoneTool) return;

    const rect = renderer.domElement.getBoundingClientRect();
    editorMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    editorMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    editorRaycaster.setFromCamera(editorMouse, camera);

    if (zoneSurfaceMode === 'wall' && zoneDrawWallRef) {
        // Wall mode: project onto wall face plane
        const pt = new THREE.Vector3();
        if (!editorRaycaster.ray.intersectPlane(zoneDrawWallRef.facePlane, pt)) return;
        const offset = pt.clone().sub(zoneDrawWallRef.meshCenter);
        const u = offset.dot(zoneDrawWallRef.localRight);
        const v = offset.dot(zoneDrawWallRef.localUp);
        cleanupZonePreview();
        zonePreviewMesh = createWallZoneOutlineMesh(zoneDrawStart.u, zoneDrawStart.v, u, v, zoneDrawWallRef, 0x00CED1, 0.6);
        zonePreviewMesh.userData.isGizmo = true;
        scene.add(zonePreviewMesh);
        return;
    }

    // Floor/Ceiling mode: project onto horizontal plane at zoneDrawStart.y
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -zoneDrawStart.y);
    const pt = new THREE.Vector3();
    if (!editorRaycaster.ray.intersectPlane(plane, pt)) return;
    cleanupZonePreview();
    zonePreviewMesh = createZoneOutlineMesh(
        zoneDrawStart.x, zoneDrawStart.z, pt.x, pt.z,
        zoneDrawStart.y, activeZoneTool, 0x00CED1, 0.6
    );
    zonePreviewMesh.userData.isGizmo = true;
    scene.add(zonePreviewMesh);
}

// --- Dispatcher: onZoneMouseUp ---
function onZoneMouseUp(event) {
    if (!isDrawingZone || !zoneDrawStart) return;
    if (event.button !== 0) return;

    const rect = renderer.domElement.getBoundingClientRect();
    editorMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    editorMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    editorRaycaster.setFromCamera(editorMouse, camera);

    if (zoneSurfaceMode === 'wall' && zoneDrawWallRef) {
        // Wall mode finalize
        const pt = new THREE.Vector3();
        editorRaycaster.ray.intersectPlane(zoneDrawWallRef.facePlane, pt);
        const offset = pt ? pt.clone().sub(zoneDrawWallRef.meshCenter) : new THREE.Vector3();
        const endU = pt ? offset.dot(zoneDrawWallRef.localRight) : zoneDrawStart.u;
        const endV = pt ? offset.dot(zoneDrawWallRef.localUp) : zoneDrawStart.v;
        const du = Math.abs(endU - zoneDrawStart.u);
        const dv = Math.abs(endV - zoneDrawStart.v);
        if (du < 0.05 && dv < 0.05) {
            cleanupZonePreview(); isDrawingZone = false; zoneDrawStart = null; zoneDrawWallRef = null; controls.enabled = true; return;
        }
        cleanupZonePreview();
        const zone = finalizeWallZone(zoneDrawStart.u, zoneDrawStart.v, endU, endV, zoneDrawWallRef, activeZoneTool);
        isDrawingZone = false; zoneDrawStart = null; zoneDrawWallRef = null; controls.enabled = true;
        showZoneConfigForNewZone(zone);
        return;
    }

    // Floor/Ceiling mode finalize
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -zoneDrawStart.y);
    const pt = new THREE.Vector3();
    editorRaycaster.ray.intersectPlane(plane, pt);
    const endX = pt ? pt.x : zoneDrawStart.x;
    const endZ = pt ? pt.z : zoneDrawStart.z;
    const dx = Math.abs(endX - zoneDrawStart.x);
    const dz = Math.abs(endZ - zoneDrawStart.z);
    if (dx < 0.2 && dz < 0.2) {
        cleanupZonePreview(); isDrawingZone = false; zoneDrawStart = null; controls.enabled = true; return;
    }
    cleanupZonePreview();
    const zone = finalizeZone(zoneDrawStart, { x: endX, z: endZ }, activeZoneTool, zoneSurfaceMode);
    isDrawingZone = false; zoneDrawStart = null; controls.enabled = true;
    showZoneConfigForNewZone(zone);
}

function showZoneConfigForNewZone(zone) {
    currentEditingZone = zone;
    document.getElementById('btn-save-zone').disabled = false;
    _zoneSyncLock = true; // Empêcher l'auto-sync pendant le peuplement
    document.getElementById('zone-config-panel').style.display = 'block';
    document.getElementById('zone-trigger-type').value = zone.triggerType || 'click';
    // Par défaut 'video' pour les zones personnage, 'link' sinon
    const defaultAction = (zone.surfaceMode === 'character') ? 'video' : 'link';
    document.getElementById('zone-action-type').value = zone.actionType || defaultAction;
    document.getElementById('zone-action-type').dispatchEvent(new Event('change'));
    document.getElementById('zone-action-value').value = zone.actionValue || '';
    // Réinitialiser les champs de fin de vidéo
    if (document.getElementById('zone-video-end-action'))
        document.getElementById('zone-video-end-action').value = 'return';
    if (document.getElementById('zone-video-end-url'))
        document.getElementById('zone-video-end-url').value = '';
    if (document.getElementById('zone-video-end-url-field'))
        document.getElementById('zone-video-end-url-field').style.display = 'none';
    _zoneSyncLock = false;
    updateInteractionZonesList();
    markUnsavedChanges();
}

// --- Zone Mesh Creation Utilities ---

function createZoneOutlineMesh(x1, z1, x2, z2, y, type, color, opacity) {
    color = color || 0x00CED1;
    opacity = opacity !== undefined ? opacity : 0.8;

    const group = new THREE.Group();
    group.userData.isInteractionZone = true;
    group.userData.isGizmo = true;

    const mat = new THREE.LineBasicMaterial({
        color: color,
        linewidth: 2,
        transparent: true,
        opacity: opacity,
        depthTest: false
    });

    const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
    const minZ = Math.min(z1, z2), maxZ = Math.max(z1, z2);
    const yOffset = y + 0.02;

    if (type === 'rect') {
        const points = [
            new THREE.Vector3(minX, yOffset, minZ),
            new THREE.Vector3(maxX, yOffset, minZ),
            new THREE.Vector3(maxX, yOffset, maxZ),
            new THREE.Vector3(minX, yOffset, maxZ),
            new THREE.Vector3(minX, yOffset, minZ)
        ];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geo, mat);
        line.renderOrder = 998;
        group.add(line);

        // Semi-transparent fill
        const fillGeo = new THREE.PlaneGeometry(maxX - minX, maxZ - minZ);
        const fillMat = new THREE.MeshBasicMaterial({
            color: color, transparent: true, opacity: 0.08,
            side: THREE.DoubleSide, depthTest: false
        });
        const fill = new THREE.Mesh(fillGeo, fillMat);
        fill.rotation.x = -Math.PI / 2;
        fill.position.set((minX + maxX) / 2, yOffset, (minZ + maxZ) / 2);
        fill.renderOrder = 997;
        group.add(fill);

    } else if (type === 'oval') {
        const segments = 48;
        const cx = (minX + maxX) / 2;
        const cz = (minZ + maxZ) / 2;
        const rx = (maxX - minX) / 2;
        const rz = (maxZ - minZ) / 2;

        const points = [];
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            points.push(new THREE.Vector3(
                cx + Math.cos(angle) * rx, yOffset,
                cz + Math.sin(angle) * rz
            ));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geo, mat);
        line.renderOrder = 998;
        group.add(line);

        // Semi-transparent ellipse fill
        const shape = new THREE.Shape();
        shape.absellipse(0, 0, rx, rz, 0, Math.PI * 2, false, 0);
        const fillGeo = new THREE.ShapeGeometry(shape, 48);
        const fillMat = new THREE.MeshBasicMaterial({
            color: color, transparent: true, opacity: 0.08,
            side: THREE.DoubleSide, depthTest: false
        });
        const fill = new THREE.Mesh(fillGeo, fillMat);
        fill.rotation.x = -Math.PI / 2;
        fill.position.set(cx, yOffset, cz);
        fill.renderOrder = 997;
        group.add(fill);
    }

    return group;
}

function createZoneLabelSprite(text, position, options) {
    options = options || {};
    var scaleX = options.scaleX || 2;
    var scaleY = options.scaleY || 0.25;
    var yOffset = options.yOffset !== undefined ? options.yOffset : 0.5;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 64;

    ctx.fillStyle = 'rgba(0, 206, 209, 0.75)';
    if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(0, 0, canvas.width, canvas.height, 8);
        ctx.fill();
    } else {
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Texte du label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2 - 16, canvas.height / 2);

    // Bouton croix × en haut à droite
    const crossX = canvas.width - 32;
    const crossY = 32;
    ctx.fillStyle = 'rgba(255, 80, 80, 0.9)';
    ctx.beginPath();
    ctx.arc(crossX, crossY, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('×', crossX, crossY);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
        map: texture, transparent: true, depthTest: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.position.y += yOffset;
    sprite.scale.set(scaleX, scaleY, 1);
    sprite.renderOrder = 999;
    sprite.userData.isGizmo = true;
    sprite.userData.isInteractionZone = true;
    sprite.userData.isZoneLabel = true;

    return sprite;
}

// Masquer un label de zone quand on clique dessus (clic sur la croix)
function _initZoneLabelClickHandler() {
    if (_zoneLabelClickInitialized) return;
    _zoneLabelClickInitialized = true;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    document.addEventListener('click', function(event) {
        if (interactionMode === 'game') return;

        // Ignorer les clics sur le panneau de droite
        if (event.target.closest('#editor-panel') || event.target.closest('.editor-sidebar')) return;

        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        // Collecter tous les labels de zone visibles
        const labelSprites = [];
        for (const zone of interactionZones) {
            if (zone.labelSprite && zone.labelSprite.visible) {
                labelSprites.push(zone.labelSprite);
            }
        }

        const intersects = raycaster.intersectObjects(labelSprites);
        if (intersects.length > 0) {
            const clickedSprite = intersects[0].object;
            // Vérifier si le clic est dans la zone de la croix (côté droit du sprite, >80% de la largeur)
            const uv = intersects[0].uv;
            if (uv && uv.x > 0.88) {
                clickedSprite.visible = false;
                console.log('🔇 Label de zone masqué (clic sur ×)');
            }
        }
    });
}
var _zoneLabelClickInitialized = false;

// --- Wall Zone Mesh (rectangle on wall face) ---
function createWallZoneOutlineMesh(u1, v1, u2, v2, wallRefData, color, opacity) {
    color = color || 0x00CED1;
    opacity = opacity !== undefined ? opacity : 0.8;

    const group = new THREE.Group();
    group.userData.isInteractionZone = true;
    group.userData.isGizmo = true;

    const minU = Math.min(u1, u2), maxU = Math.max(u1, u2);
    const minV = Math.min(v1, v2), maxV = Math.max(v1, v2);
    const w = maxU - minU;
    const h = maxV - minV;
    const centerU = (minU + maxU) / 2;
    const centerV = (minV + maxV) / 2;

    // Convert UV center back to world position
    const center3D = wallRefData.meshCenter.clone()
        .add(wallRefData.localRight.clone().multiplyScalar(centerU))
        .add(wallRefData.localUp.clone().multiplyScalar(centerV));

    // Build orientation: localRight = X axis, localUp = Y axis, normal = Z axis
    const normal = wallRefData.localRight.clone().cross(wallRefData.localUp).normalize();
    const rotMatrix = new THREE.Matrix4().makeBasis(
        wallRefData.localRight.clone().normalize(),
        wallRefData.localUp.clone().normalize(),
        normal
    );

    // Outline rectangle
    const points = [
        new THREE.Vector3(-w/2, -h/2, 0),
        new THREE.Vector3( w/2, -h/2, 0),
        new THREE.Vector3( w/2,  h/2, 0),
        new THREE.Vector3(-w/2,  h/2, 0),
        new THREE.Vector3(-w/2, -h/2, 0)
    ];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({
        color: color, linewidth: 2, transparent: true, opacity: opacity, depthTest: false
    });
    const line = new THREE.Line(lineGeo, lineMat);
    line.renderOrder = 998;
    group.add(line);

    // Semi-transparent fill
    const fillGeo = new THREE.PlaneGeometry(w, h);
    const fillMat = new THREE.MeshBasicMaterial({
        color: color, transparent: true, opacity: 0.08,
        side: THREE.DoubleSide, depthTest: false
    });
    const fill = new THREE.Mesh(fillGeo, fillMat);
    fill.renderOrder = 997;
    group.add(fill);

    // Position and orient the group
    group.position.copy(center3D);
    group.position.add(normal.clone().multiplyScalar(0.01)); // slight offset to avoid z-fighting
    group.setRotationFromMatrix(rotMatrix);

    return group;
}

function finalizeWallZone(u1, v1, u2, v2, wallRefData, shapeType) {
    const id = ++interactionZoneIdCounter;

    const minU = Math.min(u1, u2), maxU = Math.max(u1, u2);
    const minV = Math.min(v1, v2), maxV = Math.max(v1, v2);

    // Compute world-space bounding box for proximity checks
    const corners = [
        wallRefData.meshCenter.clone().add(wallRefData.localRight.clone().multiplyScalar(minU)).add(wallRefData.localUp.clone().multiplyScalar(minV)),
        wallRefData.meshCenter.clone().add(wallRefData.localRight.clone().multiplyScalar(maxU)).add(wallRefData.localUp.clone().multiplyScalar(maxV))
    ];
    const worldCenter = corners[0].clone().add(corners[1]).multiplyScalar(0.5);

    const zone = {
        id: id,
        type: shapeType || 'rect',
        bounds: {
            minX: Math.min(corners[0].x, corners[1].x),
            maxX: Math.max(corners[0].x, corners[1].x),
            minZ: Math.min(corners[0].z, corners[1].z),
            maxZ: Math.max(corners[0].z, corners[1].z)
        },
        triggerType: 'click',
        actionType: 'link',
        actionValue: '',
        locked: false,
        y: worldCenter.y,
        meshGroup: null,
        labelSprite: null,
        surfaceMode: 'wall',
        customName: null,
        wallRef: { wallId: wallRefData.wall.id, faceIndex: wallRefData.faceIndex },
        localBounds: { u1: minU, v1: minV, u2: maxU, v2: maxV },
        wallPlaneData: {
            wallRotationY: wallRefData.wall.mesh ? wallRefData.wall.mesh.rotation.y : 0,
            wallPosition: wallRefData.meshCenter.clone(),
            faceNormalLocal: [
                new THREE.Vector3(1,0,0), new THREE.Vector3(-1,0,0),
                new THREE.Vector3(0,1,0), new THREE.Vector3(0,-1,0),
                new THREE.Vector3(0,0,1), new THREE.Vector3(0,0,-1)
            ][wallRefData.faceIndex].toArray()
        }
    };

    // Create visual mesh on wall
    zone.meshGroup = createWallZoneOutlineMesh(minU, minV, maxU, maxV, wallRefData, 0x00CED1, 0.8);
    scene.add(zone.meshGroup);

    // Create label near the zone center
    zone.labelSprite = createZoneLabelSprite(
        'Zone #' + id + ' (non configurée)',
        worldCenter
    );
    scene.add(zone.labelSprite);

    interactionZones.push(zone);
    console.log(`🧱 Zone murale #${id} créée sur mur ${wallRefData.wall.id}, face ${wallRefData.faceIndex}`);

    return zone;
}

function reconstructWallRefData(wall, faceIndex) {
    if (!wall || !wall.mesh) return null;

    const mesh = wall.mesh;
    const faceNormals = [
        new THREE.Vector3(1,0,0), new THREE.Vector3(-1,0,0),
        new THREE.Vector3(0,1,0), new THREE.Vector3(0,-1,0),
        new THREE.Vector3(0,0,1), new THREE.Vector3(0,0,-1)
    ];
    const localNormal = faceNormals[faceIndex].clone();
    const worldNormal = localNormal.clone().applyEuler(mesh.rotation).normalize();
    const facePlane = new THREE.Plane().setFromNormalAndCoplanarPoint(worldNormal, mesh.position);

    let localRight, localUp;
    if (faceIndex === 4 || faceIndex === 5) {
        localRight = new THREE.Vector3(1,0,0).applyEuler(mesh.rotation).normalize();
        localUp = new THREE.Vector3(0,1,0);
        if (faceIndex === 5) localRight.negate();
    } else if (faceIndex === 0 || faceIndex === 1) {
        localRight = new THREE.Vector3(0,0,1).applyEuler(mesh.rotation).normalize();
        localUp = new THREE.Vector3(0,1,0);
        if (faceIndex === 1) localRight.negate();
    } else {
        localRight = new THREE.Vector3(1,0,0).applyEuler(mesh.rotation).normalize();
        localUp = new THREE.Vector3(0,0,1).applyEuler(mesh.rotation).normalize();
        if (faceIndex === 3) localUp.negate();
    }

    return { wall, faceIndex, facePlane, localRight, localUp, meshCenter: mesh.position.clone() };
}

// --- Object Zone Mesh (bounding box wireframe) ---
function createObjectZoneOutlineMesh(boundingBox, color, opacity) {
    color = color || 0x00CED1;
    opacity = opacity !== undefined ? opacity : 0.8;

    const group = new THREE.Group();
    group.userData.isInteractionZone = true;
    group.userData.isGizmo = true;

    const min = boundingBox.min;
    const max = boundingBox.max;

    // 12 edges of the bounding box
    const edges = [
        [min.x,min.y,min.z, max.x,min.y,min.z], [max.x,min.y,min.z, max.x,min.y,max.z],
        [max.x,min.y,max.z, min.x,min.y,max.z], [min.x,min.y,max.z, min.x,min.y,min.z],
        [min.x,max.y,min.z, max.x,max.y,min.z], [max.x,max.y,min.z, max.x,max.y,max.z],
        [max.x,max.y,max.z, min.x,max.y,max.z], [min.x,max.y,max.z, min.x,max.y,min.z],
        [min.x,min.y,min.z, min.x,max.y,min.z], [max.x,min.y,min.z, max.x,max.y,min.z],
        [max.x,min.y,max.z, max.x,max.y,max.z], [min.x,min.y,max.z, min.x,max.y,max.z]
    ];

    const lineMat = new THREE.LineBasicMaterial({
        color: color, linewidth: 2, transparent: true, opacity: opacity, depthTest: false
    });

    edges.forEach(e => {
        const pts = [new THREE.Vector3(e[0],e[1],e[2]), new THREE.Vector3(e[3],e[4],e[5])];
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const line = new THREE.LineSegments(geo, lineMat.clone());
        line.renderOrder = 998;
        group.add(line);
    });

    return group;
}

function finalizeObjectZone(importedRoot) {
    const id = ++interactionZoneIdCounter;

    // Compute world bounding box
    const box = new THREE.Box3().setFromObject(importedRoot);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);

    const zone = {
        id: id,
        type: 'object-select',
        bounds: {
            minX: box.min.x, maxX: box.max.x,
            minZ: box.min.z, maxZ: box.max.z
        },
        triggerType: 'click',
        actionType: 'link',
        actionValue: '',
        locked: false,
        y: center.y,
        meshGroup: null,
        labelSprite: null,
        surfaceMode: 'object',
        customName: null,
        objectRef: {
            editorName: importedRoot.userData.editorName || importedRoot.name || '',
            objectUUID: importedRoot.uuid
        }
    };

    // Create bounding box wireframe
    zone.meshGroup = createObjectZoneOutlineMesh(box, 0x00CED1, 0.8);
    scene.add(zone.meshGroup);

    // Create label above the object
    const labelPos = center.clone();
    zone.labelSprite = createZoneLabelSprite(
        'Zone #' + id + ' (non configurée)',
        labelPos
    );
    scene.add(zone.labelSprite);

    interactionZones.push(zone);
    console.log(`🎯 Zone objet #${id} créée sur "${zone.objectRef.editorName}" (${zone.objectRef.objectUUID})`);

    return zone;
}

function finalizeCharacterZone(characterRoot) {
    const id = ++interactionZoneIdCounter;

    // Utiliser measureCharacterByBones pour des dimensions fiables
    let height = 1.7, radius = 0.3;
    const boneMeasure = measureCharacterByBones(characterRoot);
    if (boneMeasure) {
        height = boneMeasure.height;
        radius = Math.max(boneMeasure.width, boneMeasure.depth) * 0.5;
    } else {
        const box = new THREE.Box3().setFromObject(characterRoot);
        const size = new THREE.Vector3();
        box.getSize(size);
        height = size.y || 1.7;
        radius = Math.max(size.x, size.z) * 0.5 || 0.3;
    }

    const cx = characterRoot.position.x;
    const cy = characterRoot.position.y + height / 2;
    const cz = characterRoot.position.z;

    const zone = {
        id: id,
        type: 'character-select',
        bounds: {
            minX: cx - radius, maxX: cx + radius,
            minZ: cz - radius, maxZ: cz + radius
        },
        triggerType: 'click',
        actionType: 'video',
        actionValue: '',
        locked: false,
        y: cy,
        meshGroup: null,
        labelSprite: null,
        surfaceMode: 'character',
        customName: null,
        characterRef: {
            editorName: characterRoot.userData.editorName || characterRoot.name || '',
            characterUUID: characterRoot.uuid
        },
        characterHeight: height,
        characterBaseY: characterRoot.position.y
    };

    // Create bounding box wireframe autour du personnage
    const box = new THREE.Box3();
    box.min.set(cx - radius, characterRoot.position.y, cz - radius);
    box.max.set(cx + radius, characterRoot.position.y + height, cz + radius);
    zone.meshGroup = createObjectZoneOutlineMesh(box, 0x00CED1, 0.8);
    scene.add(zone.meshGroup);

    // Create label above the character (position haute + petite taille)
    const labelPos = new THREE.Vector3(cx, characterRoot.position.y + height, cz);
    zone.labelSprite = createZoneLabelSprite(
        'Zone #' + id + ' (non configurée)',
        labelPos,
        { scaleX: 0.8, scaleY: 0.1, yOffset: 0.15 }
    );
    scene.add(zone.labelSprite);

    interactionZones.push(zone);
    console.log(`🎭 Zone personnage #${id} créée sur "${zone.characterRef.editorName}" (${zone.characterRef.characterUUID})`);

    return zone;
}

function findObjectByRef(objectRef) {
    if (!objectRef) return null;

    // Try UUID first (most reliable)
    for (const obj of importedObjects) {
        if (obj.uuid === objectRef.objectUUID) return obj;
    }

    // Fallback: try editorName
    if (objectRef.editorName) {
        for (const obj of importedObjects) {
            if ((obj.userData.editorName || obj.name) === objectRef.editorName) return obj;
        }
    }

    return null;
}

function findCharacterByRef(characterRef) {
    if (!characterRef) return null;

    // Construire la liste complète des personnages (importedCharacters + babyModel)
    const allChars = [...importedCharacters];
    if (babyModel && !allChars.includes(babyModel)) allChars.push(babyModel);

    // Try UUID first
    for (const char of allChars) {
        if (char.uuid === characterRef.characterUUID) return char;
    }

    // Fallback: editorName
    if (characterRef.editorName) {
        for (const char of allChars) {
            if ((char.userData.editorName || char.name) === characterRef.editorName) return char;
        }
    }

    return null;
}

function finalizeZone(start, end, type, surfaceMode) {
    const id = ++interactionZoneIdCounter;

    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minZ = Math.min(start.z, end.z);
    const maxZ = Math.max(start.z, end.z);

    const sm = surfaceMode || 'floor';
    const zone = {
        id: id,
        type: type,
        bounds: { minX, maxX, minZ, maxZ },
        triggerType: 'click',
        actionType: 'link',
        actionValue: '',
        locked: false,
        y: start.y,
        meshGroup: null,
        labelSprite: null,
        surfaceMode: sm,
        customName: null
    };

    // Create visual mesh
    zone.meshGroup = createZoneOutlineMesh(minX, minZ, maxX, maxZ, start.y, type);
    scene.add(zone.meshGroup);

    // Create label
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const labelPrefix = sm === 'ceiling' ? '⬆ ' : '';
    zone.labelSprite = createZoneLabelSprite(
        labelPrefix + 'Zone #' + id + ' (non configurée)',
        new THREE.Vector3(cx, start.y, cz)
    );
    scene.add(zone.labelSprite);

    interactionZones.push(zone);
    console.log(`🟦 Zone ${sm} #${id} (${type}) créée: [${minX.toFixed(2)}, ${minZ.toFixed(2)}] → [${maxX.toFixed(2)}, ${maxZ.toFixed(2)}]`);

    return zone;
}

function updateZoneLabel(zone) {
    if (zone.labelSprite) {
        scene.remove(zone.labelSprite);
        if (zone.labelSprite.material.map) zone.labelSprite.material.map.dispose();
        zone.labelSprite.material.dispose();
    }

    // Surface mode prefix — remplacé par actionType si plus parlant
    const sm = zone.surfaceMode || 'floor';
    let prefix = '';
    if (zone.actionType === 'music') prefix = '(♪ Musique) ';
    else if (zone.actionType === 'video') prefix = '(Vidéo) ';
    else if (sm === 'ceiling') prefix = '(Plafond) ';
    else if (sm === 'wall') prefix = '(Mur) ';
    else if (sm === 'object') prefix = '(Objet) ';
    else if (sm === 'character') prefix = '(Perso) ';

    let labelText;
    if (zone.customName) {
        labelText = prefix + zone.customName;
    } else {
        labelText = prefix + 'Zone #' + zone.id;
        switch (zone.actionType) {
            case 'link': if (zone.actionValue) labelText = prefix + 'Lien: ' + zone.actionValue; break;
            case 'message': if (zone.actionValue) labelText = prefix + 'Msg: ' + zone.actionValue; break;
            case 'teleport': if (zone.actionValue) labelText = prefix + 'TP: ' + zone.actionValue; break;
            case 'video': labelText = prefix + 'Video: ' + (zone.actionValue || '?'); break;
            case 'lightbox-image': labelText = prefix + 'Image: ' + (zone.actionValue || '?'); break;
            case 'lightbox-text': labelText = prefix + 'Texte lightbox'; break;
            case 'turn-button': labelText = prefix + 'Bouton rotatif'; break;
            case 'lever': labelText = prefix + 'Levier'; break;
            case 'fader': labelText = prefix + 'Fader'; break;
            default: break;
        }
    }

    const cx = (zone.bounds.minX + zone.bounds.maxX) / 2;
    const cz = (zone.bounds.minZ + zone.bounds.maxZ) / 2;

    // Calculer position Y et taille du label
    let labelY = zone.y;
    let spriteOptions = {};  // défaut: scale 2x0.25, yOffset +0.5
    if (zone.surfaceMode === 'character') {
        // Positionner bien au-dessus de la tête du personnage
        if (zone.characterHeight !== undefined && zone.characterBaseY !== undefined) {
            labelY = zone.characterBaseY + zone.characterHeight;
        } else {
            // Fallback: zone.y est le centre du personnage, ajouter ~moitié hauteur
            labelY = zone.y + 0.85;
        }
        spriteOptions = { scaleX: 0.8, scaleY: 0.1, yOffset: 0.15 };
    }

    zone.labelSprite = createZoneLabelSprite(
        labelText,
        new THREE.Vector3(cx, labelY, cz),
        spriteOptions
    );
    scene.add(zone.labelSprite);
}

// --- Zone Management Functions ---

function saveCurrentZone() {
    if (!currentEditingZone) {
        console.log('⚠️ Aucune zone à configurer');
        return;
    }

    const triggerType = document.getElementById('zone-trigger-type').value;
    const actionType = document.getElementById('zone-action-type').value;

    // Read value from the correct field depending on action type
    let actionValue = '';
    switch (actionType) {
        case 'video':
            actionValue = (document.getElementById('zone-video-url') || {}).value || '';
            break;
        case 'lightbox-image':
            actionValue = (document.getElementById('zone-image-url') || {}).value || '';
            break;
        case 'lightbox-text':
            actionValue = (document.getElementById('zone-lightbox-text') || {}).value || '';
            break;
        default:
            actionValue = document.getElementById('zone-action-value').value.trim();
            break;
    }

    currentEditingZone.triggerType = triggerType;
    currentEditingZone.actionType = actionType;
    currentEditingZone.actionValue = actionValue;

    // Save video end action config if applicable
    if (actionType === 'video') {
        currentEditingZone.videoEndAction = (document.getElementById('zone-video-end-action') || {}).value || 'return';
        currentEditingZone.videoEndUrl = ((document.getElementById('zone-video-end-url') || {}).value || '').trim();
    }

    // Save mechanical config if applicable
    if (['turn-button', 'lever', 'fader'].includes(actionType)) {
        currentEditingZone.actionConfig = {
            axis: (document.getElementById('zone-mech-axis') || {}).value || 'y',
            speed: parseFloat((document.getElementById('zone-mech-speed') || {}).value) || 1,
            range: parseFloat((document.getElementById('zone-mech-range') || {}).value) || 360,
            consequenceType: (document.getElementById('zone-consequence-type') || {}).value || '',
            consequenceValue: (document.getElementById('zone-consequence-value') || {}).value || ''
        };
    }

    updateZoneLabel(currentEditingZone);

    document.getElementById('btn-save-zone').disabled = true;
    console.log(`💾 Zone #${currentEditingZone.id} sauvegardée: ${actionType} = ${actionValue}`);

    currentEditingZone = null;
    selectedInteractionZone = null;
    updateInteractionZonesList();
    markUnsavedChanges();
}

function deleteZone(zone) {
    if (!zone) return;
    if (zone.locked) {
        console.log('🔒 Zone verrouillée, impossible de supprimer');
        return;
    }

    if (zone.meshGroup) {
        scene.remove(zone.meshGroup);
        zone.meshGroup.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (child.material.map) child.material.map.dispose();
                child.material.dispose();
            }
        });
    }
    if (zone.labelSprite) {
        scene.remove(zone.labelSprite);
        if (zone.labelSprite.material.map) zone.labelSprite.material.map.dispose();
        zone.labelSprite.material.dispose();
    }

    const idx = interactionZones.indexOf(zone);
    if (idx > -1) interactionZones.splice(idx, 1);

    if (currentEditingZone === zone) currentEditingZone = null;
    if (selectedInteractionZone === zone) selectedInteractionZone = null;

    updateInteractionZonesList();
    markUnsavedChanges();
    console.log(`🗑️ Zone #${zone.id} supprimée`);
}

function duplicateZone(zone) {
    if (!zone) return;

    const sm = zone.surfaceMode || 'floor';

    // Wall, object and character zones can't be trivially duplicated with offset
    if (sm === 'wall' || sm === 'object' || sm === 'character') {
        // For wall/object/character, create a copy with same data
        const id = ++interactionZoneIdCounter;
        const newZone = {
            id: id,
            type: zone.type,
            bounds: JSON.parse(JSON.stringify(zone.bounds)),
            triggerType: zone.triggerType || 'click',
            actionType: zone.actionType,
            actionValue: zone.actionValue,
            locked: false,
            y: zone.y,
            meshGroup: null,
            labelSprite: null,
            surfaceMode: sm,
            customName: zone.customName ? zone.customName + ' (copie)' : null
        };
        if (zone.wallRef) newZone.wallRef = JSON.parse(JSON.stringify(zone.wallRef));
        if (zone.localBounds) newZone.localBounds = JSON.parse(JSON.stringify(zone.localBounds));
        if (zone.wallPlaneData) newZone.wallPlaneData = JSON.parse(JSON.stringify(zone.wallPlaneData));
        if (zone.objectRef) newZone.objectRef = JSON.parse(JSON.stringify(zone.objectRef));
        if (zone.characterRef) newZone.characterRef = JSON.parse(JSON.stringify(zone.characterRef));
        if (zone.actionConfig) newZone.actionConfig = JSON.parse(JSON.stringify(zone.actionConfig));
        if (zone.videoEndAction) newZone.videoEndAction = zone.videoEndAction;
        if (zone.videoEndUrl) newZone.videoEndUrl = zone.videoEndUrl;

        // Re-create mesh
        if (sm === 'wall' && zone.wallRef && zone.localBounds) {
            const wall = floorPlanWalls.find(w => w.id === zone.wallRef.wallId);
            if (wall) {
                const wrd = reconstructWallRefData(wall, zone.wallRef.faceIndex);
                if (wrd) {
                    newZone.meshGroup = createWallZoneOutlineMesh(zone.localBounds.u1, zone.localBounds.v1, zone.localBounds.u2, zone.localBounds.v2, wrd, 0x00CED1, 0.8);
                    scene.add(newZone.meshGroup);
                }
            }
        } else if (sm === 'object' && zone.objectRef) {
            const obj = findObjectByRef(zone.objectRef);
            if (obj) {
                const box = new THREE.Box3().setFromObject(obj);
                newZone.meshGroup = createObjectZoneOutlineMesh(box);
                scene.add(newZone.meshGroup);
            }
        } else if (sm === 'character' && zone.characterRef) {
            const char = findCharacterByRef(zone.characterRef);
            if (char) {
                let height = 1.7, radius = 0.3;
                const boneMeasure = measureCharacterByBones(char);
                if (boneMeasure) { height = boneMeasure.height; radius = Math.max(boneMeasure.width, boneMeasure.depth) * 0.5; }
                const box = new THREE.Box3();
                box.min.set(char.position.x - radius, char.position.y, char.position.z - radius);
                box.max.set(char.position.x + radius, char.position.y + height, char.position.z + radius);
                newZone.meshGroup = createObjectZoneOutlineMesh(box);
                scene.add(newZone.meshGroup);
            }
        }

        const cx = (newZone.bounds.minX + newZone.bounds.maxX) / 2;
        const cz = (newZone.bounds.minZ + newZone.bounds.maxZ) / 2;
        newZone.labelSprite = createZoneLabelSprite('Zone #' + id, new THREE.Vector3(cx, newZone.y, cz));
        scene.add(newZone.labelSprite);
        interactionZones.push(newZone);
        updateZoneLabel(newZone);
        updateInteractionZonesList();
        markUnsavedChanges();
        console.log(`📋 Zone #${zone.id} dupliquée → Zone #${newZone.id}`);
        return;
    }

    // Floor/ceiling: offset duplicate
    const offsetX = 0.5;
    const newZone = finalizeZone(
        { x: zone.bounds.minX + offsetX, z: zone.bounds.minZ + offsetX, y: zone.y },
        { x: zone.bounds.maxX + offsetX, z: zone.bounds.maxZ + offsetX },
        zone.type,
        sm
    );

    newZone.triggerType = zone.triggerType || 'click';
    newZone.actionType = zone.actionType;
    newZone.actionValue = zone.actionValue;
    newZone.customName = zone.customName ? zone.customName + ' (copie)' : null;
    if (zone.actionConfig) newZone.actionConfig = JSON.parse(JSON.stringify(zone.actionConfig));
    if (zone.videoEndAction) newZone.videoEndAction = zone.videoEndAction;
    if (zone.videoEndUrl) newZone.videoEndUrl = zone.videoEndUrl;
    updateZoneLabel(newZone);

    updateInteractionZonesList();
    markUnsavedChanges();
    console.log(`📋 Zone #${zone.id} dupliquée → Zone #${newZone.id}`);
}

function toggleZoneLock(zone) {
    if (!zone) return;
    zone.locked = !zone.locked;
    updateInteractionZonesList();
    console.log(`${zone.locked ? '🔒' : '🔓'} Zone #${zone.id} ${zone.locked ? 'verrouillée' : 'déverrouillée'}`);
}

function selectInteractionZone(zone) {
    selectedInteractionZone = zone;
    currentEditingZone = zone;

    _zoneSyncLock = true; // Empêcher l'auto-sync pendant le peuplement
    document.getElementById('zone-config-panel').style.display = 'block';
    document.getElementById('zone-trigger-type').value = zone.triggerType || 'click';
    document.getElementById('zone-action-type').value = zone.actionType || 'link';
    // Trigger the change event to show/hide the correct fields
    document.getElementById('zone-action-type').dispatchEvent(new Event('change'));
    document.getElementById('btn-save-zone').disabled = false;

    // Populate the correct value field based on action type
    const at = zone.actionType || 'link';
    switch (at) {
        case 'video':
            if (document.getElementById('zone-video-url')) document.getElementById('zone-video-url').value = zone.actionValue || '';
            // Peupler les champs de fin de vidéo
            if (document.getElementById('zone-video-end-action')) {
                document.getElementById('zone-video-end-action').value = zone.videoEndAction || 'return';
                document.getElementById('zone-video-end-action').dispatchEvent(new Event('change'));
            }
            if (document.getElementById('zone-video-end-url')) {
                document.getElementById('zone-video-end-url').value = zone.videoEndUrl || '';
            }
            break;
        case 'lightbox-image':
            if (document.getElementById('zone-image-url')) document.getElementById('zone-image-url').value = zone.actionValue || '';
            break;
        case 'lightbox-text':
            if (document.getElementById('zone-lightbox-text')) document.getElementById('zone-lightbox-text').value = zone.actionValue || '';
            break;
        default:
            document.getElementById('zone-action-value').value = zone.actionValue || '';
            break;
    }

    // Populate mechanical config if present
    if (['turn-button', 'lever', 'fader'].includes(at) && zone.actionConfig) {
        const cfg = zone.actionConfig;
        if (document.getElementById('zone-mech-axis')) document.getElementById('zone-mech-axis').value = cfg.axis || 'y';
        if (document.getElementById('zone-mech-speed')) document.getElementById('zone-mech-speed').value = cfg.speed || 1;
        if (document.getElementById('zone-mech-range')) document.getElementById('zone-mech-range').value = cfg.range || 360;
        if (document.getElementById('zone-consequence-type')) document.getElementById('zone-consequence-type').value = cfg.consequenceType || '';
        if (document.getElementById('zone-consequence-value')) document.getElementById('zone-consequence-value').value = cfg.consequenceValue || '';
        // Update display values
        const speedDisp = document.getElementById('zone-mech-speed-val');
        if (speedDisp) speedDisp.textContent = cfg.speed || 1;
        const rangeDisp = document.getElementById('zone-mech-range-val');
        if (rangeDisp) rangeDisp.textContent = cfg.range || 360;
    }
    _zoneSyncLock = false;

    updateInteractionZonesList();
}

// --- Interactions List UI ---

function updateInteractionZonesList() {
    const container = document.getElementById('interaction-zones-list');
    if (!container) return;

    container.innerHTML = '';

    if (interactionZones.length === 0) {
        container.innerHTML = '<div class="text-[8px] px-1" style="color: #555;">Aucune zone.</div>';
        return;
    }

    interactionZones.forEach(zone => {
        const item = createInteractionZoneListItem(zone);
        container.appendChild(item);
    });
}

function createInteractionZoneListItem(zone) {
    const isSelected = selectedInteractionZone === zone;
    const isLocked = zone.locked;

    const item = document.createElement('div');
    item.className = 'zone-list-item';
    if (isSelected) item.classList.add('selected');
    if (isLocked) item.classList.add('locked');

    // Zone type icon — surface-specific
    const icon = document.createElement('span');
    icon.style.display = 'flex';
    icon.style.alignItems = 'center';
    icon.style.fontSize = '11px';
    const sm = zone.surfaceMode || 'floor';
    if (sm === 'character') {
        icon.textContent = '\uD83C\uDFAD'; // performing arts emoji
    } else if (sm === 'object') {
        icon.textContent = '\uD83C\uDFAF'; // target emoji
    } else if (sm === 'wall') {
        icon.textContent = '\uD83E\uDDF1'; // brick emoji
    } else if (sm === 'ceiling') {
        icon.textContent = '\u2B06'; // up arrow
    } else {
        icon.innerHTML = zone.type === 'rect'
            ? '<img src="icones/grid-2x2.svg" width="12" height="12" style="filter: brightness(0) invert(0.5);">'
            : '<img src="icones/loader-circle.svg" width="12" height="12" style="filter: brightness(0) invert(0.5);">';
    }

    // Zone name / action summary - éditable au double-clic
    const name = document.createElement('span');
    name.style.flex = '1';
    name.style.fontSize = '9px';
    name.style.overflow = 'hidden';
    name.style.textOverflow = 'ellipsis';
    name.style.whiteSpace = 'nowrap';
    name.style.cursor = 'text';
    name.title = 'Double-cliquer pour renommer';

    // Afficher le nom personnalisé ou le résumé auto-généré
    let autoSummary = '#' + zone.id + ' ';
    switch (zone.actionType) {
        case 'link': autoSummary += zone.actionValue ? zone.actionValue : '(non configuré)'; break;
        case 'message': autoSummary += zone.actionValue ? 'Msg: ' + zone.actionValue : '(non configuré)'; break;
        case 'teleport': autoSummary += zone.actionValue ? 'TP: ' + zone.actionValue : '(non configuré)'; break;
        case 'video': autoSummary += 'Video' + (zone.actionValue ? ': ' + zone.actionValue.substring(0,20) : ''); break;
        case 'lightbox-image': autoSummary += 'Image' + (zone.actionValue ? ': ' + zone.actionValue.substring(0,20) : ''); break;
        case 'lightbox-text': autoSummary += 'Texte lightbox'; break;
        case 'turn-button': autoSummary += 'Bouton rotatif'; break;
        case 'lever': autoSummary += 'Levier'; break;
        case 'fader': autoSummary += 'Fader'; break;
        default: autoSummary += zone.actionValue || '(non configuré)'; break;
    }
    name.textContent = zone.customName || autoSummary;

    // Simple clic sur le nom : empêcher la re-sélection de la zone (qui recrée la liste)
    name.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Double-clic pour renommer la zone
    name.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const input = document.createElement('input');
        input.type = 'text';
        input.value = zone.customName || '';
        input.placeholder = autoSummary;
        input.style.cssText = 'width:100%;font-size:9px;padding:1px 3px;border:1px solid var(--es-acc-line);border-radius:2px;background:var(--es-bg-0);color:var(--es-txt-0);outline:none;';

        const finishRename = () => {
            const newName = input.value.trim();
            zone.customName = newName || null; // null = revenir au nom auto
            name.textContent = zone.customName || autoSummary;
            input.replaceWith(name);
            updateZoneLabel(zone);
            markUnsavedChanges();
        };

        input.addEventListener('blur', finishRename);
        input.addEventListener('keydown', (ke) => {
            if (ke.key === 'Enter') { ke.preventDefault(); input.blur(); }
            if (ke.key === 'Escape') { input.value = zone.customName || ''; input.blur(); }
            ke.stopPropagation(); // Empêcher les raccourcis clavier de l'éditeur
        });

        name.replaceWith(input);
        input.focus();
        input.select();
    });

    // Action buttons container
    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '3px';
    actions.style.alignItems = 'center';

    // Lock button
    const lockBtn = document.createElement('button');
    lockBtn.style.cssText = 'background:none;border:none;cursor:pointer;padding:2px;opacity:0.7;';
    lockBtn.title = isLocked ? 'Déverrouiller' : 'Verrouiller';
    lockBtn.innerHTML = '<img src="icones/' + (isLocked ? 'lock.svg' : 'lock-open.svg') + '" width="11" height="11" style="filter: brightness(0) invert(0.7); pointer-events: none;">';
    lockBtn.onclick = (e) => { e.stopPropagation(); toggleZoneLock(zone); };

    // Duplicate button
    const dupBtn = document.createElement('button');
    dupBtn.style.cssText = 'background:none;border:none;cursor:pointer;padding:2px;opacity:0.7;';
    dupBtn.title = 'Dupliquer';
    dupBtn.innerHTML = '<img src="icones/copy.svg" width="11" height="11" style="filter: brightness(0) invert(0.7); pointer-events: none;">';
    dupBtn.onclick = (e) => { e.stopPropagation(); duplicateZone(zone); };

    // Delete button
    const delBtn = document.createElement('button');
    delBtn.style.cssText = 'background:none;border:none;cursor:pointer;padding:2px;opacity:0.7;';
    delBtn.title = 'Supprimer';
    delBtn.innerHTML = '<img src="icones/trash-2.svg" width="11" height="11" style="filter: brightness(0) invert(0.7); pointer-events: none;">';
    delBtn.onclick = (e) => { e.stopPropagation(); deleteZone(zone); };

    actions.appendChild(lockBtn);
    actions.appendChild(dupBtn);
    actions.appendChild(delBtn);

    item.appendChild(icon);
    item.appendChild(name);
    item.appendChild(actions);

    item.onclick = () => selectInteractionZone(zone);

    return item;
}

// --- Zone Load/Clear Helpers ---

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

function loadInteractionZonesFromData(zonesData) {
    zonesData.forEach(zd => {
        const sm = zd.surfaceMode || 'floor';
        const zone = {
            id: zd.id, type: zd.type, bounds: zd.bounds,
            triggerType: zd.triggerType || 'click',
            actionType: zd.actionType, actionValue: zd.actionValue,
            locked: zd.locked || false, y: zd.y || 0,
            meshGroup: null, labelSprite: null,
            surfaceMode: sm,
            customName: zd.customName || null
        };

        // Copy extended fields
        if (zd.wallRef) zone.wallRef = zd.wallRef;
        if (zd.localBounds) zone.localBounds = zd.localBounds;
        if (zd.objectRef) zone.objectRef = zd.objectRef;
        if (zd.characterRef) zone.characterRef = zd.characterRef;
        if (zd.characterHeight !== undefined) zone.characterHeight = zd.characterHeight;
        if (zd.characterBaseY !== undefined) zone.characterBaseY = zd.characterBaseY;
        if (zd.actionConfig) zone.actionConfig = zd.actionConfig;
        if (zd.videoEndAction) zone.videoEndAction = zd.videoEndAction;
        if (zd.videoEndUrl) zone.videoEndUrl = zd.videoEndUrl;
        if (zd.wallPlaneData) {
            zone.wallPlaneData = zd.wallPlaneData;
            // Reconstruct wallPosition as Vector3 if stored as plain object
            if (zd.wallPlaneData.wallPosition && !(zd.wallPlaneData.wallPosition instanceof THREE.Vector3)) {
                zone.wallPlaneData.wallPosition = new THREE.Vector3(
                    zd.wallPlaneData.wallPosition.x,
                    zd.wallPlaneData.wallPosition.y,
                    zd.wallPlaneData.wallPosition.z
                );
            }
        }

        // Create visual mesh based on surface mode
        if (sm === 'wall' && zone.wallRef && zone.localBounds) {
            const wall = floorPlanWalls.find(w => w.id === zone.wallRef.wallId);
            if (wall) {
                const wrd = reconstructWallRefData(wall, zone.wallRef.faceIndex);
                if (wrd) {
                    zone.meshGroup = createWallZoneOutlineMesh(
                        zone.localBounds.u1, zone.localBounds.v1,
                        zone.localBounds.u2, zone.localBounds.v2,
                        wrd, 0x00CED1, 0.8
                    );
                }
            }
        } else if (sm === 'object' && zone.objectRef) {
            const obj = findObjectByRef(zone.objectRef);
            if (obj) {
                const box = new THREE.Box3().setFromObject(obj);
                zone.meshGroup = createObjectZoneOutlineMesh(box, 0x00CED1, 0.8);
            }
        } else if (sm === 'character' && zone.characterRef) {
            const char = findCharacterByRef(zone.characterRef);
            if (char) {
                // Recréer la bounding box autour du personnage
                let height = 1.7, radius = 0.3;
                const boneMeasure = measureCharacterByBones(char);
                if (boneMeasure) {
                    height = boneMeasure.height;
                    radius = Math.max(boneMeasure.width, boneMeasure.depth) * 0.5;
                } else {
                    const cbox = new THREE.Box3().setFromObject(char);
                    const csize = new THREE.Vector3(); cbox.getSize(csize);
                    height = csize.y || 1.7; radius = Math.max(csize.x, csize.z) * 0.5 || 0.3;
                }
                const box = new THREE.Box3();
                box.min.set(char.position.x - radius, char.position.y, char.position.z - radius);
                box.max.set(char.position.x + radius, char.position.y + height, char.position.z + radius);
                zone.meshGroup = createObjectZoneOutlineMesh(box, 0x00CED1, 0.8);
            }
        } else {
            // Floor / ceiling
            zone.meshGroup = createZoneOutlineMesh(
                zd.bounds.minX, zd.bounds.minZ,
                zd.bounds.maxX, zd.bounds.maxZ,
                zd.y || 0, zd.type
            );
        }

        if (zone.meshGroup) scene.add(zone.meshGroup);

        // Create label
        const cx = (zd.bounds.minX + zd.bounds.maxX) / 2;
        const cz = (zd.bounds.minZ + zd.bounds.maxZ) / 2;
        let labelText = 'Zone #' + zd.id;
        if (zd.actionType === 'link' && zd.actionValue) labelText = 'Lien: ' + zd.actionValue;
        else if (zd.actionValue) labelText = zd.actionType + ': ' + zd.actionValue;

        // Pour les zones personnage, positionner le label au-dessus de la tête
        let labelY = zd.y || 0;
        let spriteOpts = {};
        if (sm === 'character') {
            if (zone.characterHeight !== undefined && zone.characterBaseY !== undefined) {
                labelY = zone.characterBaseY + zone.characterHeight;
            } else {
                labelY = (zd.y || 0) + 0.85;
            }
            spriteOpts = { scaleX: 0.8, scaleY: 0.1, yOffset: 0.15 };
        }

        zone.labelSprite = createZoneLabelSprite(labelText, new THREE.Vector3(cx, labelY, cz), spriteOpts);
        scene.add(zone.labelSprite);

        if (interactionMode === 'game') {
            if (zone.meshGroup) zone.meshGroup.visible = false;
            zone.labelSprite.visible = false;
        }

        interactionZones.push(zone);
    });
}

// --- Overlay System ---

let _videoProgressInterval = null;

function _formatTime(sec) {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
}

function _startVideoProgressUpdate() {
    _stopVideoProgressUpdate();
    const video = document.getElementById('overlay-video-player');
    const progress = document.getElementById('video-progress');
    const timeCur = document.getElementById('video-time-current');
    const timeTotal = document.getElementById('video-time-total');
    _videoProgressInterval = setInterval(() => {
        if (!video || video.paused && !video.seeking) return;
        if (video.duration) {
            progress.value = (video.currentTime / video.duration) * 100;
            timeCur.textContent = _formatTime(video.currentTime);
            timeTotal.textContent = _formatTime(video.duration);
        }
    }, 250);
}

function _stopVideoProgressUpdate() {
    if (_videoProgressInterval) { clearInterval(_videoProgressInterval); _videoProgressInterval = null; }
}

function _updatePlayButton(playing) {
    const btn = document.getElementById('video-btn-play');
    if (btn) btn.textContent = playing ? '⏸' : '▶';
}

function showVideoOverlay(url, zone) {
    if (!url) return;
    _currentCinematicZone = zone || null;
    const overlay = document.getElementById('video-overlay');
    const video = document.getElementById('overlay-video-player');
    const iframe = document.getElementById('video-iframe');
    const skipHint = document.getElementById('video-skip-hint');

    // Detect YouTube
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
    if (ytMatch) {
        video.style.display = 'none';
        iframe.style.display = 'block';
        iframe.src = 'https://www.youtube.com/embed/' + ytMatch[1] + '?autoplay=1&rel=0&controls=0&modestbranding=1';
    } else {
        iframe.style.display = 'none';
        video.style.display = 'block';
        video.src = url;
        video.volume = 1;

        // Auto-retour/navigation: action quand la vidéo se termine
        video.onended = () => {
            const z = _currentCinematicZone;
            if (z && z.videoEndAction === 'navigate' && z.videoEndUrl) {
                console.log('🎬 Cinématique terminée, navigation vers:', z.videoEndUrl);
                _navigateAfterVideo(z.videoEndUrl);
            } else {
                console.log('🎬 Cinématique terminée, retour au jeu');
                closeVideoOverlay();
            }
        };

        video.onplay = null;
        video.onpause = null;

        // Lancer la lecture automatiquement
        video.play().catch((err) => {
            console.warn('⚠️ Lecture auto bloquée:', err.message);
        });
    }

    // Suspendre le rendu 3D pour libérer le GPU (anti-saccade)
    _cinematicPlaying = true;

    // Mettre en sourdine toute la musique/ambiance de fond
    _muteGameAudio();

    // Afficher l'overlay en plein écran noir
    overlay.style.display = 'block';

    // Passer en plein écran navigateur (Fullscreen API)
    const requestFS = overlay.requestFullscreen || overlay.webkitRequestFullscreen || overlay.msRequestFullscreen;
    if (requestFS) {
        requestFS.call(overlay).catch(() => {
            console.log('⚠️ Fullscreen API refusée, lecture en overlay plein écran');
        });
    }

    // Afficher l'indice "Echap pour quitter" brièvement
    if (skipHint) {
        skipHint.style.opacity = '1';
        clearTimeout(overlay._hintTimeout);
        overlay._hintTimeout = setTimeout(() => {
            skipHint.style.opacity = '0';
        }, 3000);
    }

    // Permettre de fermer au clic sur l'overlay (comme passer une cinématique)
    overlay._cinematicClickHandler = (e) => {
        // Ignorer les clics sur l'iframe YouTube
        if (e.target === iframe) return;
        closeVideoOverlay();
    };
    overlay.addEventListener('click', overlay._cinematicClickHandler);

    // Permettre de fermer avec Echap
    overlay._cinematicKeyHandler = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            closeVideoOverlay();
        }
    };
    document.addEventListener('keydown', overlay._cinematicKeyHandler, true);

    // Gérer la sortie du plein écran par le navigateur (Echap natif)
    overlay._fullscreenChangeHandler = () => {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            // L'utilisateur a quitté le plein écran → fermer la cinématique
            if (overlay.style.display !== 'none') {
                closeVideoOverlay();
            }
        }
    };
    document.addEventListener('fullscreenchange', overlay._fullscreenChangeHandler);
    document.addEventListener('webkitfullscreenchange', overlay._fullscreenChangeHandler);

    console.log('🎬 Cinématique lancée:', url);
}

let _closingVideoOverlay = false; // Garde anti-réentrance
function closeVideoOverlay() {
    if (_closingVideoOverlay) return;
    _closingVideoOverlay = true;
    _stopVideoProgressUpdate();
    const overlay = document.getElementById('video-overlay');
    const video = document.getElementById('overlay-video-player');
    const iframe = document.getElementById('video-iframe');

    // Nettoyer les handlers cinématiques
    if (overlay._cinematicClickHandler) {
        overlay.removeEventListener('click', overlay._cinematicClickHandler);
        overlay._cinematicClickHandler = null;
    }
    if (overlay._cinematicKeyHandler) {
        document.removeEventListener('keydown', overlay._cinematicKeyHandler, true);
        overlay._cinematicKeyHandler = null;
    }
    if (overlay._fullscreenChangeHandler) {
        document.removeEventListener('fullscreenchange', overlay._fullscreenChangeHandler);
        document.removeEventListener('webkitfullscreenchange', overlay._fullscreenChangeHandler);
        overlay._fullscreenChangeHandler = null;
    }
    clearTimeout(overlay._hintTimeout);

    // Arrêter la vidéo
    video.onended = null;
    video.onplay = null;
    video.onpause = null;
    video.pause();
    video.src = '';
    iframe.src = '';

    // Quitter le plein écran AVANT de masquer l'overlay
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        const exitFS = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
        if (exitFS) {
            exitFS.call(document).then(() => {
                overlay.style.display = 'none';
                console.log('🎬 Cinématique fermée, retour au jeu');
            }).catch(() => {
                overlay.style.display = 'none';
            });
        } else {
            overlay.style.display = 'none';
        }
    } else {
        overlay.style.display = 'none';
        console.log('🎬 Cinématique fermée, retour au jeu');
    }
    // Reprendre le rendu 3D
    _cinematicPlaying = false;
    _currentCinematicZone = null;
    // Forcer un getDelta() pour éviter un saut d'animation au premier frame
    clock.getDelta();

    // Rétablir le volume de la musique/ambiance de fond
    _unmuteGameAudio();

    // Reset le garde après un court délai (laisser le temps au fullscreen de se fermer)
    setTimeout(() => { _closingVideoOverlay = false; }, 200);
}

// Navigation vers une autre page après la fin d'une cinématique vidéo
function _navigateAfterVideo(targetUrl) {
    // 1. Fermer la cinématique (quitter fullscreen, cacher overlay, reprendre audio)
    closeVideoOverlay();

    // 2. Afficher l'écran de chargement existant avec la barre de progression
    const ls = document.getElementById('loading-screen');
    if (ls) {
        ls.style.display = 'flex';
        ls.classList.remove('fade-out');
        ls.style.opacity = '1';
        const bar = document.getElementById('loading-bar');
        if (bar) {
            bar.style.animation = 'none';
            bar.style.width = '0%';
            // Relancer l'animation de la barre
            requestAnimationFrame(() => {
                bar.style.animation = 'loading-progress 2.5s ease-out forwards';
            });
        }
        // Mettre à jour le sous-titre
        const subtitle = ls.querySelector('.loading-subtitle');
        if (subtitle) subtitle.textContent = 'Chargement de la nouvelle salle...';
    }

    // 3. Court délai pour que l'écran de chargement soit visible, puis naviguer
    setTimeout(() => {
        console.log('🔗 Navigation post-cinématique vers:', targetUrl);
        window.location.href = targetUrl;
    }, 400);
}

function showImageLightbox(url) {
    if (!url) return;
    const overlay = document.getElementById('lightbox-image-overlay');
    const img = document.getElementById('lightbox-image');
    img.src = url;
    overlay.style.display = 'block';
    console.log('🖼️ Lightbox image ouvert:', url);
}

function closeImageLightbox() {
    const overlay = document.getElementById('lightbox-image-overlay');
    const img = document.getElementById('lightbox-image');
    img.src = '';
    overlay.style.display = 'none';
}

function showTextLightbox(textOrHtml) {
    if (!textOrHtml) return;
    const overlay = document.getElementById('lightbox-text-overlay');
    const content = document.getElementById('lightbox-text-content');
    content.innerHTML = textOrHtml;
    overlay.style.display = 'block';
    console.log('📄 Lightbox texte ouvert');
}

function closeTextLightbox() {
    const overlay = document.getElementById('lightbox-text-overlay');
    const content = document.getElementById('lightbox-text-content');
    content.innerHTML = '';
    overlay.style.display = 'none';
}

function closeAllOverlays() {
    closeVideoOverlay();
    closeImageLightbox();
    closeTextLightbox();
}

// --- Mechanical Interactions (Turn Button / Lever / Fader) ---

function startMechanicalInteraction(zone, event) {
    if (!zone || !zone.objectRef) return;

    const targetObj = findObjectByRef(zone.objectRef);
    if (!targetObj) {
        console.log('⚠️ Objet introuvable pour interaction mécanique');
        return;
    }

    const cfg = zone.actionConfig || {};
    const axis = cfg.axis || 'y';
    const speed = cfg.speed || 1;
    const maxRange = cfg.range || 360;
    const isRightClick = (event.button === 2);

    activeGameInteraction = {
        zone: zone,
        object: targetObj,
        axis: axis,
        speed: speed,
        maxRange: maxRange,
        startMouseX: event.clientX,
        startMouseY: event.clientY,
        startRotation: targetObj.rotation.clone(),
        startPosition: targetObj.position.clone(),
        totalDelta: 0,
        isRightClick: isRightClick,
        type: zone.actionType // turn-button, lever, fader
    };

    const onMove = onMechanicalMove;
    const onUp = function(e) {
        onMechanicalUp(e);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    console.log(`🔧 Interaction mécanique démarrée: ${zone.actionType} sur "${zone.objectRef.editorName}"`);
}

function onMechanicalMove(event) {
    if (!activeGameInteraction) return;

    const ai = activeGameInteraction;
    const deltaX = event.clientX - ai.startMouseX;
    const deltaY = event.clientY - ai.startMouseY;

    const speedFactor = ai.speed * 0.01;

    if (ai.type === 'turn-button') {
        // Rotation based on horizontal mouse movement
        const dir = ai.isRightClick ? -1 : 1;
        const angle = deltaX * speedFactor * dir;
        const maxRad = (ai.maxRange * Math.PI) / 180;
        const clampedAngle = Math.max(-maxRad, Math.min(maxRad, angle));

        ai.object.rotation.copy(ai.startRotation);
        switch (ai.axis) {
            case 'x': ai.object.rotation.x += clampedAngle; break;
            case 'y': ai.object.rotation.y += clampedAngle; break;
            case 'z': ai.object.rotation.z += clampedAngle; break;
        }
        ai.totalDelta = Math.abs(clampedAngle / maxRad);

    } else if (ai.type === 'lever') {
        // Vertical movement based on mouse Y
        const move = -deltaY * speedFactor;
        const maxMove = ai.maxRange * 0.01; // range in cm → m
        const clampedMove = Math.max(-maxMove, Math.min(maxMove, move));

        ai.object.position.copy(ai.startPosition);
        switch (ai.axis) {
            case 'x': ai.object.position.x += clampedMove; break;
            case 'y': ai.object.position.y += clampedMove; break;
            case 'z': ai.object.position.z += clampedMove; break;
        }
        ai.totalDelta = Math.abs(clampedMove / maxMove);

    } else if (ai.type === 'fader') {
        // Horizontal movement based on mouse X
        const move = deltaX * speedFactor;
        const maxMove = ai.maxRange * 0.01; // range in cm → m
        const clampedMove = Math.max(-maxMove, Math.min(maxMove, move));

        ai.object.position.copy(ai.startPosition);
        switch (ai.axis) {
            case 'x': ai.object.position.x += clampedMove; break;
            case 'y': ai.object.position.y += clampedMove; break;
            case 'z': ai.object.position.z += clampedMove; break;
        }
        ai.totalDelta = Math.abs(clampedMove / maxMove);
    }
}

function onMechanicalUp(event) {
    if (!activeGameInteraction) return;

    const ai = activeGameInteraction;

    // Check if threshold reached (>80% of max range) → trigger consequence
    if (ai.totalDelta > 0.8) {
        const cfg = ai.zone.actionConfig || {};
        if (cfg.consequenceType && cfg.consequenceValue) {
            executeConsequenceAction(cfg.consequenceType, cfg.consequenceValue);
        }
    }

    console.log(`🔧 Interaction mécanique terminée (delta: ${(ai.totalDelta * 100).toFixed(0)}%)`);
    activeGameInteraction = null;
}

function executeConsequenceAction(type, value) {
    switch (type) {
        case 'link':
            window.location.href = value;
            break;
        case 'video':
            showVideoOverlay(value);
            break;
        case 'lightbox-image':
            showImageLightbox(value);
            break;
        case 'lightbox-text':
            showTextLightbox(value);
            break;
        case 'message':
            alert(value);
            break;
        default:
            break;
    }
}

// --- Zone Distance Calculation (all surface types) ---

function getZoneDistance(zone, cameraPos) {
    const sm = zone.surfaceMode || 'floor';

    if (sm === 'wall' || sm === 'object' || sm === 'character') {
        // 3D distance to zone center
        const cx = (zone.bounds.minX + zone.bounds.maxX) / 2;
        const cy = zone.y;
        const cz = (zone.bounds.minZ + zone.bounds.maxZ) / 2;
        return cameraPos.distanceTo(new THREE.Vector3(cx, cy, cz));
    }

    // Floor/ceiling: 2D XZ distance
    const cx = (zone.bounds.minX + zone.bounds.maxX) / 2;
    const cz = (zone.bounds.minZ + zone.bounds.maxZ) / 2;
    return new THREE.Vector2(cameraPos.x, cameraPos.z).distanceTo(new THREE.Vector2(cx, cz));
}

// --- Contour discret turquoise (BoxHelper) pour proximité ---

const highlightedInteractionObjects = new Map(); // uuid → { helper, object, hotspot? }

// Créer le point d'interaction pulsatile (sphère turquoise semi-transparente)
function _createInteractionHotspot(position, radius) {
    const geo = new THREE.SphereGeometry(radius, 16, 12);
    const mat = new THREE.MeshBasicMaterial({
        color: 0x00CED1,
        transparent: true,
        opacity: 0.35,
        depthTest: false,   // Toujours visible par-dessus le personnage
        depthWrite: false    // Ne masque pas les objets derrière
    });
    const hotspot = new THREE.Mesh(geo, mat);
    hotspot.renderOrder = 999; // Rendu après tout le reste
    hotspot.position.copy(position);
    hotspot.userData.isGizmo = true;
    hotspot.userData.isInteractionHotspot = true;
    // Propriétés pour l'animation pulsatile
    hotspot.userData._baseScale = 1.0;
    hotspot.userData._pulsePhase = Math.random() * Math.PI * 2; // Décalage aléatoire
    return hotspot;
}

// Calculer la position du thorax d'un personnage
function _getCharacterChestPosition(char) {
    const worldPos = new THREE.Vector3();
    // Chercher un bone de type "spine" ou "chest" pour le thorax
    const chestBoneNames = ['spine1', 'spine2', 'chest', 'Spine1', 'Spine2', 'Chest', 'spine_01', 'spine_02', 'Spine', 'upperchest', 'UpperChest'];
    let chestBone = null;
    char.traverse(child => {
        if (child.isBone && !chestBone) {
            const n = child.name.toLowerCase();
            for (const cn of chestBoneNames) {
                if (n === cn.toLowerCase() || n.includes('spine1') || n.includes('spine2') || n.includes('chest')) {
                    chestBone = child;
                    break;
                }
            }
        }
    });
    if (chestBone) {
        chestBone.getWorldPosition(worldPos);
        return worldPos;
    }
    // Fallback: 60% de la hauteur du personnage (approximation thorax)
    const box = new THREE.Box3().setFromObject(char);
    const h = box.max.y - box.min.y;
    worldPos.set(
        (box.min.x + box.max.x) / 2,
        box.min.y + h * 0.6,
        (box.min.z + box.max.z) / 2
    );
    return worldPos;
}

// Mettre à jour l'animation pulsatile de tous les hotspots actifs
function _updateInteractionHotspots() {
    const t = performance.now() * 0.003; // Vitesse de pulsation
    highlightedInteractionObjects.forEach((data) => {
        if (data.hotspot) {
            const phase = data.hotspot.userData._pulsePhase || 0;
            const pulse = 0.85 + 0.15 * Math.sin(t + phase); // Oscille entre 0.85x et 1.0x
            data.hotspot.scale.setScalar(pulse);
            const opPulse = 0.25 + 0.15 * Math.sin(t + phase); // Opacité oscille entre 0.25 et 0.40
            data.hotspot.material.opacity = opPulse;
        }
    });
}

function highlightObjectForInteraction(obj, zone) {
    if (!obj || highlightedInteractionObjects.has(obj.uuid)) return;

    const isCharacter = zone && zone.surfaceMode === 'character';

    if (isCharacter) {
        // Point pulsatile au thorax pour les personnages
        const chestPos = _getCharacterChestPosition(obj);
        console.log(`🔵 Création hotspot pour "${obj.userData.editorName || obj.name}" à position:`, chestPos.x.toFixed(2), chestPos.y.toFixed(2), chestPos.z.toFixed(2));
        const hotspot = _createInteractionHotspot(chestPos, 0.07);
        scene.add(hotspot);
        highlightedInteractionObjects.set(obj.uuid, { helper: null, object: obj, hotspot: hotspot, zone: zone });
    } else {
        // BoxHelper pour les objets normaux
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
    if (data.helper) {
        scene.remove(data.helper);
        data.helper.geometry.dispose();
        data.helper.material.dispose();
    }
    if (data.hotspot) {
        scene.remove(data.hotspot);
        data.hotspot.geometry.dispose();
        data.hotspot.material.dispose();
    }
    highlightedInteractionObjects.delete(obj.uuid);
}

function clearAllInteractionHighlights() {
    highlightedInteractionObjects.forEach((data) => {
        if (data.helper) {
            scene.remove(data.helper);
            data.helper.geometry.dispose();
            data.helper.material.dispose();
        }
        if (data.hotspot) {
            scene.remove(data.hotspot);
            data.hotspot.geometry.dispose();
            data.hotspot.material.dispose();
        }
    });
    highlightedInteractionObjects.clear();
}

// --- Game Mode Zone Interaction ---

function checkZoneProximity() {
    if (interactionMode !== 'game') return;

    const activeObjectUuids = new Set();

    interactionZones.forEach(zone => {
        const distance = getZoneDistance(zone, camera.position);

        // Show outline when within proximity range
        const proxRange = (zone.surfaceMode === 'wall' || zone.surfaceMode === 'object' || zone.surfaceMode === 'character') ? 2.5 : 1.5;
        const visible = distance < proxRange;
        if (zone.meshGroup) zone.meshGroup.visible = visible;
        // Les étiquettes restent TOUJOURS cachées en mode jeu (visible uniquement en mode développeur)

        // Surbrillance turquoise sur les objets à proximité
        if (zone.surfaceMode === 'object' && zone.objectRef) {
            const obj = findObjectByRef(zone.objectRef);
            if (obj) {
                if (visible) {
                    highlightObjectForInteraction(obj, zone);
                    activeObjectUuids.add(obj.uuid);
                }
            }
        }

        // Point pulsatile turquoise sur les personnages à proximité
        if (zone.surfaceMode === 'character' && zone.characterRef) {
            const char = findCharacterByRef(zone.characterRef);
            if (char) {
                if (visible) {
                    highlightObjectForInteraction(char, zone);
                    activeObjectUuids.add(char.uuid);
                }
            } else {
                // Debug : personnage non trouvé
                if (!zone._charNotFoundLogged) {
                    console.warn(`⚠️ Zone #${zone.id}: personnage non trouvé pour characterRef`, zone.characterRef);
                    zone._charNotFoundLogged = true;
                }
            }
        }
    });

    // Unhighlight les objets qui ne sont plus à proximité + update les actifs
    highlightedInteractionObjects.forEach((data, uuid) => {
        if (!activeObjectUuids.has(uuid)) {
            if (data.helper) {
                scene.remove(data.helper);
                data.helper.geometry.dispose();
                data.helper.material.dispose();
            }
            if (data.hotspot) {
                scene.remove(data.hotspot);
                data.hotspot.geometry.dispose();
                data.hotspot.material.dispose();
            }
            highlightedInteractionObjects.delete(uuid);
        } else {
            // Mettre à jour le contour pour les objets (BoxHelper)
            if (data.helper && data.object) {
                data.helper.update();
            }
            // Mettre à jour la position du hotspot pour les personnages animés
            if (data.hotspot && data.object) {
                const newChestPos = _getCharacterChestPosition(data.object);
                data.hotspot.position.copy(newChestPos);
            }
        }
    });

    // Mettre à jour l'animation pulsatile
    _updateInteractionHotspots();
}

function checkHoldTrigger() {
    if (!heldZone || holdStartTime === 0) return;
    const elapsed = performance.now() - holdStartTime;
    if (elapsed >= 1000) {
        const isMechanical = ['turn-button', 'lever', 'fader'].includes(heldZone.actionType);
        if (isMechanical) {
            startMechanicalInteraction(heldZone, null);
        } else {
            executeZoneAction(heldZone);
        }
        heldZone = null;
        holdStartTime = 0;
    }
}

function checkHoverAndProximityTriggers() {
    if (interactionMode !== 'game') return;

    // Hover: raycast du centre de l'écran (regard)
    const hoverRaycaster = new THREE.Raycaster();
    hoverRaycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    const currentHovered = new Set();
    const currentProximity = new Set();

    for (const zone of interactionZones) {
        const zoneTrigger = zone.triggerType || 'click';
        const isMechanical = ['turn-button', 'lever', 'fader'].includes(zone.actionType);
        if (!zone.actionValue && !isMechanical) continue;

        const distance = getZoneDistance(zone, camera.position);
        const interactRange = (zone.surfaceMode === 'wall' || zone.surfaceMode === 'object' || zone.surfaceMode === 'character') ? 2.5 : 1.5;
        const inRange = distance < interactRange;

        if (zoneTrigger === 'hover' && inRange) {
            // Vérifier si le regard intersecte la zone
            const meshes = [];
            if (zone.meshGroup) zone.meshGroup.traverse(child => { if (child.isMesh) meshes.push(child); });
            // Aussi vérifier l'objet associé
            if (zone.surfaceMode === 'object' && zone.objectRef) {
                const obj = findObjectByRef(zone.objectRef);
                if (obj) obj.traverse(child => { if (child.isMesh) meshes.push(child); });
            }
            // Aussi vérifier le personnage associé (via proxy)
            if (zone.surfaceMode === 'character' && zone.characterRef) {
                const char = findCharacterByRef(zone.characterRef);
                if (char) {
                    const proxyEntry = characterCollisionProxies.find(e => e.character === char);
                    if (proxyEntry && proxyEntry.proxy) meshes.push(proxyEntry.proxy);
                    char.traverse(child => { if (child.isMesh) meshes.push(child); });
                }
            }
            const hits = hoverRaycaster.intersectObjects(meshes, false);
            if (hits.length > 0) {
                currentHovered.add(zone.id);
                if (!hoveredZones.has(zone.id)) {
                    hoveredZones.add(zone.id);
                    if (isMechanical) {
                        startMechanicalInteraction(zone, null);
                    } else {
                        executeZoneAction(zone);
                    }
                }
            }
        }

        if (zoneTrigger === 'proximity' && inRange) {
            currentProximity.add(zone.id);
            if (!proximityTriggeredZones.has(zone.id)) {
                proximityTriggeredZones.add(zone.id);
                if (isMechanical) {
                    startMechanicalInteraction(zone, null);
                } else {
                    executeZoneAction(zone);
                }
            }
        }
    }

    // Reset les zones hover/proximity qui ne sont plus actives
    hoveredZones.forEach(id => {
        if (!currentHovered.has(id)) hoveredZones.delete(id);
    });
    proximityTriggeredZones.forEach(id => {
        if (!currentProximity.has(id)) proximityTriggeredZones.delete(id);
    });
}

function checkZoneInteraction(event, eventType) {
    if (interactionMode !== 'game') return false;
    eventType = eventType || 'click';

    // Préparer le raycast pour les interactions clic (vérifier qu'on clique SUR l'objet/zone)
    const clickRaycaster = new THREE.Raycaster();
    const isPointerLocked = document.pointerLockElement === renderer.domElement;
    if (isPointerLocked) {
        // En mode FPS (pointer lock), le joueur vise toujours au centre de l'écran
        clickRaycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    } else if (event && event.clientX !== undefined) {
        const mx = (event.clientX / window.innerWidth) * 2 - 1;
        const my = -(event.clientY / window.innerHeight) * 2 + 1;
        clickRaycaster.setFromCamera(new THREE.Vector2(mx, my), camera);
    } else {
        // Pas d'événement souris, utiliser le centre de l'écran
        clickRaycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    }
    console.log(`🖱️ checkZoneInteraction(${eventType}): ${interactionZones.length} zones, click@(${event ? event.clientX : '?'},${event ? event.clientY : '?'}), pointerLocked=${isPointerLocked}`);

    for (const zone of interactionZones) {
        // Mechanical actions don't need actionValue
        const isMechanical = ['turn-button', 'lever', 'fader'].includes(zone.actionType);
        if (!zone.actionValue && !isMechanical) {
            console.log(`⚠️ Zone #${zone.id} "${zone.surfaceMode}" ignorée: actionValue vide, actionType="${zone.actionType}"`);
            continue;
        }

        // Vérifier que le trigger correspond
        const zoneTrigger = zone.triggerType || 'click';
        if (zoneTrigger !== eventType) continue;

        const distance = getZoneDistance(zone, camera.position);
        const interactRange = (zone.surfaceMode === 'wall' || zone.surfaceMode === 'object' || zone.surfaceMode === 'character') ? 2.5 : 1.5;

        if (distance < interactRange) {
            console.log(`🔍 Zone #${zone.id} "${zone.surfaceMode}" à portée (${distance.toFixed(2)}m < ${interactRange}m), action="${zone.actionType}", trigger="${zoneTrigger}"`);
            // Pour les triggers clic, vérifier que le raycast touche la zone ou l'objet
            const clickTriggers = ['click', 'double-click', 'right-click', 'hold'];
            if (clickTriggers.includes(eventType)) {
                let hitZone = false;

                // Pour les zones personnage : tester le hotspot pulsatile (point turquoise)
                if (zone.surfaceMode === 'character' && zone.characterRef) {
                    const char = findCharacterByRef(zone.characterRef);
                    if (char) {
                        // Priorité 1 : Tester le hotspot pulsatile (zone de clic précise)
                        const highlightData = highlightedInteractionObjects.get(char.uuid);
                        if (highlightData && highlightData.hotspot) {
                            highlightData.hotspot.updateMatrixWorld(true);
                            const hotspotHits = clickRaycaster.intersectObject(highlightData.hotspot, false);
                            if (hotspotHits.length > 0) {
                                hitZone = true;
                                console.log(`✅ Raycast touche le hotspot du personnage "${char.userData.editorName || char.name}" à ${hotspotHits[0].distance.toFixed(2)}m`);
                            }
                        }
                        // Pas de fallback sur le proxy/meshes entier : le joueur DOIT cliquer sur le point
                        if (!hitZone) {
                            console.log(`❌ Raycast ne touche pas le hotspot du personnage "${char.userData.editorName || char.name}" — cliquez sur le point turquoise`);
                        }
                    } else {
                        console.log(`❌ Personnage non trouvé pour characterRef:`, zone.characterRef);
                    }
                }

                // Pour les zones objet : tester d'abord l'objet lui-même (toujours visible)
                if (!hitZone && zone.surfaceMode === 'object' && zone.objectRef) {
                    const obj = findObjectByRef(zone.objectRef);
                    if (obj) {
                        const objMeshes = [];
                        obj.traverse(child => { if (child.isMesh) objMeshes.push(child); });
                        const hits = clickRaycaster.intersectObjects(objMeshes, false);
                        if (hits.length > 0) {
                            hitZone = true;
                            console.log(`✅ Raycast touche l'objet "${obj.userData.editorName || obj.name}" à ${hits[0].distance.toFixed(2)}m`);
                        } else {
                            console.log(`❌ Raycast ne touche PAS l'objet "${obj.userData.editorName || obj.name}" (${objMeshes.length} meshes testés)`);
                        }
                    } else {
                        console.log(`❌ Objet non trouvé pour objectRef:`, zone.objectRef);
                    }
                }

                // Pour les zones mur/sol/plafond : rendre temporairement visible pour le raycast
                if (!hitZone && zone.meshGroup) {
                    const wasVisible = zone.meshGroup.visible;
                    zone.meshGroup.visible = true;
                    const zoneMeshes = [];
                    zone.meshGroup.traverse(child => { if (child.isMesh) zoneMeshes.push(child); });
                    if (clickRaycaster.intersectObjects(zoneMeshes, false).length > 0) hitZone = true;
                    zone.meshGroup.visible = wasVisible;
                }

                if (!hitZone) continue; // Le clic n'a pas touché cette zone
            }

            // For mechanical actions, start the interaction
            if (isMechanical) {
                startMechanicalInteraction(zone, event);
                return true;
            }
            executeZoneAction(zone);
            return true;
        }
    }
    return false;
}

function executeZoneAction(zone) {
    console.log(`🎯 executeZoneAction: type="${zone.actionType}", value="${zone.actionValue}", surface="${zone.surfaceMode}"`);
    switch (zone.actionType) {
        case 'link':
            if (zone.actionValue) {
                console.log(`🔗 Zone #${zone.id}: Navigation vers ${zone.actionValue}`);
                window.location.href = zone.actionValue;
            }
            break;
        case 'message':
            if (zone.actionValue) {
                console.log(`💬 Zone #${zone.id}: ${zone.actionValue}`);
                alert(zone.actionValue);
            }
            break;
        case 'teleport':
            if (zone.actionValue) {
                const coords = zone.actionValue.split(',').map(Number);
                if (coords.length >= 3 && coords.every(n => !isNaN(n))) {
                    camera.position.set(coords[0], coords[1], coords[2]);
                    console.log(`⚡ Zone #${zone.id}: Téléportation vers ${zone.actionValue}`);
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
            if (zone.actionValue && typeof DialogueManager !== 'undefined') {
                DialogueManager.start(zone.actionValue);
            } else {
                console.warn('DialogueManager non disponible ou actionValue manquant.');
            }
            break;
        default:
            break;
    }
}

