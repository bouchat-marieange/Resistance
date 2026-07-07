/**
 * ============================================================
 * RESISTANCE — editor/floorplan/floorplan-rooms.js
 * Infrastructure polygone pour pièces : union/soustraction booléenne,
 * pièces à forme libre
 * ------------------------------------------------------------
 * Découpage mécanique de l'ancien editor-floorplan.js (E0-bis,
 * 07/2026), même méthode que game/engine/ (Phase 4) : frontières
 * de sections existantes, globales/fonctions inchangées.
 * ============================================================
 */

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
            scale: { x: babyModel.scale.x, y: babyModel.scale.y, z: babyModel.scale.z },
            customRoughness: babyModel.userData.customRoughness,
            customBrightness: babyModel.userData.customBrightness,
            customExposure: babyModel.userData.customExposure,
            customContrast: babyModel.userData.customContrast,
            customOffset: babyModel.userData.customOffset,
            customGamma: babyModel.userData.customGamma
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
            if (zone.characterHeight !== undefined) zd.characterHeight = zone.characterHeight;
            if (zone.characterBaseY !== undefined) zd.characterBaseY = zone.characterBaseY;
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

