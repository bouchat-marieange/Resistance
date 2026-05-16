#!/usr/bin/env node
/**
 * Compresse les GLB stockes dans scene_data/blobs/*.json
 *
 * Pour chaque blob JSON dont mimeType == "application/octet-stream" :
 *  1. Decode le base64 en fichier .glb temporaire
 *  2. Applique `gltf-transform optimize --compress draco`
 *  3. Re-encode le resultat en base64
 *  4. Overwrite le blob JSON en place (garde {id, data})
 *
 * Ne modifie ni les textures (images) ni les audios.
 * Les GLB Draco sont decodes par DRACOLoader cote client (deja present
 * dans room_1.html et editor.html, cdn jsdelivr three r128).
 *
 * Usage: node tools/compress-blob-glbs.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const BLOBS_DIR = path.join(__dirname, '..', 'scene_data', 'blobs');
const DRY_RUN = process.argv.includes('--dry-run');

function humanSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function extractDataURI(dataURI) {
    const match = dataURI.match(/^data:([^;]+);base64,(.+)$/s);
    if (!match) throw new Error('Invalid data URI');
    return { mime: match[1], buffer: Buffer.from(match[2], 'base64') };
}

function encodeDataURI(mime, buffer) {
    return `data:${mime};base64,${buffer.toString('base64')}`;
}

function compressGLB(inputPath, outputPath) {
    // --compress draco : geometrie Draco
    // --simplify false : ne pas decimer le mesh (eviter pertes visuelles)
    // --instance true  : GPU instancing
    // --texture-compress false : on ne touche pas aux textures (geree ailleurs)
    const cmd = [
        'npx', '--no-install', 'gltf-transform', 'optimize',
        `"${inputPath}"`, `"${outputPath}"`,
        '--compress', 'draco',
        '--simplify', 'false',
        '--texture-compress', 'false',
    ].join(' ');
    execSync(cmd, { stdio: 'pipe', cwd: path.join(__dirname, '..') });
}

function main() {
    const files = fs.readdirSync(BLOBS_DIR).filter(f => f.endsWith('.json'));
    console.log(`Scanning ${files.length} blob JSONs in scene_data/blobs/...`);
    if (DRY_RUN) console.log('[DRY RUN] No files will be modified.\n');

    let totalBefore = 0, totalAfter = 0, compressed = 0, skipped = 0, failed = 0;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'glb-compress-'));

    for (const fname of files) {
        const fullPath = path.join(BLOBS_DIR, fname);
        const sizeBefore = fs.statSync(fullPath).size;

        let blob;
        try {
            blob = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        } catch (e) {
            console.log(`  [SKIP] ${fname}: JSON parse error`);
            skipped++;
            continue;
        }

        if (!blob.data || typeof blob.data !== 'string') {
            console.log(`  [SKIP] ${fname}: no .data field`);
            skipped++;
            continue;
        }

        let extracted;
        try {
            extracted = extractDataURI(blob.data);
        } catch (e) {
            console.log(`  [SKIP] ${fname}: not a valid data URI`);
            skipped++;
            continue;
        }

        if (extracted.mime !== 'application/octet-stream') {
            skipped++;
            continue; // not a GLB (image/audio)
        }

        // GLB detection: first 4 bytes == "glTF"
        const magic = extracted.buffer.slice(0, 4).toString('ascii');
        if (magic !== 'glTF') {
            console.log(`  [SKIP] ${fname}: octet-stream but not a GLB (magic=${magic})`);
            skipped++;
            continue;
        }

        const baseName = path.basename(fname, '.json');
        const tmpIn = path.join(tmpDir, `${baseName}.in.glb`);
        const tmpOut = path.join(tmpDir, `${baseName}.out.glb`);
        fs.writeFileSync(tmpIn, extracted.buffer);

        const glbBefore = extracted.buffer.length;

        process.stdout.write(`  ${fname}  ${humanSize(sizeBefore)} `);
        try {
            compressGLB(tmpIn, tmpOut);
        } catch (e) {
            console.log(`[FAIL] gltf-transform: ${e.message.split('\n')[0]}`);
            failed++;
            continue;
        }

        const compressedBuf = fs.readFileSync(tmpOut);
        const glbAfter = compressedBuf.length;

        // If compression somehow inflated the file, keep original
        if (glbAfter >= glbBefore) {
            console.log(`[KEEP] compressed ${humanSize(glbAfter)} >= original ${humanSize(glbBefore)}`);
            skipped++;
            continue;
        }

        blob.data = encodeDataURI('application/octet-stream', compressedBuf);

        if (!DRY_RUN) {
            fs.writeFileSync(fullPath, JSON.stringify(blob));
        }

        const sizeAfter = DRY_RUN
            ? JSON.stringify(blob).length
            : fs.statSync(fullPath).size;

        totalBefore += sizeBefore;
        totalAfter += sizeAfter;
        compressed++;

        const gain = ((1 - sizeAfter / sizeBefore) * 100).toFixed(1);
        console.log(`-> ${humanSize(sizeAfter)} (-${gain}%)`);
    }

    fs.rmSync(tmpDir, { recursive: true, force: true });

    console.log(`\n=== RESULTS ===`);
    console.log(`Compressed: ${compressed}  Skipped: ${skipped}  Failed: ${failed}`);
    if (compressed > 0) {
        const gain = ((1 - totalAfter / totalBefore) * 100).toFixed(1);
        console.log(`Total: ${humanSize(totalBefore)} -> ${humanSize(totalAfter)} (-${gain}%)`);
    }
    if (DRY_RUN) console.log(`[DRY RUN] No files were written.`);
}

main();
