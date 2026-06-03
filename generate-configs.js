#!/usr/bin/env node
/**
 * generate-configs.js
 * Erzeugt für jede KBW-Tagung 2026 eine event_config.json
 * Ausführen: node generate-configs.js
 */

const fs   = require('fs');
const path = require('path');

// ── Alle Tagungen 2026 ────────────────────────────────────────
const EVENTS = [
  { name: 'Steuerrecht',              slug: 'steuerrecht',            prefix: 'SR',   date: '2026-06-09', label: '9. Juni 2026',               days: 1 },
  { name: 'Öffentliche Finanzen',     slug: 'oeffentliche-finanzen',  prefix: 'OF',   date: '2026-06-10', label: '10.–11. Juni 2026',           days: 2 },
  { name: 'Lohnpfändung',             slug: 'lohnpfaendung',          prefix: 'LP',   date: '2026-06-17', label: '17. Juni 2026',               days: 1 },
  { name: 'Vollstreckungsrecht',      slug: 'vollstreckungsrecht',    prefix: 'VR',   date: '2026-06-18', label: '18.–19. Juni 2026',           days: 2 },
  { name: 'Norddeutsche Führungstage',slug: 'fuehrungstage',          prefix: 'FT',   date: '2026-08-27', label: '27. August 2026',             days: 1 },
  { name: 'Personalvertretungsrecht', slug: 'personalvertretungsrecht',prefix: 'PVR', date: '2026-09-01', label: '1.–2. September 2026',        days: 2 },
  { name: 'Staatsangehörigkeitsrecht',slug: 'staatsangehoerigkeitsrecht',prefix:'STA',date: '2026-09-03', label: '3. September 2026',           days: 1 },
  { name: 'Insolvenzrecht',           slug: 'insolvenzrecht',         prefix: 'IR',   date: '2026-09-08', label: '8.–9. September 2026',        days: 2 },
  { name: 'Datenschutz',              slug: 'datenschutz',            prefix: 'DS',   date: '2026-09-10', label: '10. September 2026',          days: 1 },
  { name: 'Waffenrecht',              slug: 'waffenrecht',            prefix: 'WR',   date: '2026-09-15', label: '15.–16. September 2026',      days: 2 },
  { name: 'Gleichstellung',           slug: 'gleichstellung',         prefix: 'GS',   date: '2026-09-17', label: '17.–18. September 2026',      days: 2 },
  { name: 'Sozialrecht SGB IX',       slug: 'sozialrecht-sgb-ix',     prefix: 'S9',   date: '2026-09-23', label: '23. September 2026',          days: 1 },
  { name: 'Sozialrecht SGB XII',      slug: 'sozialrecht-sgb-xii',    prefix: 'S12',  date: '2026-09-24', label: '24.–25. September 2026',      days: 2 },
  { name: 'Personaltage®',            slug: 'personaltage',           prefix: 'PT',   date: '2026-10-07', label: '7.–9. Oktober 2026',          days: 3 },
  { name: 'Gemeinnützigkeitsrecht',   slug: 'gemeinnuetzigkeitsrecht',prefix: 'GNR',  date: '2026-11-04', label: '4. November 2026',            days: 1 },
  { name: 'Kindesunterhalt',          slug: 'kindesunterhalt',        prefix: 'KU',   date: '2026-11-11', label: '11.–12. November 2026',       days: 2 },
  { name: 'Betreuungsrecht',          slug: 'betreuungsrecht',        prefix: 'BTR',  date: '2026-11-19', label: '19. November 2026',           days: 1 },
  { name: 'Vormundschaft',            slug: 'vormundschaft',          prefix: 'VM',   date: '2026-11-25', label: '25. November 2026',           days: 1 },
  { name: 'Ausländerrecht',           slug: 'auslaenderrecht',        prefix: 'AR',   date: '2026-11-26', label: '26.–27. November 2026',       days: 2 },
  { name: 'Wirtschaftliche Jugendhilfe', slug: 'jugendhilfe',         prefix: 'JH',   date: '2026-12-02', label: '2. Dezember 2026',            days: 1 },
  { name: 'Beamtenrecht',             slug: 'beamtenrecht',           prefix: 'BER',  date: '2026-12-10', label: '10.–11. Dezember 2026',       days: 2 },
];

// ── End-Datum berechnen ───────────────────────────────────────
function endDate(startStr, days) {
  const d = new Date(startStr);
  d.setDate(d.getDate() + days - 1);
  return d.toISOString().slice(0, 10);
}

// ── Ref-Prefix aus Slug ───────────────────────────────────────
function refPrefix(prefix, year = 2026) {
  return `${prefix}-${year}`;
}

// ── Config erzeugen ───────────────────────────────────────────
function makeConfig(ev) {
  const end = endDate(ev.date, ev.days);
  const preCloseDate = new Date(ev.date);
  preCloseDate.setDate(preCloseDate.getDate() - 14);
  const preClose = preCloseDate.toISOString().slice(0, 10);
  const preOpenDate = new Date(ev.date);
  preOpenDate.setDate(preOpenDate.getDate() - 56); // 8 Wochen vorher
  const preOpen = preOpenDate.toISOString().slice(0, 10);

  return {
    _comment: `feat/model-${ev.slug} · KBW ${ev.name} 2026`,

    event: {
      name:             `${ev.name} 2026`,
      short_name:       `${ev.name} 2026`,
      date:             ev.date,
      date_label:       ev.label,
      location:         'PETER EDEL Berlin',
      organizer:        'KBW e.V.',
      reference_prefix: refPrefix(ev.prefix),
      reference_padding: 3,
    },

    bunny: {
      _comment:       'Eigene Pull Zone anlegen unter bunny.net → CDN',
      storage_zone:   `kbw-${ev.slug}`,
      storage_region: 'de',
      pull_zone_id:   'PULL_ZONE_ID_EINTRAGEN',
      cdn_url:        `https://${ev.slug}.kbw.de`,
      deploy_prefix:  '',
    },

    smtp: {
      from_name:      `KBW ${ev.name} 2026`,
      reply_to:       `service@kbw.de`,
      subject_prefix: `${ev.name} 2026`,
    },

    phases: {
      pre_event: {
        label:       'Vorab-Auswahl',
        description: `Wähle deine Programmpunkte und Verpflegung für die ${ev.name} 2026.`,
        opens_at:    preOpen,
        closes_at:   preClose,
        active:      true,
      },
      event_day: {
        label:       'Check-in',
        description: 'Bestätige deine Anwesenheit am Veranstaltungstag.',
        opens_at:    `${ev.date}T07:30:00`,
        closes_at:   `${end}T18:00:00`,
        active:      true,
      },
    },

    participant: {
      id_field:       'referenceNumber',
      id_label:       'Bezugsnummer',
      id_placeholder: `z. B. ${refPrefix(ev.prefix)}-001`,
      id_format:      `^${ev.prefix}-\\d{4}-\\d{3,4}$`,
      id_format_hint: `Format: ${ev.prefix}-JJJJ-NNN`,
      fields: [
        { key: 'name',            label: 'Name',          type: 'text',  required: true },
        { key: 'email',           label: 'E-Mail',        type: 'email', required: true },
        { key: 'organization',    label: 'Organisation',  type: 'text',  required: true },
        { key: 'referenceNumber', label: 'Bezugsnummer',  type: 'text',  required: true, readonly: true },
      ],
    },

    selections: {
      programmpunkte: {
        label:       'Programmpunkte',
        description: 'Wähle die Programmpunkte aus, die dich interessieren.',
        type:        'multi',
        required:    false,
        min: 0, max: 10,
        db_table:    'programmpunkte',
        options:     [],  // → aus Tagungsprogramm befüllen
      },
      verpflegung: {
        label:       'Verpflegung',
        description: 'Deine Auswahl gilt für alle Mahlzeiten des Tagungstags.',
        type:        'single',
        required:    true,
        min: 1, max: 1,
        db_table:    'food_options',
        options: [
          { id: 'meal-1', title: 'Fleisch',     value: 'fleisch'     },
          { id: 'meal-2', title: 'Vegetarisch', value: 'vegetarisch' },
          { id: 'meal-3', title: 'Vegan',       value: 'vegan'       },
        ],
      },
      lunchpacket: {
        label:       'Lunchpaket',
        description: 'Lunchpaket für die Mittagspause (statt Buffet).',
        type:        'boolean',
        required:    false,
        db_column:   'lunch_package',
        default:     false,
      },
    },

    checkin: {
      method:            'referenceNumber',
      allow_manual:      true,
      allow_qr:          true,
      duplicate_message: 'Diese Bezugsnummer wurde bereits eingecheckt.',
      success_message:   'Herzlich willkommen! Ihre Anwesenheit wurde bestätigt.',
    },

    exports: {
      catering:    { columns: ['referenceNumber','name','organization','verpflegung','lunch_package'], label: 'Catering-Liste'   },
      anwesenheit: { columns: ['referenceNumber','name','organization','status','checked_in_at'],      label: 'Anwesenheitsliste' },
    },
  };
}

// ── Alle Configs schreiben ────────────────────────────────────
const outDir = path.join(__dirname, 'configs');
fs.mkdirSync(outDir, { recursive: true });

for (const ev of EVENTS) {
  const config = makeConfig(ev);
  const file   = path.join(outDir, `event_config.${ev.slug}.json`);
  fs.writeFileSync(file, JSON.stringify(config, null, 2));
  console.log(`✓  configs/event_config.${ev.slug}.json`);
}

console.log(`\n✅  ${EVENTS.length} Configs generiert in configs/`);
