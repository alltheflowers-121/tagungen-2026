// pages/portal/confirmation.js

import { FACHFOREN, PROGRAMMPUNKTE } from '../../config/event.js';
import { esc, summaryRow, infoBox, $ } from '../../components/ui.js';

export function renderConfirmation(participant, sel) {
  const f    = FACHFOREN.find(x => x.id === sel.forum);
  const progs = sel.programme.map(id => PROGRAMMPUNKTE.find(p => p.id === id)?.title).filter(Boolean);

  return `
  <div class="card fade-up" style="max-width:520px"><div class="card-body">
    <div style="font-size:40px;margin-bottom:12px">✓</div>
    <h2 style="margin-bottom:6px">Vorab-Auswahl gespeichert</h2>
    <p class="lead" style="margin-bottom:24px">
      Vielen Dank, ${esc(participant.name.split(' ')[0])}. Deine Wahl ist gespeichert.
      Der Check-in erfolgt separat am Veranstaltungstag.
    </p>
    <div style="margin-bottom:20px">
      ${summaryRow('Bezugsnummer', `<span class="mono">${esc(participant.ref)}</span>`)}
      ${summaryRow('Fachforum',    f ? `${esc(f.title)} · ${esc(f.sub)}` : '—')}
      ${summaryRow('Programmpunkte', progs.length ? progs.map(esc).join(', ') : 'Keine')}
      ${summaryRow('Verpflegung', esc(sel.meal || '—') + (sel.lunch ? ' · Lunchpaket' : ''))}
    </div>
    ${infoBox(`Halte deine Bezugsnummer <strong style="font-family:monospace">${esc(participant.ref)}</strong> für den Check-in bereit.`)}
    <div style="display:flex;gap:8px;margin-top:20px">
      <button class="btn btn-secondary" id="back-sel">Auswahl ändern</button>
      <button class="btn btn-primary"   id="restart">Fertig</button>
    </div>
  </div></div>`;
}

export function attachConfirmationEvents(onBack, onRestart) {
  $('back-sel')?.addEventListener('click', onBack);
  $('restart')?.addEventListener('click', onRestart);
}
