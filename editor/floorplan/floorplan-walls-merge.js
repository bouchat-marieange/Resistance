/**
 * ============================================================
 * RESISTANCE — editor/floorplan/floorplan-walls-merge.js
 * Sélection multiple et transformation de murs, fusion de murs,
 * outil mur oblique, création de murs type Sims
 * ------------------------------------------------------------
 * Découpage mécanique de l'ancien editor-floorplan.js (E0-bis,
 * 07/2026), même méthode que game/engine/ (Phase 4) : frontières
 * de sections existantes, globales/fonctions inchangées.
 * ============================================================
 */

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

