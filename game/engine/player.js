/**
 * ============================================================
 * RESISTANCE — game/engine/player.js
 * Interactions en jeu (zones, clics objets, vidéos) et
 * cleanup de fin de vie de la scène
 * ------------------------------------------------------------
 * Découpage mécanique de l'ancien scene-loader.js (07/2026).
 * Les modules game/engine/ se chargent DANS L'ORDRE :
 * state → db → build → audio → restore → bootstrap → player
 * ============================================================
 */

// ==================== GAME INTERACTION SYSTEM ====================
// Fonctions de gameplay extraites de editor-floorplan.js pour le mode jeu allégé

function findObjectByRef(objectRef) {
    if (!objectRef) return null;
    // 1) Match exact UUID
    for (const obj of importedObjects) {
        if (obj.uuid === objectRef.objectUUID) return obj;
    }
    if (objectRef.editorName) {
        const searchName = objectRef.editorName.toLowerCase().trim();
        // 2) Exact editorName (case-insensitive)
        for (const obj of importedObjects) {
            const n = (obj.userData.editorName || obj.name || '').toLowerCase().trim();
            if (n === searchName) return obj;
        }
        // 3) Partial match fallback (editorName contient le nom cherché)
        for (const obj of importedObjects) {
            const n = (obj.userData.editorName || obj.name || '').toLowerCase().trim();
            if (n.includes(searchName) || searchName.includes(n)) return obj;
        }
    }
    return null;
}

function findCharacterByRef(characterRef) {
    if (!characterRef) return null;
    const allChars = [...importedCharacters];
    if (typeof babyModel !== 'undefined' && babyModel && !allChars.includes(babyModel)) allChars.push(babyModel);
    for (const char of allChars) {
        if (char.uuid === characterRef.characterUUID) return char;
    }
    if (characterRef.editorName) {
        for (const char of allChars) {
            if ((char.userData.editorName || char.name) === characterRef.editorName) return char;
        }
    }
    return null;
}

// Vecteurs pré-alloués pour getZoneDistance (zéro allocation par frame)
const _zdVec3 = new THREE.Vector3();

function getZoneDistance(zone, cameraPos) {
    const sm = zone.surfaceMode || 'floor';
    const cx = (zone.bounds.minX + zone.bounds.maxX) / 2;
    const cz = (zone.bounds.minZ + zone.bounds.maxZ) / 2;
    if (sm === 'wall' || sm === 'object' || sm === 'character') {
        _zdVec3.set(cx, zone.y, cz);
        return cameraPos.distanceTo(_zdVec3);
    }
    // Distance 2D XZ — calcul direct sans allocation
    const dx = cameraPos.x - cx;
    const dz = cameraPos.z - cz;
    return Math.sqrt(dx * dx + dz * dz);
}

// --- Hotspot turquoise pulsatile ---
const highlightedInteractionObjects = new Map();

function _createInteractionHotspot(position, radius) {
    const geo = new THREE.SphereGeometry(radius, 16, 12);
    const mat = new THREE.MeshBasicMaterial({
        color: 0x00CED1, transparent: true, opacity: 0.35,
        depthTest: false, depthWrite: false
    });
    const hotspot = new THREE.Mesh(geo, mat);
    hotspot.renderOrder = 999;
    hotspot.position.copy(position);
    hotspot.userData.isGizmo = true;
    hotspot.userData.isInteractionHotspot = true;
    hotspot.userData._baseScale = 1.0;
    hotspot.userData._pulsePhase = Math.random() * Math.PI * 2;
    return hotspot;
}

// Cache bone thorax par UUID (évite traverse() à chaque frame)
const _chestBoneCache = new Map();
const _chestWorldPos = new THREE.Vector3(); // Pré-alloué
const _chestFallbackBox = new THREE.Box3(); // Pré-alloué

function _getCharacterChestPosition(char) {
    // Chercher dans le cache
    let chestBone = _chestBoneCache.get(char.uuid);
    if (chestBone === undefined) {
        // Première fois : traverse + cache le résultat
        chestBone = null;
        char.traverse(child => {
            if (child.isBone && !chestBone) {
                const n = child.name.toLowerCase();
                if (n.includes('spine1') || n.includes('spine2') || n.includes('chest') || n.includes('spine_01') || n.includes('spine_02')) {
                    chestBone = child;
                }
            }
        });
        _chestBoneCache.set(char.uuid, chestBone || null);
    }
    if (chestBone) {
        chestBone.getWorldPosition(_chestWorldPos);
        return _chestWorldPos;
    }
    // Fallback : 60% de la hauteur
    _chestFallbackBox.setFromObject(char);
    const h = _chestFallbackBox.max.y - _chestFallbackBox.min.y;
    _chestWorldPos.set(
        (_chestFallbackBox.min.x + _chestFallbackBox.max.x) / 2,
        _chestFallbackBox.min.y + h * 0.6,
        (_chestFallbackBox.min.z + _chestFallbackBox.max.z) / 2
    );
    return _chestWorldPos;
}

function _updateInteractionHotspots() {
    const t = performance.now() * 0.003;
    highlightedInteractionObjects.forEach((data) => {
        if (data.hotspot) {
            const phase = data.hotspot.userData._pulsePhase || 0;
            const pulse = 0.85 + 0.15 * Math.sin(t + phase);
            data.hotspot.scale.setScalar(pulse);
            data.hotspot.material.opacity = 0.25 + 0.15 * Math.sin(t + phase);
        }
    });
}

function highlightObjectForInteraction(obj, zone) {
    if (!obj || highlightedInteractionObjects.has(obj.uuid)) return;
    const isCharacter = zone && zone.surfaceMode === 'character';
    if (isCharacter) {
        const chestPos = _getCharacterChestPosition(obj);
        const hotspot = _createInteractionHotspot(chestPos, 0.07);
        scene.add(hotspot);
        highlightedInteractionObjects.set(obj.uuid, { helper: null, object: obj, hotspot: hotspot, zone: zone });
    } else {
        const helper = new THREE.BoxHelper(obj, 0x00CED1);
        helper.material.transparent = true;
        helper.material.opacity = 0.45;
        helper.material.depthTest = true;
        helper.userData.isGizmo = true;
        scene.add(helper);
        highlightedInteractionObjects.set(obj.uuid, { helper, object: obj, hotspot: null, zone: zone });
    }
}

function unhighlightObjectForInteraction(obj) {
    if (!obj) return;
    const data = highlightedInteractionObjects.get(obj.uuid);
    if (!data) return;
    if (data.helper) { scene.remove(data.helper); data.helper.geometry.dispose(); data.helper.material.dispose(); }
    if (data.hotspot) { scene.remove(data.hotspot); data.hotspot.geometry.dispose(); data.hotspot.material.dispose(); }
    highlightedInteractionObjects.delete(obj.uuid);
}

// --- Zone proximity check (hotspots turquoise) ---
function checkZoneProximity() {
    if (typeof interactionMode !== 'undefined' && interactionMode !== 'game') return;
    const activeObjectUuids = new Set();
    interactionZones.forEach(zone => {
        const distance = getZoneDistance(zone, camera.position);
        const proxRange = (zone.surfaceMode === 'wall' || zone.surfaceMode === 'object' || zone.surfaceMode === 'character') ? 2.5 : 1.5;
        const visible = distance < proxRange;
        if (zone.meshGroup) zone.meshGroup.visible = visible;
        if (zone.surfaceMode === 'object' && zone.objectRef) {
            const obj = findObjectByRef(zone.objectRef);
            if (obj && visible) { highlightObjectForInteraction(obj, zone); activeObjectUuids.add(obj.uuid); }
        }
        if (zone.surfaceMode === 'character' && zone.characterRef) {
            const char = findCharacterByRef(zone.characterRef);
            if (char && visible) { highlightObjectForInteraction(char, zone); activeObjectUuids.add(char.uuid); }
        }
    });
    highlightedInteractionObjects.forEach((data, uuid) => {
        if (!activeObjectUuids.has(uuid)) {
            if (data.helper) { scene.remove(data.helper); data.helper.geometry.dispose(); data.helper.material.dispose(); }
            if (data.hotspot) { scene.remove(data.hotspot); data.hotspot.geometry.dispose(); data.hotspot.material.dispose(); }
            highlightedInteractionObjects.delete(uuid);
        } else {
            if (data.helper && data.object) data.helper.update();
            if (data.hotspot && data.object) {
                const newChestPos = _getCharacterChestPosition(data.object);
                data.hotspot.position.copy(newChestPos);
            }
        }
    });
    _updateInteractionHotspots();
}

// --- Hold trigger ---
function checkHoldTrigger() {
    if (typeof heldZone === 'undefined' || !heldZone || (typeof holdStartTime !== 'undefined' && holdStartTime === 0)) return;
    const elapsed = performance.now() - holdStartTime;
    if (elapsed >= 1000) {
        executeZoneAction(heldZone);
        heldZone = null;
        holdStartTime = 0;
    }
}

// --- Hover & proximity triggers ---
var hoveredZones = (typeof hoveredZones !== 'undefined') ? hoveredZones : new Set();
var proximityTriggeredZones = (typeof proximityTriggeredZones !== 'undefined') ? proximityTriggeredZones : new Set();

function checkHoverAndProximityTriggers() {
    if (typeof interactionMode !== 'undefined' && interactionMode !== 'game') return;
    const hoverRaycaster = new THREE.Raycaster();
    hoverRaycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const currentHovered = new Set();
    const currentProximity = new Set();

    for (const zone of interactionZones) {
        const zoneTrigger = zone.triggerType || 'click';
        if (!zone.actionValue) continue;
        const distance = getZoneDistance(zone, camera.position);
        const interactRange = (zone.surfaceMode === 'wall' || zone.surfaceMode === 'object' || zone.surfaceMode === 'character') ? 2.5 : 1.5;
        const inRange = distance < interactRange;

        if (zoneTrigger === 'hover' && inRange) {
            const meshes = [];
            if (zone.surfaceMode === 'object' && zone.objectRef) {
                const obj = findObjectByRef(zone.objectRef);
                if (obj) obj.traverse(child => { if (child.isMesh) meshes.push(child); });
            }
            if (zone.surfaceMode === 'character' && zone.characterRef) {
                const char = findCharacterByRef(zone.characterRef);
                if (char) char.traverse(child => { if (child.isMesh) meshes.push(child); });
            }
            if (meshes.length > 0) {
                const hits = hoverRaycaster.intersectObjects(meshes, false);
                if (hits.length > 0) {
                    currentHovered.add(zone.id);
                    if (!hoveredZones.has(zone.id)) {
                        hoveredZones.add(zone.id);
                        executeZoneAction(zone);
                    }
                }
            }
        }
        if (zoneTrigger === 'proximity' && inRange) {
            currentProximity.add(zone.id);
            if (!proximityTriggeredZones.has(zone.id)) {
                proximityTriggeredZones.add(zone.id);
                executeZoneAction(zone);
            }
        }
    }
    hoveredZones.forEach(id => { if (!currentHovered.has(id)) hoveredZones.delete(id); });
    proximityTriggeredZones.forEach(id => { if (!currentProximity.has(id)) proximityTriggeredZones.delete(id); });
}

// --- Zone click interaction ---
function checkZoneInteraction(event, eventType) {
    if (typeof interactionMode !== 'undefined' && interactionMode !== 'game') return false;
    eventType = eventType || 'click';
    const clickRaycaster = new THREE.Raycaster();
    const isPointerLocked = typeof renderer !== 'undefined' && document.pointerLockElement === renderer.domElement;
    if (isPointerLocked) {
        clickRaycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    } else if (event && event.clientX !== undefined) {
        const mx = (event.clientX / window.innerWidth) * 2 - 1;
        const my = -(event.clientY / window.innerHeight) * 2 + 1;
        clickRaycaster.setFromCamera(new THREE.Vector2(mx, my), camera);
    } else {
        clickRaycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    }

    for (const zone of interactionZones) {
        if (!zone.actionValue) continue;
        const zoneTrigger = zone.triggerType || 'click';
        if (zoneTrigger !== eventType) continue;
        const distance = getZoneDistance(zone, camera.position);
        const interactRange = (zone.surfaceMode === 'wall' || zone.surfaceMode === 'object' || zone.surfaceMode === 'character') ? 2.5 : 1.5;
        if (distance < interactRange) {
            const clickTriggers = ['click', 'double-click', 'right-click', 'hold'];
            if (clickTriggers.includes(eventType)) {
                let hitZone = false;
                // Character: test hotspot
                if (zone.surfaceMode === 'character' && zone.characterRef) {
                    const char = findCharacterByRef(zone.characterRef);
                    if (char) {
                        const highlightData = highlightedInteractionObjects.get(char.uuid);
                        if (highlightData && highlightData.hotspot) {
                            highlightData.hotspot.updateMatrixWorld(true);
                            const hotspotHits = clickRaycaster.intersectObject(highlightData.hotspot, false);
                            if (hotspotHits.length > 0) hitZone = true;
                        }
                        if (!hitZone) continue;
                    } else continue;
                }
                // Object: test meshes
                if (!hitZone && zone.surfaceMode === 'object' && zone.objectRef) {
                    const obj = findObjectByRef(zone.objectRef);
                    if (obj) {
                        const objMeshes = [];
                        obj.traverse(child => { if (child.isMesh) objMeshes.push(child); });
                        const hits = clickRaycaster.intersectObjects(objMeshes, false);
                        if (hits.length > 0) hitZone = true;
                        else continue;
                    } else continue;
                }
                // Floor/wall zone: test bounds
                if (!hitZone && (zone.surfaceMode === 'floor' || zone.surfaceMode === 'ceiling')) {
                    hitZone = true; // proximity is enough for floor zones
                }
                if (!hitZone && zone.surfaceMode === 'wall') {
                    hitZone = true;
                }
                if (!hitZone) continue;
            }
            executeZoneAction(zone);
            return true;
        }
    }
    return false;
}

// --- Execute zone action ---
var _videoProgressInterval = null;
var _closingVideoOverlay = false;

function _stopVideoProgressUpdate() {
    if (_videoProgressInterval) { clearInterval(_videoProgressInterval); _videoProgressInterval = null; }
}

function executeZoneAction(zone) {
    switch (zone.actionType) {
        case 'link':
            if (zone.actionValue) {
                let navUrl = zone.actionValue;

                // 1. Normaliser les backslashes Windows en forward slashes
                navUrl = navUrl.replace(/\\/g, '/');

                // 2. Si chemin absolu Windows (ex: C:/Users/.../fichier.html),
                //    extraire la partie relative à partir du dossier "Resistance/"
                //    ou construire une URL file:// correcte
                if (/^[A-Za-z]:\//.test(navUrl)) {
                    // Chercher le dossier racine du projet dans le chemin
                    const rootMatch = navUrl.match(/\/Resistance\/(.+)$/i);
                    if (rootMatch) {
                        // Chemin relatif depuis la racine Resistance
                        navUrl = './' + rootMatch[1];
                    } else {
                        // Fallback : URL file:// bien formée
                        navUrl = 'file:///' + navUrl;
                    }
                }

                // 3. Encoder les espaces et caractères spéciaux (sauf si déjà encodé)
                const encodedUrl = navUrl.includes('%') ? navUrl : encodeURI(navUrl);
                console.log('🔗 Navigation zone link :', zone.actionValue, '→', encodedUrl);
                window.location.href = encodedUrl;
            } else {
                console.warn('⚠️ Zone link sans actionValue (id:', zone.id, '— nom:', zone.customName, ')');
            }
            break;
        case 'message':
            if (zone.actionValue) alert(zone.actionValue);
            break;
        case 'teleport':
            if (zone.actionValue) {
                const coords = zone.actionValue.split(',').map(Number);
                if (coords.length >= 3 && coords.every(n => !isNaN(n))) {
                    camera.position.set(coords[0], coords[1], coords[2]);
                }
            }
            break;
        case 'video':
            showVideoOverlay(zone.actionValue, zone);
            break;
        case 'lightbox-image':
            showImageLightbox(zone.actionValue);
            break;
        case 'lightbox-text':
            showTextLightbox(zone.actionValue);
            break;
        case 'dialogue':
            // Ouvrir le panneau de dialogue avec le personnage (actionValue = nom du personnage)
            if (typeof DialogueManager !== 'undefined' && zone.actionValue) {
                DialogueManager.start(zone.actionValue);
            }
            break;
        case 'music':
            if (zone.actionValue && typeof triggerMusicInteraction === 'function') {
                triggerMusicInteraction(zone);
            }
            break;
        default:
            break;
    }
}

function showVideoOverlay(url, zone) {
    if (!url) return;
    _currentCinematicZone = zone || null;
    // Suspendre le tutoriel : évite que les bulles/spots restent visibles
    // au-dessus de la vidéo ou réapparaissent à la sortie du plein écran
    if (typeof TutorialManager !== 'undefined') TutorialManager.suspend();
    const overlay = document.getElementById('video-overlay');
    const video = document.getElementById('overlay-video-player');
    const iframe = document.getElementById('video-iframe');
    const skipHint = document.getElementById('video-skip-hint');
    if (!overlay || !video) return;

    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
    if (ytMatch) {
        video.style.display = 'none';
        if (iframe) { iframe.style.display = 'block'; iframe.src = 'https://www.youtube.com/embed/' + ytMatch[1] + '?autoplay=1&rel=0&controls=0&modestbranding=1'; }
    } else {
        if (iframe) iframe.style.display = 'none';
        video.style.display = 'block';
        video.src = url;
        video.volume = 1;
        video.onended = () => {
            const z = _currentCinematicZone;
            if (z && z.videoEndAction === 'navigate' && z.videoEndUrl) {
                _navigateAfterVideo(z.videoEndUrl);
            } else {
                closeVideoOverlay();
            }
        };
        video.play().catch(() => {});
    }
    _cinematicPlaying = true;
    _muteGameAudio();
    overlay.style.display = 'block';
    const requestFS = overlay.requestFullscreen || overlay.webkitRequestFullscreen || overlay.msRequestFullscreen;
    if (requestFS) requestFS.call(overlay).catch(() => {});
    if (skipHint) {
        skipHint.style.opacity = '1';
        clearTimeout(overlay._hintTimeout);
        overlay._hintTimeout = setTimeout(() => { skipHint.style.opacity = '0'; }, 3000);
    }
    overlay._cinematicClickHandler = (e) => {
        if (iframe && e.target === iframe) return;
        closeVideoOverlay();
    };
    overlay.addEventListener('click', overlay._cinematicClickHandler);
    overlay._cinematicKeyHandler = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeVideoOverlay(); }
    };
    document.addEventListener('keydown', overlay._cinematicKeyHandler, true);
}

function closeVideoOverlay() {
    if (_closingVideoOverlay) return;
    _closingVideoOverlay = true;
    _stopVideoProgressUpdate();
    const overlay = document.getElementById('video-overlay');
    const video = document.getElementById('overlay-video-player');
    const iframe = document.getElementById('video-iframe');
    if (!overlay) { _closingVideoOverlay = false; return; }
    if (overlay._cinematicClickHandler) { overlay.removeEventListener('click', overlay._cinematicClickHandler); overlay._cinematicClickHandler = null; }
    if (overlay._cinematicKeyHandler) { document.removeEventListener('keydown', overlay._cinematicKeyHandler, true); overlay._cinematicKeyHandler = null; }
    if (overlay._fullscreenChangeHandler) { document.removeEventListener('fullscreenchange', overlay._fullscreenChangeHandler); document.removeEventListener('webkitfullscreenchange', overlay._fullscreenChangeHandler); overlay._fullscreenChangeHandler = null; }
    clearTimeout(overlay._hintTimeout);
    if (video) { video.onended = null; video.pause(); video.src = ''; }
    if (iframe) iframe.src = '';
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        const exitFS = document.exitFullscreen || document.webkitExitFullscreen;
        if (exitFS) exitFS.call(document).then(() => { overlay.style.display = 'none'; }).catch(() => { overlay.style.display = 'none'; });
    } else {
        overlay.style.display = 'none';
    }
    _cinematicPlaying = false;
    _currentCinematicZone = null;
    if (typeof clock !== 'undefined') clock.getDelta();
    _unmuteGameAudio();
    // Réactiver le tutoriel (les watchers peuvent reprendre si nécessaire)
    if (typeof TutorialManager !== 'undefined' && typeof TutorialManager.resume === 'function') {
        TutorialManager.resume();
    }
    setTimeout(() => { _closingVideoOverlay = false; }, 200);
}

function _navigateAfterVideo(targetUrl) {
    closeVideoOverlay();
    const ls = document.getElementById('loading-screen');
    if (ls) {
        ls.style.display = 'flex';
        ls.classList.remove('fade-out');
        ls.style.opacity = '1';
        const bar = document.getElementById('loading-bar');
        if (bar) { bar.style.animation = 'none'; bar.style.width = '0%'; requestAnimationFrame(() => { bar.style.animation = 'loading-progress 2.5s ease-out forwards'; }); }
        const subtitle = ls.querySelector('.loading-subtitle');
        if (subtitle) subtitle.textContent = 'Chargement de la nouvelle salle...';
    }
    setTimeout(() => { window.location.href = targetUrl; }, 400);
}

function showImageLightbox(url) {
    if (!url) return;
    const overlay = document.getElementById('lightbox-image-overlay');
    const img = document.getElementById('lightbox-image');
    if (overlay && img) { img.src = url; overlay.style.display = 'block'; }
}

function closeImageLightbox() {
    const overlay = document.getElementById('lightbox-image-overlay');
    const img = document.getElementById('lightbox-image');
    if (overlay) overlay.style.display = 'none';
    if (img) img.src = '';
}

function showTextLightbox(textOrHtml) {
    if (!textOrHtml) return;
    const overlay = document.getElementById('lightbox-text-overlay');
    const content = document.getElementById('lightbox-text-content');
    if (overlay && content) { content.innerHTML = textOrHtml; overlay.style.display = 'block'; }
}

function closeTextLightbox() {
    const overlay = document.getElementById('lightbox-text-overlay');
    const content = document.getElementById('lightbox-text-content');
    if (overlay) overlay.style.display = 'none';
    if (content) content.innerHTML = '';
}

function closeAllOverlays() {
    closeVideoOverlay();
    closeImageLightbox();
    closeTextLightbox();
}

// ==================== CLEANUP DE FIN DE VIE ====================
// Libère la mémoire GPU quand l'utilisateur quitte la page ou change de salle.
// Sinon les textures, géométries et matériaux restent alloués côté WebGL jusqu'à
// ce que le GC récupère le contexte — ce qui peut mettre 30+ secondes et laisser
// la mémoire gonflée si l'utilisateur enchaîne plusieurs salles.
function disposeSceneAndRelease() {
    try {
        if (typeof scene !== 'undefined' && scene) {
            // Dispose tous les enfants restants de la scène
            const children = [...scene.children];
            for (const child of children) disposeObject3D(child);
        }
        clearTextureCache();
        if (typeof renderer !== 'undefined' && renderer) {
            if (renderer.renderLists && renderer.renderLists.dispose) renderer.renderLists.dispose();
            if (renderer.dispose) renderer.dispose();
            if (renderer.forceContextLoss) renderer.forceContextLoss();
        }
    } catch (e) {
        // Page en train de mourir — on n'a pas besoin de gérer l'erreur
    }
}

// beforeunload : navigation vers une autre page / fermeture d'onglet
// pagehide : équivalent plus fiable sur iOS et pour bfcache
window.addEventListener('beforeunload', disposeSceneAndRelease);
window.addEventListener('pagehide', disposeSceneAndRelease);

console.log('✅ moteur game/engine chargé (7 modules, mode jeu léger)');
