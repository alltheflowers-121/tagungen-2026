// pages/portal/done.js

import { FACHFOREN } from '../../config/event.js';
import { participants } from '../../data/participants.js';
import { esc, $ } from '../../components/ui.js';

export function renderDone(participantId) {
  // Aktuellen Stand aus participants holen (nach updateParticipant)
  const p = participants.find(x => x.id === participantId);
  const f = FACHFOREN.find(x => x.id === p?.forum);

  return `
  <div class="card fade-up" style="max-width:440px;text-align:center"><div class="card-body" style="padding:36px">
    <div style="font-size:52px;margin-bottom:16px">✅</div>
    <h1 style="font-size:26px;margin-bottom:8px">Herzlich willkommen!</h1>
    <div style="font-size:22px;font-weight:700;color:var(--primary);margin-bottom:6px">${esc(p?.name ?? '')}</div>
    <div class="mono" style="margin-bottom:20px">${esc(p?.ref ?? '')}</div>
    ${f ? `
    <div style="display:inline-block;padding:12px 20px;background:var(--amber-bg);border:1px solid var(--amber-border);border-radius:10px;font-size:14px;font-weight:600;color:#7a5500;margin-bottom:24px">
      ${esc(f.title)}<br/>
      <span style="font-family:monospace;font-size:12px;font-weight:400">${esc(f.room)}</span>
    </div>` : ''}
    <br/>
    <button class="btn btn-secondary" id="restart">Nächste Person →</button>
  </div></div>`;
}

export function attachDoneEvents(onRestart) {
  $('restart')?.addEventListener('click', onRestart);
}
