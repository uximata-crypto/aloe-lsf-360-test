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
    geo: { street: '', postcode: '', place: '' },
    cameraYaw: -0.72, cameraPitch: 0.48, cameraZoom: 1, cameraPanX: 0, cameraPanY: 0, cameraDistance: 15, cameraTarget: {x:0,y:0,z:1.35}
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
      renderCurrent();
      renderPanel();
      return;
    }
    if (append || state.multi) {
      state.selected = state.selected.includes(item.id) ? state.selected.filter((id) => id !== item.id) : [...state.selected, item.id];
    } else {
      state.selected = [item.id];
    }
    setStatus(`${state.selected.length} elemento(s) selecionado(s): ${item.name}.`);
    renderCurrent();
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

    if (state.view === '3d') {
      if (state.tool === 'orbit') {
        state.orbitDrag = { x: event.clientX, y: event.clientY, yaw: state.cameraYaw, pitch: state.cameraPitch };
        return;
      }
      if (state.tool === 'select') { selectItem(hit, event.ctrlKey || event.metaKey); return; }
      if (state.tool === 'delete') { if (hit) { selectItem(hit, false); deleteSelected(); } return; }
      if (state.tool === 'move') { if (hit) { selectItem(hit, event.ctrlKey || event.metaKey); state.moveDrag = { x:event.clientX,y:event.clientY }; } return; }
      if (state.tool === 'rotate') { if (hit) { selectItem(hit,false); state.rotateDrag={x:event.clientX,y:event.clientY}; } return; }
      if (state.tool === 'pushpull') {
        if (hit && isClosed(hit)) {
          selectItem(hit,false);
          const value=prompt('Altura do volume em metros:',(hit.height||state.currentHeight||2.70).toFixed(2));
          if(value!==null && Number(value)>0){hit.height=Number(value);state.currentHeight=hit.height;render3D();toast(`Volume atualizado para ${hit.height.toFixed(2)} m.`);}
        } else toast('Selecione um retângulo, círculo ou polígono fechado.');
        return;
      }
      return;
    }

    if (state.tool === 'select') { selectItem(hit, event.ctrlKey || event.metaKey); return; }
    if (state.tool === 'delete') { if (hit) { selectItem(hit, false); deleteSelected(); } return; }
    if (state.tool === 'lasso') { state.lasso = { a: point, b: point }; return; }
    if (['line', 'rect', 'circle'].includes(state.tool)) { state.draft = state.tool === 'circle' ? { kind:'circle', c:point, r:0 } : { kind:state.tool, a:point, b:point }; render2D(); return; }
    if (state.tool === 'polygon') { state.polygon.push(point); render2D(); return; }
    if (state.tool === 'arc') { state.arcPoints.push(point); if(state.arcPoints.length===3){ const [c,a,b]=state.arcPoints; addShape({kind:'arc',c,r:Math.hypot(a.x-c.x,a.y-c.y),a0:Math.atan2(a.y-c.y,a.x-c.x),a1:Math.atan2(b.y-c.y,b.x-c.x),ccw:false}); state.arcPoints=[];} return; }
    if (state.tool === 'pushpull') { if(hit&&isClosed(hit)){ selectItem(hit,false); const value=prompt('Altura do volume em metros:',(hit.height||state.currentHeight||2.70).toFixed(2)); if(value!==null&&Number(value)>0){hit.height=Number(value);state.currentHeight=hit.height;switchView('3d');toast(`Volume atualizado para ${hit.height.toFixed(2)} m.`);} }else toast('Selecione um retângulo, círculo ou polígono fechado.'); }
  }

  function handle2DMove(event) {
    const point = svgPoint(event);
    updateCoords(point.x, point.y, 0);
    if (state.view === '3d') {
      if(state.orbitDrag){ state.cameraYaw=state.orbitDrag.yaw+(event.clientX-state.orbitDrag.x)*.010; state.cameraPitch=Math.max(-1.15,Math.min(1.15,state.orbitDrag.pitch+(event.clientY-state.orbitDrag.y)*.008));render3D(); }
      if(state.moveDrag && state.selected.length){ const dx=(event.clientX-state.moveDrag.x)/70,dy=-(event.clientY-state.moveDrag.y)/70; moveItemsDirect(dx,dy,0);state.moveDrag={x:event.clientX,y:event.clientY};render3D(); }
      if(state.rotateDrag && state.selected.length){ const da=(event.clientX-state.rotateDrag.x)*0.01; rotateSelected(da);state.rotateDrag={x:event.clientX,y:event.clientY};render3D(); }
      return;
    }
    if (state.draft) { if (state.draft.kind === 'circle') state.draft.r = Math.hypot(point.x - state.draft.c.x, point.y - state.draft.c.y); else state.draft.b = point; render2D(); }
    if (state.lasso) { state.lasso.b = point; render2D(); }
  }

  function handle2DUp(event) {
    const point = svgPoint(event);
    if(state.view==='3d'){ state.orbitDrag=null;state.moveDrag=null;state.rotateDrag=null;return; }
    if (state.draft) { const draft = state.draft; if (draft.kind === 'circle') { if (draft.r > 7) addShape(draft); } else if (Math.hypot(point.x-draft.a.x,point.y-draft.a.y)>7) addShape(draft); state.draft=null; }
    if (state.lasso) { const b=makeBox(state.lasso.a,state.lasso.b);state.selected=state.shapes.filter(shape=>{const q=bounds(shape);return q.x>=b.x&&q.y>=b.y&&q.x+q.w<=b.x+b.w&&q.y+q.h<=b.y+b.h;}).map(shape=>shape.id);state.lasso=null;setStatus(`${state.selected.length} objeto(s) selecionado(s) por laço.`);render2D();renderPanel(); }
  }

  svg.addEventListener('pointerdown', handle2DDown);
  svg.addEventListener('pointermove', handle2DMove);
  svg.addEventListener('pointerup', handle2DUp);
  svg.addEventListener('wheel',(event)=>{ if(state.view==='3d'){event.preventDefault();state.cameraZoom=Math.max(.28,Math.min(2.8,state.cameraZoom*(event.deltaY<0?1.10:.90)));render3D();} },{passive:false});

  // Renderizador 3D próprio — geometria e perspetiva reais, sem dependências externas.
  function renderCurrent(){ if(state.view==='3d') render3D(); else render2D(); }

  function worldPoint(point, z = 0){
    return { x:(point.x-600)/PX_PER_M, y:(410-point.y)/PX_PER_M, z };
  }
  function vSub(a,b){return {x:a.x-b.x,y:a.y-b.y,z:a.z-b.z};}
  function vAdd(a,b){return {x:a.x+b.x,y:a.y+b.y,z:a.z+b.z};}
  function vMul(a,s){return {x:a.x*s,y:a.y*s,z:a.z*s};}
  function dot(a,b){return a.x*b.x+a.y*b.y+a.z*b.z;}
  function cross(a,b){return {x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x};}
  function norm(a){const l=Math.hypot(a.x,a.y,a.z)||1;return {x:a.x/l,y:a.y/l,z:a.z/l};}
  function centroid(points){const n=points.length||1;return points.reduce((s,p)=>vAdd(s,p),{x:0,y:0,z:0});}
  function modelBounds(){
    const all=[];
    state.shapes.filter(isClosed).forEach(s=>{
      const z0=s.elevation||0, z1=z0+(s.height||0);
      shapePoints(s).forEach(p=>{all.push(worldPoint(p,z0),worldPoint(p,z1));});
    });
    state.profiles.forEach(p=>{all.push(worldPoint(p.a,p.z0),worldPoint(p.b,p.z1));});
    if(!all.length)return {min:{x:-4,y:-3,z:0},max:{x:4,y:3,z:3}};
    return {min:{x:Math.min(...all.map(p=>p.x)),y:Math.min(...all.map(p=>p.y)),z:Math.min(...all.map(p=>p.z))},max:{x:Math.max(...all.map(p=>p.x)),y:Math.max(...all.map(p=>p.y)),z:Math.max(...all.map(p=>p.z))}};
  }
  function updateCameraTarget(){
    const b=modelBounds();
    state.cameraTarget={x:(b.min.x+b.max.x)/2,y:(b.min.y+b.max.y)/2,z:(b.min.z+b.max.z)/2};
    const diag=Math.hypot(b.max.x-b.min.x,b.max.y-b.min.y,b.max.z-b.min.z)||8;
    state.cameraDistance=Math.max(8,diag*1.85);
  }
  function cameraBasis(){
    const t=state.cameraTarget||{x:0,y:0,z:1.35};
    const yaw=state.cameraYaw, pitch=state.cameraPitch, d=state.cameraDistance/(state.cameraZoom||1);
    const pos={x:t.x+d*Math.cos(pitch)*Math.cos(yaw),y:t.y+d*Math.cos(pitch)*Math.sin(yaw),z:t.z+d*Math.sin(pitch)};
    const forward=norm(vSub(t,pos));
    let right=norm(cross(forward,{x:0,y:0,z:1}));
    if(Math.hypot(right.x,right.y,right.z)<.01)right={x:1,y:0,z:0};
    const up=norm(cross(right,forward));
    return {pos,forward,right,up};
  }
  function project3(world){
    const r=svg.getBoundingClientRect(), w=1200, h=760;
    const cam=cameraBasis();
    const rel=vSub(world,cam.pos);
    const depth=dot(rel,cam.forward);
    const focal=760;
    const safe=Math.max(.20,depth);
    return {x:w/2+(dot(rel,cam.right)*focal/safe)+(state.cameraPanX||0),y:h*.56-(dot(rel,cam.up)*focal/safe)+(state.cameraPanY||0),depth,safe};
  }
  function addPoly(points, id, fill, stroke, selected, depth){
    const n=createSvg('polygon',{points:points.map(p=>`${p.x},${p.y}`).join(' '),fill,stroke,'stroke-width':selected?4:1.6,'stroke-linejoin':'round'});
    n.classList.add('shape');
    if(selected)n.classList.add('is-selected');
    if(id)n.dataset.id=id;
    n.dataset.depth=depth;
    return n;
  }
  function addLine(a,b,id,stroke,width,selected){
    const n=createSvg('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke,'stroke-width':selected?width+2:width,'stroke-linecap':'round'});
    n.classList.add('profile');
    if(selected)n.classList.add('is-selected');
    if(id)n.dataset.id=id;
    return n;
  }
  function volumeFaces(shape){
    const z0=shape.elevation||0, z1=z0+(shape.height||0);
    const baseW=shapePoints(shape).map(p=>worldPoint(p,z0));
    const topW=shapePoints(shape).map(p=>worldPoint(p,z1));
    const faces=[];
    // Piso visível mesmo sem altura para que a vista 3D nunca fique vazia.
    if(z1-z0<.01){
      const pr=baseW.map(project3);
      faces.push({points:pr,id:shape.id,fill:'rgba(214,237,241,.42)',stroke:'#1b6f88',selected:state.selected.includes(shape.id),depth:centroid(pr).depth});
      return faces;
    }
    for(let i=0;i<baseW.length;i++){
      const j=(i+1)%baseW.length;
      const p=[baseW[i],baseW[j],topW[j],topW[i]].map(project3);
      const avg=p.reduce((s,q)=>s+q.depth,0)/p.length;
      const shade=0.28+0.13*((i%3)+1);
      faces.push({points:p,id:shape.id,fill:`rgba(${Math.round(104+shade*110)},${Math.round(166+shade*65)},${Math.round(181+shade*52)},.92)`,stroke:'#0b5873',selected:state.selected.includes(shape.id),depth:avg});
    }
    const top=topW.map(project3);
    faces.push({points:top,id:shape.id,fill:'rgba(228,245,247,.98)',stroke:'#0b5873',selected:state.selected.includes(shape.id),depth:top.reduce((s,q)=>s+q.depth,0)/top.length+0.001,label:true});
    return faces;
  }
  function profileScreen(profile){
    return {a:project3(worldPoint(profile.a,profile.z0)),b:project3(worldPoint(profile.b,profile.z1))};
  }
  function renderGround(){
    const group=[];
    // Desenha as duas direções da malha no plano Z=0, em perspetiva.
    for(let i=-12;i<=12;i++){
      const a=project3({x:i,y:-12,z:0}),b=project3({x:i,y:12,z:0});
      group.push({a,b});
      const c=project3({x:-12,y:i,z:0}),d=project3({x:12,y:i,z:0});
      group.push({a:c,b:d});
    }
    group.forEach(g=>svg.appendChild(createSvg('line',{x1:g.a.x,y1:g.a.y,x2:g.b.x,y2:g.b.y,stroke:'rgba(67,117,75,.22)','stroke-width':'1'})));
  }
  function render3D(){
    clearSvg();
    svg.appendChild(createSvg('rect',{width:'1200',height:'460',fill:'#bde4f0'}));
    svg.appendChild(createSvg('rect',{y:'460',width:'1200',height:'300',fill:'#bdd8ad'}));
    if(state.layers.ground)renderGround();
    const faces=[];
    if(state.layers.architecture)state.shapes.filter(isClosed).forEach(s=>faces.push(...volumeFaces(s)));
    // Pintor: fundo para frente, para que as faces não se atravessem.
    faces.sort((a,b)=>b.depth-a.depth).forEach(f=>svg.appendChild(addPoly(f.points,f.id,f.fill,f.stroke,f.selected,f.depth)));
    if(state.layers.lsf){
      state.profiles.slice().sort((a,b)=>{
        const aa=profileScreen(a),bb=profileScreen(b);
        return ((bb.a.depth+bb.b.depth)-(aa.a.depth+aa.b.depth));
      }).forEach(profile=>{
        const p=profileScreen(profile),selected=state.selected.includes(profile.id);
        svg.appendChild(addLine(p.a,p.b,profile.id,selected?'#f2a229':'#164f6a',selected?5:3,selected));
        if(selected){[p.a,p.b].forEach(q=>svg.appendChild(createSvg('circle',{cx:q.x,cy:q.y,r:5,class:'profile-node'})));}
      });
    }
    if(state.layers.labels){
      state.shapes.filter(isClosed).forEach(shape=>{
        const c=centroid(shapePoints(shape).map(p=>worldPoint(p,(shape.elevation||0)+(shape.height||0))));
        const q=project3(c);
        const text=createSvg('text',{x:q.x+8,y:q.y-8,class:`label ${state.selected.includes(shape.id)?'is-selected':''}`});
        text.textContent=`${shape.name} · ${(shape.height||0).toFixed(2)} m`;
        svg.appendChild(text);
      });
    }
    if(!state.shapes.filter(isClosed).length){
      const msg=createSvg('text',{x:'600',y:'400','text-anchor':'middle',class:'label'});msg.textContent='Desenhe um retângulo, círculo ou polígono em 2D para criar a geometria 3D.';svg.appendChild(msg);
    }
  }
  function rebuild3D(){ renderCurrent(); }
  function refresh3DSelection(){ renderCurrent(); }
  function fit3D(show=true){
    state.cameraYaw=-0.72;state.cameraPitch=0.48;state.cameraZoom=1;state.cameraPanX=0;state.cameraPanY=0;
    updateCameraTarget();render3D();if(show)toast('Vista 3D ajustada ao modelo.');
  }
  function switchView(view){
    state.view=view;
    $('#stage2D').classList.remove('is-hidden');
    $('#stage3D').classList.add('is-hidden');
    $('#view2D').classList.toggle('is-active',view==='2d');
    $('#view3D').classList.toggle('is-active',view==='3d');
    $('#viewBadge').textContent=view==='2d'?'Vista 2D — Planta':'Vista 3D — Estrutura LSF';
    if(view==='3d')updateCameraTarget();
    renderCurrent();
  }
  function moveItemsDirect(dx,dy,dz){
    state.selected.map(getItem).filter(Boolean).forEach(item=>{
      if(item.kind==='profile'){item.a.x+=dx*PX_PER_M;item.b.x+=dx*PX_PER_M;item.a.y-=dy*PX_PER_M;item.b.y-=dy*PX_PER_M;item.z0+=dz;item.z1+=dz;}
      else if(item.kind==='rect'){item.a.x+=dx*PX_PER_M;item.b.x+=dx*PX_PER_M;item.a.y-=dy*PX_PER_M;item.b.y-=dy*PX_PER_M;item.elevation=Math.max(0,(item.elevation||0)+dz);}
      else if(item.kind==='circle'){item.c.x+=dx*PX_PER_M;item.c.y-=dy*PX_PER_M;item.elevation=Math.max(0,(item.elevation||0)+dz);}
      else if(item.kind==='polygon'){item.points.forEach(p=>{p.x+=dx*PX_PER_M;p.y-=dy*PX_PER_M;});item.elevation=Math.max(0,(item.elevation||0)+dz);}
    });
  }
  function rotateSelected(angle){
    state.selected.map(getItem).filter(item=>item&&isClosed(item)).forEach(item=>{
      const b=bounds(item),cx=b.x+b.w/2,cy=b.y+b.h/2;
      const rot=p=>({x:cx+(p.x-cx)*Math.cos(angle)-(p.y-cy)*Math.sin(angle),y:cy+(p.x-cx)*Math.sin(angle)+(p.y-cy)*Math.cos(angle)});
      if(item.kind==='polygon')item.points=item.points.map(rot);
      if(item.kind==='rect'){const ps=shapePoints(item).map(rot);item.kind='polygon';item.points=ps;delete item.a;delete item.b;}
    });
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
    const demo = { kind: 'rect', a: { x: 330, y: 260 }, b: { x: 720, y: 500 }, height: 2.70, elevation: 0 };
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
