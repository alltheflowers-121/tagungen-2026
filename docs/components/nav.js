// components/nav.js

export function renderNav(state, onNavigate) {
  const views = [
    { id: 'admin',  label: 'Admin' },
    { id: 'portal', label: 'Teilnehmendenportal' },
  ];

  const tabs = document.getElementById('nav-tabs');
  tabs.innerHTML = views
    .map(v => `<button class="nav-tab${state.view === v.id ? ' active' : ''}" data-view="${v.id}">${v.label}</button>`)
    .join('');

  tabs.querySelectorAll('.nav-tab').forEach(btn =>
    btn.addEventListener('click', () => onNavigate(btn.dataset.view))
  );

  // Phase-Umschalter (nur im Portal sichtbar)
  const phaseWrap = document.getElementById('phase-switch');
  if (state.view !== 'portal') {
    phaseWrap.innerHTML = '';
    return;
  }

  const phases = [
    { id: 'pre_event', label: 'Vorab-Auswahl' },
    { id: 'event_day', label: 'Check-in' },
  ];
  phaseWrap.innerHTML = phases
    .map(p => `<button class="btn btn-sm ${state.phase === p.id ? 'btn-primary' : 'btn-secondary'}" data-phase="${p.id}">${p.label}</button>`)
    .join('');

  phaseWrap.querySelectorAll('[data-phase]').forEach(btn =>
    btn.addEventListener('click', () => onNavigate(null, btn.dataset.phase))
  );
}

export function stepBar(steps, current) {
  const idx = steps.findIndex(s => s.id === current);
  return `
  <div class="steps">
    ${steps.map((s, i) => {
      const cls = s.id === current ? 'current' : i < idx ? 'done' : '';
      return `<div class="step ${cls}">${i < idx ? '✓ ' : ''}${s.label}</div>`;
    }).join('')}
  </div>`;
}
