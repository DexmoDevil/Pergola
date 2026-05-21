// ─── APP PRINCIPAL ───────────────────────────────────────────────
const App = (() => {
  const CFG = window.PERGOLA_CONFIG;
  const RANGOS = CFG.RANGOS;

  let pollingInterval = null;
  let historialCargado = false;
  let ultimoDatoLocal = null;
  let ultimoTimestamp = null;
  let sectoresInicializados = {};

  // ── Navegación ───────────────────────────────────────────────
  function initNav() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        const section = item.dataset.section;
        navegarA(section);
      });
    });

    document.getElementById('menuToggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    navegarA('dashboard');
  }

  function navegarA(section) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.querySelector(`[data-section="${section}"]`)?.classList.add('active');

    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(`section-${section}`)?.classList.add('active');

    const titulos = {
      dashboard:   'Dashboard Principal',
      graficas:    'Gráficas en Tiempo Real',
      calculadora: 'Calculadora Ambiental',
      vista3d:     'Vista 3D — Pérgola',
      mapa:        'Ubicación de la Pérgola'
    };
    document.getElementById('pageTitle').textContent = titulos[section] || section;

    // Inicializar módulos bajo demanda
    if (section === 'vista3d' && !sectoresInicializados.vista3d) {
      sectoresInicializados.vista3d = true;
      setTimeout(() => ThreeScene.inicializar(), 100);
    }
    if (section === 'mapa' && !sectoresInicializados.mapa) {
      sectoresInicializados.mapa = true;
      setTimeout(() => {
        MapaModule.inicializar();
        if (ultimoDatoLocal) MapaModule.actualizarDatosPanel(ultimoDatoLocal);
      }, 100);
    }
    if (section === 'mapa') {
      MapaModule.onShow();
    }
    if (section === 'graficas' && !historialCargado) {
      cargarHistorialInicial();
    }
  }

  // ── Clock ─────────────────────────────────────────────────────
  function initClock() {
    function tick() {
      const now = new Date();
      document.getElementById('topbarTime').textContent =
        now.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
    }
    tick();
    setInterval(tick, 1000);
  }

  // ── Estado de conexión UI ─────────────────────────────────────
  function setEstadoConectado(conectado) {
    const dot   = document.getElementById('statusDot');
    const label = document.getElementById('statusLabel');
    const banner= document.getElementById('disconnectedBanner');
    const chipDot = document.getElementById('chipDot');

    dot.className   = 'status-dot ' + (conectado ? 'connected' : 'disconnected');
    chipDot.className = 'chip-dot ' + (conectado ? 'connected' : 'disconnected');
    label.textContent = conectado ? 'Conectado' : 'Desconectado';
    label.style.color = conectado ? 'var(--accent-green)' : 'var(--accent-red)';
    banner.style.display = conectado ? 'none' : 'flex';
  }

  function actualizarTiempoStatus(timestamp) {
    const el = document.getElementById('statusTime');
    if (!timestamp) { el.textContent = '—'; return; }
    const hace = Math.floor((Date.now() - timestamp) / 1000);
    el.textContent = hace < 60 ? `hace ${hace}s` : `hace ${Math.floor(hace/60)}m`;

    const bannerTime = document.getElementById('bannerTime');
    if (bannerTime) bannerTime.textContent = `Último contacto: ${hace}s atrás`;
  }

  // ── Tarjetas sensores ─────────────────────────────────────────
  function evaluarEstado(sensor, valor) {
    const r = RANGOS[sensor];
    if (!r) return '—';
    if (valor < r.min || valor > r.max) {
      const distMin = r.min - valor;
      const distMax = valor - r.max;
      const dist = Math.max(distMin, distMax);
      const rango = r.max - r.min;
      return dist > rango * 0.5 ? 'Crítico' : 'Alerta';
    }
    return 'Normal';
  }

  function actualizarCard(sensor, valor, max) {
    const valEl   = document.getElementById(`val-${sensor}`);
    const badgeEl = document.getElementById(`badge-${sensor}`);
    const barEl   = document.getElementById(`bar-${sensor}`);
    if (!valEl) return;

    const estado = evaluarEstado(sensor, valor);
    const pct = Math.min(100, Math.max(0, (valor / max) * 100));
    const clases = { 'Normal':'normal', 'Alerta':'alerta', 'Crítico':'critico' };

    valEl.textContent = typeof valor === 'number' ? (
      sensor === 'co2' ? valor : valor.toFixed(sensor === 'ph' ? 2 : 1)
    ) : '—';

    badgeEl.textContent = estado;
    badgeEl.className = 'card-status-badge ' + (clases[estado] || '');
    barEl.style.width = pct + '%';
  }

  function actualizarCards(datos) {
    actualizarCard('temp', datos.temperatura, 50);
    actualizarCard('hum',  datos.humedad,     100);
    actualizarCard('co2',  datos.co2,         2000);
    actualizarCard('ph',   datos.ph,          14);
  }

  // ── Stats 24h ─────────────────────────────────────────────────
  async function cargarStats() {
    try {
      const s = await API.obtenerStats();
      if (!s || s.mensaje) {
        document.getElementById('statsBadge').textContent = 'Sin datos hoy';
        return;
      }
      document.getElementById('statsBadge').textContent = `${s.totalRegistros || 0} registros hoy`;

      const r = n => n !== undefined ? n.toFixed(1) : '—';
      document.querySelector('#stat-temp-prom .stat-val').textContent = r(s.tempProm) + '°C';
      document.querySelector('#stat-temp-max .stat-val').textContent  = r(s.tempMax) + '°C';
      document.querySelector('#stat-hum-prom .stat-val').textContent  = r(s.humProm) + '%';
      document.querySelector('#stat-co2-prom .stat-val').textContent  = r(s.co2Prom) + 'ppm';
      document.querySelector('#stat-ph-prom .stat-val').textContent   = r(s.phProm) + ' pH';
      document.querySelector('#stat-registros .stat-val').textContent = s.totalRegistros || '0';
    } catch { /* Silencioso */ }
  }

  // ── Historial ─────────────────────────────────────────────────
  async function cargarHistorialInicial() {
    try {
      const res = await API.obtenerHistorial(CFG.HISTORY_POINTS);
      if (res.datos?.length > 0) {
        Charts.cargarHistorial(res.datos);
        historialCargado = true;
      }
    } catch { /* Silencioso */ }
  }

  // ── Polling principal ─────────────────────────────────────────
  async function poll() {
    try {
      const res = await API.obtenerUltimo();

      if (res.conectado && res.datos) {
        const datos = res.datos;
        ultimoDatoLocal = datos;
        ultimoTimestamp = res.ultimoContacto || Date.now();

        setEstadoConectado(true);
        actualizarCards(datos);
        Charts.actualizarConDato(datos);
        ThreeScene.actualizarValores(datos);
        actualizarCalculadoraConSensores(datos);
        MapaModule.actualizarDatosPanel(datos);

      } else {
        setEstadoConectado(false);
      }

      actualizarTiempoStatus(ultimoTimestamp);

    } catch (err) {
      // Error de red → desconectado
      setEstadoConectado(false);
      actualizarTiempoStatus(ultimoTimestamp);
      console.warn('Poll error:', err.message);
    }
  }

  // ── Init ──────────────────────────────────────────────────────
  function init() {
    initNav();
    initClock();

    // Inicializar Charts (siempre al inicio)
    Charts.inicializar();

    // Primer poll inmediato + cargar stats
    poll();
    cargarStats();

    // Polling continuo
    pollingInterval = setInterval(poll, CFG.POLL_INTERVAL_MS);

    // Stats cada 30s
    setInterval(cargarStats, 30000);

    // Estado dot checkeando
    document.getElementById('statusDot').className = 'status-dot checking';

    console.log('🌿 Pérgola IoT Monitor iniciado');
  }

  return { init };
})();

// Arrancar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => App.init());
