// pages/portal/checkin.js

import { FACHFOREN }                 from '../../config/event.js';
import { updateParticipant }         from '../../data/participants.js';
import { esc, badge, nowTime, $ }    from '../../components/ui.js';

export function renderCheckin(participant) {
  const f       = FACHFOREN.find(x => x.id === participant.forum);
  const already = participant.status === 'checked_in';

  return `
  <div class="card fade-up" style="max-width:480px"><div class="card-body">
    <h2 style="margin-bottom:6px">Check-in bestätigen</h2>
    <p class="lead" style="margin-bottom:20px">
      ${already ? `Bereits eingecheckt um ${esc(participant.checkedAt || '—')}.` : 'Bitte Anwesenheit für die Tagung bestätigen.'}
    </p>
    <div style="background:#f9fafb;border:1px solid var(--border);border-radius:12px;padding:16px 20px;margin-bottom:20px">
      <div style="font-size:22px;font-weight:700;letter-spacing:-.02em">${esc(participant.name)}</div>
      <div class="mono" style="margin-top:4px">${esc(participant.ref)} · ${esc(participant.org)}</div>
      ${f ? `<div style="font-size:13px;color:var(--muted);margin-top:10px">${esc(f.title)} · ${esc(f.room)}</div>` : ''}
      ${participant.meal ? `<div style="font-size:13px;color:var(--muted);margin-top:4px">${esc(participant.meal)}${participant.lunch ? ' · Lunchpaket' : ''}</div>` : ''}
    </div>
    ${already ? `<div class="feedback success">Bereits eingecheckt um ${esc(participant.checkedAt || '—')}.</div>` : ''}
    <div style="display:flex;gap:8px;margin-top:16px">
      <button class="btn btn-secondary" id="back-identify">← Zurück</button>
      ${!already ? `<button class="btn btn-amber" id="confirm-ci">✓ Anwesenheit bestätigen</button>` : ''}
    </div>
  </div></div>`;
}

export function attachCheckinEvents(participant, onDone, onBack) {
  $('back-identify')?.addEventListener('click', onBack);
  $('confirm-ci')?.addEventListener('click', () => {
    updateParticipant(participant.id, { status: 'checked_in', checkedAt: nowTime() });
    onDone();
  });
}
