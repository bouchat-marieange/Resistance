
/**
 * GLTFLoader global avec support Draco (décompression des modèles 3D compressés)
 * Tous les chargements GLB doivent utiliser ce loader partagé.
 */
const dracoLoader = new THREE.DRACOLoader();
dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/js/libs/draco/');
const sharedGLTFLoader = new THREE.GLTFLoader();
sharedGLTFLoader.setDRACOLoader(dracoLoader);

/**
 * CONFIGURATION ET ÉTAT DU JEU
 */

// Variables éditeur minimales pour le mode jeu (l'éditeur complet est chargé via Ctrl+Shift+C)
var interactionMode = 'game';
var editorMode = false;
let spawnNearArcade = false; // sera mis à true dans init() si ?spawn=arcade
// Variables éditeur référencées dans les listeners (absentes en mode jeu pur)
let isSpacePressed = false;
let isSpacePanning = false;
let spacePanCameraStart = null;
let spacePanTargetStart = null;
var currentEditorMode = 'objects';
var selectableObjects = [];
var importedObjects = [];
var importedCharacters = [];
var customLights = [];
var audioTracks = { musique: [], ambiance: [], bruitage: [], mouvement: [] };
var AUDIO_CATEGORIES = ['musique', 'ambiance', 'bruitage', 'mouvement'];
var activeAudioElements = [];
var activeMovementAudio = {};
var MOVEMENT_ACTION_KEYS = { 'forward':['z','w'],'backward':['s'],'left':['q','a'],'right':['d'],'jump':[' '],'crouch':['control'],'run':['shift'],'grab':['e'],'door':['f'] };
var floorPlanWalls = [];
var selectedWalls = [];
var selectedEditorObject = null;
var loadingScreenDismissed = false;
var isPanelCollapsed = false;

// ── Générateur — interaction lumière + son ─────────────────────────────────
var _genLight        = null;   // THREE.PointLight ajoutée au clic
var _genActivated    = false;  // true après le premier clic
var _genSound        = null;   // Audio générateur
var _genArrowEl      = null;   // Div flèche clignotante au-dessus du générateur
var _genBubbleEl     = null;   // Bulle de proximité "Il fait sombre ici"
var _genBubbleShown  = false;
// Position monde du générateur (relevée dans loadPermanentObject)
var GEN_POS = new THREE.Vector3(-18.795, 1.349, -22.631);
var wallHeight = 2.5;
var PLAYER_EYE_HEIGHT = 1.50;
var spawnPosition = null;
var spawnRotationY = 0;
var currentRoomName = 'sas_securite';
var interactionZones = [];
var hoveredZones = new Set();
var proximityTriggeredZones = new Set();
var heldZone = null;
var holdStartTime = 0;
var lastClickTime = 0;
var lastClickZone = null;
var _cinematicPlaying = false;
var _currentCinematicZone = null;
var _gamePaused = false;        // Pause générale (Escape / Share)
var initialCameraSettings = { position: new THREE.Vector3(), fov: 75 };
let scene, camera, renderer, world, controls;
let rug, babyModel, babyBody, groundMesh;
let savedNabyTransform = null; // Transform sauvegardé pour Naby (restauré au chargement du projet)
let nabyRawHeight = null; // Hauteur brute du modèle GLB (avant mise à l'échelle)
let characterCollisionProxies = []; // [{character, proxy}] - Cylindres invisibles pour collision

let walls = [];
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

// Variables pour l'animation et le temps
let mixer; 
const clock = new THREE.Clock();

// Limites de la pièce pour le blocage caméra
const ROOM_LIMIT = 98;

// --- Vecteurs pré-alloués (réutilisés à chaque frame, zéro allocation GC) ---
const _tmpVec3A = new THREE.Vector3();
const _tmpVec3B = new THREE.Vector3();
const _tmpVec3C = new THREE.Vector3();
const _tmpVec2A = new THREE.Vector2();
const _tmpVec2B = new THREE.Vector2();
const _moveForward = new THREE.Vector3();
const _moveRight = new THREE.Vector3();
const _moveInput = new THREE.Vector3();
const _devDirection = new THREE.Vector3();
const _devSide = new THREE.Vector3();
const _slideX = new THREE.Vector3();
const _slideZ = new THREE.Vector3();
const _slideResult = new THREE.Vector3();
const _gpCamDir = new THREE.Vector3();
const _gpCamNewDir = new THREE.Vector3();

// Variables pour le saut et le mouvement
let verticalVelocity = 0;
const gravityConst = 0.015;
const jumpStrength = 0.45;
const baseEyeHeight = 1.60; // Hauteur des yeux (personne de ~1.70m → yeux à ~1.60m)

// Vitesses de déplacement — valeurs fixes (sliders supprimés)
let walkSpeed = 0.8;   // unités/s
let runSpeed = 3;      // unités/s

// --- Système de mouvement immersif ---
let currentSpeed = 0;                    // Vitesse interpolée actuelle
const ACCELERATION = 50.0;              // unités/s² — accélération vive
const DECELERATION = 40.0;             // unités/s² — décélération rapide

// Head bob (balancement de tête)
let headBobTime = 0;
const HEAD_BOB_WALK_FREQ = 8.0;        // oscillations/sec en marchant
const HEAD_BOB_RUN_FREQ  = 12.0;       // oscillations/sec en courant
const HEAD_BOB_WALK_AMP  = 0.008;      // amplitude verticale (m) en marchant (réduit)
const HEAD_BOB_RUN_AMP   = 0.014;      // amplitude verticale (m) en courant (réduit)
let headBobOffset = 0;                  // offset Y courant appliqué à la caméra

// Audio de pas — lecture en boucle continue pendant le déplacement
let isMoving = false;
let wasMoving = false;
const FOOTSTEP_WALK_SRC = 'audios/Mouvement/Pas rapides sur beton cut.mp3';
const FOOTSTEP_RUN_SRC  = 'audios/Mouvement/courir sur beton cut.mp3';
let _footstepWalkAudio = null;  // Audio pré-chargé pour la marche
let _footstepRunAudio = null;   // Audio pré-chargé pour la course
let _footstepWasSprinting = false;

// Matériaux physiques
const shapePhysMaterial = new CANNON.Material("shapeMaterial");
const obstaclePhysMaterial = new CANNON.Material("obstacleMaterial");

const keysPressed = {};

/**
 * UTILITAIRE POUR LES URLS
 */
function resolveURL(path) {
    if (window.location.protocol === 'blob:') {
        return window.location.origin + '/' + path.replace(/^\.\//, '');
    }
    return path;
}

/**
 * INITIALISATION
 */
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xb3e5fc);

    // Récupérer le paramètre d'entrée depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const entryWall = urlParams.get('wall');
    spawnNearArcade = urlParams.get('spawn') === 'arcade';

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);

    // Permettre à la caméra de voir les layers 0 (objets normaux) ET 1 (gizmos)
    camera.layers.enable(0);
    camera.layers.enable(1);

    // Configurer la position et orientation de la caméra selon le mur d'entrée
    if (entryWall === '3') {
        // Arrivée depuis la_villa mur 3 → Face au mur 3 de sas_securite (mur sud)
        camera.position.set(0, baseEyeHeight, -25);
        camera.lookAt(0, baseEyeHeight, 100);
    } else if (spawnNearArcade) {
        // Retour depuis AI Mythology → position provisoire au centre, sera ajustée dès que la borne est chargée
        camera.position.set(0, baseEyeHeight, 0);
        camera.lookAt(0, baseEyeHeight, -10);
    } else {
        // Position par défaut (face au mur 1 - nord)
        camera.position.set(0, baseEyeHeight, 25);
        camera.lookAt(0, baseEyeHeight, 0);
    }

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.physicallyCorrectLights = true;
    document.body.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 2;
    controls.maxDistance = 150;
    controls.maxPolarAngle = Math.PI / 2.1; 
    
    controls.mouseButtons = {
        LEFT: null,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE
    };

    // E3 : mouvement FPS + collisions, extrait dans game/engine/player-movement.js
    // (partagé avec l'éditeur pour "Jouer ici") — voir les wrappers globaux
    // juste avant onWindowResize() plus bas dans ce fichier.
    PlayerMovement.init({
        THREE: THREE,
        camera: camera,
        controls: controls,
        getScene: function() { return scene; },
        input: {
            isActionPressed: function(action) { return InputConfig.isActionPressed(action, keysPressed); },
            isSprintPressed: function() { return !!keysPressed['shift']; }
        },
        gamepad: {
            get connected() { return typeof GamepadManager !== 'undefined' && GamepadManager.connected; },
            getActionValue: function(action) { return GamepadManager.getActionValue(action); }
        },
        getSpawn: function() { return { position: spawnPosition, rotationY: spawnRotationY, saved: spawnSaved }; },
        roomLimit: ROOM_LIMIT,
        eyeHeight: PLAYER_EYE_HEIGHT,
        walkSpeed: walkSpeed,
        runSpeed: runSpeed
    });

    // Rotation FPS souris — Pointer Events + setPointerCapture
    // setPointerCapture force le canvas à recevoir tous les events même hors zone,
    // ce qui fonctionne sur local ET en ligne (HTTPS / GitHub Pages).
    var _fpsPrevX = 0, _fpsPrevY = 0, _fpsCapturedId = null;
    var _fpsMouseDir = new THREE.Vector3();
    renderer.domElement.addEventListener('contextmenu', function(e) { e.preventDefault(); });
    renderer.domElement.addEventListener('pointerdown', function(e) {
        if (interactionMode !== 'game' || e.button !== 2) return;
        e.preventDefault();
        _fpsCapturedId = e.pointerId;
        _fpsPrevX = e.clientX; _fpsPrevY = e.clientY;
        try { renderer.domElement.setPointerCapture(e.pointerId); } catch(ex) {}
    });
    renderer.domElement.addEventListener('pointermove', function(e) {
        if (_fpsCapturedId === null || e.pointerId !== _fpsCapturedId || interactionMode !== 'game') return;
        var dx = e.clientX - _fpsPrevX, dy = e.clientY - _fpsPrevY;
        _fpsPrevX = e.clientX; _fpsPrevY = e.clientY;
        if (dx === 0 && dy === 0) return;
        _fpsMouseDir.subVectors(controls.target, camera.position);
        var dist = Math.max(_fpsMouseDir.length(), 0.001);
        var theta = Math.atan2(_fpsMouseDir.x, _fpsMouseDir.z);
        var phi   = Math.acos(Math.max(-1, Math.min(1, _fpsMouseDir.y / dist)));
        var newTheta = theta - dx * 0.004;
        var newPhi   = Math.max(0.3, Math.min(2.8, phi + dy * 0.004));
        _fpsMouseDir.set(
            dist * Math.sin(newPhi) * Math.sin(newTheta),
            dist * Math.cos(newPhi),
            dist * Math.sin(newPhi) * Math.cos(newTheta)
        );
        controls.target.copy(camera.position).add(_fpsMouseDir);
        camera.lookAt(controls.target);
    });
    renderer.domElement.addEventListener('pointerup', function(e) {
        if (e.button === 2 && _fpsCapturedId !== null) {
            _fpsCapturedId = null;
            try { renderer.domElement.releasePointerCapture(e.pointerId); } catch(ex) {}
        }
    });

    // MODE JEU: Zoom molette actif (exploration) — OrbitControls gère le zoom
    // La molette est libre dans les deux modes (game et developer)

    // Si on démarre en mode jeu, pré-configurer la hauteur des yeux
    setupFPSCamera(); // no-op si interactionMode !== 'game' (garde interne)

    world = new CANNON.World();
    world.gravity.set(0, -20, 0);

    const contactMaterial = new CANNON.ContactMaterial(
        shapePhysMaterial, 
        obstaclePhysMaterial, 
        { friction: 0.4, restitution: 0.2 } 
    );
    world.addContactMaterial(contactMaterial);

    // SEULE LUMIÈRE PAR DÉFAUT : Lumière Ambiante
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    ambientLight.userData.id = 'default-ambient';
    ambientLight.userData.type = 'ambient';
    ambientLight.userData.isDefault = true; // Marquer comme lumière par défaut (non supprimable)
    ambientLight.userData.name = 'Lumière Ambiante';
    ambientLight.userData.positionLocked = true; // Position verrouillée par défaut
    ambientLight.userData.isOn = true; // Lumière allumée par défaut
    ambientLight.userData.savedIntensity = 0.7; // Intensité sauvegardée pour rallumer

    // Position par défaut : centre du plafond (hauteur = 120)
    ambientLight.position.set(0, 120, 0);
    ambientLight.userData.defaultPosition = new THREE.Vector3(0, 120, 0);

    scene.add(ambientLight);

    // Stocker la référence globale pour l'éditeur
    window.defaultAmbientLight = ambientLight;

    // Ajouter une lumière directionnelle douce pour mieux éclairer les objets importés
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.2);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    directionalLight.shadow.mapSize.width = 512;
    directionalLight.shadow.mapSize.height = 512;
    directionalLight.shadow.bias = -0.002;
    directionalLight.shadow.normalBias = 0.02;
    scene.add(directionalLight);

    createFloor();
    createRoomWalls();
    createRug();

    // Initialiser la grille du plan (invisible au départ)
    // Note: createFloorPlanGrid est définie dans editor/floorplan/floorplan-core.js
    // (uniquement chargé par l'éditeur, pas par cette page de jeu — d'où la garde ci-dessous)
    if (typeof createFloorPlanGrid === 'function') {
        createFloorPlanGrid();
        if (floorPlanGrid) {
            floorPlanGrid.visible = false;
        }
    }

    _initCrosshairRefs();
    animate();
    if (typeof initFootstepAudio === 'function') initFootstepAudio();

    // Note: loadAnimatedCharacter() est maintenant appelé APRÈS loadProjectOnStartup()
    // pour que savedNabyTransform soit déjà chargé quand le GLB finit de se charger

    // Note: Les objets permanents (fauteuil et lampe) sont maintenant chargés via loadProjectOnStartup()
    // soit depuis le projet sauvegardé, soit par défaut si aucun projet n'existe

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // Audio mouvement : détection mouvement souris (caméra)
    window.addEventListener('pointermove', () => { checkMovementAudioMouse(); });

    window.addEventListener('keydown', (e) => {
        // Si un dialogue OU le carnet est ouvert, les controles jeu sont bloques.
        // DialogueManager / NotebookManager gerent Echap pour fermer via leurs propres listeners.
        var dialogOn = typeof DialogueManager !== 'undefined' && DialogueManager.isActive();
        var notebookOn = typeof NotebookManager !== 'undefined' && NotebookManager.isOpen();
        if (dialogOn || notebookOn) {
            // Permet de fermer le carnet avec J meme quand il est ouvert
            if (notebookOn && e.key.toLowerCase() === 'j') {
                NotebookManager.close();
                e.preventDefault();
            }
            return;
        }
        keysPressed[e.key.toLowerCase()] = true;
        // Empêcher le scroll de la page quand l'espace est pressé en mode développeur
        if (e.code === 'Space' && interactionMode === 'developer' && editorMode) {
            e.preventDefault();
        }
        // TEST TFE - Touche T : ouvre le dialogue Naby (placeholder avant integration 3D)
        if (e.key.toLowerCase() === 't' && typeof DialogueManager !== 'undefined') {
            DialogueManager.start('naby');
            e.preventDefault();
            return;
        }
        // Espace → Pause générale du jeu (uniquement une fois le loading terminé)
        // Escape est réservé à la sortie du plein écran (géré nativement par le navigateur)
        if (e.code === 'Space' && loadingScreenDismissed && !['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) {
            togglePause3D();
            e.preventDefault();
            return;
        }
        // TFE - Touche J : ouvre le carnet (met le jeu en pause)
        if (e.key.toLowerCase() === 'j' && typeof NotebookManager !== 'undefined') {
            NotebookManager.open();
            e.preventDefault();
            return;
        }
        // TFE - Touche M : toggle minimap (replie/deplie)
        if (e.key.toLowerCase() === 'm' && typeof MinimapManager !== 'undefined') {
            MinimapManager.toggle();
            e.preventDefault();
            return;
        }
        onKeyDown(e);
        checkMovementAudioKeyDown(e.key);
    });
    window.addEventListener('keyup', (e) => {
        keysPressed[e.key.toLowerCase()] = false;
        checkMovementAudioKeyUp(e.key);
    });

    // Réinitialiser l'état du panning espace si la fenêtre perd le focus
    window.addEventListener('blur', () => {
        // Reset mouvement FPS si la fenêtre perd le focus
        PlayerMovement.resetMovementState();
        wasMoving = false;
        stopAllFootstepAudio();

        if (isSpacePressed || isSpacePanning) {
            isSpacePressed = false;
            isSpacePanning = false;
            spacePanCameraStart = null;
            spacePanTargetStart = null;
            const canvas = renderer.domElement;
            canvas.classList.remove('space-pan-hand', 'space-pan-grabbing');
            controls.enabled = true;
            if (currentEditorMode === 'floor-plan') {
                updateFloorPlanCursor();
            }
        }
    });
    
}

function createFloor() {
    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    groundMesh = new THREE.Mesh(floorGeo, floorMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    groundMesh.name = 'ground';
    scene.add(groundMesh);

    const groundBody = new CANNON.Body({ 
        mass: 0, 
        shape: new CANNON.Plane(),
        material: obstaclePhysMaterial 
    });
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(groundBody);
}

function createRoomWalls() {
    // Supprimé : les murs de limite de scène ne sont plus créés
    // Les murs du plan au sol définissent maintenant les limites de la pièce
}

function createWallNumbers() {
    // Supprimé : les numéros de murs ne sont plus créés
}

/**
 * CHARGEMENT DU PERSONNAGE ANIMÉ (nabydance.glb) - VERSION OPTIMISÉE
 */
function loadAnimatedCharacter() {
    return new Promise((resolveLoad) => {
    const loader = sharedGLTFLoader;
    const url = resolveURL('3D/perso/nabydance.glb');
    console.log("Chargement du modèle 3D avec animation:", url);

    loader.load(url,
        (gltf) => {
            babyModel = gltf.scene;

            // Échelle unitaire pour mesurer la vraie taille via les os du squelette
            babyModel.scale.set(1, 1, 1);
            babyModel.updateMatrixWorld(true);

            // Mesurer la hauteur RÉELLE par les positions mondiales des os (bones).
            // C'est la seule méthode fiable car Box3.setFromObject() ne capture PAS
            // les transformations du squelette/armature appliquées par le skinning GPU.
            const boneMeasure = measureCharacterByBones(babyModel);
            let effectiveRawHeight;
            let rawVisualSize;

            if (boneMeasure) {
                effectiveRawHeight = boneMeasure.height;
                rawVisualSize = new THREE.Vector3(boneMeasure.width, boneMeasure.height, boneMeasure.depth);
                console.log("📏 Naby mesurée par os:", boneMeasure.boneCount, "os → H:", effectiveRawHeight.toFixed(4), "m");
            } else {
                // Fallback: Box3 (imprécis pour SkinnedMesh mais mieux que rien)
                const rawBox = new THREE.Box3().setFromObject(babyModel);
                effectiveRawHeight = rawBox.max.y - rawBox.min.y;
                rawVisualSize = rawBox.getSize(new THREE.Vector3());
                console.warn("⚠️ Naby: pas assez d'os, fallback Box3 → H:", effectiveRawHeight.toFixed(4), "m");
            }

            nabyRawHeight = effectiveRawHeight;

            // Stocker les dimensions visuelles à l'échelle 1 pour le label de dimensions
            // referenceHeightAtScale1 = hauteur visuelle quand scale=1, pour calcul stable du label
            babyModel.userData.referenceHeightAtScale1 = effectiveRawHeight;
            babyModel.userData.referenceWidthAtScale1 = rawVisualSize.x;
            babyModel.userData.referenceDepthAtScale1 = rawVisualSize.z;
            babyModel.userData.isCharacter = true;
            babyModel.userData.editorName = 'Naby';

            const TARGET_HEIGHT = 1.70; // Hauteur cible par défaut en mètres

            if (savedNabyTransform) {
                // Restaurer la position/rotation
                babyModel.position.set(savedNabyTransform.position.x, savedNabyTransform.position.y, savedNabyTransform.position.z);
                babyModel.rotation.set(savedNabyTransform.rotation.x || 0, savedNabyTransform.rotation.y || 0, savedNabyTransform.rotation.z || 0);

                // Valider : re-mesurer à l'échelle sauvegardée pour vérifier
                babyModel.scale.set(savedNabyTransform.scale.x, savedNabyTransform.scale.y, savedNabyTransform.scale.z);
                babyModel.updateMatrixWorld(true);
                const checkMeasure = measureCharacterByBones(babyModel);
                const restoredHeight = checkMeasure ? checkMeasure.height : savedNabyTransform.scale.y * effectiveRawHeight;

                if (restoredHeight >= 0.1 && restoredHeight <= 5.0) {
                    console.log("Naby restaurée, échelle:", savedNabyTransform.scale.y.toFixed(4), "→ hauteur mesurée:", restoredHeight.toFixed(2) + "m");
                } else {
                    // Échelle invalide → recalculer
                    const nabyScale = TARGET_HEIGHT / effectiveRawHeight;
                    babyModel.scale.set(nabyScale, nabyScale, nabyScale);
                    console.warn("⚠️ Échelle sauvegardée invalide (hauteur:", restoredHeight.toFixed(2) + "m) → réinitialisée à", TARGET_HEIGHT + "m");
                }
            } else {
                // Première fois : ajuster l'échelle pour que Naby fasse 1.70m de haut
                const nabyScale = TARGET_HEIGHT / effectiveRawHeight;
                babyModel.scale.set(nabyScale, nabyScale, nabyScale);
                console.log("Naby première apparition, hauteur mesurée:", effectiveRawHeight.toFixed(4), "→ échelle:", nabyScale.toFixed(4));
            }

            // Debug
            console.log("Nombre d'animations:", gltf.animations ? gltf.animations.length : 0);

            // Mesurer la taille finale après mise à l'échelle (par les os)
            babyModel.updateMatrixWorld(true);
            const finalMeasure = measureCharacterByBones(babyModel);
            const size = finalMeasure
                ? new THREE.Vector3(finalMeasure.width, finalMeasure.height, finalMeasure.depth)
                : new THREE.Box3().setFromObject(babyModel).getSize(new THREE.Vector3());

            if (!savedNabyTransform) {
                // Position par défaut seulement si pas de sauvegarde - pieds au sol
                babyModel.updateMatrixWorld(true);
                const posBox = new THREE.Box3().setFromObject(babyModel);
                const defaultHeightOffset = -posBox.min.y;
                const defaultPos = new THREE.Vector3(26, 0.08 + defaultHeightOffset, -30);
                babyModel.position.copy(defaultPos);
            }

            console.log("Position finale:", babyModel.position, "Taille:", size.y.toFixed(2) + "m");

            // Configuration des ombres et matériaux pour le rendu de l'animation
            babyModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.userData.isCharacter = true; // Marquer tous les meshes enfants
                    // Désactiver le frustum culling pour les SkinnedMesh animés
                    // car Three.js calcule le bounding sphere au repos, pas à la pose animée,
                    // ce qui fait disparaître le personnage quand la caméra s'approche
                    child.frustumCulled = false;
                    if(child.material) {
                        child.material.needsUpdate = true;
                    }
                }
            });

            scene.add(babyModel);
            babyModel.updateMatrixWorld(true);

            // Appliquer les réglages visuels sauvegardés (luminosité, exposition, etc.)
            if (savedNabyTransform) {
                if (savedNabyTransform.customRoughness !== undefined) babyModel.userData.customRoughness = savedNabyTransform.customRoughness;
                if (savedNabyTransform.customBrightness !== undefined) babyModel.userData.customBrightness = savedNabyTransform.customBrightness;
                if (savedNabyTransform.customExposure !== undefined) babyModel.userData.customExposure = savedNabyTransform.customExposure;
                if (savedNabyTransform.customContrast !== undefined) babyModel.userData.customContrast = savedNabyTransform.customContrast;
                if (savedNabyTransform.customOffset !== undefined) babyModel.userData.customOffset = savedNabyTransform.customOffset;
                if (savedNabyTransform.customGamma !== undefined) babyModel.userData.customGamma = savedNabyTransform.customGamma;
                // Roughness
                if (savedNabyTransform.customRoughness !== undefined) {
                    babyModel.traverse(function(child) {
                        if (child.isMesh && child.material && child.material.roughness !== undefined) {
                            child.material.roughness = savedNabyTransform.customRoughness;
                            child.material.needsUpdate = true;
                        }
                    });
                }
                // Réglages visuels via _applyVisualSettings
                if (typeof _applyVisualSettings === 'function') {
                    _applyVisualSettings(babyModel);
                }
            }

            // INITIALISATION DU MIXER SUR LA SCÈNE COMPLÈTE
            mixer = new THREE.AnimationMixer(babyModel);

            // On cherche l'animation de danse et on la joue en boucle
            if (gltf.animations && gltf.animations.length > 0) {
                console.log("Animation trouvée:", gltf.animations[0].name);
                console.log("Durée:", gltf.animations[0].duration, "secondes");

                // On joue la première animation disponible en boucle
                const action = mixer.clipAction(gltf.animations[0]);
                action.setLoop(THREE.LoopRepeat, Infinity); // Boucle infinie
                action.setEffectiveWeight(1.0);
                action.clampWhenFinished = false;
                action.play();

                console.log("Animation lancée avec succès");
            } else {
                console.warn("Aucune animation trouvée dans nabydance.glb");
            }

            // Physique simplifiée
            babyBody = new CANNON.Body({
                mass: 0,
                material: obstaclePhysMaterial,
                position: new CANNON.Vec3(babyModel.position.x, babyModel.position.y, babyModel.position.z)
            }); 
            
            const baseShape = new CANNON.Box(new CANNON.Vec3(size.x * 0.35, size.y * 0.1, size.z * 0.4));
            babyBody.addShape(baseShape, new CANNON.Vec3(0, size.y * 0.1, 0.3));
            
            const torsoShape = new CANNON.Box(new CANNON.Vec3(size.x * 0.22, size.y * 0.2, size.z * 0.22));
            babyBody.addShape(torsoShape, new CANNON.Vec3(0, size.y * 0.4, 0));
            
            const headShape = new CANNON.Sphere(size.x * 0.28);
            babyBody.addShape(headShape, new CANNON.Vec3(0, size.y * 0.78, 0.1));
            
            babyBody.updateBoundingRadius();
            world.addBody(babyBody);

            // Ajouter Naby aux objets sélectionnables (si l'éditeur est chargé)
            if (typeof makeObjectsSelectable === 'function') makeObjectsSelectable();
            if (editorMode && typeof updateObjectsList === 'function') {
                updateObjectsList();
            }
            // Créer le proxy de collision pour bloquer le joueur
            createCharacterCollisionProxy(babyModel);
            console.log('✅ BabyModel chargé - ajouté aux objets sélectionnables');
            resolveLoad(true);
        },
        undefined,
        (error) => {
            console.warn("nabydance.glb introuvable ou corrompu.");
            resolveLoad(false);
        }
    );
    }); // fin Promise
}

/**
 * CHARGEMENT DES OBJETS PERMANENTS (Fauteuil rouge et Lampe sur pied)
 * Ces objets sont chargés uniquement s'il n'y a pas de projet sauvegardé
 */
function loadPermanentObjects() {
    console.log('📦 Chargement des objets permanents par défaut...');

    const loader = sharedGLTFLoader;

    // Helper : applique les overrides localStorage (position/matériaux sauvegardés) à un modèle
    function _applyPermanentOverride(model, name) {
        const ov = window._permanentObjectOverrides && window._permanentObjectOverrides[name];
        if (!ov) return;
        if (ov.position) model.position.set(ov.position.x, ov.position.y, ov.position.z);
        if (ov.rotation) model.rotation.set(ov.rotation.x, ov.rotation.y, ov.rotation.z);
        if (ov.scale)    model.scale.set(ov.scale.x, ov.scale.y, ov.scale.z);
        if (ov.customRoughness !== undefined) {
            model.userData.customRoughness = ov.customRoughness;
            model.traverse(function(child) {
                if (child.isMesh && child.material && child.material.roughness !== undefined) {
                    child.material.roughness = ov.customRoughness;
                    child.material.needsUpdate = true;
                }
            });
        }
        if (ov.customBrightness !== undefined) model.userData.customBrightness = ov.customBrightness;
        if (ov.customExposure  !== undefined) model.userData.customExposure  = ov.customExposure;
        if (ov.customContrast  !== undefined) model.userData.customContrast  = ov.customContrast;
        if (ov.customOffset    !== undefined) model.userData.customOffset    = ov.customOffset;
        if (ov.customGamma     !== undefined) model.userData.customGamma     = ov.customGamma;
        if (ov.customOpacity   !== undefined) model.userData.customOpacity   = ov.customOpacity;
        if (typeof _applyVisualSettings === 'function') _applyVisualSettings(model);
        console.log(`🎨 Override appliqué : ${name}`);
    }

    // Fonction helper pour charger un objet permanent avec son fileData
    function loadPermanentObject(url, name, defaultPos, defaultRot, defaultScale, onLoaded) {
        // Anti-doublon IndexedDB : si l'objet est en cours de chargement depuis IndexedDB
        // (async, pas encore dans importedObjects), ne pas le charger une deuxième fois.
        // Vérifier par editorName ET par fileName.
        var fileName = url.split('/').pop();

        // Chargement depuis l'URL — extrait en inner function pour être appelé
        // aussi en fallback si le blob IndexedDB est manquant.
        function _doLoadFromUrl() {
            // Chargement direct via loader (supporte Draco via sharedGLTFLoader).
            // On ne passe PAS par fetch()+btoa() : pour les gros fichiers (>1 Mo),
            // la boucle de conversion base64 gèle le thread JS et le .catch() masque
            // l'erreur → loader.load() n'est jamais appelé et l'objet reste absent.
            loader.load(
                url,
                function(gltf) {
                    const model = gltf.scene;
                    // Personnage animé (skinned + animations) ? -> mixer + frustumCulled off
                    const _isAnimated = gltf.animations && gltf.animations.length > 0;

                    // Appliquer les coordonnées par défaut
                    model.position.set(defaultPos.x, defaultPos.y, defaultPos.z);
                    model.rotation.set(defaultRot.x, defaultRot.y, defaultRot.z);
                    model.scale.set(defaultScale.x, defaultScale.y, defaultScale.z);

                    // Configurer les ombres et matériaux
                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            // SkinnedMesh : bounding sphere calculee au repos -> disparait si culling actif
                            if (_isAnimated) child.frustumCulled = false;
                            if (child.material) {
                                if (child.material.type === 'MeshBasicMaterial') {
                                    const oldMaterial = child.material;
                                    child.material = new THREE.MeshStandardMaterial({
                                        color: oldMaterial.color,
                                        map: oldMaterial.map,
                                        roughness: 0.7,
                                        metalness: 0.1
                                    });
                                }
                                // Correction critique : metalness=1 rend les objets comme des miroirs noirs
                                if (child.material.metalness === 1) child.material.metalness = 0;
                                // Correction encodage texture
                                if (child.material.map) { child.material.map.encoding = THREE.sRGBEncoding; child.material.map.needsUpdate = true; }
                                if (child.material.aoMap) child.material.aoMapIntensity = 0.3;
                                child.material.needsUpdate = true;
                            }
                        }
                    });

                    // Marquer le modèle
                    model.userData.editorName = name;
                    model.userData.isImported = true;
                    model.userData.fileName = url.split('/').pop();
                    // Note : pas de fileData (pas de btoa) — objets permanents rechargés depuis URL

                    // Personnage animé : créer le mixer + lancer l'animation (ex : Raya marche en rond)
                    // La boucle animate() met à jour les mixers de importedCharacters.
                    if (_isAnimated) {
                        model.userData.isCharacter = true;
                        const _permMixer = new THREE.AnimationMixer(model);
                        _permMixer.clipAction(gltf.animations[0]).play();
                        model.userData.mixer = _permMixer;
                        model.userData.animations = gltf.animations;
                        if (typeof importedCharacters !== 'undefined' && !importedCharacters.includes(model)) {
                            importedCharacters.push(model);
                        }
                        console.log('🎬 Permanent animé : ' + name + ' (' + gltf.animations[0].name + ', ' + gltf.animations[0].duration.toFixed(2) + 's)');
                    }

                    // Appliquer les overrides localStorage si présents
                    _applyPermanentOverride(model, name);

                    scene.add(model);

                    // Ajouter à importedObjects pour la sauvegarde
                    importedObjects.push(model);

                    // Ajouter aux objets sélectionnables
                    selectableObjects.push(model);
                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.userData.editorName = name;
                            selectableObjects.push(child);
                        }
                    });

                    console.log(`✅ ${name} chargé depuis URL`);

                    if (typeof onLoaded === 'function') onLoaded(model);

                    if (typeof scheduleUpdateObjectsList === 'function') {
                        scheduleUpdateObjectsList();
                    } else if (typeof updateObjectsList === 'function') {
                        updateObjectsList();
                    }
                },
                undefined,
                function(error) {
                    console.warn(`❌ Erreur chargement permanent "${name}" depuis ${url.split('/').pop()}:`, error);
                }
            );
        }

        if ((window._idbPendingObjects && window._idbPendingObjects.has(name)) ||
            (window._idbPendingFileNames && window._idbPendingFileNames.has(fileName))) {
            console.log('⏳ ' + name + ' (' + fileName + ') en cours depuis IndexedDB — skip loadPermanentObject');
            // Attendre que l'objet soit chargé depuis IndexedDB.
            // Si IDB échoue (blob manquant) → les pending sets seront vidés par restoreImportedObject
            // → l'intervalle détecte l'échec et bascule en fallback URL.
            var _idbTimeout = null;
            var _waitForIdb = setInterval(function() {
                var loaded = importedObjects.find(function(o) {
                    return o.userData.editorName === name ||
                           (o.userData.fileName && o.userData.fileName === fileName);
                });
                if (loaded) {
                    clearInterval(_waitForIdb);
                    clearTimeout(_idbTimeout);
                    if (!importedObjects.includes(loaded)) importedObjects.push(loaded);
                    if (!selectableObjects.includes(loaded)) selectableObjects.push(loaded);
                    _applyPermanentOverride(loaded, name);
                    if (typeof onLoaded === 'function') onLoaded(loaded);
                    return;
                }
                // IDB terminé (pending sets vidés) mais objet absent → fallback URL
                var idbStillPending = (window._idbPendingObjects && window._idbPendingObjects.has(name)) ||
                                      (window._idbPendingFileNames && window._idbPendingFileNames.has(fileName));
                if (!idbStillPending) {
                    clearInterval(_waitForIdb);
                    clearTimeout(_idbTimeout);
                    console.warn('⚠️ IDB terminé sans résultat pour ' + name + ' — fallback chargement URL');
                    _doLoadFromUrl();
                }
            }, 100);
            // Timeout de sécurité : 15 secondes max
            // Si les pending sets ne sont jamais vidés (erreur silencieuse dans loadObjectFromURL),
            // déclencher quand même le fallback URL pour ne pas perdre l'objet.
            _idbTimeout = setTimeout(function() {
                var alreadyLoaded = importedObjects.find(function(o) {
                    return o.userData.editorName === name ||
                           (o.userData.fileName && o.userData.fileName === fileName);
                });
                if (!alreadyLoaded) {
                    clearInterval(_waitForIdb);
                    console.warn('⚠️ Timeout IDB pour ' + name + ' — fallback URL de secours');
                    _doLoadFromUrl();
                }
            }, 15000);
            return;
        }

        // Si l'objet est déjà dans la scène (depuis IndexedDB ou loadAnimatedCharacter),
        // on ne le recharge pas — on appelle juste onLoaded avec le modèle existant
        var existingByFile = scene.children.find(function(o) { return o.userData && o.userData.fileName === fileName && fileName !== '__rug__'; });
        const existing = importedObjects.find(o => o.userData.editorName === name)
                      || scene.children.find(o => o.userData && o.userData.editorName === name)
                      || existingByFile;
        if (existing) {
            console.log(`♻️ ${name} déjà en scène — skip chargement GLB`);

            // S'assurer que l'objet est bien dans selectableObjects (peut manquer si chargé depuis IndexedDB)
            if (!selectableObjects.includes(existing)) {
                selectableObjects.push(existing);
                existing.traverse((child) => {
                    if (child.isMesh && !selectableObjects.includes(child)) {
                        child.userData.editorName = name;
                        selectableObjects.push(child);
                    }
                });
            }

            // S'assurer qu'il est aussi dans importedObjects
            if (!importedObjects.includes(existing)) {
                importedObjects.push(existing);
            }

            // Appliquer les overrides localStorage si présents (chemin fallback localStorage)
            _applyPermanentOverride(existing, name);

            if (typeof scheduleUpdateObjectsList === 'function') {
                scheduleUpdateObjectsList();
            }

            if (typeof onLoaded === 'function') onLoaded(existing);
            return;
        }

        _doLoadFromUrl();
    }

    // ── Objets de la scène sas_securite ─────────────────────────────────────
    // Seuls ces 7 objets + Naby animée (loadAnimatedCharacter) + Tapis (createRug)
    // sont autorisés dans la scène. Tout autre objet restauré depuis IndexedDB
    // est purgé par le nettoyage post-chargement dans window.onload.

    // Lampe sur pied
    // IMPORTANT: le name doit correspondre exactement à l'editorName dans IndexedDB
    // pour que l'anti-doublon détecte le chargement IDB en cours.
    loadPermanentObject(
        resolveURL('3D/objet/lampe-sur-pied.glb'),
        'lampe sur pied',
        { x: -4.665, y: 0,     z: -7.297 },
        { x: Math.PI, y: -0.2087, z: Math.PI },
        { x: 1.798, y: 1.798, z: 1.798 }
    );

    // Fauteuil rouge expo
    loadPermanentObject(
        resolveURL('3D/objet/fauteuil-rouge-expo.glb'),
        'Fauteuil rouge expo +',
        { x: -4.404, y: 0,     z: -6.478 },
        { x: 0, y: 1.5693, z: 0 },
        { x: 1.311, y: 1.311, z: 1.311 }
    );

    // Cadre dessin
    loadPermanentObject(
        resolveURL('3D/objet/cadre-dessin.glb'),
        'Cadre dessin',
        { x: -4.894, y: 1.656, z: -6.476 },
        { x: -Math.PI, y: 1.5143, z: -Math.PI },
        { x: 1.0, y: 1.0, z: 1.0 }
    );

    // Guitare classique
    loadPermanentObject(
        resolveURL('3D/objet/guitare-classique.glb'),
        'Guitare classique',
        { x: -4.527, y: 0.491, z: -5.691 },
        { x: -0.7499, y: 0.7965, z: 0.5777 },
        { x: 1.182, y: 1.182, z: 1.182 }
    );

    // Générateur
    loadPermanentObject(
        resolveURL('3D/objet/generateur-compressed.glb'), // PERF : 10.2 Mo -> 4.15 Mo
        'Générateur',
        { x: -18.795, y: 1.349, z: -22.631 },
        { x: -Math.PI, y: 1.540, z: -Math.PI },
        { x: 2.095, y: 2.095, z: 2.095 }
    );

    // Berger Allemand Debout (seul chien gardé)
    loadPermanentObject(
        resolveURL('3D/perso/berger-allemand-compressed.glb'), // PERF : 15.4 Mo -> 1.28 Mo
        'Berger Allemand Debout',
        { x: -2.158, y: 0.487, z: -6.462 },
        { x: -Math.PI, y: 0.1494, z: -Math.PI },
        { x: 0.705, y: 0.705, z: 0.705 }
    );

    // Porte industrielle d'entrée (derrière le joueur — côté Bruxelles Dystopique)
    loadPermanentObject(
        resolveURL('3D/objet/porte-industrielle.glb'),
        'Porte entrée',
        { x: 2.309, y: 0, z: -39.948 },
        { x: 0, y: -0.0255, z: 0 },
        { x: 0.00873, y: 0.00873, z: 0.00873 },
        function(model) {
            interactionZones.push({
                id: 'porte-entree-bruxelles',
                surfaceMode: 'object',
                objectRef: { editorName: 'Porte entrée' },
                actionType: 'link',
                actionValue: 'bruxelles_dystopique.html',
                customName: '← Retour — Bruxelles Dystopique',
                triggerType: 'click',
                bounds: { minX: 0.0, maxX: 4.6, minZ: -42.0, maxZ: -37.5 },
                y: 1.5
            });
            console.log('🚪 Porte entrée (Bruxelles Dystopique) enregistrée');
        }
    );

    // Borne d'arcade AI Mythology (y relevé pour éviter de s'enfoncer dans le sol)
    loadPermanentObject(
        resolveURL('3D/objet/arcade-compressed.glb'), // PERF : 40.3 Mo -> 0.35 Mo (decimation aggressive — verifier visuel)
        'Borne Arcade AI Mythology',
        { x: 0.5, y: 0.85, z: -7.5 },
        { x: 0, y: THREE.MathUtils.degToRad(90), z: 0 },
        { x: 1.0, y: 1.0, z: 1.0 },
        function(model) {
            // Supprimer toute zone existante liée à la borne arcade
            // (l'IDB peut avoir id:8 ou id:'arcade-ai-mythology' selon la version sauvegardée)
            for (var _i = interactionZones.length - 1; _i >= 0; _i--) {
                var _z = interactionZones[_i];
                if (_z.id === 'arcade-ai-mythology' ||
                    (_z.objectRef && _z.objectRef.editorName === 'Borne Arcade AI Mythology') ||
                    (_z.actionValue && _z.actionValue.indexOf('AI') > -1 && _z.actionValue.indexOf('Mythology') > -1)) {
                    interactionZones.splice(_i, 1);
                }
            }

            // Bounds calculées depuis la position réelle du modèle chargé
            var _arcadePos = new THREE.Vector3();
            model.getWorldPosition(_arcadePos);
            var _hs = 0.6; // demi-largeur de la zone de détection
            interactionZones.push({
                id: 'arcade-ai-mythology',
                surfaceMode: 'object',
                objectRef: { editorName: 'Borne Arcade AI Mythology' },
                actionType: 'link',
                actionValue: './ai-mythology/index.html',
                customName: 'Jouer — AI Mythology',
                triggerType: 'click',
                bounds: {
                    minX: _arcadePos.x - _hs,
                    maxX: _arcadePos.x + _hs,
                    minZ: _arcadePos.z - _hs,
                    maxZ: _arcadePos.z + _hs
                },
                y: _arcadePos.y + 1.0
            });

            // Boîte de collision invisible autour de la borne
            // (la géométrie GLB seule n'est pas assez fiable pour bloquer le joueur)
            var box = new THREE.Mesh(
                new THREE.BoxGeometry(1.0, 2.2, 0.7),
                new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
            );
            box.position.set(model.position.x, model.position.y + 1.1 - 0.85, model.position.z);
            box.userData.isEnvironment = true;
            box.userData.editorName = 'Arcade-collision-proxy';
            scene.add(box);
            invalidateCollisionCache();
            console.log('🕹️ Zone arcade AI Mythology enregistrée + collision proxy');
        }
    );

    // ── Coin vinyles : meuble + tourne-disque (fallback URL si blob IDB absent) ──
    loadPermanentObject(
        resolveURL('3D/objet/meuble-vinyle-compressed.glb'),
        'meuble vinyls',
        { x: -4.6512, y: 0, z: 1.2135 },
        { x: -Math.PI, y: 1.5503, z: -Math.PI },
        { x: 1, y: 1, z: 1 }
    );
    loadPermanentObject(
        resolveURL('3D/objet/tourne-disque-compressed.glb'),
        'tourne-disques',
        { x: -4.6872, y: 0.88814, z: 1.2027 },
        { x: -Math.PI, y: 1.5612, z: -Math.PI },
        { x: 0.5774, y: 0.5774, z: 0.5774 }
    );

    // ── Ascenseur (fallback URL — version compressée) ──
    loadPermanentObject(
        resolveURL('3D/objet/ascenseur-compressed.glb'),
        'ascenseur',
        { x: -6.7568, y: 1.63889, z: -14.1798 },
        { x: -Math.PI, y: 1.5615, z: -Math.PI },
        { x: 1.6523, y: 1.5582, z: 1.2898 }
    );

    // ── Salon : 2 canapés chesterfield + table (versions compressées) ──
    loadPermanentObject(
        resolveURL('3D/objet/canape-chesterfield-compressed.glb'),
        'canape chersterfield 1',
        { x: 0.2172, y: 0.4610, z: 2.3185 },
        { x: 0, y: 1.5679, z: 0 },
        { x: 2.23, y: 2.23, z: 2.23 }
    );
    loadPermanentObject(
        resolveURL('3D/objet/canape-chesterfield-compressed.glb'),
        'canape chesterfield 2',
        { x: -2.5978, y: 0.4312, z: 2.2804 },
        { x: 0, y: -1.5414, z: 0 },
        { x: 2.23, y: 2.23, z: 2.23 }
    );
    loadPermanentObject(
        resolveURL('3D/objet/table-salon-compressed.glb'),
        'table salon',
        { x: -1.0917, y: 0.1926, z: 2.3694 },
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 1, z: 1 }
    );

    // ── Bureau (coin ordinateur) ──
    loadPermanentObject(
        resolveURL('3D/objet/bureau-compressed.glb'),
        'bureau',
        { x: -4.026413817357325, y: 0.5060929076152247, z: -8.206956281954799 },
        { x: 0, y: -1.5403901301767253, z: 0 },
        { x: 1.8033439777964964, y: 1.8033439777964964, z: 1.8033439777964964 }
    );

    // ── Bibliothèque ──
    loadPermanentObject(
        resolveURL('3D/objet/bibliotheque-compressed.glb'),
        'Bibliothèque',
        { x: -1.36, y: 1.62, z: 4.72 },
        { x: -Math.PI, y: -5.121780228008738e-05, z: -Math.PI },
        { x: 3.5, y: 3.16, z: 3.16 }
    );

    // ── Personnages animés ──
    loadPermanentObject(
        resolveURL('3D/perso/Raya-marche-en-rond-compressed.glb'),
        'Raya marche en rond',
        { x: -8.955451257352925, y: 0.06, z: -1.7768033270822956 },
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 1, z: 1 }
    );
    loadPermanentObject(
        resolveURL('3D/perso/Meshy-walking-compressed.glb'),
        'Berger allemande marche',
        { x: -7.584577324943626, y: 0.010210318245277138, z: 2.171100558770921 },
        { x: Math.PI, y: -0.7223505256576521, z: Math.PI },
        { x: 410.2634597009405, y: 410.2634597009405, z: 410.2634597009405 }
    );

    // Tapis procédural — recréé ici car loadProjectFromIndexedDB purge importedObjects
    createRug();
}

function createRug() {
    // Anti-doublon : loadProjectFromIndexedDB supprime les importedObjects existants
    // puis loadPermanentObjects le recrée — on vérifie avant de dupliquer
    if (importedObjects.find(function(o) { return o.userData && o.userData.fileName === '__rug__'; })) return;
    const rugSize = 2.5; // ~2.5m de côté (proportion réaliste)
    const rugGeo = new THREE.PlaneGeometry(rugSize, rugSize);
    const rugMat = new THREE.MeshStandardMaterial({ color: 0xddc4a2, roughness: 1.0 });

    new THREE.TextureLoader().load(resolveURL('images/tapis.jpg'), (tex) => {
        rugMat.color.set(0xffffff);
        rugMat.map = tex;
        rugMat.needsUpdate = true;
    });

    rug = new THREE.Mesh(rugGeo, rugMat);
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.08, 0);
    rug.receiveShadow = true;
    rug.name = 'rug';
    rug.userData.editorName = 'Tapis';
    rug.userData.isImported = true;         // déclenche saveImportedObjectsToStorage() sur déplacement
    rug.userData.fileName = '__rug__';      // marqueur procédural (pas de GLB)
    scene.add(rug);
    if (typeof selectableObjects !== 'undefined') selectableObjects.push(rug);
    if (typeof importedObjects !== 'undefined' && !importedObjects.includes(rug)) importedObjects.push(rug);
    // Restaurer la position sauvegardée si disponible (overrides depuis localStorage)
    if (window._permanentObjectOverrides && window._permanentObjectOverrides['Tapis']) {
        var _rugOv = window._permanentObjectOverrides['Tapis'];
        if (_rugOv.position) rug.position.set(_rugOv.position.x, _rugOv.position.y !== undefined ? _rugOv.position.y : 0.08, _rugOv.position.z);
        if (_rugOv.rotation) rug.rotation.set(-Math.PI / 2, _rugOv.rotation.y || 0, _rugOv.rotation.z || 0);
        if (_rugOv.scale) rug.scale.set(_rugOv.scale.x, _rugOv.scale.y, _rugOv.scale.z);
    }
}

/**
 * INTERACTIONS
 */
// Cache des meshes audio (invalidé quand importedObjects change)
let _cachedAudioMeshes = [];
let _audioMeshesDirty = true;
function _rebuildAudioMeshes() {
    _cachedAudioMeshes = [];
    importedObjects.forEach(obj => { obj.traverse(child => { if (child.isMesh) _cachedAudioMeshes.push(child); }); });
    _audioMeshesDirty = false;
}
function invalidateAudioMeshCache() { _audioMeshesDirty = true; }

function onPointerDown(event) {
    if (event.button !== 0) return;
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    // Vérifier les zones d'interaction en mode Jeu
    if (interactionMode === 'game') {

        // ── Clic sur Naby : intersection ray-sphère sur la position réelle du modèle ──
        // (fiable quelle que soit la pose animée — évite le problème de bounding sphere T-pose)
        if (babyModel) {
            const nabyCenter = babyModel.position.clone();
            nabyCenter.y += 0.9;           // Viser le torse, pas les pieds
            const ray = raycaster.ray;
            const closestPt = new THREE.Vector3();
            ray.closestPointToPoint(nabyCenter, closestPt);
            const distRay    = closestPt.distanceTo(nabyCenter);   // Dist ray–centre Naby
            const distCamera = closestPt.distanceTo(camera.position); // Profondeur
            // 0.65 m de rayon de clic + devant la caméra + portée 7 m
            if (distRay < 0.65 && distCamera > 0 && distCamera < 7) {
                // Exécuter l'action de la zone Naby (définie dans project.json — actuellement video)
                const nabyZone = interactionZones.find(z => z.surfaceMode === 'character')
                              || interactionZones.find(z => z.actionValue === 'naby');
                if (nabyZone) {
                    executeZoneAction(nabyZone);
                }
                return;
            }
        }

        // ── Clic sur le générateur → lumière + son ────────────────────────
        // Guard : seulement si le joueur est proche du générateur (≤ 6 m)
        // évite que le raycast attrape le générateur depuis l'autre bout de la pièce
        if (!_genActivated && camera.position.distanceTo(GEN_POS) <= 6) {
            const genObj = importedObjects.find(o => o.userData.editorName === 'Générateur');
            if (genObj) {
                const genMeshes = [];
                genObj.traverse(child => { if (child.isMesh) genMeshes.push(child); });
                const genHits = raycaster.intersectObjects(genMeshes, false);
                if (genHits.length > 0) {
                    _activateGenerator();
                    return;
                }
            }
        }

        // Utiliser le système de crosshair : interagir avec la cible visée
        if (_crosshairTargetZone) {
            executeZoneAction(_crosshairTargetZone);
        } else {
            // Fallback : clic direct sur un objet ayant une zone d'interaction
            // (utile si le viseur central n'est pas exactement posé sur le mesh)
            for (const zone of interactionZones) {
                if (!zone.actionValue) continue;
                if (zone.surfaceMode !== 'object' || !zone.objectRef) continue;
                if (getZoneDistance(zone, camera.position) >= 2.5) continue;
                const _fbObj = typeof findObjectByRef === 'function' && findObjectByRef(zone.objectRef);
                if (!_fbObj) continue;
                const _fbMeshes = [];
                _fbObj.traverse(c => { if (c.isMesh) _fbMeshes.push(c); });
                if (_fbMeshes.length === 0) continue;
                const _fbHits = raycaster.intersectObjects(_fbMeshes, false);
                if (_fbHits.length > 0) { executeZoneAction(zone); break; }
            }
        }
        // Hold: commencer le tracking
        const now = performance.now();
        heldZone = null;
        holdStartTime = now;
        for (const zone of interactionZones) {
            if ((zone.triggerType || 'click') !== 'hold') continue;
            const isMechanical = ['turn-button', 'lever', 'fader'].includes(zone.actionType);
            if (!zone.actionValue && !isMechanical) continue;
            const distance = getZoneDistance(zone, camera.position);
            const interactRange = (zone.surfaceMode === 'wall' || zone.surfaceMode === 'object' || zone.surfaceMode === 'character') ? 2.5 : 1.5;
            if (distance < interactRange) {
                heldZone = zone;
                break;
            }
        }
        // Vérifier les déclencheurs audio au clic
        if (_audioMeshesDirty) { _rebuildAudioMeshes(); }
        const audioHits = raycaster.intersectObjects(_cachedAudioMeshes, false);
        if (audioHits.length > 0) {
            let hit = audioHits[0].object;
            while (hit) {
                if (hit.userData.isImported && importedObjects.includes(hit)) {
                    checkAudioClickTriggers(hit.userData.editorName || hit.name || '');
                    break;
                }
                hit = hit.parent;
            }
        }
    }
}

function onPointerMove(event) {}
function onPointerUp() {}
function onKeyDown(event) {}

// ── GÉNÉRATEUR : activation lumière + son ─────────────────────────────────
function _activateGenerator() {
    if (_genActivated) return;
    _genActivated = true;

    // Masquer la flèche + bulle de proximité
    _hideGenArrow();
    _hideGenBubble();

    // Lumière ponctuelle au-dessus du générateur
    _genLight = new THREE.PointLight(0xFFD080, 2.5, 14);
    _genLight.position.set(GEN_POS.x, GEN_POS.y + 2.6, GEN_POS.z);
    scene.add(_genLight);

    // Son générateur — joué une seule fois, s'arrête à la fin naturelle du fichier
    _genSound = new Audio('audios/Ambiance/generator-loop.mp3');
    _genSound.loop = false;
    _genSound.volume = 0.55;
    _genSound.play().catch(() => {});


    console.log('⚡ Générateur activé — lumière ON + son joué une fois');
}

// Arrêter le son du générateur quand le joueur entre dans la zone Naby
var _genSoundStoppedByNaby = false;
function _checkGenSoundNabyProximity() {
    if (!_genActivated || _genSoundStoppedByNaby || !_genSound) return;
    const NABY_X = -2.25, NABY_Z = -8.0;
    const dx = camera.position.x - NABY_X;
    const dz = camera.position.z - NABY_Z;
    if (Math.sqrt(dx*dx + dz*dz) < 5.5) {
        _genSoundStoppedByNaby = true;
        _genSound.pause();
        console.log('🔇 Son générateur arrêté (entrée zone Naby)');
    }
}

// ── FLÈCHE CLIGNOTANTE au-dessus du générateur ────────────────────────────
function _initGenArrow() {
    if (_genArrowEl || _genActivated) return;
    var el = document.createElement('div');
    el.id = 'gen-arrow';
    el.style.cssText = [
        'position:fixed;z-index:800;pointer-events:none;',
        'display:none;flex-direction:column;align-items:center;gap:3px;',
        'animation:genBlink 1.1s ease-in-out infinite;'
    ].join('');
    el.innerHTML =
        '<div style="font-size:26px;line-height:1;filter:drop-shadow(0 0 6px rgba(0,229,255,.9))">⬇</div>' +
        '<div style="font-size:10px;font-family:monospace;color:#00E5FF;letter-spacing:.08em;' +
        'background:rgba(6,10,16,.8);border:1px solid rgba(0,229,255,.3);border-radius:4px;' +
        'padding:2px 7px;white-space:nowrap;">Cliquez pour allumer</div>';
    document.body.appendChild(el);
    _genArrowEl = el;

    // Keyframe CSS
    if (!document.getElementById('gen-arrow-kf')) {
        var s = document.createElement('style');
        s.id = 'gen-arrow-kf';
        s.textContent = '@keyframes genBlink{0%,100%{opacity:1;transform:translateY(0)}' +
                        '50%{opacity:.35;transform:translateY(-6px)}}';
        document.head.appendChild(s);
    }
}

function _updateGenArrow() {
    if (_genActivated) { _hideGenArrow(); return; }
    _initGenArrow();
    if (!_genArrowEl) return;

    // Projeter la position 3D du générateur (légèrement au-dessus) en 2D écran
    var topPos = GEN_POS.clone();
    topPos.y += 3.2;
    var proj = topPos.clone().project(camera);

    // Vérifier si dans le champ de vision (z < 1 = devant la caméra)
    if (proj.z > 1) { _genArrowEl.style.display = 'none'; return; }

    var sx = (proj.x * 0.5 + 0.5) * window.innerWidth;
    var sy = (-proj.y * 0.5 + 0.5) * window.innerHeight;

    // Ne montrer que si dans l'écran
    if (sx < -50 || sx > window.innerWidth + 50 || sy < -50 || sy > window.innerHeight + 50) {
        _genArrowEl.style.display = 'none'; return;
    }

    // Distance joueur-générateur : seuil d'affichage entre 3m et 16m
    var dist = camera.position.distanceTo(GEN_POS);
    if (dist < 3 || dist > 16) { _genArrowEl.style.display = 'none'; return; }

    _genArrowEl.style.display = 'flex';
    _genArrowEl.style.left = (sx - 30) + 'px';
    _genArrowEl.style.top  = (sy - 55) + 'px';
}

function _hideGenArrow() {
    if (_genArrowEl) _genArrowEl.style.display = 'none';
}

// ── BULLE DE PROXIMITÉ (< 3m du générateur) ───────────────────────────────
function _updateGenBubble() {
    if (_genActivated) { _hideGenBubble(); return; }
    var dist = camera.position.distanceTo(GEN_POS);

    if (dist < 3.2 && !_genBubbleShown) {
        _genBubbleShown = true;
        var el = document.createElement('div');
        el.id = 'gen-bubble';
        el.style.cssText = [
            'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);',
            'z-index:900;background:rgba(10,10,20,.88);border:1px solid rgba(0,229,255,.3);',
            'border-radius:10px;padding:13px 20px;max-width:280px;text-align:center;',
            'font-family:"Segoe UI",sans-serif;font-size:13px;color:#C8D8E8;',
            'box-shadow:0 4px 18px rgba(0,0,0,.6);',
            'animation:genBubbleFade .4s ease;'
        ].join('');
        el.innerHTML = '🔦 <strong style="color:#EEF4FF">Il fait très sombre ici.</strong><br>' +
                       '<span style="font-size:12px;color:#607080">Cliquez sur le générateur pour allumer la lumière.</span>';
        document.body.appendChild(el);
        _genBubbleEl = el;

        if (!document.getElementById('gen-bubble-kf')) {
            var s = document.createElement('style');
            s.id = 'gen-bubble-kf';
            s.textContent = '@keyframes genBubbleFade{from{opacity:0;transform:translateX(-50%) translateY(8px)}' +
                            'to{opacity:1;transform:translateX(-50%) translateY(0)}}';
            document.head.appendChild(s);
        }
    } else if (dist >= 5 && _genBubbleShown) {
        // Masquer si le joueur s'éloigne
        _hideGenBubble();
        _genBubbleShown = false;
    }
}

function _hideGenBubble() {
    if (_genBubbleEl && _genBubbleEl.parentNode) {
        _genBubbleEl.parentNode.removeChild(_genBubbleEl);
        _genBubbleEl = null;
    }
}

/**
 * SYSTÈME DE DÉPLACEMENT & COLLISION CAMÉRA
 * Extrait dans game/engine/player-movement.js (E3, "Jouer ici" dans
 * l'éditeur) pour être partagé plutôt que dupliqué. Ces wrappers gardent
 * la même API globale qu'avant l'extraction — aucun appel existant, ici
 * ou dans game/engine/{build,bootstrap,restore}.js, n'a besoin de changer.
 */
function invalidateCollisionCache() { PlayerMovement.invalidateCollisionCache(); }
function getCollisionMeshes() { return PlayerMovement.getCollisionMeshes(); }
function computeAllowedMovement(origin, moveVec) { return PlayerMovement.computeAllowedMovement(origin, moveVec); }
function enforceCameraCollisions() { PlayerMovement.enforceCameraCollisions(interactionMode); }
function createCharacterCollisionProxy(character) { PlayerMovement.createCharacterCollisionProxy(character); }
function removeCharacterCollisionProxy(character) { PlayerMovement.removeCharacterCollisionProxy(character); }
function updateAllCharacterCollisionProxies() { PlayerMovement.updateAllCharacterCollisionProxies(); }
function updateControlsForMode() { PlayerMovement.updateControlsForMode(interactionMode); }
function setupFPSCamera() { if (interactionMode === 'game') PlayerMovement.setupFPSCamera(); }
function updateHeadBob(delta) { PlayerMovement.updateHeadBob(delta, interactionMode); }
function handleSceneMovement(delta) { PlayerMovement.handleSceneMovement(delta, interactionMode); }
function enforceGameHeight() { PlayerMovement.enforceGameHeight(interactionMode); }

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    // Suspendre tout le rendu/physique pendant une cinématique vidéo
    // pour libérer le GPU et éviter les saccades
    if (_cinematicPlaying) return;
    if (_gamePaused) return;

    const delta = clock.getDelta();
    // Physique cannon.js uniquement si des corps dynamiques existent (pas en mode jeu FPS)
    if (interactionMode !== 'game') world.step(1 / 60);

    // Proxies de collision: personnages immobiles → mise à jour toutes les 8 frames suffit
    if (interactionMode === 'game') {
        _proxyUpdateFrame++;
        if (_proxyUpdateFrame >= 8) {
            _proxyUpdateFrame = 0;
            updateAllCharacterCollisionProxies();
        }
    }

    handleSceneMovement(delta);

    controls.update();

    // ── Générateur : flèche + bulle proximité + arrêt son zone Naby ──────
    if (interactionMode === 'game' && loadingScreenDismissed) {
        _updateGenArrow();
        _updateGenBubble();
        _checkGenSoundNabyProximity();
    }

    // GAMEPAD: Rotation caméra via stick droit (tous modes)
    // Appliqué APRÈS controls.update() pour ne pas être écrasé par OrbitControls
    if (GamepadManager.connected) {
        const rs = GamepadManager.getRightStick();
        if (rs.x !== 0 || rs.y !== 0) {
            const sens = InputConfig.gamepadCameraSensitivity;
            const rotateX = -rs.x * sens * 0.03;  // Horizontal (yaw)
            const rotateY = rs.y * sens * 0.015;  // Vertical (pitch) — non inversé

            _gpCamDir.subVectors(controls.target, camera.position);
            const distance = Math.max(_gpCamDir.length(), 0.001);

            const theta = Math.atan2(_gpCamDir.x, _gpCamDir.z);
            const phi = Math.acos(Math.max(-1, Math.min(1, _gpCamDir.y / distance)));

            const newTheta = theta + rotateX;
            const newPhi = Math.max(0.3, Math.min(2.8, phi + rotateY));

            _gpCamNewDir.set(
                distance * Math.sin(newPhi) * Math.sin(newTheta),
                distance * Math.cos(newPhi),
                distance * Math.sin(newPhi) * Math.cos(newTheta)
            );
            controls.target.copy(camera.position).add(_gpCamNewDir);
            camera.lookAt(controls.target);
        }
    }

    // (spawn arcade géré dans le bloc de chargement, après applySpawnToCamera)

    // MODE JEU: Head bob, hauteur, collisions, zones, audio de pas
    if (interactionMode === 'game') {
        updateHeadBob(delta);
        enforceGameHeight();
        enforceCameraCollisions();
        if (typeof updateFootstepAudio === 'function') updateFootstepAudio(delta);
        // Throttle zone checks (1 frame sur 4)
        _zoneCheckFrame++;
        if (_zoneCheckFrame >= 4) {
            _zoneCheckFrame = 0;
            if (typeof checkZoneProximity === 'function') checkZoneProximity();
            if (typeof checkHoverAndProximityTriggers === 'function') checkHoverAndProximityTriggers();
        }
        if (typeof checkHoldTrigger === 'function') checkHoldTrigger();
    }

    // MISE À JOUR DE L'ANIMATION AVEC LE DELTA
    if (mixer) mixer.update(delta);

    // Mettre à jour les animations des personnages importés
    importedCharacters.forEach(char => {
        if (char.userData.mixer) char.userData.mixer.update(delta);
    });

    camera.position.x = Math.max(-ROOM_LIMIT, Math.min(ROOM_LIMIT, camera.position.x));
    camera.position.z = Math.max(-ROOM_LIMIT, Math.min(ROOM_LIMIT, camera.position.z));
    
    if (scene.cameraLight) {
        scene.cameraLight.position.copy(camera.position);
    }

    // Mettre à jour les helpers de lumières en temps réel
    if (editorMode && currentEditorMode === 'lights') {
        lightHelpers.forEach(helper => {
            if (helper.update) {
                helper.update();
            }
        });

        // Mettre à jour la ligne reliant la lumière à sa cible
        if (targetLine && targetLine.visible) {
            updateTargetLine();
        }
    }

    // Mettre à jour l'étiquette de dimensions
    if (editorMode && (selectedEditorObject || (selectedWalls && selectedWalls.length > 0))) {
        updateDimensionsLabelPosition();
    } else if (_dimLabelEl && _dimLabelEl.style.display !== 'none' && typeof hideDimensionsLabel === 'function') {
        hideDimensionsLabel();
    }

    // CROSSHAIR HOVER: Détecter si le viseur pointe sur un interactable
    if (interactionMode === 'game') {
        updateCrosshairHover();
    }

    // GAMEPAD: Actions boutons (fronts montants uniquement)
    if (GamepadManager.connected && interactionMode === 'game') {
        if (GamepadManager.isActionJustPressed('grab')) {
            // Interagir avec la cible visée par le crosshair
            if (_crosshairTargetZone) {
                executeZoneAction(_crosshairTargetZone);
            }
        }
        // Touchpad → toggle carnet
        if (GamepadManager.isActionJustPressed('notebook') && typeof NotebookManager !== 'undefined') {
            NotebookManager.toggle();
        }
        // R3 → toggle carte
        if (GamepadManager.isActionJustPressed('map') && typeof MinimapManager !== 'undefined') {
            MinimapManager.toggle();
        }
        // Share → Pause générale
        if (GamepadManager.isActionJustPressed('pause')) {
            togglePause3D();
        }
        // Mettre à jour les états précédents pour la détection des fronts
        GamepadManager.updatePrevStates();
    }

    // ===== MINIMAP : suivi live de la camera (position + orientation) =====
    if (typeof MinimapManager !== 'undefined') {
        _mmLookDx = controls.target.x - camera.position.x;
        _mmLookDz = controls.target.z - camera.position.z;
        // yaw Three.js : angle du regard projete sur le plan XZ (+Z = 0)
        _mmYaw = Math.atan2(_mmLookDx, _mmLookDz);
        MinimapManager.updatePlayer(camera.position.x, camera.position.z, _mmYaw);
    }

    renderer.render(scene, camera);
}

// Variables temporaires pour la minimap (evite 3 allocations par frame)
var _mmLookDx = 0, _mmLookDz = 0, _mmYaw = 0;

/* ═══════════════════════════════════════════════════
   PAUSE GÉNÉRALE — Escape (clavier) / Share (manette)
════════════════════════════════════════════════════ */
var _pausedMediaList3D = [];
var _pauseOverlay3D    = document.getElementById('pause-overlay-3d');

function pauseGame3D() {
    if (_gamePaused) return;
    _gamePaused = true;
    _pausedMediaList3D = [];
    // Mettre en pause toutes les pistes audio enregistrées
    AUDIO_CATEGORIES.forEach(cat => {
        audioTracks[cat].forEach(track => {
            if (track.audioElement && !track.audioElement.paused) {
                track.audioElement.pause();
                _pausedMediaList3D.push(track.audioElement);
            }
        });
    });
    // Mettre en pause les éléments actifs (autoplay)
    activeAudioElements.forEach(a => {
        if (!a.paused) { a.pause(); _pausedMediaList3D.push(a); }
    });
    // Mettre en pause les vidéos du DOM
    document.querySelectorAll('video').forEach(v => {
        if (!v.paused) { v.pause(); _pausedMediaList3D.push(v); }
    });
    if (_pauseOverlay3D) _pauseOverlay3D.style.display = 'flex';
}

function resumeGame3D() {
    if (!_gamePaused) return;
    _gamePaused = false;
    _pausedMediaList3D.forEach(m => m.play().catch(() => {}));
    _pausedMediaList3D = [];
    if (_pauseOverlay3D) _pauseOverlay3D.style.display = 'none';
}

function togglePause3D() { _gamePaused ? resumeGame3D() : pauseGame3D(); }

/**
 * SYSTÈME DE VISÉE CROSSHAIR — détecte ce que le joueur vise au centre de l'écran
 */
var _crosshairTargetZone = null;
var _crosshairLastZone = null;  // Dirty flag pour label DOM
var _crosshairRaycaster = new THREE.Raycaster();
var _crosshairCenter = new THREE.Vector2(0, 0); // Pré-alloué
var _crosshairLabelEl = null;
var _crosshairLabelText = null;
var _crosshairLabelHint = null;
var _crosshairCircles = null;  // Cache SVG elements
var _crosshairLines = null;
var _crosshairActive = false;  // Dirty flag — évite de re-modifier le DOM si pas changé
var _zoneCheckFrame = 0;       // Throttle : zone proximity toutes les 4 frames
var _proxyUpdateFrame = 0;     // Throttle : collision proxy update toutes les 8 frames
var _crosshairFrameSkip = 0;   // Throttle : raycast toutes les 3 frames
// Cache de meshes par objet/personnage UUID (évite traverse() à chaque frame)
var _meshCacheByUUID = new Map();
var _dimLabelEl = null;  // Cache DOM ref

function _initCrosshairRefs() {
    if (_crosshairCircles) return; // Déjà initialisé
    _dimLabelEl = document.getElementById('object-dimensions-label');
    _crosshairLabelEl = document.getElementById('interaction-label');
    _crosshairLabelText = document.getElementById('interaction-label-text');
    _crosshairLabelHint = document.getElementById('interaction-label-hint');
    const svg = document.getElementById('crosshair-svg');
    if (svg) {
        _crosshairCircles = svg.querySelectorAll('circle');
        _crosshairLines = svg.querySelectorAll('line');
    }
}

function _getCachedMeshes(obj) {
    if (!obj) return [];
    let cached = _meshCacheByUUID.get(obj.uuid);
    if (cached) return cached;
    cached = [];
    obj.traverse(c => { if (c.isMesh) cached.push(c); });
    _meshCacheByUUID.set(obj.uuid, cached);
    return cached;
}

function updateCrosshairHover() {
    // Throttle : raycast toutes les 3 frames (20fps de détection suffit largement)
    _crosshairFrameSkip++;
    if (_crosshairFrameSkip < 3) return;
    _crosshairFrameSkip = 0;

    _crosshairRaycaster.setFromCamera(_crosshairCenter, camera);
    _crosshairRaycaster.far = 3;  // Max interaction range = 2.5, pas besoin de tester plus loin

    let bestZone = null;
    let bestLabel = '';
    let bestDist = Infinity;

    for (const zone of interactionZones) {
        if (!zone.actionValue && !['turn-button', 'lever', 'fader'].includes(zone.actionType)) continue;

        const distance = getZoneDistance(zone, camera.position);
        const interactRange = (zone.surfaceMode === 'wall' || zone.surfaceMode === 'object' || zone.surfaceMode === 'character') ? 2.5 : 1.5;
        if (distance >= interactRange) continue;

        let hit = false;
        let label = zone.customName || '';

        if (zone.surfaceMode === 'character' && zone.characterRef) {
            const char = findCharacterByRef(zone.characterRef);
            if (char) {
                const hlData = highlightedInteractionObjects.get(char.uuid);
                if (hlData && hlData.hotspot) {
                    const hits = _crosshairRaycaster.intersectObject(hlData.hotspot, false);
                    if (hits.length > 0) { hit = true; bestDist = hits[0].distance; }
                }
                if (!hit) {
                    const meshes = _getCachedMeshes(char);
                    const hits = _crosshairRaycaster.intersectObjects(meshes, false);
                    if (hits.length > 0 && hits[0].distance < interactRange) { hit = true; bestDist = hits[0].distance; }
                }
                if (!label) label = char.userData.editorName || char.name || 'Personnage';
            }
        } else if (zone.surfaceMode === 'object' && zone.objectRef) {
            const obj = findObjectByRef(zone.objectRef);
            if (obj) {
                const meshes = _getCachedMeshes(obj);
                const hits = _crosshairRaycaster.intersectObjects(meshes, false);
                if (hits.length > 0 && hits[0].distance < interactRange) { hit = true; bestDist = hits[0].distance; }
                if (!label) label = obj.userData.editorName || obj.name || 'Objet';
            }
        } else if (zone.surfaceMode === 'floor' || zone.surfaceMode === 'ceiling' || zone.surfaceMode === 'wall') {
            hit = true;
            bestDist = distance;
            if (!label) label = zone.actionType === 'video' ? 'Vidéo' : zone.actionType === 'link' ? 'Aller' : 'Interagir';
        }

        if (hit && distance < bestDist + 0.5) {
            bestZone = zone;
            bestLabel = label;
        }
    }

    _crosshairTargetZone = bestZone;

    // Dirty flag : ne modifier le DOM que si l'état change
    // Sur les personnages (surfaceMode 'character' ou actionType 'dialogue') :
    // PAS de cercle doré à la souris — le clic suffit via executeZoneAction.
    // Le cercle ne s'affiche qu'avec une manette connectée (bouton R2 visible).
    const isCharacterZone = bestZone && (bestZone.surfaceMode === 'character' || bestZone.actionType === 'dialogue');
    const isGamepadConnected = typeof GamepadManager !== 'undefined' && GamepadManager.connected;
    const showHighlight = !!bestZone && (!isCharacterZone || isGamepadConnected);
    const nowActive = showHighlight;
    if (nowActive !== _crosshairActive) {
        _crosshairActive = nowActive;
        if (_crosshairCircles) {
            if (nowActive) {
                _crosshairCircles.forEach(c => { c.setAttribute('stroke', '#FFD700'); c.setAttribute('stroke-width', '2'); });
                _crosshairLines.forEach(l => l.setAttribute('stroke', 'rgba(255,215,0,0.7)'));
            } else {
                _crosshairCircles.forEach(c => { c.setAttribute('stroke', 'rgba(255,255,255,0.7)'); c.setAttribute('stroke-width', '1.5'); });
                _crosshairLines.forEach(l => l.setAttribute('stroke', 'rgba(255,255,255,0.5)'));
            }
        }
    }
    // Dirty flag label : ne modifier le DOM que si la zone ciblée change
    if (_crosshairLabelEl && bestZone !== _crosshairLastZone) {
        _crosshairLastZone = bestZone;
        if (bestZone) {
            const actionIcon = bestZone.actionType === 'video' ? '▶ ' : bestZone.actionType === 'message' ? '💬 ' : bestZone.actionType === 'link' ? '➜ ' : '⬡ ';
            if (_crosshairLabelText) _crosshairLabelText.textContent = actionIcon + bestLabel;
            const isGamepad = GamepadManager && GamepadManager.connected;
            if (_crosshairLabelHint) _crosshairLabelHint.textContent = isGamepad ? 'R2 pour interagir' : 'Clic pour interagir';
            _crosshairLabelEl.style.opacity = '1';
        } else {
            _crosshairLabelEl.style.opacity = '0';
        }
    }
}

/**
 * Simule une interaction (grab) au centre de l'écran — souris ou manette
 */
function simulateInteraction() {
    if (_crosshairTargetZone) {
        executeZoneAction(_crosshairTargetZone);
    }
}

window.onload = init;

// ==================== GESTION DES PANNEAUX UI ====================

// Toggle du panneau d'informations
document.getElementById('info-icon').addEventListener('click', function(e) {
    e.stopPropagation();
    const infoPanel = document.getElementById('controls-info');
    infoPanel.style.display = infoPanel.style.display === 'block' ? 'none' : 'block';
});

// Fermer le panneau info si on clique ailleurs
document.addEventListener('click', function(e) {
    const infoPanel = document.getElementById('controls-info');
    const infoIcon = document.getElementById('info-icon');
    if (infoPanel.style.display === 'block' &&
        !infoPanel.contains(e.target) &&
        e.target !== infoIcon) {
        infoPanel.style.display = 'none';
    }
});

// Toggle du popup de volume
document.getElementById('volume-icon').addEventListener('click', function(e) {
    e.stopPropagation();
    const popup = document.getElementById('volume-popup');
    popup.style.display = popup.style.display === 'block' ? 'none' : 'block';
});

// Fermer le popup volume si on clique ailleurs
document.addEventListener('click', function(e) {
    const popup = document.getElementById('volume-popup');
    const icon = document.getElementById('volume-icon');
    if (popup.style.display === 'block' && !popup.contains(e.target) && !icon.contains(e.target)) {
        popup.style.display = 'none';
    }
});

// Mettre à jour les volumes du jeu en temps réel
function updateGameVolume() {
    const volDialogues = parseInt(document.getElementById('vol-dialogues').value);
    const volMusique = parseInt(document.getElementById('vol-musique').value);
    const volBruitages = parseInt(document.getElementById('vol-bruitages').value);

    document.getElementById('vol-dialogues-val').textContent = volDialogues;
    document.getElementById('vol-musique-val').textContent = volMusique;
    document.getElementById('vol-bruitages-val').textContent = volBruitages;

    // Appliquer le volume maître sur les pistes audio en cours
    const masterDialogues = volDialogues / 100;
    const masterMusique = volMusique / 100;
    const masterBruitages = volBruitages / 100;

    // Appliquer aux pistes en cours de lecture
    for (const cat of AUDIO_CATEGORIES) {
        for (const track of audioTracks[cat]) {
            if (track.audioElement && !track.audioElement.paused) {
                const trackVol = track.volume / 100;
                let masterVol = 1;
                if (cat === 'musique') masterVol = masterMusique;
                else if (cat === 'ambiance') masterVol = masterDialogues;
                else if (cat === 'bruitage' || cat === 'mouvement') masterVol = masterBruitages;
                track.audioElement.volume = trackVol * masterVol;
            }
        }
    }

    // Appliquer aux éléments audio actifs (autoplay)
    activeAudioElements.forEach(audio => {
        // Déterminer la catégorie via les propriétés stockées
        if (audio._trackCategory === 'musique') audio.volume = (audio._trackVolume / 100) * masterMusique;
        else if (audio._trackCategory === 'ambiance') audio.volume = (audio._trackVolume / 100) * masterDialogues;
        else audio.volume = (audio._trackVolume / 100) * masterBruitages;
    });

    // Appliquer aux sons de mouvement actifs
    for (const key in activeMovementAudio) {
        if (activeMovementAudio[key]) {
            activeMovementAudio[key].volume = (activeMovementAudio[key]._trackVolume / 100) * masterBruitages;
        }
    }
}

// Muet global — couper / rétablir tous les canaux simultanément
var _muteAll = false;
var _savedVol = { dialogues: 80, musique: 0, bruitages: 80 };
var _SVG_VOL2 = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>';
var _SVG_VOLX = '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/>';
function toggleMuteAll() {
    _muteAll = !_muteAll;
    var muteIcon = document.getElementById('mute-icon');
    var volIconSvg = document.querySelector('#volume-icon svg');
    var muteBtn = document.getElementById('mute-btn');
    if (_muteAll) {
        ['dialogues','musique','bruitages'].forEach(function(c) {
            var el = document.getElementById('vol-'+c); if (el) { _savedVol[c] = parseInt(el.value); el.value = 0; }
            var vl = document.getElementById('vol-'+c+'-val'); if (vl) vl.textContent = 0;
        });
        if (muteBtn) muteBtn.classList.add('muted');
        if (muteIcon) muteIcon.innerHTML = _SVG_VOLX;
        if (volIconSvg) volIconSvg.innerHTML = _SVG_VOLX;
    } else {
        ['dialogues','musique','bruitages'].forEach(function(c) {
            var el = document.getElementById('vol-'+c); if (el) el.value = _savedVol[c];
            var vl = document.getElementById('vol-'+c+'-val'); if (vl) vl.textContent = _savedVol[c];
        });
        if (muteBtn) muteBtn.classList.remove('muted');
        if (muteIcon) muteIcon.innerHTML = _SVG_VOL2;
        if (volIconSvg) volIconSvg.innerHTML = _SVG_VOL2;
    }
    updateGameVolume();
}

// Obtenir le volume maître pour une catégorie (utilisé lors de la création d'éléments audio)
function getMasterVolume(category) {
    if (category === 'musique') return parseInt(document.getElementById('vol-musique').value) / 100;
    if (category === 'ambiance') return parseInt(document.getElementById('vol-dialogues').value) / 100;
    return parseInt(document.getElementById('vol-bruitages').value) / 100;
}

// Initialiser le ScoreManager
ScoreManager.init('sas_securite');

// Initialiser la jauge de Lucidite (TFE)
if (typeof LucidityManager !== 'undefined') {
    LucidityManager.init('sas_securite');
}

// Initialiser la minimap (TFE) + carnet
if (typeof MinimapManager !== 'undefined') {
    MinimapManager.init();
    // Chargement du plan de la piece (SVG viewBox 601.67 x 1050 d'apres le fichier source)
    MinimapManager.setMapImage('assets/maps/sas_securite.svg', 601.67, 1050);

    // --- Calibration finale (avril 2026) ---
    // Obtenue via MinimapManager.startClickCalibration() : croix rouge de visee au centre
    // du viewport, pan/zoom libre, 2 captures (spawn + devant Naby).
    // Resultat : bounds monde <-> carte SVG qui alignent la fleche verte live sur le joueur.
    MinimapManager.setWorldBounds(-24.2, 9.0, -42.6, 13.4);

    // Overlay debug : affiche world X/Z, yaw, map% et bounds en direct dans la minimap.
    // Utile pour verifier la calibration ou recalibrer apres modification de la scene.
    // Pour réactiver : MinimapManager.setDebug(true) dans la console navigateur.
    MinimapManager.setDebug(false);

    // POI Naby — position deduite de la capture "joueur face a Naby" :
    //   world (-2.25, -8.00) avec les bounds ci-dessus => map (66.1%, 61.8%).
    MinimapManager.addPOI('naby', 66.1, 61.8, 'todo');
    // La position live (camera + yaw) est mise a jour chaque frame dans animate().
}
if (typeof NotebookManager !== 'undefined') {
    NotebookManager.init();
    NotebookManager.setCurrentRoom('sas_securite', 'Sas de sécurité');
    NotebookManager.setCharacterChip('naby', 'Naby', null);
    // Pas de texte synthese tant qu'aucun concept n'a ete debloque
}

/**
 * ============================================
 * CHARGEMENT DU JEU (via scene-loader.js)
 * ============================================
 * Reconstruit la scène (murs, objets, lumières, zones)
 * sans charger l'éditeur. Fonctions fournies par scene-loader.js.
 */
setTimeout(async () => {
    // Timeout de sécurité : masquer le loading screen au bout de 60s max
    // (première visite = téléchargement des modèles 3D dans l'IDB, peut prendre 30-45s)
    const safetyTimeout = setTimeout(() => {
        console.warn('⏱️ Timeout de sécurité — masquage du loading screen');
        hideLoadingScreen();
    }, 60000);

    try {
        currentRoomName = 'sas_securite';

        // Bootstrap: charger les données de scène depuis fichiers/IndexedDB
        await bootstrapFromFiles();
        if (typeof setLoadingTarget === 'function') setLoadingTarget(40);  // données + textures/audio chargées
        // Reconstruire la scène (murs, objets, lumières, zones)
        // Attendre que init() ait créé la scene (window.onload peut être plus lent que ce setTimeout si le CDN est lent)
        if (typeof scene === 'undefined' || !scene) {
            await new Promise(resolve => {
                const t = setInterval(() => { if (typeof scene !== 'undefined' && scene) { clearInterval(t); resolve(); } }, 50);
            });
        }
        await loadProjectOnStartup();
        if (typeof setLoadingTarget === 'function') setLoadingTarget(68);  // scène (murs, sol, objets importés) reconstruite

        // Charger les objets permanents (dont la porte d'entrée)
        // Anti-doublon intégré : les objets déjà en scène (depuis IDB) sont ignorés
        loadPermanentObjects();
        if (typeof setLoadingTarget === 'function') setLoadingTarget(82);  // objets permanents lancés

        // Charger Naby
        try {
            await loadAnimatedCharacter();
        } catch (e) {
            console.warn("Échec chargement nabydance.glb:", e);
        }
        if (typeof setLoadingTarget === 'function') setLoadingTarget(93);  // personnage chargé

        // Invalider le cache de collision après chargement complet de la scène
        invalidateCollisionCache();

        // Positionner la caméra au spawn sauvegardé
        if (typeof applySpawnToCamera === 'function') applySpawnToCamera();

        // Retour depuis AI Mythology (?spawn=arcade) → écraser le spawn sauvegardé
        // par la position exacte devant la borne d'arcade (relevée en jeu : X=2.86, Z=-7.16, yaw=-98°)
        // Ce bloc DOIT être après applySpawnToCamera() pour avoir le dernier mot.
        if (new URLSearchParams(window.location.search).get('spawn') === 'arcade') {
            // Arcade zone center : X=4.48, Z=-5.01
            // Joueur décalé à droite (direction perpendiculaire au regard vers l'arcade)
            // regard = vers (0.6, 0, 0.8), droite = (0.8, 0, -0.6)
            const ARCADE_X  =  4.0;   // décalé à droite (vecteur droite = +0.8X -0.6Z)
            const ARCADE_Z  = -8.0;
            const eyeH = PlayerMovement.getPlayerEyeY() || PLAYER_EYE_HEIGHT;
            camera.position.set(ARCADE_X, eyeH, ARCADE_Z);
            // Cible dans la direction de l'arcade (centre ~4.48, -5.01)
            controls.target.set(ARCADE_X + 0.6, eyeH, ARCADE_Z + 0.8);  // regard vers arcade (4.48, -5.01)
            controls.update();
            console.log('🕹️ Retour arcade → spawn fixe X:', ARCADE_X, 'Z:', ARCADE_Z);
        }

        // Spawn devant Naby (?spawn=naby) — venant du lien "Dialogue avec Naby" de liens-tfe.html
        // Position déduite de la calibration minimap : Naby ≈ world(-2.25, -8.00)
        if (new URLSearchParams(window.location.search).get('spawn') === 'naby') {
            const NABY_X   = -2.25;
            const NABY_Z   = -8.00;
            const OFFSET_Z =  1.4;   // joueur placé 1.4m devant Naby (axe -Z = face à elle)
            const eyeH = PlayerMovement.getPlayerEyeY() || PLAYER_EYE_HEIGHT;
            camera.position.set(NABY_X, eyeH, NABY_Z - OFFSET_Z);
            controls.target.set(NABY_X, eyeH, NABY_Z);
            controls.update();
            console.log('👁️ Spawn Naby → face à Naby (', NABY_X, ',', NABY_Z, ')');
        }

        // ── Nettoyage de la scène : supprimer les objets non autorisés ──────────
        // Objet importés autorisés (Naby animée est gérée séparément via loadAnimatedCharacter)
        // IMPORTANT: ces noms doivent correspondre EXACTEMENT aux editorName dans IndexedDB
        // (les mêmes que dans loadPermanentObject() + les objets procéduraux comme Tapis)
        const SCENE_ALLOWED = new Set([
            // Objets GLB actifs (project.json → importedObjects)
            'lampe sur pied',
            'Fauteuil rouge expo +',
            'Cadre dessin',
            'Guitare classique',
            'Berger Allemand Debout',
            'Borne Arcade AI Mythology',
            'ascenseur',
            // Objets permanents (loadPermanentObject) — doivent survivre au nettoyage
            'Porte entrée',
            'Générateur',
            // Coin vinyles
            'meuble vinyls',
            'tourne-disques',
            // Salon
            'canape chersterfield 1',
            'canape chesterfield 2',
            'table salon',
            // Coin bureau + bibliothèque
            'bureau',
            'Bibliothèque',
            // Personnages animés permanents (isCharacter=true → aussi exempts du filtre)
            'Raya marche en rond',
            'Berger allemande marche',
            // Objet procédural (pas de GLB — recréé par createRug())
            'Tapis'
        ]);
        // Fichiers GLB importés autorisés (par NOM DE FICHIER) — survivent au nettoyage
        // quel que soit le nom d'objet auto attribué par l'éditeur (Objet_Importé_N / Personnage_N).
        // → importer les versions "-compressed" de ces fichiers dans l'éditeur.
        // Pour autoriser un nouvel objet importé : ajouter son nom de fichier ici.
        const SCENE_ALLOWED_FILES = new Set([
            'berger-couche-coussin-compressed.glb',
            'Alex-debout-compressed.glb',
            'Alex-copilot-compressed.glb',
            'arcade-pacman-compressed.glb',
            'bureau-comfyui-compressed.glb',
            'chien-robot-compressed.glb',
            'Alex-buste-compressed.glb'
        ]);
        // Supprimer de importedObjects + scene tout objet non autorisé.
        // On GARDE : nom d'objet dans SCENE_ALLOWED, OU fichier "-compressed.glb" (tout objet
        // compressé importé par l'utilisateur), OU dans SCENE_ALLOWED_FILES, OU personnage (isCharacter).
        const _fileAllowed = o => o.userData.fileName &&
            (o.userData.fileName.endsWith('-compressed.glb') || SCENE_ALLOWED_FILES.has(o.userData.fileName));
        const toRemove = importedObjects.filter(o =>
            o.userData.editorName &&
            !SCENE_ALLOWED.has(o.userData.editorName) &&
            !_fileAllowed(o) &&
            !o.userData.isCharacter
        );
        toRemove.forEach(obj => {
            scene.remove(obj);
            const ii = importedObjects.indexOf(obj);
            if (ii > -1) importedObjects.splice(ii, 1);
            const si = selectableObjects.indexOf(obj);
            if (si > -1) selectableObjects.splice(si, 1);
            console.log(`🗑️ Objet non autorisé supprimé de la scène : ${obj.userData.editorName}`);
        });

        // Initialiser l'audio de pas si disponible
        if (typeof initFootstepAudio === 'function') initFootstepAudio();
    } catch (e) {
        console.warn("⚠️ Erreur lors du chargement de la scène:", e);
    } finally {
        clearTimeout(safetyTimeout);
        // Masquer l'écran de chargement DANS TOUS LES CAS
        hideLoadingScreen();
        // Lancer le tutoriel interactif (première visite uniquement)
        if (typeof TutorialManager !== 'undefined') TutorialManager.init();
    }
}, 500);


