// pages/admin/dashboard.js

import { FACHFOREN, MAHLZEITEN } from '../../config/event.js';
import { participants, stats }   from '../../data/participants.js';
import { esc, statCard, progressBar } from '../../components/ui.js';

export function renderDashboard() {
  const s = stats();

  const forumBars = FACHFOREN.map(f => {
    const booked = participants.filter(p => p.forum === f.id).length;
    const pct    = Math.round(booked / f.capacity * 100);
    const color  = pct >= 100 ? '#ef4444' : pct > 80 ? 'var(--amber)' : 'var(--primary)';
    return `
    <div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:13px">${esc(f.title)} · ${esc(f.sub)}</span>
        <span class="mono">${booked}/${f.capacity}</span>
      </div>
      <div class="progress-track" style="height:6px">
        <div class="progress-fill" style="width:${pct}%;background:${color}"></div>
      </div>
    </div>`;
  }).join('');

  const mealRows = MAHLZEITEN.map(m => {
    const cnt = participants.filter(p => p.meal === m).length;
    const pct = s.total ? Math.round(cnt / s.total * 100) : 0;
    return `
    <div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:14px">${m}</span>
        <span class="mono">${cnt} · ${pct}%</span>
      </div>
      ${progressBar(pct)}
    </div>`;
  }).join('');

  return `
  <div style="display:grid;gap:20px">
    <div class="grid-4">
      ${statCard('Angemeldet',   s.total,     '👥')}
      ${statCard('Eingecheckt',  s.checkedIn, '✅')}
      ${statCard('Noch offen',   s.pending,   '⏳')}
      ${statCard('Lunchpakete',  s.lunch,     '🥪')}
    </div>
    <div class="grid-2">
      <div class="card"><div class="card-body">
        <h3 style="margin-bottom:6px">Check-in Fortschritt</h3>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span class="mono">${s.checkedIn} von ${s.total} Personen</span>
          <strong>${s.pct}%</strong>
        </div>
        ${progressBar(s.pct)}
        <div style="margin-top:20px;display:grid;gap:12px">${forumBars}</div>
      </div></div>
      <div class="card"><div class="card-body">
        <h3 style="margin-bottom:16px">Verpflegung</h3>
        ${mealRows}
        <div style="padding:10px 14px;background:#f9fafb;border-radius:10px;font-size:13px;margin-top:4px">
          Lunchpakete gesamt: <strong>${s.lunch}</strong>
        </div>
      </div></div>
    </div>
  </div>`;
}
