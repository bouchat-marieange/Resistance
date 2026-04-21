/**
 * ============================================
 * LUCIDITY MANAGER - Resistance
 * ============================================
 * Gere la jauge de lucidite globale de Raya (0-100) + les scores max
 * historiques par piece + validation des pieces.
 *
 * Regles (validees avec Marie-Ange):
 *  - La lucidite globale est le coeur du progression system.
 *  - Chaque piece a un score local (0-100) obtenu via les defis 3D.
 *  - Quand une piece est revisitee et qu'un nouveau score > max historique,
 *    la difference est ajoutee a la lucidite globale. Si <= max, aucun impact.
 *  - Une piece validee (max atteint le seuil) autorise l'acces a la piece suivante.
 *  - Les dialogues (via DialogueManager) peuvent aussi ajouter directement
 *    de la lucidite (effects.lucidite).
 *
 * Depend de ScoreManager. Inclure APRES score-manager.js.
 *
 * API:
 *   LucidityManager.getLucidite()                 - jauge globale 0-100
 *   LucidityManager.addLucidite(delta)            - signed delta (clamp 0-100)
 *   LucidityManager.getRoomMax(roomName)          - score max historique
 *   LucidityManager.submitRoomScore(room, s)      - returns { accepted, delta, newMax, lucidityAdded }
 *   LucidityManager.validateRoom(room, threshold) - returns bool
 *   LucidityManager.isRoomValidated(room)
 *   LucidityManager.canProgress(room, threshold)
 *   LucidityManager.updateDisplay()               - met a jour HUD #lucidite-fill/#lucidite-val
 *   LucidityManager.init(roomName)
 */
(function () {
    'use strict';

    function _getPseudo() {
        return (typeof ScoreManager !== 'undefined' && ScoreManager.getActivePseudo)
            ? ScoreManager.getActivePseudo() : null;
    }

    function _updateProfile(fn) {
        var pseudo = _getPseudo();
        if (!pseudo) return null;
        var profiles;
        try {
            profiles = JSON.parse(localStorage.getItem('resistance_profiles') || '[]');
        } catch (e) { profiles = []; }
        var profile = profiles.find(function (p) { return p.pseudo === pseudo; });
        if (!profile) return null;
        if (!profile.lucidity) {
            profile.lucidity = { global: 0, roomMaxes: {}, roomValidated: {} };
        }
        fn(profile);
        localStorage.setItem('resistance_profiles', JSON.stringify(profiles));
        return profile;
    }

    function _getData() {
        var profile = (typeof ScoreManager !== 'undefined' && ScoreManager.getProfile)
            ? ScoreManager.getProfile() : null;
        if (!profile) return null;
        if (!profile.lucidity) {
            profile.lucidity = { global: 0, roomMaxes: {}, roomValidated: {} };
        }
        return profile.lucidity;
    }

    function _clamp(v) { return Math.max(0, Math.min(100, v)); }

    function getLucidite() {
        var d = _getData();
        return d ? d.global : 0;
    }

    function addLucidite(delta) {
        _updateProfile(function (profile) {
            profile.lucidity.global = _clamp((profile.lucidity.global || 0) + delta);
        });
        updateDisplay();
        animateLuciditeGain(delta);
    }

    function getRoomMax(roomName) {
        var d = _getData();
        if (!d || !d.roomMaxes) return 0;
        return d.roomMaxes[roomName] || 0;
    }

    function submitRoomScore(roomName, score) {
        var oldMax = getRoomMax(roomName);
        if (score > oldMax) {
            var diff = score - oldMax;
            _updateProfile(function (profile) {
                if (!profile.lucidity.roomMaxes) profile.lucidity.roomMaxes = {};
                profile.lucidity.roomMaxes[roomName] = score;
                profile.lucidity.global = _clamp((profile.lucidity.global || 0) + diff);
            });
            updateDisplay();
            animateLuciditeGain(diff);
            return { accepted: true, delta: diff, newMax: score, lucidityAdded: diff };
        }
        return { accepted: false, delta: 0, newMax: oldMax, lucidityAdded: 0 };
    }

    function validateRoom(roomName, threshold) {
        var max = getRoomMax(roomName);
        if (max < threshold) return false;
        _updateProfile(function (profile) {
            if (!profile.lucidity.roomValidated) profile.lucidity.roomValidated = {};
            profile.lucidity.roomValidated[roomName] = true;
        });
        return true;
    }

    function isRoomValidated(roomName) {
        var d = _getData();
        return !!(d && d.roomValidated && d.roomValidated[roomName]);
    }

    function canProgress(roomName, threshold) {
        return getRoomMax(roomName) >= threshold;
    }

    function updateDisplay() {
        var v = getLucidite();
        var valEl = document.getElementById('lucidite-val');
        if (valEl) valEl.textContent = v;

        // Nouveau HUD : curseur sur axe bidirectionnel Emprise <-> Lucidite
        var cursor = document.getElementById('lucidite-cursor');
        if (cursor) {
            cursor.style.left = v + '%';
            // Couleur du curseur selon la position (palette carnet : rouge mat -> ocre -> cyan)
            var color, glow;
            if (v < 33) {
                color = '#c25c5c';
                glow = 'rgba(194,92,92,0.65)';
            } else if (v < 66) {
                color = '#c8bd7a';
                glow = 'rgba(200,189,122,0.6)';
            } else {
                color = '#7ed6df';
                glow = 'rgba(126,214,223,0.7)';
            }
            cursor.style.background = color;
            cursor.style.boxShadow = '0 0 12px ' + glow + ', 0 0 4px rgba(0,0,0,0.6)';
        }

        // Fallback ancien HUD (compatibilite si d'autres pages utilisent encore #lucidite-fill en remplissage)
        var fillEl = document.getElementById('lucidite-fill');
        if (fillEl && fillEl.style.display !== 'none') fillEl.style.width = v + '%';
    }

    function animateLuciditeGain(delta) {
        if (!delta) return;
        var hud = document.getElementById('lucidite-hud');
        if (!hud) return;
        var tip = document.createElement('div');
        var sign = delta > 0 ? '+' : '';
        var label = delta > 0 ? 'Lucidité' : 'Emprise';
        // Pour un delta negatif, on affiche "+X Emprise" (le joueur bascule cote emprise)
        var displayVal = Math.abs(delta);
        tip.textContent = '+' + displayVal + ' ' + label;
        tip.style.cssText = 'position:absolute; top:-24px; left:50%; transform:translateX(-50%); color:' +
            (delta > 0 ? '#7ed6df' : '#c77272') +
            '; font-size:13px; font-weight:700; pointer-events:none; opacity:1;' +
            ' transition: all 1.2s ease; text-shadow: 0 0 8px ' +
            (delta > 0 ? 'rgba(126,214,223,0.65)' : 'rgba(199,114,114,0.65)') +
            '; white-space:nowrap;';
        hud.style.position = 'relative';
        hud.appendChild(tip);
        requestAnimationFrame(function () {
            tip.style.transform = 'translate(-50%, -36px)';
            tip.style.opacity = '0';
        });
        setTimeout(function () { tip.remove(); }, 1400);
    }

    function init(roomName) {
        updateDisplay();
    }

    window.LucidityManager = {
        getLucidite: getLucidite,
        addLucidite: addLucidite,
        getRoomMax: getRoomMax,
        submitRoomScore: submitRoomScore,
        validateRoom: validateRoom,
        isRoomValidated: isRoomValidated,
        canProgress: canProgress,
        updateDisplay: updateDisplay,
        init: init
    };
})();
