// ─── CALCULADORA AMBIENTAL ───────────────────────────────────────
let calcMode = 'manual';
let currentSensorData = null;

function setCalcMode(mode) {
  calcMode = mode;

  document.getElementById('btnModoManual').classList.toggle('active', mode === 'manual');
  document.getElementById('btnModoAuto').classList.toggle('active', mode === 'auto');

  const inputs = ['inputTemp','inputHum','inputCO2','inputPH'];

  if (mode === 'auto') {
    inputs.forEach(id => {
      document.getElementById(id).disabled = true;
    });
    if (currentSensorData) {
      rellenarConSensores(currentSensorData);
    } else {
      document.getElementById('inputTemp').placeholder = 'Sin datos del sensor';
      document.getElementById('inputHum').placeholder  = 'Sin datos del sensor';
      document.getElementById('inputCO2').placeholder  = 'Sin datos del sensor';
      document.getElementById('inputPH').placeholder   = 'Sin datos del sensor';
    }
  } else {
    inputs.forEach(id => {
      document.getElementById(id).disabled = false;
      document.getElementById(id).value = '';
    });
  }
}

function rellenarConSensores(datos) {
  if (!datos) return;
  document.getElementById('inputTemp').value = datos.temperatura?.toFixed(1) ?? '';
  document.getElementById('inputHum').value  = datos.humedad?.toFixed(1) ?? '';
  document.getElementById('inputCO2').value  = datos.co2 ?? '';
  document.getElementById('inputPH').value   = datos.ph?.toFixed(2) ?? '';
}

function actualizarCalculadoraConSensores(datos) {
  currentSensorData = datos;
  if (calcMode === 'auto' && datos) {
    rellenarConSensores(datos);
  }
}

function calcularAmbiental() {
  const temp = parseFloat(document.getElementById('inputTemp').value);
  const hum  = parseFloat(document.getElementById('inputHum').value);
  const co2  = parseFloat(document.getElementById('inputCO2').value);
  const ph   = parseFloat(document.getElementById('inputPH').value);

  if (isNaN(temp) || isNaN(hum) || isNaN(co2) || isNaN(ph)) {
    mostrarError('Completa todos los campos antes de calcular.');
    return;
  }

  const resultado = analizarAmbiente(temp, hum, co2, ph);
  mostrarResultado(resultado, { temp, hum, co2, ph });
}

function analizarAmbiente(temp, hum, co2, ph) {
  // ─ Temperatura
  let tempEst, tempRisk;
  if (temp < 10)       { tempEst = 'Muy fría';   tempRisk = 'alto';   }
  else if (temp < 18)  { tempEst = 'Fresca';      tempRisk = 'medio';  }
  else if (temp <= 26) { tempEst = 'Óptima';      tempRisk = 'bajo';   }
  else if (temp <= 32) { tempEst = 'Cálida';      tempRisk = 'medio';  }
  else                 { tempEst = 'Muy caliente';tempRisk = 'alto';   }

  // ─ Humedad
  let humEst, humRisk;
  if (hum < 20)       { humEst = 'Muy seca';    humRisk = 'alto';  }
  else if (hum < 40)  { humEst = 'Seca';         humRisk = 'medio'; }
  else if (hum <= 70) { humEst = 'Óptima';       humRisk = 'bajo';  }
  else if (hum <= 85) { humEst = 'Húmeda';       humRisk = 'medio'; }
  else                { humEst = 'Muy húmeda';   humRisk = 'alto';  }

  // ─ CO2
  let co2Est, co2Risk;
  if (co2 < 400)        { co2Est = 'Exterior limpio'; co2Risk = 'bajo';   }
  else if (co2 <= 600)  { co2Est = 'Buena calidad';   co2Risk = 'bajo';   }
  else if (co2 <= 1000) { co2Est = 'Aceptable';       co2Risk = 'medio';  }
  else if (co2 <= 2000) { co2Est = 'Elevado';         co2Risk = 'alto';   }
  else                  { co2Est = 'Crítico';          co2Risk = 'critico';}

  // ─ pH
  let phEst, phRisk;
  if (ph < 4)           { phEst = 'Muy ácido';    phRisk = 'critico'; }
  else if (ph < 5.5)    { phEst = 'Ácido';         phRisk = 'alto';   }
  else if (ph <= 7.5)   { phEst = 'Neutro (ideal)';phRisk = 'bajo';   }
  else if (ph <= 9)     { phEst = 'Alcalino';       phRisk = 'medio';  }
  else                  { phEst = 'Muy alcalino';  phRisk = 'alto';   }

  // ─ Riesgo general
  const riskLevels = { bajo:0, medio:1, alto:2, critico:3 };
  const maxRisk = Math.max(...[tempRisk, humRisk, co2Risk, phRisk].map(r => riskLevels[r]));
  const riskNames = ['Bajo','Medio','Alto','Crítico'];
  const riskColors = ['color-green','color-blue','color-amber','color-red'];
  const riskGeneral = riskNames[maxRisk];
  const riskColor = riskColors[maxRisk];

  // ─ IAQ Score (0-100)
  const score = Math.max(0, Math.round(
    100
    - (maxRisk * 20)
    - (co2 > 1000 ? 15 : co2 > 600 ? 5 : 0)
    - (Math.abs(ph - 7) > 2 ? 10 : Math.abs(ph - 7) > 1 ? 5 : 0)
    - (Math.abs(temp - 22) > 8 ? 10 : Math.abs(temp - 22) > 4 ? 4 : 0)
  ));

  const calidad = score >= 80 ? 'Excelente' : score >= 60 ? 'Buena' : score >= 40 ? 'Regular' : 'Deficiente';
  const calidadColor = score >= 80 ? 'color-green' : score >= 60 ? 'color-blue' : score >= 40 ? 'color-amber' : 'color-red';

  // ─ Recomendaciones
  const recs = [];
  if (co2 > 1000) recs.push('Aumentar ventilación del área de inmediato');
  if (co2 > 600)  recs.push('Mejorar circulación del aire');
  if (hum < 30)   recs.push('Aumentar humedad relativa (nebulizador o riego)');
  if (hum > 80)   recs.push('Reducir humedad: riesgo de hongos y plagas');
  if (temp > 32)  recs.push('Implementar sombreado o ventilación activa');
  if (temp < 15)  recs.push('Considerar calefacción o protección contra frío');
  if (ph < 5.5)   recs.push('Corregir acidez del sustrato (cal dolomítica)');
  if (ph > 8)     recs.push('Reducir alcalinidad (azufre o ácido cítrico diluido)');
  if (recs.length === 0) recs.push('Condiciones ambientales dentro de parámetros normales');

  return { tempEst, humEst, co2Est, phEst, riskGeneral, riskColor, score, calidad, calidadColor, recs };
}

function mostrarResultado(r, vals) {
  const el = document.getElementById('calcResults');
  el.innerHTML = `
    <div class="result-section">
      <div class="result-main-badge">
        <span class="result-main-label">Calidad Ambiental General</span>
        <span class="result-main-value ${r.calidadColor}">${r.calidad} · ${r.score}/100</span>
      </div>

      <div class="result-main-badge" style="margin-top:4px">
        <span class="result-main-label">Nivel de Riesgo</span>
        <span class="result-main-value ${r.riskColor}">${r.riskGeneral}</span>
      </div>

      <div class="result-grid">
        <div class="result-item">
          <div class="result-item-label">🌡 Temperatura · ${vals.temp}°C</div>
          <div class="result-item-value">${r.tempEst}</div>
        </div>
        <div class="result-item">
          <div class="result-item-label">💧 Humedad · ${vals.hum}%</div>
          <div class="result-item-value">${r.humEst}</div>
        </div>
        <div class="result-item">
          <div class="result-item-label">🌫 CO₂ · ${vals.co2} ppm</div>
          <div class="result-item-value">${r.co2Est}</div>
        </div>
        <div class="result-item">
          <div class="result-item-label">⚗ pH · ${vals.ph}</div>
          <div class="result-item-value">${r.phEst}</div>
        </div>
      </div>

      <div class="result-recs">
        <div class="result-recs-title">Recomendaciones</div>
        <ul class="result-recs-list">
          ${r.recs.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;
}

function mostrarError(msg) {
  document.getElementById('calcResults').innerHTML = `
    <div class="result-section">
      <div class="result-main-badge" style="border-color: rgba(255,68,68,.3)">
        <span class="result-main-label color-red">⚠ Error</span>
        <span class="result-main-value color-red">${msg}</span>
      </div>
    </div>
  `;
}

window.setCalcMode = setCalcMode;
window.calcularAmbiental = calcularAmbiental;
window.actualizarCalculadoraConSensores = actualizarCalculadoraConSensores;
