/**
 * ============================================================
 * RESISTANCE — editor/floorplan/floorplan-tools-basic.js
 * Outil Mesure (règle interactive) et outil Spawn (position de
 * départ du joueur en mode jeu)
 * ------------------------------------------------------------
 * Découpage mécanique de l'ancien editor-floorplan.js (E0-bis,
 * 07/2026), même méthode que game/engine/ (Phase 4) : frontières
 * de sections existantes, globales/fonctions inchangées.
 * ============================================================
 */

// ==================== OUTIL MESURE ====================

// Nettoyer l'outil de mesure (ligne, label)
function cleanupMeasureTool() {
    isMeasuring = false;
    measureStartPoint3D = null;
    measureStartScreenPos = null;

    if (measureStartMarker) {
        scene.remove(measureStartMarker);
        if (measureStartMarker.geometry) measureStartMarker.geometry.dispose();
        if (measureStartMarker.material) measureStartMarker.material.dispose();
        measureStartMarker = null;
    }

    if (measureLine) {
        scene.remove(measureLine);
        if (measureLine.geometry) measureLine.geometry.dispose();
        if (measureLine.material) measureLine.material.dispose();
        measureLine = null;
    }

    if (measureLabel) {
        measureLabel.remove();
        measureLabel = null;
    }
}

// Créer ou mettre à jour la ligne de mesure rose
function updateMeasureLine(startPoint3D, endPoint3D) {
    // Supprimer l'ancienne ligne
    if (measureLine) {
        scene.remove(measureLine);
        if (measureLine.geometry) measureLine.geometry.dispose();
        measureLine = null;
    }

    const points = [startPoint3D.clone(), endPoint3D.clone()];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
        color: 0xff69b4, // Rose
        linewidth: 2,
        depthTest: false
    });
    measureLine = new THREE.Line(geometry, material);
    measureLine.renderOrder = 999;
    scene.add(measureLine);
}

// Créer ou mettre à jour le label de distance
function updateMeasureLabel(distanceMeters, screenX, screenY) {
    if (!measureLabel) {
        measureLabel = document.createElement('div');
        measureLabel.className = 'measure-label';
        document.body.appendChild(measureLabel);
    }

    measureLabel.textContent = distanceMeters.toFixed(2) + 'm';
    measureLabel.style.left = screenX + 'px';
    measureLabel.style.top = screenY + 'px';
    measureLabel.style.display = 'block';
}

// Obtenir le point 3D sous la souris (intersecte murs, objets, sol, plafond)
function getMeasurePoint3D(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    editorMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    editorMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    editorRaycaster.setFromCamera(editorMouse, camera);

    // Chercher intersection avec tous les objets de la scène (murs, sol, plafond, objets)
    const allObjects = [];
    scene.traverse(child => {
        if (child.isMesh && child.visible) {
            allObjects.push(child);
        }
    });

    const intersects = editorRaycaster.intersectObjects(allObjects, false);
    if (intersects.length > 0) {
        return intersects[0].point.clone();
    }

    // Fallback: plan horizontal Y=0
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const pt = new THREE.Vector3();
    if (editorRaycaster.ray.intersectPlane(plane, pt)) {
        return pt;
    }

    return null;
}

// ==================== OUTIL POSITION DE DÉPART DU JOUEUR (SPAWN) ====================

// Activer l'outil de placement du spawn
function activateSpawnTool() {
    // Désactiver l'outil zone si actif
    if (activeZoneTool) deactivateZoneTool();

    isSpawnToolActive = true;
    const canvas = renderer.domElement;
    canvas.classList.add('game-cursor-spawn');

    // Mettre en surbrillance le bouton
    const btn = document.getElementById('tool-spawn-player');
    btn.classList.remove('btn-outline');
    btn.classList.add('btn-primary');

    console.log('🎯 Outil de placement du spawn activé - Cliquez dans la scène');
}

// Désactiver l'outil de placement du spawn
function deactivateSpawnTool() {
    isSpawnToolActive = false;
    const canvas = renderer.domElement;
    canvas.classList.remove('game-cursor-spawn');

    // Remettre le bouton en outline
    const btn = document.getElementById('tool-spawn-player');
    if (btn) {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline');
    }
}

// Créer ou mettre à jour le marqueur visuel du spawn (bonhomme + flèche de direction)
function updateSpawnMarker() {
    // Supprimer l'ancien marqueur
    if (spawnMarkerGroup) {
        scene.remove(spawnMarkerGroup);
        spawnMarkerGroup.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
        spawnMarkerGroup = null;
    }

    if (!spawnPosition) return;

    spawnMarkerGroup = new THREE.Group();
    spawnMarkerGroup.userData.isGizmo = true;

    const spawnColor = spawnSaved ? 0x00ff88 : 0x00ccff;

    // Corps (cylindre)
    const bodyGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.9, 8);
    const bodyMat = new THREE.MeshBasicMaterial({ color: spawnColor, transparent: true, opacity: 0.8, depthTest: false });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.75;
    body.renderOrder = 998;
    spawnMarkerGroup.add(body);

    // Tête (sphère)
    const headGeo = new THREE.SphereGeometry(0.2, 12, 12);
    const headMat = new THREE.MeshBasicMaterial({ color: spawnColor, transparent: true, opacity: 0.8, depthTest: false });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.4;
    head.renderOrder = 998;
    spawnMarkerGroup.add(head);

    // Jambes (deux cylindres)
    const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 6);
    const legMat = new THREE.MeshBasicMaterial({ color: spawnColor, transparent: true, opacity: 0.8, depthTest: false });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.12, 0.2, 0);
    leftLeg.renderOrder = 998;
    spawnMarkerGroup.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo.clone(), legMat.clone());
    rightLeg.position.set(0.12, 0.2, 0);
    rightLeg.renderOrder = 998;
    spawnMarkerGroup.add(rightLeg);

    // Flèche de direction du regard
    const arrowLen = 1.2;
    const arrowGeo = new THREE.CylinderGeometry(0, 0.15, 0.4, 8);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.9, depthTest: false });
    const arrowHead = new THREE.Mesh(arrowGeo, arrowMat);
    arrowHead.position.set(0, PLAYER_EYE_HEIGHT, -arrowLen);
    arrowHead.rotation.x = -Math.PI / 2;
    arrowHead.renderOrder = 999;
    spawnMarkerGroup.add(arrowHead);

    // Ligne de la flèche
    const linePoints = [
        new THREE.Vector3(0, PLAYER_EYE_HEIGHT, 0),
        new THREE.Vector3(0, PLAYER_EYE_HEIGHT, -arrowLen + 0.2)
    ];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffaa00, depthTest: false });
    const arrowLine = new THREE.Line(lineGeo, lineMat);
    arrowLine.renderOrder = 999;
    spawnMarkerGroup.add(arrowLine);

    // Cercle de base au sol
    const circleGeo = new THREE.RingGeometry(0.4, 0.5, 32);
    const circleMat = new THREE.MeshBasicMaterial({ color: spawnColor, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthTest: false });
    const circle = new THREE.Mesh(circleGeo, circleMat);
    circle.rotation.x = -Math.PI / 2;
    circle.position.y = 0.02;
    circle.renderOrder = 998;
    spawnMarkerGroup.add(circle);

    // Positionner le groupe
    spawnMarkerGroup.position.set(spawnPosition.x, spawnPosition.y, spawnPosition.z);
    spawnMarkerGroup.rotation.y = spawnRotationY;

    scene.add(spawnMarkerGroup);
}

// Placer le spawn à la position cliquée dans la scène
function placeSpawnAtClick(event) {
    if (!isSpawnToolActive || currentEditorMode !== 'game-setup') return;

    const rect = renderer.domElement.getBoundingClientRect();
    editorMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    editorMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    editorRaycaster.setFromCamera(editorMouse, camera);

    // Chercher intersection avec les meshes de la scène (sols, murs, objets)
    const allObjects = [];
    scene.traverse(child => {
        if (child.isMesh && child.visible && !child.userData.isGizmo) {
            allObjects.push(child);
        }
    });

    const intersects = editorRaycaster.intersectObjects(allObjects, false);

    let hitPoint = null;
    if (intersects.length > 0) {
        hitPoint = intersects[0].point.clone();
        // Si on clique sur un sol, placer au niveau du sol
        // Si on clique sur un mur, prendre le point au pied du mur
        hitPoint.y = intersects[0].point.y;
        // Si la normale est verticale (sol), utiliser le point tel quel
        const normal = intersects[0].face ? intersects[0].face.normal.clone() : new THREE.Vector3(0, 1, 0);
        intersects[0].object.updateMatrixWorld();
        normal.transformDirection(intersects[0].object.matrixWorld);
        if (Math.abs(normal.y) > 0.5) {
            // Surface horizontale (sol/plafond) → placer au sol
            hitPoint.y = intersects[0].point.y;
        } else {
            // Surface verticale (mur) → placer au pied du mur
            hitPoint.y = 0;
        }
    } else {
        // Fallback: plan horizontal Y=0
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const pt = new THREE.Vector3();
        if (editorRaycaster.ray.intersectPlane(plane, pt)) {
            hitPoint = pt;
        }
    }

    if (!hitPoint) return;

    spawnPosition = { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z };
    spawnSaved = false;

    // Mettre à jour le marqueur visuel
    updateSpawnMarker();
    updateSpawnInfoDisplay();

    console.log(`🎯 Spawn placé à (${hitPoint.x.toFixed(2)}, ${hitPoint.y.toFixed(2)}, ${hitPoint.z.toFixed(2)})`);
}

// Pivoter le spawn avec les flèches gauche/droite
function rotateSpawn(direction) {
    if (!spawnPosition) return;
    const rotStep = Math.PI / 12; // 15 degrés
    spawnRotationY += direction * rotStep;
    spawnSaved = false;
    updateSpawnMarker();
    updateSpawnInfoDisplay();
}

// Enregistrer/fixer la position de spawn
function saveSpawnPosition() {
    if (!spawnPosition) {
        console.log('⚠️ Aucune position de spawn à enregistrer. Placez d\'abord le joueur.');
        return;
    }

    spawnSaved = true;
    updateSpawnMarker(); // Changer la couleur en vert

    // Mettre à jour l'affichage
    updateSpawnInfoDisplay();

    // Sauvegarder dans le projet
    markUnsavedChanges();

    console.log(`📌 Position de spawn enregistrée: (${spawnPosition.x.toFixed(2)}, ${spawnPosition.y.toFixed(2)}, ${spawnPosition.z.toFixed(2)}) rotation: ${(spawnRotationY * 180 / Math.PI).toFixed(1)}°`);
}

// Mettre à jour l'affichage des infos spawn
function updateSpawnInfoDisplay() {
    const infoDiv = document.getElementById('spawn-info');
    if (!infoDiv) return;

    if (spawnPosition) {
        infoDiv.style.display = 'block';
        document.getElementById('spawn-pos-display').textContent =
            `(${spawnPosition.x.toFixed(2)}, ${spawnPosition.y.toFixed(2)}, ${spawnPosition.z.toFixed(2)})`;
        document.getElementById('spawn-rot-display').textContent =
            `${(spawnRotationY * 180 / Math.PI).toFixed(1)}°` + (spawnSaved ? ' ✅' : ' ⏳');
    } else {
        infoDiv.style.display = 'none';
    }
}

// Appliquer la position de spawn à la caméra (affichage du marqueur en mode développeur)
function applySpawnToCamera() {
    updateSpawnMarker();
    updateControlsForMode();
}

