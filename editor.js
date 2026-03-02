/**
 * ÉDITEUR DE SCÈNE 3D - MODULAIRE
 * Système d'édition réutilisable pour toutes les pages du jeu
 * Permet de positionner objets, lumières et caméras avec export/import JSON
 */

class SceneEditor {
    constructor(scene, camera, renderer, controls) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.controls = controls;

        // État de l'éditeur
        this.enabled = false;
        this.currentMode = 'objects'; // 'objects', 'camera', 'lights'

        // Objets et lumières
        this.selectableObjects = [];
        this.importedObjects = [];
        this.customLights = [];
        this.defaultAmbientLight = null;

        // Sélection
        this.selectedEditorObject = null;
        this.selectedLight = null;

        // Gizmos et helpers
        this.transformControl = null;
        this.cameraTransformControl = null;
        this.lightTransformControl = null;
        this.cameraHelper = null;
        this.lightHelpers = new Map();

        // Historique (undo/redo)
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;

        // Compteurs
        this.importedObjectCounter = 0;
        this.lightIdCounter = 0;

        // Transforms initiaux
        this.initialTransforms = new Map();
        this.initialCameraSettings = {
            position: new THREE.Vector3(),
            fov: 75
        };

        // Raycaster pour la sélection
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.init();
    }

    init() {
        this.createTransformControls();
        this.createCameraHelper();
        this.createLightGizmo();
        this.setupEventListeners();
        this.initializeUI();

        console.log('✅ Éditeur de scène initialisé');
    }

    // ==================== GIZMOS ET CONTRÔLES ====================

    createTransformControls() {
        // Gizmo pour les objets
        this.transformControl = new THREE.TransformControls(this.camera, this.renderer.domElement);
        this.transformControl.setMode('translate');
        this.transformControl.setSize(1.2);
        this.scene.add(this.transformControl);

        this.transformControl.addEventListener('dragging-changed', (event) => {
            this.controls.enabled = !event.value;
        });

        this.transformControl.addEventListener('objectChange', () => {
            this.updateObjectInfo();
        });

        this.transformControl.addEventListener('mouseDown', () => {
            if (this.selectedEditorObject) {
                this.saveTransformState();
            }
        });

        this.transformControl.addEventListener('mouseUp', () => {
            if (this.selectedEditorObject && this.selectedEditorObject.userData.isImported) {
                // Pas de sauvegarde automatique, juste dans l'état temporaire
            }
        });
    }

    createCameraHelper() {
        const helperCamera = new THREE.PerspectiveCamera(
            this.camera.fov,
            this.camera.aspect,
            this.camera.near,
            this.camera.far
        );
        helperCamera.position.copy(this.camera.position);

        this.cameraHelper = new THREE.CameraHelper(helperCamera);
        this.cameraHelper.visible = false;
        this.cameraHelper.layers.set(1);
        this.scene.add(this.cameraHelper);

        this.cameraTransformControl = new THREE.TransformControls(this.camera, this.renderer.domElement);
        this.cameraTransformControl.setMode('translate');
        this.cameraTransformControl.setSize(1.5);
        this.cameraTransformControl.visible = false;
        this.scene.add(this.cameraTransformControl);

        this.cameraTransformControl.attach(this.cameraHelper);

        this.cameraTransformControl.addEventListener('dragging-changed', (event) => {
            this.controls.enabled = !event.value;
        });

        this.cameraTransformControl.addEventListener('objectChange', () => {
            if (this.cameraHelper.visible) {
                this.camera.position.copy(this.cameraHelper.position);
                this.updateCameraPanel();
            }
        });
    }

    createLightGizmo() {
        this.lightTransformControl = new THREE.TransformControls(this.camera, this.renderer.domElement);
        this.lightTransformControl.setMode('translate');
        this.lightTransformControl.setSize(1.2);
        this.lightTransformControl.visible = false;
        this.scene.add(this.lightTransformControl);

        this.lightTransformControl.traverse((child) => {
            child.userData.isGizmo = true;
        });

        this.lightTransformControl.addEventListener('dragging-changed', (event) => {
            this.controls.enabled = !event.value;
        });

        this.lightTransformControl.addEventListener('mouseDown', () => {
            this.controls.enabled = false;
        });

        this.lightTransformControl.addEventListener('mouseUp', () => {
            this.controls.enabled = true;
        });

        this.lightTransformControl.addEventListener('objectChange', () => {
            if (this.selectedLight && this.selectedLight.userData.type !== 'ambient') {
                document.getElementById('light-pos-x').value = this.selectedLight.position.x.toFixed(2);
                document.getElementById('light-pos-y').value = this.selectedLight.position.y.toFixed(2);
                document.getElementById('light-pos-z').value = this.selectedLight.position.z.toFixed(2);
            }
        });
    }

    // ==================== GESTION DES HELPERS DE LUMIÈRE ====================

    createLightHelper(light) {
        const lightId = light.userData.id;

        if (this.lightHelpers.has(lightId)) {
            this.removeLightHelper(lightId);
        }

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
                const sphereGeometry = new THREE.SphereGeometry(0.5, 16, 16);
                const sphereMaterial = new THREE.MeshBasicMaterial({
                    color: 0xffff00,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.5
                });
                helper = new THREE.Mesh(sphereGeometry, sphereMaterial);
                helper.position.copy(light.position);

                const updateAmbientHelper = () => {
                    helper.position.copy(light.position);
                };
                helper.update = updateAmbientHelper;
                break;
        }

        if (helper) {
            helper.visible = false;
            helper.userData.isHelper = true;
            this.scene.add(helper);
            this.lightHelpers.set(lightId, helper);
        }
    }

    removeLightHelper(lightId) {
        const helper = this.lightHelpers.get(lightId);
        if (helper) {
            this.scene.remove(helper);
            this.lightHelpers.delete(lightId);
        }
    }

    updateLightHelper(light) {
        const helper = this.lightHelpers.get(light.userData.id);
        if (helper && helper.update) {
            helper.update();
        }
    }

    showAllLightHelpers() {
        this.lightHelpers.forEach(helper => {
            helper.visible = true;
        });
    }

    hideAllLightHelpers() {
        this.lightHelpers.forEach(helper => {
            helper.visible = false;
        });
    }

    showLightGizmo(light) {
        if (light.userData.positionLocked) {
            this.lightTransformControl.detach();
            this.lightTransformControl.visible = false;
            return;
        }

        this.lightTransformControl.attach(light);
        this.lightTransformControl.visible = true;
    }

    hideLightGizmo() {
        this.lightTransformControl.detach();
        this.lightTransformControl.visible = false;
    }

    // ==================== GESTION DES LUMIÈRES ====================

    initializeDefaultLight(ambientLight) {
        this.defaultAmbientLight = ambientLight;
        this.customLights.push(ambientLight);
        this.createLightHelper(ambientLight);
        console.log('✅ Lumière ambiante par défaut ajoutée à l\'éditeur');
    }

    addNewLight() {
        const lightId = `custom-light-${this.lightIdCounter++}`;

        const light = new THREE.PointLight(0xffffff, 1, 50);
        light.position.set(0, 20, 0);
        light.castShadow = true;
        light.userData.id = lightId;
        light.userData.type = 'point';
        light.userData.positionLocked = false;
        light.userData.isOn = true;
        light.userData.savedIntensity = 1;

        this.scene.add(light);
        this.createLightHelper(light);
        this.customLights.push(light);

        this.updateLightsList();
        this.selectLight(light);

        console.log(`💡 Nouvelle lumière ajoutée: ${lightId}`);
    }

    selectLight(light) {
        this.selectedLight = light;
        this.updateLightsList();
        this.showLightGizmo(light);

        document.getElementById('light-edit-panel').style.display = 'block';

        const displayName = light.userData.isDefault
            ? light.userData.name
            : `Lumière #${this.customLights.indexOf(light) + 1}`;
        document.getElementById('light-edit-name').textContent = displayName;

        document.getElementById('light-type').value = light.userData.type;
        document.getElementById('light-color').value = this.colorToHex(light.color);
        document.getElementById('light-intensity').value = light.intensity;
        document.getElementById('light-intensity-value').textContent = light.intensity.toFixed(1);

        document.getElementById('light-pos-x').value = light.position.x.toFixed(2);
        document.getElementById('light-pos-y').value = light.position.y.toFixed(2);
        document.getElementById('light-pos-z').value = light.position.z.toFixed(2);
        document.getElementById('light-position-controls').style.display = 'block';

        const resetBtn = document.getElementById('reset-ambient-position');
        if (light.userData.isDefault && light.userData.type === 'ambient') {
            resetBtn.style.display = 'block';
        } else {
            resetBtn.style.display = 'none';
        }

        if (light.userData.type === 'spot') {
            document.getElementById('light-angle').value = (light.angle * 180 / Math.PI).toFixed(0);
            document.getElementById('light-angle-value').textContent = (light.angle * 180 / Math.PI).toFixed(0);
            document.getElementById('light-angle-controls').style.display = 'block';
        } else {
            document.getElementById('light-angle-controls').style.display = 'none';
        }

        console.log(`💡 Lumière sélectionnée: ${displayName}`);
    }

    updateLightsList() {
        const ambientSection = document.getElementById('ambient-light-section');
        const listEl = document.getElementById('lights-list');

        ambientSection.innerHTML = '';
        listEl.innerHTML = '';

        let customLightCounter = 1;

        this.customLights.forEach((light) => {
            const lightItem = document.createElement('div');
            lightItem.style.cssText = 'padding: 6px 8px; margin: 2px 0; background: #2a2a2a; border-radius: 4px; border-left: 3px solid #4a4a4a; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.2s;';

            if (this.selectedLight === light) {
                lightItem.style.borderLeftColor = '#4a7ebf';
                lightItem.style.background = '#3a3a3a';
            }

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

            const displayName = light.userData.isDefault
                ? light.userData.name
                : `${typeName} #${customLightCounter}`;

            if (!light.userData.isDefault) {
                customLightCounter++;
            }

            const textDiv = document.createElement('div');
            textDiv.style.cssText = 'flex: 1; display: flex; align-items: center; gap: 6px;';
            textDiv.innerHTML = `
                <span style="display: inline-flex; align-items: center;">${typeIcon}</span>
                <span style="font-size: 10px; color: #d4d4d4; font-weight: 500;">${displayName}</span>
            `;
            textDiv.onclick = () => this.selectLight(light);

            const iconsDiv = document.createElement('div');
            iconsDiv.style.cssText = 'display: flex; gap: 4px; align-items: center;';

            const lockBtn = this.createLockButton(light);
            const bulbBtn = this.createBulbButton(light);

            iconsDiv.appendChild(lockBtn);
            iconsDiv.appendChild(bulbBtn);

            if (!light.userData.isDefault) {
                const trashBtn = this.createTrashButton(light);
                iconsDiv.appendChild(trashBtn);
            }

            lightItem.appendChild(textDiv);
            lightItem.appendChild(iconsDiv);

            if (light.userData.isDefault && light.userData.type === 'ambient') {
                ambientSection.appendChild(lightItem);
            } else {
                listEl.appendChild(lightItem);
            }
        });
    }

    createLockButton(light) {
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
            this.toggleLightPositionLock(light);
        };
        return lockBtn;
    }

    createBulbButton(light) {
        const bulbBtn = document.createElement('span');
        bulbBtn.style.cssText = 'cursor: pointer; user-select: none; display: inline-flex; align-items: center; opacity: 0.7; transition: opacity 0.2s;';
        bulbBtn.onmouseenter = () => bulbBtn.style.opacity = '1';
        bulbBtn.onmouseleave = () => bulbBtn.style.opacity = '0.7';
        const isOn = light.userData.isOn !== false;
        bulbBtn.title = isOn ? 'Éteindre la lumière' : 'Allumer la lumière';
        bulbBtn.innerHTML = isOn
            ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffd700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>';
        bulbBtn.onclick = (e) => {
            e.stopPropagation();
            this.toggleLightOnOff(light);
        };
        return bulbBtn;
    }

    createTrashButton(light) {
        const trashBtn = document.createElement('span');
        trashBtn.style.cssText = 'cursor: pointer; user-select: none; display: inline-flex; align-items: center; opacity: 0.7; transition: opacity 0.2s;';
        trashBtn.onmouseenter = () => trashBtn.style.opacity = '1';
        trashBtn.onmouseleave = () => trashBtn.style.opacity = '0.7';
        trashBtn.title = 'Supprimer cette lumière';
        trashBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>';
        trashBtn.onclick = (e) => {
            e.stopPropagation();
            this.deleteLightFromList(light);
        };
        return trashBtn;
    }

    toggleLightPositionLock(light) {
        light.userData.positionLocked = !light.userData.positionLocked;

        if (light === this.selectedLight && light.userData.positionLocked) {
            this.lightTransformControl.detach();
        }

        if (light === this.selectedLight && !light.userData.positionLocked) {
            this.showLightGizmo(light);
        }

        this.updateLightsList();
        console.log(`🔒 Lumière ${light.userData.name || 'custom'} - Position ${light.userData.positionLocked ? 'verrouillée' : 'déverrouillée'}`);
    }

    toggleLightOnOff(light) {
        const isCurrentlyOn = light.userData.isOn !== false;

        if (isCurrentlyOn) {
            light.userData.savedIntensity = light.intensity;
            light.intensity = 0;
            light.userData.isOn = false;
        } else {
            const savedIntensity = light.userData.savedIntensity || 0.8;
            light.intensity = savedIntensity;
            light.userData.isOn = true;
        }

        this.updateLightsList();

        if (light === this.selectedLight) {
            document.getElementById('light-intensity').value = light.intensity;
            document.getElementById('light-intensity-value').textContent = light.intensity.toFixed(1);
        }
    }

    deleteLightFromList(light) {
        if (light.userData.isDefault) {
            return;
        }

        if (!confirm(`Voulez-vous vraiment supprimer "${light.userData.name || 'cette lumière'}" ?`)) {
            return;
        }

        const lightId = light.userData.id;

        this.removeLightHelper(lightId);

        if (this.selectedLight === light) {
            this.hideLightGizmo();
            this.selectedLight = null;
            document.getElementById('light-edit-panel').style.display = 'none';
        }

        this.scene.remove(light);
        this.customLights = this.customLights.filter(l => l !== light);

        this.updateLightsList();
        console.log('🗑️ Lumière supprimée');
    }

    applyLightSettings() {
        if (!this.selectedLight) return;

        const newType = document.getElementById('light-type').value;
        const oldLightId = this.selectedLight.userData.id;

        if (newType !== this.selectedLight.userData.type) {
            const oldPosition = this.selectedLight.position.clone();
            const oldColor = this.selectedLight.color.clone();
            const oldIntensity = this.selectedLight.intensity;

            const oldUserData = {
                positionLocked: this.selectedLight.userData.positionLocked || false,
                isOn: this.selectedLight.userData.isOn !== false,
                savedIntensity: this.selectedLight.userData.savedIntensity || oldIntensity,
                isDefault: this.selectedLight.userData.isDefault || false,
                name: this.selectedLight.userData.name,
                defaultPosition: this.selectedLight.userData.defaultPosition
            };

            this.removeLightHelper(oldLightId);
            this.scene.remove(this.selectedLight);

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
            newLight.userData.id = oldLightId;
            newLight.userData.type = newType;
            newLight.userData.positionLocked = oldUserData.positionLocked;
            newLight.userData.isOn = oldUserData.isOn;
            newLight.userData.savedIntensity = oldUserData.savedIntensity;
            newLight.userData.isDefault = oldUserData.isDefault;
            if (oldUserData.name) newLight.userData.name = oldUserData.name;
            if (oldUserData.defaultPosition) newLight.userData.defaultPosition = oldUserData.defaultPosition;

            this.scene.add(newLight);
            this.createLightHelper(newLight);

            const index = this.customLights.indexOf(this.selectedLight);
            this.customLights[index] = newLight;
            this.selectedLight = newLight;

            this.showLightGizmo(this.selectedLight);
        }

        this.selectedLight.color.set(document.getElementById('light-color').value);
        this.selectedLight.intensity = parseFloat(document.getElementById('light-intensity').value);

        this.selectedLight.position.x = parseFloat(document.getElementById('light-pos-x').value);
        this.selectedLight.position.y = parseFloat(document.getElementById('light-pos-y').value);
        this.selectedLight.position.z = parseFloat(document.getElementById('light-pos-z').value);

        if (this.selectedLight.userData.isOn !== false) {
            this.selectedLight.userData.savedIntensity = this.selectedLight.intensity;
        }

        if (this.selectedLight.userData.type === 'spot') {
            this.selectedLight.angle = parseFloat(document.getElementById('light-angle').value) * Math.PI / 180;
        }

        this.selectedLight.distance = parseFloat(document.getElementById('light-distance').value);

        this.updateLightHelper(this.selectedLight);
        this.updateLightsList();

        console.log('✅ Paramètres de lumière appliqués');
    }

    // ==================== UTILITAIRES ====================

    colorToHex(color) {
        return '#' + color.getHexString();
    }

    updateObjectInfo() {
        if (!this.selectedEditorObject) return;

        document.getElementById('manual-pos-x').value = this.selectedEditorObject.position.x.toFixed(2);
        document.getElementById('manual-pos-y').value = this.selectedEditorObject.position.y.toFixed(2);
        document.getElementById('manual-pos-z').value = this.selectedEditorObject.position.z.toFixed(2);

        document.getElementById('manual-rot-x').value = (this.selectedEditorObject.rotation.x * 180 / Math.PI).toFixed(0);
        document.getElementById('manual-rot-y').value = (this.selectedEditorObject.rotation.y * 180 / Math.PI).toFixed(0);
        document.getElementById('manual-rot-z').value = (this.selectedEditorObject.rotation.z * 180 / Math.PI).toFixed(0);

        document.getElementById('manual-scale-x').value = this.selectedEditorObject.scale.x.toFixed(2);
        document.getElementById('manual-scale-y').value = this.selectedEditorObject.scale.y.toFixed(2);
        document.getElementById('manual-scale-z').value = this.selectedEditorObject.scale.z.toFixed(2);
    }

    updateCameraPanel() {
        document.getElementById('cam-pos-x').value = this.camera.position.x.toFixed(2);
        document.getElementById('cam-pos-y').value = this.camera.position.y.toFixed(2);
        document.getElementById('cam-pos-z').value = this.camera.position.z.toFixed(2);
        document.getElementById('cam-fov').value = this.camera.fov;
        document.getElementById('fov-value').textContent = this.camera.fov.toFixed(0);
    }

    saveTransformState() {
        // Historique pour undo/redo sera implémenté si nécessaire
    }

    // ==================== SUITE DU CODE... ====================

    setupEventListeners() {
        // Les event listeners seront ajoutés depuis le HTML
        console.log('Event listeners initialisés');
    }

    initializeUI() {
        // L'UI est déjà dans le HTML
        console.log('UI initialisée');
    }

    // ==================== EXPORT / IMPORT JSON ====================

    exportConfiguration() {
        const config = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            camera: {
                position: {
                    x: this.camera.position.x,
                    y: this.camera.position.y,
                    z: this.camera.position.z
                },
                fov: this.camera.fov
            },
            lights: this.customLights
                .filter(light => !light.userData.isDefault)
                .map(light => ({
                    type: light.userData.type,
                    position: { x: light.position.x, y: light.position.y, z: light.position.z },
                    color: this.colorToHex(light.color),
                    intensity: light.intensity,
                    positionLocked: light.userData.positionLocked || false,
                    isOn: light.userData.isOn !== false,
                    angle: light.angle ? light.angle : undefined,
                    distance: light.distance || 50
                })),
            importedObjects: this.importedObjects.map(obj => ({
                fileName: obj.userData.fileName,
                editorName: obj.userData.editorName,
                position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
                rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
                scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z }
            }))
        };

        return config;
    }

    downloadConfiguration(filename = 'scene_config.json') {
        const config = this.exportConfiguration();
        const jsonStr = JSON.stringify(config, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();

        URL.revokeObjectURL(url);
        console.log('📥 Configuration exportée:', filename);
    }

    async loadConfiguration(config) {
        console.log('📂 Chargement de la configuration...', config);

        // Charger la caméra
        if (config.camera) {
            this.camera.position.set(
                config.camera.position.x,
                config.camera.position.y,
                config.camera.position.z
            );
            this.camera.fov = config.camera.fov;
            this.camera.updateProjectionMatrix();
        }

        // Charger les lumières
        if (config.lights) {
            // Supprimer les lumières personnalisées existantes
            const lightsToRemove = this.customLights.filter(l => !l.userData.isDefault);
            lightsToRemove.forEach(light => {
                this.scene.remove(light);
                this.removeLightHelper(light.userData.id);
            });
            this.customLights = this.customLights.filter(l => l.userData.isDefault);

            // Ajouter les nouvelles lumières
            config.lights.forEach(lightData => {
                let light;

                switch(lightData.type) {
                    case 'point':
                        light = new THREE.PointLight(lightData.color, lightData.intensity, lightData.distance || 50);
                        break;
                    case 'directional':
                        light = new THREE.DirectionalLight(lightData.color, lightData.intensity);
                        break;
                    case 'spot':
                        light = new THREE.SpotLight(lightData.color, lightData.intensity, lightData.distance || 50, lightData.angle || Math.PI / 6);
                        break;
                    case 'ambient':
                        light = new THREE.AmbientLight(lightData.color, lightData.intensity);
                        break;
                    default:
                        light = new THREE.PointLight(lightData.color, lightData.intensity, lightData.distance || 50);
                }

                light.position.set(lightData.position.x, lightData.position.y, lightData.position.z);
                light.castShadow = true;
                light.userData.id = `custom-light-${this.lightIdCounter++}`;
                light.userData.type = lightData.type;
                light.userData.positionLocked = lightData.positionLocked || false;
                light.userData.isOn = lightData.isOn !== false;
                light.userData.savedIntensity = lightData.intensity;

                if (!light.userData.isOn) {
                    light.intensity = 0;
                }

                this.scene.add(light);
                this.createLightHelper(light);
                this.customLights.push(light);
            });
        }

        // Charger les objets importés
        if (config.importedObjects) {
            // Note: Les objets doivent être chargés depuis les fichiers GLB
            // Cette partie nécessite que les fichiers GLB soient disponibles
            console.log('⚠️ Les objets importés doivent être rechargés manuellement depuis les fichiers GLB');
        }

        this.updateLightsList();
        console.log('✅ Configuration chargée');
    }

    // ==================== IMPORT D'OBJETS 3D ====================

    importModel(file, onSuccess, onError) {
        const fileName = file.name.toLowerCase();
        if (!fileName.endsWith('.glb') && !fileName.endsWith('.gltf')) {
            if (onError) onError('Format non supporté. Utilisez GLB ou GLTF.');
            return;
        }

        const url = URL.createObjectURL(file);
        const loader = new THREE.GLTFLoader();

        loader.load(
            url,
            (gltf) => {
                this.importedObjectCounter++;
                const objectName = `Objet_Importé_${this.importedObjectCounter}`;
                const model = gltf.scene;

                model.position.set(0, 5, 0);
                model.scale.set(1, 1, 1);

                // CORRECTION DES MATÉRIAUX NOIRS
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;

                        if (child.material) {
                            // Cloner le matériau pour éviter de modifier l'original
                            const originalMaterial = child.material;

                            // Créer un nouveau matériau standard qui réagit à la lumière
                            child.material = new THREE.MeshStandardMaterial({
                                color: originalMaterial.color || 0xffffff,
                                map: originalMaterial.map || null,
                                normalMap: originalMaterial.normalMap || null,
                                roughness: originalMaterial.roughness !== undefined ? originalMaterial.roughness : 0.7,
                                metalness: originalMaterial.metalness !== undefined ? originalMaterial.metalness : 0.1,
                                emissive: 0x000000,
                                emissiveIntensity: 0
                            });

                            child.material.needsUpdate = true;
                        }
                    }
                });

                model.userData.editorName = objectName;
                model.userData.isImported = true;
                model.userData.fileName = file.name;

                this.scene.add(model);
                this.importedObjects.push(model);

                this.selectableObjects.push(model);
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.userData.editorName = objectName;
                        this.selectableObjects.push(child);
                    }
                });

                this.initialTransforms.set(model, {
                    position: model.position.clone(),
                    rotation: model.rotation.clone(),
                    scale: model.scale.clone()
                });

                URL.revokeObjectURL(url);

                if (onSuccess) onSuccess(model);

                console.log(`✅ Modèle "${file.name}" importé avec succès`);
            },
            undefined,
            (error) => {
                URL.revokeObjectURL(url);
                if (onError) onError(error);
                console.error('❌ Erreur lors du chargement:', error);
            }
        );
    }

    // ==================== ACTIVATION / DÉSACTIVATION ====================

    toggle() {
        this.enabled = !this.enabled;
        const panel = document.getElementById('editor-panel');
        panel.classList.toggle('collapsed', !this.enabled);

        if (this.enabled) {
            console.log('🎨 Éditeur activé');
        } else {
            this.transformControl.detach();
            this.cameraTransformControl.visible = false;
            this.lightTransformControl.visible = false;
            this.hideAllLightHelpers();
            console.log('🎮 Mode jeu activé');
        }
    }

    switchMode(mode) {
        this.currentMode = mode;

        document.querySelectorAll('.editor-mode-btn').forEach(btn => {
            btn.classList.remove('tab-active');
        });

        const activeBtn = document.getElementById(`mode-${mode}`);
        activeBtn.classList.add('tab-active');

        document.getElementById('objects-panel').style.display = mode === 'objects' ? 'block' : 'none';
        document.getElementById('camera-panel').style.display = mode === 'camera' ? 'block' : 'none';
        document.getElementById('lights-panel').style.display = mode === 'lights' ? 'block' : 'none';

        if (mode === 'objects') {
            this.cameraTransformControl.visible = false;
            this.hideLightGizmo();
            this.hideAllLightHelpers();
        } else if (mode === 'camera') {
            this.transformControl.detach();
            this.transformControl.visible = false;
            this.selectedEditorObject = null;
            this.hideLightGizmo();
            this.hideAllLightHelpers();
            this.cameraTransformControl.visible = true;
            this.updateCameraPanel();
        } else if (mode === 'lights') {
            this.transformControl.detach();
            this.transformControl.visible = false;
            this.selectedEditorObject = null;
            this.cameraTransformControl.visible = false;
            this.showAllLightHelpers();

            this.updateLightsList();

            if (this.defaultAmbientLight && !this.selectedLight) {
                this.selectLight(this.defaultAmbientLight);
            }
        }

        console.log(`Mode éditeur changé: ${mode}`);
    }
}

// Exporter la classe pour utilisation globale
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SceneEditor;
}
