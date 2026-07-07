/**
 * ============================================================
 * RESISTANCE — editor/floorplan/floorplan-texture.js
 * Outil Texture : application par face (mur/sol/plafond), y compris
 * la gestion des faces de murs fusionnés
 * ------------------------------------------------------------
 * Découpage mécanique de l'ancien editor-floorplan.js (E0-bis,
 * 07/2026), même méthode que game/engine/ (Phase 4) : frontières
 * de sections existantes, globales/fonctions inchangées.
 * ============================================================
 */

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

