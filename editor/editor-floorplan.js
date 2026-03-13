// ==================== ÉDITEUR DE PLAN DE PIÈCE ====================

function setPlanViewTop() {
    if (!isPlanViewActive) {
        // Sauvegarder la position actuelle de la caméra et du target
        savedCameraPosition = camera.position.clone();
        savedCameraRotation = camera.rotation.clone();

        isPlanViewActive = true;

        // Positionner la caméra en vue de dessus (plus haut pour voir toute la grille)
        camera.position.set(0, 120, 0);

        // Configurer les contrôles pour la vue de dessus
        controls.target.set(0, 0, 0);
        controls.minPolarAngle = 0; // Permettre de regarder tout droit vers le bas
        controls.maxPolarAngle = Math.PI; // Permettre de regarder tout droit vers le bas
        controls.enableRotate = true;
        controls.enablePan = true;
        controls.update();

        // Créer ou afficher la grille
        if (!floorPlanGrid) {
            createFloorPlanGrid();
        } else {
            floorPlanGrid.visible = true;
        }

        console.log('📐 Vue de dessus activée - Position caméra:', camera.position, 'Target:', controls.target);
        console.log('📐 Grille visible:', floorPlanGrid ? floorPlanGrid.visible : 'null');
    }
}

function setPlanView3D() {
    if (isPlanViewActive && savedCameraPosition) {
        isPlanViewActive = false;

        // Restaurer la position de la caméra
        camera.position.copy(savedCameraPosition);
        camera.rotation.copy(savedCameraRotation);

        // Restaurer les contraintes des contrôles
        controls.minPolarAngle = 0;
        controls.maxPolarAngle = Math.PI / 2.1;
        controls.update();

        // Masquer la grille
        if (floorPlanGrid) {
            floorPlanGrid.visible = false;
        }

        console.log('🔄 Vue 3D restaurée - Position caméra:', camera.position);
    }
}

function createFloorPlanGrid() {
    // Supprimer l'ancienne grille si elle existe
    if (floorPlanGrid) {
        scene.remove(floorPlanGrid);
        floorPlanGrid = null;
    }

    const size = 200; // Taille totale de la grille (200m x 200m)
    const divisions = Math.floor(size / gridSize);
    const halfSize = size / 2;

    // Créer un groupe pour contenir toutes les lignes
    floorPlanGrid = new THREE.Group();
    floorPlanGrid.position.y = 0.05;
    floorPlanGrid.userData.isGizmo = true;

    // Matériaux pour lignes continues et pointillées
    const solidMaterial = new THREE.LineBasicMaterial({
        color: 0x666666,
        linewidth: 1,
        opacity: 0.6,
        transparent: true
    });

    const dashedMaterial = new THREE.LineDashedMaterial({
        color: 0x444444,
        linewidth: 1,
        opacity: 0.4,
        transparent: true,
        dashSize: 0.15,
        gapSize: 0.15
    });

    // Créer les lignes verticales et horizontales
    for (let i = 0; i <= divisions; i++) {
        const position = -halfSize + (i * gridSize);

        // Choisir le matériau selon la position (toutes les 5 lignes = solide)
        const material = (i % 5 === 0) ? solidMaterial : dashedMaterial;

        // Ligne verticale (parallèle à Z)
        const verticalGeometry = new THREE.BufferGeometry();
        const verticalVertices = new Float32Array([
            position, 0, -halfSize,
            position, 0, halfSize
        ]);
        verticalGeometry.setAttribute('position', new THREE.BufferAttribute(verticalVertices, 3));
        const verticalLine = new THREE.Line(verticalGeometry, material);

        if (material === dashedMaterial) {
            verticalLine.computeLineDistances();
        }

        floorPlanGrid.add(verticalLine);

        // Ligne horizontale (parallèle à X)
        const horizontalGeometry = new THREE.BufferGeometry();
        const horizontalVertices = new Float32Array([
            -halfSize, 0, position,
            halfSize, 0, position
        ]);
        horizontalGeometry.setAttribute('position', new THREE.BufferAttribute(horizontalVertices, 3));
        const horizontalLine = new THREE.Line(horizontalGeometry, material);

        if (material === dashedMaterial) {
            horizontalLine.computeLineDistances();
        }

        floorPlanGrid.add(horizontalLine);
    }

    scene.add(floorPlanGrid);

    // La visibilité sera gérée par switchEditorMode
    floorPlanGrid.visible = (currentEditorMode === 'floor-plan');

    console.log(`📐 Grille Sims créée: ${size}m x ${size}m, ${divisions} divisions, carrés de ${gridSize}m`);
}

function updateGridSize(newSize) {
    gridSize = parseFloat(newSize);
    if (isPlanViewActive) {
        createFloorPlanGrid();
    }
}

function snapToGrid(value) {
    if (!gridSnap) return value;
    return Math.round(value / gridSize) * gridSize;
}

function constrainToAxis(start, end) {
    // Contraindre le point final pour qu'il soit aligné avec le point de départ
    // selon un axe: horizontal (0°) ou vertical (90°) uniquement
    // Les murs obliques se tracent avec l'outil Oblique dédié
    const dx = end.x - start.x;
    const dz = end.z - start.z;

    const absDx = Math.abs(dx);
    const absDz = Math.abs(dz);

    // Déterminer la direction dominante (horizontal ou vertical)
    if (absDx >= absDz) {
        // Horizontal (0°)
        return { x: end.x, z: start.z };
    } else {
        // Vertical (90°)
        return { x: start.x, z: end.z };
    }
}

function addFloorPlanPoint(x, z) {
    // Appliquer le snap magnétique
    x = snapToGrid(x);
    z = snapToGrid(z);

    // Créer un mesh visible pour le point
    const pointGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const pointMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        depthTest: false
    });
    const pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);
    pointMesh.position.set(x, 0.5, z);
    pointMesh.userData.isFloorPlanPoint = true;
    pointMesh.userData.isGizmo = true;
    scene.add(pointMesh);

    // Ajouter à la liste des points
    const point = { x, z, mesh: pointMesh };
    floorPlanPoints.push(point);

    // Créer une ligne si c'est au moins le 2ème point
    if (floorPlanPoints.length > 1) {
        createLineBetweenPoints(
            floorPlanPoints[floorPlanPoints.length - 2],
            floorPlanPoints[floorPlanPoints.length - 1]
        );
    }

    console.log(`📍 Point ajouté: (${x}, ${z})`);
    return point;
}

function createLineBetweenPoints(point1, point2) {
    const points = [
        new THREE.Vector3(point1.x, 0.5, point1.z),
        new THREE.Vector3(point2.x, 0.5, point2.z)
    ];

    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x00ff00,
        linewidth: 2,
        depthTest: false
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.userData.isFloorPlanLine = true;
    line.userData.isGizmo = true;
    scene.add(line);

    floorPlanLines.push(line);
    return line;
}

function closePlanLoop() {
    if (floorPlanPoints.length > 2) {
        // Relier le dernier point au premier
        createLineBetweenPoints(
            floorPlanPoints[floorPlanPoints.length - 1],
            floorPlanPoints[0]
        );
        console.log('🔗 Boucle fermée');
    }
}

function setFloorPlanTool(tool) {
    floorPlanMode = tool;

    // Réinitialiser l'état de dessin
    isDrawingWall = false;
    drawStartPoint = null;
    selectedWall = null;
    lastWallEndPoint = null; // Réinitialiser le point de fin lors du changement d'outil
    if (currentPreviewWall) {
        scene.remove(currentPreviewWall);
        currentPreviewWall = null;
    }
    removePointMarkers();

    // Réinitialiser les états de déplacement/rotation
    isDraggingSelectedWalls = false;
    isRotatingSelectedWalls = false;
    dragStartPoint = null;
    rotationCenter = null;

    // Nettoyer l'outil de mesure si on le quitte
    cleanupMeasureTool();

    // Si on quitte le mode sélection, désélectionner les murs
    if (tool !== 'select') {
        clearWallSelection();
    }

    // Masquer l'indicateur d'angle oblique
    hideAngleIndicator();

    // Mettre à jour l'apparence des boutons
    const tools = ['tool-draw-wall', 'tool-draw-oblique', 'tool-draw-room', 'tool-delete-wall', 'tool-select', 'tool-texture', 'tool-measure'];
    tools.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-outline');
        }
    });

    // Activer le bouton sélectionné
    const activeId = 'tool-' + tool;
    const activeBtn = document.getElementById(activeId);
    if (activeBtn) {
        activeBtn.classList.remove('btn-outline');
        activeBtn.classList.add('btn-primary');
    }

    // Afficher/masquer le panneau texture
    const texturePanel = document.getElementById('texture-tool-panel');
    if (texturePanel) {
        texturePanel.style.display = (tool === 'texture') ? 'block' : 'none';
    }

    // Afficher/masquer le panneau d'arrondi des coins
    const roundingPanel = document.getElementById('room-rounding-panel');
    if (roundingPanel) {
        roundingPanel.style.display = (tool === 'draw-room') ? 'block' : 'none';
    }

    // Mettre à jour le curseur
    updateFloorPlanCursor();

}

// Mettre à jour le curseur selon l'outil et l'état Ctrl
function updateFloorPlanCursor() {
    // Ne pas changer le curseur si le panning espace est actif
    if (isSpacePressed) return;

    const canvas = renderer.domElement;
    canvas.classList.remove('floor-plan-cursor-draw-wall', 'floor-plan-cursor-draw-room', 'floor-plan-cursor-delete', 'floor-plan-cursor-erase-wall', 'floor-plan-cursor-select', 'floor-plan-cursor-move', 'floor-plan-cursor-paint', 'floor-plan-cursor-rotate', 'floor-plan-cursor-measure');

    if (floorPlanMode === 'draw-wall' || floorPlanMode === 'draw-oblique') {
        if (isCtrlPressed) {
            canvas.classList.add('floor-plan-cursor-erase-wall');
        } else {
            canvas.classList.add('floor-plan-cursor-draw-wall');
        }
    } else if (floorPlanMode === 'draw-room') {
        canvas.classList.add('floor-plan-cursor-draw-room');
    } else if (floorPlanMode === 'delete-wall') {
        canvas.classList.add('floor-plan-cursor-delete');
    } else if (floorPlanMode === 'select') {
        canvas.classList.add('floor-plan-cursor-select');
    } else if (floorPlanMode === 'texture') {
        if (isCtrlPressed) {
            canvas.classList.add('floor-plan-cursor-delete');
        } else {
            canvas.classList.add('floor-plan-cursor-paint');
        }
    } else if (floorPlanMode === 'measure') {
        canvas.classList.add('floor-plan-cursor-measure');
    }
}

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

// Appliquer la position de spawn à la caméra (au chargement en mode jeu)
function applySpawnToCamera() {
    if (interactionMode === 'game') {
        if (spawnPosition && spawnSaved) {
            // Positionner la caméra à la hauteur des yeux
            const eyeY = spawnPosition.y + PLAYER_EYE_HEIGHT;
            camera.position.set(spawnPosition.x, eyeY, spawnPosition.z);

            // Calculer le point de regard basé sur la rotation du spawn
            const lookDir = new THREE.Vector3(
                -Math.sin(spawnRotationY),
                0,
                -Math.cos(spawnRotationY)
            );
            controls.target.set(
                camera.position.x + lookDir.x * 0.01,
                eyeY,
                camera.position.z + lookDir.z * 0.01
            );
            camera.lookAt(
                camera.position.x + lookDir.x * 10,
                eyeY,
                camera.position.z + lookDir.z * 10
            );

            console.log(`🎯 Caméra positionnée au spawn: (${spawnPosition.x.toFixed(2)}, ${eyeY.toFixed(2)}, ${spawnPosition.z.toFixed(2)})`);
        }

        // Activer le mode FPS dans tous les cas
        setupFPSCamera();
    }

    // En mode dev, on ne positionne pas la caméra mais on affiche le marqueur
    if (interactionMode === 'developer') {
        updateSpawnMarker();
        updateControlsForMode();
    }
}

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

function createZoneLabelSprite(text, position) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 64;

    ctx.fillStyle = 'rgba(0, 206, 209, 0.85)';
    // roundRect fallback for older browsers
    if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(0, 0, canvas.width, canvas.height, 8);
        ctx.fill();
    } else {
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
        map: texture, transparent: true, depthTest: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.position.y += 0.5;
    sprite.scale.set(2, 0.25, 1);
    sprite.renderOrder = 999;
    sprite.userData.isGizmo = true;
    sprite.userData.isInteractionZone = true;

    return sprite;
}

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
        }
    };

    // Create bounding box wireframe autour du personnage
    const box = new THREE.Box3();
    box.min.set(cx - radius, characterRoot.position.y, cz - radius);
    box.max.set(cx + radius, characterRoot.position.y + height, cz + radius);
    zone.meshGroup = createObjectZoneOutlineMesh(box, 0x00CED1, 0.8);
    scene.add(zone.meshGroup);

    // Create label above the character
    const labelPos = new THREE.Vector3(cx, characterRoot.position.y + height + 0.2, cz);
    zone.labelSprite = createZoneLabelSprite(
        'Zone #' + id + ' (non configurée)',
        labelPos
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

    // Surface mode prefix
    const sm = zone.surfaceMode || 'floor';
    let prefix = '';
    if (sm === 'ceiling') prefix = '(Plafond) ';
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

    zone.labelSprite = createZoneLabelSprite(
        labelText,
        new THREE.Vector3(cx, zone.y, cz)
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
        input.style.cssText = 'width:100%;font-size:9px;padding:1px 3px;border:1px solid #00CED1;border-radius:2px;background:#1a1a1a;color:#fff;outline:none;';

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

        zone.labelSprite = createZoneLabelSprite(labelText, new THREE.Vector3(cx, zd.y || 0, cz));
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
        default:
            break;
    }
}

// ==================== OUTIL TEXTURE ====================

// Charger une texture depuis un fichier JPEG
function loadTextureFromFile(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        textureToolImageDataURL = e.target.result;
        textureToolFileName = file.name;

        // Charger dans Three.js
        const loader = new THREE.TextureLoader();
        loader.load(textureToolImageDataURL, function(tex) {
            textureToolTexture = tex;
            textureToolTexture.wrapS = THREE.RepeatWrapping;
            textureToolTexture.wrapT = THREE.RepeatWrapping;
            textureToolTexture.colorSpace = THREE.SRGBColorSpace;

            // Mettre à jour l'aperçu
            const preview = document.getElementById('texture-preview-img');
            const previewContainer = document.getElementById('texture-preview-container');
            const fileNameEl = document.getElementById('texture-file-name');
            if (preview) preview.src = textureToolImageDataURL;
            if (previewContainer) previewContainer.style.display = 'block';
            if (fileNameEl) fileNameEl.textContent = file.name;

            console.log('🎨 Texture chargée:', file.name);
        });
    };
    reader.readAsDataURL(file);
}

// Appliquer la texture sur un mur entier
function applyTextureToWall(wall) {
    if (!textureToolTexture || !wall || !wall.mesh) return;

    // Pour les murs fusionnés, calculer la longueur depuis la géométrie
    let wallLength;
    if (wall.isMerged || !wall.start || !wall.end) {
        wall.mesh.geometry.computeBoundingBox();
        const bb = wall.mesh.geometry.boundingBox;
        wallLength = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z);
    } else {
        const dx = wall.end.x - wall.start.x;
        const dz = wall.end.z - wall.start.z;
        wallLength = Math.sqrt(dx * dx + dz * dz);
    }

    // Cloner la texture pour ne pas affecter les autres
    const tex = textureToolTexture.clone();
    tex.needsUpdate = true;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;

    if (textureToolType === 'tile') {
        // Mode Tuile : répéter sur les 2 axes
        const repeatX = wallLength / textureToolTileSize;
        const repeatY = wallHeight / textureToolTileSize;
        tex.repeat.set(repeatX, repeatY);
    } else {
        // Mode Panneau : adapter la hauteur au mur, répéter seulement en X
        tex.wrapT = THREE.ClampToEdgeWrapping;
        // Calculer la largeur du panneau en fonction du ratio de l'image
        const img = tex.image;
        const aspectRatio = img ? (img.width / img.height) : 1;
        const panelWidth = wallHeight * aspectRatio;
        const repeatX = wallLength / panelWidth;
        tex.repeat.set(repeatX, 1);
    }

    // Assurer le bon espace colorimétrique pour la texture
    tex.colorSpace = THREE.SRGBColorSpace;

    // Appliquer au matériau du mur
    const mat = new THREE.MeshStandardMaterial({
        map: tex,
        side: THREE.DoubleSide,
        roughness: 0.5,  // Réduit pour plus de luminosité
        metalness: 0
    });

    // Sauvegarder l'ancien matériau si pas déjà fait
    if (!wall.originalBaseMaterial) {
        wall.originalBaseMaterial = wall.mesh.material;
    }
    wall.mesh.material = mat;
    wall.mesh.material.needsUpdate = true;

    // Stocker les infos texture pour la sauvegarde
    wall.textureInfo = {
        type: textureToolType,
        tileSize: textureToolTileSize,
        imageDataURL: textureToolImageDataURL,
        fileName: textureToolFileName
    };

    markUnsavedChanges();
    console.log(`🎨 Texture appliquée sur ${wall.name}`);
}

// Appliquer la texture sur tous les murs d'une pièce (sur les 2 faces principales + tranches si option activée)
function applyTextureToRoomWalls(room, intersectInfo) {
    if (!room || !room.walls) return;

    const autoEdgesCheckbox = document.getElementById('auto-apply-edges');
    const applyEdges = autoEdgesCheckbox && autoEdgesCheckbox.checked;

    room.walls.forEach(wall => {
        // BoxGeometry(length, height, thickness) -> les grandes faces visibles sont +z (4) et -z (5)
        // Désactiver temporairement l'auto-tranches pour éviter double application
        if (autoEdgesCheckbox) autoEdgesCheckbox.checked = false;

        applyTextureToWallFace(wall, null, 4); // face avant (+z)
        applyTextureToWallFace(wall, null, 5); // face arrière (-z)

        // Appliquer les tranches une seule fois par mur
        if (applyEdges) {
            applyTextureToEdgeFaces(wall);
        }

        // Restaurer l'option
        if (autoEdgesCheckbox) autoEdgesCheckbox.checked = applyEdges;
    });
    console.log(`🎨 Texture appliquée sur ${room.walls.length} murs de la pièce${applyEdges ? ' (avec tranches)' : ''}`);
}

// Déterminer quelle face d'un BoxGeometry a été cliquée (0=droite, 1=gauche, 2=haut, 3=bas, 4=avant, 5=arrière)
function getClickedFaceIndex(intersectInfo) {
    if (!intersectInfo || intersectInfo.faceIndex === undefined) return 4; // défaut : face avant

    // BoxGeometry a 12 triangles (2 par face), donc 6 faces
    // Face indices: 0-1=droite(+x), 2-3=gauche(-x), 4-5=haut(+y), 6-7=bas(-y), 8-9=avant(+z), 10-11=arrière(-z)
    const fi = intersectInfo.faceIndex;
    if (fi <= 1) return 0;       // droite (+x) → côté droit du mur
    if (fi <= 3) return 1;       // gauche (-x) → côté gauche du mur
    if (fi <= 5) return 2;       // haut (+y)
    if (fi <= 7) return 3;       // bas (-y)
    if (fi <= 9) return 4;       // avant (+z) → face avant du mur
    return 5;                     // arrière (-z) → face arrière du mur
}

// Convertir un index de face BoxGeometry en index matériau (les 2 grandes faces du mur)
// BoxGeometry avec 6 matériaux : [+x, -x, +y, -y, +z, -z]
// Pour un mur horizontal, les grandes faces sont +z (index 4) et -z (index 5)
// Mais le mur est tourné par rotation.y, donc les faces "avant/arrière" du mur
// restent toujours les faces +z et -z dans l'espace local de la géométrie

// Déterminer le materialIndex du group contenant le triangle cliqué d'un mur fusionné
function getMergedWallFaceGroup(intersectInfo) {
    if (!intersectInfo || !intersectInfo.object) return 0;

    const geo = intersectInfo.object.geometry;
    const faceIndex = intersectInfo.faceIndex;
    if (faceIndex === undefined || faceIndex === null) return 0;

    // Trouver le vertex index de départ du triangle cliqué dans le index buffer
    const triStart = faceIndex * 3; // position dans l'index buffer

    // Parcourir les groups pour trouver celui qui contient ce triangle
    const groups = geo.groups;
    if (groups && groups.length > 0) {
        for (const g of groups) {
            if (triStart >= g.start && triStart < g.start + g.count) {
                return g.materialIndex;
            }
        }
    }
    return 0;
}

// Calculer les dimensions (largeur, hauteur) d'une face d'un mur fusionné à partir de son group
function getMergedFaceDimensions(mesh, materialIndex) {
    const geo = mesh.geometry;
    const posAttr = geo.getAttribute('position');
    const groups = geo.groups;

    // Trouver le group correspondant à ce materialIndex
    const group = groups ? groups.find(g => g.materialIndex === materialIndex) : null;
    if (!group) return { width: 1, height: wallHeight };

    // Collecter les vertex de ce group pour calculer le bounding box local de cette face
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

    const sizeX = maxX - minX;
    const sizeY = maxY - minY;
    const sizeZ = maxZ - minZ;

    // La face la plus "plate" est selon l'axe de la normale
    // La hauteur est toujours sizeY, la largeur est le max de sizeX et sizeZ
    const faceWidth = Math.max(sizeX, sizeZ);
    const faceHeight = sizeY;

    // Si la face est horizontale (dessus/dessous), la hauteur est petite
    if (sizeY < 0.01) {
        return { width: Math.max(sizeX, sizeZ), height: Math.min(sizeX, sizeZ) || wallThickness };
    }

    return { width: faceWidth || wallThickness, height: faceHeight || wallHeight };
}

/**
 * Calcule la normale et le centroïde d'une face d'un mur fusionné à partir de son group.
 * Utilise les positions des vertex réelles (world-space) pour un résultat fiable.
 */
function computeMergedFaceInfo(mesh, materialIndex) {
    const geo = mesh.geometry;
    const posAttr = geo.getAttribute('position');
    const idx = geo.index;
    const group = geo.groups ? geo.groups.find(g => g.materialIndex === materialIndex) : null;
    if (!group || group.count < 3 || !idx) return null;

    // Calcul de la normale via le produit vectoriel des arêtes du 1er triangle
    const i0 = idx.getX(group.start);
    const i1 = idx.getX(group.start + 1);
    const i2 = idx.getX(group.start + 2);

    const v0 = new THREE.Vector3(posAttr.getX(i0), posAttr.getY(i0), posAttr.getZ(i0));
    const v1 = new THREE.Vector3(posAttr.getX(i1), posAttr.getY(i1), posAttr.getZ(i1));
    const v2 = new THREE.Vector3(posAttr.getX(i2), posAttr.getY(i2), posAttr.getZ(i2));

    const edge1 = new THREE.Vector3().subVectors(v1, v0);
    const edge2 = new THREE.Vector3().subVectors(v2, v0);
    const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

    // Centroïde = moyenne de tous les vertex du group
    let cx = 0, cy = 0, cz = 0, count = 0;
    for (let i = group.start; i < group.start + group.count; i++) {
        const vi = idx.getX(i);
        cx += posAttr.getX(vi);
        cy += posAttr.getY(vi);
        cz += posAttr.getZ(vi);
        count++;
    }
    return {
        normal: normal,
        centroid: new THREE.Vector3(cx / count, cy / count, cz / count)
    };
}

/**
 * Shift+clic sur un mur fusionné : applique la texture à toutes les faces du même côté
 * (intérieur ou extérieur) en se basant sur la direction de la normale par rapport
 * au centre du mur fusionné.
 */
function applyTextureToMergedWallSide(wall, intersectInfo) {
    if (!wall || !wall.isMerged || !wall.mesh) return;

    const geo = wall.mesh.geometry;
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    const wallCenter = new THREE.Vector3();
    bb.getCenter(wallCenter);

    // Déterminer si c'est une pièce (fermée) ou un mur linéaire
    const sizeX = bb.max.x - bb.min.x;
    const sizeZ = bb.max.z - bb.min.z;
    const isRoomShape = Math.min(sizeX, sizeZ) > wallThickness * 4;

    // Info sur la face cliquée
    const clickedMatIndex = getMergedWallFaceGroup(intersectInfo);
    const clickedInfo = computeMergedFaceInfo(wall.mesh, clickedMatIndex);
    if (!clickedInfo) return;

    const autoEdgesCheckbox = document.getElementById('auto-apply-edges');
    const applyEdges = autoEdgesCheckbox && autoEdgesCheckbox.checked;

    // Désactiver temporairement l'auto-tranches pour éviter double application
    if (autoEdgesCheckbox) autoEdgesCheckbox.checked = false;

    const groups = geo.groups;
    if (!groups) return;

    const sourceWallsTextured = new Set();
    let texturedCount = 0;

    // 1ère passe : appliquer la texture sur les faces principales (faces 4 et 5 de chaque mur source)
    for (const g of groups) {
        const matIdx = g.materialIndex;
        const localFace = matIdx % 6;

        // Ne traiter que les faces principales (avant/arrière de chaque mur source)
        if (localFace !== 4 && localFace !== 5) continue;

        const faceInfo = computeMergedFaceInfo(wall.mesh, matIdx);
        if (!faceInfo) continue;

        // Ignorer les faces quasi-verticales (top/bottom)
        if (Math.abs(faceInfo.normal.y) > 0.7) continue;

        let sameSide;
        if (isRoomShape) {
            // Pièce : test intérieur/extérieur basé sur le centroïde
            const clickedDir = new THREE.Vector3().subVectors(clickedInfo.centroid, wallCenter);
            const clickedIsExterior = clickedDir.dot(clickedInfo.normal) > 0;

            const faceDir = new THREE.Vector3().subVectors(faceInfo.centroid, wallCenter);
            const faceIsExterior = faceDir.dot(faceInfo.normal) > 0;

            sameSide = (clickedIsExterior === faceIsExterior);
        } else {
            // Mur linéaire : grouper par direction de normale similaire
            sameSide = clickedInfo.normal.dot(faceInfo.normal) > 0.3;
        }

        if (sameSide) {
            applyTextureToWallFace(wall, null, matIdx);
            sourceWallsTextured.add(Math.floor(matIdx / 6));
            texturedCount++;
        }
    }

    // 2ème passe : appliquer aux tranches des murs sources texturés (si auto-tranches activé)
    if (applyEdges) {
        for (const g of groups) {
            const matIdx = g.materialIndex;
            const localFace = matIdx % 6;
            const sourceWall = Math.floor(matIdx / 6);

            // Ignorer les faces principales (déjà faites) et les murs non texturés
            if (localFace === 4 || localFace === 5) continue;
            if (!sourceWallsTextured.has(sourceWall)) continue;

            applyTextureToWallFace(wall, null, matIdx);
        }
    }

    // Restaurer l'option auto-tranches
    if (autoEdgesCheckbox) autoEdgesCheckbox.checked = applyEdges;

    console.log(`🎨 Texture appliquée sur ${texturedCount} faces du mur fusionné "${wall.name}"${applyEdges ? ' (avec tranches)' : ''}`);
}

// Appliquer la texture sur une face spécifique du mur
function applyTextureToWallFace(wall, intersectInfo, forceFaceIndex) {
    if (!textureToolTexture || !wall || !wall.mesh) return;

    let wallLength;
    let matIndex;

    if (wall.isMerged) {
        // Mur fusionné : chaque face physique a son propre group/matériau
        if (forceFaceIndex !== undefined && forceFaceIndex !== null) {
            matIndex = forceFaceIndex;
        } else {
            matIndex = getMergedWallFaceGroup(intersectInfo);
        }
        // Calculer les dimensions de la face cliquée à partir des vertex du group
        const faceDims = getMergedFaceDimensions(wall.mesh, matIndex);
        wallLength = faceDims.width;

        // Créer la texture
        const tex = textureToolTexture.clone();
        tex.needsUpdate = true;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;

        if (textureToolType === 'tile') {
            const repeatX = faceDims.width / textureToolTileSize;
            const repeatY = faceDims.height / textureToolTileSize;
            tex.repeat.set(repeatX, repeatY);
        } else {
            tex.wrapT = THREE.ClampToEdgeWrapping;
            const img = tex.image;
            const aspectRatio = img ? (img.width / img.height) : 1;
            const panelWidth = faceDims.height * aspectRatio;
            const repeatX = faceDims.width / panelWidth;
            tex.repeat.set(repeatX, 1);
        }

        tex.colorSpace = THREE.SRGBColorSpace;

        // Récupérer le polygonOffset de l'ancien matériau (préserve le décalage anti z-fighting)
        const oldMat = wall.mesh.material[matIndex];
        const pof = (oldMat && oldMat.polygonOffsetFactor) || 1;
        const pou = (oldMat && oldMat.polygonOffsetUnits) || 1;

        const texMat = new THREE.MeshStandardMaterial({
            map: tex,
            side: THREE.DoubleSide,
            roughness: 0.5,
            metalness: 0,
            polygonOffset: true,
            polygonOffsetFactor: pof,
            polygonOffsetUnits: pou
        });

        // Appliquer directement — le matériau est déjà dans un tableau
        if (oldMat && oldMat !== texMat) {
            if (oldMat.map) oldMat.map.dispose();
            oldMat.dispose();
        }
        wall.mesh.material[matIndex] = texMat;

        if (!wall.textureInfo) wall.textureInfo = {};
        wall.textureInfo[matIndex] = {
            type: textureToolType,
            tileSize: textureToolTileSize,
            imageDataURL: textureToolImageDataURL,
            fileName: textureToolFileName
        };

        markUnsavedChanges();
        console.log(`🎨 Texture appliquée sur face ${matIndex} de ${wall.name}`);

        // Auto-tranches pour murs fusionnés : appliquer aux faces de tranche du même mur source
        // localFace 4/5 = faces principales, 0/1 = côtés, 2/3 = dessus/dessous
        const autoEdgesCheckbox_m = document.getElementById('auto-apply-edges');
        if (autoEdgesCheckbox_m && autoEdgesCheckbox_m.checked) {
            const localFace = matIndex % 6;
            if (localFace === 4 || localFace === 5) {
                // Face principale cliquée → appliquer aux tranches du même mur source
                const sourceWall = Math.floor(matIndex / 6);
                const groups = wall.mesh.geometry.groups;
                if (groups) {
                    // Désactiver temporairement pour éviter la récursion
                    autoEdgesCheckbox_m.checked = false;
                    for (const g of groups) {
                        const edgeMatIdx = g.materialIndex;
                        const edgeLocalFace = edgeMatIdx % 6;
                        const edgeSourceWall = Math.floor(edgeMatIdx / 6);
                        if (edgeSourceWall !== sourceWall) continue;
                        if (edgeLocalFace === 4 || edgeLocalFace === 5) continue;
                        applyTextureToWallFace(wall, null, edgeMatIdx);
                    }
                    autoEdgesCheckbox_m.checked = true;
                }
            }
        }

        return; // Terminé pour les murs fusionnés
    } else {
        const dx = wall.end.x - wall.start.x;
        const dz = wall.end.z - wall.start.z;
        wallLength = Math.sqrt(dx * dx + dz * dz);

        // Déterminer la face cliquée
        if (forceFaceIndex !== undefined && forceFaceIndex !== null) {
            matIndex = forceFaceIndex;
        } else {
            matIndex = getClickedFaceIndex(intersectInfo);
        }
    }

    // Pour un mur (BoxGeometry), les grandes faces visibles sont les faces +z (4) et -z (5)
    // Les faces latérales (0,1) sont l'épaisseur du mur, on les traite aussi
    // Mapper l'index de face cliquée vers l'index matériau dans le tableau [+x, -x, +y, -y, +z, -z]

    // Créer la texture
    const tex = textureToolTexture.clone();
    tex.needsUpdate = true;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;

    // Calculer les repeats en fonction de la face ciblée
    // Faces 4 et 5 : faces principales (avant/arrière) - wallLength x wallHeight
    // Faces 0 et 1 : tranches latérales (côtés) - wallThickness x wallHeight
    // Faces 2 et 3 : dessus/dessous - wallLength x wallThickness

    let faceWidth, faceHeight;

    if (matIndex === 4 || matIndex === 5) {
        // Faces principales (avant/arrière)
        faceWidth = wallLength;
        faceHeight = wallHeight;
    } else if (matIndex === 0 || matIndex === 1) {
        // Faces latérales (tranches aux extrémités du mur)
        faceWidth = wallThickness;
        faceHeight = wallHeight;
    } else {
        // Faces dessus/dessous
        faceWidth = wallLength;
        faceHeight = wallThickness;
    }

    if (textureToolType === 'tile') {
        const repeatX = faceWidth / textureToolTileSize;
        const repeatY = faceHeight / textureToolTileSize;
        tex.repeat.set(repeatX, repeatY);
    } else {
        // Mode panneau - adapter à la face
        tex.wrapT = THREE.ClampToEdgeWrapping;
        const img = tex.image;
        const aspectRatio = img ? (img.width / img.height) : 1;
        const panelWidth = faceHeight * aspectRatio;
        const repeatX = faceWidth / panelWidth;
        tex.repeat.set(repeatX, 1);
    }

    // Assurer le bon espace colorimétrique pour la texture
    tex.colorSpace = THREE.SRGBColorSpace;

    // Créer le matériau texturé pour cette face
    const texMat = new THREE.MeshStandardMaterial({
        map: tex,
        side: THREE.DoubleSide,  // DoubleSide pour que le raycast fonctionne en vue de dessus
        roughness: 0.5,  // Réduit pour plus de luminosité
        metalness: 0,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1
    });

    // Convertir le matériau unique en tableau de 6 matériaux si nécessaire
    ensureMultiMaterial(wall);

    // Appliquer le matériau texturé sur la face cliquée
    wall.mesh.material[matIndex] = texMat;
    wall.mesh.material[matIndex].needsUpdate = true;

    // Stocker les infos texture pour cette face
    if (!wall.textureInfo) wall.textureInfo = {};
    wall.textureInfo[matIndex] = {
        type: textureToolType,
        tileSize: textureToolTileSize,
        imageDataURL: textureToolImageDataURL,
        fileName: textureToolFileName
    };

    markUnsavedChanges();
    console.log(`🎨 Texture appliquée sur face ${matIndex} de ${wall.name}`);

    // Si c'est une face principale (4 ou 5) et que l'option auto-tranches est activée
    // Désactivé pour les murs fusionnés : les "tranches" sont en réalité des faces
    // de murs perpendiculaires, l'auto-application étirerait la texture incorrectement
    const autoEdgesCheckbox = document.getElementById('auto-apply-edges');
    if (!wall.isMerged && autoEdgesCheckbox && autoEdgesCheckbox.checked && (matIndex === 4 || matIndex === 5)) {
        // Appliquer automatiquement aux 4 tranches (0, 1, 2, 3)
        applyTextureToEdgeFaces(wall);
    }
}

/**
 * Applique la texture actuelle aux tranches du mur (faces 0, 1, 2, 3)
 * Utilisé automatiquement après application sur une face principale si l'option est activée
 */
function applyTextureToEdgeFaces(wall) {
    if (!textureToolTexture || !wall || !wall.mesh) return;

    let wallLength;
    if (wall.isMerged) {
        wall.mesh.geometry.computeBoundingBox();
        const bb = wall.mesh.geometry.boundingBox;
        wallLength = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z);
    } else {
        const dx = wall.end.x - wall.start.x;
        const dz = wall.end.z - wall.start.z;
        wallLength = Math.sqrt(dx * dx + dz * dz);
    }

    // Les 4 faces de tranche
    const edgeFaces = [0, 1, 2, 3]; // +x, -x, +y, -y

    for (const faceIdx of edgeFaces) {
        // Créer une texture pour cette face
        const tex = textureToolTexture.clone();
        tex.needsUpdate = true;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;

        // Déterminer les dimensions de cette face
        let faceWidth, faceHeight;

        if (faceIdx === 0 || faceIdx === 1) {
            // Faces latérales (extrémités du mur)
            faceWidth = wallThickness;
            faceHeight = wallHeight;
        } else {
            // Faces dessus/dessous
            faceWidth = wallLength;
            faceHeight = wallThickness;
        }

        if (textureToolType === 'tile') {
            const repeatX = faceWidth / textureToolTileSize;
            const repeatY = faceHeight / textureToolTileSize;
            tex.repeat.set(repeatX, repeatY);
        } else {
            tex.wrapT = THREE.ClampToEdgeWrapping;
            const img = tex.image;
            const aspectRatio = img ? (img.width / img.height) : 1;
            const panelWidth = faceHeight * aspectRatio;
            const repeatX = faceWidth / panelWidth;
            tex.repeat.set(repeatX, 1);
        }

        // Assurer le bon espace colorimétrique
        tex.colorSpace = THREE.SRGBColorSpace;

        const texMat = new THREE.MeshStandardMaterial({
            map: tex,
            side: THREE.DoubleSide,  // DoubleSide pour cohérence avec les autres matériaux
            roughness: 0.5,  // Réduit pour plus de luminosité
            metalness: 0,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1
        });

        ensureMultiMaterial(wall);
        wall.mesh.material[faceIdx] = texMat;
        wall.mesh.material[faceIdx].needsUpdate = true;

        // Stocker les infos
        if (!wall.textureInfo) wall.textureInfo = {};
        wall.textureInfo[faceIdx] = {
            type: textureToolType,
            tileSize: textureToolTileSize,
            imageDataURL: textureToolImageDataURL,
            fileName: textureToolFileName
        };
    }

    console.log(`🎨 Texture appliquée sur les 4 tranches de ${wall.name}`);
}

// S'assurer que le mesh utilise un tableau de 6 matériaux (un par face du BoxGeometry)
function ensureMultiMaterial(wall) {
    if (!wall || !wall.mesh) return;

    if (!Array.isArray(wall.mesh.material)) {
        // Sauvegarder le matériau original
        const baseMat = wall.mesh.material;
        if (!wall.originalBaseMaterial) {
            wall.originalBaseMaterial = baseMat;
        }

        // Créer 6 copies du matériau de base (une par face)
        const defaultMat = new THREE.MeshStandardMaterial({
            color: baseMat.color ? baseMat.color.clone() : new THREE.Color(0xcccccc),
            side: THREE.DoubleSide,  // DoubleSide pour que le raycast fonctionne en vue de dessus
            roughness: baseMat.roughness !== undefined ? baseMat.roughness : 0.9,
            metalness: baseMat.metalness !== undefined ? baseMat.metalness : 0,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1
        });

        wall.mesh.material = [
            defaultMat.clone(), // 0: +x (côté droit)
            defaultMat.clone(), // 1: -x (côté gauche)
            defaultMat.clone(), // 2: +y (dessus)
            defaultMat.clone(), // 3: -y (dessous)
            defaultMat.clone(), // 4: +z (face avant)
            defaultMat.clone()  // 5: -z (face arrière)
        ];
    }
}

// Supprimer la texture d'une face spécifique du mur
function removeTextureFromWallFace(wall, intersectInfo) {
    if (!wall || !wall.mesh) return;

    const faceIdx = wall.isMerged ? getMergedWallFaceGroup(intersectInfo) : getClickedFaceIndex(intersectInfo);

    if (Array.isArray(wall.mesh.material)) {
        // Restaurer le matériau par défaut pour cette face
        const defaultMat = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            side: THREE.DoubleSide,  // DoubleSide pour cohérence
            roughness: 0.4,
            metalness: 0,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1
        });
        wall.mesh.material[faceIdx] = defaultMat;

        // Supprimer les infos texture de cette face
        if (wall.textureInfo && wall.textureInfo[faceIdx]) {
            delete wall.textureInfo[faceIdx];
        }
    } else {
        // Matériau unique, restaurer le matériau original
        removeTextureFromWall(wall);
    }

    markUnsavedChanges();
    console.log(`🗑️ Texture supprimée de face ${faceIdx} de ${wall.name}`);
}

// Supprimer toutes les textures d'un mur (toutes les faces)
function removeTextureFromWall(wall) {
    if (!wall || !wall.mesh) return;

    if (wall.isMerged && Array.isArray(wall.mesh.material)) {
        // Mur fusionné : remplacer chaque matériau du tableau par un matériau par défaut
        // en préservant le polygonOffset différencié de chaque face
        wall.mesh.material.forEach((mat, idx) => {
            const pof = (mat && mat.polygonOffsetFactor) || 1;
            const pou = (mat && mat.polygonOffsetUnits) || 1;
            if (mat) {
                if (mat.map) mat.map.dispose();
                mat.dispose();
            }
            wall.mesh.material[idx] = new THREE.MeshStandardMaterial({
                color: 0xcccccc,
                side: THREE.DoubleSide,
                roughness: 0.4,
                metalness: 0,
                polygonOffset: true,
                polygonOffsetFactor: pof,
                polygonOffsetUnits: pou
            });
        });
    } else {
        // Mur normal : restaurer le matériau original unique
        const defaultMat = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            side: THREE.DoubleSide,
            roughness: 0.4,
            metalness: 0,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1
        });

        if (wall.originalBaseMaterial) {
            wall.mesh.material = wall.originalBaseMaterial;
        } else {
            wall.mesh.material = defaultMat;
        }
    }

    wall.textureInfo = null;
    markUnsavedChanges();
    console.log(`🗑️ Toutes les textures supprimées de ${wall.name}`);
}

// Supprimer une dalle de sol
function removeFloorTile(tile) {
    if (!tile) return;
    scene.remove(tile);
    if (tile.geometry) tile.geometry.dispose();
    if (tile.material) {
        if (tile.material.map) tile.material.map.dispose();
        tile.material.dispose();
    }
    markUnsavedChanges();
    console.log('🗑️ Dalle de sol supprimée');
}

// Supprimer toutes les dalles de sol dans une pièce
function removeFloorTilesInRoom(room) {
    if (!room) return;
    const { minX, maxX, minZ, maxZ } = room.bounds;
    const tolerance = wallThickness || 0.2; // Tolérance pour les bords de murs
    const polygon = getWallPolygon(room);
    const toRemove = scene.children.filter(child => {
        if (child.userData.type !== 'floor-tile') return false;
        // D'abord: vérif rapide par bounding box élargie
        if (child.position.x < minX - tolerance || child.position.x > maxX + tolerance ||
            child.position.z < minZ - tolerance || child.position.z > maxZ + tolerance) {
            return false;
        }
        // Ensuite: vérif précise par polygone si disponible
        if (polygon.length >= 3) {
            return isPointInPolygon(child.position.x, child.position.z, polygon);
        }
        return true; // Fallback: utiliser les bounds élargies
    });
    toRemove.forEach(tile => removeFloorTile(tile));
    console.log(`🗑️ ${toRemove.length} dalles de sol supprimées de la pièce`);
}

// Supprimer une dalle de plafond
function removeCeilingTile(tile) {
    if (!tile) return;
    scene.remove(tile);
    if (tile.geometry) tile.geometry.dispose();
    if (tile.material) {
        if (tile.material.map) tile.material.map.dispose();
        tile.material.dispose();
    }
    markUnsavedChanges();
    console.log('🗑️ Dalle de plafond supprimée');
}

// Supprimer toutes les dalles de plafond dans une pièce
function removeCeilingTilesInRoom(room) {
    if (!room) return;
    const { minX, maxX, minZ, maxZ } = room.bounds;
    const tolerance = wallThickness || 0.2; // Tolérance pour les bords de murs
    const polygon = getWallPolygon(room);
    const toRemove = scene.children.filter(child => {
        if (child.userData.type !== 'ceiling-tile') return false;
        // D'abord: vérif rapide par bounding box élargie
        if (child.position.x < minX - tolerance || child.position.x > maxX + tolerance ||
            child.position.z < minZ - tolerance || child.position.z > maxZ + tolerance) {
            return false;
        }
        // Ensuite: vérif précise par polygone si disponible
        if (polygon.length >= 3) {
            return isPointInPolygon(child.position.x, child.position.z, polygon);
        }
        return true; // Fallback: utiliser les bounds élargies
    });
    toRemove.forEach(tile => removeCeilingTile(tile));
    console.log(`🗑️ ${toRemove.length} dalles de plafond supprimées de la pièce`);
}

// Supprimer un polygone de sol/plafond
function removePolygonMesh(mesh) {
    if (!mesh) return;
    scene.remove(mesh);
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
        if (mesh.material.map) mesh.material.map.dispose();
        mesh.material.dispose();
    }
    markUnsavedChanges();
}

// Supprimer les polygones de sol dans une pièce
function removeFloorPolygonsInRoom(room) {
    if (!room) return;
    const { minX, maxX, minZ, maxZ } = room.bounds;
    const polygon = getWallPolygon(room);
    const centerX = polygon.reduce((s, p) => s + p.x, 0) / polygon.length;
    const centerZ = polygon.reduce((s, p) => s + p.z, 0) / polygon.length;
    const toRemove = scene.children.filter(c => {
        if (c.userData.type !== 'floor-polygon') return false;
        // Vérifier si le polygone stocké chevauche cette pièce
        const pts = c.userData.polygonPoints;
        if (pts && pts.length > 0) {
            const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
            const cz = pts.reduce((s, p) => s + p.z, 0) / pts.length;
            return Math.abs(cx - centerX) < 0.5 && Math.abs(cz - centerZ) < 0.5;
        }
        return false;
    });
    toRemove.forEach(m => removePolygonMesh(m));
}

// Supprimer les polygones de plafond dans une pièce
function removeCeilingPolygonsInRoom(room) {
    if (!room) return;
    const { minX, maxX, minZ, maxZ } = room.bounds;
    const polygon = getWallPolygon(room);
    const centerX = polygon.reduce((s, p) => s + p.x, 0) / polygon.length;
    const centerZ = polygon.reduce((s, p) => s + p.z, 0) / polygon.length;
    const toRemove = scene.children.filter(c => {
        if (c.userData.type !== 'ceiling-polygon') return false;
        const pts = c.userData.polygonPoints;
        if (pts && pts.length > 0) {
            const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
            const cz = pts.reduce((s, p) => s + p.z, 0) / pts.length;
            return Math.abs(cx - centerX) < 0.5 && Math.abs(cz - centerZ) < 0.5;
        }
        return false;
    });
    toRemove.forEach(m => removePolygonMesh(m));
}

// Trouver la pièce (ou enceinte fermée) contenant un mur donné
function findRoomContainingWall(wall) {
    // Les murs fusionnés n'ont pas de start/end, ils ne font pas partie d'une enceinte
    if (wall.isMerged || !wall.start || !wall.end) return null;

    // D'abord chercher dans les pièces rectangulaires créées avec l'outil Pièce
    const room = floorPlanRooms.find(r => r.walls.includes(wall));
    if (room) return room;

    // Sinon, détecter une enceinte fermée formée par des murs individuels
    const enclosure = detectEnclosureFromWall(wall);
    return enclosure;
}

// Trouver la pièce (ou enceinte fermée) contenant un point (x, z)
function findRoomAtPoint(x, z) {
    // D'abord chercher dans les pièces rectangulaires
    const room = floorPlanRooms.find(r => {
        return x >= r.bounds.minX && x <= r.bounds.maxX &&
               z >= r.bounds.minZ && z <= r.bounds.maxZ;
    });
    if (room) return room;

    // Vérifier si le point est à l'intérieur d'un mur fusionné (pièce fusionnée)
    for (const wall of floorPlanWalls) {
        if (!wall.isMerged || !wall.mesh) continue;
        wall.mesh.geometry.computeBoundingBox();
        const bb = wall.mesh.geometry.boundingBox;
        // Vérifier que le mur forme une pièce (pas juste un mur linéaire)
        const sizeX = bb.max.x - bb.min.x;
        const sizeZ = bb.max.z - bb.min.z;
        if (Math.min(sizeX, sizeZ) <= wallThickness * 4) continue; // Mur linéaire, pas une pièce

        // Obtenir le polygone : stocké, ou extrait de la géométrie, ou bounding box
        let poly = wall.roomPolygon || (wall.mesh.userData && wall.mesh.userData.roomPolygon);

        // Fallback : extraire le polygone depuis la géométrie du mur fusionné
        if (!poly || poly.length < 3) {
            poly = extractPolygonFromMergedGeometry(wall);
        }

        if (poly && poly.length >= 3) {
            if (isPointInPolygon(x, z, poly)) {
                return {
                    id: -1,
                    walls: [wall],
                    mesh: null,
                    bounds: { minX: bb.min.x, maxX: bb.max.x, minZ: bb.min.z, maxZ: bb.max.z },
                    polygon: poly,
                    selected: false,
                    isMergedRoom: true
                };
            }
        } else {
            // Dernier recours : bounding box (avec marge pour l'épaisseur)
            const margin = wallThickness;
            if (x >= bb.min.x + margin && x <= bb.max.x - margin &&
                z >= bb.min.z + margin && z <= bb.max.z - margin) {
                return {
                    id: -1,
                    walls: [wall],
                    mesh: null,
                    bounds: { minX: bb.min.x, maxX: bb.max.x, minZ: bb.min.z, maxZ: bb.max.z },
                    selected: false,
                    isMergedRoom: true
                };
            }
        }
    }

    // Sinon, détecter une enceinte fermée en partant de la position du clic
    const enclosure = detectEnclosureAtPoint(x, z);
    return enclosure;
}

// Tolérance pour considérer deux points comme identiques (en mètres)
// Augmentée pour mieux détecter les connexions de murs tracés manuellement
const SNAP_TOLERANCE = 0.3;

// Vérifier si deux points sont proches (connectés)
function pointsAreClose(p1, p2) {
    const dx = p1.x - p2.x;
    const dz = p1.z - p2.z;
    return Math.sqrt(dx * dx + dz * dz) < SNAP_TOLERANCE;
}

// ==================== SYSTÈME DE MURS EN ONGLET (MITERED WALLS) ====================

/**
 * Trouve les murs connectés à un point donné
 */
function findWallsAtPoint(point, excludeWall = null) {
    const connected = [];
    for (const wall of floorPlanWalls) {
        if (wall === excludeWall) continue;
        if (wall.isMerged || !wall.start || !wall.end) continue;
        if (pointsAreClose(wall.start, point)) {
            connected.push({ wall, endpoint: 'start', otherEnd: wall.end });
        } else if (pointsAreClose(wall.end, point)) {
            connected.push({ wall, endpoint: 'end', otherEnd: wall.start });
        }
    }
    return connected;
}

/**
 * Calcule l'angle de direction d'un mur depuis un point
 */
function getWallAngleFromPoint(wall, fromPoint) {
    if (!wall.start || !wall.end) return 0;
    let dx, dz;
    if (pointsAreClose(wall.start, fromPoint)) {
        dx = wall.end.x - wall.start.x;
        dz = wall.end.z - wall.start.z;
    } else {
        dx = wall.start.x - wall.end.x;
        dz = wall.start.z - wall.end.z;
    }
    return Math.atan2(dz, dx);
}

/**
 * Calcule l'angle de biseau entre deux murs qui se rejoignent
 */
function calculateMiterAngle(angle1, angle2) {
    let diff = angle2 - angle1;
    // Normaliser entre -PI et PI
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    return diff / 2;
}

/**
 * Pour des coins nets, on utilise une approche différente :
 * Au lieu de couper en biseau (ce qui casse les UVs/textures),
 * on ajuste la longueur et position des murs pour qu'ils s'emboîtent.
 *
 * Stratégie : Le mur qui "arrive" sur un autre s'arrête à son bord extérieur.
 */

/**
 * Détermine si deux murs sont perpendiculaires (angle ~90°)
 */
function areWallsPerpendicular(wall1, wall2) {
    if (!wall1.start || !wall1.end || !wall2.start || !wall2.end) return false;
    const angle1 = Math.atan2(wall1.end.z - wall1.start.z, wall1.end.x - wall1.start.x);
    const angle2 = Math.atan2(wall2.end.z - wall2.start.z, wall2.end.x - wall2.start.x);
    let diff = Math.abs(angle1 - angle2);
    while (diff > Math.PI) diff -= Math.PI;
    return Math.abs(diff - Math.PI / 2) < 0.15;
}

/**
 * Détermine si un mur est principalement horizontal (le long de Z dans la vue)
 * Ces murs gardent leur longueur complète aux intersections
 * Dans la vue 3D : murs haut/bas de l'écran = le long de Z = gardent leur longueur
 */
function isWallHorizontal(wall) {
    if (!wall.start || !wall.end) return false;
    const dx = Math.abs(wall.end.x - wall.start.x);
    const dz = Math.abs(wall.end.z - wall.start.z);
    // INVERSER: Murs le long de Z = horizontaux (gardent leur longueur)
    // Murs le long de X = verticaux (sont raccourcis)
    return dz >= dx;
}

/**
 * Système de coins propres :
 * - Les murs HORIZONTAUX (le long de X) gardent leur longueur complète
 * - Les murs VERTICAUX (le long de Z) sont raccourcis de l'épaisseur complète du mur
 *   pour s'aligner avec le bord EXTÉRIEUR des murs horizontaux
 *
 * Ainsi aux coins, les murs horizontaux "passent par-dessus" et les verticaux s'arrêtent
 * contre le bord extérieur, sans superposition ni espace vide.
 */
function updateWallGeometry(wall) {
    // Désactivé - Les murs se superposent naturellement aux intersections
    // Le z-fighting est géré par polygonOffset dans le matériau
    return;

    const dx = wall.end.x - wall.start.x;
    const dz = wall.end.z - wall.start.z;
    const originalLength = Math.sqrt(dx * dx + dz * dz);
    if (originalLength < 0.1) return;

    // La longueur étendue (comme créée dans createWallSegment)
    const extendedLength = originalLength + wallThickness;

    // Déterminer si ce mur est horizontal (le long de X principalement) ou vertical (le long de Z)
    const thisWallIsHorizontal = isWallHorizontal(wall);

    // Vérifier les connexions aux extrémités
    const startConnections = findWallsAtPoint(wall.start, wall);
    const endConnections = findWallsAtPoint(wall.end, wall);

    let startAdjust = 0;
    let endAdjust = 0;

    // Seuls les murs VERTICAUX sont raccourcis quand ils touchent des murs HORIZONTAUX
    // Les murs HORIZONTAUX gardent leur longueur étendue
    if (!thisWallIsHorizontal) {
        // Vérifier connexion au début
        for (const conn of startConnections) {
            if (isWallHorizontal(conn.wall) && areWallsPerpendicular(wall, conn.wall)) {
                // Raccourcir de wallThickness/2 (on enlève juste l'extension de ce côté)
                startAdjust = wallThickness / 2;
                break;
            }
        }
        // Vérifier connexion à la fin
        for (const conn of endConnections) {
            if (isWallHorizontal(conn.wall) && areWallsPerpendicular(wall, conn.wall)) {
                endAdjust = wallThickness / 2;
                break;
            }
        }
    }

    wall.startAdjust = startAdjust;
    wall.endAdjust = endAdjust;

    // Si aucun ajustement nécessaire, ne rien faire
    if (startAdjust === 0 && endAdjust === 0) return;

    // Calculer la nouvelle longueur à partir de la longueur étendue
    const adjustedLength = extendedLength - startAdjust - endAdjust;
    if (adjustedLength < 0.1) return;

    // Direction normalisée du mur
    const dirX = dx / originalLength;
    const dirZ = dz / originalLength;

    // Le centre original du mur (comme calculé dans createWallSegment)
    const originalMidX = (wall.start.x + wall.end.x) / 2;
    const originalMidZ = (wall.start.z + wall.end.z) / 2;

    // Décaler le centre en fonction des ajustements
    // Si on raccourcit au début, on décale le centre vers la fin
    // Si on raccourcit à la fin, on décale le centre vers le début
    const centerOffset = (startAdjust - endAdjust) / 2;
    const newMidX = originalMidX + dirX * centerOffset;
    const newMidZ = originalMidZ + dirZ * centerOffset;

    // Mettre à jour la position du mesh
    wall.mesh.position.set(newMidX, wallHeight / 2, newMidZ);

    // Sauvegarder les matériaux et textureInfo existants
    const existingMaterials = wall.mesh.material;
    const existingTextureInfo = wall.textureInfo;

    // Créer la nouvelle géométrie
    const newGeometry = new THREE.BoxGeometry(adjustedLength, wallHeight, wallThickness);

    // Disposer de l'ancienne géométrie
    if (wall.mesh.geometry) {
        wall.mesh.geometry.dispose();
    }

    wall.mesh.geometry = newGeometry;
    wall.adjustedLength = adjustedLength;

    // Réappliquer les textures si elles existent
    if (existingTextureInfo && Array.isArray(existingMaterials)) {
        // Recalculer les UVs pour les nouvelles dimensions
        for (let faceIndex = 0; faceIndex < 6; faceIndex++) {
            const faceInfo = existingTextureInfo[faceIndex];
            if (faceInfo && faceInfo.imageDataURL && existingMaterials[faceIndex]) {
                const mat = existingMaterials[faceIndex];
                if (mat.map) {
                    // Recalculer les repeats basés sur la nouvelle longueur
                    const tileSize = faceInfo.tileSize || 1;
                    if (faceIndex === 4 || faceIndex === 5) {
                        // Faces principales (avant/arrière)
                        mat.map.repeat.set(adjustedLength / tileSize, wallHeight / tileSize);
                    } else if (faceIndex === 0 || faceIndex === 1) {
                        // Faces latérales (épaisseur)
                        mat.map.repeat.set(wallThickness / tileSize, wallHeight / tileSize);
                    } else {
                        // Faces haut/bas
                        mat.map.repeat.set(adjustedLength / tileSize, wallThickness / tileSize);
                    }
                    mat.map.needsUpdate = true;
                }
            }
        }
    }
}

/**
 * Met à jour tous les murs connectés à un point
 */
function updateWallsAtPoint(point) {
    const connectedWalls = findWallsAtPoint(point);
    for (const conn of connectedWalls) {
        updateWallGeometry(conn.wall);
    }
}

/**
 * Met à jour tous les ajustements de tous les murs
 */
function updateAllWallMiters() {
    for (const wall of floorPlanWalls) {
        if (wall.isMerged || !wall.start || !wall.end) continue;
        updateWallGeometry(wall);
    }
}

// Détecter une enceinte fermée en partant d'un mur donné
function detectEnclosureFromWall(startWall) {
    // Les murs fusionnés n'ont pas de start/end
    if (!startWall || startWall.isMerged || !startWall.start || !startWall.end) return null;

    // Chercher un cycle de murs connectés qui forment une forme fermée
    const visited = new Set();
    const path = [startWall];
    visited.add(startWall);

    function findCycle(currentWall, startPoint) {
        const currentEnd = currentWall.end;

        // Vérifier si on revient au point de départ → cycle trouvé !
        if (path.length >= 3 && pointsAreClose(currentEnd, startPoint)) {
            return true;
        }

        // Chercher un mur connecté à l'extrémité actuelle
        for (const wall of floorPlanWalls) {
            if (visited.has(wall)) continue;
            if (wall.isMerged || !wall.start || !wall.end) continue;

            // Le début de ce mur touche la fin du mur courant
            if (pointsAreClose(wall.start, currentEnd)) {
                visited.add(wall);
                path.push(wall);
                if (findCycle(wall, startPoint)) return true;
                path.pop();
                visited.delete(wall);
            }
            // Ou la fin de ce mur touche la fin du mur courant (mur inversé)
            else if (pointsAreClose(wall.end, currentEnd)) {
                // Inverser le mur logiquement
                const flipped = { ...wall, start: wall.end, end: wall.start };
                visited.add(wall);
                path.push(wall);
                if (findCycle(flipped, startPoint)) return true;
                path.pop();
                visited.delete(wall);
            }
        }
        return false;
    }

    // Essayer en partant du start du mur de départ
    if (findCycle(startWall, startWall.start)) {
        return enclosureFromWalls(path);
    }

    // Essayer aussi avec le mur inversé
    visited.clear();
    path.length = 0;
    const flippedStart = { ...startWall, start: startWall.end, end: startWall.start };
    path.push(startWall);
    visited.add(startWall);
    if (findCycle(flippedStart, flippedStart.start)) {
        return enclosureFromWalls(path);
    }

    return null;
}

// Créer un objet "room" virtuel à partir d'une liste de murs formant une enceinte
function enclosureFromWalls(wallsList) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    wallsList.forEach(w => {
        minX = Math.min(minX, w.start.x, w.end.x);
        maxX = Math.max(maxX, w.start.x, w.end.x);
        minZ = Math.min(minZ, w.start.z, w.end.z);
        maxZ = Math.max(maxZ, w.start.z, w.end.z);
    });

    return {
        id: -1, // Enceinte virtuelle
        walls: wallsList,
        mesh: null,
        bounds: { minX, maxX, minZ, maxZ },
        selected: false
    };
}

// Extraire le polygone intérieur d'un mur fusionné en analysant sa géométrie
// Pour chaque mur source, on prend la face du dessus (matIndex = sourceWall*6+2)
// et on calcule la ligne centrale du rectangle → le segment du mur
// Puis on chaîne ces segments en polygone fermé
function extractPolygonFromMergedGeometry(wall) {
    if (!wall || !wall.mesh || !wall.mesh.geometry) return [];
    const geo = wall.mesh.geometry;
    const posAttr = geo.getAttribute('position');
    const idx = geo.index;
    const groups = geo.groups;
    if (!groups || !idx || !posAttr) return [];

    // Déterminer le nombre de murs source
    let maxMatIdx = 0;
    groups.forEach(g => { maxMatIdx = Math.max(maxMatIdx, g.materialIndex); });
    const sourceWallCount = Math.floor(maxMatIdx / 6) + 1;

    const wallSegments = []; // [{start: {x,z}, end: {x,z}}]

    for (let sw = 0; sw < sourceWallCount; sw++) {
        const topMatIdx = sw * 6 + 2; // face du dessus (+Y)
        const group = groups.find(g => g.materialIndex === topMatIdx);
        if (!group || group.count < 3) continue;

        // Extraire les positions XZ uniques des sommets de cette face
        const seen = new Map();
        const pts = [];
        for (let i = group.start; i < group.start + group.count; i++) {
            const vi = idx.getX(i);
            const x = posAttr.getX(vi);
            const z = posAttr.getZ(vi);
            const key = Math.round(x * 1000) + ',' + Math.round(z * 1000);
            if (!seen.has(key)) {
                seen.set(key, true);
                pts.push({ x, z });
            }
        }

        if (pts.length < 4) continue;

        // Trouver les 2 paires de points les plus proches (côtés "épaisseur" du rectangle)
        // Pour un rectangle, les 2 côtés les plus courts = l'épaisseur du mur
        let minDist = Infinity;
        let pair1 = [0, 1];
        for (let i = 0; i < pts.length; i++) {
            for (let j = i + 1; j < pts.length; j++) {
                const d = Math.hypot(pts[i].x - pts[j].x, pts[i].z - pts[j].z);
                if (d < minDist) {
                    minDist = d;
                    pair1 = [i, j];
                }
            }
        }

        // L'autre paire = les points restants
        const remaining = [];
        for (let i = 0; i < pts.length; i++) {
            if (i !== pair1[0] && i !== pair1[1]) remaining.push(i);
        }
        if (remaining.length < 2) continue;

        // Les milieux des 2 côtés "épaisseur" = les extrémités de la ligne centrale
        const mid1 = {
            x: (pts[pair1[0]].x + pts[pair1[1]].x) / 2,
            z: (pts[pair1[0]].z + pts[pair1[1]].z) / 2
        };
        const mid2 = {
            x: (pts[remaining[0]].x + pts[remaining[1]].x) / 2,
            z: (pts[remaining[0]].z + pts[remaining[1]].z) / 2
        };

        wallSegments.push({ start: mid1, end: mid2 });
    }

    if (wallSegments.length < 3) return [];

    // Chaîner les segments en polygone fermé (même algorithme que computeRoomPolygonFromWalls)
    const used = new Set();
    const polygon = [];

    used.add(0);
    polygon.push({ x: wallSegments[0].start.x, z: wallSegments[0].start.z });
    let lastEnd = { x: wallSegments[0].end.x, z: wallSegments[0].end.z };

    for (let iter = 1; iter < wallSegments.length; iter++) {
        let found = false;
        for (let j = 0; j < wallSegments.length; j++) {
            if (used.has(j)) continue;
            const seg = wallSegments[j];
            if (pointsAreClose(lastEnd, seg.start)) {
                polygon.push({ x: seg.start.x, z: seg.start.z });
                lastEnd = { x: seg.end.x, z: seg.end.z };
                used.add(j);
                found = true;
                break;
            } else if (pointsAreClose(lastEnd, seg.end)) {
                polygon.push({ x: seg.end.x, z: seg.end.z });
                lastEnd = { x: seg.start.x, z: seg.start.z };
                used.add(j);
                found = true;
                break;
            }
        }
        if (!found) break;
    }

    if (polygon.length < 3) return [];
    if (!pointsAreClose(lastEnd, polygon[0])) return [];

    // Stocker le polygone pour éviter de le recalculer
    wall.roomPolygon = polygon;
    if (wall.mesh.userData) wall.mesh.userData.roomPolygon = polygon;
    console.log(`📐 Polygone extrait de la géométrie fusionnée (${polygon.length} sommets)`);

    return polygon;
}

// Calculer le polygone intérieur (chemin fermé) à partir d'une liste de murs source
// Les murs doivent avoir start/end valides et former un cycle fermé
// Retourne un tableau de points {x, z} ordonnés, ou [] si pas de polygone fermé
function computeRoomPolygonFromWalls(walls) {
    // Filtrer les murs avec start/end valides
    const validWalls = walls.filter(w => w.start && w.end);
    if (validWalls.length < 3) return []; // Un polygone nécessite au moins 3 murs

    // Construire le polygone en suivant la chaîne de murs
    const used = new Set();
    const polygon = [];

    // Commencer par le premier mur
    used.add(0);
    polygon.push({ x: validWalls[0].start.x, z: validWalls[0].start.z });
    let lastEnd = { x: validWalls[0].end.x, z: validWalls[0].end.z };

    // Chaîner les murs restants
    for (let iter = 1; iter < validWalls.length; iter++) {
        let found = false;
        for (let j = 0; j < validWalls.length; j++) {
            if (used.has(j)) continue;
            const w = validWalls[j];
            const startPt = { x: w.start.x, z: w.start.z };
            const endPt = { x: w.end.x, z: w.end.z };
            if (pointsAreClose(lastEnd, startPt)) {
                polygon.push(startPt);
                lastEnd = endPt;
                used.add(j);
                found = true;
                break;
            } else if (pointsAreClose(lastEnd, endPt)) {
                polygon.push(endPt);
                lastEnd = startPt;
                used.add(j);
                found = true;
                break;
            }
        }
        if (!found) break; // Chaîne interrompue
    }

    // Vérifier que le polygone est fermé (le dernier point rejoint le premier)
    if (polygon.length < 3) return [];
    const first = polygon[0];
    if (!pointsAreClose(lastEnd, first)) return []; // Pas un cycle fermé

    return polygon;
}

// Extraire le polygone ordonné (liste de points {x, z}) à partir des murs d'une room/enclosure
function getWallPolygon(room) {
    if (!room) return [];

    // Si la pièce a un polygone explicite (pièces arrondies, booléennes, etc.)
    if (room.polygon && room.polygon.length >= 3) return room.polygon;

    // Si pas de murs ou murs vides → utiliser le bounding box (pièce rectangulaire)
    if (!room.walls || room.walls.length === 0) {
        const b = room.bounds;
        return [
            { x: b.minX, z: b.minZ }, { x: b.maxX, z: b.minZ },
            { x: b.maxX, z: b.maxZ }, { x: b.minX, z: b.maxZ }
        ];
    }

    // Filtrer les murs qui ont des start/end valides (pas les murs fusionnés)
    const validWalls = room.walls.filter(w => w.start && w.end);
    if (validWalls.length === 0) {
        const b = room.bounds;
        return [
            { x: b.minX, z: b.minZ }, { x: b.maxX, z: b.minZ },
            { x: b.maxX, z: b.maxZ }, { x: b.minX, z: b.maxZ }
        ];
    }

    // Construire le polygone en suivant la chaîne ordonnée de murs
    const polygon = [];
    polygon.push({ x: validWalls[0].start.x, z: validWalls[0].start.z });
    let lastEnd = { x: validWalls[0].end.x, z: validWalls[0].end.z };

    for (let i = 1; i < validWalls.length; i++) {
        const w = validWalls[i];
        if (pointsAreClose(lastEnd, w.start)) {
            polygon.push({ x: w.start.x, z: w.start.z });
            lastEnd = { x: w.end.x, z: w.end.z };
        } else if (pointsAreClose(lastEnd, w.end)) {
            polygon.push({ x: w.end.x, z: w.end.z });
            lastEnd = { x: w.start.x, z: w.start.z };
        } else {
            // Mur non connecté → ajouter le dernier point et continuer
            polygon.push({ x: lastEnd.x, z: lastEnd.z });
            polygon.push({ x: w.start.x, z: w.start.z });
            lastEnd = { x: w.end.x, z: w.end.z };
        }
    }

    return polygon;
}

// Vérifier si un point est à l'intérieur d'un polygone (algorithme ray-casting)
function isPointInPolygon(px, pz, polygon) {
    let inside = false;
    const n = polygon.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = polygon[i].x, zi = polygon[i].z;
        const xj = polygon[j].x, zj = polygon[j].z;
        if ((zi > pz) !== (zj > pz) &&
            px < (xj - xi) * (pz - zi) / (zj - zi) + xi) {
            inside = !inside;
        }
    }
    return inside;
}

// Détecter une enceinte fermée contenant un point donné (pour sol/plafond)
function detectEnclosureAtPoint(x, z) {
    // D'abord trouver le mur le plus proche du point
    let closestWall = null;
    let closestDist = Infinity;

    floorPlanWalls.forEach(wall => {
        if (wall.isMerged || !wall.start || !wall.end) return;
        // Distance du point au segment du mur
        const dist = pointToSegmentDistance(x, z, wall.start.x, wall.start.z, wall.end.x, wall.end.z);
        if (dist < closestDist) {
            closestDist = dist;
            closestWall = wall;
        }
    });

    if (!closestWall) return null;

    // Essayer de détecter une enceinte à partir de ce mur
    const enclosure = detectEnclosureFromWall(closestWall);
    if (enclosure) {
        // Vérifier que le point est bien à l'intérieur du polygone de l'enceinte
        const polygon = getWallPolygon(enclosure);
        if (polygon.length >= 3 && isPointInPolygon(x, z, polygon)) {
            return enclosure;
        }
    }

    return null;
}

// Distance d'un point à un segment de droite
function pointToSegmentDistance(px, pz, ax, az, bx, bz) {
    const dx = bx - ax;
    const dz = bz - az;
    const lenSq = dx * dx + dz * dz;
    if (lenSq === 0) return Math.sqrt((px - ax) * (px - ax) + (pz - az) * (pz - az));

    let t = ((px - ax) * dx + (pz - az) * dz) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const projX = ax + t * dx;
    const projZ = az + t * dz;
    return Math.sqrt((px - projX) * (px - projX) + (pz - projZ) * (pz - projZ));
}

// Créer une dalle de sol texturée (1m x 1m) à une position donnée
function createFloorTile(x, z) {
    if (!textureToolTexture) return;

    // Arrondir à la grille de 1m
    const tileX = Math.floor(x) + 0.5;
    const tileZ = Math.floor(z) + 0.5;

    // Vérifier si une dalle existe déjà à cet endroit
    const existingTile = scene.children.find(child =>
        child.userData.type === 'floor-tile' &&
        Math.abs(child.position.x - tileX) < 0.01 &&
        Math.abs(child.position.z - tileZ) < 0.01
    );
    if (existingTile) {
        // Mettre à jour la texture de la dalle existante
        const tex = textureToolTexture.clone();
        tex.needsUpdate = true;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        const repeat = 1 / textureToolTileSize;
        tex.repeat.set(repeat, repeat);
        existingTile.material.map = tex;
        existingTile.material.roughness = 0.5;
        existingTile.material.needsUpdate = true;
        // Sauvegarder les infos texture pour persistence
        existingTile.userData.textureDataURL = textureToolImageDataURL;
        existingTile.userData.tileSize = textureToolTileSize;
        return;
    }

    const tex = textureToolTexture.clone();
    tex.needsUpdate = true;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    const repeat = 1 / textureToolTileSize;
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
    tile.position.set(tileX, 0.02, tileZ); // Légèrement au-dessus du sol
    tile.receiveShadow = true;
    tile.userData.type = 'floor-tile';
    tile.userData.isEnvironment = true;
    // Sauvegarder les infos texture pour persistence
    tile.userData.textureDataURL = textureToolImageDataURL;
    tile.userData.tileSize = textureToolTileSize;
    scene.add(tile);

    markUnsavedChanges();
}

// Appliquer des dalles de sol à toute une pièce
function applyFloorToRoom(room) {
    if (!room || !textureToolTexture) return;
    // Supprimer les anciennes dalles individuelles et polygones de cette zone
    removeFloorTilesInRoom(room);
    removeFloorPolygonsInRoom(room);
    // Créer un mesh polygone unique qui épouse la forme des murs
    createFloorPolygon(room);
}

// Créer une dalle de plafond texturée (1m x 1m) à une position donnée
function createCeilingTile(x, z) {
    if (!textureToolTexture) return;

    const tileX = Math.floor(x) + 0.5;
    const tileZ = Math.floor(z) + 0.5;

    // Vérifier si une dalle existe déjà
    const existingTile = scene.children.find(child =>
        child.userData.type === 'ceiling-tile' &&
        Math.abs(child.position.x - tileX) < 0.01 &&
        Math.abs(child.position.z - tileZ) < 0.01
    );
    if (existingTile) {
        const tex = textureToolTexture.clone();
        tex.needsUpdate = true;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        const repeat = 1 / textureToolTileSize;
        tex.repeat.set(repeat, repeat);
        existingTile.material.map = tex;
        existingTile.material.roughness = 0.5;
        existingTile.material.needsUpdate = true;
        // Sauvegarder les infos texture pour persistence
        existingTile.userData.textureDataURL = textureToolImageDataURL;
        existingTile.userData.tileSize = textureToolTileSize;
        return;
    }

    const tex = textureToolTexture.clone();
    tex.needsUpdate = true;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    const repeat = 1 / textureToolTileSize;
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
    tile.position.set(tileX, wallHeight - 0.02, tileZ); // Juste sous le plafond
    tile.receiveShadow = true;
    tile.userData.type = 'ceiling-tile';
    tile.userData.isEnvironment = true;
    // Sauvegarder les infos texture pour persistence
    tile.userData.textureDataURL = textureToolImageDataURL;
    tile.userData.tileSize = textureToolTileSize;
    scene.add(tile);

    markUnsavedChanges();
}

// Appliquer des dalles de plafond à toute une pièce
function applyCeilingToRoom(room) {
    if (!room || !textureToolTexture) return;
    // Supprimer les anciennes dalles individuelles et polygones de cette zone
    removeCeilingTilesInRoom(room);
    removeCeilingPolygonsInRoom(room);
    // Créer un mesh polygone unique qui épouse la forme des murs
    createCeilingPolygon(room);
}

// Créer un mesh polygone pour le sol qui épouse exactement la forme des murs
function createFloorPolygon(room) {
    if (!room || !textureToolTexture) return;

    // Supprimer l'ancien polygone sol de cette zone
    removeFloorPolygonsInRoom(room);

    const polygon = getWallPolygon(room);
    if (polygon.length < 3) return;

    // Créer le Shape à partir du polygone
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
    const tileSize = textureToolTileSize || 1;
    for (let i = 0; i < posAttr.count; i++) {
        // posAttr.x = monde X, posAttr.y = -monde Z (inversé dans le Shape)
        uvAttr.setXY(i, posAttr.getX(i) / tileSize, -posAttr.getY(i) / tileSize);
    }
    uvAttr.needsUpdate = true;

    // Texture
    const tex = textureToolTexture.clone();
    tex.needsUpdate = true;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);

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
    mesh.userData.textureDataURL = textureToolImageDataURL;
    mesh.userData.tileSize = tileSize;
    mesh.userData.polygonPoints = polygon;
    scene.add(mesh);
    markUnsavedChanges();
    console.log(`🎨 Sol polygone créé (${polygon.length} points)`);
}

// Créer un mesh polygone pour le plafond qui épouse exactement la forme des murs
function createCeilingPolygon(room) {
    if (!room || !textureToolTexture) return;

    // Supprimer l'ancien polygone plafond de cette zone
    removeCeilingPolygonsInRoom(room);

    const polygon = getWallPolygon(room);
    if (polygon.length < 3) return;

    // Créer le Shape à partir du polygone
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
    const tileSize = textureToolTileSize || 1;
    for (let i = 0; i < posAttr.count; i++) {
        uvAttr.setXY(i, posAttr.getX(i) / tileSize, posAttr.getY(i) / tileSize);
    }
    uvAttr.needsUpdate = true;

    // Texture
    const tex = textureToolTexture.clone();
    tex.needsUpdate = true;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);

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
    mesh.userData.textureDataURL = textureToolImageDataURL;
    mesh.userData.tileSize = tileSize;
    mesh.userData.polygonPoints = polygon;
    scene.add(mesh);
    markUnsavedChanges();
    console.log(`🎨 Plafond polygone créé (${polygon.length} points)`);
}

// Gérer le clic de l'outil texture
function handleTextureToolClick(event) {
    if (floorPlanMode !== 'texture') return;

    const ctrlPressed = event.ctrlKey || isCtrlPressed;

    // En mode suppression (Ctrl), pas besoin de texture chargée
    if (!ctrlPressed && !textureToolTexture) {
        console.warn('⚠️ Aucune texture chargée. Chargez d\'abord une image JPEG.');
        return;
    }

    const rect = renderer.domElement.getBoundingClientRect();
    editorMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    editorMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    editorRaycaster.setFromCamera(editorMouse, camera);

    const shiftPressed = event.shiftKey;

    if (textureToolTarget === 'wall') {
        // Raycast sur les murs
        const wallMeshes = floorPlanWalls.map(w => w.mesh).filter(m => m);
        const intersects = editorRaycaster.intersectObjects(wallMeshes);

        if (intersects.length > 0) {
            const clickedMesh = intersects[0].object;
            const wall = floorPlanWalls.find(w => w.mesh === clickedMesh);

            if (wall) {
                if (ctrlPressed) {
                    // Ctrl+clic : supprimer la texture
                    if (shiftPressed) {
                        if (wall.isMerged) {
                            // Mur fusionné : supprimer toutes les textures
                            removeTextureFromWall(wall);
                        } else {
                            const room = findRoomContainingWall(wall);
                            if (room) {
                                room.walls.forEach(w => removeTextureFromWall(w));
                            } else {
                                removeTextureFromWall(wall);
                            }
                        }
                    } else {
                        removeTextureFromWallFace(wall, intersects[0]);
                    }
                } else if (shiftPressed) {
                    // Maj+clic : appliquer à tous les murs du même côté
                    if (wall.isMerged) {
                        // Mur fusionné : appliquer à toutes les faces intérieures ou extérieures
                        applyTextureToMergedWallSide(wall, intersects[0]);
                    } else {
                        const room = findRoomContainingWall(wall);
                        if (room) {
                            applyTextureToRoomWalls(room, intersects[0]);
                        } else {
                            applyTextureToWallFace(wall, intersects[0]);
                        }
                    }
                } else {
                    // Clic simple : appliquer à la face cliquée uniquement
                    applyTextureToWallFace(wall, intersects[0]);
                }
            }
        }
    } else if (textureToolTarget === 'floor') {
        // Raycast sur le sol : vérifier dalles ET polygones existants, puis le plan
        const floorTiles = scene.children.filter(c => c.userData.type === 'floor-tile');
        const floorPolygons = scene.children.filter(c => c.userData.type === 'floor-polygon');
        const floorObjects = [...floorTiles, ...floorPolygons];
        const tileIntersects = editorRaycaster.intersectObjects(floorObjects);

        if (ctrlPressed) {
            // Suppression de dalles/polygones de sol
            if (tileIntersects.length > 0) {
                const clickedObj = tileIntersects[0].object;
                if (shiftPressed) {
                    // Ctrl+Shift : supprimer tout le sol de la pièce (dalles + polygones)
                    const pt = tileIntersects[0].point;
                    const room = findRoomAtPoint(pt.x, pt.z);
                    if (room) {
                        removeFloorTilesInRoom(room);
                        removeFloorPolygonsInRoom(room);
                    } else {
                        if (clickedObj.userData.type === 'floor-polygon') {
                            removePolygonMesh(clickedObj);
                        } else {
                            removeFloorTile(clickedObj);
                        }
                    }
                } else {
                    // Ctrl+clic : supprimer l'élément cliqué
                    if (clickedObj.userData.type === 'floor-polygon') {
                        removePolygonMesh(clickedObj);
                    } else {
                        removeFloorTile(clickedObj);
                    }
                }
            } else {
                // Ctrl+Shift sans toucher un objet : raycast sur le plan sol pour trouver la room
                if (shiftPressed) {
                    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
                    const intersectionPoint = new THREE.Vector3();
                    const hit = editorRaycaster.ray.intersectPlane(plane, intersectionPoint);
                    if (hit) {
                        const room = findRoomAtPoint(intersectionPoint.x, intersectionPoint.z);
                        if (room) {
                            removeFloorTilesInRoom(room);
                            removeFloorPolygonsInRoom(room);
                        }
                    }
                }
            }
            return;
        }

        // Application de texture sol
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersectionPoint = new THREE.Vector3();
        const hit = editorRaycaster.ray.intersectPlane(plane, intersectionPoint);

        if (hit) {
            if (shiftPressed) {
                const room = findRoomAtPoint(intersectionPoint.x, intersectionPoint.z);
                if (room) {
                    applyFloorToRoom(room);
                } else {
                    createFloorTile(intersectionPoint.x, intersectionPoint.z);
                }
            } else {
                createFloorTile(intersectionPoint.x, intersectionPoint.z);
            }
        }
    } else if (textureToolTarget === 'ceiling') {
        // Raycast sur le plafond : vérifier dalles ET polygones existants
        const ceilingTiles = scene.children.filter(c => c.userData.type === 'ceiling-tile');
        const ceilingPolygons = scene.children.filter(c => c.userData.type === 'ceiling-polygon');
        const ceilingObjects = [...ceilingTiles, ...ceilingPolygons];
        const tileIntersects = editorRaycaster.intersectObjects(ceilingObjects);

        if (ctrlPressed) {
            // Suppression de dalles/polygones de plafond
            if (tileIntersects.length > 0) {
                const clickedObj = tileIntersects[0].object;
                if (shiftPressed) {
                    // Ctrl+Shift : supprimer tout le plafond de la pièce (dalles + polygones)
                    const pt = tileIntersects[0].point;
                    const room = findRoomAtPoint(pt.x, pt.z);
                    if (room) {
                        removeCeilingTilesInRoom(room);
                        removeCeilingPolygonsInRoom(room);
                    } else {
                        if (clickedObj.userData.type === 'ceiling-polygon') {
                            removePolygonMesh(clickedObj);
                        } else {
                            removeCeilingTile(clickedObj);
                        }
                    }
                } else {
                    // Ctrl+clic : supprimer l'élément cliqué
                    if (clickedObj.userData.type === 'ceiling-polygon') {
                        removePolygonMesh(clickedObj);
                    } else {
                        removeCeilingTile(clickedObj);
                    }
                }
            } else {
                // Ctrl+Shift sans toucher un objet : raycast sur le plan plafond pour trouver la room
                if (shiftPressed) {
                    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -wallHeight);
                    const intersectionPoint = new THREE.Vector3();
                    const hit = editorRaycaster.ray.intersectPlane(plane, intersectionPoint);
                    if (hit) {
                        const room = findRoomAtPoint(intersectionPoint.x, intersectionPoint.z);
                        if (room) {
                            removeCeilingTilesInRoom(room);
                            removeCeilingPolygonsInRoom(room);
                        }
                    }
                }
            }
            return;
        }

        // Application de texture plafond
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -wallHeight);
        const intersectionPoint = new THREE.Vector3();
        const hit = editorRaycaster.ray.intersectPlane(plane, intersectionPoint);

        if (hit) {
            if (shiftPressed) {
                const room = findRoomAtPoint(intersectionPoint.x, intersectionPoint.z);
                if (room) {
                    applyCeilingToRoom(room);
                } else {
                    createCeilingTile(intersectionPoint.x, intersectionPoint.z);
                }
            } else {
                createCeilingTile(intersectionPoint.x, intersectionPoint.z);
            }
        }
    }
}

// Mettre à jour la prévisualisation de la taille de tuile en temps réel
function updateTexturePreview() {
    if (!textureToolTexture) return;

    // Mettre à jour tous les murs qui ont cette texture (multi-matériaux)
    floorPlanWalls.forEach(wall => {
        if (wall.textureInfo && wall.mesh) {
            // Pour les murs fusionnés, calculer la longueur depuis la géométrie
            let wallLength;
            if (wall.isMerged || !wall.start || !wall.end) {
                wall.mesh.geometry.computeBoundingBox();
                const bb = wall.mesh.geometry.boundingBox;
                wallLength = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z);
            } else {
                const dx = wall.end.x - wall.start.x;
                const dz = wall.end.z - wall.start.z;
                wallLength = Math.sqrt(dx * dx + dz * dz);
            }

            // Itérer sur chaque face qui a une texture
            for (const faceIdx in wall.textureInfo) {
                const info = wall.textureInfo[faceIdx];
                if (info && info.type === 'tile' && Array.isArray(wall.mesh.material)) {
                    const mat = wall.mesh.material[faceIdx];
                    if (mat && mat.map) {
                        const repeatX = wallLength / textureToolTileSize;
                        const repeatY = wallHeight / textureToolTileSize;
                        mat.map.repeat.set(repeatX, repeatY);
                        mat.map.needsUpdate = true;
                    }
                }
            }
        }
    });

    // Mettre à jour les dalles de sol et plafond
    scene.children.forEach(child => {
        if (child.userData.type === 'floor-tile' && child.material && child.material.map) {
            const repeat = 1 / textureToolTileSize;
            child.material.map.repeat.set(repeat, repeat);
            child.material.map.needsUpdate = true;
        }
        if (child.userData.type === 'ceiling-tile' && child.material && child.material.map) {
            const repeat = 1 / textureToolTileSize;
            child.material.map.repeat.set(repeat, repeat);
            child.material.map.needsUpdate = true;
        }
        // Mettre à jour les polygones de sol/plafond (recalculer les UVs)
        if ((child.userData.type === 'floor-polygon' || child.userData.type === 'ceiling-polygon') && child.geometry) {
            const posAttr = child.geometry.getAttribute('position');
            const uvAttr = child.geometry.getAttribute('uv');
            if (posAttr && uvAttr) {
                const tileSize = textureToolTileSize || 1;
                const isFloor = child.userData.type === 'floor-polygon';
                for (let i = 0; i < posAttr.count; i++) {
                    // Le sol utilise -z dans le Shape (compensé par rotation.x = -PI/2)
                    const uvY = isFloor ? -posAttr.getY(i) / tileSize : posAttr.getY(i) / tileSize;
                    uvAttr.setXY(i, posAttr.getX(i) / tileSize, uvY);
                }
                uvAttr.needsUpdate = true;
                child.userData.tileSize = tileSize;
            }
        }
    });
}

function clearAllWalls() {
    // Supprimer tous les murs
    floorPlanWalls.forEach(wall => {
        if (wall.mesh) {
            scene.remove(wall.mesh);
            if (wall.mesh.geometry) wall.mesh.geometry.dispose();
            if (Array.isArray(wall.mesh.material)) {
                wall.mesh.material.forEach(m => m.dispose());
            } else if (wall.mesh.material) {
                wall.mesh.material.dispose();
            }
        }
    });
    floorPlanWalls = [];

    // Supprimer toutes les pièces
    floorPlanRooms.forEach(room => {
        if (room.mesh) {
            scene.remove(room.mesh);
            if (room.mesh.geometry) room.mesh.geometry.dispose();
            if (room.mesh.material) room.mesh.material.dispose();
        }
    });
    floorPlanRooms = [];
    selectedRooms = [];

    // Supprimer les polygones de sol et plafond
    const polygonsToRemove = scene.children.filter(c =>
        c.userData.type === 'floor-polygon' || c.userData.type === 'ceiling-polygon'
    );
    polygonsToRemove.forEach(m => removePolygonMesh(m));

    updateBooleanOperationButtons();
    console.log('🗑️ Tous les murs, pièces et polygones effacés');
}

function deleteFloorPlanPoint(point) {
    const index = floorPlanPoints.indexOf(point);
    if (index > -1) {
        // Supprimer le mesh
        scene.remove(point.mesh);

        // Retirer du tableau
        floorPlanPoints.splice(index, 1);

        // Reconstruire toutes les lignes
        floorPlanLines.forEach(line => scene.remove(line));
        floorPlanLines = [];

        for (let i = 0; i < floorPlanPoints.length - 1; i++) {
            createLineBetweenPoints(floorPlanPoints[i], floorPlanPoints[i + 1]);
        }

        console.log(`🗑️ Point supprimé`);
    }
}

function onFloorPlanClick(event) {
    if (currentEditorMode !== 'floor-plan' || !isPlanViewActive) return;

    // Ne pas traiter les clics pendant le panning espace
    if (isSpacePressed || isSpacePanning) return;

    // Mode mesure: le clic est géré par mouseDown/mouseMove/mouseUp, pas ici
    if (floorPlanMode === 'measure') return;

    // Ignorer les clics qui ne sont pas sur le canvas
    if (event.target !== renderer.domElement) return;

    // En mode select, bloquer le click si mousedown a déjà géré l'action (déplacement)
    if (floorPlanMode === 'select' && blockFloorPlanClick) {
        blockFloorPlanClick = false;
        return;
    }

    // Calculer la position du clic dans le monde 3D
    const rect = renderer.domElement.getBoundingClientRect();
    editorMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    editorMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    editorRaycaster.setFromCamera(editorMouse, camera);

    // Mode Texture : traitement séparé (fait son propre raycast)
    if (floorPlanMode === 'texture') {
        handleTextureToolClick(event);
        return;
    }

    // Créer un plan au niveau du sol pour détecter le clic
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectionPoint = new THREE.Vector3();
    const intersectionResult = editorRaycaster.ray.intersectPlane(plane, intersectionPoint);

    if (!intersectionResult) return;

    // Appliquer le snap magnétique
    const x = snapToGrid(intersectionPoint.x);
    const z = snapToGrid(intersectionPoint.z);

    if (floorPlanMode === 'draw-wall') {
        // Mode effacement avec Ctrl en mode draw-wall
        if (isCtrlPressed) {
            // Ne rien faire au clic, l'effacement se fait pendant le drag
            isDrawingWall = true;
            drawStartPoint = { x, z };
            controls.enabled = false;
            console.log(`🗑️ Mode effacement activé en (${x.toFixed(1)}, ${z.toFixed(1)})`);
            return;
        }

        // En mode draw-wall sans touche B : ne rien faire
        // Le tracé se fait uniquement avec la touche B maintenant
        return;
    } else if (floorPlanMode === 'draw-oblique') {
        // Mode effacement avec Ctrl en mode oblique
        if (isCtrlPressed) {
            isDrawingWall = true;
            drawStartPoint = { x, z };
            controls.enabled = false;
            console.log(`🗑️ Mode effacement activé en (${x.toFixed(1)}, ${z.toFixed(1)})`);
            return;
        }

        // Si un tracé est en cours (B maintenu), ignorer le clic
        // pour ne pas écraser le drawStartPoint ni remettre isDrawingWall à false
        if (isDrawingWall || isBKeyPressed) {
            return;
        }

        // Clic sur le sol en mode oblique : fixer le point d'origine
        // Nettoyer l'ancien point de départ s'il existe
        removePointMarkers();
        if (currentPreviewWall) {
            scene.remove(currentPreviewWall);
            currentPreviewWall = null;
        }
        hideAngleIndicator();

        drawStartPoint = { x, z };
        isDrawingWall = false; // Le tracé démarre quand B est enfoncé

        // Créer le marqueur de point de départ (vert)
        startPointMarker = createPointMarker(x, z, 0x00ff00);
        scene.add(startPointMarker);

        console.log(`📐 Point d'origine oblique fixé en (${x.toFixed(1)}, ${z.toFixed(1)}). Maintenez B + glissez pour tracer.`);
        return;
    } else if (floorPlanMode === 'draw-room') {
        // Mode pièce : fonctionnement normal au clic
        isDrawingWall = true;
        drawStartPoint = { x, z };
        controls.enabled = false;

        startPointMarker = createPointMarker(x, z, 0x00ff00);
        scene.add(startPointMarker);

        console.log(`🖊️ Début du tracé de pièce en (${x.toFixed(1)}, ${z.toFixed(1)})`);
    } else if (floorPlanMode === 'delete-wall') {
        // Supprimer un mur cliqué
        const intersects = editorRaycaster.intersectObjects(
            floorPlanWalls.map(w => w.mesh).filter(m => m)
        );
        if (intersects.length > 0) {
            const clickedMesh = intersects[0].object;
            const wall = floorPlanWalls.find(w => w.mesh === clickedMesh);
            if (wall) {
                deleteWall(wall);
            }
        }
    } else if (floorPlanMode === 'select') {
        // Sélection de MURS par clic (multi-sélection avec Maj)
        const wallIntersects = editorRaycaster.intersectObjects(
            floorPlanWalls.map(w => w.mesh).filter(m => m)
        );

        if (wallIntersects.length > 0) {
            const clickedMesh = wallIntersects[0].object;
            const wall = floorPlanWalls.find(w => w.mesh === clickedMesh);
            if (wall) {
                const multiSelect = event.shiftKey;
                toggleWallSelection(wall, multiSelect);
                console.log(`🎯 Mur ${multiSelect ? 'ajouté à la sélection' : 'sélectionné'}`);
                return;
            }
        }

        // Sélection de PIÈCES par clic (multi-sélection avec Maj)
        const roomIntersects = editorRaycaster.intersectObjects(
            floorPlanRooms.map(r => r.mesh).filter(m => m)
        );
        if (roomIntersects.length > 0) {
            const clickedMesh = roomIntersects[0].object;
            const room = floorPlanRooms.find(r => r.mesh === clickedMesh);
            if (room) {
                const multiSelect = event.shiftKey;
                toggleRoomSelection(room, multiSelect);
                return;
            }
        }

        // Clic sur zone vide: désélectionner pièces ET murs (sauf si Maj est enfoncé)
        if (!event.shiftKey) {
            // Désélectionner les pièces
            selectedRooms.forEach(r => {
                r.selected = false;
                r.mesh.material.opacity = 0.05;
                r.mesh.material.color.setHex(0x4488ff);
            });
            selectedRooms = [];
            updateBooleanOperationButtons();

            // Désélectionner les murs
            if (selectedWalls.length > 0) {
                clearWallSelection();
            }

            console.log('🎯 Sélection effacée');
        }
    }
}

// Mousedown pour démarrer le déplacement/rotation des murs sélectionnés
function onFloorPlanMouseDown(event) {
    // SPACE PANNING: Intercepter le clic gauche quand l'espace est maintenu
    if (isSpacePressed && event.button === 0) {
        event.preventDefault();
        event.stopPropagation();

        isSpacePanning = true;
        spacePanStart.x = event.clientX;
        spacePanStart.y = event.clientY;
        spacePanCameraStart = camera.position.clone();
        spacePanTargetStart = controls.target.clone();

        // Curseur main fermée (grabbing)
        const canvas = renderer.domElement;
        canvas.classList.remove('space-pan-hand');
        canvas.classList.add('space-pan-grabbing');

        return;
    }

    if (currentEditorMode !== 'floor-plan' || !isPlanViewActive) return;

    // MODE MESURE: Démarrer la mesure au clic gauche
    if (floorPlanMode === 'measure' && event.button === 0) {
        // Nettoyer la mesure précédente
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
            measureLabel.style.display = 'none';
        }

        const startPt = getMeasurePoint3D(event);
        if (startPt) {
            isMeasuring = true;
            measureStartPoint3D = startPt;
            measureStartScreenPos = { x: event.clientX, y: event.clientY };
            controls.enabled = false;

            // Créer le point rose d'origine
            const markerGeo = new THREE.SphereGeometry(0.15, 16, 16);
            const markerMat = new THREE.MeshBasicMaterial({
                color: 0xff69b4,
                transparent: true,
                opacity: 0.9,
                depthTest: false
            });
            measureStartMarker = new THREE.Mesh(markerGeo, markerMat);
            measureStartMarker.position.copy(startPt);
            measureStartMarker.renderOrder = 999;
            measureStartMarker.userData.isGizmo = true;
            scene.add(measureStartMarker);
        }
        event.preventDefault();
        event.stopPropagation();
        return;
    }

    // En mode select, forcer isDrawingWall à false
    if (floorPlanMode === 'select') {
        isDrawingWall = false;
    } else if (isDrawingWall) {
        // En mode dessin, ne pas interférer si un dessin est en cours
        return;
    }

    const rect = renderer.domElement.getBoundingClientRect();
    editorMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    editorMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    editorRaycaster.setFromCamera(editorMouse, camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectionPoint = new THREE.Vector3();
    const intersectionResult = editorRaycaster.ray.intersectPlane(plane, intersectionPoint);

    if (!intersectionResult) return;

    const x = intersectionPoint.x;
    const z = intersectionPoint.z;

    // MODE SELECTION: Clic droit + touche "<" pour déplacer les murs sélectionnés
    if (event.button === 2 && isMoveKeyPressed && floorPlanMode === 'select' && selectedWalls.length > 0) {
        startDraggingSelectedWalls(x, z);
        controls.enabled = false;
        event.preventDefault();
        event.stopPropagation();
        return;
    }

    // MODE SELECTION: Clic droit + touche "W" pour rotation
    if (event.button === 2 && isRotateKeyPressed && !isMoveKeyPressed && floorPlanMode === 'select' && selectedWalls.length > 0) {
        // Calculer le centre de rotation (centre géométrique des murs sélectionnés)
        let sumX = 0, sumZ = 0, count = 0;
        selectedWalls.forEach(wall => {
            if (wall.isMerged) {
                // Pour les murs fusionnés, utiliser la position du mesh
                sumX += wall.mesh.position.x;
                sumZ += wall.mesh.position.z;
            } else {
                sumX += (wall.start.x + wall.end.x) / 2;
                sumZ += (wall.start.z + wall.end.z) / 2;
            }
            count++;
        });
        rotationCenter = { x: sumX / count, z: sumZ / count };

        // Sauvegarder les positions initiales pour la rotation
        selectedWalls.forEach(wall => {
            if (wall.isMerged) {
                wall.originalStart = { x: wall.mesh.position.x, z: wall.mesh.position.z };
                wall.originalEnd = { x: wall.mesh.position.x, z: wall.mesh.position.z };
            } else {
                wall.originalStart = { x: wall.start.x, z: wall.start.z };
                wall.originalEnd = { x: wall.end.x, z: wall.end.z };
            }
        });

        // Calculer l'angle initial
        const dx = x - rotationCenter.x;
        const dz = z - rotationCenter.z;
        rotationStartAngle = Math.atan2(dz, dx);
        currentRotationAngle = 0;

        isRotatingSelectedWalls = true;
        controls.enabled = false;

        console.log('🔄 Début de la rotation des murs sélectionnés autour de', rotationCenter);
        event.preventDefault();
    }
}

// Mettre à jour l'état du bouton Fusionner selon la sélection
function updateMergeButton() {
    const btn = document.getElementById('btn-merge-walls');
    if (btn) {
        btn.disabled = selectedWalls.length < 2;
    }
}

// Sélectionner un seul mur avec surbrillance
function selectSingleWall(wall) {
    if (!wall || !wall.mesh) return;

    selectedWalls.push(wall);

    // Appliquer la surbrillance bleue
    if (wall.mesh.material) {
        // Sauvegarder le matériau original
        if (!wall.originalMaterial) {
            wall.originalMaterial = wall.mesh.material;
        }

        if (Array.isArray(wall.mesh.material)) {
            // Tableau de matériaux (murs fusionnés) : cloner chaque matériau et appliquer la teinte
            wall.mesh.material = wall.mesh.material.map(m => {
                const cloned = m.clone();
                cloned.color.setHex(0x4444ff);
                if (cloned.emissive !== undefined) {
                    cloned.emissive.setHex(0x2222aa);
                    cloned.emissiveIntensity = 0.4;
                }
                return cloned;
            });
        } else {
            wall.mesh.material = wall.mesh.material.clone();
            wall.mesh.material.color.setHex(0x4444ff);
            if (wall.mesh.material.emissive !== undefined) {
                wall.mesh.material.emissive.setHex(0x2222aa);
                wall.mesh.material.emissiveIntensity = 0.4;
            }
        }
    }

    updateMergeButton();

    // Afficher l'étiquette de dimensions du mur
    if (wall.mesh) {
        showDimensionsLabel(wall.mesh);
    }
}

// Basculer la sélection d'un mur (avec support multi-sélection via Maj)
function toggleWallSelection(wall, multiSelect) {
    if (!wall || !wall.mesh) return;

    const isAlreadySelected = selectedWalls.includes(wall);

    if (isAlreadySelected) {
        // Désélectionner ce mur
        deselectWall(wall);
    } else {
        // Si pas de multi-sélection, désélectionner les autres murs d'abord
        if (!multiSelect) {
            clearWallSelection();
        }
        // Sélectionner ce mur
        selectSingleWall(wall);
    }
}

// Désélectionner un mur spécifique
function deselectWall(wall) {
    if (!wall || !wall.mesh) return;

    const index = selectedWalls.indexOf(wall);
    if (index === -1) return;

    // Restaurer le matériau original
    if (wall.originalMaterial) {
        // Disposer les matériaux clonés de sélection
        if (wall.mesh.material && wall.mesh.material !== wall.originalMaterial) {
            if (Array.isArray(wall.mesh.material)) {
                wall.mesh.material.forEach(m => m.dispose());
            } else {
                wall.mesh.material.dispose();
            }
        }
        wall.mesh.material = wall.originalMaterial;
        wall.originalMaterial = null;
    } else if (wall.mesh.material) {
        if (Array.isArray(wall.mesh.material)) {
            wall.mesh.material.forEach(m => {
                m.color.setHex(0xcccccc);
                if (m.emissive !== undefined) {
                    m.emissive.setHex(0x000000);
                    m.emissiveIntensity = 0;
                }
            });
        } else {
            wall.mesh.material.color.setHex(0xcccccc);
            if (wall.mesh.material.emissive !== undefined) {
                wall.mesh.material.emissive.setHex(0x000000);
                wall.mesh.material.emissiveIntensity = 0;
            }
        }
    }

    // Retirer de la liste
    selectedWalls.splice(index, 1);

    updateMergeButton();
}

function onFloorPlanMouseMove(event) {
    // SPACE PANNING: Déplacer la caméra et la cible
    if (isSpacePanning) {
        const dx = event.clientX - spacePanStart.x;
        const dy = event.clientY - spacePanStart.y;

        // Obtenir les vecteurs "droite" et "haut" de la caméra dans l'espace monde
        const right = new THREE.Vector3();
        const up = new THREE.Vector3();
        right.setFromMatrixColumn(camera.matrixWorld, 0); // Colonne 0 = vecteur droit
        up.setFromMatrixColumn(camera.matrixWorld, 1);    // Colonne 1 = vecteur haut

        // Calculer le facteur d'échelle basé sur la distance caméra-cible
        const distance = camera.position.distanceTo(controls.target);
        const fovRad = camera.fov * Math.PI / 180;
        const canvasHeight = renderer.domElement.clientHeight;
        const scaleFactor = (2 * distance * Math.tan(fovRad / 2)) / canvasHeight;

        // Appliquer le déplacement (inverser pour un comportement naturel)
        const panOffset = new THREE.Vector3();
        panOffset.addScaledVector(right, -dx * scaleFactor);
        panOffset.addScaledVector(up, dy * scaleFactor);

        camera.position.copy(spacePanCameraStart).add(panOffset);
        controls.target.copy(spacePanTargetStart).add(panOffset);

        return;
    }

    if (currentEditorMode !== 'floor-plan' || !isPlanViewActive) return;

    // MODE MESURE: Mettre à jour la ligne et le label en temps réel
    if (isMeasuring && measureStartPoint3D) {
        const endPt = getMeasurePoint3D(event);
        if (endPt) {
            // Mettre à jour la ligne rose
            updateMeasureLine(measureStartPoint3D, endPt);

            // Calculer la distance 3D
            const distance = measureStartPoint3D.distanceTo(endPt);

            // Positionner le label au milieu entre départ et position actuelle de la souris
            const midScreenX = (measureStartScreenPos.x + event.clientX) / 2;
            const midScreenY = (measureStartScreenPos.y + event.clientY) / 2 - 20; // Décalé un peu vers le haut

            updateMeasureLabel(distance, midScreenX, midScreenY);
        }
        return;
    }

    // Calculer la position actuelle de la souris
    const rect = renderer.domElement.getBoundingClientRect();
    editorMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    editorMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    editorRaycaster.setFromCamera(editorMouse, camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();
    editorRaycaster.ray.intersectPlane(plane, intersection);

    if (!intersection) return;

    const x = intersection.x;
    const z = intersection.z;

    // Gestion du déplacement des murs sélectionnés
    if (isDraggingSelectedWalls) {
        updateDraggingSelectedWalls(x, z);
        return;
    }

    // Gestion de la rotation des murs sélectionnés
    if (isRotatingSelectedWalls && rotationCenter) {
        const dx = x - rotationCenter.x;
        const dz = z - rotationCenter.z;
        const currentAngle = Math.atan2(dz, dx);
        const deltaAngle = currentAngle - rotationStartAngle;

        // Convertir en degrés et arrondir à l'entier
        const angleDegrees = Math.round((deltaAngle * 180) / Math.PI);

        if (angleDegrees !== currentRotationAngle) {
            // Calculer la différence depuis la dernière rotation
            const rotateDiff = angleDegrees - currentRotationAngle;
            rotateSelectedWalls(rotateDiff);
            currentRotationAngle = angleDegrees;

            // Mettre à jour l'indicateur d'angle
            updateRotationIndicator(angleDegrees);
        }
        return;
    }

    if (!isDrawingWall || !drawStartPoint) return;

    // Mode effacement avec Ctrl: surbrillance jaune sur mur survolé
    if ((floorPlanMode === 'draw-wall' || floorPlanMode === 'draw-oblique') && isCtrlPressed && !isDrawingWall) {
        highlightWallForDeletion();
        return;
    }

    // Si on n'est plus en mode CTRL, retirer la surbrillance
    if (hoveredWallForDeletion) {
        resetWallHighlight(hoveredWallForDeletion);
        hoveredWallForDeletion = null;
    }

    // Mode effacement avec Ctrl en train de dessiner: effacer les murs survolés
    if ((floorPlanMode === 'draw-wall' || floorPlanMode === 'draw-oblique') && isCtrlPressed && isDrawingWall) {
        eraseWallsAlongPath(intersection);
        return;
    }

    // Appliquer le snap magnétique
    let snapX = snapToGrid(intersection.x);
    let snapZ = snapToGrid(intersection.z);

    // Contraindre aux axes (horizontal/vertical/diagonal) uniquement pour l'outil Mur
    let constrainedEnd = { x: snapX, z: snapZ };
    if (floorPlanMode === 'draw-wall') {
        constrainedEnd = constrainToAxis(drawStartPoint, { x: snapX, z: snapZ });
        snapX = constrainedEnd.x;
        snapZ = constrainedEnd.z;
    }

    // Mettre à jour le marqueur de point final
    if (endPointMarker) {
        scene.remove(endPointMarker);
    }
    endPointMarker = createPointMarker(snapX, snapZ, 0xffff00);
    scene.add(endPointMarker);

    // Mettre à jour l'aperçu du mur/pièce en cours de tracé
    if (currentPreviewWall) {
        scene.remove(currentPreviewWall);
        currentPreviewWall = null;
    }

    if (floorPlanMode === 'draw-wall') {
        // Aperçu d'un mur simple (mur 3D semi-transparent style Sims)
        currentPreviewWall = createWallPreview(drawStartPoint, { x: snapX, z: snapZ });
    } else if (floorPlanMode === 'draw-oblique') {
        // Aperçu oblique : simple ligne fine guide (pas de mur 3D)
        currentPreviewWall = createObliqueWallPreview(drawStartPoint, { x: snapX, z: snapZ });
    } else if (floorPlanMode === 'draw-room') {
        // Aperçu d'une pièce (rectangulaire ou arrondie)
        currentPreviewWall = (roomRounding > 0)
            ? createRoundedRoomPreview(drawStartPoint, { x: snapX, z: snapZ }, roomRounding)
            : createRoomPreview(drawStartPoint, { x: snapX, z: snapZ });
    }

    if (currentPreviewWall) {
        scene.add(currentPreviewWall);
    }

    // Afficher l'indicateur d'angle pour l'outil oblique
    if (floorPlanMode === 'draw-oblique' && isDrawingWall && drawStartPoint) {
        const angleInfo = computeObliqueAngle(drawStartPoint, { x: snapX, z: snapZ });
        updateAngleIndicator(drawStartPoint, { x: snapX, z: snapZ }, angleInfo);
    } else {
        hideAngleIndicator();
    }
}

function onFloorPlanMouseUp(event) {
    // SPACE PANNING: Terminer le pan
    if (isSpacePanning && event.button === 0) {
        isSpacePanning = false;
        spacePanCameraStart = null;
        spacePanTargetStart = null;

        // Retour au curseur main ouverte si l'espace est toujours maintenu
        const canvas = renderer.domElement;
        canvas.classList.remove('space-pan-grabbing');
        if (isSpacePressed) {
            canvas.classList.add('space-pan-hand');
        }

        event.preventDefault();
        event.stopPropagation();
        return;
    }

    // MODE MESURE: Terminer la mesure
    if (isMeasuring && event.button === 0) {
        isMeasuring = false;
        measureStartPoint3D = null;
        measureStartScreenPos = null;
        controls.enabled = true;
        // La ligne et le label restent visibles jusqu'au prochain clic ou changement d'outil
        return;
    }

    // Réinitialiser le flag de blocage du click (safety net)
    // Le click devrait le gérer mais au cas où le click ne se déclenche pas
    setTimeout(() => { blockFloorPlanClick = false; }, 100);

    // Terminer la rotation (clic droit)
    if (event.button === 2 && isRotatingSelectedWalls) {
        finishRotation();
        return;
    }

    // Terminer le déplacement des murs sélectionnés
    if (isDraggingSelectedWalls) {
        finishDraggingSelectedWalls();
        return;
    }

    if (!isDrawingWall || !drawStartPoint) {
        controls.enabled = true;
        return;
    }

    // En mode oblique, le mouseUp ne finalise PAS le mur
    // C'est le relâchement de B qui finalise (via finishWallDrawing)
    if (floorPlanMode === 'draw-oblique' && !isCtrlPressed) {
        return;
    }

    // Calculer la position finale
    const rect = renderer.domElement.getBoundingClientRect();
    editorMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    editorMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    editorRaycaster.setFromCamera(editorMouse, camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();
    editorRaycaster.ray.intersectPlane(plane, intersection);

    // Mode effacement avec Ctrl: terminer sans créer de mur
    if ((floorPlanMode === 'draw-wall' || floorPlanMode === 'draw-oblique') && isCtrlPressed) {
        console.log('🗑️ Fin du mode effacement');
        // Réinitialiser l'état
        isDrawingWall = false;
        drawStartPoint = null;
        controls.enabled = true;
        hideAngleIndicator();
        return;
    }

    if (intersection) {
        let x = snapToGrid(intersection.x);
        let z = snapToGrid(intersection.z);

        // Contraindre aux axes uniquement pour l'outil Mur (pas pour Oblique)
        if (floorPlanMode === 'draw-wall') {
            const constrainedEnd = constrainToAxis(drawStartPoint, { x, z });
            x = constrainedEnd.x;
            z = constrainedEnd.z;
        }

        // Supprimer l'aperçu
        if (currentPreviewWall) {
            scene.remove(currentPreviewWall);
            currentPreviewWall = null;
        }

        // Supprimer les marqueurs
        removePointMarkers();

        if (floorPlanMode === 'draw-wall') {
            // Créer un mur permanent
            createWallSegment(drawStartPoint, { x, z });
        } else if (floorPlanMode === 'draw-room') {
            // Créer une pièce (rectangulaire ou arrondie)
            if (roomRounding > 0) {
                createRoundedRoom(drawStartPoint, { x, z }, roomRounding);
            } else {
                createRectangularRoom(drawStartPoint, { x, z });
            }
        }
    } else {
        // Annuler si pas d'intersection
        if (currentPreviewWall) {
            scene.remove(currentPreviewWall);
            currentPreviewWall = null;
        }
        removePointMarkers();
    }

    // Masquer l'indicateur d'angle oblique
    hideAngleIndicator();

    // Réinitialiser l'état
    isDrawingWall = false;
    drawStartPoint = null;
    controls.enabled = true;
}

// ==================== SÉLECTION MULTIPLE ET TRANSFORMATION DE MURS ====================

// Désélectionner tous les murs
function clearWallSelection() {
    selectedWalls.forEach(wall => {
        if (!wall.mesh) return;

        // Restaurer le matériau original si disponible
        if (wall.originalMaterial) {
            // Disposer des matériaux clonés
            if (wall.mesh.material && wall.mesh.material !== wall.originalMaterial) {
                if (Array.isArray(wall.mesh.material)) {
                    wall.mesh.material.forEach(m => m.dispose());
                } else {
                    wall.mesh.material.dispose();
                }
            }
            wall.mesh.material = wall.originalMaterial;
            wall.originalMaterial = null;
        } else if (wall.mesh.material) {
            // Sinon, réinitialiser les couleurs
            if (Array.isArray(wall.mesh.material)) {
                wall.mesh.material.forEach(m => {
                    m.color.setHex(0xcccccc);
                    if (m.emissive !== undefined) {
                        m.emissive.setHex(0x000000);
                        m.emissiveIntensity = 0;
                    }
                });
            } else {
                wall.mesh.material.color.setHex(0xcccccc);
                if (wall.mesh.material.emissive !== undefined) {
                    wall.mesh.material.emissive.setHex(0x000000);
                    wall.mesh.material.emissiveIntensity = 0;
                }
            }
        }

        // Nettoyer les positions originales sauvegardées pour la rotation
        delete wall.originalStart;
        delete wall.originalEnd;
    });
    selectedWalls = [];
    updateMergeButton();
    console.log('🔓 Sélection de murs effacée');
}

// ==================== FUSION DE MURS ====================

/**
 * Fusionne les murs sélectionnés en un seul mesh unifié.
 * Élimine le Z-fighting aux jonctions en combinant les géométries.
 * Le mesh résultant supporte les textures par face via groups de matériaux.
 */
function mergeSelectedWalls() {
    if (selectedWalls.length < 2) {
        console.warn('⚠️ Il faut au moins 2 murs sélectionnés pour fusionner');
        return;
    }

    const wallsToRemove = [...selectedWalls];

    // Calculer le polygone intérieur AVANT de supprimer les murs source
    // Les murs ont encore leurs start/end à ce stade
    const roomPolygon = computeRoomPolygonFromWalls(wallsToRemove);

    // Restaurer les matériaux originaux (retirer le highlight de sélection)
    clearWallSelection();

    // Phase 1 : Collecter les géométries et matériaux de chaque mur source
    // Chaque face physique obtient son propre group et matériau (pas de suppression de faces internes)
    // Le z-fighting est géré uniquement par polygonOffset différencié par mur source
    const faceGroups = []; // { matIdx, wallIdx, triPair: [{i0,i1,i2},...] }
    const materials = [];
    let vertexOffset = 0;
    const allPositions = [];
    const allNormals = [];
    const allUVs = [];

    wallsToRemove.forEach((wall, wallIdx) => {
        const mesh = wall.mesh;
        if (!mesh || !mesh.geometry) return;

        // Cloner et transformer en world-space
        const geo = mesh.geometry.clone();
        geo.applyMatrix4(mesh.matrixWorld);

        const posAttr = geo.getAttribute('position');
        const normalAttr = geo.getAttribute('normal');
        const uvAttr = geo.getAttribute('uv');

        for (let v = 0; v < posAttr.count; v++) {
            allPositions.push(posAttr.getX(v), posAttr.getY(v), posAttr.getZ(v));
            allNormals.push(normalAttr.getX(v), normalAttr.getY(v), normalAttr.getZ(v));
            if (uvAttr) {
                allUVs.push(uvAttr.getX(v), uvAttr.getY(v));
            }
        }

        let geoIndices;
        if (geo.index) {
            geoIndices = Array.from(geo.index.array);
        } else {
            geoIndices = [];
            for (let v = 0; v < posAttr.count; v++) geoIndices.push(v);
        }

        const triCount = geoIndices.length / 3;
        const sourceMats = Array.isArray(mesh.material) ? mesh.material : null;
        const singleMat = !Array.isArray(mesh.material) ? mesh.material : null;

        for (let t = 0; t < triCount; t += 2) {
            const matIdx = materials.length;
            const localFaceIdx = Math.floor(t / 2);

            // Matériau avec polygonOffset différencié par mur source
            let faceMat;
            if (sourceMats && sourceMats[localFaceIdx]) {
                faceMat = sourceMats[localFaceIdx].clone();
            } else if (singleMat) {
                faceMat = singleMat.clone();
            } else {
                faceMat = new THREE.MeshStandardMaterial({
                    color: 0xcccccc, side: THREE.DoubleSide,
                    roughness: 0.4, metalness: 0
                });
            }
            // PolygonOffset différencié : chaque mur source a un offset légèrement différent
            // Cela empêche le z-fighting entre faces de murs différents qui se chevauchent
            faceMat.polygonOffset = true;
            faceMat.polygonOffsetFactor = 1 + wallIdx * 0.3;
            faceMat.polygonOffsetUnits = 1 + wallIdx * 0.3;
            materials.push(faceMat);

            const triPair = [];
            for (let dt = 0; dt < 2 && (t + dt) < triCount; dt++) {
                const base = (t + dt) * 3;
                const i0 = geoIndices[base] + vertexOffset;
                const i1 = geoIndices[base + 1] + vertexOffset;
                const i2 = geoIndices[base + 2] + vertexOffset;
                triPair.push({ matIdx, i0, i1, i2 });
            }

            faceGroups.push({ matIdx, wallIdx, triPair });
        }

        vertexOffset += posAttr.count;
        geo.dispose();
    });

    if (faceGroups.length < 2) {
        console.warn('⚠️ Pas assez de géométries valides pour la fusion');
        return;
    }

    // Collecter tous les triangles (pas de suppression de faces internes — le polygonOffset gère le z-fighting)
    const allTriangles = [];
    faceGroups.forEach(fg => {
        fg.triPair.forEach(tri => allTriangles.push(tri));
    });

    // Phase 2 : Construire la géométrie fusionnée
    const mergedGeo = new THREE.BufferGeometry();
    mergedGeo.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3));
    mergedGeo.setAttribute('normal', new THREE.Float32BufferAttribute(allNormals, 3));
    if (allUVs.length > 0) {
        mergedGeo.setAttribute('uv', new THREE.Float32BufferAttribute(allUVs, 2));
    }

    // Trier les triangles par matIdx pour regrouper les faces
    allTriangles.sort((a, b) => a.matIdx - b.matIdx);

    const newIndices = [];
    allTriangles.forEach(t => {
        newIndices.push(t.i0, t.i1, t.i2);
    });
    mergedGeo.setIndex(newIndices);

    // Créer les groups
    mergedGeo.clearGroups();
    if (allTriangles.length > 0) {
        let currentMatIdx = allTriangles[0].matIdx;
        let groupStart = 0;
        for (let i = 0; i < allTriangles.length; i++) {
            if (allTriangles[i].matIdx !== currentMatIdx) {
                mergedGeo.addGroup(groupStart * 3, (i - groupStart) * 3, currentMatIdx);
                currentMatIdx = allTriangles[i].matIdx;
                groupStart = i;
            }
        }
        mergedGeo.addGroup(groupStart * 3, (allTriangles.length - groupStart) * 3, currentMatIdx);
    }

    // Phase 3 : Créer le mesh fusionné
    const mergedMesh = new THREE.Mesh(mergedGeo, materials);
    mergedMesh.castShadow = true;
    mergedMesh.receiveShadow = true;

    // Métadonnées
    const mergedId = wallIdCounter++;
    const mergedName = `Mur fusionné n°${mergedId}`;
    mergedMesh.userData.type = 'merged-wall';
    mergedMesh.userData.editorName = mergedName;
    mergedMesh.userData.isMerged = true;
    mergedMesh.userData.isEnvironment = true;
    mergedMesh.userData.wallId = mergedId;
    mergedMesh.userData.sourceWallCount = wallsToRemove.length;

    scene.add(mergedMesh);

    // Supprimer les anciens murs individuels (nettoyage direct et robuste)
    wallsToRemove.forEach(wall => {
        // Retirer de selectableObjects
        const selIdx = selectableObjects.indexOf(wall.mesh);
        if (selIdx > -1) selectableObjects.splice(selIdx, 1);

        // Si le mur appartient à une pièce, le retirer de la pièce
        const room = floorPlanRooms.find(r => r.walls && r.walls.includes(wall));
        if (room) {
            const roomWallIdx = room.walls.indexOf(wall);
            if (roomWallIdx > -1) room.walls.splice(roomWallIdx, 1);
            // Si la pièce n'a plus de murs, supprimer la pièce aussi
            if (room.walls.length === 0) {
                scene.remove(room.mesh);
                if (room.mesh.geometry) room.mesh.geometry.dispose();
                disposeMaterial(room.mesh.material);
                const roomIdx = floorPlanRooms.indexOf(room);
                if (roomIdx > -1) floorPlanRooms.splice(roomIdx, 1);
            }
        }

        // Retirer le mesh de la scène
        scene.remove(wall.mesh);

        // Disposer géométrie et matériaux
        if (wall.mesh.geometry) wall.mesh.geometry.dispose();
        disposeMaterial(wall.mesh.material);

        // Retirer de floorPlanWalls
        const fpIdx = floorPlanWalls.indexOf(wall);
        if (fpIdx > -1) floorPlanWalls.splice(fpIdx, 1);
    });

    // Ajouter le mesh fusionné aux listes
    selectableObjects.push(mergedMesh);

    const mergedWall = {
        start: null,
        end: null,
        mesh: mergedMesh,
        name: mergedName,
        id: mergedId,
        isMerged: true
    };

    // Stocker le polygone intérieur si les murs formaient un cycle fermé
    if (roomPolygon.length >= 3) {
        mergedWall.roomPolygon = roomPolygon;
        mergedMesh.userData.roomPolygon = roomPolygon;
        console.log(`📐 Polygone intérieur calculé (${roomPolygon.length} sommets)`);
    }

    floorPlanWalls.push(mergedWall);

    // Rafraîchir l'interface
    updateObjectsList();

    // Sauvegarder dans l'historique
    saveFloorPlanState('merge-walls', { count: wallsToRemove.length, name: mergedName });

    console.log(`🔗 ${wallsToRemove.length} murs fusionnés → "${mergedName}" (${faceGroups.length} faces, ${materials.length} matériaux)`);
}

// Démarrer le déplacement des murs sélectionnés
function startDraggingSelectedWalls(x, z) {
    if (selectedWalls.length === 0) return;

    isDraggingSelectedWalls = true;
    dragStartPoint = { x: snapToGrid(x), z: snapToGrid(z) };
    controls.enabled = false;

    // Changer le curseur en mode déplacement
    const canvas = renderer.domElement;
    canvas.classList.remove('floor-plan-cursor-select');
    canvas.classList.add('floor-plan-cursor-move');

    console.log('🚚 Début du déplacement des murs sélectionnés');
}

// Mettre à jour la position des murs sélectionnés
function updateDraggingSelectedWalls(x, z) {
    if (!dragStartPoint) return;

    const deltaX = snapToGrid(x) - snapToGrid(dragStartPoint.x);
    const deltaZ = snapToGrid(z) - snapToGrid(dragStartPoint.z);

    if (deltaX === 0 && deltaZ === 0) return;

    selectedWalls.forEach(wall => {
        if (wall.isMerged) {
            // Pour les murs fusionnés, déplacer directement le mesh
            wall.mesh.position.x += deltaX;
            wall.mesh.position.z += deltaZ;
        } else {
            wall.start.x += deltaX;
            wall.start.z += deltaZ;
            wall.end.x += deltaX;
            wall.end.z += deltaZ;
            updateWallMeshPosition(wall);
        }
    });

    dragStartPoint = { x: snapToGrid(x), z: snapToGrid(z) };
}

// Finaliser le déplacement
function finishDraggingSelectedWalls() {
    isDraggingSelectedWalls = false;
    dragStartPoint = null;
    controls.enabled = true;

    // Restaurer le curseur selon l'état de la touche "<"
    const canvas = renderer.domElement;
    canvas.classList.remove('floor-plan-cursor-move');
    if (!isMoveKeyPressed) {
        canvas.classList.add('floor-plan-cursor-select');
    } else {
        // Si "<" est toujours enfoncé, garder le curseur de déplacement
        canvas.classList.add('floor-plan-cursor-move');
    }

    // NE PAS désélectionner automatiquement - permet de faire plusieurs déplacements
    // La désélection se fait en cliquant ailleurs ou en changeant d'outil

    // Sauvegarder l'état pour l'historique
    saveFloorPlanState('move-walls', { count: selectedWalls.length });

    console.log(`✅ Déplacement terminé (${selectedWalls.length} mur(s))`);
}

// Mettre à jour uniquement la position d'un mur
function updateWallMeshPosition(wall) {
    if (!wall || !wall.mesh) return;
    if (wall.isMerged || !wall.start || !wall.end) return;

    const dx = wall.end.x - wall.start.x;
    const dz = wall.end.z - wall.start.z;
    const length = Math.sqrt(dx * dx + dz * dz);

    const midX = (wall.start.x + wall.end.x) / 2;
    const midZ = (wall.start.z + wall.end.z) / 2;
    wall.mesh.position.set(midX, wallHeight / 2, midZ);

    const angle = Math.atan2(dz, dx);
    wall.mesh.rotation.y = -angle;

    // Mettre à jour la géométrie si nécessaire
    const currentLength = wall.mesh.geometry.parameters.width;
    if (Math.abs(currentLength - length) > 0.01) {
        const oldMaterial = wall.mesh.material;
        scene.remove(wall.mesh);
        wall.mesh.geometry.dispose();

        const geometry = new THREE.BoxGeometry(length, wallHeight, wallThickness);
        const newMesh = new THREE.Mesh(geometry, oldMaterial);
        newMesh.position.set(midX, wallHeight / 2, midZ);
        newMesh.rotation.y = -angle;
        newMesh.castShadow = true;
        newMesh.receiveShadow = true;
        newMesh.userData.type = 'floor-plan-wall';
        newMesh.userData.isEnvironment = true;

        wall.mesh = newMesh;
        scene.add(newMesh);
    }
}

// Faire pivoter les murs sélectionnés autour du centre de rotation
// Utilise les positions ORIGINALES pour calculer la rotation totale depuis le début
function rotateSelectedWalls(totalAngleDegrees) {
    if (!rotationCenter || selectedWalls.length === 0) return;

    const angleRad = (totalAngleDegrees * Math.PI) / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    selectedWalls.forEach(wall => {
        // Utiliser les positions originales sauvegardées au début de la rotation
        if (!wall.originalStart || !wall.originalEnd) {
            console.warn('⚠️ Positions originales manquantes pour le mur');
            return;
        }

        if (wall.isMerged) {
            // Pour les murs fusionnés, pivoter la position du mesh et sa rotation Y
            const posX = wall.originalStart.x - rotationCenter.x;
            const posZ = wall.originalStart.z - rotationCenter.z;
            wall.mesh.position.x = rotationCenter.x + (posX * cos - posZ * sin);
            wall.mesh.position.z = rotationCenter.z + (posX * sin + posZ * cos);
            wall.mesh.rotation.y = angleRad;
        } else {
            // Faire pivoter le point de départ depuis la position originale
            const startX = wall.originalStart.x - rotationCenter.x;
            const startZ = wall.originalStart.z - rotationCenter.z;
            wall.start.x = rotationCenter.x + (startX * cos - startZ * sin);
            wall.start.z = rotationCenter.z + (startX * sin + startZ * cos);

            // Faire pivoter le point de fin depuis la position originale
            const endX = wall.originalEnd.x - rotationCenter.x;
            const endZ = wall.originalEnd.z - rotationCenter.z;
            wall.end.x = rotationCenter.x + (endX * cos - endZ * sin);
            wall.end.z = rotationCenter.z + (endX * sin + endZ * cos);

            // Mettre à jour le mesh
            updateWallMeshPosition(wall);
        }
    });
}

// Créer ou mettre à jour l'indicateur d'angle de rotation
function updateRotationIndicator(angleDegrees) {
    if (!rotationIndicator) {
        rotationIndicator = document.createElement('div');
        rotationIndicator.style.position = 'absolute';
        rotationIndicator.style.left = '50%';
        rotationIndicator.style.top = '50%';
        rotationIndicator.style.transform = 'translate(-50%, -50%)';
        rotationIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        rotationIndicator.style.color = '#fff';
        rotationIndicator.style.padding = '12px 24px';
        rotationIndicator.style.borderRadius = '8px';
        rotationIndicator.style.fontSize = '24px';
        rotationIndicator.style.fontWeight = 'bold';
        rotationIndicator.style.fontFamily = 'monospace';
        rotationIndicator.style.zIndex = '10000';
        rotationIndicator.style.pointerEvents = 'none';
        document.body.appendChild(rotationIndicator);
    }

    rotationIndicator.textContent = `${angleDegrees}°`;
    rotationIndicator.style.display = 'block';
}

// Supprimer l'indicateur d'angle de rotation
function hideRotationIndicator() {
    if (rotationIndicator) {
        rotationIndicator.style.display = 'none';
    }
}

// Terminer la rotation
function finishRotation() {
    const rotatedCount = selectedWalls.length;
    const finalAngle = currentRotationAngle;

    isRotatingSelectedWalls = false;
    rotationCenter = null;
    rotationStartAngle = 0;
    currentRotationAngle = 0;
    controls.enabled = true;
    hideRotationIndicator();

    // Nettoyer les positions originales mais garder la sélection
    selectedWalls.forEach(wall => {
        delete wall.originalStart;
        delete wall.originalEnd;
    });

    // NE PAS désélectionner automatiquement - permet de faire des rotations/déplacements successifs
    // clearWallSelection();

    // Sauvegarder l'état pour l'historique
    saveFloorPlanState('rotate-walls', { count: rotatedCount, angle: finalAngle });

    console.log(`✅ Rotation terminée: ${finalAngle}° (${rotatedCount} mur(s))`);
}

// ==================== OUTIL MUR OBLIQUE ====================

let angleIndicator = null;

// Trouver un mur adjacent (connecté) au point donné
function findAdjacentWall(point) {
    const tolerance = 0.15;
    for (const wall of floorPlanWalls) {
        if (wall.isMerged) continue;
        if (!wall.start || !wall.end) continue;
        const distStart = Math.sqrt(
            Math.pow(point.x - wall.start.x, 2) + Math.pow(point.z - wall.start.z, 2)
        );
        const distEnd = Math.sqrt(
            Math.pow(point.x - wall.end.x, 2) + Math.pow(point.z - wall.end.z, 2)
        );
        if (distStart < tolerance || distEnd < tolerance) {
            return wall;
        }
    }
    return null;
}

// Calculer l'angle du mur oblique en cours de tracé
function computeObliqueAngle(start, end) {
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    if (length < 0.1) return { angle: 0, isRelative: false };

    // Chercher un mur adjacent au point de départ
    const adjacentWall = findAdjacentWall(start);

    if (adjacentWall) {
        // Angle relatif au mur adjacent
        const wallDx = adjacentWall.end.x - adjacentWall.start.x;
        const wallDz = adjacentWall.end.z - adjacentWall.start.z;
        const wallAngle = Math.atan2(wallDz, wallDx);
        const newAngle = Math.atan2(dz, dx);
        let relativeAngle = (newAngle - wallAngle) * 180 / Math.PI;
        // Normaliser entre 0° et 180°
        relativeAngle = ((relativeAngle % 360) + 360) % 360;
        if (relativeAngle > 180) relativeAngle = 360 - relativeAngle;
        return { angle: Math.round(relativeAngle), isRelative: true };
    } else {
        // Angle par rapport à l'axe horizontal (grille)
        let angle = Math.atan2(dz, dx) * 180 / Math.PI;
        angle = ((angle % 360) + 360) % 360;
        return { angle: Math.round(angle), isRelative: false };
    }
}

// Afficher l'indicateur d'angle oblique
function updateAngleIndicator(start, end, angleInfo) {
    if (!angleIndicator) {
        angleIndicator = document.createElement('div');
        angleIndicator.style.position = 'absolute';
        angleIndicator.style.backgroundColor = 'rgba(255, 136, 0, 0.9)';
        angleIndicator.style.color = '#fff';
        angleIndicator.style.padding = '3px 8px';
        angleIndicator.style.borderRadius = '4px';
        angleIndicator.style.fontSize = '11px';
        angleIndicator.style.fontWeight = 'bold';
        angleIndicator.style.fontFamily = 'monospace';
        angleIndicator.style.pointerEvents = 'none';
        angleIndicator.style.zIndex = '1000';
        angleIndicator.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        document.body.appendChild(angleIndicator);
    }

    // Positionner près du point de départ
    const vector = new THREE.Vector3(start.x, 1, start.z);
    vector.project(camera);
    const widthHalf = renderer.domElement.clientWidth / 2;
    const heightHalf = renderer.domElement.clientHeight / 2;
    const screenX = (vector.x * widthHalf) + widthHalf;
    const screenY = -(vector.y * heightHalf) + heightHalf;

    angleIndicator.style.left = (screenX - 30) + 'px';
    angleIndicator.style.top = (screenY + 10) + 'px';

    const prefix = angleInfo.isRelative ? '↗' : '⊾';
    angleIndicator.textContent = `${prefix} ${angleInfo.angle}°`;
    angleIndicator.style.display = 'block';
}

// Masquer l'indicateur d'angle oblique
function hideAngleIndicator() {
    if (angleIndicator) {
        angleIndicator.style.display = 'none';
    }
}

// ==================== FONCTIONS DE CRÉATION DE MURS TYPE SIMS ====================

// Démarrer le tracé de mur avec la touche B (outil Mur standard uniquement)
function startWallDrawing() {
    if (floorPlanMode !== 'draw-wall' || !isPlanViewActive) return;

    // Déterminer le point de départ
    let startPoint;

    if (lastWallEndPoint) {
        // Continuer depuis le dernier point
        startPoint = lastWallEndPoint;
        console.log(`🖊️ Continuation du tracé depuis (${startPoint.x.toFixed(1)}, ${startPoint.z.toFixed(1)})`);
    } else {
        // Utiliser editorMouse qui est déjà mis à jour par les événements
        editorRaycaster.setFromCamera(editorMouse, camera);

        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersection = new THREE.Vector3();
        editorRaycaster.ray.intersectPlane(plane, intersection);

        if (!intersection) {
            // Si pas d'intersection valide, utiliser le centre de la scène
            startPoint = { x: 0, z: 0 };
            console.log(`🖊️ Début du tracé au centre (0, 0)`);
        } else {
            const x = snapToGrid(intersection.x);
            const z = snapToGrid(intersection.z);
            startPoint = { x, z };
            console.log(`🖊️ Début du tracé en (${x.toFixed(1)}, ${z.toFixed(1)})`);
        }
    }

    isDrawingWall = true;
    drawStartPoint = startPoint;
    controls.enabled = false;

    // Créer le marqueur de point de départ
    startPointMarker = createPointMarker(startPoint.x, startPoint.z, 0x00ff00);
    scene.add(startPointMarker);
}

// Finaliser le mur et préparer le suivant
function finishWallDrawing() {
    if (!isDrawingWall || !drawStartPoint) {
        controls.enabled = true;
        return;
    }

    // Obtenir la position actuelle de la souris
    const rect = renderer.domElement.getBoundingClientRect();

    // Utiliser la dernière position de la souris
    editorRaycaster.setFromCamera(editorMouse, camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();
    editorRaycaster.ray.intersectPlane(plane, intersection);

    if (intersection) {
        let x = snapToGrid(intersection.x);
        let z = snapToGrid(intersection.z);

        // Contraindre aux axes uniquement pour l'outil Mur (pas pour Oblique)
        if (floorPlanMode === 'draw-wall') {
            const constrainedEnd = constrainToAxis(drawStartPoint, { x, z });
            x = constrainedEnd.x;
            z = constrainedEnd.z;
        }

        // Supprimer l'aperçu
        if (currentPreviewWall) {
            scene.remove(currentPreviewWall);
            currentPreviewWall = null;
        }

        // Supprimer les marqueurs
        removePointMarkers();

        // Créer un mur permanent
        createWallSegment(drawStartPoint, { x, z });

        // Sauvegarder le point de fin pour le prochain mur
        lastWallEndPoint = { x, z };

        console.log(`✅ Mur fixé. Point de fin: (${x.toFixed(1)}, ${z.toFixed(1)}). Appuyez à nouveau sur B pour continuer.`);
    } else {
        // Annuler si pas d'intersection
        if (currentPreviewWall) {
            scene.remove(currentPreviewWall);
            currentPreviewWall = null;
        }
        removePointMarkers();
        lastWallEndPoint = null;
    }

    // Masquer l'indicateur d'angle oblique
    hideAngleIndicator();

    // Réinitialiser l'état de dessin mais garder lastWallEndPoint
    isDrawingWall = false;
    controls.enabled = true;

    if (floorPlanMode === 'draw-oblique' && lastWallEndPoint) {
        // En mode oblique, le point de fin devient le nouveau point d'origine
        // pour permettre le chaînage (appuyer à nouveau sur B pour continuer)
        drawStartPoint = { x: lastWallEndPoint.x, z: lastWallEndPoint.z };
        // Recréer le marqueur vert au nouveau point d'origine
        removePointMarkers();
        startPointMarker = createPointMarker(drawStartPoint.x, drawStartPoint.z, 0x00ff00);
        scene.add(startPointMarker);
        console.log(`📐 Nouveau point d'origine oblique: (${drawStartPoint.x.toFixed(1)}, ${drawStartPoint.z.toFixed(1)}). Maintenez B pour continuer.`);
    } else {
        drawStartPoint = null;
    }
}

// ==================== HISTORIQUE UNDO/REDO POUR FLOOR PLAN ====================

// Sauvegarder l'état actuel dans l'historique
function saveFloorPlanState(actionType, data) {
    // Supprimer les états "futurs" si on est au milieu de l'historique
    if (floorPlanHistoryIndex < floorPlanHistory.length - 1) {
        floorPlanHistory = floorPlanHistory.slice(0, floorPlanHistoryIndex + 1);
    }

    // Créer une copie de l'état actuel
    const state = {
        type: actionType, // 'add-wall', 'delete-wall', 'add-room', 'delete-room', etc.
        data: data,
        walls: JSON.parse(JSON.stringify(floorPlanWalls.map(w => ({
            start: w.start,
            end: w.end,
            id: w.id || 0,
            isRoomWall: w.isRoomWall || false
        })))),
        rooms: JSON.parse(JSON.stringify(floorPlanRooms.map(r => ({
            id: r.id,
            bounds: r.bounds,
            polygon: r.polygon || null,
            rounding: r.rounding || 0,
            wallIds: r.walls.map(w => w.id)
        })))),
        lastEndPoint: lastWallEndPoint ? { ...lastWallEndPoint } : null
    };

    floorPlanHistory.push(state);

    // Limiter la taille de l'historique
    if (floorPlanHistory.length > MAX_FLOOR_PLAN_HISTORY) {
        floorPlanHistory.shift();
    } else {
        floorPlanHistoryIndex++;
    }

    console.log(`📝 État sauvegardé (${actionType}). Historique: ${floorPlanHistoryIndex + 1}/${floorPlanHistory.length}`);
}

// Annuler la dernière action
function undoFloorPlanAction() {
    if (floorPlanHistoryIndex <= 0) {
        console.log('⚠️ Rien à annuler');
        return;
    }

    floorPlanHistoryIndex--;
    const state = floorPlanHistory[floorPlanHistoryIndex];

    restoreFloorPlanState(state);
    console.log(`↶ Annuler. Historique: ${floorPlanHistoryIndex + 1}/${floorPlanHistory.length}`);
}

// Rétablir l'action annulée
function redoFloorPlanAction() {
    if (floorPlanHistoryIndex >= floorPlanHistory.length - 1) {
        console.log('⚠️ Rien à rétablir');
        return;
    }

    floorPlanHistoryIndex++;
    const state = floorPlanHistory[floorPlanHistoryIndex];

    restoreFloorPlanState(state);
    console.log(`↷ Rétablir. Historique: ${floorPlanHistoryIndex + 1}/${floorPlanHistory.length}`);
}

// Restaurer un état depuis l'historique
function restoreFloorPlanState(state) {
    // Supprimer tous les murs actuels
    floorPlanWalls.forEach(wall => {
        if (wall.mesh) {
            scene.remove(wall.mesh);
            if (wall.mesh.geometry) wall.mesh.geometry.dispose();
            disposeMaterial(wall.mesh.material);
        }
    });
    floorPlanWalls = [];

    // Supprimer toutes les pièces actuelles
    floorPlanRooms.forEach(room => {
        if (room.mesh) {
            scene.remove(room.mesh);
            if (room.mesh.geometry) room.mesh.geometry.dispose();
            if (room.mesh.material) room.mesh.material.dispose();
        }
    });
    floorPlanRooms = [];

    // Recréer les murs depuis l'état sauvegardé
    state.walls.forEach(w => {
        if (w.start && w.end) {
            let wall;
            if (w.id) {
                wall = createWallSegmentWithId(w.start, w.end, `Mur_${w.id}`, w.id);
            } else {
                wall = createWallSegment(w.start, w.end, true);
            }
            if (wall && w.isRoomWall) wall.isRoomWall = true;
        }
    });

    // Recréer les pièces depuis l'état sauvegardé (sans recréer les murs)
    if (state.rooms) {
        state.rooms.forEach(r => {
            // Retrouver les murs associés par wallIds
            const roomWalls = [];
            if (r.wallIds) {
                r.wallIds.forEach(wid => {
                    const w = floorPlanWalls.find(fw => fw.id === wid);
                    if (w) roomWalls.push(w);
                });
            }

            let roomMesh, polygon;
            if (r.polygon && r.polygon.length >= 3) {
                polygon = r.polygon;
                roomMesh = createPolygonRoomMesh(polygon);
            } else if (r.bounds) {
                const b = r.bounds;
                polygon = [
                    { x: b.minX, z: b.minZ }, { x: b.maxX, z: b.minZ },
                    { x: b.maxX, z: b.maxZ }, { x: b.minX, z: b.maxZ }
                ];
                roomMesh = createRoomMesh(b.minX, b.maxX, b.minZ, b.maxZ);
            } else {
                return; // Données invalides
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
                id: r.id || roomIdCounter++,
                walls: roomWalls,
                mesh: roomMesh,
                bounds: { minX, maxX, minZ, maxZ },
                polygon: polygon,
                rounding: r.rounding || 0,
                selected: false
            };
            floorPlanRooms.push(room);
            scene.add(roomMesh);
        });
    }

    // Mettre à jour les biseaux après restauration
    updateAllWallMiters();

    // Restaurer le dernier point de fin
    lastWallEndPoint = state.lastEndPoint ? { ...state.lastEndPoint } : null;

    console.log(`✅ État restauré: ${state.walls.length} murs, ${(state.rooms || []).length} pièces`);
}

// Surbrillance jaune du mur survolé en mode suppression (CTRL)
function highlightWallForDeletion() {
    const intersects = editorRaycaster.intersectObjects(
        floorPlanWalls.map(w => w.mesh).filter(m => m)
    );

    if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        const wall = floorPlanWalls.find(w => w.mesh === clickedMesh);

        if (wall && wall !== hoveredWallForDeletion) {
            // Retirer la surbrillance du mur précédent
            if (hoveredWallForDeletion) {
                resetWallHighlight(hoveredWallForDeletion);
            }

            // Appliquer la surbrillance jaune au nouveau mur
            hoveredWallForDeletion = wall;
            wall.mesh.material.color.setHex(0xffff00);

            // Vérifier si le matériau supporte emissive
            if (wall.mesh.material.emissive !== undefined) {
                wall.mesh.material.emissive.setHex(0xffaa00);
                wall.mesh.material.emissiveIntensity = 0.3;
            }
        }
    } else {
        // Aucun mur survolé, retirer la surbrillance
        if (hoveredWallForDeletion) {
            resetWallHighlight(hoveredWallForDeletion);
            hoveredWallForDeletion = null;
        }
    }
}

// Réinitialiser la couleur d'un mur
function resetWallHighlight(wall) {
    if (wall && wall.mesh && wall.mesh.material) {
        wall.mesh.material.color.setHex(0xcccccc);

        // Vérifier si le matériau supporte emissive
        if (wall.mesh.material.emissive !== undefined) {
            wall.mesh.material.emissive.setHex(0x000000);
            wall.mesh.material.emissiveIntensity = 0;
        }
    }
}

// Effacer les murs le long du parcours de la souris (mode Ctrl+drag)
// Cette fonction découpe uniquement la section du mur survolée
function eraseWallsAlongPath(intersection) {
    // Détecter les murs qui intersectent avec le rayon
    const intersects = editorRaycaster.intersectObjects(
        floorPlanWalls.map(w => w.mesh).filter(m => m)
    );

    if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        const wall = floorPlanWalls.find(w => w.mesh === clickedMesh);

        if (wall && !wall.eraseMarked) {
            wall.eraseMarked = true;

            // Calculer le point d'intersection sur le mur
            const intersectionPoint = intersects[0].point;
            const snapX = snapToGrid(intersectionPoint.x);
            const snapZ = snapToGrid(intersectionPoint.z);

            // Découper le mur à la position du curseur
            splitWallAtPoint(wall, { x: snapX, z: snapZ });

            console.log('✂️ Section de mur découpée au point (${snapX.toFixed(1)}, ${snapZ.toFixed(1)})');
        }
    }
}

// Découper un mur à un point donné et supprimer le segment proche
function splitWallAtPoint(wall, point) {
    const start = wall.start;
    const end = wall.end;

    // Calculer la projection du point sur la ligne du mur
    const wallVector = { x: end.x - start.x, z: end.z - start.z };
    const pointVector = { x: point.x - start.x, z: point.z - start.z };

    const wallLength = Math.sqrt(wallVector.x * wallVector.x + wallVector.z * wallVector.z);
    const dotProduct = (pointVector.x * wallVector.x + pointVector.z * wallVector.z) / (wallLength * wallLength);

    // Point projeté sur la ligne du mur
    const projectedPoint = {
        x: start.x + dotProduct * wallVector.x,
        z: start.z + dotProduct * wallVector.z
    };

    // Vérifier que le point est bien sur le segment
    if (dotProduct < 0 || dotProduct > 1) {
        // Le point n'est pas sur le segment, supprimer tout le mur
        deleteWall(wall);
        return;
    }

    // Définir la taille de la section à supprimer (environ la taille de la grille)
    const eraseRadius = gridSize * 0.5;

    // Calculer les paramètres t1 et t2 pour les points de découpe
    const t1 = Math.max(0, dotProduct - eraseRadius / wallLength);
    const t2 = Math.min(1, dotProduct + eraseRadius / wallLength);

    const cutPoint1 = {
        x: start.x + t1 * wallVector.x,
        z: start.z + t1 * wallVector.z
    };

    const cutPoint2 = {
        x: start.x + t2 * wallVector.x,
        z: start.z + t2 * wallVector.z
    };

    // Supprimer le mur original
    deleteWall(wall, true);

    // Créer les segments restants
    if (t1 > 0.01) {
        // Segment avant la découpe
        createWallSegment(start, cutPoint1, true);
    }

    if (t2 < 0.99) {
        // Segment après la découpe
        createWallSegment(cutPoint2, end, true);
    }

    // Sauvegarder dans l'historique une seule fois
    saveFloorPlanState('split-wall', { start, end, cutPoint1, cutPoint2 });
}

function createPointMarker(x, z, color = 0x00ff00) {
    const geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 8);
    const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.8,
        depthTest: false
    });
    const marker = new THREE.Mesh(geometry, material);
    marker.position.set(x, 0.1, z);
    marker.userData.isGizmo = true;
    return marker;
}

// Créer/Mettre à jour le label de longueur du mur (bulle d'info Sims-style)
function updateWallLengthLabel(worldPos, length) {
    if (!wallLengthLabel) {
        wallLengthLabel = document.createElement('div');
        wallLengthLabel.style.position = 'absolute';
        wallLengthLabel.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
        wallLengthLabel.style.color = '#333';
        wallLengthLabel.style.padding = '4px 8px';
        wallLengthLabel.style.borderRadius = '4px';
        wallLengthLabel.style.fontSize = '12px';
        wallLengthLabel.style.fontWeight = 'bold';
        wallLengthLabel.style.pointerEvents = 'none';
        wallLengthLabel.style.zIndex = '1000';
        wallLengthLabel.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        wallLengthLabel.style.border = '1px solid #ddd';
        document.body.appendChild(wallLengthLabel);
    }

    // Convertir la position 3D en position 2D à l'écran
    const vector = new THREE.Vector3(worldPos.x, 1, worldPos.z);
    vector.project(camera);

    const widthHalf = renderer.domElement.clientWidth / 2;
    const heightHalf = renderer.domElement.clientHeight / 2;

    const x = (vector.x * widthHalf) + widthHalf;
    const y = -(vector.y * heightHalf) + heightHalf;

    wallLengthLabel.style.left = (x + 10) + 'px';
    wallLengthLabel.style.top = (y - 30) + 'px';
    wallLengthLabel.textContent = `${length.toFixed(1)}m`;
    wallLengthLabel.style.display = 'block';
}

function hideWallLengthLabel() {
    if (wallLengthLabel) {
        wallLengthLabel.style.display = 'none';
    }
}

function removePointMarkers() {
    if (startPointMarker) {
        scene.remove(startPointMarker);
        startPointMarker = null;
    }
    if (endPointMarker) {
        scene.remove(endPointMarker);
        endPointMarker = null;
    }
}

function createWallPreview(start, end) {
    // Créer un aperçu semi-transparent du mur avec liseré vert fluo (style Sims 4)
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.sqrt(dx * dx + dz * dz);

    if (length < 0.1) {
        hideWallLengthLabel();
        return null;
    }

    const group = new THREE.Group();

    // Mur principal semi-transparent
    const geometry = new THREE.BoxGeometry(length, wallHeight, wallThickness);
    const material = new THREE.MeshBasicMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.6,
        depthTest: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, wallHeight / 2, 0);
    group.add(mesh);

    // Liseré vert fluo en bas (style Sims 4)
    const edgeGeometry = new THREE.BoxGeometry(length + 0.1, 0.1, wallThickness + 0.1);
    const edgeMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 1.0,
        depthTest: false
        // Note: emissive n'est pas supporté par MeshBasicMaterial
    });

    const edgeMesh = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edgeMesh.position.set(0, 0.05, 0);
    group.add(edgeMesh);

    // Positionner et orienter le groupe
    const midX = (start.x + end.x) / 2;
    const midZ = (start.z + end.z) / 2;
    group.position.set(midX, 0, midZ);

    const angle = Math.atan2(dz, dx);
    group.rotation.y = -angle;

    group.userData.isGizmo = true;

    // Afficher la bulle de longueur
    updateWallLengthLabel({ x: end.x, z: end.z }, length);

    return group;
}

function createObliqueWallPreview(start, end) {
    // Aperçu pour l'outil oblique : ligne guide fine entre start et end
    // Le mur 3D n'apparaît qu'au relâchement de B
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.sqrt(dx * dx + dz * dz);

    if (length < 0.1) {
        hideWallLengthLabel();
        return null;
    }

    const group = new THREE.Group();

    // Ligne fine entre start et end (guide de direction)
    const points = [
        new THREE.Vector3(start.x, 0.15, start.z),
        new THREE.Vector3(end.x, 0.15, end.z)
    ];
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x888888,
        depthTest: false
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    group.add(line);

    // Aperçu mince du mur au sol (contour fin pour montrer l'épaisseur)
    const outlineGeo = new THREE.BoxGeometry(length, 0.05, wallThickness);
    const outlineMat = new THREE.MeshBasicMaterial({
        color: 0xffa500,
        transparent: true,
        opacity: 0.4,
        depthTest: false
    });
    const outlineMesh = new THREE.Mesh(outlineGeo, outlineMat);
    const midX = (start.x + end.x) / 2;
    const midZ = (start.z + end.z) / 2;
    outlineMesh.position.set(midX, 0.1, midZ);
    const angle = Math.atan2(dz, dx);
    outlineMesh.rotation.y = -angle;
    group.add(outlineMesh);

    group.userData.isGizmo = true;

    // Afficher la bulle de longueur
    updateWallLengthLabel({ x: end.x, z: end.z }, length);

    return group;
}

function createRoomPreview(start, end) {
    // Créer un aperçu d'une pièce rectangulaire
    const group = new THREE.Group();

    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minZ = Math.min(start.z, end.z);
    const maxZ = Math.max(start.z, end.z);

    const width = maxX - minX;
    const depth = maxZ - minZ;

    if (width < 0.1 || depth < 0.1) return null;

    // Créer les 4 murs de la pièce
    const walls = [
        // Mur nord (top)
        { x: minX + width / 2, z: minZ, w: width, angle: 0 },
        // Mur sud (bottom)
        { x: minX + width / 2, z: maxZ, w: width, angle: 0 },
        // Mur ouest (left)
        { x: minX, z: minZ + depth / 2, w: depth, angle: Math.PI / 2 },
        // Mur est (right)
        { x: maxX, z: minZ + depth / 2, w: depth, angle: Math.PI / 2 }
    ];

    walls.forEach(wall => {
        const geometry = new THREE.BoxGeometry(wall.w, wallHeight, wallThickness);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.5,
            depthTest: false
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(wall.x, wallHeight / 2, wall.z);
        mesh.rotation.y = wall.angle;
        group.add(mesh);
    });

    group.userData.isGizmo = true;
    return group;
}

function createWallSegment(start, end, skipHistory = false) {
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.sqrt(dx * dx + dz * dz);

    if (length < 0.1) {
        console.log('⚠️ Mur trop court, ignoré');
        return;
    }

    // Le mur dépasse de wallThickness/2 de chaque côté des points start et end
    // Cela permet aux murs de se superposer aux intersections
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

    // Numérotation automatique du mur
    const wallName = `Mur_${wallIdCounter}`;
    mesh.userData.editorName = wallName;
    mesh.userData.wallId = wallIdCounter;
    wallIdCounter++;

    scene.add(mesh);

    const wall = {
        start: { x: start.x, z: start.z },
        end: { x: end.x, z: end.z },
        mesh: mesh,
        name: wallName,
        id: mesh.userData.wallId
    };

    floorPlanWalls.push(wall);

    // Sauvegarder dans l'historique sauf si c'est une restauration
    if (!skipHistory) {
        saveFloorPlanState('add-wall', { start, end });
        // Marquer comme ayant des changements non sauvegardés
        markUnsavedChanges();
    }

    // Ajouter le mur dans la liste des objets de l'éditeur
    addWallToObjectList(wall);

    // Mettre à jour les biseaux du nouveau mur et des murs connectés
    updateWallGeometry(wall);
    updateWallsAtPoint(start);
    updateWallsAtPoint(end);

    console.log(`✅ Mur créé: ${wallName} (${length.toFixed(1)}m)`);
    return wall;
}

function createRectangularRoom(start, end) {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minZ = Math.min(start.z, end.z);
    const maxZ = Math.max(start.z, end.z);

    const width = maxX - minX;
    const depth = maxZ - minZ;

    if (width < 0.5 || depth < 0.5) {
        console.log('⚠️ Pièce trop petite, ignorée');
        return;
    }

    // Sauvegarder l'index de départ dans floorPlanWalls
    const wallsStartIndex = floorPlanWalls.length;

    // Avec le nouveau système, chaque mur dépasse de wallThickness/2 de chaque côté
    // Les 4 coins de la pièce sont les points de connexion
    // Les murs se superposeront automatiquement aux coins

    // Mur Nord (haut)
    createWallSegment(
        { x: minX, z: minZ },
        { x: maxX, z: minZ },
        true
    );

    // Mur Est (droite)
    createWallSegment(
        { x: maxX, z: minZ },
        { x: maxX, z: maxZ },
        true
    );

    // Mur Sud (bas)
    createWallSegment(
        { x: maxX, z: maxZ },
        { x: minX, z: maxZ },
        true
    );

    // Mur Ouest (gauche)
    createWallSegment(
        { x: minX, z: maxZ },
        { x: minX, z: minZ },
        true
    );

    // Récupérer les 4 murs qui viennent d'être créés
    const roomWalls = floorPlanWalls.slice(wallsStartIndex);

    // Marquer ces murs comme faisant partie d'une pièce (déjà correctement positionnés)
    roomWalls.forEach(wall => {
        wall.isRoomWall = true;
    });

    // Créer un mesh combiné pour la pièce (pour la sélection)
    const roomId = roomIdCounter++;
    const roomMesh = createRoomMesh(minX, maxX, minZ, maxZ);

    // Enregistrer la pièce
    const room = {
        id: roomId,
        walls: roomWalls,
        mesh: roomMesh,
        bounds: { minX, maxX, minZ, maxZ },
        polygon: [
            { x: minX, z: minZ }, { x: maxX, z: minZ },
            { x: maxX, z: maxZ }, { x: minX, z: maxZ }
        ],
        selected: false
    };

    floorPlanRooms.push(room);
    scene.add(roomMesh);

    // PAS BESOIN de updateAllWallMiters car les murs sont déjà correctement positionnés

    // Sauvegarder dans l'historique une seule fois pour toute la pièce
    saveFloorPlanState('add-room', { minX, maxX, minZ, maxZ });

    // Marquer comme ayant des changements non sauvegardés
    markUnsavedChanges();

    console.log(`🏠 Pièce créée: ${width.toFixed(1)}m x ${depth.toFixed(1)}m (ID: ${roomId})`);
}

// Créer un mesh invisible pour la sélection de la pièce (plan au sol)
function createRoomMesh(minX, maxX, minZ, maxZ) {
    const width = maxX - minX;
    const depth = maxZ - minZ;
    const geometry = new THREE.PlaneGeometry(width, depth);
    const material = new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.05, // Légèrement visible par défaut
        side: THREE.DoubleSide,
        depthTest: true
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2; // Horizontal
    mesh.position.set((minX + maxX) / 2, 0.05, (minZ + maxZ) / 2);
    mesh.userData.type = 'floor-plan-room';
    mesh.userData.isSelectable = true;

    return mesh;
}

// ==================== INFRASTRUCTURE POLYGONE POUR PIÈCES ====================

// Convertir un polygone room [{x,z},...] en format polygon-clipping [[[x,z],...]]
function roomPolygonToClipFormat(polygon) {
    return [polygon.map(p => [p.x, p.z])];
}

// Convertir le résultat polygon-clipping en tableau de polygones [{x,z}][]
function clipResultToRoomPolygons(multiPolygon) {
    return multiPolygon.map(polygon => {
        // polygon[0] est l'anneau extérieur, polygon[1..n] sont les trous (ignorés)
        let ring = polygon[0].map(coord => ({ x: coord[0], z: coord[1] }));
        // polygon-clipping ferme les anneaux (premier = dernier point), retirer le doublon
        if (ring.length > 1) {
            const first = ring[0], last = ring[ring.length - 1];
            if (Math.abs(first.x - last.x) < 0.001 && Math.abs(first.z - last.z) < 0.001) {
                ring = ring.slice(0, -1);
            }
        }
        return ring;
    });
}

// Récupérer le polygone d'une pièce (priorité: polygon > wallPolygon > bounds AABB)
function getRoomPolygon(room) {
    if (room.polygon && room.polygon.length >= 3) {
        return room.polygon;
    }
    const wallPoly = getWallPolygon(room);
    if (wallPoly.length >= 3) return wallPoly;
    const b = room.bounds;
    return [
        { x: b.minX, z: b.minZ }, { x: b.maxX, z: b.minZ },
        { x: b.maxX, z: b.maxZ }, { x: b.minX, z: b.maxZ }
    ];
}

// Calculer l'aire d'un polygone (pour filtrer les résidus minuscules)
function polygonArea(polygon) {
    let area = 0;
    for (let i = 0; i < polygon.length; i++) {
        const j = (i + 1) % polygon.length;
        area += polygon[i].x * polygon[j].z;
        area -= polygon[j].x * polygon[i].z;
    }
    return Math.abs(area) / 2;
}

// Créer un mesh de sélection pour une pièce polygonale (THREE.Shape + ShapeGeometry)
function createPolygonRoomMesh(polygon) {
    const shape = new THREE.Shape();
    // rotation.x = -PI/2 transforme local (x, y) → world (x, 0, -y)
    // Donc on utilise shape(x, -z) pour obtenir world (x, 0, z)
    shape.moveTo(polygon[0].x, -polygon[0].z);
    for (let i = 1; i < polygon.length; i++) {
        shape.lineTo(polygon[i].x, -polygon[i].z);
    }
    shape.lineTo(polygon[0].x, -polygon[0].z);

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.05,
        side: THREE.DoubleSide,
        depthTest: true
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.05;
    mesh.userData.type = 'floor-plan-room';
    mesh.userData.isSelectable = true;

    return mesh;
}

// Créer une pièce à partir d'un polygone arbitraire
function createPolygonRoom(polygon, skipHistory = false) {
    if (!polygon || polygon.length < 3) {
        console.log('⚠️ Polygone trop petit, ignoré');
        return null;
    }

    const wallsStartIndex = floorPlanWalls.length;

    // Créer un segment de mur par arête du polygone
    for (let i = 0; i < polygon.length; i++) {
        const start = polygon[i];
        const end = polygon[(i + 1) % polygon.length];
        createWallSegment(
            { x: start.x, z: start.z },
            { x: end.x, z: end.z },
            true // skipHistory pour les murs individuels
        );
    }

    const roomWalls = floorPlanWalls.slice(wallsStartIndex);
    roomWalls.forEach(wall => { wall.isRoomWall = true; });

    // Calculer les bounds AABB depuis le polygone
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    polygon.forEach(p => {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minZ = Math.min(minZ, p.z);
        maxZ = Math.max(maxZ, p.z);
    });

    // Créer le mesh de sélection polygonal
    const roomMesh = createPolygonRoomMesh(polygon);

    const roomId = roomIdCounter++;
    const room = {
        id: roomId,
        walls: roomWalls,
        mesh: roomMesh,
        bounds: { minX, maxX, minZ, maxZ },
        polygon: polygon,
        selected: false
    };

    floorPlanRooms.push(room);
    scene.add(roomMesh);

    if (!skipHistory) {
        saveFloorPlanState('add-polygon-room', { polygon });
        markUnsavedChanges();
    }

    console.log(`🏠 Pièce polygonale créée: ${polygon.length} sommets (ID: ${roomId})`);
    return room;
}

// Générer un polygone rectangle à coins arrondis
function generateRoundedRectPolygon(minX, maxX, minZ, maxZ, rounding) {
    const width = maxX - minX;
    const height = maxZ - minZ;

    if (rounding <= 0) {
        return [
            { x: minX, z: minZ }, { x: maxX, z: minZ },
            { x: maxX, z: maxZ }, { x: minX, z: maxZ }
        ];
    }

    // Rayon max = moitié de la plus petite dimension
    const maxRadius = Math.min(width / 2, height / 2);
    const radius = maxRadius * (rounding / 100);
    const SEGMENTS_PER_CORNER = 12;
    const points = [];

    // 4 coins : haut-droite, bas-droite, bas-gauche, haut-gauche
    const corners = [
        { cx: maxX - radius, cz: minZ + radius, startAngle: -Math.PI / 2, endAngle: 0 },
        { cx: maxX - radius, cz: maxZ - radius, startAngle: 0, endAngle: Math.PI / 2 },
        { cx: minX + radius, cz: maxZ - radius, startAngle: Math.PI / 2, endAngle: Math.PI },
        { cx: minX + radius, cz: minZ + radius, startAngle: Math.PI, endAngle: 3 * Math.PI / 2 }
    ];

    for (const corner of corners) {
        for (let i = 0; i <= SEGMENTS_PER_CORNER; i++) {
            const t = i / SEGMENTS_PER_CORNER;
            const angle = corner.startAngle + t * (corner.endAngle - corner.startAngle);
            points.push({
                x: corner.cx + radius * Math.cos(angle),
                z: corner.cz + radius * Math.sin(angle)
            });
        }
    }

    // Dédupliquer les points proches (jonctions d'arcs)
    const deduped = [points[0]];
    for (let i = 1; i < points.length; i++) {
        const prev = deduped[deduped.length - 1];
        const curr = points[i];
        if (Math.abs(prev.x - curr.x) > 0.001 || Math.abs(prev.z - curr.z) > 0.001) {
            deduped.push(curr);
        }
    }

    return deduped;
}

// Créer une pièce à coins arrondis / ovale
function createRoundedRoom(start, end, rounding) {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minZ = Math.min(start.z, end.z);
    const maxZ = Math.max(start.z, end.z);

    const width = maxX - minX;
    const depth = maxZ - minZ;

    if (width < 0.5 || depth < 0.5) {
        console.log('⚠️ Pièce trop petite, ignorée');
        return;
    }

    if (rounding <= 0) {
        createRectangularRoom(start, end);
        return;
    }

    const polygon = generateRoundedRectPolygon(minX, maxX, minZ, maxZ, rounding);
    const room = createPolygonRoom(polygon);
    if (room) {
        room.rounding = rounding;
    }
}

// Prévisualisation d'une pièce à coins arrondis pendant le tracé
function createRoundedRoomPreview(start, end, rounding) {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minZ = Math.min(start.z, end.z);
    const maxZ = Math.max(start.z, end.z);

    const width = maxX - minX;
    const depth = maxZ - minZ;

    if (width < 0.1 || depth < 0.1) return null;

    const polygon = generateRoundedRectPolygon(minX, maxX, minZ, maxZ, rounding);
    const group = new THREE.Group();

    for (let i = 0; i < polygon.length; i++) {
        const p1 = polygon[i];
        const p2 = polygon[(i + 1) % polygon.length];

        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.01) continue;

        const geometry = new THREE.BoxGeometry(length, wallHeight, wallThickness);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.5,
            depthTest: false
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
            (p1.x + p2.x) / 2,
            wallHeight / 2,
            (p1.z + p2.z) / 2
        );
        mesh.rotation.y = -Math.atan2(dz, dx);
        group.add(mesh);
    }

    group.userData.isGizmo = true;
    return group;
}

// Sélectionner/désélectionner une pièce
function toggleRoomSelection(room, multiSelect = false) {
    if (!multiSelect) {
        // Mode sélection simple: désélectionner toutes les autres pièces
        selectedRooms.forEach(r => {
            r.selected = false;
            r.mesh.material.opacity = 0.0;
        });
        selectedRooms = [];
    }

    // Inverser la sélection de cette pièce
    room.selected = !room.selected;

    if (room.selected) {
        room.mesh.material.opacity = 0.3; // Semi-transparent vert
        room.mesh.material.color.setHex(0x00ff00);
        if (!selectedRooms.includes(room)) {
            selectedRooms.push(room);
        }
    } else {
        room.mesh.material.opacity = 0.05; // Retour à l'opacité par défaut
        room.mesh.material.color.setHex(0x4488ff);
        const index = selectedRooms.indexOf(room);
        if (index > -1) {
            selectedRooms.splice(index, 1);
        }
    }

    updateBooleanOperationButtons();
    console.log(`🎯 Pièce ${room.id}: ${room.selected ? 'Sélectionnée' : 'Désélectionnée'} (Total: ${selectedRooms.length})`);
}

// Mettre à jour l'état des boutons d'opération booléenne
function updateBooleanOperationButtons() {
    const btnUnion = document.getElementById('bool-union');
    const btnSubtract = document.getElementById('bool-subtract');
    const btnIntersect = document.getElementById('bool-intersect');
    const btnExclude = document.getElementById('bool-exclude');

    const count = selectedRooms.length;

    // Union: nécessite au moins 2 pièces
    btnUnion.disabled = count < 2;

    // Soustraction: nécessite exactement 2 pièces
    btnSubtract.disabled = count !== 2;

    // Intersection: nécessite exactement 2 pièces
    btnIntersect.disabled = count !== 2;

    // Exclusion: nécessite exactement 2 pièces
    btnExclude.disabled = count !== 2;
}

// Opérations booléennes sur les pièces

// Union: fusionner toutes les pièces sélectionnées
function performUnion() {
    if (selectedRooms.length < 2) {
        console.log('⚠️ Union nécessite au moins 2 pièces sélectionnées');
        return;
    }

    try {
        // Récupérer les polygones de toutes les pièces sélectionnées
        const clipPolygons = selectedRooms.map(room => roomPolygonToClipFormat(getRoomPolygon(room)));

        // Union progressive de tous les polygones
        let result = clipPolygons[0];
        for (let i = 1; i < clipPolygons.length; i++) {
            result = polygonClipping.union(result, clipPolygons[i]);
        }

        // Convertir le résultat en polygones room
        const resultPolygons = clipResultToRoomPolygons(result);

        // Supprimer les pièces sélectionnées
        saveFloorPlanState('boolean-union', { roomIds: selectedRooms.map(r => r.id) });
        selectedRooms.forEach(room => deleteRoom(room, true));
        selectedRooms = [];

        // Créer les nouvelles pièces polygonales
        resultPolygons.forEach(poly => {
            if (polygonArea(poly) > 0.01) {
                createPolygonRoom(poly, true);
            }
        });

        markUnsavedChanges();
        updateBooleanOperationButtons();
        console.log('✅ Union polygonale effectuée');
    } catch (e) {
        console.error('❌ Erreur Union:', e);
    }
}

// Soustraction: retirer la 2e pièce de la 1ère
function performSubtract() {
    if (selectedRooms.length !== 2) {
        console.log('⚠️ Soustraction nécessite exactement 2 pièces sélectionnées');
        return;
    }

    try {
        const poly1 = roomPolygonToClipFormat(getRoomPolygon(selectedRooms[0]));
        const poly2 = roomPolygonToClipFormat(getRoomPolygon(selectedRooms[1]));

        const result = polygonClipping.difference(poly1, poly2);

        if (result.length === 0) {
            console.log('⚠️ La soustraction donne un résultat vide');
            return;
        }

        const resultPolygons = clipResultToRoomPolygons(result);

        saveFloorPlanState('boolean-subtract', { roomIds: selectedRooms.map(r => r.id) });
        selectedRooms.forEach(room => deleteRoom(room, true));
        selectedRooms = [];

        resultPolygons.forEach(poly => {
            if (polygonArea(poly) > 0.01) {
                createPolygonRoom(poly, true);
            }
        });

        markUnsavedChanges();
        updateBooleanOperationButtons();
        console.log('✅ Soustraction polygonale effectuée');
    } catch (e) {
        console.error('❌ Erreur Soustraction:', e);
    }
}

// Intersection: garder seulement la zone commune
function performIntersect() {
    if (selectedRooms.length !== 2) {
        console.log('⚠️ Intersection nécessite exactement 2 pièces sélectionnées');
        return;
    }

    try {
        const poly1 = roomPolygonToClipFormat(getRoomPolygon(selectedRooms[0]));
        const poly2 = roomPolygonToClipFormat(getRoomPolygon(selectedRooms[1]));

        const result = polygonClipping.intersection(poly1, poly2);

        if (result.length === 0) {
            console.log('⚠️ Les pièces ne se chevauchent pas');
            return;
        }

        const resultPolygons = clipResultToRoomPolygons(result);

        saveFloorPlanState('boolean-intersect', { roomIds: selectedRooms.map(r => r.id) });
        selectedRooms.forEach(room => deleteRoom(room, true));
        selectedRooms = [];

        resultPolygons.forEach(poly => {
            if (polygonArea(poly) > 0.01) {
                createPolygonRoom(poly, true);
            }
        });

        markUnsavedChanges();
        updateBooleanOperationButtons();
        console.log('✅ Intersection polygonale effectuée');
    } catch (e) {
        console.error('❌ Erreur Intersection:', e);
    }
}

// Exclusion: garder les zones non-communes (XOR)
function performExclude() {
    if (selectedRooms.length !== 2) {
        console.log('⚠️ Exclusion nécessite exactement 2 pièces sélectionnées');
        return;
    }

    try {
        const poly1 = roomPolygonToClipFormat(getRoomPolygon(selectedRooms[0]));
        const poly2 = roomPolygonToClipFormat(getRoomPolygon(selectedRooms[1]));

        const result = polygonClipping.xor(poly1, poly2);

        if (result.length === 0) {
            console.log('⚠️ Les pièces sont identiques, exclusion donne un résultat vide');
            return;
        }

        const resultPolygons = clipResultToRoomPolygons(result);

        saveFloorPlanState('boolean-exclude', { roomIds: selectedRooms.map(r => r.id) });
        selectedRooms.forEach(room => deleteRoom(room, true));
        selectedRooms = [];

        resultPolygons.forEach(poly => {
            if (polygonArea(poly) > 0.01) {
                createPolygonRoom(poly, true);
            }
        });

        markUnsavedChanges();
        updateBooleanOperationButtons();
        console.log('✅ Exclusion polygonale effectuée (XOR)');
    } catch (e) {
        console.error('❌ Erreur Exclusion:', e);
    }
}

// Fonctions utilitaires pour les opérations booléennes

function rectanglesOverlap(rect1, rect2) {
    return !(rect1.maxX <= rect2.minX || rect2.maxX <= rect1.minX ||
             rect1.maxZ <= rect2.minZ || rect2.maxZ <= rect1.minZ);
}

function subtractRectangles(rect1, rect2) {
    // Retourne un tableau de rectangles représentant rect1 - rect2
    const result = [];

    // Si pas de chevauchement, retourner rect1 intact
    if (!rectanglesOverlap(rect1, rect2)) {
        return [rect1];
    }

    // Calculer l'intersection
    const intMinX = Math.max(rect1.minX, rect2.minX);
    const intMaxX = Math.min(rect1.maxX, rect2.maxX);
    const intMinZ = Math.max(rect1.minZ, rect2.minZ);
    const intMaxZ = Math.min(rect1.maxZ, rect2.maxZ);

    // Rectangle du haut (si existe)
    if (rect1.minZ < intMinZ) {
        result.push({
            minX: rect1.minX,
            maxX: rect1.maxX,
            minZ: rect1.minZ,
            maxZ: intMinZ
        });
    }

    // Rectangle du bas (si existe)
    if (rect1.maxZ > intMaxZ) {
        result.push({
            minX: rect1.minX,
            maxX: rect1.maxX,
            minZ: intMaxZ,
            maxZ: rect1.maxZ
        });
    }

    // Rectangle de gauche (si existe)
    if (rect1.minX < intMinX) {
        result.push({
            minX: rect1.minX,
            maxX: intMinX,
            minZ: intMinZ,
            maxZ: intMaxZ
        });
    }

    // Rectangle de droite (si existe)
    if (rect1.maxX > intMaxX) {
        result.push({
            minX: intMaxX,
            maxX: rect1.maxX,
            minZ: intMinZ,
            maxZ: intMaxZ
        });
    }

    return result;
}

function deleteRoom(room, skipHistory = false) {
    // Sauvegarder dans l'historique avant suppression
    if (!skipHistory) {
        saveFloorPlanState('delete-room', {
            id: room.id,
            bounds: room.bounds
        });
    }

    // Supprimer tous les murs de la pièce
    room.walls.forEach(wall => {
        const index = floorPlanWalls.indexOf(wall);
        if (index > -1) {
            removeWallFromObjectList(wall);
            scene.remove(wall.mesh);
            if (wall.mesh.geometry) wall.mesh.geometry.dispose();
            disposeMaterial(wall.mesh.material);
            floorPlanWalls.splice(index, 1);
        }
    });

    // Supprimer le mesh de la pièce
    scene.remove(room.mesh);
    if (room.mesh.geometry) room.mesh.geometry.dispose();
    if (room.mesh.material) room.mesh.material.dispose();

    // Retirer de la liste des pièces
    const index = floorPlanRooms.indexOf(room);
    if (index > -1) {
        floorPlanRooms.splice(index, 1);
    }

    // Marquer comme ayant des changements non sauvegardés
    if (!skipHistory) {
        markUnsavedChanges();
    }

    console.log(`🗑️ Pièce ${room.id} supprimée`);
}

function deleteWall(wall, skipHistory = false) {
    const index = floorPlanWalls.indexOf(wall);
    if (index > -1) {
        // Cas spécial : mur fusionné (pas de room, pas de start/end)
        if (wall.isMerged) {
            if (!skipHistory) {
                saveFloorPlanState('delete-merged-wall', { name: wall.name });
                markUnsavedChanges();
            }
            removeWallFromObjectList(wall);
            scene.remove(wall.mesh);
            if (wall.mesh.geometry) wall.mesh.geometry.dispose();
            if (Array.isArray(wall.mesh.material)) {
                wall.mesh.material.forEach(m => m.dispose());
            } else if (wall.mesh.material) {
                wall.mesh.material.dispose();
            }
            floorPlanWalls.splice(index, 1);
            console.log('🗑️ Mur fusionné supprimé');
            return;
        }

        // Trouver si ce mur appartient à une pièce
        const room = floorPlanRooms.find(r => r.walls.includes(wall));
        if (room) {
            // Supprimer toute la pièce si un de ses murs est supprimé
            deleteRoom(room, skipHistory);
        } else {
            // Sauvegarder dans l'historique avant suppression
            if (!skipHistory) {
                saveFloorPlanState('delete-wall', {
                    start: wall.start,
                    end: wall.end
                });
                // Marquer comme ayant des changements non sauvegardés
                markUnsavedChanges();
            }

            // Retirer le mur de la liste des objets de l'éditeur
            removeWallFromObjectList(wall);

            // Supprimer juste le mur individuel
            scene.remove(wall.mesh);
            if (wall.mesh.geometry) wall.mesh.geometry.dispose();
            disposeMaterial(wall.mesh.material);
            floorPlanWalls.splice(index, 1);
            console.log('🗑️ Mur supprimé');
        }
    }
}

function generateWallsFromPlan() {
    if (floorPlanPoints.length < 2) {
        alert('⚠️ Il faut au moins 2 points pour créer des murs.');
        return;
    }

    // Supprimer les anciens murs générés
    clearGeneratedWalls();

    // Créer le matériau pour les murs
    const material = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        side: THREE.DoubleSide,
        roughness: 0.4,
        metalness: 0
    });

    // Créer un mur individuel entre chaque paire de points consécutifs
    for (let i = 0; i < floorPlanPoints.length - 1; i++) {
        const wall = createWallBetweenPoints(
            floorPlanPoints[i],
            floorPlanPoints[i + 1],
            wallHeight,
            wallThickness,
            material
        );
        if (wall) {
            scene.add(wall);
            generatedWalls.push(wall);
        }
    }

    // Si on a au moins 3 points, créer aussi le sol
    if (floorPlanPoints.length >= 3) {
        const floor = createFloorFromPoints(floorPlanPoints, material);
        if (floor) {
            scene.add(floor);
            generatedWalls.push(floor);
        }
    }

    console.log(`🏗️ ${generatedWalls.length - 1} murs générés avec succès! Hauteur: ${wallHeight}m, Épaisseur: ${wallThickness}m`);

    // Retourner à la vue 3D pour voir le résultat
    setPlanView3D();
}

function createWallBetweenPoints(point1, point2, height, thickness, material) {
    // Calculer la distance entre les deux points
    const dx = point2.x - point1.x;
    const dz = point2.z - point1.z;
    const length = Math.sqrt(dx * dx + dz * dz);

    if (length < 0.01) return null; // Ignorer les murs trop courts

    // Créer la géométrie du mur
    const wallGeometry = new THREE.BoxGeometry(length, height, thickness);

    // Créer le mesh
    const wallMesh = new THREE.Mesh(wallGeometry, material.clone());

    // Positionner le mur au milieu entre les deux points
    const midX = (point1.x + point2.x) / 2;
    const midZ = (point1.z + point2.z) / 2;
    wallMesh.position.set(midX, height / 2, midZ);

    // Calculer l'angle de rotation pour orienter le mur
    const angle = Math.atan2(dz, dx);
    wallMesh.rotation.y = -angle;

    // Configuration des ombres
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;

    // Métadonnées
    wallMesh.userData.type = 'generated-wall';
    wallMesh.userData.isEnvironment = true;
    wallMesh.userData.wallSegment = true;

    return wallMesh;
}

function createFloorFromPoints(points, material) {
    // Créer une forme 2D pour le sol
    const shape = new THREE.Shape();

    shape.moveTo(points[0].x, points[0].z);
    for (let i = 1; i < points.length; i++) {
        shape.lineTo(points[i].x, points[i].z);
    }
    shape.lineTo(points[0].x, points[0].z); // Fermer la forme

    // Créer la géométrie du sol (très fin)
    const floorGeometry = new THREE.ShapeGeometry(shape);

    // Créer le mesh
    const floorMaterial = material.clone();
    floorMaterial.color.setHex(0x888888);
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);

    // Positionner légèrement au-dessus du sol pour éviter le z-fighting
    floorMesh.position.y = 0.01;
    floorMesh.rotation.x = -Math.PI / 2;

    // Configuration des ombres
    floorMesh.receiveShadow = true;

    // Métadonnées
    floorMesh.userData.type = 'generated-floor';
    floorMesh.userData.isEnvironment = true;

    return floorMesh;
}

function clearGeneratedWalls() {
    generatedWalls.forEach(wall => {
        scene.remove(wall);
        if (wall.geometry) wall.geometry.dispose();
        if (wall.material) wall.material.dispose();
    });
    generatedWalls = [];
    console.log('🗑️ Murs générés supprimés');
}

function updateGridSize(newSize) {
    gridSize = parseFloat(newSize);
    if (isPlanViewActive) {
        createFloorPlanGrid();
    }
}

function saveFloorPlan() {
    const planData = {
        timestamp: Date.now(),
        walls: floorPlanWalls.map(w => {
            if (w.isMerged) {
                // Sauvegarder la géométrie sérialisée pour les murs fusionnés
                const mergedData = {
                    isMerged: true,
                    name: w.name || `Mur fusionné n°${w.id || 0}`,
                    id: w.id || 0,
                    geometryJSON: w.mesh.geometry.toJSON(),
                    sourceWallCount: w.mesh.userData.sourceWallCount || 0
                };
                // Sauvegarder le polygone intérieur s'il existe
                const poly = w.roomPolygon || (w.mesh.userData && w.mesh.userData.roomPolygon);
                if (poly && poly.length >= 3) {
                    mergedData.roomPolygon = poly.map(p => ({ x: p.x, z: p.z }));
                }
                return mergedData;
            }
            return {
                start: { x: w.start.x, z: w.start.z },
                end: { x: w.end.x, z: w.end.z },
                name: w.name || `Mur_${w.id || 0}`,
                id: w.id || 0
            };
        }),
        rooms: floorPlanRooms.map(r => ({
            id: r.id,
            bounds: r.bounds,
            polygon: r.polygon || null,
            rounding: r.rounding || 0,
            wallIds: r.walls.map(w => w.id)
        })),
        wallHeight: wallHeight,
        wallThickness: wallThickness,
        gridSize: gridSize,
        wallIdCounter: wallIdCounter,
        roomIdCounter: roomIdCounter,
        // Transform de Naby
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
        // Intensité de la lumière ambiante
        ambientLightIntensity: window.defaultAmbientLight ? window.defaultAmbientLight.intensity : 0.7,
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
        // Audio tracks (metadata only, blob data in IndexedDB)
        audioTracks: (() => {
            const allTracks = [];
            for (const cat of AUDIO_CATEGORIES) {
                for (const track of audioTracks[cat]) {
                    allTracks.push({
                        id: track.id, name: track.name, category: track.category,
                        blobId: track.blobId, volume: track.volume, muted: track.muted,
                        loop: track.loop, triggerAction: track.triggerAction,
                        triggerObjectName: track.triggerObjectName,
                        movementAction: track.movementAction || '',
                        movementPlayMode: track.movementPlayMode || ''
                    });
                }
            }
            return allTracks;
        })(),
        audioTrackIdCounter: audioTrackIdCounter
    };

    localStorage.setItem('floorPlan_' + currentRoomName, JSON.stringify(planData));
    console.log(`💾 Plan sauvegardé (${floorPlanWalls.length} murs, ${floorPlanRooms.length} pièces)`);
}

async function loadFloorPlan() {
    const savedPlan = localStorage.getItem('floorPlan_' + currentRoomName);
    if (!savedPlan) {
        alert('⚠️ Aucun plan sauvegardé pour cette pièce.');
        return;
    }

    // Nettoyer le plan actuel
    clearAllWalls();

    const planData = JSON.parse(savedPlan);

    // Restaurer les paramètres
    wallHeight = planData.wallHeight || 2.5;
    wallThickness = planData.wallThickness || 0.2;
    gridSize = planData.gridSize || 1;

    document.getElementById('wall-height').value = wallHeight;
    document.getElementById('wall-height-value').textContent = Math.round(wallHeight * 100);
    document.getElementById('wall-thickness').value = wallThickness;
    document.getElementById('wall-thickness-value').textContent = Math.round(wallThickness * 100);
    document.getElementById('grid-size').value = gridSize;
    document.getElementById('grid-size-value').textContent = Math.round(gridSize * 100);
    document.getElementById('grid-size-value-2').textContent = Math.round(gridSize * 100);

    // Restaurer les murs
    if (planData.walls) {
        planData.walls.forEach(w => {
            if (w.isMerged) {
                // Recréer un mur fusionné depuis la géométrie sauvegardée
                const loader = new THREE.BufferGeometryLoader();
                const geo = loader.parse(w.geometryJSON);

                // Créer autant de matériaux que nécessaire (un par face physique)
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
                        color: 0xcccccc,
                        side: THREE.DoubleSide,
                        roughness: 0.4,
                        metalness: 0,
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

                floorPlanWalls.push({
                    start: null,
                    end: null,
                    mesh: mesh,
                    name: w.name,
                    id: w.id,
                    isMerged: true
                });
            } else {
                createWallSegment(w.start, w.end);
            }
        });
    }

    // Restaurer le compteur d'ID
    if (planData.wallIdCounter) {
        wallIdCounter = planData.wallIdCounter;
    }
    if (planData.roomIdCounter) {
        roomIdCounter = planData.roomIdCounter;
    }

    // Restaurer les pièces (rooms)
    if (planData.rooms && planData.rooms.length > 0) {
        for (const roomData of planData.rooms) {
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
    }

    // Vitesses de déplacement — valeurs fixes (ne plus charger depuis sauvegarde)

    // Charger les zones d'interaction
    if (planData.interactionZones && planData.interactionZones.length > 0) {
        clearAllInteractionZones();
        loadInteractionZonesFromData(planData.interactionZones);
        interactionZoneIdCounter = planData.interactionZoneIdCounter || interactionZones.length;
    }

    // Charger les pistes audio
    if (planData.audioTracks && planData.audioTracks.length > 0) {
        await restoreAudioTracks(planData.audioTracks);
        audioTrackIdCounter = planData.audioTrackIdCounter || audioTrackIdCounter;
    }

    updateObjectsList();
    console.log(`📂 Plan chargé (${floorPlanWalls.length} murs, ${floorPlanRooms.length} pièces)`);
}

// ==================== IMPORT SVG ====================

let currentSVGData = null; // Données SVG chargées

function handleSVGFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.svg')) {
        alert('⚠️ Veuillez sélectionner un fichier SVG');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const svgContent = e.target.result;
        parseSVGContent(svgContent);
    };
    reader.readAsText(file);
}

function parseSVGContent(svgContent) {
    try {
        // Parser le SVG
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
        const svgElement = svgDoc.querySelector('svg');

        if (!svgElement) {
            alert('⚠️ Fichier SVG invalide');
            return;
        }

        // Extraire les paths du SVG
        const paths = svgElement.querySelectorAll('path, polyline, polygon, rect, line');

        if (paths.length === 0) {
            alert('⚠️ Aucun tracé trouvé dans le SVG');
            return;
        }

        // Stocker les données SVG
        currentSVGData = {
            svgElement: svgElement,
            paths: Array.from(paths)
        };

        // Afficher l'aperçu
        const previewContainer = document.getElementById('svg-preview-container');
        const preview = document.getElementById('svg-preview');

        preview.innerHTML = '';
        const clonedSVG = svgElement.cloneNode(true);
        clonedSVG.style.width = '100%';
        clonedSVG.style.height = 'auto';
        clonedSVG.style.maxHeight = '200px';
        preview.appendChild(clonedSVG);

        previewContainer.style.display = 'block';

        console.log(`📄 SVG chargé: ${paths.length} tracé(s) trouvé(s)`);
    } catch (error) {
        console.error('Erreur lors du parsing SVG:', error);
        alert('⚠️ Erreur lors de la lecture du fichier SVG');
    }
}

function updateSVGPreview() {
    // Cette fonction pourrait être utilisée pour mettre à jour l'aperçu avec l'échelle
    console.log('Échelle SVG mise à jour');
}

function generateWallsFromSVG() {
    if (!currentSVGData) {
        alert('⚠️ Veuillez d\'abord importer un fichier SVG');
        return;
    }

    // Effacer les points existants
    clearFloorPlan();

    // Récupérer les paramètres
    const scale = parseFloat(document.getElementById('svg-scale').value);
    const svgWallHeight = parseFloat(document.getElementById('svg-wall-height').value);

    // Convertir les paths SVG en points
    const points = extractPointsFromSVG(currentSVGData, scale);

    if (points.length < 3) {
        alert('⚠️ Impossible d\'extraire suffisamment de points du SVG');
        return;
    }

    // Créer les points du plan
    points.forEach(point => {
        addFloorPlanPoint(point.x, point.z);
    });

    // Mettre à jour la hauteur des murs
    wallHeight = svgWallHeight;
    document.getElementById('wall-height').value = wallHeight;
    document.getElementById('wall-height-value').textContent = Math.round(wallHeight * 100);

    // Générer les murs
    generateWallsFromPlan();

    console.log(`✅ Plan SVG converti en 3D: ${points.length} points`);
}

function extractPointsFromSVG(svgData, scale) {
    const points = [];
    const viewBox = svgData.svgElement.getAttribute('viewBox');
    let offsetX = 0, offsetY = 0;

    if (viewBox) {
        const [x, y, width, height] = viewBox.split(' ').map(Number);
        offsetX = -x - width / 2;
        offsetY = -y - height / 2;
    }

    svgData.paths.forEach(path => {
        const tagName = path.tagName.toLowerCase();

        if (tagName === 'path') {
            const d = path.getAttribute('d');
            const pathPoints = parseSVGPath(d);
            pathPoints.forEach(p => {
                points.push({
                    x: (p.x + offsetX) * scale,
                    z: (p.y + offsetY) * scale
                });
            });
        } else if (tagName === 'rect') {
            const x = parseFloat(path.getAttribute('x') || 0);
            const y = parseFloat(path.getAttribute('y') || 0);
            const width = parseFloat(path.getAttribute('width') || 0);
            const height = parseFloat(path.getAttribute('height') || 0);

            points.push(
                { x: (x + offsetX) * scale, z: (y + offsetY) * scale },
                { x: (x + width + offsetX) * scale, z: (y + offsetY) * scale },
                { x: (x + width + offsetX) * scale, z: (y + height + offsetY) * scale },
                { x: (x + offsetX) * scale, z: (y + height + offsetY) * scale }
            );
        } else if (tagName === 'polygon' || tagName === 'polyline') {
            const pointsAttr = path.getAttribute('points');
            const coords = pointsAttr.trim().split(/[\s,]+/);

            for (let i = 0; i < coords.length; i += 2) {
                points.push({
                    x: (parseFloat(coords[i]) + offsetX) * scale,
                    z: (parseFloat(coords[i + 1]) + offsetY) * scale
                });
            }
        } else if (tagName === 'line') {
            const x1 = parseFloat(path.getAttribute('x1') || 0);
            const y1 = parseFloat(path.getAttribute('y1') || 0);
            const x2 = parseFloat(path.getAttribute('x2') || 0);
            const y2 = parseFloat(path.getAttribute('y2') || 0);

            points.push(
                { x: (x1 + offsetX) * scale, z: (y1 + offsetY) * scale },
                { x: (x2 + offsetX) * scale, z: (y2 + offsetY) * scale }
            );
        }
    });

    return points;
}

function parseSVGPath(d) {
    const points = [];
    const commands = d.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g);

    let currentX = 0, currentY = 0;

    commands.forEach(cmd => {
        const type = cmd[0];
        const coords = cmd.slice(1).trim().split(/[\s,]+/).map(Number);

        switch (type) {
            case 'M': // Move to (absolute)
                currentX = coords[0];
                currentY = coords[1];
                points.push({ x: currentX, y: currentY });
                break;
            case 'm': // Move to (relative)
                currentX += coords[0];
                currentY += coords[1];
                points.push({ x: currentX, y: currentY });
                break;
            case 'L': // Line to (absolute)
                for (let i = 0; i < coords.length; i += 2) {
                    currentX = coords[i];
                    currentY = coords[i + 1];
                    points.push({ x: currentX, y: currentY });
                }
                break;
            case 'l': // Line to (relative)
                for (let i = 0; i < coords.length; i += 2) {
                    currentX += coords[i];
                    currentY += coords[i + 1];
                    points.push({ x: currentX, y: currentY });
                }
                break;
            case 'H': // Horizontal line (absolute)
                currentX = coords[0];
                points.push({ x: currentX, y: currentY });
                break;
            case 'h': // Horizontal line (relative)
                currentX += coords[0];
                points.push({ x: currentX, y: currentY });
                break;
            case 'V': // Vertical line (absolute)
                currentY = coords[0];
                points.push({ x: currentX, y: currentY });
                break;
            case 'v': // Vertical line (relative)
                currentY += coords[0];
                points.push({ x: currentX, y: currentY });
                break;
            // Pour les courbes, on pourrait les approximer avec des segments
            case 'Z':
            case 'z':
                // Close path - ne rien faire, la boucle sera fermée automatiquement
                break;
        }
    });

    return points;
}

