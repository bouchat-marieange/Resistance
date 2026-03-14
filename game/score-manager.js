/**
 * ============================================
 * SCORE MANAGER - Résistance
 * ============================================
 * Gestion des scores cross-rooms liés au profil utilisateur.
 * Inclure ce script dans chaque page de jeu (room_1.html, room_2.html, room_model.html, etc.)
 *
 * API:
 *   ScoreManager.getActivePseudo()         - Pseudo du joueur actif
 *   ScoreManager.getRoomScore(roomName)     - Score de la pièce
 *   ScoreManager.setRoomScore(roomName, s)  - Définir le score d'une pièce
 *   ScoreManager.addToRoomScore(roomName,n) - Ajouter n points à une pièce
 *   ScoreManager.getTotalScore()            - Score total (toutes pièces)
 *   ScoreManager.getProfile()               - Profil complet du joueur actif
 *   ScoreManager.updateScoreDisplay()       - Met à jour l'indicateur UI
 *   ScoreManager.init(roomName)             - Initialiser pour une pièce donnée
 */

var ScoreManager = (function() {

    var _currentRoom = null;

    function getAllProfiles() {
        try {
            return JSON.parse(localStorage.getItem('resistance_profiles') || '[]');
        } catch(e) { return []; }
    }

    function saveProfiles(profiles) {
        localStorage.setItem('resistance_profiles', JSON.stringify(profiles));
    }

    function getActivePseudo() {
        return localStorage.getItem('resistance_active_pseudo') || null;
    }

    function getProfile() {
        var pseudo = getActivePseudo();
        if (!pseudo) return null;
        var profiles = getAllProfiles();
        return profiles.find(function(p) { return p.pseudo === pseudo; }) || null;
    }

    function updateProfile(updateFn) {
        var pseudo = getActivePseudo();
        if (!pseudo) return null;
        var profiles = getAllProfiles();
        var profile = profiles.find(function(p) { return p.pseudo === pseudo; });
        if (!profile) return null;
        updateFn(profile);
        // Recalculer le score total
        var total = 0;
        if (profile.roomScores) {
            Object.keys(profile.roomScores).forEach(function(key) {
                total += (profile.roomScores[key] || 0);
            });
        }
        profile.totalScore = total;
        saveProfiles(profiles);
        return profile;
    }

    function getRoomScore(roomName) {
        var profile = getProfile();
        if (!profile || !profile.roomScores) return 0;
        return profile.roomScores[roomName || _currentRoom] || 0;
    }

    function setRoomScore(roomName, score) {
        var room = roomName || _currentRoom;
        if (!room) return;
        updateProfile(function(p) {
            if (!p.roomScores) p.roomScores = {};
            p.roomScores[room] = score;
        });
        updateScoreDisplay();
    }

    function addToRoomScore(roomName, points) {
        var room = roomName || _currentRoom;
        if (!room) return;
        updateProfile(function(p) {
            if (!p.roomScores) p.roomScores = {};
            p.roomScores[room] = (p.roomScores[room] || 0) + points;
        });
        updateScoreDisplay();
        // Animation visuelle
        animateScoreGain(points);
    }

    function getTotalScore() {
        var profile = getProfile();
        return profile ? (profile.totalScore || 0) : 0;
    }

    function updateScoreDisplay() {
        var totalEl = document.getElementById('total-score-val');
        var roomEl = document.getElementById('room-score-val');
        var pseudoEl = document.getElementById('player-pseudo-display');
        var containerEl = document.getElementById('game-score');

        var total = getTotalScore();
        var roomScore = getRoomScore(_currentRoom);
        var pseudo = getActivePseudo();

        if (totalEl) totalEl.textContent = total;
        if (roomEl) roomEl.textContent = roomScore;
        if (pseudoEl) pseudoEl.textContent = pseudo || '???';

        // Afficher le conteneur si un profil existe
        if (containerEl && pseudo) {
            containerEl.style.display = '';
        }
    }

    function animateScoreGain(points) {
        if (points <= 0) return;
        var el = document.createElement('div');
        el.textContent = '+' + points;
        el.style.cssText = 'position:fixed; bottom:50px; left:40px; z-index:200; color:#39ff14; font-size:24px; font-weight:800; pointer-events:none; opacity:1; transition: all 1s ease;';
        document.body.appendChild(el);
        // Trigger animation
        requestAnimationFrame(function() {
            el.style.transform = 'translateY(-40px)';
            el.style.opacity = '0';
        });
        setTimeout(function() { el.remove(); }, 1200);
    }

    function init(roomName) {
        _currentRoom = roomName;
        updateScoreDisplay();
        console.log('ScoreManager initialisé pour:', roomName, '| Pseudo:', getActivePseudo(), '| Total:', getTotalScore());
    }

    return {
        getActivePseudo: getActivePseudo,
        getProfile: getProfile,
        getRoomScore: getRoomScore,
        setRoomScore: setRoomScore,
        addToRoomScore: addToRoomScore,
        getTotalScore: getTotalScore,
        updateScoreDisplay: updateScoreDisplay,
        init: init
    };

})();
