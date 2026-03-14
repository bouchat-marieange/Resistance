/*
 * ============================================
 * EDITOR STATE - Variables d'état partagées
 * ============================================
 * Ce fichier déclare toutes les variables globales
 * nécessaires au fonctionnement de l'éditeur.
 * Il doit être chargé APRÈS THREE.js et AVANT le script inline de la page.
 */

// Toggle du panneau éditeur
let isPanelCollapsed = false;

// Variables pour l'éditeur
let transformControl = null;
let selectedEditorObject = null;
let selectedEditorObjects = []; // Array pour la sélection multiple
let editorMode = false;
let currentTransformMode = 'translate';
let interactionMode = 'game'; // 'game' ou 'developer' - Mode par défaut : Jeu
const selectableObjects = [];
const editorRaycaster = new THREE.Raycaster();
const editorMouse = new THREE.Vector2();

// Variables pour l'historique global (Undo/Redo)
const globalHistory = {
    undoStack: [],      // Actions à annuler
    redoStack: [],      // Actions à rétablir
    maxHistory: 20,     // Limite d'historique
    isRecording: true   // Pour éviter d'enregistrer pendant un undo/redo
};
let isSelectionLocked = false;
let initialTransforms = new Map(); // Stockage des états initiaux

// Variables pour le mode éditeur (Objets/Caméra/Lumières)
let currentEditorMode = 'objects'; // 'objects', 'camera', 'lights', 'floor-plan', 'game-setup'
let customLights = []; // Liste des lumières ajoutées par l'utilisateur

// Variables pour la position de départ du joueur (mode jeu)
let isSpawnToolActive = false;        // Outil de placement du spawn actif
let spawnPosition = null;             // {x, y, z} position 3D du spawn
let spawnRotationY = 0;               // Rotation Y du regard (en radians)
let spawnMarkerGroup = null;          // THREE.Group pour le marqueur visuel du spawn
let spawnSaved = false;               // Position enregistrée/fixée
const PLAYER_EYE_HEIGHT = 1.50;      // Hauteur des yeux (1.65m personne → 1.50m yeux)

// Variables pour les zones d'interaction (mode game-setup)
let interactionZones = [];              // Array of zone objects
let interactionZoneIdCounter = 0;       // Auto-increment ID
let activeZoneTool = null;              // 'rect', 'oval', or null
let isDrawingZone = false;              // Currently drawing a zone
let zoneDrawStart = null;               // {x, z, y} world-space start point
let zonePreviewMesh = null;             // THREE.Mesh preview while drawing
let currentEditingZone = null;          // Zone currently being configured
let selectedInteractionZone = null;     // Zone selected in the list
let _zoneSyncLock = false;              // Empêche l'auto-sync pendant le peuplement programmatique
let zoneSurfaceMode = 'floor';          // 'floor', 'ceiling', 'wall', 'object'
let zoneDrawWallRef = null;             // For wall mode: { wall, faceIndex, facePlane, localRight, localUp, meshCenter }
let activeGameInteraction = null;       // For mechanical actions in game mode

// Variables pour les déclencheurs de zones en mode jeu
let heldZone = null;                    // Zone sur laquelle le clic est maintenu
let holdStartTime = 0;                  // Timestamp du début du clic maintenu
let lastClickTime = 0;                  // Timestamp du dernier clic (double-clic)
let lastClickZone = null;               // Dernière zone cliquée (double-clic)
let hoveredZones = new Set();           // Zones hover déjà déclenchées (anti-rebond)
let proximityTriggeredZones = new Set(); // Zones proximité déjà déclenchées (anti-rebond)

// ==================== AUDIO SYSTEM ====================
const AUDIO_CATEGORIES = ['musique', 'ambiance', 'bruitage', 'mouvement'];
let audioTracks = { musique: [], ambiance: [], bruitage: [], mouvement: [] };
let audioTrackIdCounter = 0;
let activeAudioElements = [];            // Runtime Audio instances in game mode
let currentEditingAudioTrack = null;     // Track being edited in trigger modal
let audioHoverDebounceTimer = null;      // Debounce timer for hover triggers
let lastHoveredAudioObject = null;       // Last hovered object for audio triggers
let loadingScreenDismissed = false;      // Flag to prevent double-play audio on initial load
let activeMovementAudio = {};            // { trackKey: audioElement } for movement sounds

// Mapping des actions de mouvement vers les touches clavier
const MOVEMENT_ACTION_KEYS = {
    'forward': ['z', 'w'],
    'backward': ['s'],
    'left': ['q', 'a'],
    'right': ['d'],
    'jump': [' '],
    'crouch': ['control'],
    'run': ['shift'],
    'grab': ['e'],
    'door': ['f']
};

let selectedLight = null;

// Variables pour l'éditeur de plan de pièce - Système type Sims
let floorPlanMode = 'draw-wall'; // 'draw-wall', 'draw-oblique', 'draw-room', 'delete-wall', 'select', 'texture', 'measure'

// Variables pour l'outil Mesure
let isMeasuring = false;           // En train de mesurer (clic maintenu)
let measureStartPoint3D = null;    // Point de départ 3D (Vector3)
let measureLine = null;            // THREE.Line pour la ligne de mesure rose
let measureLabel = null;           // Élément HTML pour afficher la distance
let measureStartScreenPos = null;  // Position écran du clic initial {x, y}
let measureStartMarker = null;     // THREE.Mesh point rose d'origine

// Variables pour l'outil Texture
let textureToolTexture = null; // THREE.Texture chargée
let textureToolType = 'tile'; // 'tile' ou 'panel'
let textureToolTileSize = 1; // Taille de la tuile en mètres
let textureToolTarget = 'wall'; // 'wall', 'floor', 'ceiling'
let textureToolImageDataURL = null; // DataURL de l'image pour persistence
let textureToolFileName = ''; // Nom du fichier chargé
let floorPlanWalls = []; // Liste des murs {start: {x,z}, end: {x,z}, mesh}
let floorPlanGrid = null; // Grille d'assistance
let gridSize = 1; // Taille de la grille en mètres
let gridSnap = true; // Aimant magnétique
let wallHeight = 2.5; // Hauteur des murs
let wallThickness = 0.2; // Épaisseur des murs
let isPlanViewActive = false; // Vue de dessus active
let savedCameraPosition = null; // Position de caméra sauvegardée
let savedCameraRotation = null; // Rotation de caméra sauvegardée

// Variables pour le tracé en cours (drag)
let isDrawingWall = false; // En train de tracer un mur
let drawStartPoint = null; // Point de départ du tracé {x, z}
let currentPreviewWall = null; // Aperçu du mur en cours de tracé
let selectedWall = null; // Mur sélectionné pour édition/suppression
let startPointMarker = null; // Marqueur visuel du point de départ
let endPointMarker = null; // Marqueur visuel du point d'arrivée
let isCtrlPressed = false; // Touche Ctrl enfoncée pour mode effacement
let isBKeyPressed = false; // Touche B enfoncée pour activer le tracé de mur
let isMoveKeyPressed = false; // Touche "<" enfoncée pour déplacer les murs sélectionnés
let isRotateKeyPressed = false; // Touche "W" enfoncée pour rotation des murs sélectionnés
let hasUnsavedChanges = false; // Indique si des changements non sauvegardés existent
let wallIdCounter = 1; // Compteur pour la numérotation automatique des murs
let currentRoomName = 'default'; // Nom de la pièce actuelle pour la sauvegarde (override par chaque page)
let lastWallEndPoint = null; // Point de fin du dernier mur tracé (pour continuer)
let wallLengthLabel = null; // Label HTML affichant la longueur du mur en cours
let hoveredWallForDeletion = null; // Mur survolé en mode suppression (CTRL)

// Variables pour la sélection multiple de murs (outil Selection)
let selectedWalls = []; // Liste des murs sélectionnés
let isDraggingSelectedWalls = false; // En train de déplacer les murs sélectionnés
let isRotatingSelectedWalls = false; // En train de faire une rotation des murs sélectionnés
let dragStartPoint = null; // Point de départ du drag {x, z}
let rotationCenter = null; // Centre de rotation pour l'ensemble des murs {x, z}
let rotationStartAngle = 0; // Angle de départ de la rotation
let currentRotationAngle = 0; // Angle de rotation actuel (entier en degrés)
let rotationIndicator = null; // Label HTML affichant l'angle de rotation
let blockFloorPlanClick = false; // Bloque le prochain click après mousedown en mode select

// Variables pour le panning avec la barre espace (style Figma)
let isSpacePressed = false;      // Barre espace maintenue
let isSpacePanning = false;      // En train de panner (espace + clic)
let spacePanStart = { x: 0, y: 0 }; // Position initiale de la souris en pixels écran
let spacePanCameraStart = null;  // Position initiale de camera.position (Vector3)
let spacePanTargetStart = null;  // Position initiale de controls.target (Vector3)

// Variables pour la gestion des pièces et opérations booléennes
let floorPlanRooms = []; // Liste des pièces {id, walls: [], mesh, bounds: {minX, maxX, minZ, maxZ}}
let selectedRooms = []; // Liste des pièces sélectionnées pour opérations booléennes
let roomIdCounter = 0; // Compteur pour générer des IDs uniques de pièces
let roomRounding = 0; // 0 = rectangle, 100 = ovale/cercle

// Historique pour Undo/Redo des murs (floor-plan)
let floorPlanHistory = []; // Historique des opérations sur les murs
let floorPlanHistoryIndex = -1; // Index actuel dans l'historique
const MAX_FLOOR_PLAN_HISTORY = 10; // Limite de 10 opérations

let lightIdCounter = 0;
let initialCameraSettings = {
    position: new THREE.Vector3(),
    fov: 75
};

// Variables pour les gizmos visuels caméra et lumières
let cameraHelper = null; // Helper visuel pour la caméra
let lightHelpers = new Map(); // Map de lightId -> helper
let cameraTransformControl = null; // Gizmo pour déplacer la caméra
let lightTransformControl = null; // Gizmo pour déplacer les lumières
let targetGizmo = null; // Mesh sphérique pour la cible des lumières directionnelles/spot
let targetTransformControl = null; // Gizmo pour déplacer la cible
let targetLine = null; // Ligne reliant la lumière à sa cible
