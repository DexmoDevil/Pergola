// ─── MAPA — LEAFLET ─────────────────────────────────────────────
const MapaModule = (() => {
  let mapa = null;
  let marker = null;
  let initialized = false;

  function inicializar() {
    if (initialized) return;
    initialized = true;

    const cfg = window.PERGOLA_CONFIG;
    const lat = cfg.PERGOLA_LAT;
    const lng = cfg.PERGOLA_LNG;

    mapa = L.map('mapContainer', {
      center: [lat, lng],
      zoom: 16,
      zoomControl: true,
      attributionControl: true,
    });

    // Tile layer oscuro (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(mapa);

    // Icono personalizado
    const iconoPergola = L.divIcon({
      className: '',
      html: `
        <div style="
          position:relative;
          display:flex;
          flex-direction:column;
          align-items:center;
        ">
          <div style="
            background: rgba(0,229,160,.15);
            border: 2px solid #00e5a0;
            border-radius: 50%;
            width: 48px; height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            box-shadow: 0 0 20px rgba(0,229,160,.4);
            animation: pulse-map 2s ease-in-out infinite;
          ">⬡</div>
          <div style="
            width: 2px; height: 16px;
            background: #00e5a0;
            margin-top: -2px;
          "></div>
        </div>
        <style>
          @keyframes pulse-map {
            0%,100% { box-shadow: 0 0 20px rgba(0,229,160,.4); }
            50% { box-shadow: 0 0 35px rgba(0,229,160,.7); }
          }
        </style>
      `,
      iconSize: [48, 64],
      iconAnchor: [24, 64],
      popupAnchor: [0, -64]
    });

    marker = L.marker([lat, lng], { icon: iconoPergola }).addTo(mapa);

    marker.bindPopup(`
      <div style="font-family:'Space Mono',monospace;font-size:12px;color:#e8edf2;background:#1c2126;padding:12px;border-radius:8px;min-width:160px">
        <strong style="color:#00e5a0;">⬡ ${cfg.PERGOLA_NOMBRE}</strong><br>
        <span style="color:#7a8b96">Lat: ${lat}</span><br>
        <span style="color:#7a8b96">Lng: ${lng}</span><br>
        <span style="color:#7a8b96">Bogotá, Colombia</span>
      </div>
    `, { className: 'pergola-popup' }).openPopup();

    // Actualizar coords en panel
    document.getElementById('mapLat').textContent = lat + '° N';
    document.getElementById('mapLng').textContent = Math.abs(lng) + '° O';
  }

  function actualizarDatosPanel(datos) {
    if (!datos) return;
    setText('mapTemp', datos.temperatura?.toFixed(1) + ' °C');
    setText('mapHum',  datos.humedad?.toFixed(1) + ' %');
    setText('mapCO2',  datos.co2 + ' ppm');
    setText('mapPH',   datos.ph?.toFixed(2));
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  // Invalidate size cuando se muestre el mapa (necesario para Leaflet)
  function onShow() {
    if (mapa) setTimeout(() => mapa.invalidateSize(), 100);
  }

  return { inicializar, actualizarDatosPanel, onShow };
})();

window.MapaModule = MapaModule;
