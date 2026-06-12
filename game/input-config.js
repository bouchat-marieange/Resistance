/**
 * INPUT CONFIG — Configuration centralisée des contrôles (clavier + manette)
 *
 * Gère les bindings par défaut, la persistance localStorage,
 * et fournit une API unifiée pour interroger l'état des inputs.
 */

const InputConfig = (function() {
    const STORAGE_KEY_BASE = 'resistance-input-config';
    const CONFIG_VERSION = 6; // Incrementer pour forcer le reset des bindings par defaut

    // Cle de stockage liee au pseudo actif
    function getStorageKey() {
        const pseudo = localStorage.getItem('resistance_active_pseudo');
        return pseudo ? STORAGE_KEY_BASE + '-' + pseudo : STORAGE_KEY_BASE;
    }

    // ═══════════════════════════════════════════
    //  ACTIONS DU JEU (identifiants internes)
    // ═══════════════════════════════════════════
    const ACTIONS = {
        forward:  { label: 'Avancer',          category: 'Déplacements' },
        backward: { label: 'Reculer',          category: 'Déplacements' },
        left:     { label: 'Gauche',           category: 'Déplacements' },
        right:    { label: 'Droite',           category: 'Déplacements' },
        crouch:   { label: 'S\'accroupir',     category: 'Déplacements' },
        run:      { label: 'Courir',           category: 'Déplacements' },
        aim:      { label: 'Viser',            category: 'Actions' },
        grab:     { label: 'Interagir',        category: 'Actions' },
        door:     { label: 'Ouvrir/Fermer',    category: 'Actions' },
        map:      { label: 'Carte',            category: 'Interface' },
        hints:    { label: 'Indices',          category: 'Interface' },
        inventory:{ label: 'Inventaire',       category: 'Interface' },
        pause:    { label: 'Pause',            category: 'Interface' }
    };

    // ═══════════════════════════════════════════
    //  BINDINGS PAR DÉFAUT — CLAVIER
    // ═══════════════════════════════════════════
    const DEFAULT_KEYBOARD = {
        forward:   ['z'],
        backward:  ['s'],
        left:      ['q', 'a'],
        right:     ['d', 'e'],
        crouch:    ['control'],
        run:       ['shift'],
        aim:       ['v'],
        grab:      [],
        door:      ['f'],
        map:       ['m'],
        hints:     ['?'],
        inventory: ['i'],
        pause:     [' ']
    };

    // ═══════════════════════════════════════════
    //  BINDINGS PAR DÉFAUT — MANETTE PS4
    // ═══════════════════════════════════════════
    //  Standard Gamepad Mapping (navigator.getGamepads)
    //  PS4 DualShock 4 / DualSense :
    //    Buttons: 0=Cross, 1=Circle, 2=Square, 3=Triangle,
    //             4=L1, 5=R1, 6=L2, 7=R2,
    //             8=Share, 9=Options, 10=L3, 11=R3,
    //             12=Up, 13=Down, 14=Left, 15=Right, 16=PS
    //    Axes: 0=LeftStickX, 1=LeftStickY, 2=RightStickX, 3=RightStickY
    const DEFAULT_GAMEPAD = {
        forward:   { type: 'axis', index: 1, direction: -1 },  // Left Stick Up
        backward:  { type: 'axis', index: 1, direction: 1 },   // Left Stick Down
        left:      { type: 'axis', index: 0, direction: -1 },  // Left Stick Left
        right:     { type: 'axis', index: 0, direction: 1 },   // Left Stick Right
        crouch:    { type: 'button', index: 1 },               // Rond (O)
        run:       { type: 'button', index: 4 },               // L1
        aim:       { type: 'button', index: 6 },               // L2
        grab:      { type: 'button', index: 7 },               // R2
        door:      { type: 'button', index: 5 },               // R1
        map:       { type: 'button', index: 11 },              // R3 (clic stick droit) → toggle carte
        notebook:  { type: 'button', index: 17 },              // Touchpad → toggle carnet
        hints:     { type: 'button', index: 10 },              // L3 (clic stick gauche)
        inventory: { type: 'button', index: 9 },               // Options
        pause:     { type: 'button', index: 8 }                // Share
    };

    // Labels pour l'affichage dans l'UI
    const GAMEPAD_BUTTON_LABELS = {
        0: 'Croix (X)', 1: 'Rond (O)', 2: 'Carré', 3: 'Triangle',
        4: 'L1', 5: 'R1', 6: 'L2', 7: 'R2',
        8: 'Share', 9: 'Options', 10: 'L3', 11: 'R3',
        12: 'Haut', 13: 'Bas', 14: 'Gauche', 15: 'Droite', 16: 'PS',
        17: 'Touchpad'
    };

    const GAMEPAD_AXIS_LABELS = {
        '0:-1': 'Stick G ←', '0:1': 'Stick G →',
        '1:-1': 'Stick G ↑', '1:1': 'Stick G ↓',
        '2:-1': 'Stick D ←', '2:1': 'Stick D →',
        '3:-1': 'Stick D ↑', '3:1': 'Stick D ↓'
    };

    // ═══════════════════════════════════════════
    //  ÉTAT COURANT
    // ═══════════════════════════════════════════
    let config = {
        _version: CONFIG_VERSION,
        preferredDevice: 'keyboard',  // 'keyboard' ou 'gamepad'
        keyboard: JSON.parse(JSON.stringify(DEFAULT_KEYBOARD)),
        gamepad:  JSON.parse(JSON.stringify(DEFAULT_GAMEPAD)),
        gamepadDeadzone: 0.15,
        gamepadCameraSensitivity: 2.5
    };

    // ═══════════════════════════════════════════
    //  PERSISTENCE
    // ═══════════════════════════════════════════
    function save() {
        try {
            localStorage.setItem(getStorageKey(), JSON.stringify(config));
        } catch (e) {
            console.warn('InputConfig: impossible de sauvegarder', e);
        }
    }

    function load() {
        try {
            const raw = localStorage.getItem(getStorageKey());
            if (raw) {
                const saved = JSON.parse(raw);
                // Si la version a change, on reset les bindings aux nouveaux defaults
                if (saved._version !== CONFIG_VERSION) {
                    config._version = CONFIG_VERSION;
                    config.preferredDevice = saved.preferredDevice || 'keyboard';
                    config.gamepadDeadzone = saved.gamepadDeadzone ?? 0.15;
                    config.gamepadCameraSensitivity = saved.gamepadCameraSensitivity ?? 2.5;
                    // On garde les defaults frais, pas les anciens bindings
                    save();
                    return;
                }
                // Merge avec les defaults pour couvrir les nouvelles actions
                config.preferredDevice = saved.preferredDevice || 'keyboard';
                config.gamepadDeadzone = saved.gamepadDeadzone ?? 0.15;
                config.gamepadCameraSensitivity = saved.gamepadCameraSensitivity ?? 2.5;

                if (saved.keyboard) {
                    for (const action in DEFAULT_KEYBOARD) {
                        config.keyboard[action] = saved.keyboard[action] || DEFAULT_KEYBOARD[action];
                    }
                }
                if (saved.gamepad) {
                    for (const action in DEFAULT_GAMEPAD) {
                        config.gamepad[action] = saved.gamepad[action] || DEFAULT_GAMEPAD[action];
                    }
                }
                config._version = CONFIG_VERSION;
            }
        } catch (e) {
            console.warn('InputConfig: impossible de charger la config', e);
        }
    }

    // ═══════════════════════════════════════════
    //  API PUBLIQUE — CLAVIER
    // ═══════════════════════════════════════════

    /**
     * Vérifie si une action est active selon les touches pressées
     * @param {string} action - ex: 'forward', 'jump'
     * @param {Object} keysPressed - état des touches { 'z': true, ... }
     */
    function isActionPressed(action, keysPressed) {
        const keys = config.keyboard[action];
        if (!keys) return false;
        return keys.some(k => keysPressed[k.toLowerCase()]);
    }

    /**
     * Retourne le MOVEMENT_ACTION_KEYS compatible avec l'ancien système
     */
    function getMovementActionKeys() {
        return JSON.parse(JSON.stringify(config.keyboard));
    }

    /**
     * Met à jour le binding clavier d'une action
     * @param {string} action - nom de l'action
     * @param {string[]} keys - tableau de touches (ex: ['z', 'w'])
     */
    function setKeyboardBinding(action, keys) {
        if (!ACTIONS[action]) return;
        config.keyboard[action] = keys.map(k => k.toLowerCase());
        save();
    }

    // ═══════════════════════════════════════════
    //  API PUBLIQUE — MANETTE
    // ═══════════════════════════════════════════

    function setGamepadBinding(action, binding) {
        if (!ACTIONS[action]) return;
        config.gamepad[action] = binding;
        save();
    }

    function getGamepadBinding(action) {
        return config.gamepad[action] || null;
    }

    function getGamepadBindingLabel(action) {
        const b = config.gamepad[action];
        if (!b) return '—';
        if (b.type === 'button') return GAMEPAD_BUTTON_LABELS[b.index] || ('Bouton ' + b.index);
        if (b.type === 'axis') return GAMEPAD_AXIS_LABELS[b.index + ':' + b.direction] || ('Axe ' + b.index);
        return '—';
    }

    // ═══════════════════════════════════════════
    //  VALIDATION — CONFLITS
    // ═══════════════════════════════════════════

    /**
     * Vérifie les conflits de touches clavier
     * @returns {Array} Liste de conflits [{key, actions: [a1, a2]}]
     */
    function getKeyboardConflicts() {
        const keyMap = {};
        for (const action in config.keyboard) {
            for (const key of config.keyboard[action]) {
                const k = key.toLowerCase();
                if (!keyMap[k]) keyMap[k] = [];
                keyMap[k].push(action);
            }
        }
        const conflicts = [];
        for (const k in keyMap) {
            if (keyMap[k].length > 1) {
                conflicts.push({ key: k, actions: keyMap[k] });
            }
        }
        return conflicts;
    }

    /**
     * Vérifie les conflits de boutons manette
     */
    function getGamepadConflicts() {
        const map = {};
        for (const action in config.gamepad) {
            const b = config.gamepad[action];
            const id = b.type + ':' + b.index + ':' + (b.direction || 0);
            if (!map[id]) map[id] = [];
            map[id].push(action);
        }
        const conflicts = [];
        for (const id in map) {
            if (map[id].length > 1) {
                conflicts.push({ binding: id, actions: map[id] });
            }
        }
        return conflicts;
    }

    // ═══════════════════════════════════════════
    //  RESET
    // ═══════════════════════════════════════════

    function resetKeyboard() {
        config.keyboard = JSON.parse(JSON.stringify(DEFAULT_KEYBOARD));
        save();
    }

    function resetGamepad() {
        config.gamepad = JSON.parse(JSON.stringify(DEFAULT_GAMEPAD));
        save();
    }

    function resetAll() {
        config = {
            preferredDevice: 'keyboard',
            keyboard: JSON.parse(JSON.stringify(DEFAULT_KEYBOARD)),
            gamepad:  JSON.parse(JSON.stringify(DEFAULT_GAMEPAD)),
            gamepadDeadzone: 0.15,
            gamepadCameraSensitivity: 2.5
        };
        save();
    }

    // ═══════════════════════════════════════════
    //  MESSAGES JOUEUR
    // ═══════════════════════════════════════════

    /**
     * Sauvegarde avec message de confirmation contextuel
     * @returns {string} Message a afficher au joueur
     */
    function saveWithFeedback() {
        save();
        const pseudo = localStorage.getItem('resistance_active_pseudo');
        if (!pseudo) return 'Preferences sauvegardees.';
        // Verifier si c'etait deja un joueur existant
        const existingKey = STORAGE_KEY_BASE + '-' + pseudo;
        return 'Preferences sauvegardees, ' + pseudo + '. Elles seront automatiquement restaurees lors de ta prochaine visite dans la Resistance.';
    }

    /**
     * Message de bienvenue selon que le joueur est nouveau ou revient
     * @returns {string|null} Message ou null si pas de pseudo
     */
    function getWelcomeMessage() {
        const pseudo = localStorage.getItem('resistance_active_pseudo');
        if (!pseudo) return null;
        const key = STORAGE_KEY_BASE + '-' + pseudo;
        const hasExisting = localStorage.getItem(key);
        if (hasExisting) {
            return 'Bon retour dans la Resistance, ' + pseudo + ' ! Tes preferences et reglages ont ete restaures.';
        } else {
            return 'Bienvenue dans la Resistance, ' + pseudo + ' ! Configure tes controles comme tu le souhaites.';
        }
    }

    /**
     * Verifie si le joueur actuel a des preferences sauvegardees
     */
    function hasExistingConfig() {
        const pseudo = localStorage.getItem('resistance_active_pseudo');
        if (!pseudo) return false;
        return !!localStorage.getItem(STORAGE_KEY_BASE + '-' + pseudo);
    }

    // Init
    load();

    return {
        ACTIONS,
        GAMEPAD_BUTTON_LABELS,
        GAMEPAD_AXIS_LABELS,
        get preferredDevice() { return config.preferredDevice; },
        set preferredDevice(v) { config.preferredDevice = v; save(); },
        get gamepadDeadzone() { return config.gamepadDeadzone; },
        set gamepadDeadzone(v) { config.gamepadDeadzone = v; save(); },
        get gamepadCameraSensitivity() { return config.gamepadCameraSensitivity; },
        set gamepadCameraSensitivity(v) { config.gamepadCameraSensitivity = v; save(); },
        isActionPressed,
        getMovementActionKeys,
        setKeyboardBinding,
        getKeyboardBindings: () => JSON.parse(JSON.stringify(config.keyboard)),
        setGamepadBinding,
        getGamepadBinding,
        getGamepadBindingLabel,
        getKeyboardConflicts,
        getGamepadConflicts,
        resetKeyboard,
        resetGamepad,
        resetAll,
        save,
        load,
        saveWithFeedback,
        getWelcomeMessage,
        hasExistingConfig
    };
})();
