/**
 * ============================================
 * RELATIONSHIP MANAGER - Resistance
 * ============================================
 * Gere la confiance + l'attachement de Raya envers chacun des 12 personnages.
 *
 * Principes (valides avec Marie-Ange, avril 2026):
 *  - Confiance/attachement montent via les dialogues (DialogueManager)
 *    et certains defis 3D (via ChallengeManager plus tard).
 *  - Une fois qu'un personnage est "valide" (markValidated), sa confiance
 *    ne peut plus regresser. Elle peut seulement continuer a monter.
 *  - Tant que non valide, les deltas negatifs sont appliques.
 *
 * Depend de ScoreManager pour l'identification du profil actif.
 * Inclure ce script APRES score-manager.js dans les pages de jeu.
 *
 * API:
 *   RelationshipManager.CHARACTERS              - Liste des 12 ids (constant)
 *   RelationshipManager.getConfiance(id)        - 0-100
 *   RelationshipManager.getAttachement(id)      - 0-100
 *   RelationshipManager.addConfiance(id, d)     - d peut etre negatif
 *   RelationshipManager.addAttachement(id, d)   - idem
 *   RelationshipManager.markValidated(id)       - verrouille anti-regression
 *   RelationshipManager.isValidated(id)
 *   RelationshipManager.getAll()                - { id: { confiance, attachement, validated }, ... }
 *   RelationshipManager.reset(id)               - remet a zero (debug)
 */
(function () {
    'use strict';

    // Les 12 personnages du bunker (Raya est la joueuse, pas dans la liste)
    var CHARACTERS = [
        'naby', 'eliott', 'ilan', 'naia', 'sky', 'iona',
        'ruby', 'fox', 'alex', 'kat', 'maze', 'falcon'
    ];

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
        if (!profile.relationships) profile.relationships = {};
        fn(profile);
        localStorage.setItem('resistance_profiles', JSON.stringify(profiles));
        return profile;
    }

    function _ensureRel(profile, characterId) {
        if (!profile.relationships) profile.relationships = {};
        if (!profile.relationships[characterId]) {
            profile.relationships[characterId] = {
                confiance: 0,
                attachement: 0,
                validated: false
            };
        }
        return profile.relationships[characterId];
    }

    function _getRel(characterId) {
        var pseudo = _getPseudo();
        if (!pseudo) return null;
        var profile = (typeof ScoreManager !== 'undefined' && ScoreManager.getProfile)
            ? ScoreManager.getProfile() : null;
        if (!profile) return null;
        if (!profile.relationships || !profile.relationships[characterId]) {
            return { confiance: 0, attachement: 0, validated: false };
        }
        return profile.relationships[characterId];
    }

    function getConfiance(id) { return _getRel(id).confiance; }
    function getAttachement(id) { return _getRel(id).attachement; }
    function isValidated(id) { return _getRel(id).validated; }

    function _clamp(v) { return Math.max(0, Math.min(100, v)); }

    function addConfiance(id, delta) {
        _updateProfile(function (profile) {
            var rel = _ensureRel(profile, id);
            if (rel.validated && delta < 0) return; // protection anti-regression
            rel.confiance = _clamp(rel.confiance + delta);
        });
    }

    function addAttachement(id, delta) {
        _updateProfile(function (profile) {
            var rel = _ensureRel(profile, id);
            if (rel.validated && delta < 0) return;
            rel.attachement = _clamp(rel.attachement + delta);
        });
    }

    function markValidated(id) {
        _updateProfile(function (profile) {
            var rel = _ensureRel(profile, id);
            rel.validated = true;
        });
    }

    function getAll() {
        var profile = (typeof ScoreManager !== 'undefined' && ScoreManager.getProfile)
            ? ScoreManager.getProfile() : null;
        if (!profile || !profile.relationships) return {};
        return profile.relationships;
    }

    function reset(id) {
        _updateProfile(function (profile) {
            if (!profile.relationships) profile.relationships = {};
            profile.relationships[id] = { confiance: 0, attachement: 0, validated: false };
        });
    }

    window.RelationshipManager = {
        CHARACTERS: CHARACTERS.slice(),
        getConfiance: getConfiance,
        getAttachement: getAttachement,
        isValidated: isValidated,
        addConfiance: addConfiance,
        addAttachement: addAttachement,
        markValidated: markValidated,
        getAll: getAll,
        reset: reset
    };
})();
