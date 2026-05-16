/**
 * Debug logger — silencieux par defaut en jeu.
 *
 * Active les logs avec :
 *   - URL param  : ?debug=1    (ex: sas_securite.html?debug=1)
 *   - localStorage : localStorage.setItem('resistance_debug', '1')
 *
 * Par defaut console.log / .info / .debug sont muets en mode jeu.
 * console.warn et console.error restent actifs (les erreurs doivent
 * toujours etre visibles, meme pour un joueur).
 *
 * Ce script doit etre charge TOUT PREMIER dans la page de jeu, avant
 * three.min.js, scene-loader.js, etc. Sinon certains logs passeront
 * avant que la muselière soit en place.
 */
(function () {
    'use strict';
    try {
        var params = new URLSearchParams(window.location.search);
        var debug = params.has('debug') || localStorage.getItem('resistance_debug') === '1';
        window.RESISTANCE_DEBUG = !!debug;
        if (!debug) {
            var noop = function () {};
            console.log = noop;
            console.info = noop;
            console.debug = noop;
            // console.warn et console.error preserves
        } else {
            console.log('%c[debug on]', 'color:#0bd;font-weight:bold',
                        'Mode debug actif — desactive avec ?debug=0 ou localStorage.removeItem("resistance_debug")');
        }
    } catch (e) {
        // localStorage indisponible (mode privee strict) — ne rien faire,
        // console.log reste actif par securite.
    }
})();
