// pages/portal/selection.js

import { FACHFOREN, PROGRAMMPUNKTE, MAHLZEITEN, MAX_PROGRAMMPUNKTE } from '../../config/event.js';
import { participants, updateParticipant } from '../../data/participants.js';
import { esc, badge, feedback, summaryRow, $ } from '../../components/ui.js';

function spotsLeft(forumId) {
  const used = participants.filter(p => p.forum === forumId).length;
  return Math.max(0, (FACHFOREN.find(f => f.id === forumId)?.capacity ?? 0) - used);
}

function progSpotsLeft(progId) {
  const pp = PROGRAMMPUNKTE.find(p => p.id === progId);
  if (!pp?.capacity) return null;
  const used = participants.filter(p => p.programme.includes(progId)).length;
  return Math.max(0, pp.capacity - used);
}

export function renderSelection(participant, sel) {
  const forumOptions = FACHFOREN.map(f => {
    const spots = spotsLeft(f.id);
    const full  = spots <= 0;
    const isSel = sel.forum === f.id;
    return `
    <label class="option-row${isSel ? ' selected' : ''}${full && !isSel ? ' disabled' : ''}">
      <input type="radio" name="forum" value="${f.id}" ${isSel ? 'checked' : ''} ${full && !isSel ? 'disabled' : ''}>
      <div style="flex:1">
        <div style="font-weight:600">${esc(f.title)}</div>
        <div style="font-size:12px;color:var(--muted)">${esc(f.sub)} · ${esc(f.room)}</div>
      </div>
      ${badge(full ? 'Ausgebucht' : `${spots} Plätze`, full ? 'red' : spots < 20 ? 'amber' : 'outline')}
    </label>`;
  }).join('');

  const progOptions = PROGRAMMPUNKTE.map(pp => {
    const spots  = progSpotsLeft(pp.id);
    const full   = spots === 0;
    const isSel  = sel.programme.includes(pp.id);
    const maxed  = !isSel && sel.programme.length >= MAX_PROGRAMMPUNKTE;
    return `
    <label class="option-row${isSel ? ' selected' : ''}${(full || maxed) && !isSel ? ' disabled' : ''}">
      <input type="checkbox" name="prog" value="${pp.id}" ${isSel ? 'checked' : ''} ${(full || maxed) && !isSel ? 'disabled' : ''}>
      <div style="flex:1">
        <div style="font-weight:600">${esc(pp.title)}</div>
        <div style="font-size:12px;color:var(--muted)">
          ${pp.time ? pp.time + ' Uhr' : ''}
          ${spots !== null ? ' · ' + spots + ' Plätze' : ''}
        </div>
      </div>
    </label>`;
  }).join('');

  const mealOptions = MAHLZEITEN.map(m => `
    <label class="option-row${sel.meal === m ? ' selected' : ''}" style="flex:1;min-width:110px">
      <input type="radio" name="meal" value="${m}" ${sel.meal === m ? 'checked' : ''}>
      <span style="font-weight:500">${m}</span>
    </label>`).join('');

  const forumLabel = sel.forum ? (() => { const f = FACHFOREN.find(x => x.id === sel.forum); return f ? `${f.title} · ${f.sub}` : '—'; })() : '—';
  const progLabel  = sel.programme.length ? sel.programme.map(id => PROGRAMMPUNKTE.find(p => p.id === id)?.title).filter(Boolean).join(', ') : 'Keine Auswahl';

  return `
  <div class="grid-2" style="align-items:start">
    <div style="display:grid;gap:18px">

      <div class="card fade-up"><div class="card-body">
        <h3 style="margin-bottom:4px">Fachforum *</h3>
        <p class="lead" style="margin-bottom:16px">Bitte genau eines wählen. Verbindlich.</p>
        <div style="display:grid;gap:8px">${forumOptions}</div>
      </div></div>

      <div class="card fade-up"><div class="card-body">
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <h3>Rahmenprogramm</h3>
          <span class="mono" id="prog-counter">${sel.programme.length} / ${MAX_PROGRAMMPUNKTE}</span>
        </div>
        <p class="lead" style="margin-bottom:16px">Bis zu ${MAX_PROGRAMMPUNKTE} Punkte auswählbar.</p>
        <div style="display:grid;gap:8px">${progOptions}</div>
      </div></div>

      <div class="card fade-up"><div class="card-body">
        <h3 style="margin-bottom:4px">Verpflegung *</h3>
        <p class="lead" style="margin-bottom:14px">Gilt für alle Mahlzeiten des Tagungstags.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">${mealOptions}</div>
        <label class="option-row${sel.lunch ? ' selected' : ''}">
          <input type="checkbox" id="lunch-cb" ${sel.lunch ? 'checked' : ''}>
          <div>
            <div style="font-weight:600">Lunchpaket</div>
            <div style="font-size:12px;color:var(--muted)">Für die Mittagspause statt Buffet</div>
          </div>
        </label>
      </div></div>

      <div id="sel-msg"></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" id="back-identify">← Zurück</button>
        <button class="btn btn-primary" id="save-sel">Auswahl speichern →</button>
      </div>
    </div>

    <!-- Live-Zusammenfassung -->
    <div class="card fade-up" style="position:sticky;top:76px"><div class="card-body">
      <h3 style="margin-bottom:16px">Zusammenfassung</h3>
      ${summaryRow('Teilnehmer/in', `<strong>${esc(participant.name)}</strong><br/><span class="mono">${esc(participant.ref)} · ${esc(participant.org)}</span>`)}
      <div id="sum-forum">${summaryRow('Fachforum', forumLabel)}</div>
      <div id="sum-prog">${summaryRow('Programmpunkte', progLabel)}</div>
      <div id="sum-meal">${summaryRow('Verpflegung', (sel.meal || '—') + (sel.lunch ? ' · Lunchpaket' : ''))}</div>
    </div></div>
  </div>`;
}

export function attachSelectionEvents(sel, onSaved, onBack) {
  // Forum
  document.querySelectorAll('input[name=forum]').forEach(r =>
    r.addEventListener('change', () => {
      sel.forum = r.value;
      const f = FACHFOREN.find(x => x.id === r.value);
      $('sum-forum').innerHTML = summaryRow('Fachforum', f ? `${f.title} · ${f.sub}` : '—');
    })
  );

  // Programmpunkte
  document.querySelectorAll('input[name=prog]').forEach(cb =>
    cb.addEventListener('change', () => {
      if (cb.checked) { if (!sel.programme.includes(cb.value)) sel.programme.push(cb.value); }
      else { sel.programme = sel.programme.filter(x => x !== cb.value); }
      $('prog-counter').textContent = `${sel.programme.length} / ${MAX_PROGRAMMPUNKTE}`;
      const label = sel.programme.length
        ? sel.programme.map(id => PROGRAMMPUNKTE.find(p => p.id === id)?.title).filter(Boolean).join(', ')
        : 'Keine Auswahl';
      $('sum-prog').innerHTML = summaryRow('Programmpunkte', label);
      // max-Zustand aktualisieren
      document.querySelectorAll('input[name=prog]').forEach(c => {
        const row = c.closest('.option-row');
        if (!c.checked && sel.programme.length >= MAX_PROGRAMMPUNKTE) {
          row.classList.add('disabled'); c.disabled = true;
        } else if (!c.disabled || !c.checked) {
          row.classList.remove('disabled'); c.disabled = false;
        }
      });
    })
  );

  // Mahlzeit
  document.querySelectorAll('input[name=meal]').forEach(r =>
    r.addEventListener('change', () => {
      sel.meal = r.value;
      updateMealSum();
    })
  );
  const lunchCb = $('lunch-cb');
  if (lunchCb) lunchCb.addEventListener('change', () => { sel.lunch = lunchCb.checked; updateMealSum(); });

  function updateMealSum() {
    $('sum-meal').innerHTML = summaryRow('Verpflegung', (sel.meal || '—') + (sel.lunch ? ' · Lunchpaket' : ''));
  }

  // Speichern
  $('save-sel')?.addEventListener('click', () => {
    if (!sel.forum) { $('sel-msg').innerHTML = feedback('Bitte wähle ein Fachforum.'); return; }
    if (!sel.meal)  { $('sel-msg').innerHTML = feedback('Bitte wähle eine Verpflegungsoption.'); return; }
    updateParticipant(sel.participantId, { forum: sel.forum, programme: [...sel.programme], meal: sel.meal, lunch: sel.lunch });
    onSaved(sel);
  });

  $('back-identify')?.addEventListener('click', onBack);
}
