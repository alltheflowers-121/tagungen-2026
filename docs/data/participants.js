// data/participants.js
// Demo-Daten – für Produktivbetrieb durch API-Calls ersetzen:
//   export async function loadParticipants() {
//     const res = await fetch('/api/participants', { credentials: 'include' });
//     return res.json();
//   }

export let participants = [
  { id:'p1', ref:'PT-2026-001', name:'Max Mustermann',  org:'Beispiel GmbH',    status:'checked_in', checkedAt:'08:54', meal:'Vegetarisch', lunch:true,  forum:'forum-1', programme:['prog-1','prog-3'] },
  { id:'p2', ref:'PT-2026-002', name:'Sofia Becker',    org:'KBW',              status:'pending',    checkedAt:null,    meal:'Vegan',       lunch:false, forum:'forum-2', programme:['prog-2'] },
  { id:'p3', ref:'PT-2026-003', name:'Daniel Yilmaz',   org:'Senatsverwaltung', status:'pending',    checkedAt:null,    meal:'Fleisch',     lunch:true,  forum:null,      programme:[] },
  { id:'p4', ref:'PT-2026-004', name:'Laura König',     org:'Bildungspartner',  status:'checked_in', checkedAt:'09:07', meal:'Vegetarisch', lunch:false, forum:'forum-4', programme:['prog-4','prog-5'] },
  { id:'p5', ref:'PT-2026-005', name:'Nina Hartmann',   org:'KBW',              status:'pending',    checkedAt:null,    meal:'Vegan',       lunch:false, forum:'forum-3', programme:['prog-1'] },
  { id:'p6', ref:'PT-2026-006', name:'Thomas Weber',    org:'Stadt Frankfurt',  status:'pending',    checkedAt:null,    meal:'Fleisch',     lunch:false, forum:'forum-2', programme:['prog-3'] },
];

export function findParticipant(input) {
  const q = input.trim().toLowerCase();
  return participants.find(p =>
    p.ref.toLowerCase() === q ||
    p.name.toLowerCase().includes(q)
  ) || null;
}

export function updateParticipant(id, patch) {
  participants = participants.map(p => p.id === id ? { ...p, ...patch } : p);
}

export function stats() {
  const total     = participants.length;
  const checkedIn = participants.filter(p => p.status === 'checked_in').length;
  const lunch     = participants.filter(p => p.lunch).length;
  const pct       = total ? Math.round(checkedIn / total * 100) : 0;
  return { total, checkedIn, pending: total - checkedIn, pct, lunch };
}
