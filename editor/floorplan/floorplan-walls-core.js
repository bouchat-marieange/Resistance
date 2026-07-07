/**
 * ============================================================
 * RESISTANCE — editor/floorplan/floorplan-walls-core.js
 * Primitives de création murs/pièces (createWallSegment, createRoomMesh),
 * aperçus de tracé, surbrillance/suppression, découpe de mur
 * ------------------------------------------------------------
 * Découpage mécanique de l'ancien editor-floorplan.js (E0-bis,
 * 07/2026), même méthode que game/engine/ (Phase 4) : frontières
 * de sections existantes, globales/fonctions inchangées.
 * ============================================================
 */

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

