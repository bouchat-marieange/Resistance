// ==================== SYSTÈME AUDIO ====================

function toggleAudioSection(category) {
    const body = document.getElementById('audio-body-' + category);
    const chevron = document.getElementById('audio-chevron-' + category);
    if (!body) return;
    const isVisible = body.style.display !== 'none';
    body.style.display = isVisible ? 'none' : 'block';
    if (chevron) chevron.style.transform = isVisible ? 'rotate(-90deg)' : '';
}

// --- Audio Import ---
function handleAudioImport(category, fileInput) {
    const file = fileInput.files[0];
    if (!file) return;
    fileInput.value = '';

    if (!file.name.match(/\.(mp3|wav)$/i)) {
        alert('Format non supporté. Utilisez MP3 ou WAV.');
        return;
    }

    if (file.size > 15 * 1024 * 1024) {
        if (!confirm('Ce fichier fait ' + (file.size / (1024*1024)).toFixed(1) + ' Mo. Les fichiers volumineux peuvent ralentir la sauvegarde. Continuer ?')) return;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        const dataURL = e.target.result;
        const id = ++audioTrackIdCounter;
        const name = file.name.replace(/\.(mp3|wav)$/i, '');

        const track = {
            id: id,
            name: name,
            category: category,
            blobId: null,
            dataURL: dataURL,
            volume: 80,
            muted: false,
            loop: category === 'musique' || category === 'ambiance',
            triggerAction: category === 'musique' || category === 'ambiance' ? 'load' : 'none',
            triggerObjectName: '',
            audioElement: null,
            movementAction: '',
            movementPlayMode: ''
        };

        audioTracks[category].push(track);
        updateAudioTracksList(category);
        markUnsavedChanges();
        console.log('🎵 Audio importé: "' + name + '" dans ' + category);
    };
    reader.readAsDataURL(file);
}

// --- Audio Track List UI ---
function updateAudioTracksList(category) {
    const container = document.getElementById('audio-list-' + category);
    if (!container) return;
    container.innerHTML = '';

    if (audioTracks[category].length === 0) {
        container.innerHTML = '<div style="color:#555; font-size:8px; padding:4px;">Aucun son.</div>';
        return;
    }

    audioTracks[category].forEach(track => {
        container.appendChild(createAudioTrackItem(track));
    });
}

function createAudioTrackItem(track) {
    const item = document.createElement('div');
    item.className = 'audio-track-item';
    item.dataset.trackId = track.id;

    // Editable name
    const nameSpan = document.createElement('span');
    nameSpan.className = 'audio-track-name';
    nameSpan.textContent = track.name;
    nameSpan.title = 'Cliquer pour renommer';
    nameSpan.onclick = function(e) {
        e.stopPropagation();
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'audio-track-name-input';
        input.value = track.name;
        nameSpan.replaceWith(input);
        input.focus();
        input.select();
        const finish = () => {
            const newName = input.value.trim() || track.name;
            track.name = newName;
            const newSpan = document.createElement('span');
            newSpan.className = 'audio-track-name';
            newSpan.textContent = newName;
            newSpan.title = 'Cliquer pour renommer';
            newSpan.onclick = nameSpan.onclick;
            input.replaceWith(newSpan);
            markUnsavedChanges();
        };
        input.onblur = finish;
        input.onkeydown = (ev) => { if (ev.key === 'Enter') input.blur(); if (ev.key === 'Escape') { input.value = track.name; input.blur(); } };
    };
    item.appendChild(nameSpan);

    // LINE 2: Controls row
    const controlsRow = document.createElement('div');
    controlsRow.className = 'audio-track-controls';

    // Volume control
    const volCtrl = document.createElement('div');
    volCtrl.className = 'audio-volume-control';
    const volInput = document.createElement('input');
    volInput.type = 'number';
    volInput.min = 0; volInput.max = 100; volInput.step = 5;
    volInput.value = track.volume;
    volInput.title = 'Volume (0-100)';
    volInput.onchange = () => {
        track.volume = Math.max(0, Math.min(100, parseInt(volInput.value) || 0));
        volInput.value = track.volume;
        if (track.audioElement) track.audioElement.volume = track.volume / 100;
        markUnsavedChanges();
    };
    const volIcon = document.createElement('span');
    volIcon.className = 'audio-volume-icon-svg';
    volIcon.title = 'Volume';
    volIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/></svg>';
    volCtrl.appendChild(volIcon);
    volCtrl.appendChild(volInput);
    controlsRow.appendChild(volCtrl);

    // Mute toggle button
    const muteBtn = document.createElement('button');
    muteBtn.className = 'audio-icon-btn';
    muteBtn.title = track.muted ? 'Activer le son' : 'Couper le son';
    muteBtn.innerHTML = '<img src="icones/' + (track.muted ? 'ear-off' : 'ear') + '.svg" width="13" height="13" style="filter: brightness(0) invert(0.7); pointer-events:none;">';
    muteBtn.onclick = (e) => {
        e.stopPropagation();
        track.muted = !track.muted;
        muteBtn.title = track.muted ? 'Activer le son' : 'Couper le son';
        muteBtn.innerHTML = '<img src="icones/' + (track.muted ? 'ear-off' : 'ear') + '.svg" width="13" height="13" style="filter: brightness(0) invert(0.7); pointer-events:none;">';
        if (track.audioElement) track.audioElement.muted = track.muted;
        markUnsavedChanges();
    };
    controlsRow.appendChild(muteBtn);

    // Loop toggle button
    const loopBtn = document.createElement('button');
    loopBtn.className = 'audio-icon-btn';
    loopBtn.title = track.loop ? 'Lecture en boucle' : 'Lecture unique';
    loopBtn.innerHTML = '<img src="icones/' + (track.loop ? 'repeat-2' : 'arrow-right-to-line') + '.svg" width="13" height="13" style="filter: brightness(0) invert(0.7); pointer-events:none;">';
    loopBtn.onclick = (e) => {
        e.stopPropagation();
        track.loop = !track.loop;
        loopBtn.title = track.loop ? 'Lecture en boucle' : 'Lecture unique';
        loopBtn.innerHTML = '<img src="icones/' + (track.loop ? 'repeat-2' : 'arrow-right-to-line') + '.svg" width="13" height="13" style="filter: brightness(0) invert(0.7); pointer-events:none;">';
        if (track.audioElement) track.audioElement.loop = track.loop;
        markUnsavedChanges();
    };
    controlsRow.appendChild(loopBtn);

    // Trigger settings button
    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'audio-icon-btn';
    settingsBtn.title = 'Réglages du déclencheur';
    settingsBtn.innerHTML = '<img src="icones/settings.svg" width="13" height="13" style="filter: brightness(0) invert(0.7); pointer-events:none;">';
    settingsBtn.onclick = (e) => { e.stopPropagation(); openTriggerModal(track); };
    controlsRow.appendChild(settingsBtn);

    // Delete button
    const delBtn = document.createElement('button');
    delBtn.className = 'audio-icon-btn';
    delBtn.title = 'Supprimer';
    delBtn.innerHTML = '<img src="icones/trash-2.svg" width="13" height="13" style="filter: brightness(0) invert(0.7); pointer-events:none;">';
    delBtn.onclick = (e) => { e.stopPropagation(); deleteAudioTrack(track); };
    controlsRow.appendChild(delBtn);

    item.appendChild(controlsRow);
    return item;
}

// --- Audio Track Controls ---
function deleteAudioTrack(track) {
    if (!confirm('Supprimer "' + track.name + '" ?')) return;

    // Stop if playing
    if (track.audioElement) {
        track.audioElement.pause();
        track.audioElement = null;
    }

    // Remove from array
    const arr = audioTracks[track.category];
    const idx = arr.indexOf(track);
    if (idx > -1) arr.splice(idx, 1);

    // Delete blob from IndexedDB if it exists
    if (track.blobId) {
        RoomEditorDB.delete(RoomEditorDB.STORE_BLOBS, track.blobId).catch(() => {});
    }

    updateAudioTracksList(track.category);
    markUnsavedChanges();
    console.log('🗑️ Audio supprimé: "' + track.name + '"');
}

function saveAudioSection(category) {
    markUnsavedChanges();
    console.log('💾 Section audio "' + category + '" marquée pour sauvegarde (' + audioTracks[category].length + ' pistes)');
}

// --- Trigger Modal ---
function openTriggerModal(track) {
    currentEditingAudioTrack = track;

    const isMouvement = (track.category === 'mouvement');
    const standardFields = document.getElementById('trigger-standard-fields');
    const mouvementFields = document.getElementById('trigger-mouvement-fields');

    // Afficher/masquer les champs appropriés
    standardFields.style.display = isMouvement ? 'none' : 'block';
    mouvementFields.style.display = isMouvement ? 'block' : 'none';

    if (isMouvement) {
        // Remplir les champs mouvement
        document.getElementById('audio-movement-action').value = track.movementAction || '';
        document.getElementById('audio-movement-playmode').value = track.movementPlayMode || 'while-held';
    } else {
        // Remplir les champs standard
        const actionSelect = document.getElementById('audio-trigger-action');
        actionSelect.value = track.triggerAction || 'none';

        // Populate object dropdown from importedObjects
        const objSelect = document.getElementById('audio-trigger-object');
        objSelect.innerHTML = '<option value="">(Global - aucun objet)</option>';
        importedObjects.forEach(obj => {
            const name = obj.userData.editorName || obj.name || 'Objet';
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            if (track.triggerObjectName === name) opt.selected = true;
            objSelect.appendChild(opt);
        });
    }

    document.getElementById('audio-trigger-modal').style.display = 'block';
}

function saveTriggerSettings() {
    if (!currentEditingAudioTrack) return;

    if (currentEditingAudioTrack.category === 'mouvement') {
        currentEditingAudioTrack.movementAction = document.getElementById('audio-movement-action').value;
        currentEditingAudioTrack.movementPlayMode = document.getElementById('audio-movement-playmode').value;
        currentEditingAudioTrack.triggerAction = 'movement'; // Marqueur interne
        console.log('💾 Son mouvement configuré: ' + currentEditingAudioTrack.movementAction + ' → ' + currentEditingAudioTrack.movementPlayMode);
    } else {
        currentEditingAudioTrack.triggerAction = document.getElementById('audio-trigger-action').value;
        currentEditingAudioTrack.triggerObjectName = document.getElementById('audio-trigger-object').value;
        console.log('💾 Déclencheur audio configuré: ' + currentEditingAudioTrack.triggerAction + ' → ' + (currentEditingAudioTrack.triggerObjectName || 'global'));
    }

    closeTriggerModal();
    updateAudioTracksList(currentEditingAudioTrack.category);
    markUnsavedChanges();
}

function closeTriggerModal() {
    document.getElementById('audio-trigger-modal').style.display = 'none';
    currentEditingAudioTrack = null;
}

// --- Audio Serialization ---
async function serializeAudioTracks(storeBlobFn) {
    const allTracks = [];
    for (const category of AUDIO_CATEGORIES) {
        for (const track of audioTracks[category]) {
            let blobId = track.blobId;
            // Store the audio data as blob if not already stored
            if (!blobId && track.dataURL) {
                blobId = await storeBlobFn(track.dataURL);
                track.blobId = blobId;
            }
            allTracks.push({
                id: track.id,
                name: track.name,
                category: track.category,
                blobId: blobId,
                volume: track.volume,
                muted: track.muted,
                loop: track.loop,
                triggerAction: track.triggerAction,
                triggerObjectName: track.triggerObjectName,
                movementAction: track.movementAction || '',
                movementPlayMode: track.movementPlayMode || ''
            });
        }
    }
    return allTracks;
}

async function restoreAudioTracks(tracksData) {
    // Clear existing
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

        const track = {
            id: td.id,
            name: td.name,
            category: cat,
            blobId: td.blobId,
            dataURL: dataURL,
            volume: td.volume !== undefined ? td.volume : 80,
            muted: td.muted || false,
            loop: td.loop !== undefined ? td.loop : true,
            triggerAction: td.triggerAction || 'none',
            triggerObjectName: td.triggerObjectName || '',
            audioElement: null,
            movementAction: td.movementAction || '',
            movementPlayMode: td.movementPlayMode || ''
        };

        audioTracks[cat].push(track);
    }

    // Update UI
    for (const cat of AUDIO_CATEGORIES) {
        updateAudioTracksList(cat);
    }
}

// --- Game Mode Audio Playback ---
function createAudioElement(track) {
    if (!track.dataURL) return null;
    const audio = new Audio(track.dataURL);
    const masterVol = getMasterVolume(track.category);
    audio.volume = track.muted ? 0 : (track.volume / 100) * masterVol;
    audio.loop = track.loop;
    audio.muted = track.muted;
    // Stocker les infos de catégorie et volume pour le contrôle maître
    audio._trackCategory = track.category;
    audio._trackVolume = track.volume;
    track.audioElement = audio;
    return audio;
}

function startGameAudio() {
    // Play all tracks with triggerAction === 'load'
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

// Mise en sourdine temporaire (cinématique vidéo)
let _savedAudioVolumes = []; // Sauvegarder les volumes pour les restaurer
function _muteGameAudio() {
    _savedAudioVolumes = [];
    // Mettre en sourdine tous les éléments audio actifs
    activeAudioElements.forEach(audio => {
        _savedAudioVolumes.push({ element: audio, volume: audio.volume });
        audio.volume = 0;
    });
    // Aussi les audio des tracks
    for (const cat of AUDIO_CATEGORIES) {
        for (const track of audioTracks[cat]) {
            if (track.audioElement && !track.audioElement.paused) {
                _savedAudioVolumes.push({ element: track.audioElement, volume: track.audioElement.volume });
                track.audioElement.volume = 0;
            }
        }
    }
    // Et les audio de mouvement
    for (const key in activeMovementAudio) {
        if (activeMovementAudio[key]) {
            _savedAudioVolumes.push({ element: activeMovementAudio[key], volume: activeMovementAudio[key].volume });
            activeMovementAudio[key].volume = 0;
        }
    }
    console.log('🔇 Audio de jeu mis en sourdine pour cinématique (' + _savedAudioVolumes.length + ' pistes)');
}

function _unmuteGameAudio() {
    // Restaurer les volumes sauvegardés
    _savedAudioVolumes.forEach(entry => {
        if (entry.element) {
            entry.element.volume = entry.volume;
        }
    });
    console.log('🔊 Audio de jeu restauré (' + _savedAudioVolumes.length + ' pistes)');
    _savedAudioVolumes = [];
}

function stopAllGameAudio() {
    activeAudioElements.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
    });
    activeAudioElements = [];

    // Also stop any track audio elements
    for (const cat of AUDIO_CATEGORIES) {
        for (const track of audioTracks[cat]) {
            if (track.audioElement) {
                track.audioElement.pause();
                track.audioElement.currentTime = 0;
                track.audioElement = null;
            }
        }
    }

    // Stop movement audio
    for (const key in activeMovementAudio) {
        if (activeMovementAudio[key]) {
            activeMovementAudio[key].pause();
            activeMovementAudio[key].currentTime = 0;
        }
    }
    activeMovementAudio = {};

    console.log('🔇 Audio de jeu arrêté');
}

// --- Movement Audio System ---
function checkMovementAudioKeyDown(key) {
    if (interactionMode !== 'game') return;
    const lowerKey = key.toLowerCase();

    // Actions de déplacement gérées par le système rythmique (updateFootstepAudio)
    const rhythmActions = ['forward', 'backward', 'left', 'right', 'run'];

    for (const track of audioTracks.mouvement) {
        if (!track.movementAction || track.muted || !track.dataURL) continue;
        // Skip les actions de déplacement — gérées par le système de pas rythmique
        if (rhythmActions.includes(track.movementAction)) continue;
        const keys = MOVEMENT_ACTION_KEYS[track.movementAction];
        if (!keys || !keys.includes(lowerKey)) continue;

        const trackKey = track.id + '_' + track.movementAction;

        if (track.movementPlayMode === 'while-held') {
            if (!activeMovementAudio[trackKey]) {
                const audio = createAudioElement(track);
                if (audio) {
                    audio.loop = true;
                    audio.play().catch(() => {});
                    activeMovementAudio[trackKey] = audio;
                }
            }
        } else if (track.movementPlayMode === 'once-per-action') {
            if (!activeMovementAudio[trackKey] || activeMovementAudio[trackKey].ended) {
                const audio = createAudioElement(track);
                if (audio) {
                    audio.loop = false;
                    audio.play().catch(() => {});
                    audio.onended = () => { delete activeMovementAudio[trackKey]; };
                    activeMovementAudio[trackKey] = audio;
                }
            }
        } else if (track.movementPlayMode === 'loop-during') {
            if (!activeMovementAudio[trackKey]) {
                const audio = createAudioElement(track);
                if (audio) {
                    audio.loop = true;
                    audio.play().catch(() => {});
                    activeMovementAudio[trackKey] = audio;
                }
            }
        }
    }
}

function checkMovementAudioKeyUp(key) {
    if (interactionMode !== 'game') return;
    const lowerKey = key.toLowerCase();

    // Actions de déplacement gérées par le système rythmique
    const rhythmActions = ['forward', 'backward', 'left', 'right', 'run'];

    for (const track of audioTracks.mouvement) {
        if (!track.movementAction) continue;
        // Skip les actions de déplacement
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

// Gestion du mouvement caméra (souris) pour les sons mouvement
let movementMouseTimer = null;
function checkMovementAudioMouse() {
    if (interactionMode !== 'game') return;

    for (const track of audioTracks.mouvement) {
        if (track.movementAction !== 'camera' || track.muted || !track.dataURL) continue;
        const trackKey = track.id + '_camera';

        if (track.movementPlayMode === 'once-per-action') {
            if (!activeMovementAudio[trackKey] || activeMovementAudio[trackKey].ended) {
                const audio = createAudioElement(track);
                if (audio) {
                    audio.loop = false;
                    audio.play().catch(() => {});
                    audio.onended = () => { delete activeMovementAudio[trackKey]; };
                    activeMovementAudio[trackKey] = audio;
                }
            }
        } else {
            // while-held ou loop-during : jouer tant que la souris bouge, arrêter après 150ms sans mouvement
            if (!activeMovementAudio[trackKey]) {
                const audio = createAudioElement(track);
                if (audio) {
                    audio.loop = true;
                    audio.play().catch(() => {});
                    activeMovementAudio[trackKey] = audio;
                }
            }
        }
    }

    // Arrêter les sons caméra après 150ms sans mouvement souris
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

// --- Système audio de pas — boucle continue pendant le déplacement ---
// Un SEUL son à la fois : marche OU course, jamais les deux

// Pré-charger les deux sons de pas au démarrage
function initFootstepAudio() {
    _footstepWalkAudio = new Audio(FOOTSTEP_WALK_SRC);
    _footstepWalkAudio.preload = 'auto';
    _footstepWalkAudio.loop = true;   // Boucle continue
    _footstepWalkAudio.volume = 0.8;
    _footstepWalkAudio.addEventListener('canplaythrough', () => {
        console.log('👟 Audio marche prêt (canplaythrough)');
    });
    _footstepWalkAudio.addEventListener('error', (e) => {
        console.error('❌ Erreur chargement audio marche:', e.target.error, 'src:', FOOTSTEP_WALK_SRC);
    });
    _footstepWalkAudio.load();

    _footstepRunAudio = new Audio(FOOTSTEP_RUN_SRC);
    _footstepRunAudio.preload = 'auto';
    _footstepRunAudio.loop = true;    // Boucle continue
    _footstepRunAudio.volume = 0.8;
    _footstepRunAudio.addEventListener('canplaythrough', () => {
        console.log('👟 Audio course prêt (canplaythrough)');
    });
    _footstepRunAudio.addEventListener('error', (e) => {
        console.error('❌ Erreur chargement audio course:', e.target.error, 'src:', FOOTSTEP_RUN_SRC);
    });
    _footstepRunAudio.load();

    console.log('👟 Audio de pas: chargement en cours...', FOOTSTEP_WALK_SRC, FOOTSTEP_RUN_SRC);
}

function updateFootstepAudio(delta) {
    if (interactionMode !== 'game') return;

    // Transition mouvement → arrêt : stopper les sons
    if (!isMoving && wasMoving) {
        stopAllFootstepAudio();
    }
    wasMoving = isMoving;

    if (!isMoving) return;

    // Détecter l'allure actuelle
    const isSprinting = !!keysPressed['shift'];

    // Transition marche ↔ course : basculer le son
    if (isSprinting !== _footstepWasSprinting) {
        _footstepWasSprinting = isSprinting;
        if (isSprinting) {
            // Passer en course → stopper marche, lancer course
            if (_footstepWalkAudio) { _footstepWalkAudio.pause(); _footstepWalkAudio.currentTime = 0; }
            if (_footstepRunAudio && _footstepRunAudio.paused) {
                _footstepRunAudio.currentTime = 0;
                _footstepRunAudio.play().catch(e => console.warn('👟 Run play():', e.message));
            }
        } else {
            // Passer en marche → stopper course, lancer marche
            if (_footstepRunAudio) { _footstepRunAudio.pause(); _footstepRunAudio.currentTime = 0; }
            if (_footstepWalkAudio && _footstepWalkAudio.paused) {
                _footstepWalkAudio.currentTime = 0;
                _footstepWalkAudio.play().catch(e => console.warn('👟 Walk play():', e.message));
            }
        }
        return;
    }

    // Si en mouvement et le bon son n'est pas en lecture → le lancer
    const audio = isSprinting ? _footstepRunAudio : _footstepWalkAudio;
    if (audio && audio.paused) {
        audio.currentTime = 0;
        audio.play().catch(e => console.warn('👟 Footstep play():', e.message));
    }
}

function stopAllFootstepAudio() {
    // Stopper les deux sons de pas
    if (_footstepWalkAudio) { _footstepWalkAudio.pause(); _footstepWalkAudio.currentTime = 0; }
    if (_footstepRunAudio) { _footstepRunAudio.pause(); _footstepRunAudio.currentTime = 0; }
    // Stopper les autres audio de mouvement (jump, grab, etc.)
    for (const key in activeMovementAudio) {
        if (activeMovementAudio[key]) {
            activeMovementAudio[key].pause();
            activeMovementAudio[key].currentTime = 0;
        }
    }
    activeMovementAudio = {};
    _footstepWasSprinting = false;
}

function playTrackForTrigger(track) {
    if (!track.dataURL || track.muted) return;
    // Don't restart if already playing
    if (track.audioElement && !track.audioElement.paused) return;
    const audio = createAudioElement(track);
    if (audio) {
        audio.play().catch(() => {});
        activeAudioElements.push(audio);
    }
}

function checkAudioClickTriggers(clickedObjectName) {
    if (interactionMode !== 'game') return;
    for (const cat of AUDIO_CATEGORIES) {
        for (const track of audioTracks[cat]) {
            if (track.triggerAction === 'click' && track.triggerObjectName === clickedObjectName) {
                playTrackForTrigger(track);
            }
        }
    }
}

function checkAudioHoverTriggers(hoveredObjectName) {
    if (interactionMode !== 'game') return;
    if (hoveredObjectName === lastHoveredAudioObject) return;
    lastHoveredAudioObject = hoveredObjectName;

    for (const cat of AUDIO_CATEGORIES) {
        for (const track of audioTracks[cat]) {
            if (track.triggerAction === 'hover' && track.triggerObjectName === hoveredObjectName) {
                playTrackForTrigger(track);
            }
        }
    }
}

