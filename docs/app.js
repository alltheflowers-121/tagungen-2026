// app.js – zentraler State-Manager und Router

import { EVENT, PHASES }              from './config/event.js';
import { participants }               from './data/participants.js';
import { renderNav, stepBar }         from './components/nav.js';

import { renderDashboard }            from './pages/admin/dashboard.js';
import { renderParticipants, attachParticipantEvents } from './pages/admin/participants.js';

import { renderIdentify, attachIdentifyEvents }       from './pages/portal/identify.js';
import { renderSelection, attachSelectionEvents }     from './pages/portal/selection.js';
import { renderConfirmation, attachConfirmationEvents } from './pages/portal/confirmation.js';
import { renderCheckin, attachCheckinEvents }         from './pages/portal/checkin.js';
import { renderDone, attachDoneEvents }               from './pages/portal/done.js';

// ── State ────────────────────────────────────────────────────
const state = {
  view:      'admin',      // admin | portal
  adminTab:  'dashboard',
  adminSearch: '',
  phase:     'pre_event',  // pre_event | event_day
  step:      'identify',
  found:     null,         // aktuell gefundener Teilnehmer
  selection: null,         // laufende Vorab-Auswahl
};

const PRE_STEPS  = [
  { id: 'identify',     label: '1. Identifikation' },
  { id: 'selection',    label: '2. Vorab-Auswahl'  },
  { id: 'confirmation', label: '3. Bestätigung'    },
];
const DAY_STEPS  = [
  { id: 'identify', label: '1. Identifikation' },
  { id: 'checkin',  label: '2. Check-in'        },
  { id: 'done',     label: '3. Bestätigung'     },
];

// ── Render ───────────────────────────────────────────────────
function render() {
  renderNav(state, navigate);

  const root = document.getElementById('app-root');
  root.innerHTML = state.view === 'admin' ? renderAdminShell() : renderPortalShell();
  attachCurrentEvents();
}

function renderAdminShell() {
  const tabs = [
    { id: 'dashboard',    label: 'Dashboard' },
    { id: 'participants', label: 'Teilnehmende' },
  ];
  const tabBar = tabs.map(t =>
    `<button class="btn btn-sm ${state.adminTab === t.id ? 'btn-primary' : 'btn-secondary'} admin-tab" data-tab="${t.id}">${t.label}</button>`
  ).join('');

  const content = state.adminTab === 'dashboard'
    ? renderDashboard()
    : renderParticipants(state.adminSearch);

  return `
  <div style="display:grid;gap:24px">
    <div>
      <h1>${EVENT.name}</h1>
      <p class="lead">${EVENT.date} · ${EVENT.location}</p>
    </div>
    <div style="display:flex;gap:6px">${tabBar}</div>
    ${content}
  </div>`;
}

function renderPortalShell() {
  const steps = state.phase === 'pre_event' ? PRE_STEPS : DAY_STEPS;

  let content = '';
  switch (state.step) {
    case 'identify':     content = renderIdentify(state.phase);                          break;
    case 'selection':    content = renderSelection(state.found, state.selection);         break;
    case 'confirmation': content = renderConfirmation(state.found, state.selection);      break;
    case 'checkin':      content = renderCheckin(state.found);                            break;
    case 'done':         content = renderDone(state.found?.id);                           break;
  }

  return `
  <div style="display:grid;gap:24px">
    <div>
      <h1>${EVENT.name}</h1>
      <p class="lead">${PHASES[state.phase].desc}</p>
    </div>
    ${stepBar(steps, state.step)}
    ${content}
  </div>`;
}

// ── Events ───────────────────────────────────────────────────
function attachCurrentEvents() {
  // Admin tabs
  document.querySelectorAll('.admin-tab').forEach(btn =>
    btn.addEventListener('click', () => { state.adminTab = btn.dataset.tab; render(); })
  );

  if (state.view === 'admin') {
    if (state.adminTab === 'participants') {
      attachParticipantEvents(search => { state.adminSearch = search; render(); });
    }
    return;
  }

  // Portal steps
  const reset = () => { state.step = 'identify'; state.found = null; state.selection = null; render(); };

  switch (state.step) {
    case 'identify':
      attachIdentifyEvents(state.phase, (participant, nextStep) => {
        state.found = participant;
        state.selection = {
          participantId: participant.id,
          forum:     participant.forum,
          programme: [...participant.programme],
          meal:      participant.meal,
          lunch:     participant.lunch,
        };
        state.step = nextStep;
        render();
      });
      break;

    case 'selection':
      attachSelectionEvents(
        state.selection,
        sel => { state.selection = sel; state.step = 'confirmation'; render(); },
        ()  => { state.step = 'identify'; state.found = null; render(); }
      );
      break;

    case 'confirmation':
      attachConfirmationEvents(
        () => { state.step = 'selection'; render(); },
        reset
      );
      break;

    case 'checkin':
      attachCheckinEvents(
        state.found,
        () => { state.step = 'done'; render(); },
        () => { state.step = 'identify'; state.found = null; render(); }
      );
      break;

    case 'done':
      attachDoneEvents(reset);
      break;
  }
}

// ── Navigation ────────────────────────────────────────────────
function navigate(view, phase) {
  if (view)  { state.view = view; state.step = 'identify'; state.found = null; }
  if (phase) { state.phase = phase; state.step = 'identify'; state.found = null; }
  render();
}

// ── Start ─────────────────────────────────────────────────────
render();
