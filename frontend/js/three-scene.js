// ─── VISTA 3D — PÉRGOLA THREE.JS ────────────────────────────────
const ThreeScene = (() => {
  let renderer, scene, camera, animFrameId;
  let sensores3D = [];
  let isDragging = false, prevMouse = {x:0, y:0};
  let rotX = 0.3, rotY = 0.5;
  let zoom = 1;

  const SENSOR_DATA = {
    temperatura: { label: 'Temperatura', pos: [-2.5, 1.8, 1.5],  color: 0xff6b35 },
    humedad:     { label: 'Humedad',     pos: [ 2.5, 1.8, 1.5],  color: 0x00b4d8 },
    co2:         { label: 'CO₂',         pos: [ 0,   1.8, -1.5], color: 0xa8dadc },
    ph:          { label: 'pH',          pos: [ 0,   0.5,  2],   color: 0xb06aff }
  };

  let sensorValues = { temperatura: null, humedad: null, co2: null, ph: null };

  function inicializar() {
    const canvas = document.getElementById('canvasThree');
    const container = canvas.parentElement;
    const W = container.clientWidth;
    const H = container.clientHeight || 480;

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);

    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0c0e, 20, 60);

    // Camera
    camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 5, 12);

    // Iluminación
    const ambientLight = new THREE.AmbientLight(0x1a2030, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(8, 12, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    scene.add(dirLight);

    const accentLight = new THREE.PointLight(0x00e5a0, 0.8, 20);
    accentLight.position.set(-4, 5, 0);
    scene.add(accentLight);

    // Construir pérgola
    construirPergola();
    agregarSensores();
    agregarSuelo();
    agregarEstrellas();

    // Eventos mouse / touch
    canvas.addEventListener('mousedown', e => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; });
    window.addEventListener('mouseup', () => { isDragging = false; });
    window.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('wheel', onWheel, { passive: true });
    canvas.addEventListener('click', onCanvasClick);
    window.addEventListener('resize', onResize);

    animar();
  }

  function construirPergola() {
    const mat = (color, metalness=0.3, roughness=0.6) =>
      new THREE.MeshStandardMaterial({ color, metalness, roughness });

    const columnaGeo = new THREE.CylinderGeometry(0.08, 0.1, 3.5, 8);
    const columnaMat = mat(0x2a3540, 0.7, 0.3);

    // 4 Columnas
    [[-3, 1.75, -2], [3, 1.75, -2], [-3, 1.75, 2], [3, 1.75, 2]].forEach(([x,y,z]) => {
      const col = new THREE.Mesh(columnaGeo, columnaMat);
      col.position.set(x, y, z);
      col.castShadow = true;
      scene.add(col);
    });

    // Vigas horizontales principales
    const vigaGeo = new THREE.BoxGeometry(6.3, 0.12, 0.12);
    const vigaMat = mat(0x1e2d38, 0.5, 0.4);
    [[-2, 3.55], [2, 3.55]].forEach(([z, y]) => {
      const v = new THREE.Mesh(vigaGeo, vigaMat);
      v.position.set(0, y, z);
      v.castShadow = true;
      scene.add(v);
    });

    // Vigas laterales
    const vigaLatGeo = new THREE.BoxGeometry(0.12, 0.12, 4.3);
    [[-3, 3.55], [3, 3.55]].forEach(([x, y]) => {
      const v = new THREE.Mesh(vigaLatGeo, vigaMat);
      v.position.set(x, y, 0);
      v.castShadow = true;
      scene.add(v);
    });

    // Tablones del techo (lamas)
    const lamaGeo = new THREE.BoxGeometry(6.1, 0.06, 0.2);
    const lamaMat = mat(0x162230, 0.3, 0.7);
    for (let z = -1.8; z <= 1.8; z += 0.35) {
      const l = new THREE.Mesh(lamaGeo, lamaMat);
      l.position.set(0, 3.65, z);
      l.receiveShadow = true;
      scene.add(l);
    }

    // Base / plataforma
    const baseGeo = new THREE.BoxGeometry(6.8, 0.15, 4.8);
    const baseMat = mat(0x111820, 0.1, 0.9);
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(0, -0.075, 0);
    base.receiveShadow = true;
    scene.add(base);

    // Marco de acento verde
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x00e5a0, emissive: 0x00e5a0, emissiveIntensity: 0.3, metalness: 0.8, roughness: 0.2 });
    const accentGeo = new THREE.TorusGeometry(0.05, 0.02, 8, 20);
    // pequeños detalles en esquinas
    [[-3,3.6,-2],[3,3.6,-2],[-3,3.6,2],[3,3.6,2]].forEach(([x,y,z]) => {
      const a = new THREE.Mesh(new THREE.SphereGeometry(0.08,8,8), accentMat);
      a.position.set(x,y,z);
      scene.add(a);
    });
  }

  function agregarSensores() {
    Object.entries(SENSOR_DATA).forEach(([key, info]) => {
      const group = new THREE.Group();

      // Cuerpo del sensor
      const bodyGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.35, 16);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: info.color,
        emissive: info.color,
        emissiveIntensity: 0.3,
        metalness: 0.6,
        roughness: 0.3
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      group.add(body);

      // Anillo exterior
      const ringGeo = new THREE.TorusGeometry(0.22, 0.04, 8, 24);
      const ringMat = new THREE.MeshStandardMaterial({ color: info.color, emissive: info.color, emissiveIntensity: 0.5, metalness: 0.9, roughness: 0.1 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      // Poste
      const posteGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8);
      const posteMat = new THREE.MeshStandardMaterial({ color: 0x2a3540, metalness: 0.8 });
      const poste = new THREE.Mesh(posteGeo, posteMat);
      poste.position.y = -0.42;
      group.add(poste);

      group.position.set(...info.pos);
      group.userData = { key, label: info.label, color: info.color };
      scene.add(group);
      sensores3D.push(group);
    });
  }

  function agregarSuelo() {
    const geo = new THREE.PlaneGeometry(40, 40);
    const mat = new THREE.MeshStandardMaterial({ color: 0x080c10, roughness: 1, metalness: 0 });
    const suelo = new THREE.Mesh(geo, mat);
    suelo.rotation.x = -Math.PI / 2;
    suelo.position.y = -0.16;
    suelo.receiveShadow = true;
    scene.add(suelo);
  }

  function agregarEstrellas() {
    const geo = new THREE.BufferGeometry();
    const positions = [];
    for (let i = 0; i < 200; i++) {
      positions.push(
        (Math.random() - .5) * 60,
        Math.random() * 20 + 5,
        (Math.random() - .5) * 60
      );
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0x3a5070, size: 0.06 });
    scene.add(new THREE.Points(geo, mat));
  }

  function animar() {
    animFrameId = requestAnimationFrame(animar);

    // Rotación de sensores (pulsación)
    const t = Date.now() * 0.001;
    sensores3D.forEach((s, i) => {
      s.children[0].material.emissiveIntensity = 0.2 + 0.15 * Math.sin(t * 2 + i);
      s.children[1].material.emissiveIntensity = 0.4 + 0.3 * Math.sin(t * 2 + i);
    });

    // Aplicar rotación de cámara
    const pivot = new THREE.Object3D();
    camera.position.x = Math.sin(rotY) * Math.cos(rotX) * 12 * zoom;
    camera.position.y = Math.sin(rotX) * 12 * zoom + 2;
    camera.position.z = Math.cos(rotY) * Math.cos(rotX) * 12 * zoom;
    camera.lookAt(0, 2, 0);

    renderer.render(scene, camera);
  }

  function onMouseMove(e) {
    if (!isDragging) return;
    const dx = e.clientX - prevMouse.x;
    const dy = e.clientY - prevMouse.y;
    rotY += dx * 0.008;
    rotX += dy * 0.008;
    rotX = Math.max(-1.2, Math.min(1.2, rotX));
    prevMouse = { x: e.clientX, y: e.clientY };
  }

  function onWheel(e) {
    zoom += e.deltaY * 0.001;
    zoom = Math.max(0.5, Math.min(3, zoom));
  }

  function onCanvasClick(e) {
    if (isDragging) return;
    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // Intersectar contra los hijos de los grupos de sensores
    const meshes = [];
    sensores3D.forEach(g => g.children.forEach(c => { c.userData._parent = g; meshes.push(c); }));
    const hits = raycaster.intersectObjects(meshes);

    if (hits.length > 0) {
      const parent = hits[0].object.userData._parent;
      if (parent) mostrarTooltipSensor(parent.userData.key);
    }
  }

  function mostrarTooltipSensor(key) {
    const info = SENSOR_DATA[key];
    const val  = sensorValues[key];
    const doc  = document;

    doc.getElementById('tooltipHeader').textContent = info.label;

    const UNIDADES = { temperatura:'°C', humedad:'%', co2:'ppm', ph:'pH' };
    if (val !== null) {
      doc.getElementById('tooltipValue').textContent = val + ' ' + (UNIDADES[key] || '');
      doc.getElementById('tooltipStatus').textContent = '🟢 Datos en tiempo real';
    } else {
      doc.getElementById('tooltipValue').textContent = '—';
      doc.getElementById('tooltipStatus').textContent = '⚠ Sin datos del sensor';
    }

    doc.getElementById('sensorTooltip').style.display = 'block';
  }

  function onResize() {
    const container = renderer.domElement.parentElement;
    const W = container.clientWidth;
    const H = container.clientHeight || 480;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H);
  }

  function actualizarValores(datos) {
    if (!datos) return;
    sensorValues.temperatura = datos.temperatura?.toFixed(1);
    sensorValues.humedad     = datos.humedad?.toFixed(1);
    sensorValues.co2         = datos.co2;
    sensorValues.ph          = datos.ph?.toFixed(2);
  }

  function destroy() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
  }

  return { inicializar, actualizarValores, destroy };
})();

window.closeSensorTooltip = () => {
  document.getElementById('sensorTooltip').style.display = 'none';
};

window.ThreeScene = ThreeScene;
