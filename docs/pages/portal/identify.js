// pages/portal/identify.js

import { PHASES }           from '../../config/event.js';
import { findParticipant }  from '../../data/participants.js';
import { esc, feedback, $ } from '../../components/ui.js';

export function renderIdentify(phase) {
  return `
  <div class="card fade-up" style="max-width:520px">
    <div class="card-body">
      <h2 style="margin-bottom:6px">Identifikation</h2>
      <p class="lead" style="margin-bottom:20px">${esc(PHASES[phase].desc)}</p>
      <div style="display:flex;gap:10px">
        <input type="text" id="lookup-input" placeholder="Bezugsnummer z. B. BZ-2026-002 oder Name"/>
        <button class="btn btn-primary" id="lookup-btn">Weiter →</button>
      </div>
      <div id="lookup-msg"></div>
    </div>
  </div>`;
}

export function attachIdentifyEvents(phase, onFound) {
  const btn = $('lookup-btn');
  const inp = $('lookup-input');
  const msg = $('lookup-msg');

  function doLookup() {
    const p = findParticipant(inp?.value ?? '');
    if (!p) {
      msg.innerHTML = feedback('Bezugsnummer nicht gefunden. Bitte prüfe die Schreibweise.');
      return;
    }
    onFound(p, phase === 'pre_event' ? 'selection' : 'checkin');
  }

  if (btn) btn.addEventListener('click', doLookup);
  if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') doLookup(); });
}
