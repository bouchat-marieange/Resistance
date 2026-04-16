"""
=============================================================================
BLENDER BATCH DECIMATE — Réduction automatique des polygones de fichiers GLB
=============================================================================

Ce script Blender permet de réduire en masse le nombre de polygones
de tous les fichiers .glb/.gltf d'un dossier.

UTILISATION :
─────────────
1. Ouvrir Blender (version 3.0+)
2. Menu : Edit > Preferences > File Paths
   Vérifier que les chemins d'import/export sont corrects
3. Aller dans l'onglet "Scripting" (en haut de Blender)
4. Cliquer "Open" et sélectionner ce fichier
5. MODIFIER LES PARAMÈTRES CI-DESSOUS selon vos besoins
6. Cliquer "Run Script" (bouton ▶ ou Alt+P)

Le script va :
 - Scanner le dossier d'entrée pour tous les fichiers .glb et .gltf
 - Pour chaque fichier :
   * Importer le modèle 3D
   * Afficher le nombre de triangles AVANT
   * Appliquer le Decimate modifier avec le ratio choisi
   * Afficher le nombre de triangles APRÈS
   * Exporter le résultat dans le dossier de sortie
   * Générer un rapport détaillé

IMPORTANT :
 - Les fichiers originaux ne sont JAMAIS modifiés
 - Les résultats sont sauvegardés dans un dossier séparé (_optimized)
 - Un rapport CSV est généré pour suivre les résultats
=============================================================================
"""

import bpy
import os
import sys
import csv
import time
from pathlib import Path

# =============================================================================
# ██████  ██████   █████  ██████   █████  ███    ███ ███████ ████████ ██████  ███████ ███████
# ██   ██ ██   ██ ██   ██ ██   ██ ██   ██ ████  ████ ██         ██    ██   ██ ██      ██
# ██████  ██████  ███████ ██████  ███████ ██ ████ ██ █████      ██    ██████  █████   ███████
# ██      ██   ██ ██   ██ ██   ██ ██   ██ ██  ██  ██ ██         ██    ██   ██ ██           ██
# ██      ██   ██ ██   ██ ██   ██ ██   ██ ██      ██ ███████    ██    ██   ██ ███████ ███████
# =============================================================================

# ── DOSSIER D'ENTRÉE : chemin vers le dossier contenant les fichiers GLB/GLTF ──
# Modifier ce chemin pour pointer vers votre dossier de modèles 3D
INPUT_FOLDER = r"C:\Users\marie\Desktop\Resistance\3D"

# ── DOSSIER DE SORTIE : où seront sauvegardés les fichiers optimisés ──
# Par défaut : un sous-dossier "_optimized" à côté du dossier d'entrée
# Les fichiers originaux ne sont JAMAIS modifiés
OUTPUT_FOLDER = r"C:\Users\marie\Desktop\Resistance\3D_optimized"

# ── RATIO DE DÉCIMATION (0.01 à 1.0) ──
# 0.1 = garder 10% des polygones (très agressif, formes simples)
# 0.2 = garder 20% des polygones (bon compromis meubles/décor)
# 0.3 = garder 30% des polygones (qualité correcte)
# 0.5 = garder 50% des polygones (réduction légère)
# 1.0 = aucune réduction
DECIMATE_RATIO = 0.25

# ── RATIOS PAR CATÉGORIE (optionnel) ──
# Permet de définir des ratios différents selon le type d'objet
# Les fichiers dont le nom contient un mot-clé utiliseront le ratio associé
# Si aucun mot-clé ne correspond, DECIMATE_RATIO est utilisé
CATEGORY_RATIOS = {
    # Personnages animés : NE PAS DÉCIMER (visage trop sensible)
    # Ratio 1.0 = aucune réduction, le fichier est juste re-exporté avec Draco
    "perso": 1.0,
    "character": 1.0,
    "personnage": 1.0,
    "naby": 1.0,
    "baby": 1.0,

    # Animaux : réduction modérée (vus de près aussi)
    "animal": 0.45,
    "cat": 0.45,
    "dog": 0.45,
    "bird": 0.45,

    # Mobilier simple : réduction plus agressive
    "chair": 0.15,
    "table": 0.15,
    "desk": 0.15,
    "shelf": 0.15,
    "lamp": 0.20,

    # Décor : réduction agressive
    "decor": 0.10,
    "plant": 0.15,
    "book": 0.10,
    "bottle": 0.10,

    # Objets interactifs : réduction modérée (l'utilisateur les verra de près)
    "interactive": 0.35,
    "puzzle": 0.35,
    "key": 0.30,
}

# ── SEUIL MINIMUM DE TRIANGLES ──
# Si un objet a déjà moins de triangles que ce seuil, il n'est pas décimé
# (évite de dégrader des objets déjà légers)
MIN_TRIANGLES_THRESHOLD = 500

# ── SEUIL MAXIMUM DE TRIANGLES APRÈS DÉCIMATION ──
# Objectif maximum de triangles par objet après décimation
# Si le ratio donne plus que ce seuil, un ratio plus agressif est calculé
# Note : les personnages principaux (vus de près) peuvent avoir 50-80K triangles
MAX_TRIANGLES_TARGET = 80000

# ── COMPRESSION DRACO À L'EXPORT ──
# Active la compression Draco pour réduire la taille du fichier GLB
USE_DRACO_COMPRESSION = True

# ── SCANNER LES SOUS-DOSSIERS ──
# True = scanner récursivement tous les sous-dossiers
# False = scanner uniquement le dossier racine
RECURSIVE = True

# ── CONSERVER LA STRUCTURE DES DOSSIERS ──
# True = reproduire la hiérarchie des sous-dossiers dans le dossier de sortie
# False = tout mettre à plat dans le dossier de sortie
KEEP_FOLDER_STRUCTURE = True

# ── FORMAT DE SORTIE ──
# "GLB" = binaire (recommandé, plus compact)
# "GLTF" = JSON + fichiers binaires séparés
OUTPUT_FORMAT = "GLB"

# =============================================================================
# FIN DES PARAMÈTRES — Ne pas modifier en dessous sauf si vous savez ce que vous faites
# =============================================================================


def clear_scene():
    """Supprime tous les objets de la scène Blender."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

    # Nettoyer les données orphelines
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        if block.users == 0:
            bpy.data.materials.remove(block)
    for block in bpy.data.textures:
        if block.users == 0:
            bpy.data.textures.remove(block)
    for block in bpy.data.images:
        if block.users == 0:
            bpy.data.images.remove(block)
    for block in bpy.data.armatures:
        if block.users == 0:
            bpy.data.armatures.remove(block)
    for block in bpy.data.actions:
        if block.users == 0:
            bpy.data.actions.remove(block)


def count_triangles():
    """Compte le nombre total de triangles dans la scène."""
    total = 0
    for obj in bpy.data.objects:
        if obj.type == 'MESH':
            # Évaluer avec les modifiers pour avoir le vrai compte
            depsgraph = bpy.context.evaluated_depsgraph_get()
            obj_eval = obj.evaluated_get(depsgraph)
            mesh = obj_eval.to_mesh()
            if mesh:
                mesh.calc_loop_triangles()
                total += len(mesh.loop_triangles)
                obj_eval.to_mesh_clear()
    return total


def count_vertices():
    """Compte le nombre total de vertices dans la scène."""
    total = 0
    for obj in bpy.data.objects:
        if obj.type == 'MESH':
            total += len(obj.data.vertices)
    return total


def get_ratio_for_file(filepath):
    """Détermine le ratio de décimation basé sur le nom/chemin du fichier."""
    name_lower = filepath.lower()
    for keyword, ratio in CATEGORY_RATIOS.items():
        if keyword.lower() in name_lower:
            return ratio
    return DECIMATE_RATIO


def apply_decimate(ratio, max_target):
    """Applique le modifier Decimate à tous les meshes de la scène."""
    decimated_count = 0
    skipped_count = 0

    for obj in bpy.data.objects:
        if obj.type != 'MESH':
            continue

        # Compter les triangles de cet objet
        tri_count = len(obj.data.polygons)
        if tri_count < MIN_TRIANGLES_THRESHOLD:
            skipped_count += 1
            continue

        # Calculer le ratio effectif
        effective_ratio = ratio
        if tri_count * ratio > max_target:
            effective_ratio = max_target / tri_count

        effective_ratio = max(0.01, min(1.0, effective_ratio))

        # Ne pas appliquer si ratio >= 0.95 (pas assez de réduction)
        if effective_ratio >= 0.95:
            skipped_count += 1
            continue

        # S'assurer que l'objet est sélectionnable et actif
        obj.hide_set(False)
        obj.hide_viewport = False
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)

        # Ajouter le modifier Decimate
        modifier = obj.modifiers.new(name="BatchDecimate", type='DECIMATE')
        modifier.decimate_type = 'COLLAPSE'
        modifier.ratio = effective_ratio

        # Préserver les UV et les normales custom
        modifier.use_collapse_triangulate = False

        # Appliquer le modifier
        try:
            bpy.ops.object.modifier_apply(modifier="BatchDecimate")
            decimated_count += 1
        except Exception as e:
            # Si l'application échoue (ex: mesh non-manifold), supprimer le modifier
            obj.modifiers.remove(modifier)
            print(f"  ⚠️ Impossible de décimer '{obj.name}': {e}")

        obj.select_set(False)

    return decimated_count, skipped_count


def import_glb(filepath):
    """Importe un fichier GLB/GLTF dans Blender."""
    ext = Path(filepath).suffix.lower()
    if ext in ('.glb', '.gltf'):
        bpy.ops.import_scene.gltf(filepath=filepath)
        return True
    return False


def export_glb(filepath):
    """Exporte la scène au format GLB/GLTF — compatible toutes versions Blender."""
    # S'assurer que le dossier de sortie existe
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    # Liste de configurations d'export du plus complet au plus basique
    # On essaie chaque configuration jusqu'à ce qu'une fonctionne
    export_configs = [
        # Config 1 : Complète avec Draco (Blender 3.4+)
        {
            'filepath': filepath,
            'check_existing': False,
            'export_format': OUTPUT_FORMAT,
            'export_texcoords': True,
            'export_normals': True,
            'export_colors': True,
            'export_materials': 'EXPORT',
            'export_animations': True,
            'export_skins': True,
            'export_morph': True,
            'export_draco_mesh_compression_enable': USE_DRACO_COMPRESSION,
            'export_draco_mesh_compression_level': 6,
            'export_draco_position_quantization': 14,
            'export_draco_normal_quantization': 10,
            'export_draco_texcoord_quantization': 12,
        },
        # Config 2 : Sans export_colors (Blender 3.0 - 3.3)
        {
            'filepath': filepath,
            'check_existing': False,
            'export_format': OUTPUT_FORMAT,
            'export_texcoords': True,
            'export_normals': True,
            'export_materials': 'EXPORT',
            'export_animations': True,
            'export_skins': True,
            'export_morph': True,
            'export_draco_mesh_compression_enable': USE_DRACO_COMPRESSION,
            'export_draco_mesh_compression_level': 6,
            'export_draco_position_quantization': 14,
            'export_draco_normal_quantization': 10,
            'export_draco_texcoord_quantization': 12,
        },
        # Config 3 : Sans Draco ni export_colors (Blender 2.8x)
        {
            'filepath': filepath,
            'check_existing': False,
            'export_format': OUTPUT_FORMAT,
            'export_texcoords': True,
            'export_normals': True,
            'export_materials': 'EXPORT',
            'export_animations': True,
            'export_skins': True,
            'export_morph': True,
        },
        # Config 4 : Minimale (fallback ultime)
        {
            'filepath': filepath,
            'check_existing': False,
            'export_format': OUTPUT_FORMAT,
        },
    ]

    for i, config in enumerate(export_configs):
        try:
            bpy.ops.export_scene.gltf(**config)
            if i > 0:
                print(f"  ℹ️  Export réussi avec config de compatibilité #{i + 1}")
            return True
        except (TypeError, RuntimeError, Exception) as e:
            error_msg = str(e)
            if 'unrecognized' in error_msg or 'keyword' in error_msg:
                # Paramètre non supporté par cette version, essayer la config suivante
                continue
            else:
                # Erreur différente, propager
                raise

    # Si aucune config ne fonctionne
    raise RuntimeError("Aucune configuration d'export compatible avec cette version de Blender")


def find_glb_files(folder, recursive=True):
    """Trouve tous les fichiers GLB/GLTF dans un dossier."""
    extensions = {'.glb', '.gltf'}
    files = []

    if recursive:
        for root, dirs, filenames in os.walk(folder):
            for filename in filenames:
                if Path(filename).suffix.lower() in extensions:
                    files.append(os.path.join(root, filename))
    else:
        for filename in os.listdir(folder):
            if Path(filename).suffix.lower() in extensions:
                files.append(os.path.join(folder, filename))

    return sorted(files)


def get_output_path(input_path, input_folder, output_folder):
    """Calcule le chemin de sortie en conservant la structure des dossiers."""
    if KEEP_FOLDER_STRUCTURE:
        rel_path = os.path.relpath(input_path, input_folder)
    else:
        rel_path = os.path.basename(input_path)

    # Forcer l'extension .glb si format GLB
    out_path = os.path.join(output_folder, rel_path)
    if OUTPUT_FORMAT == "GLB":
        out_path = str(Path(out_path).with_suffix('.glb'))

    return out_path


def format_size(size_bytes):
    """Formate une taille en bytes en format lisible."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.1f} MB"


def main():
    """Point d'entrée principal du script."""
    start_time = time.time()

    print("\n" + "=" * 70)
    print("  BLENDER BATCH DECIMATE — Réduction de polygones en masse")
    print("=" * 70)
    print(f"  Dossier d'entrée  : {INPUT_FOLDER}")
    print(f"  Dossier de sortie : {OUTPUT_FOLDER}")
    print(f"  Ratio par défaut  : {DECIMATE_RATIO} ({int(DECIMATE_RATIO * 100)}%)")
    print(f"  Seuil minimum     : {MIN_TRIANGLES_THRESHOLD} triangles")
    print(f"  Cible maximum     : {MAX_TRIANGLES_TARGET} triangles")
    print(f"  Compression Draco : {'Oui' if USE_DRACO_COMPRESSION else 'Non'}")
    print(f"  Récursif          : {'Oui' if RECURSIVE else 'Non'}")
    print("=" * 70)

    # Vérifier que le dossier d'entrée existe
    if not os.path.isdir(INPUT_FOLDER):
        print(f"\n❌ ERREUR : Le dossier d'entrée n'existe pas : {INPUT_FOLDER}")
        print("   Modifiez la variable INPUT_FOLDER en haut du script.")
        return

    # Trouver tous les fichiers
    files = find_glb_files(INPUT_FOLDER, RECURSIVE)
    if not files:
        print(f"\n❌ Aucun fichier .glb ou .gltf trouvé dans {INPUT_FOLDER}")
        return

    print(f"\n📁 {len(files)} fichier(s) trouvé(s) :\n")
    for f in files:
        size = os.path.getsize(f)
        print(f"  • {os.path.relpath(f, INPUT_FOLDER)} ({format_size(size)})")

    # Créer le dossier de sortie
    os.makedirs(OUTPUT_FOLDER, exist_ok=True)

    # Préparer le rapport CSV
    report_path = os.path.join(OUTPUT_FOLDER, "_rapport_decimation.csv")
    report_rows = []

    # Traiter chaque fichier
    total_tris_before = 0
    total_tris_after = 0
    total_size_before = 0
    total_size_after = 0
    success_count = 0
    error_count = 0

    for i, filepath in enumerate(files, 1):
        filename = os.path.relpath(filepath, INPUT_FOLDER)
        print(f"\n{'─' * 70}")
        print(f"  [{i}/{len(files)}] {filename}")
        print(f"{'─' * 70}")

        # Nettoyer la scène
        clear_scene()

        # Importer
        print(f"  📥 Import en cours...")
        try:
            import_glb(filepath)
        except Exception as e:
            print(f"  ❌ Erreur d'import : {e}")
            error_count += 1
            report_rows.append({
                'fichier': filename,
                'status': 'ERREUR',
                'erreur': str(e),
                'triangles_avant': 0,
                'triangles_apres': 0,
                'reduction': '0%',
                'taille_avant': '',
                'taille_apres': '',
            })
            continue

        # Compter les triangles avant
        tris_before = count_triangles()
        verts_before = count_vertices()
        size_before = os.path.getsize(filepath)
        print(f"  📊 Avant : {tris_before:,} triangles, {verts_before:,} vertices ({format_size(size_before)})")

        # Déterminer le ratio
        ratio = get_ratio_for_file(filepath)
        if ratio != DECIMATE_RATIO:
            keyword = [k for k in CATEGORY_RATIOS if k.lower() in filepath.lower()]
            print(f"  🎯 Ratio catégorie '{keyword[0]}' : {ratio} ({int(ratio * 100)}%)")
        else:
            print(f"  🎯 Ratio par défaut : {ratio} ({int(ratio * 100)}%)")

        # Appliquer la décimation
        if tris_before < MIN_TRIANGLES_THRESHOLD:
            print(f"  ⏭️  Sauté : déjà sous le seuil ({MIN_TRIANGLES_THRESHOLD} triangles)")
            decimated, skipped = 0, 0
        else:
            print(f"  ✂️  Décimation en cours...")
            decimated, skipped = apply_decimate(ratio, MAX_TRIANGLES_TARGET)
            print(f"  ✅ {decimated} objet(s) décimé(s), {skipped} sauté(s)")

        # Compter les triangles après
        tris_after = count_triangles()
        verts_after = count_vertices()

        reduction_pct = ((tris_before - tris_after) / max(tris_before, 1)) * 100

        print(f"  📊 Après : {tris_after:,} triangles, {verts_after:,} vertices")
        print(f"  📉 Réduction : {reduction_pct:.1f}% ({tris_before - tris_after:,} triangles supprimés)")

        # Exporter
        output_path = get_output_path(filepath, INPUT_FOLDER, OUTPUT_FOLDER)
        print(f"  📤 Export vers : {os.path.relpath(output_path, OUTPUT_FOLDER)}")

        try:
            export_glb(output_path)
            size_after = os.path.getsize(output_path)
            size_reduction = ((size_before - size_after) / max(size_before, 1)) * 100
            print(f"  💾 Taille : {format_size(size_before)} → {format_size(size_after)} ({size_reduction:.1f}% réduit)")
            success_count += 1

            total_tris_before += tris_before
            total_tris_after += tris_after
            total_size_before += size_before
            total_size_after += size_after

            report_rows.append({
                'fichier': filename,
                'status': 'OK',
                'erreur': '',
                'triangles_avant': tris_before,
                'triangles_apres': tris_after,
                'reduction': f"{reduction_pct:.1f}%",
                'taille_avant': format_size(size_before),
                'taille_apres': format_size(size_after),
            })
        except Exception as e:
            print(f"  ❌ Erreur d'export : {e}")
            error_count += 1
            report_rows.append({
                'fichier': filename,
                'status': 'ERREUR EXPORT',
                'erreur': str(e),
                'triangles_avant': tris_before,
                'triangles_apres': tris_after,
                'reduction': f"{reduction_pct:.1f}%",
                'taille_avant': format_size(size_before),
                'taille_apres': '',
            })

    # Générer le rapport CSV
    if report_rows:
        with open(report_path, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=[
                'fichier', 'status', 'triangles_avant', 'triangles_apres',
                'reduction', 'taille_avant', 'taille_apres', 'erreur'
            ])
            writer.writeheader()
            writer.writerows(report_rows)

    # Rapport final
    elapsed = time.time() - start_time
    total_reduction = ((total_tris_before - total_tris_after) / max(total_tris_before, 1)) * 100
    total_size_reduction = ((total_size_before - total_size_after) / max(total_size_before, 1)) * 100

    print("\n" + "=" * 70)
    print("  RAPPORT FINAL")
    print("=" * 70)
    print(f"  Fichiers traités  : {success_count}/{len(files)} (erreurs : {error_count})")
    print(f"  Triangles         : {total_tris_before:,} → {total_tris_after:,} ({total_reduction:.1f}% réduit)")
    print(f"  Taille fichiers   : {format_size(total_size_before)} → {format_size(total_size_after)} ({total_size_reduction:.1f}% réduit)")
    print(f"  Durée             : {elapsed:.1f} secondes")
    print(f"  Rapport CSV       : {report_path}")
    print(f"  Dossier sortie    : {OUTPUT_FOLDER}")
    print("=" * 70)
    print("\n✅ Terminé ! Vérifiez visuellement les fichiers optimisés dans Blender")
    print("   avant de les utiliser dans votre projet.\n")


# Lancer le script
if __name__ == "__main__":
    main()
