/**
 * ============================================================
 * RESISTANCE — game/core/video-gate.js
 * Primitives partagées pour les overlays vidéo (intro,
 * transitions, futures vidéos des 12 personnages).
 * Dépend de : rien.
 * ============================================================
 * Remplace doRequestFS() et le chargement de l'API YouTube
 * dupliqués dans index.html et test-blackbox.html.
 */

var ResVideoGate = (function() {
    var _ytApiDemandee = false;

    /** Passe un élément en plein écran (préfixes navigateurs inclus). */
    function requestFullscreen(el) {
        var fn = el.requestFullscreen || el.webkitRequestFullscreen
            || el.mozRequestFullScreen || el.msRequestFullscreen;
        if (fn) fn.call(el);
    }

    /**
     * Injecte l'API iframe YouTube (une seule fois, même si plusieurs
     * appels). Le callback global onYouTubeIframeAPIReady reste à
     * définir par la page appelante.
     */
    function loadYouTubeAPI() {
        if (_ytApiDemandee) return;
        _ytApiDemandee = true;
        var s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(s);
    }

    /**
     * Plein écran automatique d'une page (généralisation du mécanisme
     * qui n'existait que dans cocoon_nexus.html) :
     *  1. tentative immédiate — fonctionne sur Chrome quand la navigation
     *     vient d'un clic (l'activation utilisateur est encore valide) ;
     *  2. sinon, plein écran au premier geste (clic ou touche) — les
     *     navigateurs interdisent le plein écran sans geste utilisateur.
     * Ne force jamais : si le joueur quitte volontairement (Échap),
     * on ne le réimpose pas.
     */
    function autoFullscreen() {
        try { sessionStorage.removeItem('goFullscreen'); } catch (e) {} // drapeau historique consommé

        var el = document.documentElement;
        function tenter() {
            var fn = el.requestFullscreen || el.webkitRequestFullscreen
                || el.mozRequestFullScreen || el.msRequestFullscreen;
            if (!fn) return null;
            try { return fn.call(el); } catch (e) { return null; }
        }
        function auPremierGeste() {
            document.removeEventListener('pointerdown', auPremierGeste, true);
            document.removeEventListener('keydown', auPremierGeste, true);
            if (!document.fullscreenElement) tenter();
        }
        function armer() {
            document.addEventListener('pointerdown', auPremierGeste, true);
            document.addEventListener('keydown', auPremierGeste, true);
        }
        var p = tenter();
        if (p && p.catch) p.catch(armer);
        else if (!document.fullscreenElement) armer();
    }

    return {
        requestFullscreen: requestFullscreen,
        loadYouTubeAPI: loadYouTubeAPI,
        autoFullscreen: autoFullscreen
    };
})();
