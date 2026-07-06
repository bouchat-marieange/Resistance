/**
 * ============================================================
 * RESISTANCE — game/core/env.js
 * Environnement d'exécution partagé par toutes les pages.
 * À charger AVANT tout autre script du jeu.
 * ============================================================
 * Remplace les définitions locales de IS_LOCAL qui étaient
 * dupliquées dans index.html, test-blackbox.html, etc.
 */

var ResEnv = (function() {
    var isLocal = window.location.hostname === 'localhost'
        || window.location.hostname === '127.0.0.1'
        || window.location.protocol === 'file:';

    return {
        isLocal: isLocal
    };
})();

// Alias global historique — les pages utilisent IS_LOCAL directement
var IS_LOCAL = ResEnv.isLocal;
