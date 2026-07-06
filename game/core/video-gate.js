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
    /** Petit message éphémère en bas de l'écran (indication Échap). */
    function _toast(message) {
        var t = document.createElement('div');
        t.textContent = message;
        t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);' +
            'background:rgba(10,14,18,.85);color:#cfeef5;border:1px solid rgba(0,229,255,.35);' +
            'border-radius:8px;padding:8px 18px;font:600 12px/1.4 "Segoe UI",sans-serif;' +
            'letter-spacing:.05em;z-index:2147483647;pointer-events:none;opacity:0;transition:opacity .4s;';
        (document.body || document.documentElement).appendChild(t);
        requestAnimationFrame(function() { t.style.opacity = '1'; });
        setTimeout(function() { t.style.opacity = '0'; setTimeout(function() { t.remove(); }, 500); }, 3500);
    }

    /**
     * Pastille discrète en haut au centre : bascule plein écran.
     * Presque invisible (opacité 0.25), se révèle au survol.
     * À l'entrée en plein écran, un toast rappelle « Échap pour quitter ».
     */
    function _injecterBoutonFS() {
        if (document.getElementById('res-fs-btn')) return;
        var btn = document.createElement('button');
        btn.id = 'res-fs-btn';
        btn.type = 'button';
        btn.title = 'Basculer le plein écran (Échap pour quitter)';
        btn.style.cssText = 'position:fixed;top:6px;left:50%;transform:translateX(-50%);' +
            'z-index:2147483647;background:rgba(10,14,18,.55);color:#9fdce8;' +
            'border:1px solid rgba(0,229,255,.35);border-radius:14px;padding:3px 12px;' +
            'font:600 11px/1.4 "Segoe UI",sans-serif;letter-spacing:.06em;cursor:pointer;' +
            'opacity:.25;transition:opacity .2s;';
        btn.addEventListener('mouseenter', function() { btn.style.opacity = '0.95'; });
        btn.addEventListener('mouseleave', function() { btn.style.opacity = '0.25'; });
        btn.addEventListener('click', function() {
            if (document.fullscreenElement) {
                if (document.exitFullscreen) document.exitFullscreen();
            } else {
                requestFullscreen(document.documentElement);
            }
        });
        function majLibelle() {
            btn.textContent = document.fullscreenElement ? '✕ Quitter le plein écran' : '⛶ Plein écran';
        }
        document.addEventListener('fullscreenchange', function() {
            majLibelle();
            if (document.fullscreenElement) _toast('Plein écran — touche Échap pour quitter');
        });
        majLibelle();
        (document.body || document.documentElement).appendChild(btn);
    }

    function autoFullscreen() {
        try { sessionStorage.removeItem('goFullscreen'); } catch (e) {} // drapeau historique consommé

        // Bouton de bascule + indication de sortie, sur toutes les pages joueur
        if (document.body) _injecterBoutonFS();
        else document.addEventListener('DOMContentLoaded', _injecterBoutonFS);

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
