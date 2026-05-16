/**
 * GAMEPAD MANAGER — Support manette de jeu via Gamepad API
 *
 * Gère la connexion/déconnexion, le polling des inputs,
 * et traduit les boutons/axes en actions de jeu.
 * Compatible PS4 (DualShock 4), PS5 (DualSense), Xbox, et manettes génériques.
 */

const GamepadManager = (function() {

    let connected = false;
    let gamepadIndex = null;
    let prevButtonStates = {};  // Pour détecter les fronts montants (press)

    // ═══════════════════════════════════════════
    //  CONNEXION / DÉCONNEXION
    // ═══════════════════════════════════════════

    window.addEventListener('gamepadconnected', (e) => {
        console.log('🎮 Manette connectée:', e.gamepad.id);
        gamepadIndex = e.gamepad.index;
        connected = true;
        prevButtonStates = {};
        // Notification visuelle
        showGamepadNotification('🎮 Manette connectée');
    });

    window.addEventListener('gamepaddisconnected', (e) => {
        console.log('🎮 Manette déconnectée:', e.gamepad.id);
        if (e.gamepad.index === gamepadIndex) {
            connected = false;
            gamepadIndex = null;
            prevButtonStates = {};
            showGamepadNotification('🎮 Manette déconnectée');
        }
    });

    function showGamepadNotification(text) {
        let el = document.getElementById('gamepad-notification');
        if (!el) {
            el = document.createElement('div');
            el.id = 'gamepad-notification';
            el.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);' +
                'background:rgba(0,0,0,0.85);color:#39ff14;padding:12px 24px;border-radius:8px;' +
                'font-family:monospace;font-size:14px;z-index:99999;border:1px solid #39ff14;' +
                'transition:opacity 0.5s;pointer-events:none;';
            document.body.appendChild(el);
        }
        el.textContent = text;
        el.style.opacity = '1';
        setTimeout(() => { el.style.opacity = '0'; }, 2500);
    }

    // ═══════════════════════════════════════════
    //  POLLING (appelé chaque frame dans animate)
    // ═══════════════════════════════════════════

    function getGamepad() {
        if (!connected || gamepadIndex === null) return null;
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        return gamepads[gamepadIndex] || null;
    }

    /**
     * Vérifie si une action est active sur la manette
     * @param {string} action - nom de l'action (ex: 'jump')
     * @returns {number} 0 = inactif, 0-1 = intensité (analogique)
     */
    function getActionValue(action) {
        const gp = getGamepad();
        if (!gp) return 0;

        const binding = InputConfig.getGamepadBinding(action);
        if (!binding) return 0;

        const deadzone = InputConfig.gamepadDeadzone;

        if (binding.type === 'button') {
            const btn = gp.buttons[binding.index];
            if (!btn) return 0;
            return btn.pressed ? (btn.value || 1) : 0;
        }

        if (binding.type === 'axis') {
            const val = gp.axes[binding.index] || 0;
            // Vérifier la direction (positif ou négatif)
            if (binding.direction > 0) {
                return val > deadzone ? val : 0;
            } else {
                return val < -deadzone ? -val : 0;
            }
        }

        return 0;
    }

    /**
     * Vérifie si un bouton vient d'être pressé (front montant)
     */
    function isActionJustPressed(action) {
        const gp = getGamepad();
        if (!gp) return false;

        const binding = InputConfig.getGamepadBinding(action);
        if (!binding || binding.type !== 'button') return false;

        const btn = gp.buttons[binding.index];
        if (!btn) return false;

        const key = 'btn_' + binding.index;
        const wasPressed = prevButtonStates[key] || false;
        const isPressed = btn.pressed;

        return isPressed && !wasPressed;
    }

    /**
     * Met à jour les états précédents (appeler en fin de frame)
     */
    function updatePrevStates() {
        const gp = getGamepad();
        if (!gp) return;
        for (let i = 0; i < gp.buttons.length; i++) {
            prevButtonStates['btn_' + i] = gp.buttons[i].pressed;
        }
    }

    /**
     * Retourne la valeur brute du stick droit (pour la caméra)
     * @returns {{x: number, y: number}}
     */
    function getRightStick() {
        const gp = getGamepad();
        if (!gp) return { x: 0, y: 0 };

        const deadzone = InputConfig.gamepadDeadzone;
        let x = gp.axes[2] || 0;
        let y = gp.axes[3] || 0;

        if (Math.abs(x) < deadzone) x = 0;
        if (Math.abs(y) < deadzone) y = 0;

        return { x, y };
    }

    /**
     * Retourne la valeur brute du stick gauche
     * @returns {{x: number, y: number}}
     */
    function getLeftStick() {
        const gp = getGamepad();
        if (!gp) return { x: 0, y: 0 };

        const deadzone = InputConfig.gamepadDeadzone;
        let x = gp.axes[0] || 0;
        let y = gp.axes[1] || 0;

        if (Math.abs(x) < deadzone) x = 0;
        if (Math.abs(y) < deadzone) y = 0;

        return { x, y };
    }

    /**
     * Détecte quel bouton/axe est actuellement pressé (pour le rebind UI)
     * @returns {Object|null} {type:'button', index} ou {type:'axis', index, direction}
     */
    function detectAnyInput() {
        const gp = getGamepad();
        if (!gp) return null;

        // Boutons
        for (let i = 0; i < gp.buttons.length; i++) {
            if (gp.buttons[i].pressed) {
                return { type: 'button', index: i };
            }
        }

        // Axes
        for (let i = 0; i < gp.axes.length; i++) {
            if (Math.abs(gp.axes[i]) > 0.6) {
                return { type: 'axis', index: i, direction: gp.axes[i] > 0 ? 1 : -1 };
            }
        }

        return null;
    }

    return {
        get connected() { return connected; },
        getGamepad,
        getActionValue,
        isActionJustPressed,
        updatePrevStates,
        getRightStick,
        getLeftStick,
        detectAnyInput
    };
})();
