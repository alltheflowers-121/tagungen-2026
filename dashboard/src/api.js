const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  // Tickets-Endpunkt liefert Bild → kein JSON parsen
  const ct = res.headers.get('Content-Type') || '';
  if (ct.includes('application/json')) return res.json();
  return res;
}

// ── Participants ──────────────────────────────────────────────
export const getParticipants = () => request('/participants');
export const getParticipant  = (id) => request(`/participants/${id}`);
export const createParticipant = (data) =>
  request('/participants', { method: 'POST', body: JSON.stringify(data) });

// ── Sessions ──────────────────────────────────────────────────
export const getSessions    = () => request('/sessions');
export const getFoodOptions = () => request('/food-options');

// ── Selections ────────────────────────────────────────────────
export const saveSelections = (id, data) =>
  request(`/participants/${id}/selections`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

// ── Tickets ───────────────────────────────────────────────────
export const getTicketJson = (token) =>
  request(`/tickets/${token}?format=json`);

export const checkin = (token) =>
  request('/tickets/checkin', {
    method: 'POST',
    body: JSON.stringify({ token }),
    headers: { 'x-api-key': import.meta.env.VITE_CHECKIN_API_KEY || '' },
  });

// ── E-Mail ────────────────────────────────────────────────────
export const sendTicketEmail = (participantId) =>
  request(`/email/ticket/${participantId}`, { method: 'POST' });

export const sendTicketBulk = (participant_ids) =>
  request('/email/ticket-bulk', {
    method: 'POST',
    body: JSON.stringify({ participant_ids }),
  });

// ── Dashboard stats (aggregiert aus vorhandenen Endpunkten) ───
export async function getDashboardStats() {
  const [participants, sessions] = await Promise.all([
    getParticipants(),
    getSessions(),
  ]);

  const checkedIn = participants.filter(
    (p) => p.checked_in  // falls Ticket-Status mit ausgegeben wird
  ).length;

  const totalCapacity = sessions.reduce((s, r) => s + Number(r.capacity), 0);
  const totalBooked   = sessions.reduce(
    (s, r) => s + (Number(r.capacity) - Number(r.available_spots || r.capacity)),
    0
  );

  return {
    totalParticipants: participants.length,
    totalSessions: sessions.length,
    totalCapacity,
    totalBooked,
    checkedIn,
    participants,
    sessions,
  };
}
