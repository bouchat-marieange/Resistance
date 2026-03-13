// ==================== GIZMOS VISUELS POUR CAMÉRA ET LUMIÈRES ====================

function createCameraGizmo() {
    // Créer un proxy invisible pour représenter la position de la caméra
    const geometry = new THREE.SphereGeometry(0.3, 8, 8);  // Plus petit (0.3 au lieu de 0.5)
    const material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
        depthTest: false,  // Toujours visible par dessus
        depthWrite: false
    });
    cameraHelper = new THREE.Mesh(geometry, material);
    cameraHelper.visible = false; // Masqué par défaut
    cameraHelper.renderOrder = 999; // Rendu en dernier

    // IMPORTANT: Marquer cet objet pour qu'il soit ignoré par les OrbitControls
    cameraHelper.userData.isGizmo = true;

    // Utiliser un layer différent pour éviter les interactions (layer 1 pour les gizmos)
    cameraHelper.layers.set(1);

    scene.add(cameraHelper);

    // Créer un TransformControl dédié à la caméra
    cameraTransformControl = new THREE.TransformControls(camera, renderer.domElement);
    cameraTransformControl.setMode('translate');
    cameraTransformControl.setSize(1.5);
    cameraTransformControl.visible = false;

    // IMPORTANT: Le gizmo doit être ajouté en premier pour avoir la priorité sur les événements
    scene.add(cameraTransformControl);

    // Marquer tous les enfants du gizmo
    cameraTransformControl.traverse((child) => {
        child.userData.isGizmo = true;
    });

    // Désactiver OrbitControls pendant le drag ET pendant le hover
    cameraTransformControl.addEventListener('dragging-changed', (event) => {
        controls.enabled = !event.value;
    });

    // Empêcher OrbitControls de réagir quand on survole le gizmo
    cameraTransformControl.addEventListener('mouseDown', () => {
        controls.enabled = false;
    });

    cameraTransformControl.addEventListener('mouseUp', () => {
        controls.enabled = true;
    });

    // Mettre à jour la position de la caméra en temps réel
    cameraTransformControl.addEventListener('objectChange', () => {
        if (cameraHelper.visible) {
            // Mettre à jour la vraie caméra mais garder son regard fixé sur la scène
            camera.position.copy(cameraHelper.position);
            updateCameraPanel();
        }
    });
}

function createLightGizmo() {
    // Créer un TransformControl dédié aux lumières
    lightTransformControl = new THREE.TransformControls(camera, renderer.domElement);
    lightTransformControl.setMode('translate');
    lightTransformControl.setSize(1.2);
    lightTransformControl.visible = false;
    scene.add(lightTransformControl);

    // Marquer tous les enfants du gizmo pour qu'ils soient ignorés
    lightTransformControl.traverse((child) => {
        child.userData.isGizmo = true;
    });

    // Désactiver OrbitControls pendant le drag ET pendant l'interaction
    lightTransformControl.addEventListener('dragging-changed', (event) => {
        controls.enabled = !event.value;
    });

    // Empêcher OrbitControls de réagir quand on clique sur le gizmo
    lightTransformControl.addEventListener('mouseDown', () => {
        controls.enabled = false;
    });

    lightTransformControl.addEventListener('mouseUp', () => {
        controls.enabled = true;

        // Sauvegarder automatiquement quand on relâche le gizmo
        if (selectedLight && !selectedLight.userData.isDefault) {
            saveCustomLightsToStorage();
        }
    });

    // Mettre à jour la position de la lumière en temps réel
    lightTransformControl.addEventListener('objectChange', () => {
        if (selectedLight && selectedLight.userData.type !== 'ambient') {
            // Mettre à jour les champs de position
            document.getElementById('light-pos-x').value = selectedLight.position.x.toFixed(2);
            document.getElementById('light-pos-y').value = selectedLight.position.y.toFixed(2);
            document.getElementById('light-pos-z').value = selectedLight.position.z.toFixed(2);
        }
    });
}

function createTargetGizmo() {
    // Créer une petite sphère pour visualiser et déplacer la cible
    const targetGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const targetMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.7,
        depthTest: false // Toujours visible devant les objets
    });
    targetGizmo = new THREE.Mesh(targetGeometry, targetMaterial);
    targetGizmo.userData.isGizmo = true;
    targetGizmo.visible = false;
    scene.add(targetGizmo);

    // Créer une ligne pour relier la lumière à la cible
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.5,
        depthTest: false
    });
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 0)
    ]);
    targetLine = new THREE.Line(lineGeometry, lineMaterial);
    targetLine.userData.isGizmo = true;
    targetLine.visible = false;
    scene.add(targetLine);

    // Créer un TransformControl pour la cible
    targetTransformControl = new THREE.TransformControls(camera, renderer.domElement);
    targetTransformControl.setMode('translate');
    targetTransformControl.setSize(0.8);
    targetTransformControl.visible = false;
    scene.add(targetTransformControl);

    // Marquer les enfants du gizmo
    targetTransformControl.traverse((child) => {
        child.userData.isGizmo = true;
    });

    // Désactiver OrbitControls pendant le drag
    targetTransformControl.addEventListener('dragging-changed', (event) => {
        controls.enabled = !event.value;
    });

    targetTransformControl.addEventListener('mouseDown', () => {
        controls.enabled = false;
    });

    targetTransformControl.addEventListener('mouseUp', () => {
        controls.enabled = true;
        if (selectedLight && !selectedLight.userData.isDefault) {
            saveCustomLightsToStorage();
        }
    });

    // Mettre à jour la position de la cible en temps réel
    targetTransformControl.addEventListener('objectChange', () => {
        if (selectedLight && selectedLight.target && (selectedLight.userData.type === 'directional' || selectedLight.userData.type === 'spot')) {
            // Synchroniser la vraie cible avec le gizmo
            selectedLight.target.position.copy(targetGizmo.position);
            selectedLight.target.updateMatrixWorld();

            // Mettre à jour la ligne
            updateTargetLine();

            // Mettre à jour les champs numériques
            document.getElementById('light-target-x').value = targetGizmo.position.x.toFixed(2);
            document.getElementById('light-target-y').value = targetGizmo.position.y.toFixed(2);
            document.getElementById('light-target-z').value = targetGizmo.position.z.toFixed(2);

            // Mettre à jour le helper de la lumière
            updateLightHelper(selectedLight);
        }
    });
}

function updateTargetLine() {
    if (selectedLight && targetGizmo.visible) {
        const positions = targetLine.geometry.attributes.position.array;
        positions[0] = selectedLight.position.x;
        positions[1] = selectedLight.position.y;
        positions[2] = selectedLight.position.z;
        positions[3] = targetGizmo.position.x;
        positions[4] = targetGizmo.position.y;
        positions[5] = targetGizmo.position.z;
        targetLine.geometry.attributes.position.needsUpdate = true;
    }
}

function showCameraGizmo() {
    // Positionner le helper à la position actuelle de la caméra
    cameraHelper.position.copy(camera.position);
    cameraHelper.visible = true;

    // Attacher le gizmo au helper
    cameraTransformControl.attach(cameraHelper);
    cameraTransformControl.visible = true;
}

function hideCameraGizmo() {
    cameraHelper.visible = false;
    cameraTransformControl.detach();
    cameraTransformControl.visible = false;
}

function createLightHelper(light) {
    let helper;

    switch(light.userData.type) {
        case 'point':
            helper = new THREE.PointLightHelper(light, 1);
            break;
        case 'directional':
            helper = new THREE.DirectionalLightHelper(light, 2);
            break;
        case 'spot':
            helper = new THREE.SpotLightHelper(light);
            break;
        case 'ambient':
            // Pas de helper visuel pour ambiante (elle est globale)
            return null;
    }

    if (helper) {
        // Marquer le helper et tous ses enfants comme gizmo pour éviter les interactions
        helper.userData.isGizmo = true;
        helper.traverse((child) => {
            child.userData.isGizmo = true;
        });

        scene.add(helper);
        lightHelpers.set(light.userData.id, helper);

        // En mode jeu, les helpers doivent rester invisibles
        if (interactionMode === 'game') {
            helper.visible = false;
        }
    }

    return helper;
}

function updateLightHelper(light) {
    const helper = lightHelpers.get(light.userData.id);
    if (helper) {
        helper.update();
    }
}

function removeLightHelper(lightId) {
    const helper = lightHelpers.get(lightId);
    if (helper) {
        scene.remove(helper);
        lightHelpers.delete(lightId);
    }
}

function showLightGizmo(light) {
    // Vérifier si la position est verrouillée
    if (light.userData.positionLocked) {
        lightTransformControl.detach();
        lightTransformControl.visible = false;
        hideTargetGizmo();
        console.log('🔒 Position verrouillée - Gizmo désactivé');
        return;
    }

    // Attacher le gizmo à la lumière
    lightTransformControl.attach(light);
    lightTransformControl.visible = true;

    // Afficher le gizmo de cible pour lumières directionnelles et spot
    if ((light.userData.type === 'directional' || light.userData.type === 'spot') && light.target) {
        showTargetGizmo(light);
    } else {
        hideTargetGizmo();
    }
}

function showTargetGizmo(light) {
    if (!light.target) return;

    // Positionner le gizmo de cible
    targetGizmo.position.copy(light.target.position);
    targetGizmo.visible = true;

    // Attacher le TransformControl
    targetTransformControl.attach(targetGizmo);
    targetTransformControl.visible = true;

    // Afficher et mettre à jour la ligne
    targetLine.visible = true;
    updateTargetLine();
}

function hideTargetGizmo() {
    if (targetGizmo) {
        targetGizmo.visible = false;
        targetTransformControl.detach();
        targetTransformControl.visible = false;
        targetLine.visible = false;
    }
}

function hideLightGizmo() {
    lightTransformControl.detach();
    lightTransformControl.visible = false;
    hideTargetGizmo();
}

function hideAllLightHelpers() {
    lightHelpers.forEach(helper => {
        helper.visible = false;
    });
}

function showAllLightHelpers() {
    lightHelpers.forEach(helper => {
        helper.visible = true;
    });
}

// ==================== GESTION DES MODES ÉDITEUR ====================

function switchEditorMode(mode) {
    currentEditorMode = mode;

    // Mettre à jour les styles des boutons avec DaisyUI tabs
    document.querySelectorAll('.editor-mode-btn').forEach(btn => {
        btn.classList.remove('tab-active');
    });

    const activeBtn = document.getElementById(`mode-${mode}`);
    activeBtn.classList.add('tab-active');

    // Afficher/masquer les panneaux
    document.getElementById('objects-panel').style.display = mode === 'objects' ? 'block' : 'none';
    document.getElementById('camera-panel').style.display = mode === 'camera' ? 'block' : 'none';
    document.getElementById('lights-panel').style.display = mode === 'lights' ? 'block' : 'none';
    document.getElementById('floor-plan-panel').style.display = mode === 'floor-plan' ? 'block' : 'none';
    document.getElementById('game-setup-panel').style.display = mode === 'game-setup' ? 'block' : 'none';
    document.getElementById('audio-panel').style.display = mode === 'audio' ? 'block' : 'none';

    // Visibilité des barres sticky selon l'onglet (masquées en mode audio)
    const viewsBar = document.getElementById('views-bar');
    const transformBar = document.getElementById('transform-bar');
    if (mode === 'audio') {
        if (viewsBar) viewsBar.style.display = 'none';
        if (transformBar) transformBar.style.display = 'none';
    } else {
        if (viewsBar) viewsBar.style.display = '';
        if (transformBar) transformBar.style.display = '';
    }

    // Nettoyer le curseur personnalisé
    const canvas = renderer.domElement;
    canvas.classList.remove('floor-plan-cursor-draw-wall', 'floor-plan-cursor-draw-room', 'floor-plan-cursor-delete', 'floor-plan-cursor-erase-wall', 'floor-plan-cursor-select', 'floor-plan-cursor-move', 'game-cursor-spawn', 'game-cursor-zone-rect', 'game-cursor-zone-oval', 'game-cursor-zone-wall', 'game-cursor-zone-object', 'game-cursor-zone-character');

    // Gestion des gizmos selon le mode
    if (mode === 'objects') {
        // Mode Objets: gizmo d'objets actif, autres masqués
        hideCameraGizmo();
        hideLightGizmo();
        hideAllLightHelpers();
        // Masquer la grille du plan
        if (floorPlanGrid) {
            floorPlanGrid.visible = false;
        }
    } else if (mode === 'camera') {
        // Mode Caméra: afficher le gizmo caméra, désactiver gizmo objets
        transformControl.detach();
        transformControl.visible = false;
        selectedEditorObject = null;
        hideLightGizmo();
        hideAllLightHelpers();
        showCameraGizmo();
        updateCameraPanel();
        // Masquer la grille du plan
        if (floorPlanGrid) {
            floorPlanGrid.visible = false;
        }
    } else if (mode === 'lights') {
        // Mode Lumières: afficher les helpers de lumières, désactiver gizmo objets
        transformControl.detach();
        transformControl.visible = false;
        selectedEditorObject = null;
        hideCameraGizmo();
        showAllLightHelpers();

        // Mettre à jour la liste des lumières pour s'assurer qu'elle est affichée
        updateLightsList();

        // Sélectionner automatiquement la lumière ambiante par défaut
        if (window.defaultAmbientLight && !selectedLight) {
            selectLight(window.defaultAmbientLight);
        }
        // Masquer la grille du plan
        if (floorPlanGrid) {
            floorPlanGrid.visible = false;
        }
    } else if (mode === 'floor-plan') {
        // Mode Plan de pièce: désactiver tous les gizmos
        transformControl.detach();
        transformControl.visible = false;
        selectedEditorObject = null;
        hideCameraGizmo();
        hideLightGizmo();
        hideAllLightHelpers();

        // Initialiser l'historique si c'est la première fois
        if (floorPlanHistory.length === 0) {
            saveFloorPlanState('init', {});
        }

        // Initialiser l'outil par défaut
        setFloorPlanTool('draw-wall');

        // Passer automatiquement en vue de dessus
        setPlanViewTop();

        // Afficher la grille
        if (floorPlanGrid) {
            floorPlanGrid.visible = true;
        }
    } else if (mode === 'game-setup') {
        // Mode Éléments de jeu: désactiver tous les gizmos
        transformControl.detach();
        transformControl.visible = false;
        selectedEditorObject = null;
        hideCameraGizmo();
        hideLightGizmo();
        hideAllLightHelpers();
        // Masquer la grille du plan
        if (floorPlanGrid) {
            floorPlanGrid.visible = false;
        }
        // Restaurer la vue 3D si on était en vue plan
        if (isPlanViewActive) {
            setPlanView3D();
        }
        // Afficher le marqueur de spawn s'il existe
        if (spawnMarkerGroup) {
            spawnMarkerGroup.visible = true;
        }
        // Afficher les zones d'interaction en mode game-setup
        interactionZones.forEach(zone => {
            if (zone.meshGroup) zone.meshGroup.visible = true;
            if (zone.labelSprite) zone.labelSprite.visible = true;
        });
        updateInteractionZonesList();
    } else if (mode === 'audio') {
        // Mode Audio: désactiver tous les gizmos
        transformControl.detach();
        transformControl.visible = false;
        selectedEditorObject = null;
        hideCameraGizmo();
        hideLightGizmo();
        hideAllLightHelpers();
        if (floorPlanGrid) floorPlanGrid.visible = false;
        if (isPlanViewActive) setPlanView3D();
        // Rafraîchir les listes audio
        for (const cat of AUDIO_CATEGORIES) {
            updateAudioTracksList(cat);
        }
    }

    // Masquer les zones si on quitte game-setup (en mode développeur)
    if (mode !== 'game-setup' && interactionMode === 'developer') {
        deactivateZoneTool();
    }

    console.log(`Mode éditeur changé: ${mode}`);
}

// ==================== GESTION DE LA CAMÉRA ====================

function updateCameraPanel() {
    document.getElementById('cam-pos-x').value = camera.position.x.toFixed(2);
    document.getElementById('cam-pos-y').value = camera.position.y.toFixed(2);
    document.getElementById('cam-pos-z').value = camera.position.z.toFixed(2);
    document.getElementById('cam-fov').value = camera.fov;
    document.getElementById('fov-value').textContent = camera.fov.toFixed(0);
}

function captureCurrentPosition() {
    // Capturer la position actuelle de la caméra (où vous vous trouvez dans la scène)
    const currentPos = camera.position.clone();

    // Mettre à jour les champs de saisie
    document.getElementById('cam-pos-x').value = currentPos.x.toFixed(2);
    document.getElementById('cam-pos-y').value = currentPos.y.toFixed(2);
    document.getElementById('cam-pos-z').value = currentPos.z.toFixed(2);

    // Mettre à jour le helper visuel si visible
    if (cameraHelper && cameraHelper.visible) {
        cameraHelper.position.copy(currentPos);
    }

    console.log(`📍 Position actuelle capturée: X=${currentPos.x.toFixed(2)}, Y=${currentPos.y.toFixed(2)}, Z=${currentPos.z.toFixed(2)}`);

    // Feedback visuel pour l'utilisateur
    const btn = document.getElementById('capture-current-position');
    const originalText = btn.textContent;
    const originalBg = btn.style.background;

    btn.textContent = '✅ Position capturée !';
    btn.style.background = '#27ae60';

    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = originalBg;
    }, 1500);
}

function applyCameraSettings() {
    camera.position.x = parseFloat(document.getElementById('cam-pos-x').value) || 0;
    camera.position.y = parseFloat(document.getElementById('cam-pos-y').value) || 8;
    camera.position.z = parseFloat(document.getElementById('cam-pos-z').value) || 20;

    camera.fov = parseFloat(document.getElementById('cam-fov').value) || 75;
    camera.updateProjectionMatrix();

    // Mettre à jour le helper visuel
    if (cameraHelper && cameraHelper.visible) {
        cameraHelper.position.copy(camera.position);
    }

    console.log('✅ Paramètres caméra appliqués');
}

function resetCamera() {
    camera.position.copy(initialCameraSettings.position);
    camera.fov = initialCameraSettings.fov;
    camera.updateProjectionMatrix();
    updateCameraPanel();

    // Mettre à jour le helper visuel
    if (cameraHelper && cameraHelper.visible) {
        cameraHelper.position.copy(camera.position);
    }

    console.log('⟲ Caméra réinitialisée');
}

// ==================== VUES STANDARDS ====================

function restoreDefaultCameraConstraints() {
    controls.minDistance = 2;
    controls.maxDistance = 150;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minPolarAngle = 0;
    controls.screenSpacePanning = false;
}

function setCameraView(viewType) {
    const distance = 80; // Distance depuis le centre de la scène
    const targetY = 30; // Hauteur du point ciblé (centre approximatif de la pièce)

    // Restaurer les contraintes par défaut pour les vues non-libres
    if (viewType !== 'free') {
        restoreDefaultCameraConstraints();
    }

    switch(viewType) {
        case 'top':
            // Vue de dessus - Caméra au-dessus regardant vers le bas
            camera.position.set(0, distance + targetY, 0);
            controls.target.set(0, targetY, 0);
            break;

        case 'front':
            // Vue de face - Caméra devant regardant vers l'arrière
            camera.position.set(0, targetY, distance);
            controls.target.set(0, targetY, 0);
            break;

        case 'right':
            // Vue de droite - Caméra à droite regardant vers la gauche
            camera.position.set(distance, targetY, 0);
            controls.target.set(0, targetY, 0);
            break;

        case 'left':
            // Vue de gauche - Caméra à gauche regardant vers la droite
            camera.position.set(-distance, targetY, 0);
            controls.target.set(0, targetY, 0);
            break;

        case 'free':
            // Vue libre - Supprime toutes les restrictions de la caméra
            controls.minDistance = 0.1;
            controls.maxDistance = 5000;
            controls.maxPolarAngle = Math.PI; // Pas de limite de rotation verticale
            controls.minPolarAngle = 0;
            controls.screenSpacePanning = true; // Pan dans l'espace écran (haut/bas aussi)
            controls.enableRotate = true;
            controls.enableZoom = true;
            controls.enablePan = true;
            console.log('🔓 Mode libre activé: aucune restriction de caméra');
            break;

        case 'reset':
            // Vue par défaut
            resetCamera();
            controls.target.set(0, 0, 0);
            break;
    }

    // Mettre à jour les contrôles
    controls.update();

    // Mettre à jour le panneau caméra
    updateCameraPanel();

    // Mettre à jour le helper visuel si visible
    if (cameraHelper && cameraHelper.visible) {
        cameraHelper.position.copy(camera.position);
    }

    console.log(`📐 Vue changée: ${viewType}`);
}

function updateCameraType() {
    const cameraType = document.getElementById('camera-type').value;

    switch(cameraType) {
        case 'fps':
            // 1ère personne - hauteur d'yeux adulte (1.70m = 17 unités)
            camera.position.set(0, 17, 20);
            break;
        case 'third':
            // 3ème personne - vue d'ensemble
            camera.position.set(0, 30, 50);
            break;
        case 'free':
            // Libre - position actuelle
            break;
    }

    // Mettre à jour le helper visuel
    if (cameraHelper && cameraHelper.visible) {
        cameraHelper.position.copy(camera.position);
    }

    updateCameraPanel();
    console.log(`Type de caméra changé: ${cameraType}`);
}

// ==================== GESTION DES LUMIÈRES ====================

function addNewLight() {
    const lightId = `custom-light-${lightIdCounter++}`;

    // Créer une lumière ponctuelle par défaut
    const light = new THREE.PointLight(0xffffff, 1, 50);
    light.position.set(0, 20, 0);
    light.castShadow = true;
    light.shadow.bias = -0.002;
    light.shadow.normalBias = 0.02;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.userData.id = lightId;
    light.userData.type = 'point';
    light.userData.positionLocked = false; // Position déverrouillée par défaut pour les nouvelles lumières
    light.userData.isOn = true; // Allumée par défaut
    light.userData.savedIntensity = 1; // Intensité par défaut

    scene.add(light);

    // Créer le helper visuel pour cette lumière
    createLightHelper(light);

    // Ajouter à la liste
    customLights.push(light);

    // Mettre à jour l'interface
    updateLightsList();
    selectLight(light);

    // Sauvegarder automatiquement
    saveCustomLightsToStorage();

    // Marquer comme ayant des changements non sauvegardés
    markUnsavedChanges();

    console.log(`💡 Nouvelle lumière ajoutée: ${lightId}`);
}

function updateLightsList() {
    const listEl = document.getElementById('lights-list');
    listEl.innerHTML = '';

    console.log('📋 updateLightsList - Nombre de lumières:', customLights.length);
    customLights.forEach((light, i) => {
        console.log(`  Lumière ${i}:`, light.userData.name, 'Type:', light.userData.type, 'isDefault:', light.userData.isDefault);
    });

    // Trier les lumières : lumière par défaut en premier, puis les autres
    const sortedLights = [...customLights].sort((a, b) => {
        if (a.userData.isDefault) return -1;
        if (b.userData.isDefault) return 1;
        return 0;
    });

    let customLightCounter = 1; // Compteur pour les lumières personnalisées uniquement

    sortedLights.forEach((light, index) => {
        const lightItem = document.createElement('div');
        lightItem.style.cssText = 'padding: 6px 8px; margin: 2px 0; background: #2a2a2a; border-radius: 4px; border-left: 3px solid #4a4a4a; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.2s;';

        // Bordure de couleur selon le type et l'état sélectionné
        if (selectedLight === light) {
            lightItem.style.borderLeftColor = '#4a7ebf';
            lightItem.style.background = '#3a3a3a';
        }

        // Icônes SVG pour les types de lumière
        const typeIcons = {
            'ambient': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v5"/><path d="M14.829 15.998a3 3 0 1 1-5.658 0"/><path d="M20.92 14.606A1 1 0 0 1 20 16H4a1 1 0 0 1-.92-1.394l3-7A1 1 0 0 1 7 7h10a1 1 0 0 1 .92.606z"/></svg>',
            'point': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12v6"/><path d="M4.077 10.615A1 1 0 0 0 5 12h14a1 1 0 0 0 .923-1.385l-3.077-7.384A2 2 0 0 0 15 2H9a2 2 0 0 0-1.846 1.23Z"/><path d="M8 20a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z"/></svg>',
            'directional': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.293 2.293a1 1 0 0 1 1.414 0l2.5 2.5 5.994 1.227a1 1 0 0 1 .506 1.687l-7 7a1 1 0 0 1-1.687-.506l-1.227-5.994-2.5-2.5a1 1 0 0 1 0-1.414z"/><path d="m14.207 4.793-3.414 3.414"/><path d="M3 20a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="m9.086 6.5-4.793 4.793a1 1 0 0 0-.18 1.17L7 18"/></svg>',
            'spot': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.295 19.562 16 22"/><path d="m17 16 3.758 2.098"/><path d="m19 12.5 3.026-.598"/><path d="M7.61 6.3a3 3 0 0 0-3.92 1.3l-1.38 2.79a3 3 0 0 0 1.3 3.91l6.89 3.597a1 1 0 0 0 1.342-.447l3.106-6.211a1 1 0 0 0-.447-1.341z"/><path d="M8 9V2"/></svg>'
        };

        const typeNames = {
            'ambient': 'Ambiante',
            'point': 'Ponctuelle',
            'directional': 'Directionnelle',
            'spot': 'Spot'
        };

        const typeIcon = typeIcons[light.userData.type] || typeIcons['point'];
        const typeName = typeNames[light.userData.type] || 'Lumière';

        // Afficher le nom personnalisé pour les lumières par défaut
        const displayName = light.userData.isDefault
            ? light.userData.name
            : `${typeName} #${customLightCounter}`;

        // Incrémenter le compteur uniquement pour les lumières non-default
        if (!light.userData.isDefault) {
            customLightCounter++;
        }

        // Zone de texte cliquable pour sélectionner
        const textDiv = document.createElement('div');
        textDiv.style.cssText = 'flex: 1; display: flex; align-items: center; gap: 6px;';

        const iconSpan = document.createElement('span');
        iconSpan.style.cssText = 'display: inline-flex; align-items: center;';
        iconSpan.innerHTML = typeIcon;

        const nameSpan = document.createElement('span');
        nameSpan.style.cssText = 'font-size: 10px; color: #d4d4d4; font-weight: 500; cursor: text;';
        nameSpan.textContent = displayName;
        nameSpan.dataset.lightId = light.userData.lightId || 'default';

        // Double-clic pour renommer
        nameSpan.ondblclick = (e) => {
            e.stopPropagation();
            const currentName = nameSpan.textContent;
            const input = document.createElement('input');
            input.type = 'text';
            input.value = currentName;
            input.style.cssText = 'font-size: 10px; padding: 2px 4px; background: #1a1a1a; color: #d4d4d4; border: 1px solid #4a7ebf; border-radius: 2px; outline: none; width: 120px;';

            input.onblur = () => {
                const newName = input.value.trim() || currentName;
                light.userData.name = newName;
                updateLightsList();
            };

            input.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    input.blur();
                } else if (e.key === 'Escape') {
                    input.value = currentName;
                    input.blur();
                }
            };

            nameSpan.replaceWith(input);
            input.focus();
            input.select();
        };

        nameSpan.onclick = (e) => {
            e.stopPropagation();
            selectLight(light);
        };

        textDiv.appendChild(iconSpan);
        textDiv.appendChild(nameSpan);
        textDiv.onclick = () => selectLight(light);

        // Conteneur pour les icônes d'action
        const iconsDiv = document.createElement('div');
        iconsDiv.style.cssText = 'display: flex; gap: 4px; align-items: center;';

        // ICÔNE CADENAS (verrouiller/déverrouiller position)
        const lockBtn = document.createElement('span');
        lockBtn.style.cssText = 'cursor: pointer; user-select: none; display: inline-flex; align-items: center; opacity: 0.7; transition: opacity 0.2s;';
        lockBtn.onmouseenter = () => lockBtn.style.opacity = '1';
        lockBtn.onmouseleave = () => lockBtn.style.opacity = '0.7';
        lockBtn.title = light.userData.positionLocked ? 'Déverrouiller la position' : 'Verrouiller la position';
        lockBtn.innerHTML = light.userData.positionLocked
            ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a0a0a0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a0a0a0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>';
        lockBtn.onclick = (e) => {
            e.stopPropagation();
            toggleLightPositionLock(light);
        };

        // ICÔNE AMPOULE (allumer/éteindre)
        const bulbBtn = document.createElement('span');
        bulbBtn.style.cssText = 'cursor: pointer; user-select: none; display: inline-flex; align-items: center; opacity: 0.7; transition: opacity 0.2s;';
        bulbBtn.onmouseenter = () => bulbBtn.style.opacity = '1';
        bulbBtn.onmouseleave = () => bulbBtn.style.opacity = '0.7';
        const isOn = light.userData.isOn !== false; // Par défaut allumée
        bulbBtn.title = isOn ? 'Éteindre la lumière' : 'Allumer la lumière';
        bulbBtn.innerHTML = isOn
            ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffd700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>';
        bulbBtn.onclick = (e) => {
            e.stopPropagation();
            toggleLightOnOff(light);
        };

        // ICÔNE TRASH (supprimer) - toutes les lumières peuvent être supprimées
        const trashBtn = document.createElement('span');
        trashBtn.style.cssText = 'cursor: pointer; user-select: none; display: inline-flex; align-items: center; opacity: 0.7; transition: opacity 0.2s;';
        trashBtn.onmouseenter = () => trashBtn.style.opacity = '1';
        trashBtn.onmouseleave = () => trashBtn.style.opacity = '0.7';
        trashBtn.title = 'Supprimer cette lumière';
        trashBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>';
        trashBtn.onclick = (e) => {
            e.stopPropagation();
            deleteLightFromList(light);
        };

        iconsDiv.appendChild(lockBtn);
        iconsDiv.appendChild(bulbBtn);
        iconsDiv.appendChild(trashBtn);

        lightItem.appendChild(textDiv);
        lightItem.appendChild(iconsDiv);

        // Toutes les lumières vont dans la même liste
        // La lumière par défaut en premier (si elle existe), puis les autres
        listEl.appendChild(lightItem);
    });
}

// Fonction pour verrouiller/déverrouiller la position d'une lumière
function toggleLightPositionLock(light) {
    // Inverser l'état de verrouillage
    light.userData.positionLocked = !light.userData.positionLocked;

    // Si la lumière est actuellement sélectionnée et qu'on vient de la verrouiller, détacher le gizmo
    if (light === selectedLight && light.userData.positionLocked) {
        if (transformControls) {
            transformControls.detach();
        }
    }

    // Si on déverrouille et que c'est la lumière sélectionnée, rattacher le gizmo
    if (light === selectedLight && !light.userData.positionLocked) {
        showLightGizmo(light);
    }

    // Mettre à jour l'affichage de la liste
    updateLightsList();

    // Sauvegarder automatiquement
    if (!light.userData.isDefault) {
        saveCustomLightsToStorage();
    }

    console.log(`🔒 Lumière ${light.userData.name || 'custom'} - Position ${light.userData.positionLocked ? 'verrouillée' : 'déverrouillée'}`);
}

// Fonction pour allumer/éteindre une lumière
function toggleLightOnOff(light) {
    const isCurrentlyOn = light.userData.isOn !== false;

    if (isCurrentlyOn) {
        // Éteindre : sauvegarder l'intensité actuelle et la mettre à 0
        light.userData.savedIntensity = light.intensity;
        light.intensity = 0;
        light.userData.isOn = false;
        console.log(`💡 Lumière éteinte - Intensité sauvegardée: ${light.userData.savedIntensity}`);
    } else {
        // Allumer : restaurer l'intensité sauvegardée
        const savedIntensity = light.userData.savedIntensity || 0.8;
        light.intensity = savedIntensity;
        light.userData.isOn = true;
        console.log(`💡 Lumière allumée - Intensité restaurée: ${savedIntensity}`);
    }

    // Mettre à jour l'affichage de la liste
    updateLightsList();

    // Si c'est la lumière actuellement sélectionnée, mettre à jour le panneau d'édition
    if (light === selectedLight) {
        document.getElementById('light-intensity').value = light.intensity;
        document.getElementById('light-intensity-value').textContent = light.intensity.toFixed(1);
    }

    // Sauvegarder automatiquement
    saveCustomLightsToStorage();
}

// Fonction pour réinitialiser la position de la lumière ambiante par défaut
function resetAmbientLightPosition() {
    if (!selectedLight || !selectedLight.userData.isDefault) return;

    const defaultPos = selectedLight.userData.defaultPosition;
    if (defaultPos) {
        selectedLight.position.copy(defaultPos);

        // Mettre à jour les champs de position si affichés
        document.getElementById('light-pos-x').value = defaultPos.x.toFixed(2);
        document.getElementById('light-pos-y').value = defaultPos.y.toFixed(2);
        document.getElementById('light-pos-z').value = defaultPos.z.toFixed(2);

        // Mettre à jour le gizmo si affiché
        if (transformControls && transformControls.object === selectedLight) {
            transformControls.updateMatrixWorld();
        }

        console.log(`🔄 Position de la lumière ambiante réinitialisée à (${defaultPos.x}, ${defaultPos.y}, ${defaultPos.z})`);
    }
}

function selectLight(light) {
    selectedLight = light;
    updateLightsList();

    // Afficher le gizmo pour cette lumière
    showLightGizmo(light);

    // Afficher le panneau d'édition
    document.getElementById('light-edit-panel').style.display = 'block';

    // Afficher le nom approprié (nom personnalisé pour lumières par défaut)
    const displayName = light.userData.isDefault
        ? light.userData.name
        : `Lumière #${customLights.indexOf(light) + 1}`;
    document.getElementById('light-edit-name').textContent = displayName;

    // Remplir les champs
    document.getElementById('light-type').value = light.userData.type;
    document.getElementById('light-color').value = colorToHex(light.color);
    document.getElementById('light-intensity').value = light.intensity;
    document.getElementById('light-intensity-value').textContent = light.intensity.toFixed(1);

    // Afficher les contrôles de position pour TOUTES les lumières (y compris ambiante)
    document.getElementById('light-pos-x').value = light.position.x.toFixed(2);
    document.getElementById('light-pos-y').value = light.position.y.toFixed(2);
    document.getElementById('light-pos-z').value = light.position.z.toFixed(2);
    document.getElementById('light-position-controls').style.display = 'block';

    // Afficher les contrôles spécifiques au type de lumière
    if (light.userData.type === 'spot') {
        document.getElementById('light-angle').value = (light.angle * 180 / Math.PI).toFixed(0);
        document.getElementById('light-angle-value').textContent = (light.angle * 180 / Math.PI).toFixed(0);
        document.getElementById('light-angle-controls').style.display = 'block';
    } else {
        document.getElementById('light-angle-controls').style.display = 'none';
    }

    // Afficher les contrôles de cible pour lumières directionnelles et spot
    if (light.userData.type === 'directional' || light.userData.type === 'spot') {
        if (light.target) {
            document.getElementById('light-target-x').value = light.target.position.x.toFixed(2);
            document.getElementById('light-target-y').value = light.target.position.y.toFixed(2);
            document.getElementById('light-target-z').value = light.target.position.z.toFixed(2);
        }
        document.getElementById('light-target-controls').style.display = 'block';
    } else {
        document.getElementById('light-target-controls').style.display = 'none';
    }

    document.getElementById('light-distance').value = light.distance;
    document.getElementById('light-distance-value').textContent = light.distance;

    // Gérer le bouton de suppression (désactiver pour lumières par défaut)
    const deleteBtn = document.getElementById('delete-light');
    if (light.userData.isDefault) {
        deleteBtn.disabled = true;
        deleteBtn.style.opacity = '0.5';
        deleteBtn.style.cursor = 'not-allowed';
        deleteBtn.title = 'Les lumières par défaut ne peuvent pas être supprimées';
    } else {
        deleteBtn.disabled = false;
        deleteBtn.style.opacity = '1';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.title = 'Supprimer cette lumière';
    }
}

function applyLightSettings() {
    if (!selectedLight) return;

    const newType = document.getElementById('light-type').value;
    const oldLightId = selectedLight.userData.id;

    // Si le type change, recréer la lumière
    if (newType !== selectedLight.userData.type) {
        const oldPosition = selectedLight.position.clone();
        const oldColor = selectedLight.color.clone();
        const oldIntensity = selectedLight.intensity;

        // Sauvegarder les autres propriétés userData
        const oldUserData = {
            positionLocked: selectedLight.userData.positionLocked || false,
            isOn: selectedLight.userData.isOn !== false,
            savedIntensity: selectedLight.userData.savedIntensity || oldIntensity,
            isDefault: selectedLight.userData.isDefault || false,
            name: selectedLight.userData.name,
            defaultPosition: selectedLight.userData.defaultPosition
        };

        // Retirer l'ancien helper
        removeLightHelper(oldLightId);

        scene.remove(selectedLight);

        let newLight;
        switch(newType) {
            case 'ambient':
                newLight = new THREE.AmbientLight(oldColor, oldIntensity);
                newLight.position.copy(oldPosition);
                break;
            case 'point':
                newLight = new THREE.PointLight(oldColor, oldIntensity, 50);
                newLight.position.copy(oldPosition);
                break;
            case 'directional':
                newLight = new THREE.DirectionalLight(oldColor, oldIntensity);
                newLight.position.copy(oldPosition);
                break;
            case 'spot':
                newLight = new THREE.SpotLight(oldColor, oldIntensity, 50, Math.PI / 4);
                newLight.position.copy(oldPosition);
                break;
        }

        newLight.castShadow = true;
        if (newLight.shadow) {
            newLight.shadow.bias = -0.002;
            newLight.shadow.normalBias = 0.02;
            if (newLight.shadow.mapSize) {
                newLight.shadow.mapSize.width = 1024;
                newLight.shadow.mapSize.height = 1024;
            }
        }
        newLight.userData.id = oldLightId;
        newLight.userData.type = newType;

        // Restaurer les propriétés userData
        newLight.userData.positionLocked = oldUserData.positionLocked;
        newLight.userData.isOn = oldUserData.isOn;
        newLight.userData.savedIntensity = oldUserData.savedIntensity;
        newLight.userData.isDefault = oldUserData.isDefault;
        if (oldUserData.name) newLight.userData.name = oldUserData.name;
        if (oldUserData.defaultPosition) newLight.userData.defaultPosition = oldUserData.defaultPosition;

        scene.add(newLight);

        // Créer le nouveau helper
        createLightHelper(newLight);

        const index = customLights.indexOf(selectedLight);
        customLights[index] = newLight;
        selectedLight = newLight;

        // Mettre à jour le gizmo
        showLightGizmo(selectedLight);
    }

    // Appliquer les paramètres
    selectedLight.color.set(document.getElementById('light-color').value);
    selectedLight.intensity = parseFloat(document.getElementById('light-intensity').value);

    // Appliquer la position pour TOUTES les lumières (y compris ambiante)
    selectedLight.position.x = parseFloat(document.getElementById('light-pos-x').value);
    selectedLight.position.y = parseFloat(document.getElementById('light-pos-y').value);
    selectedLight.position.z = parseFloat(document.getElementById('light-pos-z').value);

    // Appliquer la cible pour lumières directionnelles et spot
    if (selectedLight.userData.type === 'directional' || selectedLight.userData.type === 'spot') {
        if (selectedLight.target) {
            selectedLight.target.position.x = parseFloat(document.getElementById('light-target-x').value);
            selectedLight.target.position.y = parseFloat(document.getElementById('light-target-y').value);
            selectedLight.target.position.z = parseFloat(document.getElementById('light-target-z').value);
            selectedLight.target.updateMatrixWorld();
        }
    }

    // Mettre à jour savedIntensity si la lumière est allumée
    if (selectedLight.userData.isOn !== false) {
        selectedLight.userData.savedIntensity = selectedLight.intensity;
    }

    if (selectedLight.userData.type === 'spot') {
        selectedLight.angle = parseFloat(document.getElementById('light-angle').value) * Math.PI / 180;
    }

    selectedLight.distance = parseFloat(document.getElementById('light-distance').value);

    // Mettre à jour le helper
    updateLightHelper(selectedLight);

    updateLightsList();

    // Sauvegarder automatiquement
    saveCustomLightsToStorage();

    // Marquer comme ayant des changements non sauvegardés
    markUnsavedChanges();

    console.log('✅ Paramètres de lumière appliqués');
}

// Fonction pour supprimer une lumière depuis la liste
function deleteLightFromList(light) {
    // Confirmation obligatoire pour toutes les lumières
    const lightName = light.userData.name || 'cette lumière';

    // Message spécial pour la lumière par défaut
    const confirmMessage = light.userData.isDefault
        ? `⚠️ Attention ! Vous êtes sur le point de supprimer la lumière ambiante par défaut.\n\nCela assombrira considérablement la scène.\n\nÊtes-vous sûr de vouloir supprimer "${lightName}" ?`
        : `Voulez-vous vraiment supprimer "${lightName}" ?`;

    if (!confirm(confirmMessage)) {
        return;
    }

    const lightId = light.userData.id;

    // Retirer le helper visuel
    removeLightHelper(lightId);

    // Retirer le gizmo si c'est la lumière sélectionnée
    if (selectedLight === light) {
        hideLightGizmo();
        selectedLight = null;
        document.getElementById('light-edit-panel').style.display = 'none';
    }

    scene.remove(light);
    customLights = customLights.filter(l => l !== light);

    updateLightsList();

    // Sauvegarder automatiquement
    saveCustomLightsToStorage();

    // Marquer comme ayant des changements non sauvegardés
    markUnsavedChanges();

    console.log('🗑️ Lumière supprimée');
}

function deleteSelectedLight() {
    if (!selectedLight) return;
    deleteLightFromList(selectedLight);
}

function updateLightType() {
    if (selectedLight) {
        applyLightSettings();
        selectLight(selectedLight);
    }
}

function colorToHex(color) {
    return '#' + color.getHexString();
}
