// ─── API SERVICE ────────────────────────────────────────────────
const API = (() => {
  const BASE = window.PERGOLA_CONFIG.API_BASE_URL;

  async function get(path) {
    const res = await fetch(BASE + path, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  return {
    obtenerUltimo:   () => get('/api/sensor-data/latest'),
    obtenerHistorial:(limit=30) => get(`/api/sensor-data/history?limit=${limit}`),
    obtenerStats:    () => get('/api/sensor-data/stats'),
    obtenerEstado:   () => get('/api/status'),
  };
})();

window.API = API;
