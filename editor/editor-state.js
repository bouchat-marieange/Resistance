/*
 * ============================================
 * EDITOR STATE - Variables d'état partagées
 * ============================================
 * Ce fichier déclare toutes les variables globales
 * nécessaires au fonctionnement de l'éditeur.
 * Il peut être chargé AVANT ou APRÈS le script inline de la page.
 * Utilise var + gardes pour éviter les conflits de redéclaration.
 */

// Toggle du panneau éditeur
var isPanelCollapsed = (typeof isPanelCollapsed !== 'undefined') ? isPanelCollapsed : false;

// Variables pour l'éditeur
var transformControl = (typeof transformControl !== 'undefined') ? transformControl : null;
var selectedEditorObject = (typeof selectedEditorObject !== 'undefined') ? selectedEditorObject : null;
var selectedEditorObjects = (typeof selectedEditorObjects !== 'undefined') ? selectedEditorObjects : [];
var editorMode = (typeof editorMode !== 'undefined') ? editorMode : false;
var currentTransformMode = (typeof currentTransformMode !== 'undefined') ? currentTransformMode : 'translate';
var interactionMode = (typeof interactionMode !== 'undefined') ? interactionMode : 'game';
var selectableObjects = (typeof selectableObjects !== 'undefined') ? selectableObjects : [];
var editorRaycaster = (typeof editorRaycaster !== 'undefined') ? editorRaycaster : new THREE.Raycaster();
var editorMouse = (typeof editorMouse !== 'undefined') ? editorMouse : new THREE.Vector2();

// Variables pour l'historique global (Undo/Redo)
var globalHistory = (typeof globalHistory !== 'undefined') ? globalHistory : {
    undoStack: [],
    redoStack: [],
    maxHistory: 20,
    isRecording: true
};
var isSelectionLocked = (typeof isSelectionLocked !== 'undefined') ? isSelectionLocked : false;
var initialTransforms = (typeof initialTransforms !== 'undefined') ? initialTransforms : new Map();

// Variables pour le mode éditeur (Objets/Caméra/Lumières)
var currentEditorMode = (typeof currentEditorMode !== 'undefined') ? currentEditorMode : 'objects';
var customLights = (typeof customLights !== 'undefined') ? customLights : [];

// Variables pour la position de départ du joueur (mode jeu)
var isSpawnToolActive = (typeof isSpawnToolActive !== 'undefined') ? isSpawnToolActive : false;
var spawnPosition = (typeof spawnPosition !== 'undefined') ? spawnPosition : null;
var spawnRotationY = (typeof spawnRotationY !== 'undefined') ? spawnRotationY : 0;
var spawnMarkerGroup = (typeof spawnMarkerGroup !== 'undefined') ? spawnMarkerGroup : null;
var spawnSaved = (typeof spawnSaved !== 'undefined') ? spawnSaved : false;
var PLAYER_EYE_HEIGHT = (typeof PLAYER_EYE_HEIGHT !== 'undefined') ? PLAYER_EYE_HEIGHT : 1.50;

// Variables pour les zones d'interaction (mode game-setup)
var interactionZones = (typeof interactionZones !== 'undefined') ? interactionZones : [];
var interactionZoneIdCounter = (typeof interactionZoneIdCounter !== 'undefined') ? interactionZoneIdCounter : 0;
var activeZoneTool = (typeof activeZoneTool !== 'undefined') ? activeZoneTool : null;
var isDrawingZone = (typeof isDrawingZone !== 'undefined') ? isDrawingZone : false;
var zoneDrawStart = (typeof zoneDrawStart !== 'undefined') ? zoneDrawStart : null;
var zonePreviewMesh = (typeof zonePreviewMesh !== 'undefined') ? zonePreviewMesh : null;
var currentEditingZone = (typeof currentEditingZone !== 'undefined') ? currentEditingZone : null;
var selectedInteractionZone = (typeof selectedInteractionZone !== 'undefined') ? selectedInteractionZone : null;
var _zoneSyncLock = (typeof _zoneSyncLock !== 'undefined') ? _zoneSyncLock : false;
var zoneSurfaceMode = (typeof zoneSurfaceMode !== 'undefined') ? zoneSurfaceMode : 'floor';
var zoneDrawWallRef = (typeof zoneDrawWallRef !== 'undefined') ? zoneDrawWallRef : null;
var activeGameInteraction = (typeof activeGameInteraction !== 'undefined') ? activeGameInteraction : null;

// Variables pour les déclencheurs de zones en mode jeu
var heldZone = (typeof heldZone !== 'undefined') ? heldZone : null;
var holdStartTime = (typeof holdStartTime !== 'undefined') ? holdStartTime : 0;
var lastClickTime = (typeof lastClickTime !== 'undefined') ? lastClickTime : 0;
var lastClickZone = (typeof lastClickZone !== 'undefined') ? lastClickZone : null;
var hoveredZones = (typeof hoveredZones !== 'undefined') ? hoveredZones : new Set();
var proximityTriggeredZones = (typeof proximityTriggeredZones !== 'undefined') ? proximityTriggeredZones : new Set();

// ==================== AUDIO SYSTEM ====================
var AUDIO_CATEGORIES = (typeof AUDIO_CATEGORIES !== 'undefined') ? AUDIO_CATEGORIES : ['musique', 'ambiance', 'bruitage', 'mouvement'];
var audioTracks = (typeof audioTracks !== 'undefined') ? audioTracks : { musique: [], ambiance: [], bruitage: [], mouvement: [] };
var audioTrackIdCounter = (typeof audioTrackIdCounter !== 'undefined') ? audioTrackIdCounter : 0;
var activeAudioElements = (typeof activeAudioElements !== 'undefined') ? activeAudioElements : [];
var currentEditingAudioTrack = (typeof currentEditingAudioTrack !== 'undefined') ? currentEditingAudioTrack : null;
var audioHoverDebounceTimer = (typeof audioHoverDebounceTimer !== 'undefined') ? audioHoverDebounceTimer : null;
var lastHoveredAudioObject = (typeof lastHoveredAudioObject !== 'undefined') ? lastHoveredAudioObject : null;
var loadingScreenDismissed = (typeof loadingScreenDismissed !== 'undefined') ? loadingScreenDismissed : false;
var activeMovementAudio = (typeof activeMovementAudio !== 'undefined') ? activeMovementAudio : {};

// Mapping des actions de mouvement vers les touches clavier
var MOVEMENT_ACTION_KEYS = (typeof MOVEMENT_ACTION_KEYS !== 'undefined') ? MOVEMENT_ACTION_KEYS : {
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

var selectedLight = (typeof selectedLight !== 'undefined') ? selectedLight : null;

// Variables pour l'éditeur de plan de pièce - Système type Sims
var floorPlanMode = (typeof floorPlanMode !== 'undefined') ? floorPlanMode : 'draw-wall';

// Variables pour l'outil Mesure
var isMeasuring = (typeof isMeasuring !== 'undefined') ? isMeasuring : false;
var measureStartPoint3D = (typeof measureStartPoint3D !== 'undefined') ? measureStartPoint3D : null;
var measureLine = (typeof measureLine !== 'undefined') ? measureLine : null;
var measureLabel = (typeof measureLabel !== 'undefined') ? measureLabel : null;
var measureStartScreenPos = (typeof measureStartScreenPos !== 'undefined') ? measureStartScreenPos : null;
var measureStartMarker = (typeof measureStartMarker !== 'undefined') ? measureStartMarker : null;

// Variables pour l'outil Texture
var textureToolTexture = (typeof textureToolTexture !== 'undefined') ? textureToolTexture : null;
var textureToolType = (typeof textureToolType !== 'undefined') ? textureToolType : 'tile';
var textureToolTileSize = (typeof textureToolTileSize !== 'undefined') ? textureToolTileSize : 1;
var textureToolTarget = (typeof textureToolTarget !== 'undefined') ? textureToolTarget : 'wall';
var textureToolImageDataURL = (typeof textureToolImageDataURL !== 'undefined') ? textureToolImageDataURL : null;
var textureToolFileName = (typeof textureToolFileName !== 'undefined') ? textureToolFileName : '';
var floorPlanWalls = (typeof floorPlanWalls !== 'undefined') ? floorPlanWalls : [];
var floorPlanGrid = (typeof floorPlanGrid !== 'undefined') ? floorPlanGrid : null;
var gridSize = (typeof gridSize !== 'undefined') ? gridSize : 1;
var gridSnap = (typeof gridSnap !== 'undefined') ? gridSnap : true;
var wallHeight = (typeof wallHeight !== 'undefined') ? wallHeight : 2.5;
var wallThickness = (typeof wallThickness !== 'undefined') ? wallThickness : 0.2;
var isPlanViewActive = (typeof isPlanViewActive !== 'undefined') ? isPlanViewActive : false;
var savedCameraPosition = (typeof savedCameraPosition !== 'undefined') ? savedCameraPosition : null;
var savedCameraRotation = (typeof savedCameraRotation !== 'undefined') ? savedCameraRotation : null;

// Variables pour le tracé en cours (drag)
var isDrawingWall = (typeof isDrawingWall !== 'undefined') ? isDrawingWall : false;
var drawStartPoint = (typeof drawStartPoint !== 'undefined') ? drawStartPoint : null;
var currentPreviewWall = (typeof currentPreviewWall !== 'undefined') ? currentPreviewWall : null;
var selectedWall = (typeof selectedWall !== 'undefined') ? selectedWall : null;
var startPointMarker = (typeof startPointMarker !== 'undefined') ? startPointMarker : null;
var endPointMarker = (typeof endPointMarker !== 'undefined') ? endPointMarker : null;
var isCtrlPressed = (typeof isCtrlPressed !== 'undefined') ? isCtrlPressed : false;
var isBKeyPressed = (typeof isBKeyPressed !== 'undefined') ? isBKeyPressed : false;
var isMoveKeyPressed = (typeof isMoveKeyPressed !== 'undefined') ? isMoveKeyPressed : false;
var isRotateKeyPressed = (typeof isRotateKeyPressed !== 'undefined') ? isRotateKeyPressed : false;
var hasUnsavedChanges = (typeof hasUnsavedChanges !== 'undefined') ? hasUnsavedChanges : false;
var wallIdCounter = (typeof wallIdCounter !== 'undefined') ? wallIdCounter : 1;
var currentRoomName = (typeof currentRoomName !== 'undefined') ? currentRoomName : 'default';
var lastWallEndPoint = (typeof lastWallEndPoint !== 'undefined') ? lastWallEndPoint : null;
var wallLengthLabel = (typeof wallLengthLabel !== 'undefined') ? wallLengthLabel : null;
var hoveredWallForDeletion = (typeof hoveredWallForDeletion !== 'undefined') ? hoveredWallForDeletion : null;

// Variables pour la sélection multiple de murs (outil Selection)
var selectedWalls = (typeof selectedWalls !== 'undefined') ? selectedWalls : [];
var isDraggingSelectedWalls = (typeof isDraggingSelectedWalls !== 'undefined') ? isDraggingSelectedWalls : false;
var isRotatingSelectedWalls = (typeof isRotatingSelectedWalls !== 'undefined') ? isRotatingSelectedWalls : false;
var dragStartPoint = (typeof dragStartPoint !== 'undefined') ? dragStartPoint : null;
var rotationCenter = (typeof rotationCenter !== 'undefined') ? rotationCenter : null;
var rotationStartAngle = (typeof rotationStartAngle !== 'undefined') ? rotationStartAngle : 0;
var currentRotationAngle = (typeof currentRotationAngle !== 'undefined') ? currentRotationAngle : 0;
var rotationIndicator = (typeof rotationIndicator !== 'undefined') ? rotationIndicator : null;
var blockFloorPlanClick = (typeof blockFloorPlanClick !== 'undefined') ? blockFloorPlanClick : false;

// Variables pour le panning avec la barre espace (style Figma)
var isSpacePressed = (typeof isSpacePressed !== 'undefined') ? isSpacePressed : false;
var isSpacePanning = (typeof isSpacePanning !== 'undefined') ? isSpacePanning : false;
var spacePanStart = (typeof spacePanStart !== 'undefined') ? spacePanStart : { x: 0, y: 0 };
var spacePanCameraStart = (typeof spacePanCameraStart !== 'undefined') ? spacePanCameraStart : null;
var spacePanTargetStart = (typeof spacePanTargetStart !== 'undefined') ? spacePanTargetStart : null;

// Variables pour la gestion des pièces et opérations booléennes
var floorPlanRooms = (typeof floorPlanRooms !== 'undefined') ? floorPlanRooms : [];
var selectedRooms = (typeof selectedRooms !== 'undefined') ? selectedRooms : [];
var roomIdCounter = (typeof roomIdCounter !== 'undefined') ? roomIdCounter : 0;
var roomRounding = (typeof roomRounding !== 'undefined') ? roomRounding : 0;

// Historique pour Undo/Redo des murs (floor-plan)
var floorPlanHistory = (typeof floorPlanHistory !== 'undefined') ? floorPlanHistory : [];
var floorPlanHistoryIndex = (typeof floorPlanHistoryIndex !== 'undefined') ? floorPlanHistoryIndex : -1;
var MAX_FLOOR_PLAN_HISTORY = (typeof MAX_FLOOR_PLAN_HISTORY !== 'undefined') ? MAX_FLOOR_PLAN_HISTORY : 10;

var lightIdCounter = (typeof lightIdCounter !== 'undefined') ? lightIdCounter : 0;
var initialCameraSettings = (typeof initialCameraSettings !== 'undefined') ? initialCameraSettings : {
    position: new THREE.Vector3(),
    fov: 75
};

// Variables pour les gizmos visuels caméra et lumières
var cameraHelper = (typeof cameraHelper !== 'undefined') ? cameraHelper : null;
var lightHelpers = (typeof lightHelpers !== 'undefined') ? lightHelpers : new Map();
var cameraTransformControl = (typeof cameraTransformControl !== 'undefined') ? cameraTransformControl : null;
var lightTransformControl = (typeof lightTransformControl !== 'undefined') ? lightTransformControl : null;
var targetGizmo = (typeof targetGizmo !== 'undefined') ? targetGizmo : null;
var targetTransformControl = (typeof targetTransformControl !== 'undefined') ? targetTransformControl : null;
var targetLine = (typeof targetLine !== 'undefined') ? targetLine : null;
