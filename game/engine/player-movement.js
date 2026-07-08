/**
 * ============================================================
 * RESISTANCE — game/engine/player-movement.js
 * Mouvement FPS + collisions du joueur (E3 : « Jouer ici » dans
 * l'éditeur). Extrait de game/pages/sas-securite.js pour être
 * partagé entre les pages de jeu réelles et l'éditeur, plutôt que
 * dupliqué. Logique inchangée — seules les dépendances externes
 * (camera/controls/scène/entrées clavier-manette/spawn) sont
 * injectées via init() au lieu d'être des globales de page.
 *
 * Usage :
 *   PlayerMovement.init({ THREE, camera, controls, getScene, input,
 *     gamepad, getSpawn, roomLimit, eyeHeight });
 *   // puis, dans la boucle animate() de l'hôte, en mode jeu :
 *   PlayerMovement.setupFPSCamera();        // une fois, à l'entrée en mode jeu
 *   PlayerMovement.updateControlsForMode('game' | 'developer');
 *   PlayerMovement.handleSceneMovement(delta, mode);
 *   PlayerMovement.updateHeadBob(delta, mode);
 *   PlayerMovement.enforceGameHeight(mode);
 *   PlayerMovement.enforceCameraCollisions(mode);
 *   // + PlayerMovement.invalidateCollisionCache() quand la scène change,
 *   //   PlayerMovement.createCharacterCollisionProxy(character) au chargement
 *   //   d'un personnage, PlayerMovement.updateAllCharacterCollisionProxies()
 *   //   périodiquement.
 * ============================================================
 */
var PlayerMovement = (function() {
    'use strict';

    var CAMERA_COLLISION_MARGIN = 0.35;
    var ACCELERATION = 50.0;
    var DECELERATION = 40.0;
    var HEAD_BOB_WALK_FREQ = 8.0;
    var HEAD_BOB_RUN_FREQ = 12.0;
    var HEAD_BOB_WALK_AMP = 0.004; // réduit (0.008 d'origine — jugé trop prononcé en test)
    var HEAD_BOB_RUN_AMP = 0.007;  // réduit (0.014 d'origine)

    // ---- dépendances injectées par l'hôte (game page ou éditeur) ----
    var THREE, camera, controls, getScene, input, gamepad, getSpawn, roomLimit, eyeHeight, walkSpeed, runSpeed;

    // ---- état interne (réinitialisé à chaque init) ----
    var gamePlayerY = null;
    var cachedCollisionMeshes = null;
    var _collisionCacheDirty = true;
    var characterCollisionProxies = [];
    var currentSpeed = 0;
    var isMoving = false;
    var headBobTime = 0;
    var headBobOffset = 0;
    var _proxyUpdateFrame = 0;

    // ---- vecteurs pré-alloués (créés une fois THREE connu, réutilisés à chaque frame) ----
    var CAMERA_COLLISION_RAYCASTER, _tmpVec3A, _tmpVec3B, _moveForward, _moveRight, _moveInput,
        _devDirection, _devSide, _slideX, _slideZ, _slideResult, _lookDir, _charLayer, _collisionDirs;

    function init(cfg) {
        THREE = cfg.THREE;
        camera = cfg.camera;
        controls = cfg.controls;
        getScene = cfg.getScene;
        input = cfg.input; // { isActionPressed(action, keysPressed) }
        gamepad = cfg.gamepad || { connected: false, getActionValue: function() { return 0; } };
        getSpawn = cfg.getSpawn || function() { return { position: null, rotationY: 0, saved: false }; };
        roomLimit = cfg.roomLimit || 98;
        eyeHeight = cfg.eyeHeight || 1.5;
        walkSpeed = cfg.walkSpeed || 0.8;
        runSpeed = cfg.runSpeed || 3;

        CAMERA_COLLISION_RAYCASTER = new THREE.Raycaster();
        _tmpVec3A = new THREE.Vector3();
        _tmpVec3B = new THREE.Vector3();
        _moveForward = new THREE.Vector3();
        _moveRight = new THREE.Vector3();
        _moveInput = new THREE.Vector3();
        _devDirection = new THREE.Vector3();
        _devSide = new THREE.Vector3();
        _slideX = new THREE.Vector3();
        _slideZ = new THREE.Vector3();
        _slideResult = new THREE.Vector3();
        _lookDir = new THREE.Vector3();
        _charLayer = new THREE.Layers();
        _charLayer.set(1);
        _collisionDirs = [
            new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)
        ];

        gamePlayerY = null;
        cachedCollisionMeshes = null;
        _collisionCacheDirty = true;
        characterCollisionProxies = [];
        currentSpeed = 0;
        isMoving = false;
        headBobTime = 0;
        headBobOffset = 0;
        _proxyUpdateFrame = 0;
    }

    // ==================== COLLISIONS ====================

    function invalidateCollisionCache() { _collisionCacheDirty = true; }

    function getCollisionMeshes() {
        if (!_collisionCacheDirty && cachedCollisionMeshes) return cachedCollisionMeshes;

        var scene = getScene();
        var collisionMeshes = [];
        scene.traverse(function(child) {
            if (!child.isMesh || !child.visible) return;
            if (child.userData.isGizmo && !child.userData.isCollisionProxy) return;
            if (child.userData.isFloorPlanPoint || child.userData.isFloorPlanLine || child.userData.isPreview) return;
            if (typeof floorPlanGrid !== 'undefined' && child === floorPlanGrid) return;
            if (child.userData.isCharacter) return;
            if (child.layers && child.layers.test(_charLayer)) return;
            var p = child.parent;
            while (p) {
                if (p.userData.isCharacter) return;
                // Un ancêtre invisible masque aussi ses enfants même si ceux-ci ont
                // individuellement visible=true (ex: gizmo TransformControls détaché
                // dans l'éditeur — visible=false au niveau racine, mais ses mesh
                // internes X/Y/Z/XY/... restent chacun visible=true).
                if (!p.visible) return;
                p = p.parent;
            }
            collisionMeshes.push(child);
        });
        cachedCollisionMeshes = collisionMeshes;
        _collisionCacheDirty = false;
        return collisionMeshes;
    }

    function raycastDistance(origin, direction, maxDist) {
        CAMERA_COLLISION_RAYCASTER.set(origin, direction);
        CAMERA_COLLISION_RAYCASTER.far = maxDist;
        CAMERA_COLLISION_RAYCASTER.near = 0;
        var meshes = getCollisionMeshes();
        var hits = CAMERA_COLLISION_RAYCASTER.intersectObjects(meshes, false);
        return hits.length > 0 ? hits[0].distance : Infinity;
    }

    // Vérifie si on peut se déplacer dans une direction, avec wall-sliding.
    // Retourne le vecteur de déplacement autorisé (possiblement réduit/dévié).
    function computeAllowedMovement(origin, moveVec) {
        var moveDist = moveVec.length();
        if (moveDist < 0.0001) return moveVec;

        _tmpVec3A.copy(moveVec).normalize();
        var moveDir = _tmpVec3A;
        var checkDist = moveDist + CAMERA_COLLISION_MARGIN;

        var dist = raycastDistance(origin, moveDir, checkDist);
        var allowed = dist - CAMERA_COLLISION_MARGIN;

        if (allowed >= moveDist) return moveVec;
        if (allowed > 0.01) return moveDir.multiplyScalar(allowed);

        // Bloqué en direct → wall-sliding
        _slideX.set(moveVec.x, 0, 0);
        _slideZ.set(0, 0, moveVec.z);
        _slideResult.set(0, 0, 0);

        if (Math.abs(_slideX.x) > 0.0001) {
            _tmpVec3B.copy(_slideX).normalize();
            var distX = raycastDistance(origin, _tmpVec3B, Math.abs(_slideX.x) + CAMERA_COLLISION_MARGIN);
            var allowedX = distX - CAMERA_COLLISION_MARGIN;
            if (allowedX > 0.01) _slideResult.x = _tmpVec3B.x * Math.min(allowedX, Math.abs(_slideX.x));
        }
        if (Math.abs(_slideZ.z) > 0.0001) {
            _tmpVec3B.copy(_slideZ).normalize();
            var distZ = raycastDistance(origin, _tmpVec3B, Math.abs(_slideZ.z) + CAMERA_COLLISION_MARGIN);
            var allowedZ = distZ - CAMERA_COLLISION_MARGIN;
            if (allowedZ > 0.01) _slideResult.z = _tmpVec3B.z * Math.min(allowedZ, Math.abs(_slideZ.z));
        }
        return _slideResult;
    }

    // Repousse la caméra hors des murs si elle est trop proche (4 directions cardinales)
    function enforceCameraCollisions(mode) {
        if (mode !== 'game') return;

        var pos = camera.position;
        var margin = CAMERA_COLLISION_MARGIN;
        var meshes = getCollisionMeshes();

        for (var i = 0; i < 4; i++) {
            var dir = _collisionDirs[i];
            CAMERA_COLLISION_RAYCASTER.set(pos, dir);
            CAMERA_COLLISION_RAYCASTER.far = margin;
            CAMERA_COLLISION_RAYCASTER.near = 0;

            var hits = CAMERA_COLLISION_RAYCASTER.intersectObjects(meshes, false);
            if (hits.length > 0) {
                var pushBack = margin - hits[0].distance;
                if (pushBack > 0.001) {
                    pos.x -= dir.x * pushBack;
                    pos.z -= dir.z * pushBack;
                    controls.target.x -= dir.x * pushBack;
                    controls.target.z -= dir.z * pushBack;
                }
            }
        }
    }

    // ---- Collision proxies pour personnages (boîtes invisibles) ----

    function createCharacterCollisionProxy(character) {
        if (!character) return;
        if (characterCollisionProxies.some(function(e) { return e.character === character; })) return;

        var height, radius;
        var boneMeasure = (typeof measureCharacterByBones === 'function') ? measureCharacterByBones(character) : null;
        if (boneMeasure) {
            height = boneMeasure.height;
            radius = Math.max(boneMeasure.width, boneMeasure.depth) * 0.5;
        } else if (character.userData.referenceHeightAtScale1) {
            var s = character.scale.y;
            height = character.userData.referenceHeightAtScale1 * s;
            radius = height * 0.2;
        } else {
            var box = new THREE.Box3().setFromObject(character);
            var size = new THREE.Vector3();
            box.getSize(size);
            height = size.y || 1.7;
            radius = Math.max(size.x, size.z) * 0.5 || 0.3;
        }

        radius = Math.max(radius, 0.35);
        height = Math.max(height, 0.5);

        var side = radius * 2;
        var geometry = new THREE.BoxGeometry(side, height, side);
        var material = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0, depthWrite: false });
        var proxy = new THREE.Mesh(geometry, material);

        proxy.position.set(character.position.x, character.position.y + height / 2, character.position.z);
        proxy.userData.isGizmo = true;
        proxy.userData.isCollisionProxy = true;

        getScene().add(proxy);
        proxy.updateMatrixWorld(true);

        characterCollisionProxies.push({ character: character, proxy: proxy, radius: radius, height: height });
        invalidateCollisionCache();
    }

    function removeCharacterCollisionProxy(character) {
        var idx = characterCollisionProxies.findIndex(function(e) { return e.character === character; });
        if (idx === -1) return;
        var entry = characterCollisionProxies[idx];
        getScene().remove(entry.proxy);
        entry.proxy.geometry.dispose();
        entry.proxy.material.dispose();
        characterCollisionProxies.splice(idx, 1);
        invalidateCollisionCache();
    }

    function updateCharacterCollisionProxy(entry) {
        if (!entry.character || !entry.proxy) return;
        entry.proxy.position.set(entry.character.position.x, entry.character.position.y + entry.height / 2, entry.character.position.z);
        entry.proxy.updateMatrixWorld(true);
    }

    function updateAllCharacterCollisionProxies() {
        characterCollisionProxies.forEach(updateCharacterCollisionProxy);
    }

    // ==================== CAMÉRA / CONTRÔLES ====================

    // Configure OrbitControls selon le mode ('game' = FPS, autre = libre/développeur)
    function updateControlsForMode(mode) {
        if (mode === 'game') {
            controls.enableZoom = true;
            controls.enableRotate = false; // rotation gérée par le handler souris de l'hôte (clic droit maintenu)
            controls.minDistance = 0.001;
            controls.maxDistance = 20;
            controls.minPolarAngle = Math.PI * 0.15;
            controls.maxPolarAngle = Math.PI * 0.85;
            controls.enablePan = false;
            controls.rotateSpeed = 0.4;
            controls.enableDamping = false;
            controls.mouseButtons = { LEFT: null, MIDDLE: null, RIGHT: THREE.MOUSE.ROTATE };
        } else {
            controls.enableZoom = true;
            controls.enableRotate = true;
            controls.minDistance = 2;
            controls.maxDistance = 150;
            controls.minPolarAngle = 0;
            controls.maxPolarAngle = Math.PI / 2.1;
            controls.enablePan = false;
            controls.rotateSpeed = 1.0;
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
        }
        controls.update();
    }

    // Hauteur Y des yeux verrouillée par setupFPSCamera() (null si jamais appelée)
    function getPlayerEyeY() { return gamePlayerY; }

    // Rotation caméra (regard) au clic droit maintenu — Pointer Events +
    // setPointerCapture (fonctionne hors zone du canvas, local et en ligne).
    // isActiveFn() détermine si la rotation doit s'appliquer (typiquement
    // "suis-je en mode jeu ?") — évite un conflit avec la rotation orbitale
    // native d'OrbitControls en mode développeur (même bouton, RIGHT).
    // Idempotent : n'attache les listeners qu'une fois par élément.
    var _mouseLookAttached = new WeakSet();
    function setupMouseLook(domElement, isActiveFn) {
        if (_mouseLookAttached.has(domElement)) return;
        _mouseLookAttached.add(domElement);

        var prevX = 0, prevY = 0, capturedId = null;
        var dir = new THREE.Vector3();

        domElement.addEventListener('contextmenu', function(e) { e.preventDefault(); });
        domElement.addEventListener('pointerdown', function(e) {
            if (!isActiveFn() || e.button !== 2) return;
            e.preventDefault();
            capturedId = e.pointerId;
            prevX = e.clientX; prevY = e.clientY;
            try { domElement.setPointerCapture(e.pointerId); } catch (ex) {}
        });
        domElement.addEventListener('pointermove', function(e) {
            if (capturedId === null || e.pointerId !== capturedId || !isActiveFn()) return;
            var dx = e.clientX - prevX, dy = e.clientY - prevY;
            prevX = e.clientX; prevY = e.clientY;
            if (dx === 0 && dy === 0) return;
            dir.subVectors(controls.target, camera.position);
            var dist = Math.max(dir.length(), 0.001);
            var theta = Math.atan2(dir.x, dir.z);
            var phi = Math.acos(Math.max(-1, Math.min(1, dir.y / dist)));
            var newTheta = theta - dx * 0.004;
            var newPhi = Math.max(0.3, Math.min(2.8, phi + dy * 0.004));
            dir.set(
                dist * Math.sin(newPhi) * Math.sin(newTheta),
                dist * Math.cos(newPhi),
                dist * Math.sin(newPhi) * Math.cos(newTheta)
            );
            controls.target.copy(camera.position).add(dir);
            camera.lookAt(controls.target);
        });
        domElement.addEventListener('pointerup', function(e) {
            if (e.button === 2 && capturedId !== null) {
                try { domElement.releasePointerCapture(e.pointerId); } catch (ex) {}
                capturedId = null;
            }
        });
    }

    // Initialise la position FPS en entrant en mode jeu (hauteur des yeux verrouillée,
    // target juste devant la caméra pour que la rotation OrbitControls = regard)
    function setupFPSCamera(startY) {
        var spawn = getSpawn();
        if (typeof startY === 'number') {
            // Hauteur imposée par l'hôte (ex: éditeur sans position de départ définie
            // → garder la hauteur de la vue libre actuelle plutôt que sauter à eyeHeight)
            gamePlayerY = startY;
        } else if (spawn && spawn.position && spawn.saved) {
            gamePlayerY = spawn.position.y + eyeHeight;
        } else {
            gamePlayerY = eyeHeight;
        }
        camera.position.y = gamePlayerY;

        var dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        controls.target.set(
            camera.position.x + dir.x * 0.01,
            camera.position.y + dir.y * 0.01,
            camera.position.z + dir.z * 0.01
        );

        updateControlsForMode('game');
    }

    // ==================== MOUVEMENT ====================

    // À appeler quand la fenêtre perd le focus (alt-tab...) pour éviter que
    // le joueur continue de "courir" indéfiniment une fois revenu.
    function resetMovementState() {
        currentSpeed = 0;
        isMoving = false;
        headBobOffset = 0;
        headBobTime = 0;
    }

    function updateHeadBob(delta, mode) {
        if (mode !== 'game') return;

        if (isMoving && currentSpeed > 0.5) {
            var gpSprint = gamepad.connected && gamepad.getActionValue('run') > 0.5;
            var isSprinting = input.isSprintPressed ? input.isSprintPressed() : gpSprint;
            var freq = isSprinting ? HEAD_BOB_RUN_FREQ : HEAD_BOB_WALK_FREQ;
            var ampY = isSprinting ? HEAD_BOB_RUN_AMP : HEAD_BOB_WALK_AMP;

            headBobTime += delta * freq * Math.PI * 2;
            headBobOffset = Math.sin(headBobTime) * ampY;
        } else {
            headBobOffset *= 0.85;
            if (Math.abs(headBobOffset) < 0.0005) headBobOffset = 0;
            headBobTime = 0;
        }
    }

    // Déplacement libre "développeur" (pas de collision, vitesse fixe, limité à roomLimit)
    function handleFreeMovement() {
        var moveSpeed = 0.4;
        camera.getWorldDirection(_devDirection);
        _devDirection.y = 0;
        _devDirection.normalize();
        _devSide.crossVectors(_devDirection, camera.up).normalize();

        var moveX = 0, moveZ = 0;
        if (input.isActionPressed('forward')) { moveX += _devDirection.x * moveSpeed; moveZ += _devDirection.z * moveSpeed; }
        if (input.isActionPressed('backward')) { moveX -= _devDirection.x * moveSpeed; moveZ -= _devDirection.z * moveSpeed; }
        if (input.isActionPressed('left')) { moveX -= _devSide.x * moveSpeed; moveZ -= _devSide.z * moveSpeed; }
        if (input.isActionPressed('right')) { moveX += _devSide.x * moveSpeed; moveZ += _devSide.z * moveSpeed; }

        if (gamepad.connected) {
            var gpFwd = gamepad.getActionValue('forward'), gpBack = gamepad.getActionValue('backward');
            var gpLeft = gamepad.getActionValue('left'), gpRight = gamepad.getActionValue('right');
            if (gpFwd > 0) { moveX += _devDirection.x * moveSpeed * gpFwd; moveZ += _devDirection.z * moveSpeed * gpFwd; }
            if (gpBack > 0) { moveX -= _devDirection.x * moveSpeed * gpBack; moveZ -= _devDirection.z * moveSpeed * gpBack; }
            if (gpLeft > 0) { moveX -= _devSide.x * moveSpeed * gpLeft; moveZ -= _devSide.z * moveSpeed * gpLeft; }
            if (gpRight > 0) { moveX += _devSide.x * moveSpeed * gpRight; moveZ += _devSide.z * moveSpeed * gpRight; }
        }

        if (moveX === 0 && moveZ === 0) return;

        var nextX = camera.position.x + moveX;
        var nextZ = camera.position.z + moveZ;
        if (Math.abs(nextX) < roomLimit) { camera.position.x = nextX; controls.target.x += moveX; }
        if (Math.abs(nextZ) < roomLimit) { camera.position.z = nextZ; controls.target.z += moveZ; }
    }

    // Mouvement FPS en mode jeu — delta-time, accélération/décélération, collisions + wall-sliding
    function handleGameMovement(delta) {
        camera.getWorldDirection(_moveForward);
        _moveForward.y = 0;
        _moveForward.normalize();
        _moveRight.set(0, 1, 0);
        _moveRight.crossVectors(_moveForward, _moveRight).normalize();

        _moveInput.set(0, 0, 0);

        if (input.isActionPressed('forward')) _moveInput.add(_moveForward);
        if (input.isActionPressed('backward')) _moveInput.sub(_moveForward);
        if (input.isActionPressed('left')) _moveInput.sub(_moveRight);
        if (input.isActionPressed('right')) _moveInput.add(_moveRight);

        if (gamepad.connected) {
            var gpFwd = gamepad.getActionValue('forward'), gpBack = gamepad.getActionValue('backward');
            var gpLeft = gamepad.getActionValue('left'), gpRight = gamepad.getActionValue('right');
            if (gpFwd > 0) _moveInput.addScaledVector(_moveForward, gpFwd);
            if (gpBack > 0) _moveInput.addScaledVector(_moveForward, -gpBack);
            if (gpLeft > 0) _moveInput.addScaledVector(_moveRight, -gpLeft);
            if (gpRight > 0) _moveInput.addScaledVector(_moveRight, gpRight);
        }

        var hasInput = _moveInput.lengthSq() > 0.001;
        if (hasInput) _moveInput.normalize();

        var kbSprint = input.isSprintPressed ? input.isSprintPressed() : false;
        var gpSprint = gamepad.connected && gamepad.getActionValue('run') > 0.5;
        var isSprinting = (kbSprint || gpSprint) && hasInput;
        var targetSpeed = hasInput ? (isSprinting ? runSpeed : walkSpeed) : 0;

        if (targetSpeed > currentSpeed) {
            currentSpeed = Math.min(targetSpeed, currentSpeed + ACCELERATION * delta);
        } else {
            currentSpeed = Math.max(targetSpeed, currentSpeed - DECELERATION * delta);
        }

        isMoving = currentSpeed > 0.5;

        if (currentSpeed < 0.01) {
            currentSpeed = 0;
            return;
        }

        _moveInput.multiplyScalar(currentSpeed * delta);

        var allowed = computeAllowedMovement(camera.position, _moveInput);
        if (allowed.lengthSq() < 0.00001) return;

        camera.position.x += allowed.x;
        camera.position.z += allowed.z;
        controls.target.x += allowed.x;
        controls.target.z += allowed.z;

        camera.position.x = Math.max(-roomLimit, Math.min(roomLimit, camera.position.x));
        camera.position.z = Math.max(-roomLimit, Math.min(roomLimit, camera.position.z));
    }

    // Dispatcher appelé depuis animate() — délègue selon le mode
    function handleSceneMovement(delta, mode) {
        if (mode === 'game') {
            handleGameMovement(delta);
        } else {
            handleFreeMovement();
        }
    }

    // Force la hauteur Y de la caméra + target en mode jeu (pieds au sol + head bob)
    function enforceGameHeight(mode) {
        if (mode !== 'game' || gamePlayerY === null) return;

        camera.getWorldDirection(_lookDir);
        camera.position.y = gamePlayerY + headBobOffset;
        controls.target.set(
            camera.position.x + _lookDir.x * 0.01,
            camera.position.y + _lookDir.y * 0.01,
            camera.position.z + _lookDir.z * 0.01
        );
    }

    return {
        init: init,
        invalidateCollisionCache: invalidateCollisionCache,
        getCollisionMeshes: getCollisionMeshes,
        computeAllowedMovement: computeAllowedMovement,
        enforceCameraCollisions: enforceCameraCollisions,
        createCharacterCollisionProxy: createCharacterCollisionProxy,
        removeCharacterCollisionProxy: removeCharacterCollisionProxy,
        updateAllCharacterCollisionProxies: updateAllCharacterCollisionProxies,
        updateControlsForMode: updateControlsForMode,
        setupFPSCamera: setupFPSCamera,
        getPlayerEyeY: getPlayerEyeY,
        setupMouseLook: setupMouseLook,
        resetMovementState: resetMovementState,
        updateHeadBob: updateHeadBob,
        handleSceneMovement: handleSceneMovement,
        enforceGameHeight: enforceGameHeight
    };
})();
