/**
 * event_fields.jsx · feat/model-kbw
 *
 * Teilnehmendenportal der KBW Jahrestagung.
 * Zwei Phasen: Vorab-Auswahl (6 Wochen vor Event) + Check-in am Veranstaltungstag.
 *
 * Bindet sich in App.jsx ein:
 *   <Route path="/portal" element={<EventPortal />} />
 */

import { useState, useEffect } from 'react';
import CONFIG from '../../event_config.json';

const BASE = '/api';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ── Schritt-Indikator ─────────────────────────────────────────
function StepBar({ steps, current }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
      {steps.map((s, i) => {
        const idx = steps.findIndex((x) => x.id === current);
        const state = s.id === current ? 'current' : i < idx ? 'done' : 'pending';
        return (
          <div
            key={s.id}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 'var(--radius)',
              border: `1px solid ${state === 'current' ? 'var(--amber)' : 'var(--border)'}`,
              background: state === 'current'
                ? 'var(--amber-dim)'
                : state === 'done'
                ? 'var(--surface-2)'
                : 'var(--surface)',
              fontSize: 13,
              fontWeight: 500,
              color: state === 'current' ? 'var(--amber)' : state === 'done' ? 'var(--muted)' : 'var(--muted-2)',
            }}
          >
            {state === 'done' ? '✓ ' : ''}{s.label}
          </div>
        );
      })}
    </div>
  );
}

// ── Identifikations-Schritt ───────────────────────────────────
function StepIdentify({ phase, onFound }) {
  const [input, setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  async function lookup(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const participants = await apiFetch('/participants');
      const found = participants.find(
        (p) => p.reference_number?.toLowerCase() === input.trim().toLowerCase()
        || p.first_name?.toLowerCase().includes(input.trim().toLowerCase())
      );
      if (!found) throw new Error('Bezugsnummer nicht gefunden. Bitte prüfe die Schreibweise.');
      onFound(found);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const ph = CONFIG.phases[phase];

  return (
    <div className="card fade-up">
      <div style={{ padding: 28 }}>
        <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
          1. Identifikation
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>
          {ph.description}
        </div>

        <form onSubmit={lookup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
              {CONFIG.participant.id_label}
            </label>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={CONFIG.participant.id_placeholder}
              autoFocus
              required
              style={{ width: '100%', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}
            />
            <div style={{ fontSize: 11, color: 'var(--muted-2)', marginTop: 5, fontFamily: 'var(--font-mono)' }}>
              {CONFIG.participant.id_format_hint}
            </div>
          </div>

          {error && (
            <div style={{
              color: 'var(--red)', fontSize: 13,
              padding: '10px 14px',
              background: 'rgba(224,92,92,0.1)',
              borderRadius: 6,
              border: '1px solid rgba(224,92,92,0.2)',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !input.trim()}
            style={{ alignSelf: 'flex-start' }}
          >
            {loading ? 'Suche…' : 'Weiter →'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Vorab-Auswahl-Schritt ─────────────────────────────────────
function StepVorabauswahl({ participant, fachforen, programmpunkte, onSaved, onBack }) {
  const [forum, setForum]             = useState(participant.fachforum_option_id ?? null);
  const [programme, setProgramme]     = useState(participant.programmpunkte?.map((p) => p.option_id) ?? []);
  const [meal, setMeal]               = useState(participant.meal_preference ?? null);
  const [lunchPackage, setLunchPackage] = useState(participant.lunch_package ?? false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);

  const maxProg = CONFIG.selections.programmpunkte.max;

  function toggleProgramm(id) {
    setProgramme((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= maxProg) return prev; // max erreicht
      return [...prev, id];
    });
  }

  async function save(e) {
    e.preventDefault();
    if (!forum) return setError('Bitte wähle ein Fachforum.');
    if (!meal)  return setError('Bitte wähle eine Verpflegungsoption.');
    setError(null);
    setLoading(true);

    try {
      const forumObj = fachforen.find((f) => f.option_id === forum);
      const mealObj  = CONFIG.selections.verpflegung.options.find((m) => m.value === meal);
      const progObjs = programmpunkte.filter((p) => programme.includes(p.option_id));

      await apiFetch(`/participants/${participant.id}/selections`, {
        method: 'PUT',
        body: JSON.stringify({
          // Wir mappen auf die Core-API:
          // fachforum → session_ids (ein Eintrag)
          // programmpunkte → weitere session_ids
          session_ids:    [forumObj?.id, ...progObjs.map((p) => p.id)].filter(Boolean),
          // meal + lunchPackage → food_option_ids
          food_option_ids: [mealObj?.id].filter(Boolean),
          // KBW-spezifische Felder direkt patchen
          meal_preference: meal,
          lunch_package:   lunchPackage,
        }),
      });
      onSaved({ forum, programme, meal, lunchPackage });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const prog_cfg  = CONFIG.selections.programmpunkte;
  const forum_cfg = CONFIG.selections.fachforum;
  const meal_cfg  = CONFIG.selections.verpflegung;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
      {/* Linke Spalte: Formular */}
      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Fachforum */}
        <div className="card fade-up">
          <div style={{ padding: 24 }}>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
              {forum_cfg.label} *
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              {forum_cfg.description}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {fachforen.map((f) => {
                const spotsLeft = f.available_spots ?? f.capacity;
                const full = spotsLeft <= 0;
                return (
                  <label key={f.option_id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px',
                    border: `1px solid ${forum === f.option_id ? 'var(--amber)' : 'var(--border)'}`,
                    borderRadius: 8,
                    background: forum === f.option_id ? 'var(--amber-dim)' : 'var(--surface)',
                    cursor: full && forum !== f.option_id ? 'not-allowed' : 'pointer',
                    opacity: full && forum !== f.option_id ? 0.5 : 1,
                  }}>
                    <input
                      type="radio"
                      name="fachforum"
                      value={f.option_id}
                      checked={forum === f.option_id}
                      onChange={() => !full && setForum(f.option_id)}
                      disabled={full && forum !== f.option_id}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{f.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                        {f.subtitle} · {f.room}
                      </div>
                    </div>
                    <span className={`badge badge-${full ? 'red' : spotsLeft < 20 ? 'amber' : 'muted'}`}>
                      {full ? 'Ausgebucht' : `${spotsLeft} Plätze`}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Programmpunkte */}
        <div className="card fade-up">
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 700 }}>
                {prog_cfg.label}
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: programme.length >= maxProg ? 'var(--amber)' : 'var(--muted)' }}>
                {programme.length} / {maxProg}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              {prog_cfg.description}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {programmpunkte.map((p) => {
                const checked   = programme.includes(p.option_id);
                const maxed     = !checked && programme.length >= maxProg;
                return (
                  <label key={p.option_id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px',
                    border: `1px solid ${checked ? 'var(--amber)' : 'var(--border)'}`,
                    borderRadius: 8,
                    background: checked ? 'var(--amber-dim)' : 'var(--surface)',
                    cursor: maxed ? 'not-allowed' : 'pointer',
                    opacity: maxed ? 0.45 : 1,
                  }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleProgramm(p.option_id)}
                      disabled={maxed}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{p.title}</div>
                      {p.time_label && (
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                          {p.time_label} Uhr
                          {p.capacity && ` · ${p.available_spots ?? p.capacity} Plätze`}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Verpflegung + Lunchpaket */}
        <div className="card fade-up">
          <div style={{ padding: 24 }}>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
              {meal_cfg.label} *
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              {meal_cfg.description}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {meal_cfg.options.map((m) => (
                <label key={m.value} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 16px',
                  border: `1px solid ${meal === m.value ? 'var(--amber)' : 'var(--border)'}`,
                  borderRadius: 8,
                  background: meal === m.value ? 'var(--amber-dim)' : 'var(--surface)',
                  cursor: 'pointer',
                }}>
                  <input
                    type="radio"
                    name="meal"
                    value={m.value}
                    checked={meal === m.value}
                    onChange={() => setMeal(m.value)}
                  />
                  <span style={{ fontWeight: 500 }}>{m.title}</span>
                </label>
              ))}
            </div>

            {/* Lunchpaket */}
            <label style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px',
              border: `1px solid ${lunchPackage ? 'var(--amber)' : 'var(--border)'}`,
              borderRadius: 8,
              background: lunchPackage ? 'var(--amber-dim)' : 'var(--surface)',
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={lunchPackage}
                onChange={(e) => setLunchPackage(e.target.checked)}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{CONFIG.selections.lunchpacket.label}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {CONFIG.selections.lunchpacket.description}
                </div>
              </div>
            </label>
          </div>
        </div>

        {error && (
          <div style={{ color: 'var(--red)', fontSize: 13, padding: '10px 14px', background: 'rgba(224,92,92,0.1)', borderRadius: 6, border: '1px solid rgba(224,92,92,0.2)' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn btn-ghost" onClick={onBack}>← Zurück</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Wird gespeichert…' : 'Auswahl speichern →'}
          </button>
        </div>
      </form>

      {/* Rechte Spalte: Live-Zusammenfassung */}
      <div style={{ position: 'sticky', top: 24 }}>
        <div className="card fade-up">
          <div style={{ padding: 20 }}>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--muted)' }}>
              ZUSAMMENFASSUNG
            </div>

            <div style={{ fontSize: 12, color: 'var(--muted-2)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>Teilnehmer/in</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{participant.first_name} {participant.last_name}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginBottom: 16 }}>
              {participant.reference_number} · {participant.organization}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', marginBottom: 16 }} />

            <SummaryRow label="Fachforum" value={
              forum
                ? fachforen.find((f) => f.option_id === forum)?.title + ' · ' + fachforen.find((f) => f.option_id === forum)?.subtitle
                : '—'
            } />
            <SummaryRow label="Programmpunkte" value={
              programme.length === 0
                ? 'Keine Auswahl'
                : programmpunkte.filter((p) => programme.includes(p.option_id)).map((p) => p.title).join(', ')
            } />
            <SummaryRow label="Verpflegung" value={meal
              ? CONFIG.selections.verpflegung.options.find((m) => m.value === meal)?.title
              : '—'
            } />
            <SummaryRow label="Lunchpaket" value={lunchPackage ? 'Ja' : 'Nein'} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}

// ── Bestätigungs-Schritt (nach Vorab-Auswahl) ─────────────────
function StepVorabBestaetigung({ participant, selection, onRestart, onEdit }) {
  const { forum, programme, meal, lunchPackage } = selection;
  const mealLabel = CONFIG.selections.verpflegung.options.find((m) => m.value === meal)?.title ?? meal;

  return (
    <div className="card fade-up" style={{ maxWidth: 560 }}>
      <div style={{ padding: 28 }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>✓</div>
        <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
          Vorab-Auswahl gespeichert
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>
          Vielen Dank, {participant.first_name}. Deine Auswahl wurde gespeichert.
          Der Check-in erfolgt separat am Veranstaltungstag.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          <SummaryRow label="Bezugsnummer"    value={participant.reference_number} />
          <SummaryRow label="Fachforum"       value={forum} />
          <SummaryRow label="Programmpunkte"  value={programme.length > 0 ? programme.join(', ') : 'Keine'} />
          <SummaryRow label="Verpflegung"     value={`${mealLabel}${lunchPackage ? ' · Lunchpaket' : ''}`} />
        </div>

        <div style={{
          padding: '12px 16px',
          background: 'var(--amber-dim)',
          borderLeft: '3px solid var(--amber)',
          borderRadius: '0 6px 6px 0',
          fontSize: 13,
          color: 'var(--amber)',
          marginBottom: 24,
        }}>
          Bitte halte deine Bezugsnummer <strong style={{ fontFamily: 'var(--font-mono)' }}>{participant.reference_number}</strong> für den Check-in am Veranstaltungstag bereit.
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={onEdit}>Auswahl ändern</button>
          <button className="btn btn-primary" onClick={onRestart}>Fertig</button>
        </div>
      </div>
    </div>
  );
}

// ── Check-in-Schritt ──────────────────────────────────────────
function StepCheckin({ participant, onCheckedIn, onBack }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  async function confirm() {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch('/tickets/checkin', {
        method: 'POST',
        body: JSON.stringify({ token: participant.token }),
      });
      onCheckedIn(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const alreadyIn = participant.checked_in;

  return (
    <div className="card fade-up" style={{ maxWidth: 480 }}>
      <div style={{ padding: 28 }}>
        <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
          2. Check-in
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>
          {alreadyIn
            ? `Bereits eingecheckt um ${participant.checked_in_at?.slice(11, 16)}.`
            : 'Bitte bestätige deine Anwesenheit für die Tagung.'}
        </div>

        <div style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '16px 20px',
          marginBottom: 24,
        }}>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700 }}>
            {participant.first_name} {participant.last_name}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            {participant.reference_number} · {participant.organization}
          </div>
          {participant.fachforum_title && (
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10 }}>
              Fachforum: {participant.fachforum_title} · {participant.fachforum_subtitle}
            </div>
          )}
          {participant.meal_preference && (
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
              Verpflegung: {participant.meal_preference}
              {participant.lunch_package ? ' · Lunchpaket' : ''}
            </div>
          )}
        </div>

        {error && (
          <div style={{ color: 'var(--red)', fontSize: 13, padding: '10px 14px', background: 'rgba(224,92,92,0.1)', borderRadius: 6, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={onBack}>← Zurück</button>
          {!alreadyIn && (
            <button className="btn btn-primary" onClick={confirm} disabled={loading}>
              {loading ? '…' : '✓ Anwesenheit bestätigen'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Check-in-Bestätigung ──────────────────────────────────────
function StepCheckinBestaetigung({ participant, onRestart }) {
  return (
    <div className="card fade-up" style={{ maxWidth: 480 }}>
      <div style={{ padding: 28, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
        <div style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
          Herzlich willkommen!
        </div>
        <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, color: 'var(--amber)', marginBottom: 6 }}>
          {participant.first_name} {participant.last_name}
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>
          {CONFIG.checkin.success_message}
        </div>
        {participant.fachforum_room && (
          <div style={{
            padding: '12px 20px',
            background: 'var(--amber-dim)',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--amber)',
            marginBottom: 24,
          }}>
            Dein Fachforum: {participant.fachforum_title}<br />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              {participant.fachforum_room}
            </span>
          </div>
        )}
        <button className="btn btn-ghost" onClick={onRestart}>Neuen Check-in starten</button>
      </div>
    </div>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────
export default function EventPortal() {
  const [phase, setPhase]           = useState('pre_event'); // pre_event | event_day
  const [step, setStep]             = useState('identify');
  const [participant, setParticipant] = useState(null);
  const [fachforen, setFachforen]   = useState([]);
  const [programmpunkte, setProgrammpunkte] = useState([]);
  const [savedSelection, setSavedSelection] = useState(null);

  // Optionen beim Mount laden
  useEffect(() => {
    // Fachforen aus sessions-Endpunkt (gefiltert nach type=fachforum)
    apiFetch('/sessions').then((data) => {
      setFachforen(data.filter((s) => s.type === 'fachforum' || !s.type));
      setProgrammpunkte(data.filter((s) => s.type === 'programmpunkt'));
    }).catch(() => {
      // Fallback: Optionen direkt aus event_config.json
      setFachforen(CONFIG.selections.fachforum.options.map((o) => ({
        id: o.id, option_id: o.id, title: o.title,
        subtitle: o.subtitle, room: o.room, capacity: o.capacity,
        available_spots: o.capacity,
      })));
      setProgrammpunkte(CONFIG.selections.programmpunkte.options.map((o) => ({
        id: o.id, option_id: o.id, title: o.title,
        time_label: o.time, capacity: o.capacity,
        available_spots: o.capacity,
      })));
    });
  }, []);

  const PRE_STEPS   = [
    { id: 'identify',     label: '1. Identifikation' },
    { id: 'selection',    label: '2. Vorab-Auswahl'  },
    { id: 'confirmation', label: '3. Bestätigung'    },
  ];

  const EVENT_STEPS = [
    { id: 'identify',     label: '1. Identifikation' },
    { id: 'checkin',      label: '2. Check-in'       },
    { id: 'confirmation', label: '3. Bestätigung'    },
  ];

  const steps = phase === 'pre_event' ? PRE_STEPS : EVENT_STEPS;

  function reset() {
    setParticipant(null);
    setSavedSelection(null);
    setStep('identify');
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">
            {CONFIG.event.name}
          </div>
          <div className="page-sub">
            {CONFIG.event.date_label} · {CONFIG.event.location}
          </div>
        </div>

        {/* Phase-Umschalter */}
        <div style={{ display: 'flex', gap: 8 }}>
          {Object.entries(CONFIG.phases).map(([key, p]) => (
            <button
              key={key}
              className={`btn ${phase === key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => { setPhase(key); reset(); }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="page-body">
        <StepBar steps={steps} current={step} />

        {step === 'identify' && (
          <StepIdentify
            phase={phase}
            onFound={(p) => { setParticipant(p); setStep(phase === 'pre_event' ? 'selection' : 'checkin'); }}
          />
        )}

        {step === 'selection' && participant && (
          <StepVorabauswahl
            participant={participant}
            fachforen={fachforen}
            programmpunkte={programmpunkte}
            onSaved={(sel) => { setSavedSelection(sel); setStep('confirmation'); }}
            onBack={() => setStep('identify')}
          />
        )}

        {step === 'confirmation' && phase === 'pre_event' && participant && savedSelection && (
          <StepVorabBestaetigung
            participant={participant}
            selection={savedSelection}
            onRestart={reset}
            onEdit={() => setStep('selection')}
          />
        )}

        {step === 'checkin' && participant && (
          <StepCheckin
            participant={participant}
            onCheckedIn={() => setStep('confirmation')}
            onBack={() => setStep('identify')}
          />
        )}

        {step === 'confirmation' && phase === 'event_day' && participant && (
          <StepCheckinBestaetigung
            participant={participant}
            onRestart={reset}
          />
        )}
      </div>
    </div>
  );
}
