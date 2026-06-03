// config/event.js · feat/model-personaltage
// ─────────────────────────────────────────
// Jeder Branch hat seine eigene Kopie dieser Datei.
// Spiegelt den "event", "phases", "selections" Block aus api/event_config.json
// für den Browser (kein Backend-Zugriff auf JSON-Dateien bei statischen Seiten).

export const EVENT = {
  name:      'Personaltage® 2026',
  short:     'Personaltage® 2026',
  date:      '7.–9. Oktober 2026',
  location:  'PETER EDEL Berlin',
  organizer: 'KBW e.V.',
  refPrefix: 'PT-2026',
  cdnUrl:    'https://lohnpfaendung.kbw.de',
};

export const PHASES = {
  pre_event: {
    label: 'Vorab-Auswahl',
    desc:  'Fachforum, Programmpunkte und Verpflegung wählen – bis 6 Wochen vor der Tagung.',
  },
  event_day: {
    label: 'Check-in',
    desc:  'Anwesenheit am Veranstaltungstag mit Bezugsnummer bestätigen.',
  },
};

export const FACHFOREN = [
  { id: 'forum-1', title: 'Fachforum 1', sub: 'Digitale Bildung',         room: 'Saal A', capacity: 120 },
  { id: 'forum-2', title: 'Fachforum 2', sub: 'Führung und Organisation', room: 'Saal B', capacity: 100 },
  { id: 'forum-3', title: 'Fachforum 3', sub: 'Gesundheit und Arbeit',    room: 'Saal C', capacity:  80 },
  { id: 'forum-4', title: 'Fachforum 4', sub: 'KI und Verwaltung',        room: 'Saal D', capacity:  90 },
];

export const PROGRAMMPUNKTE = [
  { id: 'prog-1', title: 'Abendempfang',    time: '18:00', capacity: null },
  { id: 'prog-2', title: 'Stadtführung',    time: '14:00', capacity:   40 },
  { id: 'prog-3', title: 'Netzwerk-Dinner', time: '19:30', capacity:   80 },
  { id: 'prog-4', title: 'Kulturprogramm',  time: '16:00', capacity:   60 },
  { id: 'prog-5', title: 'Abschlussrunde',  time: '17:00', capacity: null },
];

export const MAHLZEITEN          = ['Fleisch', 'Vegetarisch', 'Vegan'];
export const MAX_PROGRAMMPUNKTE  = 5;
