#!/usr/bin/env node
/**
 * deploy.js – Static-Site zu Bunny CDN deployen
 *
 * Liest alle Zugangsdaten aus ../api/event_config.json → bunny
 * Kein manuelles Umschalten zwischen Events nötig:
 * Jeder Branch hat seine eigene event_config.json mit eigener Pull Zone.
 *
 * Verwendung:
 *   node deploy.js              → baut und deployed
 *   node deploy.js --dry-run   → zeigt nur was deployed würde
 *   node deploy.js --purge-only → nur Cache leeren, kein Upload
 *
 * Voraussetzungen:
 *   BUNNY_STORAGE_KEY  in .env  (Storage-Passwort der Zone)
 *   BUNNY_API_KEY      in .env  (Account-API-Key für Purge)
 *   ../api/event_config.json    (bunny.storage_zone, bunny.pull_zone_id, bunny.cdn_url)
 */

require('dotenv').config();
const fs           = require('fs');
const path         = require('path');
const { execSync } = require('child_process');

// ── Konfiguration aus event_config.json lesen ────────────────
const configPath = path.resolve(__dirname, '../api/event_config.json');
if (!fs.existsSync(configPath)) {
  console.error('❌  ../api/event_config.json nicht gefunden.');
  process.exit(1);
}
const config  = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const bunny   = config.bunny;
const event   = config.event;

const ZONE        = bunny.storage_zone;
const REGION      = bunny.storage_region || 'storage';
const PULL_ZONE   = bunny.pull_zone_id;
const CDN_URL     = (bunny.cdn_url || '').replace(/\/$/, '');
const PREFIX      = bunny.deploy_prefix || '';           // z.B. '' oder 'app'
const STORAGE_KEY = process.env.BUNNY_STORAGE_KEY;
const API_KEY     = process.env.BUNNY_API_KEY;
const DRY_RUN     = process.argv.includes('--dry-run');
const PURGE_ONLY  = process.argv.includes('--purge-only');

// ── Validierung ───────────────────────────────────────────────
const missing = [];
if (!ZONE)        missing.push('bunny.storage_zone in event_config.json');
if (!CDN_URL)     missing.push('bunny.cdn_url in event_config.json');
if (!STORAGE_KEY) missing.push('BUNNY_STORAGE_KEY in .env');
if (missing.length) {
  console.error('❌  Fehlende Konfiguration:\n' + missing.map(m => '   • ' + m).join('\n'));
  process.exit(1);
}

// ── MIME-Types ────────────────────────────────────────────────
const MIME = {
  '.html':  'text/html; charset=utf-8',
  '.js':    'application/javascript',
  '.css':   'text/css',
  '.json':  'application/json',
  '.svg':   'image/svg+xml',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.webp':  'image/webp',
  '.ico':   'image/x-icon',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.txt':   'text/plain',
};
const mime = f => MIME[path.extname(f)] || 'application/octet-stream';

// ── Alle Dateien rekursiv sammeln ─────────────────────────────
function walk(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full, base) : [{ full, rel: path.relative(base, full).replace(/\\/g, '/') }];
  });
}

// ── Upload zu Bunny Storage ───────────────────────────────────
async function upload(storagePath, filePath, contentType) {
  const data = fs.readFileSync(filePath);
  const url  = `https://${REGION}.bunnycdn.com/${ZONE}/${storagePath}`;
  const res  = await fetch(url, {
    method:  'PUT',
    headers: {
      AccessKey:        STORAGE_KEY,
      'Content-Type':   contentType,
      'Content-Length': String(data.length),
    },
    body: data,
  });
  if (!res.ok) throw new Error(`Upload [${res.status}]: ${storagePath}`);
}

// ── Cache der Pull Zone leeren ────────────────────────────────
async function purgeCache() {
  if (!API_KEY || !PULL_ZONE) {
    console.warn('⚠  BUNNY_API_KEY oder pull_zone_id fehlt → Cache nicht geleert');
    return;
  }
  const res = await fetch(`https://api.bunny.net/pullzone/${PULL_ZONE}/purgeCache`, {
    method:  'POST',
    headers: { AccessKey: API_KEY, 'Content-Type': 'application/json' },
    body:    '{}',
  });
  if (!res.ok) console.warn(`⚠  Purge fehlgeschlagen: ${res.status}`);
  else         console.log('✓  Cache geleert');
}

// ── Hauptprogramm ─────────────────────────────────────────────
(async () => {
  console.log('\n┌─────────────────────────────────────────────');
  console.log(`│  KBW Tagungsapp · Deploy`);
  console.log(`│  Event:    ${event.name}`);
  console.log(`│  Zone:     ${ZONE} (${REGION})`);
  console.log(`│  CDN-URL:  ${CDN_URL}`);
  if (PREFIX) console.log(`│  Prefix:   /${PREFIX}`);
  if (DRY_RUN)    console.log('│  ⚠ DRY RUN – nichts wird hochgeladen');
  if (PURGE_ONLY) console.log('│  ⚠ PURGE ONLY – kein Upload');
  console.log('└─────────────────────────────────────────────\n');

  // ── Nur Cache leeren ──────────────────────────────────────
  if (PURGE_ONLY) {
    console.log('🔄  Cache wird geleert…');
    await purgeCache();
    return;
  }

  // ── Build ─────────────────────────────────────────────────
  const staticDir = path.join(__dirname, '../static');
  if (!fs.existsSync(staticDir)) {
    console.error(`❌  Ordner nicht gefunden: ${staticDir}`);
    process.exit(1);
  }

  const files = walk(staticDir);
  console.log(`📦  ${files.length} Dateien aus static/ werden${DRY_RUN ? ' geprüft' : ' hochgeladen'}…\n`);

  let ok = 0, fail = 0;
  for (const { full, rel } of files) {
    const storagePath = PREFIX ? `${PREFIX}/${rel}` : rel;
    const ct = mime(full);

    if (DRY_RUN) {
      console.log(`  → ${storagePath}  (${ct})`);
      ok++;
      continue;
    }

    try {
      await upload(storagePath, full, ct);
      console.log(`  ✓  ${storagePath}`);
      ok++;
    } catch (e) {
      console.error(`  ✗  ${storagePath}: ${e.message}`);
      fail++;
    }
  }

  console.log(`\n${DRY_RUN ? '📋' : '✅'}  ${ok} Dateien ${DRY_RUN ? 'gefunden' : 'hochgeladen'}${fail ? `, ${fail} Fehler` : ''}`);

  if (!DRY_RUN) {
    console.log('\n🔄  Cache wird geleert…');
    await purgeCache();
    console.log(`\n🌐  Live unter: ${CDN_URL}${PREFIX ? '/' + PREFIX : ''}/\n`);
  }
})();
