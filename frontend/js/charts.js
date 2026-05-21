// ─── GRÁFICAS EN TIEMPO REAL ─────────────────────────────────────
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false;
Chart.defaults.animation = false;
const Charts = (() => {
  const MAX_POINTS = window.PERGOLA_CONFIG.HISTORY_POINTS;
  const instances = {};

  const COLORES = {
    temperatura: '#ff6b35',
    humedad:     '#00b4d8',
    co2:         '#a8dadc',
    ph:          '#b06aff'
  };

  function crearGrafica(canvasId, sensor, label, unidad) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    const color = COLORES[sensor];

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: label,
          data: [],
          borderColor: color,
          backgroundColor: color + '18',
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 5,
          fill: true,
          tension: 0.4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        resizeDelay: 200,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1c2126',
            borderColor: color,
            borderWidth: 1,
            titleColor: '#7a8b96',
            bodyColor: '#e8edf2',
            bodyFont: { family: 'Space Mono' },
            callbacks: {
              label: ctx => ` ${ctx.parsed.y} ${unidad}`
            }
          }
        },
        scales: {
          x: {
            display: true,
            ticks: {
              color: '#3d4d58',
              font: { family: 'Space Mono', size: 10 },
              maxRotation: 0,
              maxTicksLimit: 6
            },
            grid: { color: '#252b30' }
          },
          y: {
            display: true,
            ticks: {
              color: '#3d4d58',
              font: { family: 'Space Mono', size: 10 }
            },
            grid: { color: '#252b30' }
          }
        }
      }
    });

    instances[sensor] = chart;
    return chart;
  }

  function inicializar() {
    crearGrafica('chartTemp', 'temperatura', 'Temperatura', '°C');
    crearGrafica('chartHum',  'humedad',     'Humedad',     '%' );
    crearGrafica('chartCO2',  'co2',         'CO₂',         'ppm');
    crearGrafica('chartPH',   'ph',          'pH',          ''  );
  }

  function agregarPunto(sensor, valor, etiqueta) {
    const chart = instances[sensor];
    if (!chart) return;

    chart.data.labels.push(etiqueta);
    chart.data.datasets[0].data.push(valor);

    if (chart.data.labels.length > MAX_POINTS) {
      chart.data.labels.shift();
      chart.data.datasets[0].data.shift();
    }

    chart.update('none');
  }

  function cargarHistorial(datos) {
    ['temperatura', 'humedad', 'co2', 'ph'].forEach(sensor => {
      const chart = instances[sensor];
      if (!chart) return;
      chart.data.labels = [];
      chart.data.datasets[0].data = [];
    });

    datos.forEach(d => {
      const hora = new Date(d.timestamp).toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' });
      agregarPunto('temperatura', d.temperatura, hora);
      agregarPunto('humedad',     d.humedad,     hora);
      agregarPunto('co2',         d.co2,         hora);
      agregarPunto('ph',          d.ph,           hora);
    });
  }

  function actualizarConDato(dato) {
    const hora = new Date(dato.timestamp).toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
    agregarPunto('temperatura', dato.temperatura, hora);
    agregarPunto('humedad',     dato.humedad,     hora);
    agregarPunto('co2',         dato.co2,         hora);
    agregarPunto('ph',          dato.ph,           hora);

    // Actualizar valores en header de cards de gráficas
    setText('chart-current-temp', dato.temperatura.toFixed(1) + ' °C');
    setText('chart-current-hum',  dato.humedad.toFixed(1) + ' %');
    setText('chart-current-co2',  dato.co2 + ' ppm');
    setText('chart-current-ph',   dato.ph.toFixed(2));
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  return { inicializar, cargarHistorial, actualizarConDato };
})();

window.Charts = Charts;
