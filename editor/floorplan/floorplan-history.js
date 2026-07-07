/**
 * ============================================================
 * RESISTANCE — editor/floorplan/floorplan-history.js
 * Historique undo/redo unifié du plan 2D (pont vers globalHistory,
 * voir editor-objects.js) — captureFloorPlanSnapshot, saveFloorPlanState,
 * restoreFloorPlanState (E0, 07/2026)
 * ------------------------------------------------------------
 * Découpage mécanique de l'ancien editor-floorplan.js (E0-bis,
 * 07/2026), même méthode que game/engine/ (Phase 4) : frontières
 * de sections existantes, globales/fonctions inchangées.
 * ============================================================
 */

// ==================== HISTORIQUE UNDO/REDO POUR FLOOR PLAN ====================
//
// Pont vers l'historique UNIFIÉ (globalHistory / recordAction / undo / redo,
// définis dans editor-objects.js). Avant cette refonte (E0), le plan 2D avait
// sa propre pile séparée (floorPlanHistory/floorPlanHistoryIndex) dont les
// fonctions undoFloorPlanAction()/redoFloorPlanAction() n'étaient câblées à
// AUCUN raccourci clavier : Ctrl+Z ne pouvait donc jamais annuler un mur ou
// une pièce. Désormais, chaque action de plan 2D pousse une entrée de type
// 'floorplan' sur la MÊME pile que les objets/lumières/textures : Ctrl+Z
// annule la dernière action réalisée, tout domaine confondu, dans l'ordre
// chronologique réel.

// Référence "avant action" : capturée paresseusement (première utilisation),
// puis maintenue à jour à chaque action ET à chaque undo/redo (restoreFloorPlanState).
var _floorPlanBaselineSnapshot = null;
var _floorPlanBaselineReady = false;

// Capture l'état courant des murs/pièces (même format qu'avant la refonte,
// + prise en charge des murs FUSIONNÉS : ils n'ont pas de start/end simple,
// seulement une géométrie personnalisée — sérialisée comme le fait déjà
// l'export de salle, voir editor-save.js).
function captureFloorPlanSnapshot() {
    return {
        walls: JSON.parse(JSON.stringify(floorPlanWalls.map(w => {
            if (w.isMerged) {
                const poly = w.roomPolygon || (w.mesh.userData && w.mesh.userData.roomPolygon);
                return {
                    isMerged: true,
                    name: w.name || `Mur fusionné n°${w.id || 0}`,
                    id: w.id || 0,
                    geometryJSON: w.mesh.geometry.toJSON(),
                    sourceWallCount: (w.mesh.userData && w.mesh.userData.sourceWallCount) || 0,
                    roomPolygon: (poly && poly.length >= 3) ? poly.map(p => ({ x: p.x, z: p.z })) : null
                };
            }
            return {
                start: w.start,
                end: w.end,
                id: w.id || 0,
                isRoomWall: w.isRoomWall || false
            };
        }))),
        rooms: JSON.parse(JSON.stringify(floorPlanRooms.map(r => ({
            id: r.id,
            bounds: r.bounds,
            polygon: r.polygon || null,
            rounding: r.rounding || 0,
            wallIds: r.walls.map(w => w.id)
        })))),
        lastEndPoint: lastWallEndPoint ? { ...lastWallEndPoint } : null
    };
}

// Garantit qu'une référence "avant" existe, en capturant l'état déjà présent
// à l'écran (murs chargés depuis un fichier, par exemple) — SANS créer
// d'entrée d'annulation : il n'y a rien de sensé à "annuler" avant ce point.
function ensureFloorPlanBaseline() {
    if (!_floorPlanBaselineReady) {
        _floorPlanBaselineSnapshot = captureFloorPlanSnapshot();
        _floorPlanBaselineReady = true;
    }
}

// Enregistre l'état courant (après une action de plan 2D) dans l'historique unifié.
function saveFloorPlanState(actionType, data) {
    ensureFloorPlanBaseline();
    const after = captureFloorPlanSnapshot();
    recordAction('floorplan', _floorPlanBaselineSnapshot, after, actionType);
    _floorPlanBaselineSnapshot = after;
    console.log(`📝 Action plan 2D enregistrée dans l'historique unifié: ${actionType}`);
}

// Restaurer un état (appelé par executeUndo/executeRedo dans editor-objects.js)
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
        // Murs fusionnés : reconstruire depuis geometryJSON (même logique que
        // le chargement d'une salle sauvegardée — voir editor-save.js)
        if (w.isMerged && w.geometryJSON) {
            try {
                const loader = new THREE.BufferGeometryLoader();
                const geo = loader.parse(w.geometryJSON);
                let maxMatIdx = 0;
                if (geo.groups) geo.groups.forEach(g => { maxMatIdx = Math.max(maxMatIdx, g.materialIndex); });
                const materials = [];
                for (let i = 0; i <= maxMatIdx; i++) {
                    const sourceWallIdx = Math.floor(i / 6);
                    const pof = 1 + sourceWallIdx * 0.3;
                    materials.push(new THREE.MeshStandardMaterial({
                        color: 0xcccccc, side: THREE.DoubleSide, roughness: 0.4, metalness: 0,
                        polygonOffset: true, polygonOffsetFactor: pof, polygonOffsetUnits: pof
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
                const mergedWallObj = { start: null, end: null, mesh: mesh, name: w.name, id: w.id, isMerged: true };
                if (w.roomPolygon && w.roomPolygon.length >= 3) {
                    mergedWallObj.roomPolygon = w.roomPolygon;
                    mesh.userData.roomPolygon = w.roomPolygon;
                }
                floorPlanWalls.push(mergedWallObj);
                addWallToObjectList(mergedWallObj);
            } catch (e) {
                console.warn(`⚠️ Erreur restauration mur fusionné "${w.name}" (undo/redo):`, e);
            }
            return;
        }
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

    // L'état restauré devient la nouvelle référence "avant" pour la prochaine
    // action, qu'elle vienne d'un nouvel undo/redo ou d'une édition normale.
    _floorPlanBaselineSnapshot = state;
    _floorPlanBaselineReady = true;

    console.log(`✅ État restauré: ${state.walls.length} murs, ${(state.rooms || []).length} pièces`);
}

// Surbrillance jaune du mur survolé en mode suppression (CTRL)
