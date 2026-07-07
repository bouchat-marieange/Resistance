/**
 * ============================================================
 * RESISTANCE — editor/floorplan/floorplan-core.js
 * Vue plan (dessus/3D), grille, snapping, outils de base du plan 2D
 * (dessin de mur en mode 'draw-wall', bascule d'outils)
 * ------------------------------------------------------------
 * Découpage mécanique de l'ancien editor-floorplan.js (E0-bis,
 * 07/2026), même méthode que game/engine/ (Phase 4) : frontières
 * de sections existantes, globales/fonctions inchangées.
 * ============================================================
 */

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

