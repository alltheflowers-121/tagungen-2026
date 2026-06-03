// pages/admin/participants.js

import { FACHFOREN }             from '../../config/event.js';
import { participants, stats, updateParticipant } from '../../data/participants.js';
import { esc, badge, nowTime }   from '../../components/ui.js';

function forumById(id) { return FACHFOREN.find(f => f.id === id); }

export function renderParticipants(search = '') {
  const filtered = participants.filter(p => {
    const q = search.toLowerCase();
    return !q || [p.name, p.ref, p.org, p.meal].some(v => String(v ?? '').toLowerCase().includes(q));
  });

  const rows = filtered.map(p => {
    const f       = forumById(p.forum);
    const checked = p.status === 'checked_in';
    return `
    <tr>
      <td><span class="mono">${esc(p.ref)}</span></td>
      <td>
        <strong>${esc(p.name)}</strong><br/>
        <span class="mono">${esc(p.org)}</span>
      </td>
      <td style="font-size:13px">
        ${f ? `${esc(f.title)}<br/><span class="mono">${esc(f.room)}</span>` : '—'}
      </td>
      <td>
        ${esc(p.meal || '—')}
        ${p.lunch ? ' · ' + badge('Lunchpaket', 'amber') : ''}
      </td>
      <td>
        ${checked
          ? badge('Eingecheckt ' + esc(p.checkedAt || ''), 'green')
          : badge('Offen', 'outline')}
      </td>
      <td>
        <button class="btn btn-sm btn-secondary manual-ci" data-id="${p.id}" ${checked ? 'disabled' : ''}>
          ${checked ? '✓ Erfasst' : 'Einchecken'}
        </button>
      </td>
    </tr>`;
  }).join('');

  return `
  <div class="card"><div class="card-body">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:20px">
      <h2>Teilnehmerliste <span class="mono" style="font-size:14px">(${filtered.length})</span></h2>
      <div style="display:flex;gap:8px;flex:1;max-width:380px">
        <input type="search" id="search-input" value="${esc(search)}" placeholder="Name, Bezugsnummer, Organisation …"/>
        <button class="btn btn-sm btn-secondary" id="export-csv">⬇ CSV</button>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Bezugsnummer</th><th>Name</th><th>Fachforum</th>
          <th>Verpflegung</th><th>Status</th><th>Aktion</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div></div>`;
}

export function attachParticipantEvents(onSearchChange) {
  const si = document.getElementById('search-input');
  if (si) si.addEventListener('input', e => onSearchChange(e.target.value));

  document.querySelectorAll('.manual-ci').forEach(btn =>
    btn.addEventListener('click', () => {
      updateParticipant(btn.dataset.id, { status: 'checked_in', checkedAt: nowTime() });
      onSearchChange(si?.value ?? '');
    })
  );

  const exportBtn = document.getElementById('export-csv');
  if (exportBtn) exportBtn.addEventListener('click', exportCSV);
}

function exportCSV() {
  const rows = [['Bezugsnummer','Name','Organisation','Fachforum','Verpflegung','Lunchpaket','Status','Eingecheckt']];
  participants.forEach(p => {
    const f = forumById(p.forum);
    rows.push([
      p.ref, p.name, p.org,
      f ? `${f.title} – ${f.sub}` : '',
      p.meal || '', p.lunch ? 'Ja' : 'Nein',
      p.status === 'checked_in' ? 'Eingecheckt' : 'Offen',
      p.checkedAt || '',
    ]);
  });
  const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const a   = document.createElement('a');
  a.href    = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
  a.download = 'ATagung-2026-Export.csv';
  a.click();
}
