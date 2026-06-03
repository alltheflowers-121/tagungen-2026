// config/event.js · TEMPLATE für neues Event
// Alle GROSSBUCHSTABEN-Werte ersetzen.
// Diese Datei in static/config/event.js des neuen Feature-Branches ablegen.

export const EVENT = {
  name:      'EVENT_NAME',
  short:     'EVENT_KURZNAME',
  date:      'DATUM',
  location:  'ORT',
  organizer: 'KBW e.V.',
  refPrefix: 'XX-JJJJ',
  cdnUrl:    'https://EVENTNAME.kbw.de',
};

export const PHASES = {
  pre_event: {
    label: 'Vorab-Auswahl',
    desc:  'BESCHREIBUNG_PRE_EVENT',
  },
  event_day: {
    label: 'Check-in',
    desc:  'BESCHREIBUNG_CHECKIN',
  },
};

export const FACHFOREN = [
  { id: 'forum-1', title: 'TITEL', sub: 'UNTERTITEL', room: 'RAUM', capacity: 100 },
];

export const PROGRAMMPUNKTE = [
  { id: 'prog-1', title: 'TITEL', time: 'HH:MM', capacity: null },
];

export const MAHLZEITEN         = ['Fleisch', 'Vegetarisch', 'Vegan'];
export const MAX_PROGRAMMPUNKTE = 5;
