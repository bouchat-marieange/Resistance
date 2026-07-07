/**
 * ============================================================
 * RESISTANCE — editor/floorplan/floorplan-walls-mitered.js
 * Système de murs en onglet (mitered walls) : calcul d'angles,
 * biseaux, géométrie des jonctions
 * ------------------------------------------------------------
 * Découpage mécanique de l'ancien editor-floorplan.js (E0-bis,
 * 07/2026), même méthode que game/engine/ (Phase 4) : frontières
 * de sections existantes, globales/fonctions inchangées.
 * ============================================================
 */

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

