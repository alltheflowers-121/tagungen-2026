// components/ui.js – wiederverwendbare UI-Bausteine

export const esc = s =>
  String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

export const $ = id => document.getElementById(id);

export function badge(text, type = 'outline') {
  return `<span class="badge badge-${type}">${esc(text)}</span>`;
}

export function statCard(label, value, icon) {
  return `
  <div class="card">
    <div class="card-sm" style="display:flex;justify-content:space-between;align-items:start">
      <div>
        <div class="label">${label}</div>
        <div class="stat-val">${value}</div>
      </div>
      <div style="font-size:24px;opacity:.65">${icon}</div>
    </div>
  </div>`;
}

export function progressBar(pct, color = 'var(--primary)') {
  return `
  <div class="progress-track">
    <div class="progress-fill" style="width:${pct}%;background:${color}"></div>
  </div>`;
}

export function summaryRow(label, value) {
  return `
  <div class="summary-row">
    <div class="slabel">${label}</div>
    <div class="sval">${value}</div>
  </div>`;
}

export function feedback(text, type = 'error') {
  return `<div class="feedback ${type}">${esc(text)}</div>`;
}

export function infoBox(html) {
  return `<div class="infobox">${html}</div>`;
}

export function nowTime() {
  return new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}
