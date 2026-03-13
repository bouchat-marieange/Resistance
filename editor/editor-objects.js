// ==================== IMPORT D'OBJETS 3D ====================

// Compteur pour les objets importés
let importedObjectCounter = 0;
let importedObjects = []; // Liste des objets importés
let importedCharacterCounter = 0;
let importedCharacters = []; // Liste des personnages importés

// Initialisation des event listeners DOM de l'éditeur objets
// (appelée après le chargement dynamique du panel HTML)
function initEditorObjectsListeners() {
    // Connecter le bouton au sélecteur de fichier
    const importBtn = document.getElementById('import-model-btn');
    if (importBtn) importBtn.addEventListener('click', function() {
        document.getElementById('model-file-input').click();
    });

    // Gérer l'import du fichier
    const modelInput = document.getElementById('model-file-input');
    if (modelInput) modelInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Vérifier l'extension
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.glb') && !fileName.endsWith('.gltf')) {
        alert('❌ Format non supporté. Veuillez choisir un fichier GLB ou GLTF.');
        return;
    }

    // Feedback utilisateur
    const btn = document.getElementById('import-model-btn');
    const originalText = btn.textContent;
    btn.textContent = '⏳ Chargement...';
    btn.disabled = true;

    // Lire le fichier en base64 pour la sauvegarde
    const reader = new FileReader();
    reader.onload = function(readerEvent) {
        const fileDataBase64 = readerEvent.target.result;

        // Créer un URL depuis le fichier local
        const url = URL.createObjectURL(file);

        // Charger le modèle avec GLTFLoader
        const loader = new THREE.GLTFLoader();
        loader.load(
            url,
            // Succès
            function(gltf) {
                importedObjectCounter++;
                const objectName = `Objet_Importé_${importedObjectCounter}`;

                const model = gltf.scene;

                // Sauvegarder les données du fichier pour persistence
                model.userData.fileData = fileDataBase64;

            // Positionner le modèle au centre de la scène, légèrement au-dessus du sol
            model.position.set(0, 5, 0);

            // Échelle par défaut (ajustable ensuite)
            model.scale.set(1, 1, 1);

            // Activer les ombres pour tous les enfants - AUCUNE CORRECTION AUTOMATIQUE
            let meshCount = 0;

            console.log(`\n🔍 DIAGNOSTIC COMPLET pour ${file.name}:`);

            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    meshCount++;

                    if (child.material) {
                        const mat = child.material;

                        console.log(`\n📦 Mesh #${meshCount}: ${child.name || 'Sans nom'}`);
                        console.log(`   Type: ${mat.type}`);

                        // TOUTES les propriétés du matériau
                        console.log(`   🎨 Couleur: RGB(${Math.round(mat.color.r*255)}, ${Math.round(mat.color.g*255)}, ${Math.round(mat.color.b*255)})`);
                        console.log(`   🔧 Metalness: ${mat.metalness}`);
                        console.log(`   🔧 Roughness: ${mat.roughness}`);

                        // TOUTES les textures/maps possibles
                        console.log(`   📋 MAPS présentes:`);
                        if (mat.map) console.log(`      ✓ map (diffuse/color) - ${mat.map.image?.width}x${mat.map.image?.height}`);
                        if (mat.normalMap) console.log(`      ✓ normalMap - ${mat.normalMap.image?.width}x${mat.normalMap.image?.height}`);
                        if (mat.roughnessMap) console.log(`      ✓ roughnessMap - ${mat.roughnessMap.image?.width}x${mat.roughnessMap.image?.height}`);
                        if (mat.metalnessMap) console.log(`      ✓ metalnessMap - ${mat.metalnessMap.image?.width}x${mat.metalnessMap.image?.height}`);
                        if (mat.aoMap) console.log(`      ⚠️ aoMap (ASSOMBRIT!) - ${mat.aoMap.image?.width}x${mat.aoMap.image?.height} - Intensité: ${mat.aoMapIntensity}`);
                        if (mat.emissiveMap) console.log(`      ✓ emissiveMap - ${mat.emissiveMap.image?.width}x${mat.emissiveMap.image?.height}`);
                        if (mat.lightMap) console.log(`      ✓ lightMap - ${mat.lightMap.image?.width}x${mat.lightMap.image?.height}`);

                        // Configurer l'encodage de la texture principale
                        if (mat.map) {
                            mat.map.encoding = THREE.sRGBEncoding;
                            mat.map.needsUpdate = true;
                        }

                        // CORRECTION CRITIQUE: Metalness = 1 rend les objets comme des miroirs noirs
                        // Copilot 3D exporte toujours avec Metalness=1, ce qui est incorrect
                        if (mat.metalness === 1) {
                            console.log(`      ⚠️ CORRECTION: Metalness était à 1 (miroir) → forcé à 0 (non-métallique)`);
                            mat.metalness = 0;
                            mat.needsUpdate = true;
                        }

                        // DIAGNOSTIC: Si aoMap existe, elle ASSOMBRIT l'objet
                        if (mat.aoMap) {
                            console.log(`      ⚠️⚠️⚠️ PROBLÈME DÉTECTÉ: aoMap présente avec intensité ${mat.aoMapIntensity}`);
                            console.log(`      Cette map assombrit artificiellement le modèle!`);
                        }
                    }
                }
            });

            console.log(`\n✅ Modèle GLB importé: ${file.name} (${meshCount} mesh)`);

            // Marquer le modèle pour l'éditeur
            model.userData.editorName = objectName;
            model.userData.isImported = true;
            model.userData.fileName = file.name;

            // Roughness par défaut pour cuir (peut être ajusté dans l'éditeur)
            model.userData.customRoughness = 0.5;

            // Ajouter à la scène
            scene.add(model);

            // Ajouter à la liste des objets importés
            importedObjects.push(model);

            // Rendre l'objet sélectionnable
            selectableObjects.push(model);
            model.traverse((child) => {
                if (child.isMesh) {
                    child.userData.editorName = objectName;
                    selectableObjects.push(child);
                }
            });

            // Sauvegarder l'état initial
            initialTransforms.set(model, {
                position: model.position.clone(),
                rotation: model.rotation.clone(),
                scale: model.scale.clone()
            });

            // Libérer l'URL du blob
            URL.revokeObjectURL(url);

            // Mettre à jour la liste des objets
            updateObjectsList();

            // Feedback succès
            btn.textContent = '✅ Importé !';
            btn.style.background = '#27ae60';

            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '#9b59b6';
                btn.disabled = false;
            }, 2000);

            console.log(`✅ Modèle "${file.name}" importé avec succès comme "${objectName}"`);

            // Mettre à jour la liste des objets importés
            updateImportedObjectsList();

            // Sauvegarder dans localStorage
            saveImportedObjectsToStorage();

            // Réinitialiser l'input pour permettre de réimporter le même fichier
            e.target.value = '';
        },
        // Progression
        function(xhr) {
            const percent = (xhr.loaded / xhr.total * 100).toFixed(0);
            btn.textContent = `⏳ ${percent}%`;
        },
        // Erreur
        function(error) {
            console.error('❌ Erreur lors du chargement du modèle:', error);
            alert(`❌ Erreur lors du chargement du fichier:\n${error.message || 'Fichier invalide ou corrompu'}`);

            // Libérer l'URL en cas d'erreur
            URL.revokeObjectURL(url);

            btn.textContent = originalText;
            btn.disabled = false;

            // Réinitialiser l'input
            e.target.value = '';
        }
    );
    };

    // Lire le fichier en base64
    reader.readAsDataURL(file);
    });

    // ==================== IMPORT DE PERSONNAGES 3D ====================

    const importCharBtn = document.getElementById('import-character-btn');
    if (importCharBtn) importCharBtn.addEventListener('click', function() {
        document.getElementById('character-file-input').click();
    });

    const charInput = document.getElementById('character-file-input');
    if (charInput) charInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.glb') && !fileName.endsWith('.gltf')) {
        alert('❌ Format non supporté. Veuillez choisir un fichier GLB ou GLTF.');
        return;
    }

    const btn = document.getElementById('import-character-btn');
    const originalText = btn.textContent;
    btn.textContent = '⏳ Chargement...';
    btn.disabled = true;

    const reader = new FileReader();
    reader.onload = function(readerEvent) {
        const fileDataBase64 = readerEvent.target.result;
        const url = URL.createObjectURL(file);

        const loader = new THREE.GLTFLoader();
        loader.load(
            url,
            function(gltf) {
                importedCharacterCounter++;
                const charName = `Personnage_${importedCharacterCounter}`;
                const model = gltf.scene;

                // Sauvegarder les données du fichier pour persistence
                model.userData.fileData = fileDataBase64;

                // Mesurer la hauteur RÉELLE par les os du squelette
                model.scale.set(1, 1, 1);
                model.updateMatrixWorld(true);

                const boneMeasure = measureCharacterByBones(model);
                let effectiveRawHeight;

                if (boneMeasure) {
                    effectiveRawHeight = boneMeasure.height;
                    model.userData.referenceHeightAtScale1 = boneMeasure.height;
                    model.userData.referenceWidthAtScale1 = boneMeasure.width;
                    model.userData.referenceDepthAtScale1 = boneMeasure.depth;
                    console.log(`📏 Personnage importé mesuré par os: ${boneMeasure.boneCount} os → H=${effectiveRawHeight.toFixed(4)}m`);
                } else {
                    // Fallback pour modèles sans squelette
                    const rawBox = new THREE.Box3().setFromObject(model);
                    effectiveRawHeight = rawBox.max.y - rawBox.min.y;
                    const rawSize = rawBox.getSize(new THREE.Vector3());
                    model.userData.referenceHeightAtScale1 = rawSize.y;
                    model.userData.referenceWidthAtScale1 = rawSize.x;
                    model.userData.referenceDepthAtScale1 = rawSize.z;
                    console.warn(`⚠️ Personnage sans os, fallback Box3 → H=${effectiveRawHeight.toFixed(4)}m`);
                }

                // Ajuster l'échelle pour une hauteur réaliste (~1.70m)
                const TARGET_HEIGHT = 1.70;
                if (effectiveRawHeight > 0.001) {
                    const charScale = TARGET_HEIGHT / effectiveRawHeight;
                    model.scale.set(charScale, charScale, charScale);
                    console.log(`📏 Scale calculé: ${charScale.toFixed(4)} → hauteur cible: ${TARGET_HEIGHT}m`);
                }

                // Position au centre de la scène, pieds au sol
                model.updateMatrixWorld(true);
                const finalBox = new THREE.Box3().setFromObject(model);
                // Utiliser les os pour trouver le point le plus bas si disponible
                let groundOffset = -finalBox.min.y;
                if (boneMeasure) {
                    // Re-mesurer après scale pour position précise
                    const scaledMeasure = measureCharacterByBones(model);
                    if (scaledMeasure) {
                        // Le minY du bone le plus bas donne un meilleur ground level
                    }
                }
                model.position.set(0, groundOffset, 0);

                // Configurer ombres et matériaux
                let meshCount = 0;
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        child.frustumCulled = false; // Empêcher la disparition à l'approche
                        meshCount++;

                        if (child.material) {
                            if (child.material.map) {
                                child.material.map.encoding = THREE.sRGBEncoding;
                                child.material.map.needsUpdate = true;
                            }
                            if (child.material.metalness === 1) {
                                child.material.metalness = 0;
                                child.material.needsUpdate = true;
                            }
                        }
                    }
                });

                // Setup animations si présentes
                let charMixer = null;
                if (gltf.animations && gltf.animations.length > 0) {
                    charMixer = new THREE.AnimationMixer(model);
                    const action = charMixer.clipAction(gltf.animations[0]);
                    action.play();
                    model.userData.mixer = charMixer;
                    model.userData.animations = gltf.animations;
                    console.log(`🎬 ${gltf.animations.length} animation(s) détectée(s) pour ${charName}`);
                }

                // Marquer le modèle comme personnage importé
                model.userData.editorName = charName;
                model.userData.isImported = true;
                model.userData.isCharacter = true;
                model.userData.fileName = file.name;
                model.userData.customRoughness = 0.5;

                // Ajouter à la scène
                scene.add(model);
                importedObjects.push(model);
                importedCharacters.push(model);

                // Rendre sélectionnable
                selectableObjects.push(model);
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.userData.editorName = charName;
                        child.userData.isCharacter = true;
                        selectableObjects.push(child);
                    }
                });

                // Créer le proxy de collision pour bloquer le joueur
                createCharacterCollisionProxy(model);

                // Sauvegarder l'état initial
                initialTransforms.set(model, {
                    position: model.position.clone(),
                    rotation: model.rotation.clone(),
                    scale: model.scale.clone()
                });

                URL.revokeObjectURL(url);
                updateObjectsList();
                updateImportedCharactersList();
                saveImportedObjectsToStorage();

                btn.textContent = '✅ Importé !';
                btn.style.background = '#27ae60';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '';
                    btn.disabled = false;
                }, 2000);

                console.log(`✅ Personnage "${file.name}" importé comme "${charName}" (${meshCount} mesh)`);
                e.target.value = '';
            },
            function(xhr) {
                if (xhr.total > 0) {
                    const percent = (xhr.loaded / xhr.total * 100).toFixed(0);
                    btn.textContent = `⏳ ${percent}%`;
                }
            },
            function(error) {
                console.error('❌ Erreur lors du chargement du personnage:', error);
                alert(`❌ Erreur lors du chargement:\n${error.message || 'Fichier invalide ou corrompu'}`);
                URL.revokeObjectURL(url);
                btn.textContent = originalText;
                btn.disabled = false;
                e.target.value = '';
            }
        );
    };
    reader.readAsDataURL(file);
    });
} // fin initEditorObjectsListeners()

// Mettre à jour la liste des personnages importés dans le panneau
function updateImportedCharactersList() {
    const listContainer = document.getElementById('imported-characters-list');
    const charsContainer = document.getElementById('imported-characters-container');
    if (!listContainer || !charsContainer) return;

    if (importedCharacters.length === 0) {
        listContainer.style.display = 'none';
        return;
    }

    listContainer.style.display = 'block';
    charsContainer.innerHTML = '';

    importedCharacters.forEach((obj, index) => {
        const item = document.createElement('div');
        item.style.cssText = 'padding: 6px; margin: 3px 0; background: white; border-radius: 3px; display: flex; justify-content: space-between; align-items: center; font-size: 10px;';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = obj.userData.editorName;
        nameSpan.style.cssText = 'color: #2c3e50; font-weight: bold; flex: 1;';

        const fileSpan = document.createElement('span');
        fileSpan.textContent = obj.userData.fileName;
        fileSpan.style.cssText = 'color: #7f8c8d; font-size: 9px; margin-right: 8px;';

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️';
        deleteBtn.style.cssText = 'background: #e74c3c; color: white; border: none; border-radius: 3px; padding: 3px 6px; cursor: pointer; font-size: 12px;';
        deleteBtn.title = 'Supprimer ce personnage';
        deleteBtn.onclick = function() {
            deleteImportedCharacter(obj, index);
        };

        item.appendChild(nameSpan);
        item.appendChild(fileSpan);
        item.appendChild(deleteBtn);
        charsContainer.appendChild(item);
    });
}

// Supprimer un personnage importé
function deleteImportedCharacter(obj, index) {
    if (!confirm(`Voulez-vous vraiment supprimer "${obj.userData.editorName}" de la scène ?`)) {
        return;
    }

    scene.remove(obj);

    // Supprimer le proxy de collision
    removeCharacterCollisionProxy(obj);

    // Retirer de selectableObjects
    const objIndex = selectableObjects.indexOf(obj);
    if (objIndex > -1) selectableObjects.splice(objIndex, 1);
    obj.traverse((child) => {
        const childIndex = selectableObjects.indexOf(child);
        if (childIndex > -1) selectableObjects.splice(childIndex, 1);
    });

    initialTransforms.delete(obj);

    // Retirer de importedCharacters
    importedCharacters.splice(index, 1);

    // Retirer aussi de importedObjects
    const ioIdx = importedObjects.indexOf(obj);
    if (ioIdx > -1) importedObjects.splice(ioIdx, 1);

    if (selectedEditorObject === obj) deselectEditorObject();

    // Stopper le mixer d'animation si présent
    if (obj.userData.mixer) {
        obj.userData.mixer.stopAllAction();
    }

    updateImportedCharactersList();
    updateObjectsList();
    saveImportedObjectsToStorage();
    markUnsavedChanges();

    console.log(`🗑️ Personnage "${obj.userData.editorName}" supprimé de la scène`);
}

// Mettre à jour la liste des objets importés
function updateImportedObjectsList() {
    const listContainer = document.getElementById('imported-objects-list');
    const objectsContainer = document.getElementById('imported-objects-container');

    if (importedObjects.length === 0) {
        listContainer.style.display = 'none';
        return;
    }

    listContainer.style.display = 'block';
    objectsContainer.innerHTML = '';

    importedObjects.forEach((obj, index) => {
        const item = document.createElement('div');
        item.style.cssText = 'padding: 6px; margin: 3px 0; background: white; border-radius: 3px; display: flex; justify-content: space-between; align-items: center; font-size: 10px;';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = `${obj.userData.editorName}`;
        nameSpan.style.cssText = 'color: #2c3e50; font-weight: bold; flex: 1;';

        const fileSpan = document.createElement('span');
        fileSpan.textContent = obj.userData.fileName;
        fileSpan.style.cssText = 'color: #7f8c8d; font-size: 9px; margin-right: 8px;';

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️';
        deleteBtn.style.cssText = 'background: #e74c3c; color: white; border: none; border-radius: 3px; padding: 3px 6px; cursor: pointer; font-size: 12px;';
        deleteBtn.title = 'Supprimer cet objet';
        deleteBtn.onclick = function() {
            deleteImportedObject(obj, index);
        };

        item.appendChild(nameSpan);
        item.appendChild(fileSpan);
        item.appendChild(deleteBtn);
        objectsContainer.appendChild(item);
    });
}

// Supprimer un objet importé
function deleteImportedObject(obj, index) {
    if (!confirm(`Voulez-vous vraiment supprimer "${obj.userData.editorName}" de la scène ?`)) {
        return;
    }

    // Retirer de la scène
    scene.remove(obj);

    // Supprimer le proxy de collision si c'est un personnage
    if (obj.userData.isCharacter) removeCharacterCollisionProxy(obj);

    // Retirer de la liste des objets sélectionnables
    const objIndex = selectableObjects.indexOf(obj);
    if (objIndex > -1) {
        selectableObjects.splice(objIndex, 1);
    }

    // Retirer aussi tous les enfants
    obj.traverse((child) => {
        const childIndex = selectableObjects.indexOf(child);
        if (childIndex > -1) {
            selectableObjects.splice(childIndex, 1);
        }
    });

    // Retirer de la liste des transforms initiaux
    initialTransforms.delete(obj);

    // Retirer de la liste des objets importés
    importedObjects.splice(index, 1);

    // Désélectionner si c'était l'objet sélectionné
    if (selectedEditorObject === obj) {
        deselectEditorObject();
    }

    // Mettre à jour la liste
    updateImportedObjectsList();

    // Sauvegarder automatiquement
    saveImportedObjectsToStorage();

    // Marquer comme ayant des changements non sauvegardés
    markUnsavedChanges();

    console.log(`🗑️ Objet "${obj.userData.editorName}" supprimé de la scène`);
}

function toggleEditor() {
    editorMode = !editorMode;
    const panel = document.getElementById('editor-panel');
    const btn = document.getElementById('toggle-editor-btn');
    const collapseBtn = document.getElementById('toggle-panel-collapse');

    if (editorMode) {
        panel.style.display = 'flex';
        collapseBtn.style.display = 'block'; // Afficher le bouton de pliage

        // Si le panneau était plié, le déplier
        if (isPanelCollapsed) {
            panel.classList.remove('collapsed');
            collapseBtn.classList.remove('collapsed');
            const collapseBtnImg = collapseBtn.querySelector('img');
            collapseBtnImg.src = 'icones/circle-chevron-right.svg';
            collapseBtn.title = 'Plier le panneau';
            isPanelCollapsed = false;
        }

        // NE PAS appeler updateObjectsList() immédiatement car les objets 3D
        // sont chargés de manière asynchrone. On va forcer des mises à jour
        // progressives pour attraper les objets dès qu'ils sont disponibles.

        // Mises à jour progressives pour attraper les objets chargés de manière asynchrone
        // Utiliser scheduleUpdateObjectsList pour éviter les appels multiples rapprochés
        setTimeout(() => {
            makeObjectsSelectable();
            scheduleUpdateObjectsList();
            console.log('📋 [50ms] Tentative 1:', selectableObjects.length, 'objets');
        }, 50);

        setTimeout(() => {
            makeObjectsSelectable();
            scheduleUpdateObjectsList();
            console.log('📋 [200ms] Tentative 2:', selectableObjects.length, 'objets');
        }, 200);

        setTimeout(() => {
            makeObjectsSelectable();
            scheduleUpdateObjectsList();
            console.log('📋 [600ms] Tentative 3:', selectableObjects.length, 'objets');
        }, 600);

        setTimeout(() => {
            makeObjectsSelectable();
            scheduleUpdateObjectsList();
            console.log('📋 [1500ms] Liste finale:', selectableObjects.length, 'objets');
        }, 1500);
    } else {
        panel.style.display = 'none';
        collapseBtn.style.display = 'none'; // Masquer le bouton de pliage
        deselectEditorObject();

        // Masquer tous les gizmos quand on ferme l'éditeur
        hideCameraGizmo();
        hideLightGizmo();
        hideAllLightHelpers();
    }
}

// ==================== GESTION DE L'HISTORIQUE ====================

function saveTransformState() {
    // Cette fonction est maintenant dépréciée
    // Les transformations sont enregistrées automatiquement via transformControl events
    // Gardée pour compatibilité
}

// ==================== SYSTÈME D'HISTORIQUE GLOBAL ====================

/**
 * Enregistre une action dans l'historique
 * @param {string} type - Type d'action ('transform', 'create', 'delete', 'texture', 'light', 'camera', etc.)
 * @param {object} undoData - Données pour annuler l'action
 * @param {object} redoData - Données pour rétablir l'action
 * @param {string} description - Description de l'action pour le debug
 */
function recordAction(type, undoData, redoData, description = '') {
    if (!globalHistory.isRecording) return;

    const action = {
        type,
        undoData,
        redoData,
        description,
        timestamp: Date.now()
    };

    // Ajouter à la pile undo
    globalHistory.undoStack.push(action);

    // Limiter la taille de l'historique
    if (globalHistory.undoStack.length > globalHistory.maxHistory) {
        globalHistory.undoStack.shift();
    }

    // Vider la pile redo (nouvelle action = nouvelle branche)
    globalHistory.redoStack = [];

    console.log(`📝 Action enregistrée: ${type} - ${description}`);
}

/**
 * Annuler la dernière action (Ctrl+Z)
 */
function undo() {
    if (globalHistory.undoStack.length === 0) {
        console.log('↶ Rien à annuler');
        return;
    }

    const action = globalHistory.undoStack.pop();
    globalHistory.isRecording = false;

    try {
        executeUndo(action);
        globalHistory.redoStack.push(action);
        console.log(`↶ Annulé: ${action.type} - ${action.description}`);
    } catch (e) {
        console.error('Erreur lors de l\'annulation:', e);
    }

    globalHistory.isRecording = true;
}

/**
 * Rétablir la dernière action annulée (Ctrl+Y)
 */
function redo() {
    if (globalHistory.redoStack.length === 0) {
        console.log('↷ Rien à rétablir');
        return;
    }

    const action = globalHistory.redoStack.pop();
    globalHistory.isRecording = false;

    try {
        executeRedo(action);
        globalHistory.undoStack.push(action);
        console.log(`↷ Rétabli: ${action.type} - ${action.description}`);
    } catch (e) {
        console.error('Erreur lors du rétablissement:', e);
    }

    globalHistory.isRecording = true;
}

/**
 * Exécute l'annulation d'une action
 */
function executeUndo(action) {
    const data = action.undoData;

    switch (action.type) {
        case 'transform':
            // Annuler un déplacement/rotation/scale
            if (data.object && data.object.parent) {
                data.object.position.copy(data.position);
                data.object.rotation.copy(data.rotation);
                data.object.scale.copy(data.scale);
                data.object.updateMatrixWorld(true);
                updateObjectInfo();
            }
            break;

        case 'create-object':
            // Annuler la création = supprimer l'objet
            if (data.object) {
                scene.remove(data.object);
                const idx = selectableObjects.indexOf(data.object);
                if (idx > -1) selectableObjects.splice(idx, 1);
                if (selectedEditorObject === data.object) deselectEditorObject();
                updateObjectsList();
            }
            break;

        case 'delete-object':
            // Annuler la suppression = restaurer l'objet
            if (data.object && data.parent) {
                data.parent.add(data.object);
                selectableObjects.push(data.object);
                updateObjectsList();
            }
            break;

        case 'create-wall':
            // Annuler la création d'un mur
            if (data.wall && data.wall.mesh) {
                scene.remove(data.wall.mesh);
                const idx = floorPlanWalls.indexOf(data.wall);
                if (idx > -1) floorPlanWalls.splice(idx, 1);
            }
            break;

        case 'delete-wall':
            // Annuler la suppression d'un mur = restaurer
            if (data.wall && data.wall.mesh) {
                scene.add(data.wall.mesh);
                floorPlanWalls.push(data.wall);
            }
            break;

        case 'create-room':
            // Annuler la création d'une pièce = supprimer les 4 murs
            if (data.walls && data.walls.length) {
                data.walls.forEach(wall => {
                    if (wall.mesh) scene.remove(wall.mesh);
                    const idx = floorPlanWalls.indexOf(wall);
                    if (idx > -1) floorPlanWalls.splice(idx, 1);
                });
            }
            if (data.room && data.room.mesh) {
                scene.remove(data.room.mesh);
                const idx = floorPlanRooms.indexOf(data.room);
                if (idx > -1) floorPlanRooms.splice(idx, 1);
            }
            break;

        case 'texture-wall':
            // Annuler l'application de texture
            if (data.wall && data.previousMaterials) {
                data.wall.mesh.material = data.previousMaterials;
                data.wall.textureInfo = data.previousTextureInfo || {};
            }
            break;

        case 'texture-floor':
        case 'texture-ceiling':
            // Annuler l'application de texture sol/plafond
            if (data.tile) {
                scene.remove(data.tile);
            }
            break;

        case 'light-change':
            // Annuler un changement de lumière
            if (data.light) {
                if (data.previousIntensity !== undefined) data.light.intensity = data.previousIntensity;
                if (data.previousColor) data.light.color.copy(data.previousColor);
                if (data.previousPosition) data.light.position.copy(data.previousPosition);
            }
            break;

        case 'rename-object':
            // Annuler un renommage
            if (data.object) {
                data.object.userData.editorName = data.previousName;
                updateObjectsList();
            }
            break;

        default:
            console.warn('Type d\'action non géré pour undo:', action.type);
    }
}

/**
 * Exécute le rétablissement d'une action
 */
function executeRedo(action) {
    const data = action.redoData;

    switch (action.type) {
        case 'transform':
            if (data.object && data.object.parent) {
                data.object.position.copy(data.position);
                data.object.rotation.copy(data.rotation);
                data.object.scale.copy(data.scale);
                data.object.updateMatrixWorld(true);
                updateObjectInfo();
            }
            break;

        case 'create-object':
            if (data.object && data.parent) {
                data.parent.add(data.object);
                selectableObjects.push(data.object);
                updateObjectsList();
            }
            break;

        case 'delete-object':
            if (data.object) {
                scene.remove(data.object);
                const idx = selectableObjects.indexOf(data.object);
                if (idx > -1) selectableObjects.splice(idx, 1);
                if (selectedEditorObject === data.object) deselectEditorObject();
                updateObjectsList();
            }
            break;

        case 'create-wall':
            if (data.wall && data.wall.mesh) {
                scene.add(data.wall.mesh);
                floorPlanWalls.push(data.wall);
            }
            break;

        case 'delete-wall':
            if (data.wall && data.wall.mesh) {
                scene.remove(data.wall.mesh);
                const idx = floorPlanWalls.indexOf(data.wall);
                if (idx > -1) floorPlanWalls.splice(idx, 1);
            }
            break;

        case 'create-room':
            if (data.walls && data.walls.length) {
                data.walls.forEach(wall => {
                    if (wall.mesh) scene.add(wall.mesh);
                    floorPlanWalls.push(wall);
                });
            }
            if (data.room && data.room.mesh) {
                scene.add(data.room.mesh);
                floorPlanRooms.push(data.room);
            }
            break;

        case 'texture-wall':
            if (data.wall && data.newMaterials) {
                data.wall.mesh.material = data.newMaterials;
                data.wall.textureInfo = data.newTextureInfo || {};
            }
            break;

        case 'texture-floor':
        case 'texture-ceiling':
            if (data.tile) {
                scene.add(data.tile);
            }
            break;

        case 'light-change':
            if (data.light) {
                if (data.newIntensity !== undefined) data.light.intensity = data.newIntensity;
                if (data.newColor) data.light.color.copy(data.newColor);
                if (data.newPosition) data.light.position.copy(data.newPosition);
            }
            break;

        case 'rename-object':
            if (data.object) {
                data.object.userData.editorName = data.newName;
                updateObjectsList();
            }
            break;

        default:
            console.warn('Type d\'action non géré pour redo:', action.type);
    }
}

/**
 * Vide l'historique
 */
function clearHistory() {
    globalHistory.undoStack = [];
    globalHistory.redoStack = [];
    console.log('🗑️ Historique effacé');
}

// ==================== SÉLECTION DES OBJETS ====================

function onEditorClick(event) {
    // En mode jeu, bloquer toute sélection d'objet et gizmo
    if (interactionMode === 'game') return;

    if (!editorMode) {
        console.log('❌ Clic ignoré : éditeur désactivé');
        return;
    }

    // Ne pas gérer les clics si on est en mode panning espace
    if (isSpacePressed || isSpacePanning) return;

    // Mode Plan de pièce: gérer le clic pour le dessin
    if (currentEditorMode === 'floor-plan') {
        // Ne transmettre que les clics sur le canvas
        if (event.target === renderer.domElement) {
            onFloorPlanClick(event);
        }
        return;
    }

    // Mode Éléments de jeu: gérer le clic pour placer le spawn
    if (currentEditorMode === 'game-setup') {
        if (event.target === renderer.domElement && isSpawnToolActive && !activeZoneTool) {
            placeSpawnAtClick(event);
        }
        // Zone drawing is handled by mousedown/move/up, not click
        return;
    }

    // IMPORTANT: Ne permettre la sélection d'objets QUE en mode "objects"
    // En mode caméra ou lumières, on ne doit pas sélectionner les objets de la scène
    if (currentEditorMode !== 'objects') {
        console.log('❌ Clic ignoré : mode', currentEditorMode);
        return;
    }

    // Ignorer les clics sur les éléments UI (panneau, boutons, cases à cocher)
    if (event.target.closest('#editor-panel')) {
        console.log('❌ Clic ignoré : sur le panneau');
        return;
    }

    // Si la sélection est verrouillée, ignorer les clics
    if (isSelectionLocked) {
        console.log('🔒 Sélection verrouillée');
        return;
    }

    console.log('🖱️ Clic détecté - Test de sélection sur', selectableObjects.length, 'objets');

    // Calculer la position de la souris normalisée
    const rect = renderer.domElement.getBoundingClientRect();
    editorMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    editorMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Lancer le raycaster
    editorRaycaster.setFromCamera(editorMouse, camera);
    const intersects = editorRaycaster.intersectObjects(selectableObjects, true);

    console.log('🎯 Raycaster:', intersects.length, 'intersections trouvées');

    if (intersects.length > 0) {
        let object = intersects[0].object;

        // Pour les objets importés, remonter jusqu'au modèle racine (celui dans importedObjects)
        // Cela garantit que les transformations sont appliquées au bon objet
        let importedRoot = null;
        let current = object;
        while (current) {
            if (current.userData.isImported && importedObjects.includes(current)) {
                importedRoot = current;
                break;
            }
            current = current.parent;
        }

        if (importedRoot) {
            // C'est un objet importé - sélectionner le modèle racine
            selectEditorObject(importedRoot, event.shiftKey);
        } else if (object.userData.editorName) {
            const targetName = object.userData.editorName;

            // Remonter jusqu'à trouver l'objet parent racine avec le même nom
            while (object.parent && object.parent.userData.editorName === targetName) {
                object = object.parent;
            }

            selectEditorObject(object, event.shiftKey);
        } else {
            // Sinon, remonter jusqu'à trouver un objet avec un nom
            while (object.parent && !object.userData.editorName) {
                object = object.parent;
            }

            if (object.userData.editorName) {
                selectEditorObject(object, event.shiftKey);
            }
        }
    }
}

// Fonction pour obtenir l'icône SVG selon le type d'objet
function getObjectIcon(obj) {
    const name = obj.userData.editorName || '';
    const iconColor = '#ffffff'; // Blanc pour contraste sur fond sombre

    // Dossier
    if (obj.userData.isFolder) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>`;
    }

    // Personnage
    if (name.includes('Naby')) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><path d="m9 20 3-6 3 6"/><path d="m6 8 6 2 6-2"/><path d="M12 10v4"/></svg>`;
    }

    // Caméra
    if (name.includes('Camera') || name.includes('Caméra')) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>`;
    }

    // Lumière
    if (name.includes('Light') || name.includes('Lumière')) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`;
    }

    // Mur
    if (name.includes('Mur')) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`;
    }

    // Sol ou Plafond
    if (name.includes('Sol') || name.includes('Plafond')) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`;
    }

    // Porte
    if (name.includes('Porte')) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 12h.01"/><path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"/><path d="M2 20h20"/></svg>`;
    }

    // Boite
    if (name.includes('Boite')) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`;
    }

    // Forme
    if (name.includes('Forme')) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`;
    }

    // Tapis (objet, pas environnement)
    if (name.includes('Tapis')) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`;
    }

    // Icône par défaut (objet générique)
    return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`;
}

// Fonction pour créer un élément d'arbre d'objets avec icônes d'action
function createObjectTreeItem(obj, level = 0) {
    const isSelected = selectedEditorObjects.includes(obj);
    const hasChildren = obj.children && obj.children.some(child => child.userData.editorName);
    const isVisible = obj.userData.visible !== false;
    const isLocked = obj.userData.locked === true;

    const item = document.createElement('div');
    item.className = `object-tree-item ${isSelected ? 'selected' : ''}`;
    item.style.padding = '3px 4px';
    item.style.paddingLeft = `${4 + (level * 16)}px`; // Indentation basée sur le niveau
    item.style.margin = '1px 0';

    // Apparence selon l'état (verrouillé ou sélectionné)
    if (isLocked) {
        item.style.background = '#3d1f1f'; // Rouge foncé pour verrouillé
        item.style.border = '1px solid #ff4444'; // Bordure rouge
    } else if (isSelected) {
        item.style.background = '#4a7ebf';
        item.style.border = 'none';
    } else {
        item.style.background = '#2a2a2a';
        item.style.border = 'none';
    }

    item.style.borderRadius = '3px';
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.gap = '4px';
    item.style.cursor = 'grab';
    item.style.transition = 'all 0.2s';
    item.draggable = true;
    item.dataset.objectId = obj.uuid;

    // Flèche d'expansion (si a des enfants)
    const arrow = document.createElement('span');
    arrow.className = 'expand-arrow';
    arrow.textContent = hasChildren ? '▸' : '';
    arrow.style.width = '10px';
    arrow.style.opacity = hasChildren ? '1' : '0';
    arrow.style.fontSize = '8px';
    arrow.style.cursor = 'pointer';
    arrow.style.userSelect = 'none';

    // Icône de l'objet
    const icon = document.createElement('span');
    icon.className = 'icon';
    icon.innerHTML = getObjectIcon(obj);
    icon.style.display = 'flex';
    icon.style.alignItems = 'center';

    // Nom de l'objet
    const name = document.createElement('span');
    name.textContent = obj.userData.editorName || 'Objet';
    name.style.flex = '1';
    name.style.fontSize = '10px';
    name.style.color = isVisible ? '#ffffff' : '#666666';
    name.style.textDecoration = isVisible ? 'none' : 'line-through';
    name.style.userSelect = 'none';
    name.dataset.objectUuid = obj.uuid;

    // Double-clic pour renommer (avec délai pour distinguer du simple clic)
    let clickTimer = null;
    name.onclick = (e) => {
        e.stopPropagation();
        if (clickTimer) {
            // Double-clic détecté
            clearTimeout(clickTimer);
            clickTimer = null;
            startRenameObject(obj, name);
        } else {
            // Premier clic - attendre pour voir si c'est un double-clic
            clickTimer = setTimeout(() => {
                clickTimer = null;
                // Simple clic - sélectionner l'objet
                if (e.shiftKey) {
                    toggleObjectSelection(obj);
                } else {
                    selectEditorObject(obj, false);
                }
            }, 250);
        }
    };

    // Conteneur des icônes d'action
    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '4px';
    actions.style.alignItems = 'center';

    // Icône visibilité (eye / eye-off)
    const visibilityBtn = document.createElement('button');
    visibilityBtn.style.background = 'none';
    visibilityBtn.style.border = 'none';
    visibilityBtn.style.cursor = 'pointer';
    visibilityBtn.style.padding = '2px';
    visibilityBtn.style.opacity = '0.7';
    visibilityBtn.style.transition = 'opacity 0.2s';
    visibilityBtn.title = isVisible ? 'Masquer' : 'Afficher';
    visibilityBtn.draggable = false; // Empêcher le drag sur les boutons
    visibilityBtn.innerHTML = `<img src="icones/${isVisible ? 'eye.svg' : 'eye-closed.svg'}" width="12" height="12" style="filter: brightness(0) invert(0.7); pointer-events: none;">`;
    visibilityBtn.onclick = (e) => {
        e.stopPropagation();
        toggleObjectVisibility(obj);
    };
    visibilityBtn.onmousedown = (e) => e.stopPropagation();

    // Icône verrouillage (lock / unlock)
    const lockBtn = document.createElement('button');
    lockBtn.style.background = 'none';
    lockBtn.style.border = 'none';
    lockBtn.style.cursor = 'pointer';
    lockBtn.style.padding = '2px';
    lockBtn.style.opacity = '0.7';
    lockBtn.style.transition = 'opacity 0.2s';
    lockBtn.title = isLocked ? 'Déverrouiller' : 'Verrouiller';
    lockBtn.draggable = false;
    lockBtn.innerHTML = `<img src="icones/${isLocked ? 'lock.svg' : 'lock-open.svg'}" width="12" height="12" style="filter: brightness(0) invert(0.7); pointer-events: none;">`;
    lockBtn.onclick = (e) => {
        e.stopPropagation();
        toggleObjectLock(obj);
    };
    lockBtn.onmousedown = (e) => e.stopPropagation();

    // Icône suppression (trash)
    const deleteBtn = document.createElement('button');
    deleteBtn.style.background = 'none';
    deleteBtn.style.border = 'none';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.style.padding = '2px';
    deleteBtn.style.opacity = '0.7';
    deleteBtn.style.transition = 'opacity 0.2s';
    deleteBtn.title = 'Supprimer';
    deleteBtn.draggable = false;
    deleteBtn.innerHTML = `<img src="icones/trash-2.svg" width="12" height="12" style="filter: brightness(0) invert(0.7); pointer-events: none;">`;
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        confirmDeleteObject(obj);
    };
    deleteBtn.onmousedown = (e) => e.stopPropagation();

    actions.appendChild(visibilityBtn);
    actions.appendChild(lockBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(arrow);
    item.appendChild(icon);
    item.appendChild(name);
    item.appendChild(actions);

    // Événement clic pour sélection (sauf sur le nom qui a son propre gestionnaire)
    item.onclick = (e) => {
        if (e.target === item || e.target === icon) {
            e.stopPropagation();
            if (e.shiftKey) {
                toggleObjectSelection(obj);
            } else {
                selectEditorObject(obj, false);
            }
        }
    };

    // Événement clic sur la flèche pour expansion
    arrow.onclick = (e) => {
        e.stopPropagation();
        if (hasChildren) {
            const isExpanded = item.dataset.expanded === 'true';
            item.dataset.expanded = !isExpanded;
            arrow.textContent = !isExpanded ? '▾' : '▸';

            const childrenContainer = item.nextElementSibling;
            if (childrenContainer && childrenContainer.classList.contains('object-tree-children')) {
                childrenContainer.style.display = !isExpanded ? 'block' : 'none';
            }
        }
    };

    // ===== DRAG & DROP pour réorganiser =====
    item.ondragstart = (e) => {
        // Empêcher le drag si on clique sur les boutons d'action
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'IMG') {
            e.preventDefault();
            return false;
        }

        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', obj.uuid);
        item.style.opacity = '0.4';
        item.style.cursor = 'grabbing';
        console.log('🎯 Début drag:', obj.userData.editorName);
    };

    item.ondragend = (e) => {
        item.style.opacity = '1';
        item.style.cursor = 'grab';

        // Restaurer l'apparence selon l'état
        if (isLocked) {
            item.style.background = '#3d1f1f';
            item.style.border = '1px solid #ff4444';
        } else if (isSelected) {
            item.style.background = '#4a7ebf';
            item.style.border = 'none';
        } else {
            item.style.background = '#2a2a2a';
            item.style.border = 'none';
        }
    };

    item.ondragover = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';

        // Indicateur visuel de zone de drop
        item.style.background = '#2a5a4a';
        item.style.border = '2px dashed #4ade80';
    };

    item.ondragleave = (e) => {
        e.preventDefault();

        // Restaurer l'apparence selon l'état
        if (isLocked) {
            item.style.background = '#3d1f1f';
            item.style.border = '1px solid #ff4444';
        } else if (isSelected) {
            item.style.background = '#4a7ebf';
            item.style.border = 'none';
        } else {
            item.style.background = '#2a2a2a';
            item.style.border = 'none';
        }
    };

    item.ondrop = (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Restaurer l'apparence selon l'état
        if (isLocked) {
            item.style.background = '#3d1f1f';
            item.style.border = '1px solid #ff4444';
        } else if (isSelected) {
            item.style.background = '#4a7ebf';
            item.style.border = 'none';
        } else {
            item.style.background = '#2a2a2a';
            item.style.border = 'none';
        }

        const draggedId = e.dataTransfer.getData('text/plain');
        const draggedObj = scene.getObjectByProperty('uuid', draggedId);

        if (draggedObj && draggedObj !== obj && draggedObj.parent) {
            // Vérifier qu'on ne déplace pas un parent vers son propre enfant
            let isChild = false;
            obj.traverseAncestors((ancestor) => {
                if (ancestor === draggedObj) isChild = true;
            });

            if (!isChild) {
                // Retirer de l'ancien parent
                draggedObj.parent.remove(draggedObj);

                // Ajouter au nouvel objet parent
                obj.add(draggedObj);

                console.log(`📦 ${draggedObj.userData.editorName} déplacé sous ${obj.userData.editorName}`);
                updateObjectsList();
            } else {
                console.warn('⚠️ Impossible de déplacer un parent vers son propre enfant');
            }
        }
    };

    // Créer un wrapper qui contient l'item et ses enfants
    const wrapper = document.createElement('div');
    wrapper.appendChild(item);

    // Si l'objet a des enfants, créer un conteneur pour eux
    if (hasChildren) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'object-tree-children';
        childrenContainer.style.display = 'none'; // Replié par défaut

        // Ajouter récursivement tous les enfants
        obj.children.forEach(child => {
            if (child.userData.editorName) {
                const childWrapper = createObjectTreeItem(child, level + 1);
                childrenContainer.appendChild(childWrapper);
            }
        });

        wrapper.appendChild(childrenContainer);
    }

    return wrapper;
}

// Fonction pour gérer l'ouverture/fermeture des accordéons style Blender
function toggleAccordion(header) {
    const accordion = header.parentElement;
    const content = header.nextElementSibling;
    const arrow = header.querySelector('.accordion-arrow');

    if (content.style.display === 'none' || content.style.display === '') {
        content.style.display = 'block';
        arrow.textContent = '▾';
    } else {
        content.style.display = 'none';
        arrow.textContent = '▸';
    }
}

// Fonction pour mettre à jour la liste des objets dans le panneau (style Blender Outliner)
function updateObjectsList() {
    const listEl = document.getElementById('objects-list');
    if (!listEl) {
        console.error('❌ Élément objects-list non trouvé !');
        return;
    }

    console.log(`🔄 updateObjectsList() appelée - ${selectableObjects.length} objets disponibles`);

    listEl.innerHTML = '';
    listEl.style.background = '#2a2a2a';
    listEl.style.border = '1px solid #3a3a3a';

    // Grouper les objets par type
    const groupedObjects = {
        'Personnages': [],
        'Environnement': [],
        'Objets': []
    };

    // Filtrer pour n'avoir que les objets de premier niveau (parent = scene)
    const uniqueObjects = [];
    const seenNames = new Set();

    selectableObjects.forEach(obj => {
        // Ne montrer que les objets dont le parent est la scène (pas les enfants d'autres objets)
        if (obj.userData.editorName && !seenNames.has(obj.userData.editorName) && obj.parent === scene) {
            seenNames.add(obj.userData.editorName);
            uniqueObjects.push(obj);

            const name = obj.userData.editorName;

            // Personnages et animaux (flag isCharacter ou nom contenant Naby/Animal/Personnage)
            if (obj.userData.isCharacter || name.includes('Naby') || name.includes('Animal') || name.includes('Personnage')) {
                groupedObjects['Personnages'].push(obj);
            }
            // Environnement : Murs, Portes, Fenêtres, Sol, Plafond
            else if (name.includes('Mur') || name.includes('Sol') || name.includes('Plafond') ||
                     name.includes('Porte') || name.includes('Fenêtre') || name.includes('Fenetre')) {
                groupedObjects['Environnement'].push(obj);
            }
            // Objets : Tout le reste (Formes, Boîtes, Tapis, Importés, etc.)
            else {
                groupedObjects['Objets'].push(obj);
            }
        }
    });

    // Afficher un message si aucun objet n'est trouvé
    if (uniqueObjects.length === 0) {
        listEl.innerHTML = '<div style="padding: 8px; color: #999; text-align: center; font-size: 10px;">Chargement des objets...</div>';
        console.warn('⚠️ Aucun objet disponible pour l\'affichage');
        return;
    }

    // Créer les sections
    Object.entries(groupedObjects).forEach(([groupName, objects]) => {
        if (objects.length === 0) return;

        // En-tête de groupe
        const groupHeader = document.createElement('div');
        groupHeader.className = 'object-tree-item';
        groupHeader.style.fontWeight = '600';
        groupHeader.style.fontSize = '10px';
        groupHeader.style.background = '#323232';
        groupHeader.style.padding = '2px 3px';
        groupHeader.style.display = 'flex';
        groupHeader.style.alignItems = 'center';
        groupHeader.style.gap = '4px';
        groupHeader.dataset.groupName = groupName;

        // Flèche d'expansion
        const arrow = document.createElement('span');
        arrow.className = 'expand-arrow';
        arrow.style.fontSize = '8px';
        arrow.style.cursor = 'pointer';
        arrow.textContent = '▾';

        // Nom du groupe
        const groupNameSpan = document.createElement('span');
        groupNameSpan.textContent = groupName;
        groupNameSpan.style.flex = '1';
        groupNameSpan.style.cursor = 'pointer';

        // Icône de verrouillage de groupe
        const groupLockBtn = document.createElement('button');
        groupLockBtn.style.background = 'none';
        groupLockBtn.style.border = 'none';
        groupLockBtn.style.cursor = 'pointer';
        groupLockBtn.style.padding = '2px';
        groupLockBtn.style.opacity = '0.7';
        groupLockBtn.draggable = false;
        groupLockBtn.innerHTML = `<img src="icones/lock-open.svg" width="12" height="12" style="filter: brightness(0) invert(0.7); pointer-events: none;">`;
        groupLockBtn.title = 'Verrouiller tous les objets de cette catégorie';

        groupLockBtn.onclick = (e) => {
            e.stopPropagation();
            toggleGroupLock(groupName, objects, groupHeader, groupLockBtn);
        };

        groupHeader.appendChild(arrow);
        groupHeader.appendChild(groupNameSpan);
        groupHeader.appendChild(groupLockBtn);

        // Clic sur la flèche ou le nom pour expand/collapse
        const toggleExpand = (e) => {
            e.stopPropagation();
            const isOpen = arrow.textContent === '▾';
            arrow.textContent = isOpen ? '▸' : '▾';
            const container = groupHeader.nextElementSibling;
            if (container) {
                container.style.display = isOpen ? 'none' : 'block';
            }
        };

        arrow.onclick = toggleExpand;
        groupNameSpan.onclick = toggleExpand;

        listEl.appendChild(groupHeader);

        // Container pour les objets du groupe
        const groupContainer = document.createElement('div');
        groupContainer.className = 'object-tree-children';

        objects.forEach(obj => {
            const itemWrapper = createObjectTreeItem(obj, 0);
            groupContainer.appendChild(itemWrapper);
        });

        listEl.appendChild(groupContainer);
    });

    console.log(`✅ updateObjectsList() terminée - ${uniqueObjects.length} objets uniques affichés`);
}

// Fonction pour renommer un objet par double-clic
function startRenameObject(obj, nameElement) {
    const currentName = obj.userData.editorName || 'Objet';

    // Créer un champ de saisie
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.style.flex = '1';
    input.style.fontSize = '10px';
    input.style.padding = '1px 4px';
    input.style.border = '1px solid #4a7ebf';
    input.style.borderRadius = '2px';
    input.style.background = '#1a1a1a';
    input.style.color = '#ffffff';
    input.style.outline = 'none';
    input.style.minWidth = '50px';

    // Remplacer le span par l'input
    nameElement.style.display = 'none';
    nameElement.parentElement.insertBefore(input, nameElement);

    // Sélectionner le texte
    input.focus();
    input.select();

    // Fonction pour valider le renommage
    const confirmRename = () => {
        const newName = input.value.trim();
        if (newName && newName !== currentName) {
            // Enregistrer dans l'historique
            recordAction('rename-object',
                { object: obj, previousName: currentName },
                { object: obj, newName: newName },
                `Renommage: "${currentName}" → "${newName}"`
            );

            obj.userData.editorName = newName;
            if (obj.userData.originalName === undefined) {
                obj.userData.originalName = currentName;
            }
            // Mettre à jour le mesh si c'est un mur
            if (obj.userData.wallId !== undefined) {
                const wall = floorPlanWalls.find(w => w.id === obj.userData.wallId);
                if (wall) {
                    wall.name = newName;
                }
            }
            console.log(`✏️ Objet renommé: "${currentName}" → "${newName}"`);
            markUnsavedChanges();
        }
        // Restaurer l'affichage
        input.remove();
        nameElement.textContent = obj.userData.editorName;
        nameElement.style.display = '';
    };

    // Fonction pour annuler le renommage
    const cancelRename = () => {
        input.remove();
        nameElement.style.display = '';
    };

    // Événements
    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            confirmRename();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelRename();
        }
        e.stopPropagation();
    };

    input.onblur = () => {
        confirmRename();
    };

    // Empêcher la propagation des clics
    input.onclick = (e) => e.stopPropagation();
    input.ondblclick = (e) => e.stopPropagation();
}

// Fonction pour basculer la sélection d'un objet (pour sélection multiple)
function toggleObjectSelection(object) {
    // Empêcher la sélection d'objets verrouillés
    if (object.userData.locked === true) {
        console.warn('🔒 Impossible de sélectionner un objet verrouillé:', object.userData.editorName);
        return;
    }

    const index = selectedEditorObjects.indexOf(object);

    if (index > -1) {
        // Désélectionner
        selectedEditorObjects.splice(index, 1);
    } else {
        // Ajouter à la sélection
        selectedEditorObjects.push(object);
    }

    // Mettre à jour l'objet principal sélectionné (dernier de la liste)
    if (selectedEditorObjects.length > 0) {
        selectedEditorObject = selectedEditorObjects[selectedEditorObjects.length - 1];
        transformControl.attach(selectedEditorObject);
    } else {
        selectedEditorObject = null;
        transformControl.detach();
    }

    updateObjectsList();
    updateSelectionUI();
}

// Mise à jour de l'interface pour la sélection
function updateSelectionUI() {
    const count = selectedEditorObjects.length;

    // Toujours garder ces sections visibles
    // Elles doivent être accessibles même sans sélection
    document.getElementById('object-info').style.display = 'block';
    // history-controls supprimé - historique global via Ctrl+Z/Y

    // Mettre à jour l'interface selon la sélection
    if (count === 1) {
        updateObjectInfo();
    }
}

function selectEditorObject(object, multiSelect = false) {
    // Empêcher la sélection d'objets verrouillés
    if (object.userData.locked === true) {
        console.warn('🔒 Impossible de sélectionner un objet verrouillé:', object.userData.editorName);
        return;
    }

    if (multiSelect) {
        // Mode sélection multiple
        toggleObjectSelection(object);
    } else {
        // Mode sélection simple - remplace la sélection
        selectedEditorObjects = [object];
        selectedEditorObject = object;

        // Attacher le gizmo à l'objet
        transformControl.attach(object);

        // Mettre à jour l'interface
        document.getElementById('object-info').style.display = 'block';
        // history-controls supprimé - historique global via Ctrl+Z/Y

        // Mettre à jour les informations
        updateObjectInfo();
        updateObjectsList();

        console.log('✅ Objet sélectionné:', object.userData.editorName);
    }
}

// ==================== GESTION VISIBILITÉ/VERROUILLAGE/SUPPRESSION ====================

function toggleGroupLock(groupName, objects, groupHeader, lockBtn) {
    // Vérifier si au moins un objet du groupe est déverrouillé
    const hasUnlocked = objects.some(obj => obj.userData.locked !== true);
    const newLockState = hasUnlocked; // Si au moins un est déverrouillé, on verrouille tout

    // Verrouiller/déverrouiller tous les objets du groupe
    objects.forEach(obj => {
        obj.userData.locked = newLockState;

        // Appliquer à tous les enfants
        obj.traverse((child) => {
            if (child.userData) {
                child.userData.locked = newLockState;
            }
        });

        // Si l'objet était sélectionné et qu'on le verrouille, désélectionner
        if (newLockState && selectedEditorObject === obj) {
            transformControl.detach();
            deselectEditorObject();
        }
    });

    // Mettre à jour l'apparence de l'en-tête
    if (newLockState) {
        groupHeader.style.background = '#3d1f1f'; // Rouge foncé
        groupHeader.style.border = '1px solid #ff4444'; // Bordure rouge
        lockBtn.innerHTML = `<img src="icones/lock.svg" width="12" height="12" style="filter: brightness(0) invert(0.7); pointer-events: none;">`;
        lockBtn.title = 'Déverrouiller tous les objets de cette catégorie';
    } else {
        groupHeader.style.background = '#323232'; // Couleur normale
        groupHeader.style.border = 'none';
        lockBtn.innerHTML = `<img src="icones/lock-open.svg" width="12" height="12" style="filter: brightness(0) invert(0.7); pointer-events: none;">`;
        lockBtn.title = 'Verrouiller tous les objets de cette catégorie';
    }

    updateObjectsList();
    console.log(`🔒 Groupe "${groupName}": ${newLockState ? 'verrouillé' : 'déverrouillé'}`);
}

function toggleObjectVisibility(obj) {
    const isVisible = obj.userData.visible !== false;
    obj.userData.visible = !isVisible;
    obj.visible = !isVisible;

    // Appliquer à tous les enfants
    obj.traverse((child) => {
        child.visible = !isVisible;
        if (child.userData) {
            child.userData.visible = !isVisible;
        }
    });

    updateObjectsList();
    console.log(`👁️ ${obj.userData.editorName}: ${!isVisible ? 'visible' : 'masqué'}`);
}

function toggleObjectLock(obj) {
    const isLocked = obj.userData.locked === true;
    obj.userData.locked = !isLocked;

    // Appliquer à tous les enfants
    obj.traverse((child) => {
        if (child.userData) {
            child.userData.locked = !isLocked;
        }
    });

    // Si on vient de verrouiller et que l'objet est sélectionné, détacher le gizmo
    if (!isLocked && selectedEditorObject === obj) {
        transformControl.detach();
        deselectEditorObject();
    }

    updateObjectsList();
    console.log(`🔒 ${obj.userData.editorName}: ${!isLocked ? 'verrouillé' : 'déverrouillé'}`);
}

function createFolder() {
    const folderName = prompt('Nom du nouveau dossier:', 'Nouveau Dossier');

    if (folderName && folderName.trim()) {
        // Créer un Object3D vide qui servira de dossier
        const folder = new THREE.Object3D();
        folder.name = folderName.trim();
        folder.userData.editorName = folderName.trim();
        folder.userData.isFolder = true;
        folder.userData.visible = true;
        folder.userData.locked = false;

        // Ajouter à la scène
        scene.add(folder);

        // Ajouter à selectableObjects
        selectableObjects.push(folder);

        // Mettre à jour la liste
        updateObjectsList();

        console.log(`📁 Dossier "${folderName}" créé`);
    }
}

function confirmDeleteObject(obj) {
    const objName = obj.userData.editorName || 'Objet';

    // Créer une modal de confirmation
    const confirmMsg = `Voulez-vous vraiment supprimer "${objName}" ?\nCette action est irréversible.`;

    if (confirm(confirmMsg)) {
        deleteObject(obj);
    }
}

function deleteObject(obj) {
    const objName = obj.userData.editorName || 'Objet';
    const parent = obj.parent;

    // Enregistrer dans l'historique AVANT de supprimer
    recordAction('delete-object',
        { object: obj, parent: parent },
        { object: obj },
        `Suppression de ${objName}`
    );

    // Retirer de la scène
    if (parent) {
        parent.remove(obj);
    }

    // Retirer de selectableObjects
    const index = selectableObjects.indexOf(obj);
    if (index > -1) {
        selectableObjects.splice(index, 1);
    }

    // Retirer de importedObjects si c'est un objet importé
    const importedIndex = importedObjects.indexOf(obj);
    if (importedIndex > -1) {
        importedObjects.splice(importedIndex, 1);
        console.log(`🗑️ Objet retiré de importedObjects (reste ${importedObjects.length} objets)`);
    }

    // Désélectionner si c'était l'objet sélectionné
    if (selectedEditorObject === obj) {
        deselectEditorObject();
    }

    // Mettre à jour l'interface
    updateObjectsList();

    // Marquer comme ayant des changements non sauvegardés
    markUnsavedChanges();

    console.log(`🗑️ "${objName}" supprimé de la scène`);
}

function deselectEditorObject() {
    selectedEditorObject = null;
    selectedEditorObjects = [];
    transformControl.detach();

    // Les sections restent visibles
    updateObjectsList();
}

function setTransformMode(mode) {
    currentTransformMode = mode;
    transformControl.setMode(mode);

    // Mettre à jour les styles des boutons avec DaisyUI
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-ghost');
        btn.classList.remove('active');
    });

    const activeBtn = document.getElementById(`mode-${mode}`);
    activeBtn.classList.remove('btn-ghost');
    activeBtn.classList.add('btn-primary');
    activeBtn.classList.add('active');

    // Réinitialiser les cases à cocher (tous les axes activés par défaut)
    document.getElementById('axis-x').checked = true;
    document.getElementById('axis-y').checked = true;
    document.getElementById('axis-z').checked = true;
    updateAxisControls();

    // Mettre à jour le texte d'aide selon le mode
    const helpText = document.getElementById('axis-help-text');
    if (mode === 'translate') {
        helpText.textContent = 'Décochez les axes pour verrouiller le déplacement';
    } else if (mode === 'rotate') {
        helpText.textContent = 'Décochez les axes pour verrouiller la rotation';
    } else if (mode === 'scale') {
        helpText.textContent = 'Décochez les axes pour verrouiller la mise à l\'échelle';
    }
}

function updateObjectInfo() {
    if (!selectedEditorObject) return;

    const obj = selectedEditorObject;

    // Mettre à jour les champs de saisie manuelle
    document.getElementById('manual-pos-x').value = obj.position.x.toFixed(2);
    document.getElementById('manual-pos-y').value = obj.position.y.toFixed(2);
    document.getElementById('manual-pos-z').value = obj.position.z.toFixed(2);

    document.getElementById('manual-rot-x').value = (obj.rotation.x * 180 / Math.PI).toFixed(0);
    document.getElementById('manual-rot-y').value = (obj.rotation.y * 180 / Math.PI).toFixed(0);
    document.getElementById('manual-rot-z').value = (obj.rotation.z * 180 / Math.PI).toFixed(0);

    document.getElementById('manual-scale-x').value = obj.scale.x.toFixed(2);
    document.getElementById('manual-scale-y').value = obj.scale.y.toFixed(2);
    document.getElementById('manual-scale-z').value = obj.scale.z.toFixed(2);

    // Mettre à jour le contrôle de roughness
    const roughnessSlider = document.getElementById('roughness-slider');
    const roughnessValue = document.getElementById('roughness-value');

    // Vérifier si l'objet a un matériau avec roughness
    let hasMaterial = false;
    obj.traverse((child) => {
        if (child.isMesh && child.material && child.material.roughness !== undefined) {
            hasMaterial = true;
            roughnessSlider.value = child.material.roughness;
            roughnessValue.textContent = child.material.roughness.toFixed(2);
            roughnessSlider.disabled = false;
        }
    });

    if (!hasMaterial) {
        roughnessSlider.disabled = true;
        roughnessValue.textContent = '-';
    }

    // Mettre à jour l'étiquette de dimensions
    showDimensionsLabel(obj);
}

function showDimensionsLabel(obj) {
    const label = document.getElementById('object-dimensions-label');
    if (!obj || interactionMode === 'game') {
        label.style.display = 'none';
        return;
    }

    // Calculer les dimensions
    let size;
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);

    if (obj.userData.referenceHeightAtScale1) {
        // Personnages (SkinnedMesh) : utiliser la hauteur de référence mesurée par os × échelle
        const scaleY = Math.abs(obj.scale.y);
        const scaleX = Math.abs(obj.scale.x);
        const scaleZ = Math.abs(obj.scale.z);
        size = new THREE.Vector3(
            (obj.userData.referenceWidthAtScale1 || obj.userData.referenceHeightAtScale1 * 0.3) * scaleX,
            obj.userData.referenceHeightAtScale1 * scaleY,
            (obj.userData.referenceDepthAtScale1 || obj.userData.referenceHeightAtScale1 * 0.2) * scaleZ
        );
    } else {
        // Fallback: mesure par os en temps réel si le modèle a des bones
        const boneMeasure = (typeof measureCharacterByBones === 'function') ? measureCharacterByBones(obj) : null;
        if (boneMeasure && boneMeasure.boneCount >= 5) {
            size = new THREE.Vector3(boneMeasure.width, boneMeasure.height, boneMeasure.depth);
        } else {
            size = box.getSize(new THREE.Vector3());
        }
    }

    // Convertir en cm (1 unité = 1 mètre)
    const cmScale = 100;
    const widthCm = (size.x * cmScale).toFixed(1);
    const depthCm = (size.z * cmScale).toFixed(1);
    const heightCm = (size.y * cmScale).toFixed(1);

    // Nom de l'objet
    const name = obj.userData.editorName || obj.name || 'Objet';
    document.getElementById('dim-label-name').textContent = name;
    document.getElementById('dim-label-w').textContent = widthCm;
    document.getElementById('dim-label-d').textContent = depthCm;
    document.getElementById('dim-label-h').textContent = heightCm;

    // Positionner au-dessus de l'objet
    let topCenter;
    if (obj.userData.referenceHeightAtScale1) {
        topCenter = new THREE.Vector3(
            obj.position.x,
            obj.position.y + size.y,
            obj.position.z
        );
    } else {
        topCenter = new THREE.Vector3(
            (box.min.x + box.max.x) / 2,
            box.max.y,
            (box.min.z + box.max.z) / 2
        );
    }
    topCenter.project(camera);

    const rect = renderer.domElement.getBoundingClientRect();
    const screenX = (topCenter.x * 0.5 + 0.5) * rect.width + rect.left;
    const screenY = (-topCenter.y * 0.5 + 0.5) * rect.height + rect.top;

    // Vérifier que le point est devant la caméra
    if (topCenter.z > 1) {
        label.style.display = 'none';
        return;
    }

    label.style.left = screenX + 'px';
    label.style.top = screenY + 'px';
    label.style.display = 'block';
}

function hideDimensionsLabel() {
    document.getElementById('object-dimensions-label').style.display = 'none';
}

function updateDimensionsLabelPosition() {
    if (interactionMode === 'game') return;
    const label = document.getElementById('object-dimensions-label');
    if (label.style.display === 'none') return;

    // Déterminer l'objet cible (objet sélectionné ou mur sélectionné)
    let obj = selectedEditorObject;
    if (!obj && selectedWalls && selectedWalls.length > 0 && selectedWalls[selectedWalls.length - 1].mesh) {
        obj = selectedWalls[selectedWalls.length - 1].mesh;
    }
    if (!obj) { label.style.display = 'none'; return; }

    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);

    const topCenter = new THREE.Vector3(
        (box.min.x + box.max.x) / 2,
        box.max.y,
        (box.min.z + box.max.z) / 2
    );
    topCenter.project(camera);

    if (topCenter.z > 1) {
        label.style.display = 'none';
        return;
    }

    const rect = renderer.domElement.getBoundingClientRect();
    label.style.left = ((topCenter.x * 0.5 + 0.5) * rect.width + rect.left) + 'px';
    label.style.top = ((-topCenter.y * 0.5 + 0.5) * rect.height + rect.top) + 'px';
    label.style.display = 'block';
}

function applyManualValues() {
    if (!selectedEditorObject) return;

    // Sauvegarder l'état avant modification
    saveTransformState();

    // Appliquer la position
    selectedEditorObject.position.x = parseFloat(document.getElementById('manual-pos-x').value) || 0;
    selectedEditorObject.position.y = parseFloat(document.getElementById('manual-pos-y').value) || 0;
    selectedEditorObject.position.z = parseFloat(document.getElementById('manual-pos-z').value) || 0;

    // Appliquer la rotation (convertir degrés en radians)
    selectedEditorObject.rotation.x = (parseFloat(document.getElementById('manual-rot-x').value) || 0) * Math.PI / 180;
    selectedEditorObject.rotation.y = (parseFloat(document.getElementById('manual-rot-y').value) || 0) * Math.PI / 180;
    selectedEditorObject.rotation.z = (parseFloat(document.getElementById('manual-rot-z').value) || 0) * Math.PI / 180;

    // Appliquer l'échelle
    selectedEditorObject.scale.x = parseFloat(document.getElementById('manual-scale-x').value) || 1;
    selectedEditorObject.scale.y = parseFloat(document.getElementById('manual-scale-y').value) || 1;
    selectedEditorObject.scale.z = parseFloat(document.getElementById('manual-scale-z').value) || 1;

    // Mettre à jour la matrice
    selectedEditorObject.updateMatrixWorld(true);

    // Sauvegarder automatiquement dans localStorage
    if (selectedEditorObject.userData.isImported) {
        saveImportedObjectsToStorage();
    }

    console.log('✅ Valeurs manuelles appliquées');
}

function snapObjectToGround() {
    if (!selectedEditorObject) {
        console.log('⚠️ Aucun objet sélectionné');
        return;
    }

    // Sauvegarder l'état avant modification
    saveTransformState();

    // Mettre à jour la matrice pour calculer correctement la bounding box
    selectedEditorObject.updateMatrixWorld(true);

    // Calculer la bounding box de l'objet dans l'espace world
    const boundingBox = new THREE.Box3().setFromObject(selectedEditorObject);

    // Calculer la taille de l'objet
    const size = boundingBox.getSize(new THREE.Vector3());

    // Calculer la position Y minimale de l'objet (le point le plus bas)
    const minY = boundingBox.min.y;

    // Calculer le décalage nécessaire pour poser l'objet au sol
    // Le sol est à y = 0, donc on ajuste la position Y de l'objet
    const heightOffset = -minY;

    // Appliquer la nouvelle position Y (garder X et Z inchangés)
    selectedEditorObject.position.y += heightOffset;

    // Mettre à jour la matrice
    selectedEditorObject.updateMatrixWorld(true);

    // Mettre à jour l'affichage dans le panneau
    updateManualInputs();

    // Sauvegarder automatiquement dans localStorage
    if (selectedEditorObject.userData.isImported) {
        saveImportedObjectsToStorage();
    }

    console.log(`📐 Objet posé au sol (ajustement Y: ${heightOffset.toFixed(2)})`);
}

function copyCoordinates() {
    let code = '// Coordonnées des objets modifiés dans l\'éditeur\n\n';

    selectableObjects.forEach(obj => {
        if (obj && obj.userData.editorName) {
            const name = obj.userData.editorName;
            code += `// ${name}\n`;
            code += `// Position: (${obj.position.x.toFixed(2)}, ${obj.position.y.toFixed(2)}, ${obj.position.z.toFixed(2)})\n`;
            code += `// Rotation: (${(obj.rotation.x * 180 / Math.PI).toFixed(0)}°, ${(obj.rotation.y * 180 / Math.PI).toFixed(0)}°, ${(obj.rotation.z * 180 / Math.PI).toFixed(0)}°)\n`;
            code += `// Échelle: (${obj.scale.x.toFixed(2)}, ${obj.scale.y.toFixed(2)}, ${obj.scale.z.toFixed(2)})\n\n`;
        }
    });

    // Copier dans le presse-papiers
    navigator.clipboard.writeText(code).then(() => {
        // Effacer l'historique après validation
        clearHistory();

        alert('📋 Coordonnées copiées dans le presse-papiers !\n\nL\'historique a été effacé.\nVous pouvez maintenant me coller ce code pour que je l\'intègre définitivement dans room_1.html');
    }).catch(err => {
        console.error('Erreur lors de la copie:', err);
        alert('❌ Erreur lors de la copie. Vérifiez la console.');
    });
}

