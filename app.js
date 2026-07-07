(() => {
  'use strict';

  const svg = document.getElementById('svgCanvas');
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const NS = 'http://www.w3.org/2000/svg';
  const PX_PER_M = 70;

  const state = {
    tool: 'select',
    view: '2d',
    tab: 'entity',
    shapes: [],
    profiles: [],
    selected: [],
    draft: null,
    polygon: [],
    arcPoints: [],
    lasso: null,
    multi: false,
    nextId: 1,
    layers: { architecture: true, lsf: true, labels: true, ground: true },
    currentHeight: 2.70,
    geo: { street: '', postcode: '', place: '' }
  };

  let scene;
  let renderer;
  let camera;
  let orbit;
  let transform;
  let raycaster;
  let mouse;
  let threeObjects = new Map();

  const createSvg = (tag, attrs = {}) => {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  };

  const uid = (prefix = 'O') => `${prefix}${String(state.nextId++).padStart(3, '0')}`;
  const shapeName = (kind) => ({ line: 'Linha', rect: 'Retângulo', circle: 'Círculo', arc: 'Arco', polygon: 'Polígono' }[kind] || kind);
  const isClosed = (shape) => ['rect', 'circle', 'polygon'].includes(shape.kind);
  const allItems = () => [...state.shapes, ...state.profiles];
  const getItem = (id) => allItems().find((item) => item.id === id);

  function toast(message) {
    const element = $('#toast');
    element.textContent = message;
    element.classList.remove('is-hidden');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.add('is-hidden'), 2400);
  }

  function setStatus(message) {
    $('#selectionState').textContent = message;
  }

  function updateToolUI() {
    $$('[data-tool]').forEach((button) => button.classList.toggle('is-active', button.dataset.tool === state.tool));
    $('#toolState').textContent = `Ferramenta: ${shapeName(state.tool)}`;
    $('#moveCard').classList.toggle('is-hidden', state.tool !== 'move');
  }

  function setTool(tool) {
    state.tool = tool;
    updateToolUI();
    if (tool === 'orbit' && state.view !== '3d') switchView('3d');
    if (tool === 'delete') toast('Clique num objeto para apagar ou selecione e use Delete.');
    if (tool === 'pushpull') toast('Selecione uma forma fechada e clique nela para definir a altura.');
  }

  function svgPoint(event) {
    const rect = svg.getBoundingClientRect();
    const x = (event.clientX - rect.left) * 1200 / rect.width;
    const y = (event.clientY - rect.top) * 760 / rect.height;
    return snap({ x, y });
  }

  function snap(point) {
    return { x: Math.round(point.x / 10) * 10, y: Math.round(point.y / 10) * 10 };
  }

  function bounds(shape) {
    if (shape.kind === 'rect') {
      return { x: Math.min(shape.a.x, shape.b.x), y: Math.min(shape.a.y, shape.b.y), w: Math.abs(shape.b.x - shape.a.x), h: Math.abs(shape.b.y - shape.a.y) };
    }
    if (shape.kind === 'circle') return { x: shape.c.x - shape.r, y: shape.c.y - shape.r, w: shape.r * 2, h: shape.r * 2 };
    if (shape.kind === 'polygon') {
      const xs = shape.points.map((p) => p.x);
      const ys = shape.points.map((p) => p.y);
      return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    }
    if (shape.kind === 'line') return { x: Math.min(shape.a.x, shape.b.x), y: Math.min(shape.a.y, shape.b.y), w: Math.abs(shape.b.x - shape.a.x), h: Math.abs(shape.b.y - shape.a.y) };
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  function shapePoints(shape) {
    if (shape.kind === 'rect') {
      const b = bounds(shape);
      return [{ x: b.x, y: b.y }, { x: b.x + b.w, y: b.y }, { x: b.x + b.w, y: b.y + b.h }, { x: b.x, y: b.y + b.h }];
    }
    if (shape.kind === 'circle') {
      return Array.from({ length: 48 }, (_, i) => {
        const angle = i / 48 * Math.PI * 2;
        return { x: shape.c.x + Math.cos(angle) * shape.r, y: shape.c.y + Math.sin(angle) * shape.r };
      });
    }
    if (shape.kind === 'polygon') return shape.points;
    return [];
  }

  function clearSvg() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
  }

  function drawGrid() {
    const defs = createSvg('defs');
    const pattern = createSvg('pattern', { id: 'grid', width: '44', height: '44', patternUnits: 'userSpaceOnUse' });
    pattern.appendChild(createSvg('path', { d: 'M 44 0 L 0 0 0 44', fill: 'none', stroke: '#d8e6e9', 'stroke-width': '1' }));
    defs.appendChild(pattern);
    svg.appendChild(defs);
    svg.appendChild(createSvg('rect', { width: '1200', height: '760', fill: 'url(#grid)' }));
    svg.appendChild(createSvg('line', { x1: '0', y1: '545', x2: '1200', y2: '545', class: 'axis-y' }));
    svg.appendChild(createSvg('line', { x1: '205', y1: '0', x2: '205', y2: '760', class: 'axis-x' }));
  }

  function arcPath(shape) {
    const start = { x: shape.c.x + Math.cos(shape.a0) * shape.r, y: shape.c.y + Math.sin(shape.a0) * shape.r };
    const end = { x: shape.c.x + Math.cos(shape.a1) * shape.r, y: shape.c.y + Math.sin(shape.a1) * shape.r };
    return `M ${start.x} ${start.y} A ${shape.r} ${shape.r} 0 0 ${shape.ccw ? 1 : 0} ${end.x} ${end.y}`;
  }

  function drawShape2D(shape, preview = false) {
    let node;
    if (shape.kind === 'line') node = createSvg('line', { x1: shape.a.x, y1: shape.a.y, x2: shape.b.x, y2: shape.b.y });
    if (shape.kind === 'rect') {
      const b = bounds(shape);
      node = createSvg('rect', { x: b.x, y: b.y, width: b.w, height: b.h });
    }
    if (shape.kind === 'circle') node = createSvg('circle', { cx: shape.c.x, cy: shape.c.y, r: shape.r });
    if (shape.kind === 'polygon') node = createSvg('polygon', { points: shape.points.map((p) => `${p.x},${p.y}`).join(' ') });
    if (shape.kind === 'arc') node = createSvg('path', { d: arcPath(shape), fill: 'none' });
    if (!node) return;
    node.classList.add('shape');
    if (preview) node.classList.add('is-preview');
    if (state.selected.includes(shape.id)) node.classList.add('is-selected');
    if (shape.id) node.dataset.id = shape.id;
    svg.appendChild(node);

    if (!preview && state.layers.labels && shape.name) {
      const b = bounds(shape);
      const label = createSvg('text', { x: b.x + b.w / 2 + 7, y: b.y + b.h / 2 - 7, class: `label ${state.selected.includes(shape.id) ? 'is-selected' : ''}` });
      label.textContent = shape.name;
      svg.appendChild(label);
    }
  }

  function drawProfile2D(profile) {
    const line = createSvg('line', { x1: profile.a.x, y1: profile.a.y, x2: profile.b.x, y2: profile.b.y, class: `profile ${state.selected.includes(profile.id) ? 'is-selected' : ''}` });
    line.dataset.id = profile.id;
    svg.appendChild(line);
    if (state.selected.includes(profile.id)) {
      [profile.a, profile.b].forEach((point) => svg.appendChild(createSvg('circle', { cx: point.x, cy: point.y, r: 5, class: 'profile-node' })));
    }
  }

  function render2D() {
    clearSvg();
    drawGrid();
    if (state.layers.architecture) state.shapes.forEach((shape) => drawShape2D(shape));
    if (state.draft) drawShape2D(state.draft, true);
    if (state.polygon.length) {
      svg.appendChild(createSvg('polyline', { points: state.polygon.map((p) => `${p.x},${p.y}`).join(' '), fill: 'none', stroke: '#159447', 'stroke-width': '2', 'stroke-dasharray': '6 4' }));
    }
    if (state.lasso) {
      const b = makeBox(state.lasso.a, state.lasso.b);
      svg.appendChild(createSvg('rect', { x: b.x, y: b.y, width: b.w, height: b.h, class: 'lasso' }));
    }
    if (state.layers.lsf) state.profiles.forEach(drawProfile2D);
  }

  function makeBox(a, b) {
    return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
  }

  function addShape(shape) {
    shape.id = uid();
    shape.name = `${shapeName(shape.kind)} ${state.shapes.length + 1}`;
    shape.height = Number(shape.height || 0);
    shape.elevation = Number(shape.elevation || 0);
    state.shapes.push(shape);
    state.draft = null;
    render2D();
    renderPanel();
    toast(`${shape.name} fixado.`);
  }

  function selectItem(item, append = false) {
    if (!item) {
      if (!append) state.selected = [];
      setStatus('Nenhum objeto selecionado.');
      render2D();
      refresh3DSelection();
      renderPanel();
      return;
    }
    if (append || state.multi) {
      state.selected = state.selected.includes(item.id) ? state.selected.filter((id) => id !== item.id) : [...state.selected, item.id];
    } else {
      state.selected = [item.id];
    }
    setStatus(`${state.selected.length} elemento(s) selecionado(s): ${item.name}.`);
    render2D();
    refresh3DSelection();
    renderPanel();
  }

  function parentIdFromTarget(target) {
    let current = target;
    while (current && current !== svg) {
      if (current.dataset?.id) return current.dataset.id;
      current = current.parentNode;
    }
    return null;
  }

  function handle2DDown(event) {
    const point = svgPoint(event);
    updateCoords(point.x, point.y, 0);
    const id = parentIdFromTarget(event.target);
    const hit = id ? getItem(id) : null;

    if (state.tool === 'select') {
      selectItem(hit, event.ctrlKey || event.metaKey);
      return;
    }
    if (state.tool === 'delete') {
      if (hit) {
        selectItem(hit, false);
        deleteSelected();
      }
      return;
    }
    if (state.tool === 'lasso') {
      state.lasso = { a: point, b: point };
      return;
    }
    if (['line', 'rect', 'circle'].includes(state.tool)) {
      state.draft = state.tool === 'circle' ? { kind: 'circle', c: point, r: 0 } : { kind: state.tool, a: point, b: point };
      render2D();
      return;
    }
    if (state.tool === 'polygon') {
      state.polygon.push(point);
      render2D();
      return;
    }
    if (state.tool === 'arc') {
      state.arcPoints.push(point);
      if (state.arcPoints.length === 3) {
        const [c, a, b] = state.arcPoints;
        addShape({ kind: 'arc', c, r: Math.hypot(a.x - c.x, a.y - c.y), a0: Math.atan2(a.y - c.y, a.x - c.x), a1: Math.atan2(b.y - c.y, b.x - c.x), ccw: false });
        state.arcPoints = [];
      }
      return;
    }
    if (state.tool === 'pushpull') {
      if (hit && isClosed(hit)) {
        selectItem(hit, false);
        const value = prompt('Altura do volume em metros:', (hit.height || state.currentHeight || 2.70).toFixed(2));
        if (value !== null && Number(value) > 0) {
          hit.height = Number(value);
          state.currentHeight = hit.height;
          switchView('3d');
          rebuild3D();
          toast(`Volume atualizado para ${hit.height.toFixed(2)} m.`);
        }
      } else {
        toast('Selecione um retângulo, círculo ou polígono fechado.');
      }
    }
  }

  function handle2DMove(event) {
    const point = svgPoint(event);
    updateCoords(point.x, point.y, 0);
    if (state.draft) {
      if (state.draft.kind === 'circle') state.draft.r = Math.hypot(point.x - state.draft.c.x, point.y - state.draft.c.y);
      else state.draft.b = point;
      render2D();
    }
    if (state.lasso) {
      state.lasso.b = point;
      render2D();
    }
  }

  function handle2DUp(event) {
    const point = svgPoint(event);
    if (state.draft) {
      const draft = state.draft;
      if (draft.kind === 'circle') {
        if (draft.r > 7) addShape(draft);
      } else if (Math.hypot(point.x - draft.a.x, point.y - draft.a.y) > 7) {
        addShape(draft);
      }
      state.draft = null;
    }
    if (state.lasso) {
      const b = makeBox(state.lasso.a, state.lasso.b);
      state.selected = state.shapes.filter((shape) => {
        const q = bounds(shape);
        return q.x >= b.x && q.y >= b.y && q.x + q.w <= b.x + b.w && q.y + q.h <= b.y + b.h;
      }).map((shape) => shape.id);
      state.lasso = null;
      setStatus(`${state.selected.length} objeto(s) selecionado(s) por laço.`);
      render2D();
      renderPanel();
    }
  }

  svg.addEventListener('pointerdown', handle2DDown);
  svg.addEventListener('pointermove', handle2DMove);
  svg.addEventListener('pointerup', handle2DUp);

  // 3D engine
  function init3D() {
    if (scene) return;
    const host = $('#stage3D');
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#bde4f0');
    camera = new THREE.PerspectiveCamera(48, 1, 0.1, 500);
    camera.position.set(10, -13, 10);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    host.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xe9fbff, 0x67815f, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(8, -10, 18);
    scene.add(sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0xbdd8ad, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -0.02;
    ground.userData.kind = 'ground';
    scene.add(ground);
    const grid = new THREE.GridHelper(80, 80, 0x7ca584, 0x9ab8a0);
    grid.rotation.x = Math.PI / 2;
    scene.add(grid);
    orbit = new THREE.OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.08;
    orbit.maxPolarAngle = Math.PI - 0.05;
    orbit.minDistance = 2;
    orbit.maxDistance = 70;
    orbit.target.set(0, 0, 1.4);
    transform = new THREE.TransformControls(camera, renderer.domElement);
    transform.setSize(0.75);
    transform.addEventListener('dragging-changed', (event) => orbit.enabled = !event.value);
    transform.addEventListener('objectChange', onTransformChanged);
    scene.add(transform);
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    renderer.domElement.addEventListener('pointerdown', handle3DDown);
    window.addEventListener('resize', resize3D);
    resize3D();
    animate();
  }

  function resize3D() {
    if (!renderer) return;
    const host = $('#stage3D');
    const rect = host.getBoundingClientRect();
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
    renderer.setSize(rect.width, rect.height);
  }

  function animate() {
    requestAnimationFrame(animate);
    if (orbit) orbit.update();
    if (renderer) renderer.render(scene, camera);
  }

  function canvasToWorld(point) {
    return { x: (point.x - 600) / PX_PER_M, y: (410 - point.y) / PX_PER_M };
  }

  function makeExtrudedGeometry(shape) {
    const points = shapePoints(shape).map(canvasToWorld);
    const path = new THREE.Shape();
    points.forEach((point, index) => index ? path.lineTo(point.x, point.y) : path.moveTo(point.x, point.y));
    path.closePath();
    return new THREE.ExtrudeGeometry(path, { depth: Math.max(0.02, shape.height || 0.02), bevelEnabled: false, curveSegments: 32 });
  }

  function remove3DObjects() {
    threeObjects.forEach((object) => scene.remove(object));
    threeObjects.clear();
  }

  function rebuild3D() {
    init3D();
    remove3DObjects();
    if (state.layers.architecture) {
      state.shapes.filter(isClosed).forEach((shape) => {
        const geometry = makeExtrudedGeometry(shape);
        const material = new THREE.MeshStandardMaterial({ color: state.selected.includes(shape.id) ? 0xf3a42b : 0xd8eef0, roughness: 0.7, metalness: 0.08 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.z = shape.elevation || 0;
        mesh.userData = { id: shape.id, kind: 'shape' };
        scene.add(mesh);
        threeObjects.set(shape.id, mesh);
      });
    }
    if (state.layers.lsf) state.profiles.forEach((profile) => addProfile3D(profile));
    fit3D(false);
    refresh3DSelection();
  }

  function addProfile3D(profile) {
    const start = canvasToWorld(profile.a);
    const end = canvasToWorld(profile.b);
    const a = new THREE.Vector3(start.x, start.y, profile.z0);
    const b = new THREE.Vector3(end.x, end.y, profile.z1);
    const vector = new THREE.Vector3().subVectors(b, a);
    const length = vector.length();
    const geometry = new THREE.BoxGeometry(0.055, 0.055, Math.max(0.02, length));
    const material = new THREE.MeshStandardMaterial({ color: state.selected.includes(profile.id) ? 0xf3a42b : 0x2c7488, metalness: 0.55, roughness: 0.35 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(a.clone().add(b).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), vector.normalize());
    mesh.userData = { id: profile.id, kind: 'profile' };
    scene.add(mesh);
    threeObjects.set(profile.id, mesh);
  }

  function handle3DDown(event) {
    if (event.button !== 0 || state.tool === 'orbit') return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects([...threeObjects.values()], false);
    const item = hits.length ? getItem(hits[0].object.userData.id) : null;

    if (state.tool === 'select') {
      selectItem(item, event.ctrlKey || event.metaKey);
      return;
    }
    if (state.tool === 'delete') {
      if (item) {
        selectItem(item, false);
        deleteSelected();
      }
      return;
    }
    if (state.tool === 'move' && item) {
      selectItem(item, event.ctrlKey || event.metaKey);
      transform.setMode('translate');
      transform.attach(hits[0].object);
      return;
    }
    if (state.tool === 'rotate' && item) {
      selectItem(item, event.ctrlKey || event.metaKey);
      transform.setMode('rotate');
      transform.attach(hits[0].object);
      return;
    }
    if (state.tool === 'pushpull' && item?.kind && isClosed(item)) {
      selectItem(item, false);
      const value = prompt('Altura do volume em metros:', (item.height || state.currentHeight || 2.70).toFixed(2));
      if (value !== null && Number(value) > 0) {
        item.height = Number(value);
        state.currentHeight = item.height;
        rebuild3D();
        toast(`Volume atualizado para ${item.height.toFixed(2)} m.`);
      }
    }
  }

  function onTransformChanged() {
    const object = transform.object;
    if (!object) return;
    const item = getItem(object.userData.id);
    if (!item || item.kind === 'profile') return;
    item.elevation = Math.max(0, object.position.z);
  }

  function refresh3DSelection() {
    if (!scene) return;
    threeObjects.forEach((object, id) => {
      const item = getItem(id);
      const selected = state.selected.includes(id);
      if (object.material?.color) object.material.color.set(selected ? 0xf3a42b : item?.kind === 'profile' ? 0x2c7488 : 0xd8eef0);
    });
    if (state.selected.length !== 1) transform?.detach();
  }

  function fit3D(show = true) {
    if (!scene || !threeObjects.size) return;
    const group = new THREE.Group();
    threeObjects.forEach((object) => group.add(object.clone()));
    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length() || 8;
    orbit.target.copy(center);
    camera.position.copy(center.clone().add(new THREE.Vector3(size * 1.2, -size * 1.3, size * 0.95)));
    camera.lookAt(center);
    orbit.update();
    if (show) toast('Vista 3D ajustada ao modelo.');
  }

  function switchView(view) {
    state.view = view;
    $('#stage2D').classList.toggle('is-hidden', view !== '2d');
    $('#stage3D').classList.toggle('is-hidden', view !== '3d');
    $('#view2D').classList.toggle('is-active', view === '2d');
    $('#view3D').classList.toggle('is-active', view === '3d');
    $('#viewBadge').textContent = view === '2d' ? 'Vista 2D — Planta' : 'Vista 3D — Estrutura LSF';
    if (view === '2d') render2D();
    if (view === '3d') rebuild3D();
  }

  function generateLSF() {
    const shapes = state.shapes.filter(isClosed);
    if (!shapes.length) {
      toast('Desenhe primeiro um retângulo, círculo ou polígono fechado.');
      return;
    }
    state.profiles = [];
    let index = 1;
    shapes.forEach((shape, shapeIndex) => {
      if (!shape.height || shape.height < 0.1) shape.height = state.currentHeight || 2.70;
      const points = shapePoints(shape);
      const panel = `P${String(shapeIndex + 1).padStart(2, '0')}`;
      points.forEach((a, i) => {
        const b = points[(i + 1) % points.length];
        state.profiles.push({ id: uid('U'), kind: 'profile', type: 'Guia inferior', profile: 'U90x40x0.95', name: `${panel}-U${index++}`, panel, a, b, z0: 0, z1: 0 });
        state.profiles.push({ id: uid('U'), kind: 'profile', type: 'Guia superior', profile: 'U90x40x0.95', name: `${panel}-U${index++}`, panel, a, b, z0: shape.height, z1: shape.height });
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        const count = Math.max(2, Math.floor(length / (PX_PER_M * 0.6)) + 1);
        for (let n = 0; n < count; n++) {
          const t = n / (count - 1);
          const point = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
          state.profiles.push({ id: uid('C'), kind: 'profile', type: 'Montante', profile: 'C90x40x0.95', name: `${panel}-M${index++}`, panel, a: point, b: point, z0: 0, z1: shape.height });
        }
      });
    });
    state.selected = [];
    switchView('3d');
    rebuild3D();
    renderPanel();
    toast(`${state.profiles.length} perfis LSF individuais gerados.`);
  }

  function moveSelected(axis) {
    const distance = Number($('#moveStep').value || 0.1);
    const dx = axis === 'x+' ? distance : axis === 'x-' ? -distance : 0;
    const dy = axis === 'y+' ? -distance : axis === 'y-' ? distance : 0;
    const dz = axis === 'z+' ? distance : axis === 'z-' ? -distance : 0;
    const selected = state.selected.map(getItem).filter(Boolean);
    if (!selected.length) {
      toast('Selecione uma ou várias peças antes de mover.');
      return;
    }
    selected.forEach((item) => {
      if (item.kind === 'profile') {
        item.a.x += dx * PX_PER_M;
        item.b.x += dx * PX_PER_M;
        item.a.y += dy * PX_PER_M;
        item.b.y += dy * PX_PER_M;
        item.z0 = Math.max(0, item.z0 + dz);
        item.z1 = Math.max(0, item.z1 + dz);
      } else if (item.kind === 'rect') {
        item.a.x += dx * PX_PER_M;
        item.b.x += dx * PX_PER_M;
        item.a.y += dy * PX_PER_M;
        item.b.y += dy * PX_PER_M;
        item.elevation = Math.max(0, (item.elevation || 0) + dz);
      } else if (item.kind === 'circle') {
        item.c.x += dx * PX_PER_M;
        item.c.y += dy * PX_PER_M;
        item.elevation = Math.max(0, (item.elevation || 0) + dz);
      } else if (item.kind === 'polygon') {
        item.points.forEach((point) => { point.x += dx * PX_PER_M; point.y += dy * PX_PER_M; });
        item.elevation = Math.max(0, (item.elevation || 0) + dz);
      }
    });
    render2D();
    rebuild3D();
    renderPanel();
    toast(`${selected.length} elemento(s) movido(s).`);
  }

  function deleteSelected() {
    if (!state.selected.length) {
      toast('Selecione um ou vários objetos antes de apagar.');
      return;
    }
    if (!confirm(`Apagar ${state.selected.length} elemento(s) selecionado(s)?`)) return;
    const ids = new Set(state.selected);
    state.shapes = state.shapes.filter((item) => !ids.has(item.id));
    state.profiles = state.profiles.filter((item) => !ids.has(item.id));
    state.selected = [];
    render2D();
    rebuild3D();
    renderPanel();
    toast('Elementos selecionados apagados.');
  }

  function exportCSV() {
    const rows = [['PROJETO', 'PAINEL', 'REFERENCIA', 'TIPO', 'PERFIL', 'COMPRIMENTO_MM', 'COTA_Z_MM']];
    if (state.profiles.length) {
      state.profiles.forEach((profile) => {
        const length = Math.hypot(profile.b.x - profile.a.x, profile.b.y - profile.a.y, profile.z1 - profile.z0) / PX_PER_M * 1000;
        rows.push(['Aloe LSF 360', profile.panel, profile.name, profile.type, profile.profile, length.toFixed(1), (profile.z0 * 1000).toFixed(1)]);
      });
    } else {
      state.shapes.filter(isClosed).forEach((shape, index) => rows.push(['Aloe LSF 360', `P${index + 1}`, shape.name, shapeName(shape.kind), '—', ((shape.height || 0) * 1000).toFixed(1), ((shape.elevation || 0) * 1000).toFixed(1)]));
    }
    if (rows.length === 1) {
      toast('Não existem dados suficientes para gerar CSV.');
      return;
    }
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = 'aloe_lsf360_fabrico.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    toast('CSV de fabrico gerado.');
  }

  function renderPanel() {
    const panel = $('#panelContent');
    const selected = state.selected.map(getItem).filter(Boolean);

    if (state.tab === 'entity') {
      panel.innerHTML = `
        <div class="card">
          <h3>Propriedades</h3>
          ${selected.length ? `<p><b>${selected.length} elemento(s) selecionado(s)</b></p><p>Referência: ${selected[0].name}</p><p>Tipo: ${selected[0].kind === 'profile' ? selected[0].type : shapeName(selected[0].kind)}</p><p>Perfil: ${selected[0].profile || '—'}</p>` : '<p>Selecione um objeto no desenho ou na lista abaixo.</p>'}
        </div>
        <div class="card"><h3>Objetos do projeto</h3><div class="list">
          ${allItems().map((item) => `<div class="row ${state.selected.includes(item.id) ? 'is-selected' : ''}"><div><b>${item.name}</b><small>${item.kind === 'profile' ? item.type : shapeName(item.kind)} · ${item.profile || '—'}</small></div><button data-select-id="${item.id}" class="select-item">Selecionar</button></div>`).join('') || '<p>Nenhum objeto criado.</p>'}
        </div></div>`;
      $$('[data-select-id]').forEach((button) => button.addEventListener('click', () => selectItem(getItem(button.dataset.selectId), state.multi)));
    }

    if (state.tab === 'selection') {
      const profiles = [...new Set(allItems().map((item) => item.profile).filter(Boolean))];
      panel.innerHTML = `
        <div class="card">
          <h3>Seleção por objeto ou perfil</h3>
          <div class="btns"><button id="toggleMulti" class="btn">${state.multi ? 'Desativar' : 'Ativar'} múltipla</button><button id="clearSelection" class="btn">Limpar seleção</button></div>
          <div class="field"><label>Tipo</label><select id="filterType"><option value="all">Todos</option><option value="rect">Retângulos</option><option value="circle">Círculos</option><option value="polygon">Polígonos</option><option value="profile">Perfis LSF</option></select></div>
          <div class="field"><label>Perfil</label><select id="filterProfile"><option value="all">Todos</option>${profiles.map((profile) => `<option value="${profile}">${profile}</option>`).join('')}</select></div>
          <button id="selectFiltered" class="btn green">Selecionar filtrados</button>
        </div>
        <div class="card"><h3>Peças individuais</h3><div class="list">${allItems().map((item) => `<div class="row ${state.selected.includes(item.id) ? 'is-selected' : ''}"><div><b>${item.name}</b><small>${item.kind === 'profile' ? item.type : shapeName(item.kind)} · ${item.profile || '—'}</small></div><button data-list-id="${item.id}" class="select-item">Selecionar</button></div>`).join('') || '<p>Gere LSF para criar guias e montantes individuais.</p>'}</div></div>`;
      $('#toggleMulti').onclick = () => { state.multi = !state.multi; renderPanel(); };
      $('#clearSelection').onclick = () => selectItem(null, false);
      $('#selectFiltered').onclick = () => {
        const type = $('#filterType').value;
        const profile = $('#filterProfile').value;
        state.selected = allItems().filter((item) => (type === 'all' || (type === 'profile' ? item.kind === 'profile' : item.kind === type)) && (profile === 'all' || item.profile === profile)).map((item) => item.id);
        setStatus(`${state.selected.length} elemento(s) selecionado(s) pelos filtros.`);
        render2D();
        refresh3DSelection();
        renderPanel();
      };
      $$('[data-list-id]').forEach((button) => button.addEventListener('click', () => selectItem(getItem(button.dataset.listId), state.multi)));
    }

    if (state.tab === 'profiles') {
      panel.innerHTML = `
        <div class="card"><h3>Catálogo de perfis LSF</h3>
          <div class="field"><label>Montantes</label><select id="studProfile"><option>C90x40x0.95</option><option>C100x40x0.95</option><option>C120x40x1.20</option><option>C140x40x1.20</option><option>C150x50x1.50</option><option>C200x50x1.50</option><option>C250x50x2.00</option><option>C300x50x2.00</option></select></div>
          <div class="field"><label>Guias</label><select id="trackProfile"><option>U90x40x0.95</option><option>U100x40x0.95</option><option>U120x40x1.20</option><option>U140x40x1.20</option><option>U150x50x1.50</option><option>U200x50x1.50</option><option>U250x50x2.00</option><option>U300x50x2.00</option></select></div>
          <div class="field"><label>Outras famílias</label><select><option>L / Cantoneira</option><option>Ómega / Cartola</option><option>Viga</option><option>Perfil de piso</option></select></div>
          <button id="applyProfiles" class="btn green">Aplicar à seleção</button>
        </div>`;
      $('#applyProfiles').onclick = () => {
        const stud = $('#studProfile').value;
        const track = $('#trackProfile').value;
        state.selected.map(getItem).filter((item) => item?.kind === 'profile').forEach((profile) => profile.profile = profile.type === 'Montante' ? stud : track);
        rebuild3D();
        renderPanel();
        toast('Perfis aplicados à seleção.');
      };
    }

    if (state.tab === 'geo') {
      panel.innerHTML = `
        <div class="card"><h3>Geolocalização</h3><p>Pesquisa por rua, número, código postal e localidade.</p>
          <div class="field"><label>Rua e número</label><input id="geoStreet" value="${state.geo.street}" placeholder="Rua das Acácias, 123"></div>
          <div class="field"><label>Código postal</label><input id="geoPostcode" value="${state.geo.postcode}" placeholder="3080-123"></div>
          <div class="field"><label>Localidade</label><input id="geoPlace" value="${state.geo.place}" placeholder="Figueira da Foz"></div>
          <button id="saveGeo" class="btn green">Guardar localização</button>
        </div>`;
      $('#saveGeo').onclick = () => {
        state.geo.street = $('#geoStreet').value;
        state.geo.postcode = $('#geoPostcode').value;
        state.geo.place = $('#geoPlace').value;
        toast('Localização guardada no projeto.');
      };
    }

    if (state.tab === 'csv') {
      panel.innerHTML = `<div class="card"><h3>CSV de fabrico</h3><p>Gera lista de perfis e cortes individuais do modelo LSF.</p><button id="panelCSV" class="btn green">Gerar CSV de fabrico</button></div>`;
      $('#panelCSV').onclick = exportCSV;
    }
  }

  function updateCoords(x, y, z) {
    $('#coords').textContent = `X: ${(x / PX_PER_M).toFixed(3)} · Y: ${(y / PX_PER_M).toFixed(3)} · Z: ${Number(z).toFixed(3)}`;
  }

  function wireUI() {
    $$('[data-tool]').forEach((button) => button.addEventListener('click', () => setTool(button.dataset.tool)));
    $('#view2D').onclick = () => switchView('2d');
    $('#view3D').onclick = () => switchView('3d');
    $('#toggleView').onclick = () => switchView(state.view === '2d' ? '3d' : '2d');
    $('#generateLSF').onclick = generateLSF;
    $('#generateCSV').onclick = exportCSV;
    $('#fit3D').onclick = () => { if (state.view !== '3d') switchView('3d'); fit3D(true); };
    $('#togglePanel').onclick = () => $('#rightPanel').classList.toggle('is-hidden');
    $('#closePanel').onclick = () => $('#rightPanel').classList.add('is-hidden');
    $$('[data-tab]').forEach((tab) => tab.addEventListener('click', () => {
      $$('[data-tab]').forEach((button) => button.classList.remove('is-active'));
      tab.classList.add('is-active');
      state.tab = tab.dataset.tab;
      renderPanel();
    }));
    $$('[data-layer]').forEach((input) => input.addEventListener('change', () => {
      state.layers[input.dataset.layer] = input.checked;
      render2D();
      rebuild3D();
    }));
    $$('[data-move]').forEach((button) => button.addEventListener('click', () => {
      if (button.dataset.move === 'center') { if (state.view !== '3d') switchView('3d'); fit3D(true); return; }
      moveSelected(button.dataset.move);
    }));
    $('#menu').onclick = (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      const action = button.dataset.menu;
      if (action === 'new') {
        if (confirm('Criar um novo projeto? O conteúdo atual será limpo.')) {
          state.shapes = []; state.profiles = []; state.selected = []; render2D(); rebuild3D(); renderPanel();
        }
      } else if (action === 'export') {
        exportCSV();
      } else if (action === 'print') {
        window.print();
      } else if (action === 'open' || action === 'import') {
        $('#fileInput').click();
      } else {
        toast(`Função preparada: ${button.textContent}.`);
      }
    };
    $('#fileInput').addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          Object.assign(state, data);
          render2D(); rebuild3D(); renderPanel(); toast('Projeto importado.');
        } catch {
          toast('Ficheiro JSON inválido.');
        }
      };
      reader.readAsText(file);
    });
  }

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      state.draft = null; state.polygon = []; state.arcPoints = []; state.lasso = null; render2D();
    }
    if (event.key === 'Enter' && state.polygon.length >= 3) {
      addShape({ kind: 'polygon', points: [...state.polygon] });
      state.polygon = [];
    }
    if ((event.key === 'Delete' || event.key === 'Backspace') && document.activeElement.tagName !== 'INPUT') deleteSelected();
  });

  function addDemo() {
    const demo = { kind: 'rect', a: { x: 330, y: 260 }, b: { x: 720, y: 500 }, height: 0 };
    addShape(demo);
    state.selected = [demo.id];
  }

  function init() {
    wireUI();
    addDemo();
    render2D();
    renderPanel();
  }

  init();
})();
