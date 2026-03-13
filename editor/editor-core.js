// Initialiser le système d'édition
function initEditor() {
    // Créer le TransformControl pour les objets (gizmo visuel)
    transformControl = new THREE.TransformControls(camera, renderer.domElement);
    transformControl.setMode('translate'); // Mode par défaut: Position
    transformControl.setSize(1.2); // Taille des gizmos
    scene.add(transformControl);

    // Désactiver les contrôles OrbitControls quand on manipule le gizmo
    transformControl.addEventListener('dragging-changed', (event) => {
        controls.enabled = !event.value;
    });

    // Mettre à jour les infos en temps réel pendant la transformation
    transformControl.addEventListener('objectChange', () => {
        updateObjectInfo();
    });

    // Sauvegarder l'état AVANT de commencer la transformation
    let transformStartState = null;
    transformControl.addEventListener('mouseDown', () => {
        if (selectedEditorObject) {
            // Stocker l'état initial avant la transformation
            transformStartState = {
                object: selectedEditorObject,
                position: selectedEditorObject.position.clone(),
                rotation: selectedEditorObject.rotation.clone(),
                scale: selectedEditorObject.scale.clone()
            };
        }
    });

    // Enregistrer la transformation dans l'historique quand on relâche
    transformControl.addEventListener('mouseUp', () => {
        if (selectedEditorObject && transformStartState) {
            // Enregistrer dans l'historique global
            recordAction('transform',
                {
                    object: transformStartState.object,
                    position: transformStartState.position,
                    rotation: transformStartState.rotation,
                    scale: transformStartState.scale
                },
                {
                    object: selectedEditorObject,
                    position: selectedEditorObject.position.clone(),
                    rotation: selectedEditorObject.rotation.clone(),
                    scale: selectedEditorObject.scale.clone()
                },
                `Transformation de ${selectedEditorObject.userData.editorName || 'objet'}`
            );
            transformStartState = null;

            // Marquer comme ayant des changements non sauvegardés
            markUnsavedChanges();

            // Sauvegarder si c'est un objet importé
            if (selectedEditorObject.userData.isImported) {
                saveImportedObjectsToStorage();
            }
        }
    });

    // Masquer le gizmo par défaut
    transformControl.detach();

    // Créer les gizmos pour caméra et lumières
    createCameraGizmo();
    createLightGizmo();
    createTargetGizmo();

    // Rendre tous les objets sélectionnables
    makeObjectsSelectable();

    // Bouton toggle éditeur (icône wrench)
    document.getElementById('toggle-editor-btn').onclick = toggleEditor;

    // Bouton fermer l'éditeur (icône X dans le panneau)
    document.getElementById('close-editor-btn').onclick = toggleEditor;

    // Bouton créer un dossier
    document.getElementById('add-folder-btn').onclick = createFolder;

    // Switch Mode Jeu/Développeur (panneau éditeur + bouton flottant)
    document.getElementById('interaction-mode-switch').onclick = toggleInteractionMode;
    document.getElementById('floating-mode-switch').onclick = toggleInteractionMode;

    // Bouton de sauvegarde
    document.getElementById('save-project-btn').onclick = saveProject;

    // Boutons de mode de transformation
    document.getElementById('mode-translate').onclick = () => setTransformMode('translate');
    document.getElementById('mode-rotate').onclick = () => setTransformMode('rotate');
    document.getElementById('mode-scale').onclick = () => setTransformMode('scale');

    // Bouton appliquer les valeurs manuelles
    document.getElementById('apply-manual-values').onclick = applyManualValues;
    document.getElementById('snap-to-ground').onclick = snapObjectToGround;

    // Événements pour mise à jour en temps réel des champs manuels
    ['manual-pos-x', 'manual-pos-y', 'manual-pos-z'].forEach(id => {
        document.getElementById(id).addEventListener('input', applyManualValues);
    });
    ['manual-rot-x', 'manual-rot-y', 'manual-rot-z'].forEach(id => {
        document.getElementById(id).addEventListener('input', applyManualValues);
    });
    ['manual-scale-x', 'manual-scale-y', 'manual-scale-z'].forEach(id => {
        document.getElementById(id).addEventListener('input', applyManualValues);
    });

    // Slider de roughness
    document.getElementById('roughness-slider').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        document.getElementById('roughness-value').textContent = value.toFixed(2);

        if (selectedEditorObject) {
            // Appliquer le roughness à tous les matériaux de l'objet
            selectedEditorObject.traverse((child) => {
                if (child.isMesh && child.material && child.material.roughness !== undefined) {
                    child.material.roughness = value;
                    child.material.needsUpdate = true;
                }
            });

            // Sauvegarder dans userData pour persistence
            selectedEditorObject.userData.customRoughness = value;

            // Sauvegarder si c'est un objet importé
            if (selectedEditorObject.userData.isImported) {
                saveImportedObjectsToStorage();
            }

            console.log(`🔧 Roughness ajusté: ${value.toFixed(2)}`);
        }
    });

    // Cases à cocher pour les axes
    document.getElementById('axis-x').addEventListener('change', updateAxisControls);
    document.getElementById('axis-y').addEventListener('change', updateAxisControls);
    document.getElementById('axis-z').addEventListener('change', updateAxisControls);

    // Raccourcis clavier Ctrl+Z / Ctrl+Y pour l'historique global
    window.addEventListener('keydown', handleEditorKeyboard, false);
    window.addEventListener('keyup', handleEditorKeyUp, false);

    // Événement de clic pour sélectionner les objets
    window.addEventListener('click', onEditorClick, false);
    // Utiliser pointerdown (utilisé par OrbitControls) avec capture:true
    renderer.domElement.addEventListener('pointerdown', onFloorPlanMouseDown, true);
    renderer.domElement.addEventListener('mousedown', onFloorPlanMouseDown, true);
    window.addEventListener('mousemove', onFloorPlanMouseMove, false);
    window.addEventListener('pointermove', onFloorPlanMouseMove, false);
    renderer.domElement.addEventListener('pointerup', onFloorPlanMouseUp, true);
    renderer.domElement.addEventListener('mouseup', onFloorPlanMouseUp, true);

    // Empêcher le menu contextuel lors de la rotation ou du déplacement
    renderer.domElement.addEventListener('contextmenu', (event) => {
        if (currentEditorMode === 'floor-plan' && floorPlanMode === 'select' && selectedWalls.length > 0) {
            event.preventDefault();
        }
    }, true);

    // Boutons de mode éditeur (Objets/Caméra/Lumières/Plan)
    document.getElementById('mode-objects').onclick = () => switchEditorMode('objects');
    document.getElementById('mode-camera').onclick = () => switchEditorMode('camera');
    document.getElementById('mode-lights').onclick = () => switchEditorMode('lights');
    document.getElementById('mode-floor-plan').onclick = () => switchEditorMode('floor-plan');
    document.getElementById('mode-game-setup').onclick = () => switchEditorMode('game-setup');
    document.getElementById('mode-audio').onclick = () => switchEditorMode('audio');

    // Panneau Éléments de jeu - Position de départ
    document.getElementById('tool-spawn-player').onclick = () => activateSpawnTool();
    document.getElementById('btn-save-spawn').onclick = () => saveSpawnPosition();

    // (Curseurs vitesse de déplacement supprimés — valeurs fixes walkSpeed/runSpeed)

    // Panneau Éléments de jeu - Zones d'interaction
    // Surface mode selector
    document.getElementById('zone-mode-floor').onclick = () => setZoneSurfaceMode('floor');
    document.getElementById('zone-mode-ceiling').onclick = () => setZoneSurfaceMode('ceiling');
    document.getElementById('zone-mode-wall').onclick = () => setZoneSurfaceMode('wall');
    document.getElementById('zone-mode-object').onclick = () => setZoneSurfaceMode('object');
    document.getElementById('zone-mode-character').onclick = () => setZoneSurfaceMode('character');

    document.getElementById('tool-zone-rect').onclick = () => {
        if (activeZoneTool === 'rect') deactivateZoneTool();
        else activateZoneTool('rect');
    };
    document.getElementById('tool-zone-oval').onclick = () => {
        if (activeZoneTool === 'oval') deactivateZoneTool();
        else activateZoneTool('oval');
    };
    document.getElementById('btn-save-zone').onclick = () => saveCurrentZone();
    // Fonction utilitaire : appliquer les champs du panneau config à la zone en cours
    function autoSyncZoneFields() {
        if (!currentEditingZone || _zoneSyncLock) return;
        const actionType = document.getElementById('zone-action-type').value;
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
                actionValue = (document.getElementById('zone-action-value') || {}).value.trim();
                break;
        }
        currentEditingZone.triggerType = document.getElementById('zone-trigger-type').value;
        currentEditingZone.actionType = actionType;
        currentEditingZone.actionValue = actionValue;
        // Sync des champs spécifiques vidéo (action de fin)
        if (actionType === 'video') {
            currentEditingZone.videoEndAction = (document.getElementById('zone-video-end-action') || {}).value || 'return';
            currentEditingZone.videoEndUrl = ((document.getElementById('zone-video-end-url') || {}).value || '').trim();
        }
        markUnsavedChanges();
    }

    document.getElementById('zone-action-type').onchange = () => {
        const type = document.getElementById('zone-action-type').value;
        // Hide all extended fields
        document.getElementById('zone-action-value-field').style.display = 'none';
        document.getElementById('zone-video-field').style.display = 'none';
        document.getElementById('zone-image-field').style.display = 'none';
        document.getElementById('zone-text-field').style.display = 'none';
        document.getElementById('zone-mechanical-config').style.display = 'none';
        // Show appropriate fields
        if (type === 'link' || type === 'teleport') {
            document.getElementById('zone-action-value-field').style.display = 'block';
            document.getElementById('zone-action-value').placeholder =
                type === 'link' ? 'URL ex: ./room_2.html' : 'Coordonnées x,y,z';
        } else if (type === 'message') {
            document.getElementById('zone-action-value-field').style.display = 'block';
            document.getElementById('zone-action-value').placeholder = 'Texte du message';
        } else if (type === 'video') {
            document.getElementById('zone-video-field').style.display = 'block';
        } else if (type === 'lightbox-image') {
            document.getElementById('zone-image-field').style.display = 'block';
        } else if (type === 'lightbox-text') {
            document.getElementById('zone-text-field').style.display = 'block';
        } else if (type === 'turn-button' || type === 'lever' || type === 'fader') {
            document.getElementById('zone-mechanical-config').style.display = 'block';
        }
        autoSyncZoneFields();
    };

    // Visibilité conditionnelle du champ URL de fin de vidéo
    if (document.getElementById('zone-video-end-action')) {
        document.getElementById('zone-video-end-action').onchange = () => {
            const endAction = document.getElementById('zone-video-end-action').value;
            const urlField = document.getElementById('zone-video-end-url-field');
            if (urlField) urlField.style.display = (endAction === 'navigate') ? 'block' : 'none';
            autoSyncZoneFields();
        };
    }

    // Auto-sync des champs de zone en temps réel
    document.getElementById('zone-trigger-type').onchange = autoSyncZoneFields;
    document.getElementById('zone-action-value').oninput = autoSyncZoneFields;
    if (document.getElementById('zone-video-url'))
        document.getElementById('zone-video-url').oninput = autoSyncZoneFields;
    if (document.getElementById('zone-image-url'))
        document.getElementById('zone-image-url').oninput = autoSyncZoneFields;
    if (document.getElementById('zone-lightbox-text'))
        document.getElementById('zone-lightbox-text').oninput = autoSyncZoneFields;
    if (document.getElementById('zone-video-end-url'))
        document.getElementById('zone-video-end-url').oninput = autoSyncZoneFields;

    // Mechanical config sliders
    document.getElementById('zone-mech-speed').oninput = (e) => {
        document.getElementById('zone-mech-speed-val').textContent = e.target.value;
    };
    document.getElementById('zone-mech-range').oninput = (e) => {
        document.getElementById('zone-mech-range-val').textContent = parseFloat(e.target.value).toFixed(1);
    };

    // Overlay close buttons
    document.getElementById('video-close-btn').onclick = closeVideoOverlay;
    document.getElementById('lightbox-image-close').onclick = closeImageLightbox;
    document.getElementById('lightbox-text-close').onclick = closeTextLightbox;

    // --- Contrôles du lecteur vidéo ---
    const _video = document.getElementById('overlay-video-player');
    document.getElementById('video-btn-play').onclick = () => {
        if (_video.paused) { _video.play().catch(() => {}); } else { _video.pause(); }
    };
    document.getElementById('video-btn-back5').onclick = () => { _video.currentTime = Math.max(0, _video.currentTime - 5); };
    document.getElementById('video-btn-fwd5').onclick = () => { _video.currentTime = Math.min(_video.duration || 0, _video.currentTime + 5); };
    document.getElementById('video-btn-mute').onclick = () => {
        _video.muted = !_video.muted;
        document.getElementById('video-btn-mute').textContent = _video.muted ? '🔇' : '🔊';
    };
    document.getElementById('video-volume').oninput = (e) => {
        _video.volume = parseFloat(e.target.value);
        _video.muted = false;
        document.getElementById('video-btn-mute').textContent = _video.volume === 0 ? '🔇' : '🔊';
    };
    document.getElementById('video-progress').oninput = (e) => {
        if (_video.duration) { _video.currentTime = (parseFloat(e.target.value) / 100) * _video.duration; }
    };
    document.getElementById('video-btn-fullscreen').onclick = () => {
        const container = document.getElementById('video-overlay');
        const requestFS = container.requestFullscreen || container.webkitRequestFullscreen || container.msRequestFullscreen;
        if (document.fullscreenElement || document.webkitFullscreenElement) {
            const exitFS = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
            if (exitFS) exitFS.call(document).catch(() => {});
        } else if (requestFS) {
            requestFS.call(container).catch(() => {});
        }
    };

    // Le clic sur l'overlay vidéo est maintenant géré dans showVideoOverlay (mode cinématique)
    document.getElementById('lightbox-image-overlay').onclick = (e) => { if (e.target.id === 'lightbox-image-overlay') closeImageLightbox(); };
    document.getElementById('lightbox-text-overlay').onclick = (e) => { if (e.target.id === 'lightbox-text-overlay') closeTextLightbox(); };
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllOverlays(); });

    // Right-click handler for game mode (turn-button reverse rotation)
    renderer.domElement.addEventListener('contextmenu', (event) => {
        if (interactionMode === 'game') {
            event.preventDefault();
            checkZoneInteraction(event, 'right-click');
        }
    });

    // Annuler le hold quand le clic est relâché
    renderer.domElement.addEventListener('pointerup', () => {
        heldZone = null;
        holdStartTime = 0;
    });

    // Zone drawing mouse handlers
    renderer.domElement.addEventListener('pointerdown', onZoneMouseDown, true);
    window.addEventListener('pointermove', onZoneMouseMove, false);
    renderer.domElement.addEventListener('pointerup', onZoneMouseUp, true);

    // Audio hover trigger detection (debounced)
    renderer.domElement.addEventListener('pointermove', (event) => {
        if (interactionMode !== 'game') return;
        if (audioHoverDebounceTimer) return;
        audioHoverDebounceTimer = setTimeout(() => { audioHoverDebounceTimer = null; }, 100);

        const rect = renderer.domElement.getBoundingClientRect();
        const mx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const my = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        const hoverRaycaster = new THREE.Raycaster();
        hoverRaycaster.setFromCamera(new THREE.Vector2(mx, my), camera);

        const meshes = [];
        importedObjects.forEach(obj => { obj.traverse(child => { if (child.isMesh) meshes.push(child); }); });
        const hits = hoverRaycaster.intersectObjects(meshes, false);
        if (hits.length > 0) {
            let hit = hits[0].object;
            while (hit) {
                if (hit.userData.isImported && importedObjects.includes(hit)) {
                    checkAudioHoverTriggers(hit.userData.editorName || hit.name || '');
                    return;
                }
                hit = hit.parent;
            }
        }
        lastHoveredAudioObject = null;
    });

    // Masquer l'onglet Jeu et Audio si on est en mode jeu au démarrage
    if (interactionMode === 'game') {
        document.getElementById('mode-game-setup').style.display = 'none';
        document.getElementById('mode-audio').style.display = 'none';
    }

    // Panneau Plan de Pièce
    document.getElementById('plan-view-top').onclick = setPlanViewTop;
    document.getElementById('plan-view-3d').onclick = setPlanView3D;

    document.getElementById('tool-draw-wall').onclick = () => {
        setFloorPlanTool('draw-wall');
    };
    document.getElementById('tool-draw-oblique').onclick = () => {
        setFloorPlanTool('draw-oblique');
    };
    document.getElementById('tool-draw-room').onclick = () => {
        setFloorPlanTool('draw-room');
    };
    document.getElementById('tool-delete-wall').onclick = () => {
        setFloorPlanTool('delete-wall');
    };
    document.getElementById('tool-select').onclick = () => {
        setFloorPlanTool('select');
    };
    document.getElementById('tool-texture').onclick = () => {
        setFloorPlanTool('texture');
    };
    document.getElementById('tool-measure').onclick = () => {
        setFloorPlanTool('measure');
    };

    // Event listeners pour l'outil Texture
    document.getElementById('texture-upload-btn').onclick = () => {
        document.getElementById('texture-file-input').click();
    };
    document.getElementById('texture-file-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) loadTextureFromFile(file);
    });

    // Type de texture : Tuile / Panneau
    document.getElementById('texture-type-tile').onclick = () => {
        textureToolType = 'tile';
        document.getElementById('texture-type-tile').classList.remove('btn-outline');
        document.getElementById('texture-type-tile').classList.add('btn-primary');
        document.getElementById('texture-type-panel').classList.remove('btn-primary');
        document.getElementById('texture-type-panel').classList.add('btn-outline');
        document.getElementById('texture-tile-size-container').style.display = 'block';
    };
    document.getElementById('texture-type-panel').onclick = () => {
        textureToolType = 'panel';
        document.getElementById('texture-type-panel').classList.remove('btn-outline');
        document.getElementById('texture-type-panel').classList.add('btn-primary');
        document.getElementById('texture-type-tile').classList.remove('btn-primary');
        document.getElementById('texture-type-tile').classList.add('btn-outline');
        document.getElementById('texture-tile-size-container').style.display = 'none';
    };

    // Slider taille de tuile
    document.getElementById('texture-tile-size').addEventListener('input', (e) => {
        textureToolTileSize = parseFloat(e.target.value);
        document.getElementById('texture-tile-size-value').textContent = e.target.value;
        updateTexturePreview();
    });

    // Surface cible : Murs / Sol / Plafond
    document.getElementById('texture-target-wall').onclick = () => {
        textureToolTarget = 'wall';
        document.getElementById('texture-target-wall').classList.replace('btn-outline', 'btn-primary');
        document.getElementById('texture-target-floor').classList.replace('btn-primary', 'btn-outline');
        document.getElementById('texture-target-ceiling').classList.replace('btn-primary', 'btn-outline');
        // Panneau disponible uniquement pour les murs
        document.getElementById('texture-type-panel').disabled = false;
    };
    document.getElementById('texture-target-floor').onclick = () => {
        textureToolTarget = 'floor';
        document.getElementById('texture-target-floor').classList.replace('btn-outline', 'btn-primary');
        document.getElementById('texture-target-wall').classList.replace('btn-primary', 'btn-outline');
        document.getElementById('texture-target-ceiling').classList.replace('btn-primary', 'btn-outline');
        // Forcer le type tuile pour le sol
        if (textureToolType === 'panel') {
            document.getElementById('texture-type-tile').click();
        }
        document.getElementById('texture-type-panel').disabled = true;
    };
    document.getElementById('texture-target-ceiling').onclick = () => {
        textureToolTarget = 'ceiling';
        document.getElementById('texture-target-ceiling').classList.replace('btn-outline', 'btn-primary');
        document.getElementById('texture-target-wall').classList.replace('btn-primary', 'btn-outline');
        document.getElementById('texture-target-floor').classList.replace('btn-primary', 'btn-outline');
        // Forcer le type tuile pour le plafond
        if (textureToolType === 'panel') {
            document.getElementById('texture-type-tile').click();
        }
        document.getElementById('texture-type-panel').disabled = true;
    };

    document.getElementById('grid-size').addEventListener('input', (e) => {
        const value = e.target.value;
        const valueCm = Math.round(parseFloat(value) * 100);
        document.getElementById('grid-size-value').textContent = valueCm;
        document.getElementById('grid-size-value-2').textContent = valueCm;
        updateGridSize(value);
    });
    document.getElementById('grid-snap').addEventListener('change', (e) => {
        gridSnap = e.target.checked;
    });

    document.getElementById('wall-height').addEventListener('input', (e) => {
        wallHeight = parseFloat(e.target.value);
        document.getElementById('wall-height-value').textContent = Math.round(wallHeight * 100);
    });
    document.getElementById('wall-thickness').addEventListener('input', (e) => {
        wallThickness = parseFloat(e.target.value);
        document.getElementById('wall-thickness-value').textContent = Math.round(wallThickness * 100);
    });

    // Slider d'arrondi des coins de pièce
    document.getElementById('room-rounding').addEventListener('input', (e) => {
        roomRounding = parseInt(e.target.value);
        document.getElementById('room-rounding-value').textContent = e.target.value;
    });

    // Fusion de murs
    document.getElementById('btn-merge-walls').onclick = mergeSelectedWalls;

    // Opérations booléennes sur pièces
    document.getElementById('bool-union').onclick = performUnion;
    document.getElementById('bool-subtract').onclick = performSubtract;
    document.getElementById('bool-intersect').onclick = performIntersect;
    document.getElementById('bool-exclude').onclick = performExclude;

    document.getElementById('clear-all-walls').onclick = clearAllWalls;
    document.getElementById('save-plan').onclick = saveFloorPlan;
    document.getElementById('load-plan').onclick = loadFloorPlan;

    // Import SVG
    document.getElementById('import-svg-btn').onclick = () => {
        document.getElementById('svg-file-input').click();
    };
    document.getElementById('svg-file-input').addEventListener('change', handleSVGFileSelect);
    document.getElementById('svg-scale').addEventListener('change', updateSVGPreview);
    document.getElementById('svg-wall-height').addEventListener('input', (e) => {
        document.getElementById('svg-wall-height-value').textContent = Math.round(parseFloat(e.target.value) * 100);
    });
    document.getElementById('generate-walls-from-svg').onclick = generateWallsFromSVG;

    // Panneau Caméra
    document.getElementById('cam-fov').addEventListener('input', (e) => {
        document.getElementById('fov-value').textContent = e.target.value;
    });
    document.getElementById('capture-current-position').onclick = captureCurrentPosition;
    document.getElementById('apply-camera').onclick = applyCameraSettings;
    document.getElementById('reset-camera').onclick = resetCamera;
    document.getElementById('camera-type').addEventListener('change', updateCameraType);

    // Boutons de vues standards
    document.getElementById('view-top').onclick = () => setCameraView('top');
    document.getElementById('view-front').onclick = () => setCameraView('front');
    document.getElementById('view-left').onclick = () => setCameraView('left');
    document.getElementById('view-right').onclick = () => setCameraView('right');
    document.getElementById('view-free').onclick = () => setCameraView('free');
    document.getElementById('view-reset').onclick = () => setCameraView('reset');

    // Panneau Lumières
    document.getElementById('add-light-btn').onclick = addNewLight;
    document.getElementById('apply-light').onclick = applyLightSettings;
    document.getElementById('light-type').addEventListener('change', updateLightType);
    document.getElementById('light-intensity').addEventListener('input', (e) => {
        document.getElementById('light-intensity-value').textContent = parseFloat(e.target.value).toFixed(1);
    });
    document.getElementById('light-angle').addEventListener('input', (e) => {
        document.getElementById('light-angle-value').textContent = e.target.value;
    });
    document.getElementById('light-distance').addEventListener('input', (e) => {
        document.getElementById('light-distance-value').textContent = e.target.value;
    });

    // Event listeners pour les contrôles de cible (target) - mise à jour en temps réel
    ['light-target-x', 'light-target-y', 'light-target-z'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            if (selectedLight && (selectedLight.userData.type === 'directional' || selectedLight.userData.type === 'spot')) {
                if (selectedLight.target) {
                    selectedLight.target.position.x = parseFloat(document.getElementById('light-target-x').value) || 0;
                    selectedLight.target.position.y = parseFloat(document.getElementById('light-target-y').value) || 0;
                    selectedLight.target.position.z = parseFloat(document.getElementById('light-target-z').value) || 0;
                    selectedLight.target.updateMatrixWorld();
                    updateLightHelper(selectedLight);
                }
            }
        });
    });

    // Sauvegarder les paramètres initiaux de la caméra
    initialCameraSettings.position.copy(camera.position);
    initialCameraSettings.fov = camera.fov;

    // Initialiser les lumières par défaut dans la liste
    initializeDefaultLights();

    console.log('✅ Éditeur de scène initialisé avec TransformControls');
}

// Initialiser les lumières par défaut dans la liste de l'éditeur
function initializeDefaultLights() {
    console.log('🔦 initializeDefaultLights() appelée');
    console.log('  window.defaultAmbientLight existe?', !!window.defaultAmbientLight);

    // Ajouter directement la lumière ambiante depuis la référence globale
    if (window.defaultAmbientLight) {
        customLights.push(window.defaultAmbientLight);
        console.log('✅ Lumière ambiante ajoutée à la liste de l\'éditeur');
        console.log('  Lumière:', window.defaultAmbientLight.userData);
    } else {
        console.error('❌ window.defaultAmbientLight n\'existe pas encore!');
    }

    console.log(`✅ ${customLights.length} lumière(s) chargée(s) dans l'éditeur`);
    // Note: Le chargement des lumières et objets est maintenant géré par loadProjectOnStartup()
}

function handleEditorKeyboard(event) {
    if (!editorMode) return;

    // SPACEBAR : Activer le mode panning (style Figma)
    if (event.code === 'Space' && interactionMode === 'developer' && !isSpacePressed) {
        event.preventDefault();
        isSpacePressed = true;

        // Appliquer le curseur main ouverte sur le canvas
        const canvas = renderer.domElement;
        canvas.classList.add('space-pan-hand');

        // Désactiver OrbitControls pour éviter les conflits
        controls.enabled = false;

        return;
    }

    // Si l'espace est maintenu, bloquer tous les autres raccourcis clavier
    if (isSpacePressed) {
        event.preventDefault();
        return;
    }

    // Ctrl+S : Sauvegarder le projet
    if (event.ctrlKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveProject();
        return;
    }

    // Flèches gauche/droite : Pivoter le spawn en mode game-setup avec l'outil spawn actif
    if (currentEditorMode === 'game-setup' && isSpawnToolActive && spawnPosition) {
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            rotateSpawn(1); // Tourner à gauche (sens trigonométrique)
            return;
        }
        if (event.key === 'ArrowRight') {
            event.preventDefault();
            rotateSpawn(-1); // Tourner à droite
            return;
        }
    }

    // B : Activer le tracé de mur en mode floor-plan avec outil mur
    if (event.key.toLowerCase() === 'b' && currentEditorMode === 'floor-plan' && floorPlanMode === 'draw-wall' && !isBKeyPressed) {
        isBKeyPressed = true;
        startWallDrawing();
        return;
    }

    // B : Activer le tracé en mode oblique (le point d'origine doit déjà être fixé par un clic)
    if (event.key.toLowerCase() === 'b' && currentEditorMode === 'floor-plan' && floorPlanMode === 'draw-oblique' && !isBKeyPressed) {
        isBKeyPressed = true;
        if (drawStartPoint) {
            // Le point d'origine existe déjà (fixé par clic), activer le tracé
            isDrawingWall = true;
            controls.enabled = false;
            console.log(`📐 Tracé oblique activé depuis (${drawStartPoint.x.toFixed(1)}, ${drawStartPoint.z.toFixed(1)})`);
        }
        return;
    }

    // Ctrl : Mode effacement en mode floor-plan (outil mur, oblique ou texture)
    if (event.key === 'Control' && currentEditorMode === 'floor-plan' && (floorPlanMode === 'draw-wall' || floorPlanMode === 'draw-oblique' || floorPlanMode === 'texture')) {
        isCtrlPressed = true;
        updateFloorPlanCursor();
        return;
    }

    // Touche "<" : Mode déplacement des murs sélectionnés
    if ((event.key === '<' || event.code === 'IntlBackslash') && currentEditorMode === 'floor-plan' && floorPlanMode === 'select') {
        isMoveKeyPressed = true;
        // Si des murs sont sélectionnés, changer le curseur
        if (selectedWalls.length > 0) {
            const canvas = renderer.domElement;
            canvas.classList.remove('floor-plan-cursor-select', 'floor-plan-cursor-rotate');
            canvas.classList.add('floor-plan-cursor-move');
        }
        return;
    }

    // Touche "W" : Mode rotation des murs sélectionnés (sans Alt)
    if (!event.altKey && event.key.toLowerCase() === 'w' && currentEditorMode === 'floor-plan' && floorPlanMode === 'select') {
        isRotateKeyPressed = true;
        // Si des murs sont sélectionnés, changer le curseur
        if (selectedWalls.length > 0) {
            const canvas = renderer.domElement;
            canvas.classList.remove('floor-plan-cursor-select', 'floor-plan-cursor-move');
            canvas.classList.add('floor-plan-cursor-rotate');
        }
        return;
    }

    // Alt+< : Mode Position (déplacement)
    if (event.altKey && event.key === '<') {
        event.preventDefault();
        setTransformMode('translate');
        console.log('🎮 Mode Position activé (Alt+<)');
    }

    // Alt+W : Mode Rotation
    if (event.altKey && event.key.toLowerCase() === 'w') {
        event.preventDefault();
        setTransformMode('rotate');
        console.log('🎮 Mode Rotation activé (Alt+W)');
    }

    // Alt+X : Mode Échelle
    if (event.altKey && event.key.toLowerCase() === 'x') {
        event.preventDefault();
        setTransformMode('scale');
        console.log('🎮 Mode Échelle activé (Alt+X)');
    }

    // Ctrl+Z : Annuler (historique global)
    if (event.ctrlKey && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undo();
        return;
    }

    // Ctrl+Y : Rétablir (historique global)
    if (event.ctrlKey && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
        return;
    }
}

function handleEditorKeyUp(event) {
    if (!editorMode) return;

    // SPACEBAR : Désactiver le mode panning
    if (event.code === 'Space' && isSpacePressed) {
        isSpacePressed = false;
        isSpacePanning = false;
        spacePanCameraStart = null;
        spacePanTargetStart = null;

        // Retirer les curseurs de panning
        const canvas = renderer.domElement;
        canvas.classList.remove('space-pan-hand', 'space-pan-grabbing');

        // Réactiver OrbitControls
        controls.enabled = true;

        // Restaurer le curseur de l'outil actif
        if (currentEditorMode === 'floor-plan') {
            updateFloorPlanCursor();
        }

        return;
    }

    // Relâcher B : finaliser le mur et préparer le suivant
    if (event.key.toLowerCase() === 'b' && currentEditorMode === 'floor-plan' && (floorPlanMode === 'draw-wall' || floorPlanMode === 'draw-oblique') && isBKeyPressed) {
        isBKeyPressed = false;
        finishWallDrawing();
        return;
    }

    // Relâcher Ctrl : retour au mode dessin
    if (event.key === 'Control') {
        isCtrlPressed = false;
        updateFloorPlanCursor();
    }

    // Relâcher "<" : fin du mode déplacement
    if (event.key === '<' || event.code === 'IntlBackslash') {
        isMoveKeyPressed = false;
        // Restaurer le curseur de sélection si on n'est pas en train de déplacer
        if (!isDraggingSelectedWalls && floorPlanMode === 'select') {
            const canvas = renderer.domElement;
            canvas.classList.remove('floor-plan-cursor-move');
            canvas.classList.add('floor-plan-cursor-select');
        }
    }

    // Relâcher "W" : fin du mode rotation
    if (event.key.toLowerCase() === 'w' && !event.altKey) {
        isRotateKeyPressed = false;
        // Restaurer le curseur de sélection si on n'est pas en train de tourner
        if (!isRotatingSelectedWalls && floorPlanMode === 'select') {
            const canvas = renderer.domElement;
            canvas.classList.remove('floor-plan-cursor-rotate');
            canvas.classList.add('floor-plan-cursor-select');
        }
    }
}

function updateAxisControls() {
    const axisX = document.getElementById('axis-x').checked;
    const axisY = document.getElementById('axis-y').checked;
    const axisZ = document.getElementById('axis-z').checked;

    // Mettre à jour les axes actifs du TransformControl
    transformControl.showX = axisX;
    transformControl.showY = axisY;
    transformControl.showZ = axisZ;

    console.log(`Axes actifs: X=${axisX}, Y=${axisY}, Z=${axisZ}`);
}

function toggleInteractionMode() {
    // Auto-sauvegarder la zone en cours d'édition avant de changer de mode
    if (currentEditingZone) {
        saveCurrentZone();
    }

    // Basculer entre mode 'game' et 'developer'
    interactionMode = interactionMode === 'game' ? 'developer' : 'game';

    const indicator = document.getElementById('switch-indicator');
    const floatingIndicator = document.getElementById('floating-switch-indicator');

    const gameSetupTab = document.getElementById('mode-game-setup');
    const audioTab = document.getElementById('mode-audio');

    // Reset état mouvement à chaque changement de mode
    currentSpeed = 0;
    headBobOffset = 0;
    headBobTime = 0;
    isMoving = false;
    wasMoving = false;

    if (interactionMode === 'developer') {
        // Mode Développeur : indicateur en bas
        indicator.style.top = '40px';
        indicator.style.background = '#4a9eff'; // Bleu pour mode dev
        indicator.innerHTML = '<img src="icones/code-xml.svg" width="20" height="20" style="filter: brightness(0) invert(1);">';
        if (floatingIndicator) {
            floatingIndicator.style.top = '40px';
            floatingIndicator.style.background = '#4a9eff';
            floatingIndicator.innerHTML = '<img src="icones/code-xml.svg" width="20" height="20" style="filter: brightness(0) invert(1);">';
        }
        // Afficher les onglets développeur
        if (gameSetupTab) gameSetupTab.style.display = 'flex';
        if (audioTab) audioTab.style.display = 'flex';
        // Masquer le marqueur de spawn (mode dev = visible seulement dans l'onglet game-setup)
        if (spawnMarkerGroup) spawnMarkerGroup.visible = (currentEditorMode === 'game-setup');
        // Nettoyer la surbrillance turquoise des objets interactifs
        clearAllInteractionHighlights();
        // Afficher les zones d'interaction en mode développeur
        interactionZones.forEach(zone => {
            if (zone.meshGroup) zone.meshGroup.visible = true;
            if (zone.labelSprite) zone.labelSprite.visible = true;
        });
        // Arrêter l'audio de jeu
        stopAllGameAudio();
        // Réafficher les éléments d'interface éditeur
        const editorPanel = document.getElementById('editor-panel');
        if (editorPanel && editorMode) editorPanel.style.display = 'flex';
        const toggleEditorBtn = document.getElementById('toggle-editor-btn');
        if (toggleEditorBtn) toggleEditorBtn.style.display = '';
        const collapseBtn = document.getElementById('toggle-panel-collapse');
        if (collapseBtn && editorMode) collapseBtn.style.display = 'block';
        // Restaurer les gizmos selon le mode éditeur courant
        switchEditorMode(currentEditorMode);
        // Restaurer les contrôles développeur
        updateControlsForMode();
        // Masquer le viseur de jeu
        const crosshairDev = document.getElementById('game-crosshair');
        if (crosshairDev) crosshairDev.style.display = 'none';
        console.log('🔧 Mode Développeur activé - Les interactions de jeu sont désactivées');
    } else {
        // Mode Jeu : indicateur en haut
        indicator.style.top = '4px';
        indicator.style.background = '#ff6b35'; // Orange pour mode jeu
        indicator.innerHTML = '<img src="icones/gamepad-2.svg" width="20" height="20" style="filter: brightness(0) invert(1);">';
        if (floatingIndicator) {
            floatingIndicator.style.top = '4px';
            floatingIndicator.style.background = '#ff6b35';
            floatingIndicator.innerHTML = '<img src="icones/gamepad-2.svg" width="20" height="20" style="filter: brightness(0) invert(1);">';
        }
        // Masquer les onglets développeur
        if (gameSetupTab) gameSetupTab.style.display = 'none';
        if (audioTab) audioTab.style.display = 'none';
        // Si on était dans un onglet dev-only, revenir aux objets
        if (currentEditorMode === 'game-setup' || currentEditorMode === 'audio') {
            switchEditorMode('objects');
        }
        // Masquer le marqueur de spawn en mode jeu
        if (spawnMarkerGroup) spawnMarkerGroup.visible = false;
        // Désactiver l'outil spawn et zone
        deactivateSpawnTool();
        deactivateZoneTool();
        // Reset trigger states
        heldZone = null; holdStartTime = 0;
        lastClickTime = 0; lastClickZone = null;
        hoveredZones.clear();
        proximityTriggeredZones.clear();
        // Masquer les zones d'interaction (elles apparaîtront par proximité)
        interactionZones.forEach(zone => {
            if (zone.meshGroup) zone.meshGroup.visible = false;
            if (zone.labelSprite) zone.labelSprite.visible = false;
        });
        // Masquer TOUS les gizmos et helpers pour l'immersion du joueur
        if (transformControl) { transformControl.detach(); transformControl.visible = false; }
        if (cameraTransformControl) { cameraTransformControl.detach(); cameraTransformControl.visible = false; }
        if (lightTransformControl) { lightTransformControl.detach(); lightTransformControl.visible = false; }
        if (targetTransformControl) { targetTransformControl.detach(); targetTransformControl.visible = false; }
        if (cameraHelper) cameraHelper.visible = false;
        hideAllLightHelpers();
        if (floorPlanGrid) floorPlanGrid.visible = false;
        selectedEditorObject = null;
        // Masquer l'étiquette de dimensions
        hideDimensionsLabel();
        // Masquer tous les éléments d'interface éditeur pour l'immersion
        const editorPanel = document.getElementById('editor-panel');
        if (editorPanel) editorPanel.style.display = 'none';
        const toggleEditorBtn = document.getElementById('toggle-editor-btn');
        if (toggleEditorBtn) toggleEditorBtn.style.display = 'none';
        const collapseBtn = document.getElementById('toggle-panel-collapse');
        if (collapseBtn) collapseBtn.style.display = 'none';
        // Activer le mode FPS (verrouiller la hauteur, configurer les contrôles)
        setupFPSCamera();
        // Démarrer l'audio de jeu (seulement si l'écran de chargement est déjà parti)
        if (loadingScreenDismissed) {
            startGameAudio();
        }
        // Diagnostic des proxies de collision pour les personnages
        const collMeshes = getCollisionMeshes();
        const proxyCount = collMeshes.filter(m => m.userData.isCollisionProxy).length;
        // Afficher le viseur de jeu
        const crosshairGame = document.getElementById('game-crosshair');
        if (crosshairGame) crosshairGame.style.display = 'block';
        console.log(`🎮 Mode Jeu activé - Vue FPS immersive`);
        console.log(`🛡️ Diagnostic collision: ${characterCollisionProxies.length} proxy(s) enregistrés, ${proxyCount} dans la liste de collision`);
        characterCollisionProxies.forEach((entry, i) => {
            const inScene = entry.proxy.parent === scene;
            const inList = collMeshes.includes(entry.proxy);
            const pos = entry.proxy.position;
            const name = entry.character.userData.editorName || entry.character.name || 'personnage';
            console.log(`  🛡️ Proxy #${i} "${name}": scene=${inScene}, collision=${inList}, visible=${entry.proxy.visible}, pos=(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}), h=${entry.height.toFixed(2)}m, r=${entry.radius.toFixed(2)}m`);
        });
    }
}

