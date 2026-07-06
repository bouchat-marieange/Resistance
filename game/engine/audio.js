/**
 * ============================================================
 * RESISTANCE — game/engine/audio.js
 * Pistes audio du jeu : ambiances, bruitages, sons de mouvement
 * ------------------------------------------------------------
 * Découpage mécanique de l'ancien scene-loader.js (07/2026).
 * Les modules game/engine/ se chargent DANS L'ORDRE :
 * state → db → build → audio → restore → bootstrap → player
 * ============================================================
 */

// ==================== AUDIO DU JEU ====================

function createAudioElement(track) {
    if (!track.dataURL) return null;
    const audio = new Audio(track.dataURL);
    const masterVol = (typeof getMasterVolume === 'function') ? getMasterVolume(track.category) : 1.0;
    audio.volume = track.muted ? 0 : (track.volume / 100) * masterVol;
    audio.loop = track.loop;
    audio.muted = track.muted;
    audio._trackCategory = track.category;
    audio._trackVolume = track.volume;
    track.audioElement = audio;
    return audio;
}

function startGameAudio() {
    for (const cat of AUDIO_CATEGORIES) {
        for (const track of audioTracks[cat]) {
            if (track.triggerAction === 'load' && !track.muted && track.dataURL) {
                const audio = createAudioElement(track);
                if (audio) {
                    audio.play().catch(err => console.warn('Autoplay blocked for "' + track.name + '":', err));
                    activeAudioElements.push(audio);
                }
            }
        }
    }
    console.log('🎵 Audio de jeu démarré (' + activeAudioElements.length + ' pistes auto)');
}

let _savedAudioVolumes = [];
function _muteGameAudio() {
    _savedAudioVolumes = [];
    activeAudioElements.forEach(audio => {
        _savedAudioVolumes.push({ element: audio, volume: audio.volume });
        audio.volume = 0;
    });
    for (const cat of AUDIO_CATEGORIES) {
        for (const track of audioTracks[cat]) {
            if (track.audioElement && !track.audioElement.paused) {
                _savedAudioVolumes.push({ element: track.audioElement, volume: track.audioElement.volume });
                track.audioElement.volume = 0;
            }
        }
    }
    for (const key in activeMovementAudio) {
        if (activeMovementAudio[key]) {
            _savedAudioVolumes.push({ element: activeMovementAudio[key], volume: activeMovementAudio[key].volume });
            activeMovementAudio[key].volume = 0;
        }
    }
}

function _unmuteGameAudio() {
    _savedAudioVolumes.forEach(entry => { if (entry.element) entry.element.volume = entry.volume; });
    _savedAudioVolumes = [];
}

function stopAllGameAudio() {
    activeAudioElements.forEach(audio => { audio.pause(); audio.currentTime = 0; });
    activeAudioElements = [];
    for (const cat of AUDIO_CATEGORIES) {
        for (const track of audioTracks[cat]) {
            if (track.audioElement) { track.audioElement.pause(); track.audioElement.currentTime = 0; track.audioElement = null; }
        }
    }
    for (const key in activeMovementAudio) {
        if (activeMovementAudio[key]) { activeMovementAudio[key].pause(); activeMovementAudio[key].currentTime = 0; }
    }
    activeMovementAudio = {};
}

async function restoreAudioTracks(tracksData) {
    for (const cat of AUDIO_CATEGORIES) {
        audioTracks[cat].forEach(t => { if (t.audioElement) { t.audioElement.pause(); t.audioElement = null; } });
        audioTracks[cat] = [];
    }
    for (const td of tracksData) {
        const cat = td.category || 'musique';
        if (!audioTracks[cat]) continue;
        let dataURL = null;
        if (td.blobId) {
            try {
                const blobRecord = await RoomEditorDB.get(RoomEditorDB.STORE_BLOBS, td.blobId);
                if (blobRecord && blobRecord.data) dataURL = blobRecord.data;
            } catch (e) { console.warn('Audio blob not found:', td.blobId); }
        }
        audioTracks[cat].push({
            id: td.id, name: td.name, category: cat, blobId: td.blobId,
            dataURL: dataURL, volume: td.volume !== undefined ? td.volume : 80,
            muted: td.muted || false, loop: td.loop !== undefined ? td.loop : true,
            triggerAction: td.triggerAction || 'none', triggerObjectName: td.triggerObjectName || '',
            audioElement: null, movementAction: td.movementAction || '', movementPlayMode: td.movementPlayMode || ''
        });
    }
}

// --- Mouvement Audio ---
function checkMovementAudioKeyDown(key) {
    if (interactionMode !== 'game') return;
    const lowerKey = key.toLowerCase();
    const rhythmActions = ['forward', 'backward', 'left', 'right', 'run'];
    for (const track of audioTracks.mouvement) {
        if (!track.movementAction || track.muted || !track.dataURL) continue;
        if (rhythmActions.includes(track.movementAction)) continue;
        const keys = MOVEMENT_ACTION_KEYS[track.movementAction];
        if (!keys || !keys.includes(lowerKey)) continue;
        const trackKey = track.id + '_' + track.movementAction;
        if (track.movementPlayMode === 'while-held') {
            if (!activeMovementAudio[trackKey]) {
                const audio = createAudioElement(track);
                if (audio) { audio.loop = true; audio.play().catch(() => {}); activeMovementAudio[trackKey] = audio; }
            }
        } else if (track.movementPlayMode === 'once-per-action') {
            if (!activeMovementAudio[trackKey] || activeMovementAudio[trackKey].ended) {
                const audio = createAudioElement(track);
                if (audio) { audio.loop = false; audio.play().catch(() => {}); audio.onended = () => { delete activeMovementAudio[trackKey]; }; activeMovementAudio[trackKey] = audio; }
            }
        } else if (track.movementPlayMode === 'loop-during') {
            if (!activeMovementAudio[trackKey]) {
                const audio = createAudioElement(track);
                if (audio) { audio.loop = true; audio.play().catch(() => {}); activeMovementAudio[trackKey] = audio; }
            }
        }
    }
}

function checkMovementAudioKeyUp(key) {
    if (interactionMode !== 'game') return;
    const lowerKey = key.toLowerCase();
    const rhythmActions = ['forward', 'backward', 'left', 'right', 'run'];
    for (const track of audioTracks.mouvement) {
        if (!track.movementAction) continue;
        if (rhythmActions.includes(track.movementAction)) continue;
        const keys = MOVEMENT_ACTION_KEYS[track.movementAction];
        if (!keys || !keys.includes(lowerKey)) continue;
        const trackKey = track.id + '_' + track.movementAction;
        if (track.movementPlayMode === 'while-held' || track.movementPlayMode === 'loop-during') {
            if (activeMovementAudio[trackKey]) {
                activeMovementAudio[trackKey].pause();
                activeMovementAudio[trackKey].currentTime = 0;
                delete activeMovementAudio[trackKey];
            }
        }
    }
}

let movementMouseTimer = null;
function checkMovementAudioMouse() {
    if (interactionMode !== 'game') return;
    for (const track of audioTracks.mouvement) {
        if (track.movementAction !== 'camera' || track.muted || !track.dataURL) continue;
        const trackKey = track.id + '_camera';
        if (track.movementPlayMode === 'once-per-action') {
            if (!activeMovementAudio[trackKey] || activeMovementAudio[trackKey].ended) {
                const audio = createAudioElement(track);
                if (audio) { audio.loop = false; audio.play().catch(() => {}); audio.onended = () => { delete activeMovementAudio[trackKey]; }; activeMovementAudio[trackKey] = audio; }
            }
        } else {
            if (!activeMovementAudio[trackKey]) {
                const audio = createAudioElement(track);
                if (audio) { audio.loop = true; audio.play().catch(() => {}); activeMovementAudio[trackKey] = audio; }
            }
        }
    }
    clearTimeout(movementMouseTimer);
    movementMouseTimer = setTimeout(() => {
        for (const track of audioTracks.mouvement) {
            if (track.movementAction !== 'camera') continue;
            const trackKey = track.id + '_camera';
            if (track.movementPlayMode !== 'once-per-action' && activeMovementAudio[trackKey]) {
                activeMovementAudio[trackKey].pause();
                activeMovementAudio[trackKey].currentTime = 0;
                delete activeMovementAudio[trackKey];
            }
        }
    }, 150);
}

function initFootstepAudio() {
    if (typeof FOOTSTEP_WALK_SRC === 'undefined' || typeof FOOTSTEP_RUN_SRC === 'undefined') return;
    _footstepWalkAudio = new Audio(FOOTSTEP_WALK_SRC);
    _footstepWalkAudio.preload = 'auto';
    _footstepWalkAudio.loop = true;
    _footstepWalkAudio.volume = 0.8;
    _footstepWalkAudio.load();
    _footstepRunAudio = new Audio(FOOTSTEP_RUN_SRC);
    _footstepRunAudio.preload = 'auto';
    _footstepRunAudio.loop = true;
    _footstepRunAudio.volume = 0.8;
    _footstepRunAudio.load();
    console.log('👟 Audio de pas: chargement en cours...', FOOTSTEP_WALK_SRC, FOOTSTEP_RUN_SRC);
}

function updateFootstepAudio(delta) {
    if (interactionMode !== 'game') return;
    if (typeof isMoving === 'undefined' || typeof wasMoving === 'undefined') return;
    if (!isMoving && wasMoving) stopAllFootstepAudio();
    wasMoving = isMoving;
    if (!isMoving) return;
    const kbSprint  = typeof keysPressed !== 'undefined' && !!keysPressed['shift'];
    const gpSprint  = typeof GamepadManager !== 'undefined' && GamepadManager.connected && GamepadManager.getActionValue('run') > 0.5;
    const isSprinting = kbSprint || gpSprint;
    if (typeof _footstepWasSprinting !== 'undefined' && isSprinting !== _footstepWasSprinting) {
        _footstepWasSprinting = isSprinting;
        if (isSprinting) {
            if (_footstepWalkAudio) { _footstepWalkAudio.pause(); _footstepWalkAudio.currentTime = 0; }
            if (_footstepRunAudio && _footstepRunAudio.paused) { _footstepRunAudio.currentTime = 0; _footstepRunAudio.play().catch(() => {}); }
        } else {
            if (_footstepRunAudio) { _footstepRunAudio.pause(); _footstepRunAudio.currentTime = 0; }
            if (_footstepWalkAudio && _footstepWalkAudio.paused) { _footstepWalkAudio.currentTime = 0; _footstepWalkAudio.play().catch(() => {}); }
        }
        return;
    }
    const audio = isSprinting ? _footstepRunAudio : _footstepWalkAudio;
    if (audio && audio.paused) { audio.currentTime = 0; audio.play().catch(() => {}); }
}

function stopAllFootstepAudio() {
    if (typeof _footstepWalkAudio !== 'undefined' && _footstepWalkAudio) { _footstepWalkAudio.pause(); _footstepWalkAudio.currentTime = 0; }
    if (typeof _footstepRunAudio !== 'undefined' && _footstepRunAudio) { _footstepRunAudio.pause(); _footstepRunAudio.currentTime = 0; }
    for (const key in activeMovementAudio) {
        if (activeMovementAudio[key]) { activeMovementAudio[key].pause(); activeMovementAudio[key].currentTime = 0; }
    }
    activeMovementAudio = {};
    if (typeof _footstepWasSprinting !== 'undefined') _footstepWasSprinting = false;
}

function playTrackForTrigger(track) {
    if (!track.dataURL || track.muted) return;
    if (track.audioElement && !track.audioElement.paused) return;
    const audio = createAudioElement(track);
    if (audio) { audio.play().catch(() => {}); activeAudioElements.push(audio); }
}

function checkAudioClickTriggers(clickedObjectName) {
    if (interactionMode !== 'game') return;
    for (const cat of AUDIO_CATEGORIES) {
        for (const track of audioTracks[cat]) {
            if (track.triggerAction === 'click' && track.triggerObjectName === clickedObjectName) playTrackForTrigger(track);
        }
    }
}

function checkAudioHoverTriggers(hoveredObjectName) {
    if (interactionMode !== 'game') return;
    if (hoveredObjectName === lastHoveredAudioObject) return;
    lastHoveredAudioObject = hoveredObjectName;
    for (const cat of AUDIO_CATEGORIES) {
        for (const track of audioTracks[cat]) {
            if (track.triggerAction === 'hover' && track.triggerObjectName === hoveredObjectName) playTrackForTrigger(track);
        }
    }
}


