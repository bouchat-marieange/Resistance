/**
 * ============================================================
 * RESISTANCE — game/core/profiles.js
 * Gestion centralisée des profils joueurs (localStorage).
 * Dépend de : rien. À charger après game/core/env.js.
 * ============================================================
 * Remplace le code dupliqué dans index.html et l'extrait
 * « lastRoom » copié-collé dans chaque page de jeu.
 *
 * Sécurité :
 *  - les pseudos ne doivent JAMAIS être injectés via innerHTML
 *    (utiliser textContent ou ResProfiles.buildProfileNode) ;
 *  - lastRoom est validé contre une liste blanche avant toute
 *    navigation (un localStorage altéré ne peut pas rediriger
 *    vers une URL arbitraire).
 */

var ResProfiles = (function() {
    var KEY_PROFILES = 'resistance_profiles';
    var KEY_ACTIVE   = 'resistance_active_pseudo';

    // Pages de jeu autorisées comme point de reprise (liste blanche)
    var ROOMS_AUTORISEES = [
        'test-blackbox.html',
        'sas_securite.html',
        'la_villa.html',
        'cocoon_nexus.html',
        'hall_entree_nexus.html',
        'salle_controle_nexus.html'
    ];
    var ROOM_PAR_DEFAUT = 'test-blackbox.html';

    function getAll() {
        try {
            return JSON.parse(localStorage.getItem(KEY_PROFILES) || '[]');
        } catch (e) { return []; }
    }

    function saveAll(profiles) {
        localStorage.setItem(KEY_PROFILES, JSON.stringify(profiles));
    }

    function get(pseudo) {
        return getAll().find(function(p) { return p.pseudo === pseudo; }) || null;
    }

    /** Crée le profil s'il n'existe pas, sinon met à jour lastLogin. */
    function save(pseudo) {
        var profiles = getAll();
        var existing = profiles.find(function(p) { return p.pseudo === pseudo; });
        if (existing) {
            existing.lastLogin = new Date().toISOString();
        } else {
            profiles.push({
                pseudo: pseudo,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                totalScore: 0,
                roomScores: {},
                introWatched: false,
                lastRoom: ''
            });
        }
        saveAll(profiles);
    }

    function setActive(pseudo) {
        localStorage.setItem(KEY_ACTIVE, pseudo);
    }

    function getActivePseudo() {
        return localStorage.getItem(KEY_ACTIVE);
    }

    function getActive() {
        var pseudo = getActivePseudo();
        return pseudo ? get(pseudo) : null;
    }

    function markIntroWatched(pseudo) {
        var profiles = getAll();
        var p = profiles.find(function(x) { return x.pseudo === pseudo; });
        if (p) {
            p.introWatched = true;
            if (!p.lastRoom) p.lastRoom = ROOM_PAR_DEFAUT;
            saveAll(profiles);
        }
    }

    /** Retourne lastRoom uniquement s'il figure dans la liste blanche. */
    function sanitizeLastRoom(room) {
        return ROOMS_AUTORISEES.indexOf(room) !== -1 ? room : ROOM_PAR_DEFAUT;
    }

    /**
     * Enregistre la page courante comme point de reprise du profil actif.
     * Remplace l'extrait inline dupliqué dans chaque page de jeu :
     * le nom de fichier est déduit de l'URL, plus d'argument à copier-coller.
     */
    function rememberCurrentRoom() {
        var page = decodeURIComponent(window.location.pathname.split('/').pop() || '');
        if (ROOMS_AUTORISEES.indexOf(page) === -1) return;
        var pseudo = getActivePseudo();
        if (!pseudo) return;
        var profiles = getAll();
        var p = profiles.find(function(x) { return x.pseudo === pseudo; });
        if (p) { p.lastRoom = page; saveAll(profiles); }
    }

    return {
        getAll: getAll,
        saveAll: saveAll,
        get: get,
        save: save,
        setActive: setActive,
        getActive: getActive,
        getActivePseudo: getActivePseudo,
        markIntroWatched: markIntroWatched,
        sanitizeLastRoom: sanitizeLastRoom,
        rememberCurrentRoom: rememberCurrentRoom
    };
})();
