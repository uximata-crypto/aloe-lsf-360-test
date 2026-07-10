(() => {
'use strict';
const svg=document.getElementById('board'), $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)], NS='http://www.w3.org/2000/svg';
const SCALE=70, ORIGIN={x:600,y:430};
const S={tool:'select',mode:'2d',tab:'entity',shapes:[],profiles:[],selected:[],draft:null,polygon:[],next:1,multi:false,layers:{image:true,architecture:true,lsf:true,labels:true,terrain:true},cam:{yaw:-0.72,pitch:0.56,zoom:1,panX:0,panY:0},drag:null,view2d:{panX:0,panY:0},image:null,calibration:null,calc:{spacing:0.60,studProfile:'C90x40x0.95',trackProfile:'U90x40x0.95',height:2.70,wind:0.50,dead:0.40,live:0.75,steel:'S280GD Z275',externalWall:0.150,internalWall:0.100,profileDims:{C:{web:90,flange:40,lip:12,thickness:0.95,kgm:1.35},U:{web:90,flange:40,lip:0,thickness:0.95,kgm:1.15}},results:null,signed:{engineer:'Joaquim Diniz',title:'Engenheiro Civil',orderNo:'',insurance:'',verificationCode:'',client:'Jorge Simões',workLocation:'Granja do Ulmeiro',process:'PJD012',date:'Jun.2026',projectName:'Bungalow T2 em LSF',scale:'1/100',length:10.00,width:7.00,wallHeight:2.36,roofRise:1.25,totalHeight:3.61,roofType:'Cobertura de duas águas',structuralSystem:'LSF — Light Steel Framing',steel:'S280GD/S350GD galvanizado, a confirmar por ficha técnica',notes:'Dossier técnico para validação e assinatura do engenheiro responsável.'}}};
S.importPrefs={autoDarkenWalls:true,wallDarkness:0.78,darkThreshold:185,minWallRunRatio:0.035,maxWallGapPx:34};
function importPrefs(){return S.importPrefs||(S.importPrefs={autoDarkenWalls:true,wallDarkness:0.78,darkThreshold:185,minWallRunRatio:0.035,maxWallGapPx:34})}
function uid(p='O'){return p+(S.next++).toString().padStart(3,'0')}
function n(v,d=2){return Number(v||0).toFixed(d)}
function el(t,a={}){const e=document.createElementNS(NS,t);Object.entries(a).forEach(([k,v])=>e.setAttribute(k,v));return e}
function clear(){while(svg.firstChild)svg.removeChild(svg.firstChild)}
function msg(m){const t=$('#toast');t.textContent=m;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),2400)}
function item(id){return S.shapes.find(x=>x.id===id)||S.profiles.find(x=>x.id===id)}
function items(){return [...S.shapes,...S.profiles]}
function toolName(t){return({select:'Selecionar',line:'Linha',rect:'Retângulo',circle:'Círculo',polygon:'Polígono',push:'Empurrar/Puxar',pan:'Mão / mover tela',move:'Mover',orbit:'Órbita',delete:'Apagar',calibrate:'Calibrar por 2 pontos'})[t]||t}
function shapeName(k){return({line:'Linha',rect:'Retângulo',circle:'Círculo',polygon:'Polígono',profile:'Perfil LSF',door:'Porta',window:'Janela'})[k]||k}
function isClosed(s){return ['rect','circle','polygon'].includes(s.kind)}
function screenPt(e){const r=svg.getBoundingClientRect();return{x:(e.clientX-r.left)*1200/r.width,y:(e.clientY-r.top)*760/r.height}}
function world2D(P){return{x:ORIGIN.x+S.view2d.panX+P.x*SCALE,y:ORIGIN.y+S.view2d.panY-P.y*SCALE}}
function screenToWorld2D(p){return{x:(p.x-ORIGIN.x-S.view2d.panX)/SCALE,y:(ORIGIN.y+S.view2d.panY-p.y)/SCALE,z:0}}
function snap(P){return{x:Math.round(P.x*10)/10,y:Math.round(P.y*10)/10,z:0}}
function project(P){const cx=600+S.cam.panX,cy=450+S.cam.panY,sc=SCALE*S.cam.zoom,cyaw=Math.cos(S.cam.yaw),syaw=Math.sin(S.cam.yaw),cp=Math.cos(S.cam.pitch),sp=Math.sin(S.cam.pitch);const X=P.x*cyaw-P.y*syaw,Y=P.x*syaw+P.y*cyaw;return{x:cx+X*sc,y:cy-(Y*cp+P.z*sp)*sc,depth:Y*sp-P.z*cp}}
function pointsOf(s){if(s.kind==='rect'){const x1=Math.min(s.a.x,s.b.x),x2=Math.max(s.a.x,s.b.x),y1=Math.min(s.a.y,s.b.y),y2=Math.max(s.a.y,s.b.y);return[{x:x1,y:y1,z:0},{x:x2,y:y1,z:0},{x:x2,y:y2,z:0},{x:x1,y:y2,z:0}]}if(s.kind==='circle'){let pts=[];for(let i=0;i<56;i++){let a=i/56*Math.PI*2;pts.push({x:s.c.x+Math.cos(a)*s.r,y:s.c.y+Math.sin(a)*s.r,z:0})}return pts}if(s.kind==='polygon')return s.points;if(s.kind==='line')return[s.a,s.b];return[]}
function centroid(pts){return pts.reduce((a,p)=>({x:a.x+p.x/pts.length,y:a.y+p.y/pts.length,z:a.z+p.z/pts.length}),{x:0,y:0,z:0})}
function perimeter(s){const p=pointsOf(s);let L=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];L+=Math.hypot(b.x-a.x,b.y-a.y)}return L}
function area(s){if(s.kind==='rect'){const p=pointsOf(s);return Math.abs((p[1].x-p[0].x)*(p[2].y-p[1].y))}if(s.kind==='circle')return Math.PI*s.r*s.r;if(s.kind==='polygon'){const p=pointsOf(s);let A=0;for(let i=0,j=p.length-1;i<p.length;j=i++)A+=(p[j].x+p[i].x)*(p[j].y-p[i].y);return Math.abs(A/2)}return 0}

function openingWidthOf(o){return lineLength(o)}
function openingHeightOf(o){if(!isOpening(o))return 0;return o.openingType==='door'?Number(o.openingHeight||2.10):Number(o.openingHeight||((o.openingHead||2.10)-(o.sillHeight||0.90)))}
function sillHeightOf(o){return Number(o.sillHeight||0.90)}
function headHeightOf(o){return Number(o.openingHead||(sillHeightOf(o)+openingHeightOf(o)))}
function setOpeningWidth(o,width){width=Math.max(0.30,Number(width)||openingWidthOf(o));const cx=(o.a.x+o.b.x)/2,cy=(o.a.y+o.b.y)/2;const dx=o.b.x-o.a.x,dy=o.b.y-o.a.y,L=Math.hypot(dx,dy)||1;const ux=dx/L,uy=dy/L,h=width/2;o.a={x:cx-ux*h,y:cy-uy*h,z:0};o.b={x:cx+ux*h,y:cy+uy*h,z:0};o.openingWidth=width}
function setOpeningHeights(o,height,sill=null){height=Math.max(0.30,Number(height)||openingHeightOf(o));o.openingHeight=height;if(o.openingType==='door'){o.openingHead=height;o.sillHeight=0}else{const sh=sill===null?sillHeightOf(o):Math.max(0,Number(sill)||0);o.sillHeight=sh;o.openingHead=sh+height}}
function associateOpeningsToPanels(closedSet=null,lineSet=null){
  const closed=closedSet||S.shapes.filter(isClosed);
  const allLines=S.shapes.filter(o=>o.kind==='line'&&!o.openingType);
  const activeLines=lineSet||allLines;
  const openings=S.shapes.filter(o=>o.kind==='line'&&o.openingType);
  openings.forEach(o=>{
    const c={x:(o.a.x+o.b.x)/2,y:(o.a.y+o.b.y)/2};
    let best=null;
    const consider=(a,b,panel,wallName,wallType,segmentIndex)=>{
      const dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy)||1;
      const ux=dx/L,uy=dy/L;
      const t=((c.x-a.x)*ux+(c.y-a.y)*uy)/L;
      const perp=Math.abs((c.x-a.x)*(-uy)+(c.y-a.y)*(ux));
      if(t<0.01||t>0.99||perp>0.20)return;
      const score=perp+Math.abs(0.5-t)*0.02;
      if(!best||score<best.score)best={panel,wallName,wallType,segmentIndex,score};
    };
    closed.forEach((s,si)=>{
      const pts=pointsOf(s), panel='P'+String(si+1).padStart(2,'0');
      for(let i=0;i<pts.length;i++){
        consider(pts[i],pts[(i+1)%pts.length],panel,(s.name||('Painel '+panel))+' / parede '+(i+1),s.wallType||classifySegmentWall(pts[i],pts[(i+1)%pts.length],si),i+1);
      }
    });
    activeLines.forEach((ln,idx)=>{
      const wt=ln.wallType||classifySegmentWall(ln.a,ln.b,-1);
      const panel=(wt==='exterior'?'E':'I')+String(idx+1).padStart(2,'0');
      consider(ln.a,ln.b,panel,ln.name||('Linha '+(idx+1)),wt,1);
    });
    if(best){
      o.associatedPanel=best.panel;
      o.associatedWall=best.wallName;
      o.associatedWallType=best.wallType;
      o.associatedSegment=best.segmentIndex;
    }else{
      o.associatedPanel='—';
      o.associatedWall='—';
      o.associatedWallType=o.wallType||'—';
      o.associatedSegment='—';
    }
  });
}
function numberOpeningsByPanel(){
  associateOpeningsToPanels();
  const counters={};
  const openings=S.shapes
    .filter(o=>o.kind==='line'&&o.openingType)
    .sort((a,b)=>{
      const pa=(a.associatedPanel||'ZZZ'), pb=(b.associatedPanel||'ZZZ');
      if(pa!==pb)return pa.localeCompare(pb);
      const ay=(a.a.y+a.b.y)/2, by=(b.a.y+b.b.y)/2;
      if(Math.abs(by-ay)>0.01)return by-ay;
      const ax=(a.a.x+a.b.x)/2, bx=(b.a.x+b.b.x)/2;
      return ax-bx;
    });
  openings.forEach(o=>{
    const panel=o.associatedPanel&&o.associatedPanel!=='—'?o.associatedPanel:'SEM';
    counters[panel]=(counters[panel]||0)+1;
    o.openingCode=panel+'-V'+String(counters[panel]).padStart(2,'0');
  });
}
function openingMapRows(){
  numberOpeningsByPanel();
  return S.shapes.filter(o=>o.kind==='line'&&o.openingType).map((o,i)=>['MAPA_VAOS',o.openingCode||('O'+(i+1)),o.associatedPanel||'—',o.associatedWall||'—',o.name||('Abertura '+(i+1)),o.openingType==='door'?'Porta':'Janela',o.associatedWallType||o.wallType||'—',(openingWidthOf(o)*1000).toFixed(1),(openingHeightOf(o)*1000).toFixed(1),o.openingType==='window'?(sillHeightOf(o)*1000).toFixed(1):'0.0',o.openingType==='window'?(headHeightOf(o)*1000).toFixed(1):(openingHeightOf(o)*1000).toFixed(1),o.openingType==='door'?(o.doorHinge==='end'?'Direita':'Esquerda'):'—',o.autoDetected?'Auto/ajustada':'Manual']);
}

function addText(P,text,selected=false){if(!S.layers.labels)return;const p=S.mode==='2d'?world2D(P):project(P);const t=el('text',{x:p.x+7,y:p.y-7,class:'label'+(selected?' selected':'')});t.textContent=text;svg.append(t)}
function addPoly(points,cls,id){const e=el('polygon',{points:points.map(p=>p.x+','+p.y).join(' '),class:cls,'data-id':id||''});svg.append(e);return e}
function addLine(a,b,cls,id){const e=el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:cls,'data-id':id||''});svg.append(e);return e}
function addPath(d,cls,id){const e=el('path',{d,class:cls,'data-id':id||''});svg.append(e);return e}

function isOpening(o){return !!(o&&o.kind==='line'&&o.openingType)}
function wallStrokeClass(s,sel=false){
  if(isOpening(s))return sel?'edge selected':(s.openingType==='door'?'door-line':'window-line');
  if(s.darkenedImport||s.structuralVisible)return sel?'edge selected':'imported-structural-wall';
  return sel?'edge selected':(s.wallType==='exterior'?'wall-ext':'wall-int');
}
function offsetSegmentWorld(a,b,off){
  const dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy)||1;
  const nx=-dy/L, ny=dx/L;
  return {a:{x:a.x+nx*off,y:a.y+ny*off,z:a.z||0}, b:{x:b.x+nx*off,y:b.y+ny*off,z:b.z||0}};
}
function drawWallLine2D(s,sel){
  const cls=wallStrokeClass(s,sel);
  const th=Number(s.thickness)||wallThickness(s.wallType||'interior');
  if(!isOpening(s) && s.doubleLine && th>0.03){
    const seg1=offsetSegmentWorld(s.a,s.b,th/2), seg2=offsetSegmentWorld(s.a,s.b,-th/2);
    addLine(world2D(seg1.a),world2D(seg1.b),cls,s.id);
    addLine(world2D(seg2.a),world2D(seg2.b),cls,s.id);
    if(sel)addLine(world2D(s.a),world2D(s.b),'wall-center selected',s.id);
    return;
  }
  addLine(world2D(s.a),world2D(s.b),cls,s.id);
}


function openingDir(o){const dx=o.b.x-o.a.x, dy=o.b.y-o.a.y, L=Math.hypot(dx,dy)||1;return {dx:dx/L,dy:dy/L,L}}
function openingNormal(o){const d=openingDir(o);return {nx:-d.dy, ny:d.dx}}
function addDoorSymbol2D(o,sel=false){
  const A=world2D(o.a), B=world2D(o.b);
  const n=openingNormal(o);
  const w=Math.hypot(B.x-A.x,B.y-A.y);
  const hingeAtEnd=o.doorHinge==='end';
  const hinge=hingeAtEnd?B:A;
  const close=hingeAtEnd?A:B;
  const swingSign=Number(o.doorSwingSign||1);
  const open={x:hinge.x+n.nx*w*swingSign, y:hinge.y-n.ny*w*swingSign};
  addLine({x:hinge.x,y:hinge.y}, close, sel?'door-leaf selected':'door-leaf', o.id);
  addLine({x:hinge.x,y:hinge.y}, open, sel?'door-leaf selected':'door-leaf', o.id);
  const r=w;
  const sweep=(swingSign>0)?1:0;
  const arc=`M ${close.x} ${close.y} A ${r} ${r} 0 0 ${sweep} ${open.x} ${open.y}`;
  addPath(arc, sel?'door-arc selected':'door-arc', o.id);
  addLine({x:A.x,y:A.y},{x:B.x,y:B.y}, sel?'door-gap selected':'door-gap', o.id);
}
function addWindowSymbol2D(o,sel=false){
  const A=world2D(o.a), B=world2D(o.b);
  const d=openingDir(o), n=openingNormal(o);
  const mx=(A.x+B.x)/2, my=(A.y+B.y)/2;
  const len=Math.hypot(B.x-A.x,B.y-A.y);
  const off=Math.min(10,Math.max(5,len*0.10));
  addLine(A,B,sel?'window-gap selected':'window-gap',o.id);
  addLine({x:A.x+n.nx*off,y:A.y-n.ny*off},{x:A.x-n.nx*off,y:A.y+n.ny*off},sel?'window-mark selected':'window-mark',o.id);
  addLine({x:B.x+n.nx*off,y:B.y-n.ny*off},{x:B.x-n.nx*off,y:B.y+n.ny*off},sel?'window-mark selected':'window-mark',o.id);
  addLine({x:mx+n.nx*off*0.8,y:my-n.ny*off*0.8},{x:mx-n.nx*off*0.8,y:my+n.ny*off*0.8},sel?'window-mark selected':'window-mark',o.id);
}
function drawOpening2D(o,sel=false){
  if(o.openingType==='door') addDoorSymbol2D(o,sel); else addWindowSymbol2D(o,sel);
}
function drawOpening3D(o,sel=false){
  const cls=sel?'edge selected':(o.openingType==='door'?'door-line':'window-line');
  addLine(project(o.a),project(o.b),cls,o.id);
}
function pointAlong(a,b,t,z=null){return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:z===null?(a.z||0)+( (b.z||0)-(a.z||0) )*t:z}}
function openingsOnWallSegment(a,b,wallType=null){
  const dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy)||1;
  const ux=dx/L, uy=dy/L;
  const tolDist=0.12;
  const tolEnd=0.02;
  return S.shapes.filter(o=>o.kind==='line'&&o.openingType).map(o=>{
    const t1=((o.a.x-a.x)*ux+(o.a.y-a.y)*uy)/L;
    const t2=((o.b.x-a.x)*ux+(o.b.y-a.y)*uy)/L;
    const start=Math.max(0,Math.min(t1,t2)), end=Math.min(1,Math.max(t1,t2));
    const c={x:(o.a.x+o.b.x)/2,y:(o.a.y+o.b.y)/2};
    const tc=((c.x-a.x)*ux+(c.y-a.y)*uy)/L;
    const perp=Math.abs((c.x-a.x)*(-uy)+(c.y-a.y)*(ux));
    if(perp>tolDist || end<tolEnd || start>1-tolEnd) return null;
    return {...o,start,end,center:tc,width:L*(end-start)};
  }).filter(Boolean).sort((p,q)=>p.start-q.start);
}

function grid2D(){for(let x=0;x<=1200;x+=44)svg.append(el('line',{x1:x,y1:0,x2:x,y2:760,class:'grid-line'}));for(let y=0;y<=760;y+=44)svg.append(el('line',{x1:0,y1:y,x2:1200,y2:y,class:'grid-line'}));svg.append(el('line',{x1:ORIGIN.x,y1:0,x2:ORIGIN.x,y2:760,class:'axis-x'}));svg.append(el('line',{x1:0,y1:ORIGIN.y,x2:1200,y2:ORIGIN.y,class:'axis-y'}))}
function grid3D(){if(!S.layers.terrain)return;svg.append(el('rect',{x:0,y:0,width:1200,height:385,fill:'#bce4f1'}));svg.append(el('rect',{x:0,y:385,width:1200,height:375,fill:'#bfd9ad'}));for(let i=-10;i<=10;i++){addLine(project({x:-10,y:i,z:0}),project({x:10,y:i,z:0}),'grid-line','');addLine(project({x:i,y:-10,z:0}),project({x:i,y:10,z:0}),'grid-line','')}addLine(project({x:-6,y:0,z:0}),project({x:6,y:0,z:0}),'axis-x','');addLine(project({x:0,y:-6,z:0}),project({x:0,y:6,z:0}),'axis-y','');addLine(project({x:0,y:0,z:0}),project({x:0,y:0,z:4}),'axis-z','')}
function renderImage(){
  if(!S.image||!S.layers.image||S.mode!=='2d')return;
  const x=ORIGIN.x+S.view2d.panX+S.image.x*SCALE;
  const y=ORIGIN.y+S.view2d.panY-S.image.y*SCALE;
  const w=S.image.w*S.image.scale,h=S.image.h*S.image.scale;
  const base=S.image.originalSrc||S.image.src;
  svg.append(el('image',{href:base,x,y,width:w,height:h,class:'imported-image'}));
  if(importPrefs().autoDarkenWalls&&S.image.wallMaskSrc){
    svg.append(el('image',{href:S.image.wallMaskSrc,x,y,width:w,height:h,class:'imported-wall-mask',opacity:clamp(Number(importPrefs().wallDarkness)||0.78,0,1)}));
  }
  if(S.calibration?.points?.length){
    const pts=S.calibration.points.map(world2D);
    if(pts.length===2)addLine(pts[0],pts[1],'calib-line','');
    pts.forEach(p=>svg.append(el('circle',{cx:p.x,cy:p.y,r:7,class:'calib-point'})));
  }
}

function drawShape2D(s,preview=false){
  const sel=S.selected.includes(s.id),cls=preview?'shape-preview':('shape-base'+(sel?' selected':''));
  if(s.kind==='line'){
    if(preview)addLine(world2D(s.a),world2D(s.b),'shape-preview',s.id);
    else if(isOpening(s)) drawOpening2D(s,sel);
    else drawWallLine2D(s,sel);
    if(!preview && !isOpening(s) && (!s.autoDetected||sel)) addText({x:(s.a.x+s.b.x)/2,y:(s.a.y+s.b.y)/2,z:0},s.name,sel);
    if(!preview && isOpening(s) && (!s.autoDetected||sel)) addText({x:(s.a.x+s.b.x)/2,y:(s.a.y+s.b.y)/2,z:0},s.openingType==='door'?'Porta':'Janela',sel);
    return;
  }
  addPoly(pointsOf(s).map(world2D),cls,s.id);
  if(!preview)addText(centroid(pointsOf(s)),s.name,sel)
}
function facesOf(s){const base=pointsOf(s),h=s.height||0;if(!isClosed(s)||h<=0.001)return[];const top=base.map(p=>({...p,z:h})),faces=[];for(let i=0;i<base.length;i++){const j=(i+1)%base.length;faces.push({type:'side',pts:[base[i],base[j],top[j],top[i]]})}faces.push({type:'top',pts:top});return faces}
function avgDepth(f){return f.pts.reduce((a,p)=>a+project(p).depth,0)/f.pts.length}

function drawShape3D(s,preview=false){
  const sel=S.selected.includes(s.id);
  if(s.kind==='line'){
    if(isOpening(s)) drawOpening3D(s,sel); else addLine(project(s.a),project(s.b),wallStrokeClass(s,sel),s.id);
    return;
  }
  if(!s.height||s.height<=0.001){
    addPoly(pointsOf(s).map(project),preview?'shape-preview':('shape-base'+(sel?' selected':'')),s.id);
    if(!preview)addText(centroid(pointsOf(s)),s.name,sel);return
  }
  facesOf(s).sort((a,b)=>avgDepth(a)-avgDepth(b)).forEach(f=>addPoly(f.pts.map(project),'face '+(f.type==='top'?'top':'side')+(sel?' selected':''),s.id));
  addText({...centroid(pointsOf(s)),z:s.height},s.name+' · '+n(s.height)+' m',sel)
}
function drawProfiles(){
  if(!S.layers.lsf)return;
  S.profiles.forEach(p=>{
    const sel=S.selected.includes(p.id), a=S.mode==='2d'?world2D(p.a):project(p.a), b=S.mode==='2d'?world2D(p.b):project(p.b);
    addLine(a,b,sel?'profile selected':'profile',p.id);
    addLine(a,b,'profile-hit',p.id);
    if(sel)addText(p.a,p.name+' · '+p.profile,true);
  });
}
function render(){clear();if(S.mode==='2d'){svg.append(el('rect',{x:0,y:0,width:1200,height:760,fill:'#f5fbfb'}));grid2D();renderImage();if(S.layers.architecture)S.shapes.forEach(s=>drawShape2D(s));if(S.draft)drawShape2D(S.draft,true);if(S.polygon.length>1)for(let i=0;i<S.polygon.length-1;i++)addLine(world2D(S.polygon[i]),world2D(S.polygon[i+1]),'shape-preview','')}else{grid3D();if(S.layers.architecture)S.shapes.forEach(s=>drawShape3D(s));if(S.draft)drawShape3D(S.draft,true)}drawProfiles()}
function idFrom(target){let t=target;while(t&&t!==svg){if(t.dataset&&t.dataset.id)return t.dataset.id;t=t.parentNode}return null}
function select(it,add=false){if(!it){if(!add)S.selected=[];$('#selLabel').textContent='Nenhum objeto selecionado.';render();panel();return}if(add||S.multi){S.selected.includes(it.id)?S.selected=S.selected.filter(x=>x!==it.id):S.selected.push(it.id)}else S.selected=[it.id];$('#selLabel').textContent=S.selected.length+' elemento(s): '+it.name;render();panel()}
function setTool(t){S.tool=t;$$('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===t));$('#toolLabel').textContent='Ferramenta: '+toolName(t);$('.workspace').classList.toggle('pan-mode',t==='pan');$('#hint').textContent=t==='pan'?'Mão: arraste a tela para navegar. Não move nem altera os objetos.':t==='push'?'Empurrar/Puxar: clique numa forma fechada e arraste para cima/baixo.':t==='calibrate'?'Calibração: clique em dois pontos conhecidos na imagem.':t==='orbit'?'Órbita: arraste em 3D. Roda do rato = zoom.':'Importe uma imagem, calibre, desenhe por cima, gere LSF, pré-calcule e exporte CSV.'}
function finish(s){s.id=uid();s.name=shapeName(s.kind)+' '+(S.shapes.length+1);s.height=s.height||0;S.shapes.push(s);S.draft=null;render();panel();msg(s.name+' fixado.')}
function pointerDown(e){const p=screenPt(e),w=snap(screenToWorld2D(p));$('#coords').textContent=`X: ${n(w.x,3)} · Y: ${n(w.y,3)} · Z: 0.000`;if(S.tool==='pan'){S.drag={kind:'pan',x:p.x,y:p.y,panX:S.mode==='2d'?S.view2d.panX:S.cam.panX,panY:S.mode==='2d'?S.view2d.panY:S.cam.panY};return}if(S.tool==='calibrate'){calibClick(w);return}if(S.tool==='orbit'&&S.mode==='3d'){S.drag={kind:'orbit',x:p.x,y:p.y,yaw:S.cam.yaw,pitch:S.cam.pitch};return}const it=item(idFrom(e.target));if(S.tool==='select'){select(it,e.ctrlKey||e.metaKey);return}if(S.tool==='delete'){if(it){select(it);removeSelected()}return}if(S.tool==='move'){if(!it&&!S.selected.length)return msg('Selecione primeiro um objeto.');if(it)select(it,e.ctrlKey||e.metaKey);S.drag={kind:'move',last:w};return}if(S.tool==='push'){if(!it||!isClosed(it))return msg('Selecione uma forma fechada.');select(it);if(S.mode!=='3d')setMode('3d');S.drag={kind:'push',id:it.id,startY:p.y,h:it.height||0};return}if(S.tool==='line'){S.draft={kind:'line',a:w,b:w};return}if(S.tool==='rect'){S.draft={kind:'rect',a:w,b:w};return}if(S.tool==='circle'){S.draft={kind:'circle',c:w,r:0};return}if(S.tool==='polygon'){S.polygon.push(w);render();return}}
function pointerMove(e){const p=screenPt(e),w=snap(screenToWorld2D(p));$('#coords').textContent=`X: ${n(w.x,3)} · Y: ${n(w.y,3)} · Z: 0.000`;if(S.drag?.kind==='pan'){if(S.mode==='2d'){S.view2d.panX=S.drag.panX+(p.x-S.drag.x);S.view2d.panY=S.drag.panY+(p.y-S.drag.y)}else{S.cam.panX=S.drag.panX+(p.x-S.drag.x);S.cam.panY=S.drag.panY+(p.y-S.drag.y)}render();return}if(S.drag?.kind==='orbit'){S.cam.yaw=S.drag.yaw+(p.x-S.drag.x)*0.010;S.cam.pitch=Math.max(-1.2,Math.min(1.2,S.drag.pitch+(p.y-S.drag.y)*0.008));render();return}if(S.drag?.kind==='push'){const it=item(S.drag.id);if(it){it.height=Math.max(0,S.drag.h+(S.drag.startY-p.y)/85);render()}return}if(S.drag?.kind==='move'){const dx=w.x-S.drag.last.x,dy=w.y-S.drag.last.y;moveSelected(dx,dy,0);S.drag.last=w;render();return}if(S.draft){if(S.draft.kind==='line')S.draft.b=w;if(S.draft.kind==='rect')S.draft.b=w;if(S.draft.kind==='circle')S.draft.r=Math.hypot(w.x-S.draft.c.x,w.y-S.draft.c.y);render()}}
function pointerUp(){if(S.drag){const k=S.drag.kind;S.drag=null;if(k==='push')msg('Altura fixada.');return}if(S.draft){if(S.draft.kind==='circle'){if(S.draft.r>0.08)finish(S.draft)}else if(Math.hypot(S.draft.b.x-S.draft.a.x,S.draft.b.y-S.draft.a.y)>0.08)finish(S.draft);S.draft=null}}
function setMode(m){S.mode=m;$('#v2').classList.toggle('active',m==='2d');$('#v3').classList.toggle('active',m==='3d');$('#badge').textContent=m==='2d'?'Vista 2D — Planta':'Vista 3D — Modelo';render()}
function moveSelected(dx,dy,dz){S.selected.map(item).filter(Boolean).forEach(o=>{if(o.kind==='profile'){o.a.x+=dx;o.b.x+=dx;o.a.y+=dy;o.b.y+=dy;o.a.z=(o.a.z||0)+dz;o.b.z=(o.b.z||0)+dz}else if(o.kind==='line'){o.a.x+=dx;o.b.x+=dx;o.a.y+=dy;o.b.y+=dy}else if(o.kind==='rect'){o.a.x+=dx;o.b.x+=dx;o.a.y+=dy;o.b.y+=dy}else if(o.kind==='circle'){o.c.x+=dx;o.c.y+=dy}else if(o.kind==='polygon'){o.points.forEach(p=>{p.x+=dx;p.y+=dy;p.z=(p.z||0)+dz})}})}
function removeSelected(){if(!S.selected.length)return msg('Selecione objetos antes de apagar.');if(!confirm('Apagar '+S.selected.length+' elemento(s)?'))return;const ids=new Set(S.selected);S.shapes=S.shapes.filter(o=>!ids.has(o.id));S.profiles=S.profiles.filter(o=>!ids.has(o.id));S.selected=[];render();panel();msg('Elementos apagados.')}

function importPlanFile(file){
  if(!file)return;
  const name=(file.name||'').toLowerCase();
  if(name.endsWith('.pdf') || file.type==='application/pdf') return importPDF(file);
  if(name.endsWith('.dxf')) return importDXF(file);
  if(name.endsWith('.dwg')) return importDWG(file);
  return importImage(file);
}
function importDWG(file){
  msg('DWG recebido. O navegador não lê DWG nativo: converta para DXF ou use conversor CAD no servidor.');
  S.tab='image';
  $$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab==='image'));
  panel();
}
async function importPDF(file){
  try{
    if(!window.pdfjsLib){msg('PDF.js não carregou. Tente novamente ou converta o PDF para imagem.');return}
    pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const buf=await file.arrayBuffer();
    const pdf=await pdfjsLib.getDocument({data:buf}).promise;
    const page=await pdf.getPage(1);
    const viewport=page.getViewport({scale:2.0});
    const c=document.createElement('canvas');
    c.width=viewport.width;c.height=viewport.height;
    await page.render({canvasContext:c.getContext('2d'),viewport}).promise;
    const src=c.toDataURL('image/png');
    await setImportedRaster(src,{source:'PDF página 1',maxW:720,maxH:520});
  }catch(err){
    console.error(err);
    msg('Não foi possível importar o PDF. Tente exportar a página para PNG/JPG ou DXF.');
  }
}
function importDXF(file){
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const text=reader.result;
      const entities=parseBasicDXF(text);
      if(!entities.length){msg('DXF lido, mas não encontrei linhas/polilinhas compatíveis.');return}
      const box=dxfBounds(entities);
      const cx=(box.minX+box.maxX)/2, cy=(box.minY+box.maxY)/2;
      const span=Math.max(box.maxX-box.minX, box.maxY-box.minY)||1;
      const scale=Math.min(8/span,1); // Fit into the working view in metres.
      const imported=[];
      entities.forEach(ent=>{
        if(ent.type==='LINE'){
          imported.push({kind:'line',a:{x:(ent.x1-cx)*scale,y:(ent.y1-cy)*scale,z:0},b:{x:(ent.x2-cx)*scale,y:(ent.y2-cy)*scale,z:0},imported:true});
        }
        if(ent.type==='LWPOLYLINE' && ent.points.length>=2){
          for(let i=0;i<ent.points.length-1;i++){
            imported.push({kind:'line',a:{x:(ent.points[i].x-cx)*scale,y:(ent.points[i].y-cy)*scale,z:0},b:{x:(ent.points[i+1].x-cx)*scale,y:(ent.points[i+1].y-cy)*scale,z:0},imported:true});
          }
          if(ent.closed){
            const a=ent.points[ent.points.length-1], b=ent.points[0];
            imported.push({kind:'line',a:{x:(a.x-cx)*scale,y:(a.y-cy)*scale,z:0},b:{x:(b.x-cx)*scale,y:(b.y-cy)*scale,z:0},imported:true});
          }
        }
      });
      const darkened=importPrefs().autoDarkenWalls?markDXFStructuralWalls(imported):0;
      imported.forEach(s=>{s.id=uid('D');s.name='DXF '+(S.shapes.length+1);s.height=0;S.shapes.push(s)});
      setMode('2d');render();panel();msg(imported.length+' entidades DXF importadas'+(darkened?', com '+darkened+' linhas estruturais escurecidas automaticamente.':'.'));
    }catch(err){
      console.error(err);msg('Erro ao ler DXF. Use DXF R12/R2000 com LINE/LWPOLYLINE.');
    }
  };
  reader.readAsText(file);
}
function parseBasicDXF(text){
  const raw=text.replace(/\r/g,'').split('\n').map(s=>s.trim());
  const pairs=[];
  for(let i=0;i<raw.length-1;i+=2)pairs.push([raw[i],raw[i+1]]);
  const out=[];
  for(let i=0;i<pairs.length;i++){
    if(pairs[i][0]==='0' && pairs[i][1]==='LINE'){
      let x1=0,y1=0,x2=0,y2=0;
      for(i=i+1;i<pairs.length;i++){
        const [c,v]=pairs[i];
        if(c==='0'){i--;break}
        if(c==='10')x1=parseFloat(v); if(c==='20')y1=parseFloat(v);
        if(c==='11')x2=parseFloat(v); if(c==='21')y2=parseFloat(v);
      }
      out.push({type:'LINE',x1,y1,x2,y2});
    }
    if(pairs[i][0]==='0' && pairs[i][1]==='LWPOLYLINE'){
      let pts=[],closed=false,current=null;
      for(i=i+1;i<pairs.length;i++){
        const [c,v]=pairs[i];
        if(c==='0'){i--;break}
        if(c==='70')closed=(parseInt(v,10)&1)===1;
        if(c==='10'){current={x:parseFloat(v),y:0};pts.push(current)}
        if(c==='20'&&current)current.y=parseFloat(v);
      }
      out.push({type:'LWPOLYLINE',points:pts,closed});
    }
  }
  return out;
}
function dxfBounds(entities){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  const add=(x,y)=>{minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)};
  entities.forEach(e=>{
    if(e.type==='LINE'){add(e.x1,e.y1);add(e.x2,e.y2)}
    if(e.type==='LWPOLYLINE')e.points.forEach(p=>add(p.x,p.y));
  });
  return {minX,minY,maxX,maxY};
}


function loadImageElement(src){
  return new Promise((resolve,reject)=>{
    const im=new Image();
    im.onload=()=>resolve(im);
    im.onerror=reject;
    im.src=src;
  });
}


function validBuildingBox(box,w,h){
  if(!box)return {x1:0,y1:0,x2:w-1,y2:h-1};
  const x1=clamp(Math.floor(box.x1),0,w-2),y1=clamp(Math.floor(box.y1),0,h-2);
  const x2=clamp(Math.ceil(box.x2),x1+1,w-1),y2=clamp(Math.ceil(box.y2),y1+1,h-1);
  if((x2-x1)<w*0.12||(y2-y1)<h*0.12)return {x1:Math.floor(w*0.03),y1:Math.floor(h*0.05),x2:Math.ceil(w*0.97),y2:Math.ceil(h*0.97)};
  return {x1,y1,x2,y2};
}
function mergeWallZones(zones,pad=2){
  const out=[];
  zones.sort((a,b)=>(b.score||0)-(a.score||0));
  zones.forEach(z=>{
    let hit=null;
    for(const o of out){
      if(z.orientation!==o.orientation)continue;
      const zt=zoneThickness(z),ot=zoneThickness(o);
      const crossDiff=z.orientation==='vertical'
        ?Math.abs((z.x1+z.x2-o.x1-o.x2)/2)
        :Math.abs((z.y1+z.y2-o.y1-o.y2)/2);
      if(crossDiff>Math.max(3,Math.min(zt,ot)*0.60))continue;
      let a1,a2,b1,b2;
      if(z.orientation==='vertical'){a1=z.y1;a2=z.y2;b1=o.y1;b2=o.y2}
      else{a1=z.x1;a2=z.x2;b1=o.x1;b2=o.x2}
      const overlap=Math.max(0,Math.min(a2,b2)-Math.max(a1,b1)+1);
      const gap=Math.max(0,Math.max(a1,b1)-Math.min(a2,b2));
      const ratio=overlap/Math.max(1,Math.min(a2-a1+1,b2-b1+1));
      if(ratio<0.45&&gap>pad)continue;
      hit=o;break;
    }
    if(hit){
      hit.x1=Math.min(hit.x1,z.x1);hit.y1=Math.min(hit.y1,z.y1);
      hit.x2=Math.max(hit.x2,z.x2);hit.y2=Math.max(hit.y2,z.y2);
      hit.score=Math.max(hit.score||0,z.score||0);
    }else out.push({...z});
  });
  return out;
}
function binaryLineOpen(src,w,h,orientation,minLen,gapAllow=2){
  const out=new Uint8Array(w*h);
  if(orientation==='horizontal'){
    for(let y=0;y<h;y++){
      let start=-1,last=-1,gaps=0;
      for(let x=0;x<w;x++){
        if(src[y*w+x]){if(start<0)start=x;last=x;gaps=0}
        else if(start>=0){
          gaps++;
          if(gaps>gapAllow){
            if(last-start+1>=minLen)for(let xx=start;xx<=last;xx++)out[y*w+xx]=1;
            start=-1;last=-1;gaps=0;
          }
        }
      }
      if(start>=0&&last-start+1>=minLen)for(let xx=start;xx<=last;xx++)out[y*w+xx]=1;
    }
  }else{
    for(let x=0;x<w;x++){
      let start=-1,last=-1,gaps=0;
      for(let y=0;y<h;y++){
        if(src[y*w+x]){if(start<0)start=y;last=y;gaps=0}
        else if(start>=0){
          gaps++;
          if(gaps>gapAllow){
            if(last-start+1>=minLen)for(let yy=start;yy<=last;yy++)out[yy*w+x]=1;
            start=-1;last=-1;gaps=0;
          }
        }
      }
      if(start>=0&&last-start+1>=minLen)for(let yy=start;yy<=last;yy++)out[yy*w+x]=1;
    }
  }
  return out;
}
function dilatePerpendicular(src,w,h,orientation,radius=1){
  const out=new Uint8Array(w*h);
  if(orientation==='horizontal'){
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(src[y*w+x]){
      for(let yy=Math.max(0,y-radius);yy<=Math.min(h-1,y+radius);yy++)out[yy*w+x]=1;
    }
  }else{
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(src[y*w+x]){
      for(let xx=Math.max(0,x-radius);xx<=Math.min(w-1,x+radius);xx++)out[y*w+xx]=1;
    }
  }
  return out;
}
function closeParallelLines(src,w,h,orientation,maxGap){
  const out=src.slice();
  if(orientation==='horizontal'){
    for(let x=0;x<w;x++){
      let prev=-9999;
      for(let y=0;y<h;y++)if(src[y*w+x]){
        if(y-prev>1&&y-prev<=maxGap)for(let yy=prev;yy<=y;yy++)out[yy*w+x]=1;
        prev=y;
      }
    }
  }else{
    for(let y=0;y<h;y++){
      let prev=-9999;
      for(let x=0;x<w;x++)if(src[y*w+x]){
        if(x-prev>1&&x-prev<=maxGap)for(let xx=prev;xx<=x;xx++)out[y*w+xx]=1;
        prev=x;
      }
    }
  }
  return out;
}
function retainPerpendicularThickness(src,w,h,orientation,minThickness=4){
  const out=new Uint8Array(w*h);
  if(orientation==='horizontal'){
    for(let x=0;x<w;x++){
      let start=-1;
      for(let y=0;y<=h;y++){
        const on=y<h&&src[y*w+x];
        if(on&&start<0)start=y;
        if((!on||y===h)&&start>=0){
          const end=y-1;
          if(end-start+1>=minThickness)for(let yy=start;yy<=end;yy++)out[yy*w+x]=1;
          start=-1;
        }
      }
    }
  }else{
    for(let y=0;y<h;y++){
      let start=-1;
      for(let x=0;x<=w;x++){
        const on=x<w&&src[y*w+x];
        if(on&&start<0)start=x;
        if((!on||x===w)&&start>=0){
          const end=x-1;
          if(end-start+1>=minThickness)for(let xx=start;xx<=end;xx++)out[y*w+xx]=1;
          start=-1;
        }
      }
    }
  }
  return out;
}
function rowRuns(mask,w,h,orientation,minLen,maxThickness=60){
  const tracks=[],active=[];
  const longCount=orientation==='horizontal'?h:w;
  const crossCount=orientation==='horizontal'?w:h;
  function runsAt(fixed){
    const runs=[];let start=-1;
    for(let p=0;p<=crossCount;p++){
      const on=p<crossCount&&(orientation==='horizontal'?mask[fixed*w+p]:mask[p*w+fixed]);
      if(on&&start<0)start=p;
      if((!on||p===crossCount)&&start>=0){
        const end=p-1;
        if(end-start+1>=minLen)runs.push({a:start,b:end});
        start=-1;
      }
    }
    return runs;
  }
  for(let fixed=0;fixed<longCount;fixed++){
    const runs=runsAt(fixed),used=new Set();
    for(const run of runs){
      let best=-1,bestScore=0;
      for(let i=0;i<active.length;i++){
        const z=active[i];
        if(z.last<fixed-1||fixed-z.first>=maxThickness)continue;
        const ov=Math.max(0,Math.min(z.b,run.b)-Math.max(z.a,run.a)+1);
        const ratio=ov/Math.max(1,Math.max(z.b-z.a+1,run.b-run.a+1));
        if(ratio>bestScore&&ratio>=0.38){best=i;bestScore=ratio}
      }
      if(best>=0){
        const z=active[best];
        z.a=Math.min(z.a,run.a);z.b=Math.max(z.b,run.b);z.last=fixed;z.samples++;
        used.add(best);
      }else{
        active.push({a:run.a,b:run.b,first:fixed,last:fixed,samples:1});
        used.add(active.length-1);
      }
    }
    for(let i=active.length-1;i>=0;i--){
      if(active[i].last<fixed-1){tracks.push(active[i]);active.splice(i,1)}
    }
  }
  tracks.push(...active);
  return tracks.map(t=>{
    if(orientation==='horizontal')return {x1:t.a,y1:t.first,x2:t.b,y2:t.last,orientation,score:(t.b-t.a+1)*(t.last-t.first+1)};
    return {x1:t.first,y1:t.a,x2:t.last,y2:t.b,orientation,score:(t.b-t.a+1)*(t.last-t.first+1)};
  });
}
function zoneLength(z){return z.orientation==='horizontal'?z.x2-z.x1+1:z.y2-z.y1+1}
function zoneThickness(z){return z.orientation==='horizontal'?z.y2-z.y1+1:z.x2-z.x1+1}
function zonesTouch(a,b,pad=5){
  return !(a.x2<b.x1-pad||a.x1>b.x2+pad||a.y2<b.y1-pad||a.y1>b.y2+pad);
}
function selectMainWallZones(zones,w,h){
  if(!zones.length)return {zones:[],box:{x1:0,y1:0,x2:w-1,y2:h-1}};
  const parent=zones.map((_,i)=>i);
  const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i]}return i};
  const union=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a};
  const pad=Math.max(5,Math.round(Math.min(w,h)*0.006));
  for(let i=0;i<zones.length;i++)for(let j=i+1;j<zones.length;j++)if(zonesTouch(zones[i],zones[j],pad))union(i,j);
  const groups=new Map();
  zones.forEach((z,i)=>{
    const r=find(i),g=groups.get(r)||{idx:[],score:0,x1:w,y1:h,x2:0,y2:0};
    g.idx.push(i);g.score+=(zoneLength(z)*Math.max(4,zoneThickness(z)))+z.score*0.7;
    g.x1=Math.min(g.x1,z.x1);g.y1=Math.min(g.y1,z.y1);g.x2=Math.max(g.x2,z.x2);g.y2=Math.max(g.y2,z.y2);
    groups.set(r,g);
  });
  const best=[...groups.values()].sort((a,b)=>b.score-a.score)[0];
  let inside=zones.filter((z,i)=>find(i)===find(best.idx[0]));
  const minDim=Math.min(w,h);
  const verts=inside.filter(z=>z.orientation==='vertical'&&zoneThickness(z)>=7&&zoneLength(z)>=minDim*0.22);
  const hors=inside.filter(z=>z.orientation==='horizontal'&&zoneThickness(z)>=7&&zoneLength(z)>=minDim*0.22);
  let box;
  if(verts.length>=2&&hors.length>=2){
    const vx=verts.map(z=>(z.x1+z.x2)/2),hy=hors.map(z=>(z.y1+z.y2)/2);
    box={x1:Math.min(...vx),x2:Math.max(...vx),y1:Math.min(...hy),y2:Math.max(...hy)};
  }else box={x1:best.x1,y1:best.y1,x2:best.x2,y2:best.y2};
  box={x1:clamp(Math.floor(box.x1),0,w-2),y1:clamp(Math.floor(box.y1),0,h-2),x2:clamp(Math.ceil(box.x2),1,w-1),y2:clamp(Math.ceil(box.y2),1,h-1)};
  const mx=Math.max(8,(box.x2-box.x1)*0.04),my=Math.max(8,(box.y2-box.y1)*0.04);
  inside=zones.filter(z=>{
    const cx=(z.x1+z.x2)/2,cy=(z.y1+z.y2)/2;
    return cx>=box.x1-mx&&cx<=box.x2+mx&&cy>=box.y1-my&&cy<=box.y2+my;
  });
  return {zones:inside,box};
}
function analyseStructuralWalls(canvas,threshold=null){
  const prefs=importPrefs(),map=getDarkMap(canvas,threshold ?? (Number(prefs.darkThreshold)||185));
  const {dark,w,h}=map;
  const minLen=Math.max(20,Math.round(Math.min(w,h)*(Number(prefs.minWallRunRatio)||0.035)));
  const maxGap=clamp(Number(prefs.maxWallGapPx)||34,12,54);
  let hLines=binaryLineOpen(dark,w,h,'horizontal',minLen,2);
  let vLines=binaryLineOpen(dark,w,h,'vertical',minLen,2);
  hLines=dilatePerpendicular(hLines,w,h,'horizontal',1);
  vLines=dilatePerpendicular(vLines,w,h,'vertical',1);
  let hWalls=closeParallelLines(hLines,w,h,'horizontal',maxGap);
  let vWalls=closeParallelLines(vLines,w,h,'vertical',maxGap);
  hWalls=retainPerpendicularThickness(hWalls,w,h,'horizontal',4);
  vWalls=retainPerpendicularThickness(vWalls,w,h,'vertical',4);
  hWalls=binaryLineOpen(hWalls,w,h,'horizontal',Math.max(14,Math.round(minLen*0.62)),1);
  vWalls=binaryLineOpen(vWalls,w,h,'vertical',Math.max(14,Math.round(minLen*0.62)),1);
  let zones=[
    ...rowRuns(hWalls,w,h,'horizontal',Math.max(18,Math.round(minLen*0.70)),maxGap+12),
    ...rowRuns(vWalls,w,h,'vertical',Math.max(18,Math.round(minLen*0.70)),maxGap+12)
  ];
  const maxBand=Math.max(18,maxGap+12);
  zones=zones.filter(z=>zoneThickness(z)>=4&&zoneThickness(z)<=maxBand&&zoneLength(z)>=Math.max(18,minLen*0.72)&&zoneLength(z)/zoneThickness(z)>=2.2);
  zones=mergeWallZones(zones,2);
  const main=selectMainWallZones(zones,w,h);
  return {map,zones:main.zones,box:main.box,w,h,minLen,maxGap};
}
// -----------------------------------------------------------------------------
// Deteção estrutural ortogonal V3
// Usa pares de linhas paralelas para localizar bandas de parede, constrói uma
// rede ligada às paredes exteriores e conserva os intervalos de portas/janelas.
// -----------------------------------------------------------------------------
function lineTrackFromZone(z){
  const horizontal=z.orientation==='horizontal';
  return {
    orientation:z.orientation,
    axis:horizontal?(z.y1+z.y2)/2:(z.x1+z.x2)/2,
    a:horizontal?z.x1:z.y1,
    b:horizontal?z.x2:z.y2,
    thickness:horizontal?(z.y2-z.y1+1):(z.x2-z.x1+1),
    score:Number(z.score)||0,
    parts:[[horizontal?z.x1:z.y1,horizontal?z.x2:z.y2]]
  };
}
function mergeCollinearLineTracks(tracks,axisTol,gapTol){
  const sorted=tracks.map(t=>({...t,parts:[...(t.parts||[[t.a,t.b]])]})).sort((a,b)=>a.axis-b.axis||a.a-b.a);
  const out=[];
  for(const t of sorted){
    let best=null,bestMetric=Infinity;
    for(const o of out){
      if(o.orientation!==t.orientation)continue;
      const axisDiff=Math.abs(o.axis-t.axis);
      if(axisDiff>axisTol)continue;
      const gap=Math.max(0,Math.max(o.a,t.a)-Math.min(o.b,t.b));
      if(gap>gapTol)continue;
      const metric=axisDiff+gap*0.015;
      if(metric<bestMetric){best=o;bestMetric=metric}
    }
    if(!best){out.push(t);continue}
    const oldLen=Math.max(1,best.b-best.a+1),newLen=Math.max(1,t.b-t.a+1);
    best.axis=(best.axis*oldLen+t.axis*newLen)/(oldLen+newLen);
    best.a=Math.min(best.a,t.a);best.b=Math.max(best.b,t.b);
    best.thickness=Math.max(best.thickness,t.thickness);
    best.score=Math.max(best.score,t.score);
    best.parts.push(...(t.parts||[[t.a,t.b]]));
  }
  return out;
}
function darkDensityInRect(map,x1,y1,x2,y2){
  const {dark,w,h}=map;
  x1=clamp(Math.floor(x1),0,w-1);x2=clamp(Math.ceil(x2),0,w-1);
  y1=clamp(Math.floor(y1),0,h-1);y2=clamp(Math.ceil(y2),0,h-1);
  let count=0,total=0;
  for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++){count+=dark[y*w+x]?1:0;total++}
  return count/Math.max(1,total);
}
function pairParallelLineTracks(tracks,orientation,map,opts={}){
  const minSep=Number(opts.minSep)||6,maxSep=Number(opts.maxSep)||40,minOverlap=Number(opts.minOverlap)||24;
  const candidates=[];
  for(let i=0;i<tracks.length;i++)for(let j=i+1;j<tracks.length;j++){
    const a=tracks[i],b=tracks[j];
    const sep=Math.abs(a.axis-b.axis);
    if(sep<minSep||sep>maxSep)continue;
    const overlap=Math.max(0,Math.min(a.b,b.b)-Math.max(a.a,b.a)+1);
    const union=Math.max(a.b,b.b)-Math.min(a.a,b.a)+1;
    if(overlap<minOverlap&&overlap/Math.max(1,union)<0.28)continue;
    const lo=Math.min(a.axis,b.axis),hi=Math.max(a.axis,b.axis),start=Math.min(a.a,b.a),end=Math.max(a.b,b.b);
    const z=orientation==='horizontal'
      ?{orientation,x1:start,x2:end,y1:lo,y2:hi,axis:(lo+hi)/2,a:start,b:end}
      :{orientation,x1:lo,x2:hi,y1:start,y2:end,axis:(lo+hi)/2,a:start,b:end};
    z.length=end-start+1;z.thickness=hi-lo+1;z.overlap=overlap;
    z.density=darkDensityInRect(map,z.x1,z.y1,z.x2,z.y2);
    const overlapRatio=overlap/Math.max(1,Math.min(a.b-a.a+1,b.b-b.a+1));
    z.score=z.length*z.thickness*(0.35+z.density)*(0.55+Math.min(1,overlapRatio));
    candidates.push(z);
  }
  candidates.sort((a,b)=>b.score-a.score);
  const out=[];
  for(const z of candidates){
    const duplicate=out.some(o=>{
      if(o.orientation!==z.orientation)return false;
      const axisTol=Math.max(5,Math.min(o.thickness,z.thickness)*0.70);
      if(Math.abs(o.axis-z.axis)>axisTol)return false;
      const ov=Math.max(0,Math.min(o.b,z.b)-Math.max(o.a,z.a)+1);
      const ratio=ov/Math.max(1,Math.min(o.length,z.length));
      const crossTouch=z.orientation==='horizontal'
        ?!(z.y2<o.y1-3||z.y1>o.y2+3)
        :!(z.x2<o.x1-3||z.x1>o.x2+3);
      return ratio>=0.58&&crossTouch;
    });
    if(!duplicate)out.push(z);
  }
  return out;
}
function bandCrosses(a,b,pad=8){
  if(a.orientation===b.orientation)return false;
  const h=a.orientation==='horizontal'?a:b,v=a.orientation==='vertical'?a:b;
  return v.axis>=h.a-pad&&v.axis<=h.b+pad&&h.axis>=v.a-pad&&h.axis<=v.b+pad;
}
function selectOuterBand(candidates,orientation,edge,span,minLength){
  return candidates
    .filter(z=>z.orientation===orientation&&z.length>=minLength)
    .map(z=>({...z,edgeDistance:Math.abs(z.axis-edge)}))
    .filter(z=>z.edgeDistance<=span*0.16)
    .sort((a,b)=>(a.edgeDistance-b.edgeDistance)||b.score-a.score)[0]||null;
}
function bridgeBooleanGaps(values,maxGap){
  const out=values.slice();let last=-1;
  for(let i=0;i<out.length;i++)if(out[i]){
    if(last>=0&&i-last-1<=maxGap)for(let k=last+1;k<i;k++)out[k]=1;
    last=i;
  }
  return out;
}
function removeShortBooleanRuns(values,minRun){
  const out=values.slice();let start=-1;
  for(let i=0;i<=out.length;i++){
    const on=i<out.length&&out[i];
    if(on&&start<0)start=i;
    if((!on||i===out.length)&&start>=0){
      if(i-start<minRun)for(let k=start;k<i;k++)out[k]=0;
      start=-1;
    }
  }
  return out;
}
function movingAverage(values,radius){
  const out=new Array(values.length).fill(0),prefix=new Array(values.length+1).fill(0);
  for(let i=0;i<values.length;i++)prefix[i+1]=prefix[i]+values[i];
  for(let i=0;i<values.length;i++){
    const a=Math.max(0,i-radius),b=Math.min(values.length-1,i+radius);
    out[i]=(prefix[b+1]-prefix[a])/(b-a+1);
  }
  return out;
}
function bandSupportProfile(map,band){
  const {dark,w,h}=map,start=Math.round(band.a),end=Math.round(band.b);
  const count=Math.max(1,end-start+1),edge1=new Array(count).fill(0),edge2=new Array(count).fill(0),fill=new Array(count).fill(0),centre=new Array(count).fill(0),texture=new Array(count).fill(0);
  const T=Math.max(3,Math.round(band.thickness)),edgeR=Math.max(1,Math.round(T*0.16)),centreR=Math.max(1,Math.round(T*0.10));
  for(let i=0;i<count;i++){
    const p=start+i;let e1=0,e2=0,all=0,mid=0,total=0,diff=0,diffTotal=0;
    if(band.orientation==='horizontal'){
      const yA=Math.round(band.y1),yB=Math.round(band.y2),yM=Math.round(band.axis),x=clamp(p,0,w-1),prevX=clamp(p-1,0,w-1);
      for(let y=Math.max(0,yA-edgeR);y<=Math.min(h-1,yA+edgeR);y++)e1=Math.max(e1,dark[y*w+x]?1:0);
      for(let y=Math.max(0,yB-edgeR);y<=Math.min(h-1,yB+edgeR);y++)e2=Math.max(e2,dark[y*w+x]?1:0);
      for(let y=Math.max(0,Math.floor(band.y1));y<=Math.min(h-1,Math.ceil(band.y2));y++){all+=dark[y*w+x]?1:0;total++}
      for(let y=Math.max(0,yM-centreR);y<=Math.min(h-1,yM+centreR);y++)mid=Math.max(mid,dark[y*w+x]?1:0);
      for(let y=Math.max(0,Math.floor(band.y1)+2);y<=Math.min(h-1,Math.ceil(band.y2)-2);y++){diff+=(dark[y*w+x]?1:0)!==(dark[y*w+prevX]?1:0)?1:0;diffTotal++}
    }else{
      const xA=Math.round(band.x1),xB=Math.round(band.x2),xM=Math.round(band.axis),y=clamp(p,0,h-1),prevY=clamp(p-1,0,h-1);
      for(let x=Math.max(0,xA-edgeR);x<=Math.min(w-1,xA+edgeR);x++)e1=Math.max(e1,dark[y*w+x]?1:0);
      for(let x=Math.max(0,xB-edgeR);x<=Math.min(w-1,xB+edgeR);x++)e2=Math.max(e2,dark[y*w+x]?1:0);
      for(let x=Math.max(0,Math.floor(band.x1));x<=Math.min(w-1,Math.ceil(band.x2));x++){all+=dark[y*w+x]?1:0;total++}
      for(let x=Math.max(0,xM-centreR);x<=Math.min(w-1,xM+centreR);x++)mid=Math.max(mid,dark[y*w+x]?1:0);
      for(let x=Math.max(0,Math.floor(band.x1)+2);x<=Math.min(w-1,Math.ceil(band.x2)-2);x++){diff+=(dark[y*w+x]?1:0)!==(dark[prevY*w+x]?1:0)?1:0;diffTotal++}
    }
    edge1[i]=e1;edge2[i]=e2;fill[i]=all/Math.max(1,total);centre[i]=mid;texture[i]=diff/Math.max(1,diffTotal);
  }
  const r=Math.max(2,Math.round(T*0.16)),s1=movingAverage(edge1,r),s2=movingAverage(edge2,r),sf=movingAverage(fill,r),st=movingAverage(texture,Math.max(2,Math.round(r*0.7)));
  const sortedTex=[...st].sort((a,b)=>a-b),q75=sortedTex[Math.floor(sortedTex.length*0.75)]||0;
  let wall;
  if(q75>=0.055){
    const textureThreshold=clamp(q75*0.50,0.085,0.155);
    const solidThreshold=Math.max(0.58,Math.min(0.78,(Number(band.density)||0.35)*1.22));
    wall=st.map((v,i)=>(v>=textureThreshold||sf[i]>=solidThreshold)?1:0);
  }else{
    wall=s1.map((v,i)=>((v>=0.38&&s2[i]>=0.38)||sf[i]>=0.22)?1:0);
  }
  wall=bridgeBooleanGaps(wall,Math.max(5,Math.round(T*0.55)));
  wall=removeShortBooleanRuns(wall,Math.max(7,Math.round(T*0.45)));
  return {start,end,wall,centre:movingAverage(centre,2),fill:sf,texture:st,q75};
}
function runsFromBoolean(profile){
  const runs=[];let start=-1;
  for(let i=0;i<=profile.length;i++){
    const on=i<profile.length&&profile[i];
    if(on&&start<0)start=i;
    if((!on||i===profile.length)&&start>=0){runs.push([start,i-1]);start=-1}
  }
  return runs;
}
function longestRunConnectedToBand(map,band,alongPx,direction,reach){
  const {dark,w,h}=map,T=Math.max(3,Math.round(band.thickness));
  let best=0;
  for(let offset=-4;offset<=4;offset++){
    let run=0,gaps=0,maxRun=0;
    for(let d=Math.round(T/2)+1;d<=reach;d++){
      let on=0;
      if(band.orientation==='vertical'){
        const y=clamp(Math.round(alongPx+offset),0,h-1),x=clamp(Math.round(band.axis+direction*d),0,w-1);
        for(let yy=Math.max(0,y-1);yy<=Math.min(h-1,y+1);yy++)on=Math.max(on,dark[yy*w+x]?1:0);
      }else{
        const x=clamp(Math.round(alongPx+offset),0,w-1),y=clamp(Math.round(band.axis+direction*d),0,h-1);
        for(let xx=Math.max(0,x-1);xx<=Math.min(w-1,x+1);xx++)on=Math.max(on,dark[y*w+xx]?1:0);
      }
      if(on){run++;gaps=0;maxRun=Math.max(maxRun,run)}
      else if(run>0){gaps++;if(gaps<=2)run++;else{run=0;gaps=0}}
    }
    best=Math.max(best,maxRun);
  }
  return best;
}
function openingTypeForGap(map,band,fromPx,toPx,centreProfile,profileStart,wallType){
  const gapPx=Math.max(1,toPx-fromPx+1),reach=Math.min(Math.round(gapPx*1.25),Math.round(Math.min(map.w,map.h)*0.22));
  let leaf=0;
  for(const endpoint of [fromPx,toPx])for(const dir of [-1,1])leaf=Math.max(leaf,longestRunConnectedToBand(map,band,endpoint,dir,reach));
  const ia=clamp(Math.round(fromPx-profileStart),0,centreProfile.length-1),ib=clamp(Math.round(toPx-profileStart),0,centreProfile.length-1);
  let centre=0;for(let i=Math.min(ia,ib);i<=Math.max(ia,ib);i++)centre+=centreProfile[i]||0;
  const centreRatio=centre/Math.max(1,Math.abs(ib-ia)+1);
  if(leaf>=Math.max(20,gapPx*0.82))return 'door';
  if(wallType==='exterior')return 'window';
  if(centreRatio>=0.30)return 'window';
  return 'door';
}
function splitDetectedBand(map,band,box){
  const prof=bandSupportProfile(map,band),pixelPerM=band.orientation==='horizontal'?(box.x2-box.x1)/10:(box.y2-box.y1)/7;
  const minWallPx=Math.max(9,Math.round(pixelPerM*0.10)),minOpeningPx=Math.max(8,Math.round(pixelPerM*0.30)),maxOpeningPx=Math.max(35,Math.round(pixelPerM*2.70));
  let runs=runsFromBoolean(prof.wall).filter(r=>r[1]-r[0]+1>=minWallPx);
  if(!runs.length)runs=[[0,prof.wall.length-1]];
  const wallRuns=runs.map(r=>[prof.start+r[0],prof.start+r[1]]);
  const openings=[];
  const addGap=(from,to)=>{
    const len=to-from+1;
    if(len<minOpeningPx||len>maxOpeningPx)return;
    const type=openingTypeForGap(map,band,from,to,prof.centre,prof.start,band.wallType);
    openings.push({fromPx:from,toPx:to,openingType:type,band});
  };
  for(let i=0;i<wallRuns.length-1;i++)addGap(wallRuns[i][1]+1,wallRuns[i+1][0]-1);
  // Em paredes interiores, portas podem ocupar a extremidade entre um troço de
  // parede e a parede perpendicular que fecha o compartimento.
  if(band.wallType==='interior'&&wallRuns.length){
    addGap(prof.start,wallRuns[0][0]-1);
    addGap(wallRuns[wallRuns.length-1][1]+1,prof.end);
  }
  return {band,wallRuns,openings,profile:prof};
}
function structuralZoneToBand(z,map){
  const horizontal=z.orientation==='horizontal';
  const band={
    orientation:z.orientation,
    x1:z.x1,y1:z.y1,x2:z.x2,y2:z.y2,
    axis:horizontal?(z.y1+z.y2)/2:(z.x1+z.x2)/2,
    a:horizontal?z.x1:z.y1,
    b:horizontal?z.x2:z.y2,
    length:horizontal?(z.x2-z.x1+1):(z.y2-z.y1+1),
    thickness:horizontal?(z.y2-z.y1+1):(z.x2-z.x1+1),
    sourceScore:Number(z.score)||0
  };
  band.density=darkDensityInRect(map,band.x1,band.y1,band.x2,band.y2);
  const T=band.thickness;
  const thicknessFit=T>=11&&T<=30?1.45:(T>=8&&T<=38?1:(T<=46?0.58:0.30));
  band.score=band.length*(0.25+band.density)*thicknessFit;
  return band;
}
function sameWallBand(a,b,axisFactor=0.62,overlapRatio=0.52){
  if(a.orientation!==b.orientation)return false;
  const axisTol=Math.max(6,Math.min(a.thickness,b.thickness)*axisFactor);
  if(Math.abs(a.axis-b.axis)>axisTol)return false;
  const overlap=Math.max(0,Math.min(a.b,b.b)-Math.max(a.a,b.a)+1);
  return overlap/Math.max(1,Math.min(a.length,b.length))>=overlapRatio;
}
function dedupeStructuralBands(bands){
  const out=[];
  for(const z of [...bands].sort((a,b)=>b.score-a.score)){
    if(out.some(o=>sameWallBand(o,z)))continue;
    out.push({...z});
  }
  return out;
}
function mergeCollinearStructuralPieces(bands,maxGap){
  const list=bands.map(z=>({...z}));let changed=true;
  while(changed){
    changed=false;
    outer:for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
      const a=list[i],b=list[j];if(a.orientation!==b.orientation)continue;
      const axisTol=Math.max(7,Math.min(a.thickness,b.thickness)*0.82);
      if(Math.abs(a.axis-b.axis)>axisTol)continue;
      const overlap=Math.max(0,Math.min(a.b,b.b)-Math.max(a.a,b.a)+1);
      const gap=Math.max(0,Math.max(a.a,b.a)-Math.min(a.b,b.b)-1);
      if(overlap>Math.min(a.length,b.length)*0.25||gap>maxGap)continue;
      const wa=a.length*(0.3+a.density),wb=b.length*(0.3+b.density);
      const axis=(a.axis*wa+b.axis*wb)/Math.max(1,wa+wb);
      const merged={...a,axis,a:Math.min(a.a,b.a),b:Math.max(a.b,b.b)};
      merged.length=merged.b-merged.a+1;
      merged.thickness=Math.max(a.thickness,b.thickness);
      merged.density=(a.density*a.length+b.density*b.length)/Math.max(1,a.length+b.length);
      merged.score=a.score+b.score;
      if(merged.orientation==='horizontal'){
        merged.x1=merged.a;merged.x2=merged.b;
        merged.y1=axis-merged.thickness/2;merged.y2=axis+merged.thickness/2;
      }else{
        merged.y1=merged.a;merged.y2=merged.b;
        merged.x1=axis-merged.thickness/2;merged.x2=axis+merged.thickness/2;
      }
      list[i]=merged;list.splice(j,1);changed=true;break outer;
    }
  }
  return dedupeStructuralBands(list);
}
function endpointConnectionCount(z,bands,pad){
  let start=0,end=0;
  for(const o of bands){
    if(o===z||o.orientation===z.orientation)continue;
    const cross=z.orientation==='horizontal'?o.axis:z.axis;
    const otherAxis=z.orientation==='horizontal'?z.axis:o.axis;
    const oStart=o.a-pad,oEnd=o.b+pad;
    if(otherAxis<oStart||otherAxis>oEnd)continue;
    if(Math.abs(cross-z.a)<=pad)start++;
    if(Math.abs(cross-z.b)<=pad)end++;
  }
  return {start,end,total:start+end};
}
function connectedBandsFromOuter(candidates,outer){
  const accepted=[...outer],keys=new Set(outer.map(z=>z.__key));
  let changed=true;
  while(changed){
    changed=false;
    for(const z of candidates){
      if(keys.has(z.__key))continue;
      const pad=Math.max(10,z.thickness*0.75);
      const crosses=accepted.filter(o=>bandCrosses(z,o,pad)).length;
      const ep=endpointConnectionCount(z,accepted,pad*1.35);
      if(crosses>=1&&(ep.total>=1||z.length>=220)){
        accepted.push(z);keys.add(z.__key);changed=true;
      }
    }
  }
  return accepted;
}

function attachThinStructuralPieces(strong,thin,maxGap){
  const out=strong.map(z=>({...z}));
  for(const t of thin){
    let best=null,bestMetric=Infinity;
    for(const z of out){
      if(z.orientation!==t.orientation)continue;
      const axisDiff=Math.abs(z.axis-t.axis);
      if(axisDiff>Math.max(8,z.thickness*0.68))continue;
      const gap=Math.max(0,Math.max(z.a,t.a)-Math.min(z.b,t.b)-1);
      if(gap>maxGap)continue;
      const metric=axisDiff+gap*0.02;
      if(metric<bestMetric){best=z;bestMetric=metric}
    }
    if(!best)continue;
    best.a=Math.min(best.a,t.a);best.b=Math.max(best.b,t.b);best.length=best.b-best.a+1;
    best.score+=t.score*0.35;
    if(best.orientation==='horizontal'){best.x1=best.a;best.x2=best.b}
    else{best.y1=best.a;best.y2=best.b}
  }
  return out;
}
function detectOrthogonalStructuralNetworkCore(canvas,threshold=null){
  const prefs=importPrefs(),analysis=analyseStructuralWalls(canvas,threshold??(Number(prefs.darkThreshold)||185)),map=analysis.map;
  const {w,h}=map,minDim=Math.min(w,h),baseBox=validBuildingBox(analysis.box,w,h);
  const minLength=Math.max(72,Math.round(minDim*0.085));
  const allBands=analysis.zones.map(z=>structuralZoneToBand(z,map)).filter(z=>z.length>=Math.max(42,minLength*0.70)&&z.thickness>=4&&z.thickness<=Math.max(46,minDim*0.058)&&z.density>=0.045);
  const strongBands=allBands.filter(z=>z.length>=minLength&&z.thickness>=8);
  const thinBands=allBands.filter(z=>z.thickness<8);
  let candidates=dedupeStructuralBands(strongBands);
  candidates=mergeCollinearStructuralPieces(candidates,Math.max(55,Math.round(minDim*0.24)));
  candidates=attachThinStructuralPieces(candidates,thinBands,Math.max(32,Math.round(minDim*0.13)));
  candidates=dedupeStructuralBands(candidates);

  const bw=baseBox.x2-baseBox.x1,bh=baseBox.y2-baseBox.y1;
  const top=selectOuterBand(candidates,'horizontal',baseBox.y1,bh,bw*0.48);
  const bottom=selectOuterBand(candidates,'horizontal',baseBox.y2,bh,bw*0.58);
  const left=selectOuterBand(candidates,'vertical',baseBox.x1,bw,bh*0.58);
  const right=selectOuterBand(candidates,'vertical',baseBox.x2,bw,bh*0.58);
  const outer=[top,bottom,left,right].filter(Boolean);
  let box={...baseBox};
  if(top)box.y1=top.axis;if(bottom)box.y2=bottom.axis;if(left)box.x1=left.axis;if(right)box.x2=right.axis;
  const margin=Math.max(10,Math.min(box.x2-box.x1,box.y2-box.y1)*0.03);
  candidates=candidates.filter(z=>{
    const cx=(z.x1+z.x2)/2,cy=(z.y1+z.y2)/2;
    const inside=cx>=box.x1-margin&&cx<=box.x2+margin&&cy>=box.y1-margin&&cy<=box.y2+margin;
    if(!inside)return false;
    const nearBoundary=z.orientation==='horizontal'
      ?Math.min(Math.abs(z.axis-box.y1),Math.abs(z.axis-box.y2))/(box.y2-box.y1)
      :Math.min(Math.abs(z.axis-box.x1),Math.abs(z.axis-box.x2))/(box.x2-box.x1);
    const isOuter=outer.includes(z);
    return isOuter||nearBoundary>=0.115;
  });
  candidates.forEach((z,i)=>z.__key=[z.orientation,Math.round(z.axis),Math.round(z.a),Math.round(z.b),i].join('|'));
  outer.forEach((z,i)=>{if(!z.__key)z.__key='outer-'+i});

  let connected=connectedBandsFromOuter(candidates,outer);
  // Mantém apenas elementos com ligação física à rede; elimina mobiliário isolado.
  connected=connected.filter(z=>{
    if(outer.includes(z))return true;
    const pad=Math.max(10,z.thickness*0.85);
    const ep=endpointConnectionCount(z,connected,pad*1.45);
    const cross=connected.filter(o=>o!==z&&bandCrosses(z,o,pad)).length;
    return (ep.start>0&&ep.end>0)||cross>=2||((ep.total>=1||cross>=1)&&z.length>=minDim*0.22);
  });
  connected=dedupeStructuralBands(connected);
  const unique=connected.map(z=>{
    const outerWall=outer.some(o=>o.orientation===z.orientation&&Math.abs(o.axis-z.axis)<=Math.max(7,z.thickness*0.45));
    return {...z,wallType:outerWall?'exterior':'interior'};
  });
  const split=unique.map(z=>splitDetectedBand(map,z,box));
  return {analysis,map,box,bands:unique,split,w,h,candidates,outer};
}


function dilateBinaryGrid(src,w,h,radius=1){
  const out=new Uint8Array(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(src[y*w+x]){
    for(let yy=Math.max(0,y-radius);yy<=Math.min(h-1,y+radius);yy++)for(let xx=Math.max(0,x-radius);xx<=Math.min(w-1,x+radius);xx++)out[yy*w+xx]=1;
  }
  return out;
}
function erodeBinaryGrid(src,w,h,radius=1){
  const out=new Uint8Array(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    let ok=1;
    for(let yy=Math.max(0,y-radius);yy<=Math.min(h-1,y+radius)&&ok;yy++)for(let xx=Math.max(0,x-radius);xx<=Math.min(w-1,x+radius);xx++)if(!src[yy*w+xx]){ok=0;break}
    if(ok)out[y*w+x]=1;
  }
  return out;
}
function locateArchitecturalPlanRegion(canvas,threshold=185){
  const map=getDarkMap(canvas,threshold),{dark,w,h}=map,maxSide=420,scale=Math.max(1,Math.max(w,h)/maxSide);
  const cw=Math.max(1,Math.ceil(w/scale)),ch=Math.max(1,Math.ceil(h/scale));
  const counts=new Uint16Array(cw*ch),cellPixels=new Uint16Array(cw*ch);
  const mx=Math.floor(w*0.025),my=Math.floor(h*0.025);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const cx=Math.min(cw-1,Math.floor(x/scale)),cy=Math.min(ch-1,Math.floor(y/scale)),i=cy*cw+cx;
    cellPixels[i]++;
    if(x>=mx&&x<w-mx&&y>=my&&y<h-my&&dark[y*w+x])counts[i]++;
  }
  let grid=new Uint8Array(cw*ch);
  for(let i=0;i<grid.length;i++)if(counts[i]>=Math.max(1,Math.round(cellPixels[i]*0.015)))grid[i]=1;
  grid=dilateBinaryGrid(grid,cw,ch,1);
  grid=erodeBinaryGrid(dilateBinaryGrid(grid,cw,ch,2),cw,ch,2);
  const seen=new Uint8Array(cw*ch),components=[];
  for(let sy=0;sy<ch;sy++)for(let sx=0;sx<cw;sx++){
    const si=sy*cw+sx;if(!grid[si]||seen[si])continue;
    const queue=[si];seen[si]=1;let q=0,minX=sx,maxX=sx,minY=sy,maxY=sy,cells=0,darkCount=0;
    while(q<queue.length){
      const i=queue[q++],x=i%cw,y=Math.floor(i/cw);cells++;darkCount+=counts[i];
      minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      for(let yy=Math.max(0,y-1);yy<=Math.min(ch-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(cw-1,x+1);xx++){
        const ni=yy*cw+xx;if(!seen[ni]&&grid[ni]){seen[ni]=1;queue.push(ni)}
      }
    }
    const x=minX*scale,y=minY*scale,ww=(maxX-minX+1)*scale,hh=(maxY-minY+1)*scale,aspect=ww/Math.max(1,hh);
    if(ww<w*0.16||hh<h*0.09||ww>w*0.94||hh>h*0.78||aspect<0.75||aspect>2.65)continue;
    const aspectPref=Math.exp(-Math.abs(Math.log(aspect/1.45))*1.15);
    const positionPref=1+0.12*(1-(y+hh/2)/h);
    const score=darkCount*aspectPref*positionPref*Math.min(1.25,0.75+cells/900);
    components.push({x,y,w:ww,h:hh,aspect,darkCount,cells,score});
  }
  if(!components.length)return {x:0,y:0,w,h,full:true};
  const best=components.sort((a,b)=>b.score-a.score)[0];
  const padX=Math.max(12,best.w*0.08),padY=Math.max(12,best.h*0.09);
  const region={
    x:clamp(Math.floor(best.x-padX),0,w-2),
    y:clamp(Math.floor(best.y-padY),0,h-2),
    w:0,h:0,full:false,score:best.score
  };
  const x2=clamp(Math.ceil(best.x+best.w+padX),region.x+1,w),y2=clamp(Math.ceil(best.y+best.h+padY),region.y+1,h);
  region.w=x2-region.x;region.h=y2-region.y;
  if(region.w*region.h>w*h*0.82)return {x:0,y:0,w,h,full:true};
  return region;
}
function croppedCanvasView(canvas,region){
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const image=ctx.getImageData(region.x,region.y,region.w,region.h);
  return {width:region.w,height:region.h,getContext(){return {getImageData(){return image}}}};
}
function offsetDetectedBand(z,dx,dy){
  const horizontal=z.orientation==='horizontal',longOffset=horizontal?dx:dy,crossOffset=horizontal?dy:dx;
  return {...z,x1:z.x1+dx,x2:z.x2+dx,y1:z.y1+dy,y2:z.y2+dy,axis:z.axis+crossOffset,a:z.a+longOffset,b:z.b+longOffset};
}
function offsetDetectedNetwork(network,dx,dy,fullW,fullH,region){
  const bands=network.bands.map(z=>offsetDetectedBand(z,dx,dy));
  const split=network.split.map((s,i)=>{
    const band=offsetDetectedBand(s.band,dx,dy),longOffset=band.orientation==='horizontal'?dx:dy;
    return {...s,band,wallRuns:s.wallRuns.map(r=>[r[0]+longOffset,r[1]+longOffset]),openings:s.openings.map(o=>({...o,fromPx:o.fromPx+longOffset,toPx:o.toPx+longOffset,band})),profile:{...s.profile,start:s.profile.start+longOffset,end:s.profile.end+longOffset}};
  });
  return {...network,bands,split,box:{x1:network.box.x1+dx,y1:network.box.y1+dy,x2:network.box.x2+dx,y2:network.box.y2+dy},w:fullW,h:fullH,cropRegion:region};
}
function detectOrthogonalStructuralNetwork(canvas,threshold=null){
  const prefs=importPrefs(),value=threshold??(Number(prefs.darkThreshold)||185),region=locateArchitecturalPlanRegion(canvas,value);
  if(region.full)return detectOrthogonalStructuralNetworkCore(canvas,value);
  const cropped=croppedCanvasView(canvas,region),network=detectOrthogonalStructuralNetworkCore(cropped,value);
  return offsetDetectedNetwork(network,region.x,region.y,canvas.width,canvas.height,region);
}
function detectedMaskFromNetwork(width,height,network){
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,width,height);ctx.fillStyle='#061018';
  for(const s of network.split)for(const r of s.wallRuns){
    const z=s.band,pad=1;
    if(z.orientation==='horizontal')ctx.fillRect(Math.max(0,r[0]-pad),Math.max(0,z.y1-pad),Math.min(width-r[0]+pad,r[1]-r[0]+1+pad*2),Math.min(height-z.y1+pad,z.y2-z.y1+1+pad*2));
    else ctx.fillRect(Math.max(0,z.x1-pad),Math.max(0,r[0]-pad),Math.min(width-z.x1+pad,z.x2-z.x1+1+pad*2),Math.min(height-r[0]+pad,r[1]-r[0]+1+pad*2));
  }
  return canvas.toDataURL('image/png');
}
function networkToWorldGeometry(network,widthM,heightM){
  const box=network.box,bw=Math.max(1,box.x2-box.x1),bh=Math.max(1,box.y2-box.y1);
  const pxToWorld=(px,py)=>({x:(px-box.x1)/bw*widthM-widthM/2,y:heightM/2-(py-box.y1)/bh*heightM,z:0});
  const walls=[],openings=[];
  for(const s of network.split){
    const z=s.band,thickness=z.orientation==='horizontal'?(z.thickness/bh*heightM):(z.thickness/bw*widthM);
    for(const r of s.wallRuns){
      let a,b;
      if(z.orientation==='horizontal'){a=pxToWorld(r[0],z.axis);b=pxToWorld(r[1],z.axis)}
      else{a=pxToWorld(z.axis,r[0]);b=pxToWorld(z.axis,r[1])}
      if(Math.hypot(b.x-a.x,b.y-a.y)>=0.12)walls.push({a,b,orientation:z.orientation,thickness:clamp(thickness,0.07,0.28),wallType:z.wallType,doubleLine:true});
    }
    for(const o of s.openings){
      let a,b;
      if(z.orientation==='horizontal'){a=pxToWorld(o.fromPx,z.axis);b=pxToWorld(o.toPx,z.axis)}
      else{a=pxToWorld(z.axis,o.fromPx);b=pxToWorld(z.axis,o.toPx)}
      const L=Math.hypot(b.x-a.x,b.y-a.y);
      if(L>=0.30&&L<=2.80)openings.push({a,b,orientation:z.orientation,openingType:o.openingType,wallType:z.wallType,lengthM:L,autoDetected:true});
    }
  }
  return {walls,openings};
}

function wallMaskFromZones(width,height,zones){
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,width,height);ctx.fillStyle='#050c12';
  zones.forEach(z=>{
    const pad=1;
    const x=Math.max(0,z.x1-pad),y=Math.max(0,z.y1-pad);
    const ww=Math.min(width-x,z.x2-z.x1+1+pad*2),hh=Math.min(height-y,z.y2-z.y1+1+pad*2);
    ctx.fillRect(x,y,ww,hh);
  });
  return canvas.toDataURL('image/png');
}
function structuralZonesForDrawing(zones,box){
  const minDim=Math.max(1,Math.min(box.x2-box.x1,box.y2-box.y1));
  const base=zones.filter(z=>{
    const L=zoneLength(z),T=zoneThickness(z);
    return L>=minDim*0.145&&L/Math.max(1,T)>=2.8&&(T>=12||L>=minDim*0.30);
  });
  const pad=Math.max(6,minDim*0.012);
  return base.filter(z=>{
    const L=zoneLength(z),cx=(z.x1+z.x2)/2,cy=(z.y1+z.y2)/2;
    const nearOuter=Math.min(Math.abs(cx-box.x1),Math.abs(cx-box.x2),Math.abs(cy-box.y1),Math.abs(cy-box.y2))<minDim*0.045;
    const joins=base.some(o=>o!==z&&o.orientation!==z.orientation&&zonesTouch(z,o,pad));
    return nearOuter||joins||L>=minDim*0.34;
  });
}
function wallZonesToSegments(zones,box,widthM,heightM){
  const bw=Math.max(1,box.x2-box.x1),bh=Math.max(1,box.y2-box.y1);
  const pxToWorld=(px,py)=>({x:(px-box.x1)/bw*widthM-widthM/2,y:heightM/2-(py-box.y1)/bh*heightM,z:0});
  const segs=[];
  zones.forEach(z=>{
    const thickness=z.orientation==='horizontal'?(zoneThickness(z)/bh*heightM):(zoneThickness(z)/bw*widthM);
    let a,b;
    if(z.orientation==='horizontal'){
      const cy=(z.y1+z.y2)/2;a=pxToWorld(z.x1,cy);b=pxToWorld(z.x2,cy);
    }else{
      const cx=(z.x1+z.x2)/2;a=pxToWorld(cx,z.y1);b=pxToWorld(cx,z.y2);
    }
    const L=Math.hypot(b.x-a.x,b.y-a.y);
    if(L>=0.35)segs.push({a,b,orientation:z.orientation,thickness:clamp(thickness,0.07,0.28),doubleLine:true});
  });
  return mergeWallSegmentsGapAware(segs,0.13,0.22);
}
function mergeWallSegmentsGapAware(segs,axisTol=0.13,gapTol=0.22){
  const list=segs.map(s=>JSON.parse(JSON.stringify(s))).sort((a,b)=>(a.orientation||'').localeCompare(b.orientation||''));
  let changed=true;
  while(changed){
    changed=false;
    outer:for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
      const a=list[i],b=list[j],av=a.orientation==='vertical',bv=b.orientation==='vertical';
      if(av!==bv)continue;
      if(av){
        const ax=(a.a.x+a.b.x)/2,bx=(b.a.x+b.b.x)/2;if(Math.abs(ax-bx)>axisTol)continue;
        const a1=Math.min(a.a.y,a.b.y),a2=Math.max(a.a.y,a.b.y),b1=Math.min(b.a.y,b.b.y),b2=Math.max(b.a.y,b.b.y);
        const gap=Math.max(0,Math.max(a1,b1)-Math.min(a2,b2));
        if(gap>gapTol)continue;
        const y1=Math.min(a1,b1),y2=Math.max(a2,b2),x=(ax+bx)/2;
        list[i]={...a,a:{x,y:y1,z:0},b:{x,y:y2,z:0},thickness:Math.max(a.thickness||0,b.thickness||0),orientation:'vertical'};
      }else{
        const ay=(a.a.y+a.b.y)/2,by=(b.a.y+b.b.y)/2;if(Math.abs(ay-by)>axisTol)continue;
        const a1=Math.min(a.a.x,a.b.x),a2=Math.max(a.a.x,a.b.x),b1=Math.min(b.a.x,b.b.x),b2=Math.max(b.a.x,b.b.x);
        const gap=Math.max(0,Math.max(a1,b1)-Math.min(a2,b2));
        if(gap>gapTol)continue;
        const x1=Math.min(a1,b1),x2=Math.max(a2,b2),y=(ay+by)/2;
        list[i]={...a,a:{x:x1,y,z:0},b:{x:x2,y,z:0},thickness:Math.max(a.thickness||0,b.thickness||0),orientation:'horizontal'};
      }
      list.splice(j,1);changed=true;break outer;
    }
  }
  return list;
}
function alignImportedImageToBox(canvas,box,widthM,heightM){
  if(!S.image)return;
  const bw=Math.max(1,box.x2-box.x1),bh=Math.max(1,box.y2-box.y1);
  const sx=(widthM*SCALE)/((bw/canvas.width)*S.image.w);
  const sy=(heightM*SCALE)/((bh/canvas.height)*S.image.h);
  const newScale=clamp(Math.sqrt(Math.max(0.0001,sx*sy)),0.12,8);
  S.image.scale=newScale;
  const dispW=S.image.w*newScale/SCALE,dispH=S.image.h*newScale/SCALE;
  S.image.x=-widthM/2-(box.x1/canvas.width)*dispW;
  S.image.y=heightM/2+(box.y1/canvas.height)*dispH;
}
async function darkenStructuralWallsInRaster(src){
  const im=await loadImageElement(src),prefs=importPrefs();
  const maxSide=1600,scale=Math.min(1,maxSide/Math.max(im.naturalWidth||im.width,im.naturalHeight||im.height));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round((im.naturalWidth||im.width)*scale));
  canvas.height=Math.max(1,Math.round((im.naturalHeight||im.height)*scale));
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(im,0,0,canvas.width,canvas.height);
  const network=detectOrthogonalStructuralNetwork(canvas,Number(prefs.darkThreshold)||185);
  const wallRuns=network.split.reduce((n,s)=>n+s.wallRuns.length,0);
  const openingCount=network.split.reduce((n,s)=>n+s.openings.length,0);
  return {
    maskSrc:detectedMaskFromNetwork(canvas.width,canvas.height,network),
    zones:network.bands.length,wallRuns,openingCount,width:canvas.width,height:canvas.height,
    box:network.box,zonesData:network.bands,network
  };
}
function importedDisplaySize(im,maxW=720,maxH=520){
  const iw=im.naturalWidth||im.width||1,ih=im.naturalHeight||im.height||1,fit=Math.min(maxW/iw,maxH/ih,1);
  return {w:Math.round(iw*fit),h:Math.round(ih*fit)};
}
async function setImportedRaster(src,meta={}){
  const im=await loadImageElement(src),size=importedDisplaySize(im,meta.maxW||720,meta.maxH||520);
  const image={src,originalSrc:src,x:-(size.w/SCALE)/2,y:(size.h/SCALE)/2,w:size.w,h:size.h,scale:1,source:meta.source||'Imagem'};
  S.image=image;S.layers.image=true;
  const cb=document.querySelector('[data-layer="image"]');if(cb)cb.checked=true;
  setMode('2d');render();panel();
  if(importPrefs().autoDarkenWalls){
    msg('Imagem importada. A detetar e escurecer todas as paredes visíveis...');
    try{
      const result=await darkenStructuralWallsInRaster(src);
      if(S.image!==image)return;
      image.wallMaskSrc=result.maskSrc;image.wallDarkened=true;image.wallZones=result.zones;
      image.wallRuns=result.wallRuns;image.detectedOpenings=result.openingCount;
      image.wallMaskBox=result.box;image.wallZonesData=result.zonesData;image.wallDarkness=importPrefs().wallDarkness;
      render();panel();msg('Importação concluída: '+result.wallRuns+' troços de parede e '+result.openingCount+' vãos preservados no escurecimento.');
    }catch(err){
      console.warn('Escurecimento automático falhou',err);image.wallMaskSrc=null;image.wallDarkened=false;render();panel();msg('Imagem importada. Não foi possível escurecer as paredes automaticamente.');
    }
  }else msg('Imagem importada. Escurecimento automático de paredes está desligado.');
}
function updateImportedWallDarkness(value){
  const prefs=importPrefs();prefs.wallDarkness=clamp(Number(value)||0.78,0.05,1);
  svg.querySelectorAll('.imported-wall-mask').forEach(node=>node.setAttribute('opacity',prefs.wallDarkness));
}
async function refreshImportedWallDarkening(){
  if(!S.image)return msg('Não existe imagem importada.');
  const prefs=importPrefs(),original=S.image.originalSrc||S.image.src;
  if(!prefs.autoDarkenWalls){render();panel();return msg('Escurecimento automático desligado.');}
  msg('A refazer a deteção completa das paredes...');
  try{
    const result=await darkenStructuralWallsInRaster(original);
    S.image.originalSrc=original;S.image.src=original;S.image.wallMaskSrc=result.maskSrc;
    S.image.wallDarkened=true;S.image.wallZones=result.zones;S.image.wallRuns=result.wallRuns;S.image.detectedOpenings=result.openingCount;S.image.wallMaskBox=result.box;S.image.wallZonesData=result.zonesData;
    S.image.wallDarkness=prefs.wallDarkness;
    render();panel();msg(result.wallRuns+' troços de parede detetados; '+result.openingCount+' vãos mantidos abertos.');
  }catch(err){console.error(err);msg('Não foi possível refazer o escurecimento automático.');}
}
function markDXFStructuralWalls(lines){
  if(!lines.length)return 0;
  const xs=lines.flatMap(l=>[l.a.x,l.b.x]),ys=lines.flatMap(l=>[l.a.y,l.b.y]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),span=Math.max(maxX-minX,maxY-minY)||1;
  const candidates=lines.map((l,i)=>{const dx=l.b.x-l.a.x,dy=l.b.y-l.a.y,L=Math.hypot(dx,dy),orientation=Math.abs(dx)>=Math.abs(dy)?'horizontal':'vertical',axisAligned=Math.min(Math.abs(dx),Math.abs(dy))<=Math.max(0.02,L*0.08);return {l,i,L,orientation,axisAligned}}).filter(c=>c.axisAligned&&c.L>=span*0.045);
  const marked=new Set();
  candidates.forEach((a,ai)=>{
    for(let bi=ai+1;bi<candidates.length;bi++){
      const b=candidates[bi];if(a.orientation!==b.orientation)continue;
      let dist,overlap;
      if(a.orientation==='horizontal'){
        dist=Math.abs((a.l.a.y+a.l.b.y-b.l.a.y-b.l.b.y)/2);
        const a1=Math.min(a.l.a.x,a.l.b.x),a2=Math.max(a.l.a.x,a.l.b.x),b1=Math.min(b.l.a.x,b.l.b.x),b2=Math.max(b.l.a.x,b.l.b.x);
        overlap=Math.max(0,Math.min(a2,b2)-Math.max(a1,b1))/Math.max(0.001,Math.min(a2-a1,b2-b1));
      }else{
        dist=Math.abs((a.l.a.x+a.l.b.x-b.l.a.x-b.l.b.x)/2);
        const a1=Math.min(a.l.a.y,a.l.b.y),a2=Math.max(a.l.a.y,a.l.b.y),b1=Math.min(b.l.a.y,b.l.b.y),b2=Math.max(b.l.a.y,b.l.b.y);
        overlap=Math.max(0,Math.min(a2,b2)-Math.max(a1,b1))/Math.max(0.001,Math.min(a2-a1,b2-b1));
      }
      if(dist>=span*0.004&&dist<=span*0.055&&overlap>=0.50){marked.add(a.i);marked.add(b.i);a.l.detectedThickness=dist;b.l.detectedThickness=dist;}
    }
  });
  candidates.forEach(c=>{
    const mid={x:(c.l.a.x+c.l.b.x)/2,y:(c.l.a.y+c.l.b.y)/2};
    const nearOuter=Math.min(Math.abs(mid.x-minX),Math.abs(mid.x-maxX),Math.abs(mid.y-minY),Math.abs(mid.y-maxY))<span*0.025;
    if(nearOuter&&c.L>span*0.18)marked.add(c.i);
  });
  marked.forEach(i=>{const l=lines[i];l.structuralVisible=true;l.darkenedImport=true;l.wallType='interior';l.thickness=clamp(Number(l.detectedThickness)||0.10,0.07,0.28);l.doubleLine=false;});
  return marked.size;
}
function groupRuns(values,threshold,minWidth=1){
  const groups=[];let start=-1;
  for(let i=0;i<values.length;i++){
    if(values[i]>=threshold){if(start<0)start=i}
    else if(start>=0){if(i-start>=minWidth)groups.push({a:start,b:i-1,mid:(start+i-1)/2,max:Math.max(...values.slice(start,i))});start=-1}
  }
  if(start>=0&&values.length-start>=minWidth)groups.push({a:start,b:values.length-1,mid:(start+values.length-1)/2,max:Math.max(...values.slice(start))});
  return groups;
}

function smooth1D(arr,r=2){
  const out=new Array(arr.length).fill(0);
  for(let i=0;i<arr.length;i++){
    let s=0,c=0;
    for(let k=-r;k<=r;k++){
      const j=i+k;
      if(j>=0&&j<arr.length){s+=arr[j];c++;}
    }
    out[i]=s/(c||1);
  }
  return out;
}
function mergeSegments(segs,tol=0.12){
  const out=[];
  segs.forEach(s=>{
    const vertical=Math.abs(s.a.x-s.b.x)<Math.abs(s.a.y-s.b.y);
    let hit=false;
    for(const o of out){
      const ov=Math.abs(o.a.x-o.b.x)<Math.abs(o.a.y-o.b.y);
      if(vertical!==ov)continue;
      if(vertical){
        if(Math.abs(((o.a.x+o.b.x)/2)-((s.a.x+s.b.x)/2))<=tol){
          const ys=[o.a.y,o.b.y,s.a.y,s.b.y].sort((a,b)=>a-b);
          o.a={x:(o.a.x+o.b.x)/2,y:ys[0],z:0};
          o.b={x:(o.a.x+o.b.x)/2,y:ys[3],z:0};
          hit=true;break;
        }
      }else{
        if(Math.abs(((o.a.y+o.b.y)/2)-((s.a.y+s.b.y)/2))<=tol){
          const xs=[o.a.x,o.b.x,s.a.x,s.b.x].sort((a,b)=>a-b);
          o.a={x:xs[0],y:(o.a.y+o.b.y)/2,z:0};
          o.b={x:xs[3],y:(o.a.y+o.b.y)/2,z:0};
          hit=true;break;
        }
      }
    }
    if(!hit)out.push(JSON.parse(JSON.stringify(s)));
  });
  return out;
}

function getDarkMap(canvas,threshold=115){
  const ctx=canvas.getContext('2d'), w=canvas.width, h=canvas.height, data=ctx.getImageData(0,0,w,h).data;
  const dark=new Uint8Array(w*h);
  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++){
      const i=(y*w+x)*4, r=data[i],g=data[i+1],b=data[i+2],a=data[i+3];
      const gray=(r+g+b)/3;
      if(a>20 && gray<threshold)dark[y*w+x]=1;
    }
  }
  return {dark,w,h};
}
function detectBuildingBox(map){
  const {dark,w,h}=map;
  // Ignora margens onde normalmente aparecem cotas, setas e textos exteriores.
  const ix1=Math.floor(w*0.04), ix2=Math.floor(w*0.96);
  const iy1=Math.floor(h*0.11), iy2=Math.floor(h*0.96);
  const row=new Array(h).fill(0), col=new Array(w).fill(0);
  for(let y=iy1;y<iy2;y++){
    for(let x=ix1;x<ix2;x++){
      if(dark[y*w+x]){row[y]++;col[x]++}
    }
  }
  const rowGroups=groupRuns(row,(ix2-ix1)*0.16,2);
  const colGroups=groupRuns(col,(iy2-iy1)*0.13,2);
  const top=rowGroups[0], bottom=rowGroups[rowGroups.length-1], left=colGroups[0], right=colGroups[colGroups.length-1];
  if(top&&bottom&&left&&right){
    return {x1:left.mid,y1:top.mid,x2:right.mid,y2:bottom.mid};
  }
  // Fallback: bounding box de píxeis escuros, mas só na zona útil central.
  let minX=w,maxX=0,minY=h,maxY=0;
  for(let y=iy1;y<iy2;y++){
    for(let x=ix1;x<ix2;x++){
      if(dark[y*w+x]){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
    }
  }
  return {x1:minX,y1:minY,x2:maxX,y2:maxY};
}

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function detectArcNearGap(map,orientation,linePx,fromPx,toPx,bandA,bandB){
  const {dark,w,h}=map;
  const pad=18;
  let minX,maxX,minY,maxY;
  if(orientation==='vertical'){
    minX=Math.max(0,bandA-pad); maxX=Math.min(w-1,bandB+pad);
    minY=Math.max(0,fromPx-pad); maxY=Math.min(h-1,toPx+pad);
  }else{
    minX=Math.max(0,fromPx-pad); maxX=Math.min(w-1,toPx+pad);
    minY=Math.max(0,bandA-pad); maxY=Math.min(h-1,bandB+pad);
  }
  let cnt=0, tot=0;
  for(let y=minY;y<=maxY;y++){
    for(let x=minX;x<=maxX;x++){
      const insideCore = orientation==='vertical' ? (x>=bandA&&x<=bandB&&y>=fromPx&&y<=toPx) : (y>=bandA&&y<=bandB&&x>=fromPx&&x<=toPx);
      if(insideCore) continue;
      tot++;
      if(dark[y*w+x])cnt++;
    }
  }
  return cnt/Math.max(1,tot) > 0.018;
}
function detectWallAndOpenings(map,box,widthM,heightM){
  const {dark,w,h}=map;
  const x1=Math.max(0,Math.floor(box.x1)),x2=Math.min(w-1,Math.ceil(box.x2));
  const y1=Math.max(0,Math.floor(box.y1)),y2=Math.min(h-1,Math.ceil(box.y2));
  const bw=x2-x1,bh=y2-y1;
  const col=new Array(bw).fill(0), row=new Array(bh).fill(0);
  for(let y=y1;y<=y2;y++) for(let x=x1;x<=x2;x++) if(dark[y*w+x]){col[x-x1]++;row[y-y1]++;}
  const colS=smooth1D(col,2), rowS=smooth1D(row,2);
  const vGroups=groupRuns(colS,bh*0.018,1).filter(g=>g.max>bh*0.024);
  const hGroups=groupRuns(rowS,bw*0.018,1).filter(g=>g.max>bw*0.024);
  const segs=[], openings=[];
  function pxToWorld(px,py){return {x:(px-x1)/bw*widthM-widthM/2, y:heightM/2-(py-y1)/bh*heightM, z:0};}
  function thMeters(px,orient){
    const raw = orient==='vertical' ? (px/bw*widthM) : (px/bh*heightM);
    return clamp(raw,0.07,0.28);
  }
  function addSeg(orientation,bandA,bandB,start,end){
    const thickness=thMeters((bandB-bandA+1),orientation);
    const center=Math.round((bandA+bandB)/2);
    const a=orientation==='vertical'?pxToWorld(center,start):pxToWorld(start,center);
    const b=orientation==='vertical'?pxToWorld(center,end):pxToWorld(end,center);
    segs.push({a,b,orientation,thickness,doubleLine:thickness>=0.09,bandA,bandB,startPx:start,endPx:end});
  }
  function addOpening(orientation,bandA,bandB,fromPx,toPx){
    const lenM = orientation==='vertical' ? ((toPx-fromPx)/bh*heightM) : ((toPx-fromPx)/bw*widthM);
    if(lenM<0.40 || lenM>2.80) return;
    const center=Math.round((bandA+bandB)/2);
    const a=orientation==='vertical'?pxToWorld(center,fromPx):pxToWorld(fromPx,center);
    const b=orientation==='vertical'?pxToWorld(center,toPx):pxToWorld(toPx,center);
    const nearBoundary = orientation==='vertical' ? (Math.abs(center-x1)<(bw*0.09)||Math.abs(center-x2)<(bw*0.09)) : (Math.abs(center-y1)<(bh*0.09)||Math.abs(center-y2)<(bh*0.09));
    const arc=detectArcNearGap(map,orientation,center,fromPx,toPx,bandA,bandB);
    let openingType='window';
    if(arc) openingType='door';
    else if(!nearBoundary && lenM>=0.55 && lenM<=1.30) openingType='door';
    else if(nearBoundary && lenM>=0.45) openingType='window';
    else if(lenM<0.55) openingType='window';
    else openingType='door';
    openings.push({a,b,orientation,openingType,lengthM:lenM,autoDetected:true});
  }
  function scanBands(groups,orientation){
    groups.forEach(g=>{
      const startBand = orientation==='vertical' ? x1+g.a : y1+g.a;
      const endBand = orientation==='vertical' ? x1+g.b : y1+g.b;
      const spanA=Math.max(orientation==='vertical'?x1:y1,Math.floor(startBand-3));
      const spanB=Math.min(orientation==='vertical'?x2:y2,Math.ceil(endBand+3));
      const s0=orientation==='vertical'?y1:x1, s1=orientation==='vertical'?y2:x2;
      let start=-1,gaps=0,wallRuns=[];
      for(let p=s0;p<=s1;p++){
        let cnt=0;
        if(orientation==='vertical') for(let xx=spanA;xx<=spanB;xx++) cnt+=dark[p*w+xx];
        else for(let yy=spanA;yy<=spanB;yy++) cnt+=dark[yy*w+p];
        const on = cnt>=Math.max(1,(spanB-spanA+1)*0.14);
        if(on){ if(start<0) start=p; gaps=0; }
        else if(start>=0){ gaps++; if(gaps>4){ const end=p-gaps; if(end-start>(orientation==='vertical'?bh:bw)*0.03) wallRuns.push([start,end]); start=-1; gaps=0; } }
      }
      if(start>=0 && s1-start>(orientation==='vertical'?bh:bw)*0.03) wallRuns.push([start,s1]);
      wallRuns.forEach(r=>addSeg(orientation,spanA,spanB,r[0],r[1]));
      for(let i=0;i<wallRuns.length-1;i++){
        const gapA=wallRuns[i][1], gapB=wallRuns[i+1][0];
        if(gapB-gapA>4) addOpening(orientation,spanA,spanB,gapA,gapB);
      }
    });
  }
  scanBands(vGroups,'vertical');
  scanBands(hGroups,'horizontal');
  let clean=segs.filter(s=>Math.hypot(s.b.x-s.a.x,s.b.y-s.a.y)>=0.35);
  clean=mergeSegments(clean,0.14).map(s=>{
    const src=segs.find(t=>Math.abs(t.a.x-s.a.x)<0.2&&Math.abs(t.a.y-s.a.y)<0.4&&Math.abs(t.b.x-s.b.x)<0.2&&Math.abs(t.b.y-s.b.y)<0.4) || {};
    return {...s, orientation:src.orientation||((Math.abs(s.a.x-s.b.x)<Math.abs(s.a.y-s.b.y))?'vertical':'horizontal'), thickness:src.thickness||0.10, doubleLine:(src.doubleLine!==undefined?src.doubleLine:(src.thickness||0.10)>=0.09)};
  });
  const unique=[];
  clean.forEach(s=>{
    const key=[Math.round(s.a.x*20),Math.round(s.a.y*20),Math.round(s.b.x*20),Math.round(s.b.y*20)].join('|');
    const rkey=[Math.round(s.b.x*20),Math.round(s.b.y*20),Math.round(s.a.x*20),Math.round(s.a.y*20)].join('|');
    if(!unique.some(u=>u.key===key||u.key===rkey)) unique.push({...s,key});
  });
  const uniqOpen=[];
  openings.forEach(o=>{
    const key=[o.openingType,Math.round(o.a.x*20),Math.round(o.a.y*20),Math.round(o.b.x*20),Math.round(o.b.y*20)].join('|');
    const rkey=[o.openingType,Math.round(o.b.x*20),Math.round(o.b.y*20),Math.round(o.a.x*20),Math.round(o.a.y*20)].join('|');
    if(!uniqOpen.some(u=>u.key===key||u.key===rkey)) uniqOpen.push({...o,key});
  });
  return {segments:unique.slice(0,220), openings:uniqOpen.slice(0,80)};
}

function detectWallSegments(map,box,widthM,heightM){
  return detectWallAndOpenings(map,box,widthM,heightM).segments;
}
async function detectDimensionsOCR(){
  if(!S.image || !window.Tesseract)return {};
  try{
    msg(S.image?.calibrated?'Escala manual já definida. A detetar paredes...':'A ler cotas da planta com OCR...');
    const res=await Tesseract.recognize(S.image.originalSrc||S.image.src,'eng',{logger:m=>{}});
    const words=(res.data.words||[]).map(w=>({text:w.text||'',bbox:w.bbox||{}}));
    const nums=words.map(w=>{
      const m=w.text.replace(',','.').match(/\d+(?:\.\d+)?/);
      return m?{value:Number(m[0]),bbox:w.bbox,text:w.text}:null;
    }).filter(x=>x&&x.value>0.5&&x.value<100);
    const top=nums.filter(x=>x.bbox.y1 < (res.data?.height||1000)*0.28).sort((a,b)=>b.value-a.value);
    const right=nums.filter(x=>x.bbox.x0 > (res.data?.width||1000)*0.72).sort((a,b)=>b.value-a.value);
    const all=nums.sort((a,b)=>b.value-a.value);
    return {width:(top[0]?.value || all[0]?.value), height:(right[0]?.value || all.find(x=>x.value!==top[0]?.value)?.value), nums};
  }catch(e){console.warn(e);return {}}
}

function worldToImagePixel(P,canvas){
  if(!S.image)return null;
  const screen=world2D(P);
  const imgX=ORIGIN.x+S.view2d.panX+S.image.x*SCALE;
  const imgY=ORIGIN.y+S.view2d.panY-S.image.y*SCALE;
  const imgW=S.image.w*S.image.scale;
  const imgH=S.image.h*S.image.scale;
  return {
    x:(screen.x-imgX)/imgW*canvas.width,
    y:(screen.y-imgY)/imgH*canvas.height
  };
}
function dimensionsFromManualCalibration(box,canvas){
  if(!S.image?.calibrated || !S.image.calibrationPoints || S.image.calibrationPoints.length!==2)return null;
  const p1=worldToImagePixel(S.image.calibrationPoints[0],canvas);
  const p2=worldToImagePixel(S.image.calibrationPoints[1],canvas);
  if(!p1||!p2)return null;
  const dpx=Math.hypot(p2.x-p1.x,p2.y-p1.y);
  if(dpx<1)return null;
  const bw=Math.abs(box.x2-box.x1), bh=Math.abs(box.y2-box.y1);
  const meters=Number(S.image.calibrationMeters)||0;
  if(!meters)return null;
  let widthM,heightM;
  if(S.image.calibrationDirection==='horizontal'){
    widthM=meters*(bw/dpx);
    heightM=widthM*(bh/bw);
  }else{
    heightM=meters*(bh/dpx);
    widthM=heightM*(bw/bh);
  }
  return {widthM,heightM,source:'calibração manual por 2 pontos'};
}


async function autoDetectScaleAndDrawing(){
  if(!S.image)return msg('Importe primeiro a planta/imagem/PDF.');
  try{
    const im=await loadImageElement(S.image.originalSrc||S.image.src);
    const maxW=1600,scale=Math.min(1,maxW/(im.naturalWidth||im.width));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round((im.naturalWidth||im.width)*scale));
    canvas.height=Math.max(1,Math.round((im.naturalHeight||im.height)*scale));
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(im,0,0,canvas.width,canvas.height);

    msg('A detetar paredes estruturais, portas e janelas...');
    const network=detectOrthogonalStructuralNetwork(canvas,Number(importPrefs().darkThreshold)||185);
    const box=network.box;
    let dims=await detectDimensionsOCR();
    const manualDims=dimensionsFromManualCalibration(box,canvas);
    let widthM=manualDims?manualDims.widthM:(Number(dims.width)||0);
    let heightM=manualDims?manualDims.heightM:(Number(dims.height)||0);
    if(manualDims){
      const ok=confirm('Escala por 2 pontos aplicada. Dimensão exterior estimada: '+n(widthM)+' x '+n(heightM)+' m.\n\nUsar esta dimensão?');
      if(!ok){
        widthM=Number(prompt('Largura exterior correta em metros:',n(widthM)))||widthM;
        heightM=Number(prompt('Profundidade exterior correta em metros:',n(heightM)))||heightM;
      }
    }else if(!widthM||!heightM||Math.abs(widthM-heightM)<0.01){
      widthM=Number(prompt('Largura exterior da planta em metros:',widthM||'10.00'))||10;
      heightM=Number(prompt('Profundidade exterior em metros:',heightM||'7.00'))||7;
    }

    alignImportedImageToBox(canvas,box,widthM,heightM);
    S.image.wallMaskSrc=detectedMaskFromNetwork(canvas.width,canvas.height,network);
    S.image.wallDarkened=true;
    S.image.wallZones=network.bands.length;
    S.image.wallRuns=network.split.reduce((sum,s)=>sum+s.wallRuns.length,0);
    S.image.detectedOpenings=network.split.reduce((sum,s)=>sum+s.openings.length,0);
    S.image.wallMaskBox=box;
    S.image.wallZonesData=network.bands;

    // Remove apenas o auto desenho anterior. Elementos desenhados manualmente permanecem.
    S.shapes=S.shapes.filter(s=>!s.autoDetected);
    const geometry=networkToWorldGeometry(network,widthM,heightM);

    geometry.walls.forEach((seg,i)=>{
      const line={
        kind:'line',a:seg.a,b:seg.b,height:0,
        wallType:seg.wallType,
        thickness:Number(seg.thickness)||wallThickness(seg.wallType),
        detectedThickness:Number(seg.thickness)||wallThickness(seg.wallType),
        doubleLine:true,orientation:seg.orientation,
        autoDetected:true,imported:true,structuralVisible:true
      };
      line.id=uid('W');
      line.name=(seg.wallType==='exterior'?'Parede exterior auto ':'Parede interior auto ')+(i+1);
      S.shapes.push(line);
    });

    geometry.openings.forEach((o,i)=>{
      const op={
        kind:'line',a:o.a,b:o.b,openingType:o.openingType,
        wallType:o.wallType,
        thickness:o.openingType==='door'?0.05:0.04,
        autoDetected:true,imported:true,doorHinge:'start',doorSwingSign:1
      };
      op.id=uid(o.openingType==='door'?'D':'J');
      op.name=(o.openingType==='door'?'Porta auto ':'Janela auto ')+(i+1);
      setOpeningHeights(op,o.openingType==='door'?2.10:1.20,o.openingType==='window'?0.90:null);
      S.shapes.push(op);
    });

    numberOpeningsByPanel();
    S.selected=[];
    setMode('2d');render();panel();
    const nDoors=geometry.openings.filter(o=>o.openingType==='door').length;
    const nWindows=geometry.openings.filter(o=>o.openingType==='window').length;
    const nExt=geometry.walls.filter(o=>o.wallType==='exterior').length;
    const nInt=geometry.walls.filter(o=>o.wallType==='interior').length;
    msg('Auto desenho V3: '+nExt+' troços exteriores, '+nInt+' troços interiores, '+nDoors+' portas e '+nWindows+' janelas. Os vãos ficaram abertos nas paredes.');
  }catch(e){
    console.error(e);msg('Não foi possível detetar automaticamente. Use calibrar por dois pontos e tente novamente.');
  }
}

function hideImportedImage(){
  if(!S.image)return msg('Não existe imagem importada.');
  S.layers.image=false;
  const cb=document.querySelector('[data-layer="image"]');
  if(cb)cb.checked=false;
  render();panel();msg('Imagem importada ocultada. O desenho gerado mantém-se.');
}
function showImportedImage(){
  if(!S.image)return msg('Não existe imagem importada.');
  S.layers.image=true;
  const cb=document.querySelector('[data-layer="image"]');
  if(cb)cb.checked=true;
  render();panel();msg('Imagem importada visível.');
}
function deleteImportedImage(){
  if(!S.image)return msg('Não existe imagem importada para apagar.');
  if(!confirm('Apagar a imagem/planta importada?\\n\\nAs linhas, paredes, perfis e cálculos gerados mantêm-se.'))return;
  S.image=null;
  S.calibration=null;
  S.layers.image=false;
  const cb=document.querySelector('[data-layer="image"]');
  if(cb)cb.checked=false;
  render();panel();msg('Imagem importada apagada. O desenho gerado foi mantido.');
}

function importImage(file){if(!file)return;const r=new FileReader();r.onload=()=>setImportedRaster(r.result,{source:file.name||'Imagem',maxW:720,maxH:520});r.onerror=()=>msg('Não foi possível ler a imagem.');r.readAsDataURL(file)}
function startCalib(){if(!S.image)return msg('Importe primeiro uma imagem.');S.calibration={points:[]};setTool('calibrate');msg('Clique em dois pontos conhecidos na imagem.')}
function calibClick(w){if(!S.calibration)return;S.calibration.points.push(w);if(S.calibration.points.length===2){render();const meters=Number(prompt('Distância real entre os pontos, em metros:', '5.00'));if(meters>0){const [a,b]=S.calibration.points,cur=Math.hypot(b.x-a.x,b.y-a.y);if(cur>0.001){S.image.calibrated=true;S.image.calibrationMeters=meters;S.image.calibrationWorldDistance=cur;S.image.calibrationPoints=[a,b];S.image.calibrationDirection=Math.abs(b.x-a.x)>=Math.abs(b.y-a.y)?'horizontal':'vertical';msg('Escala definida por 2 pontos: '+n(meters)+' m. O Auto desenho vai usar esta medida.')}}S.calibration=null;setTool('select');render();panel()}else{render();msg('Clique no segundo ponto conhecido.')}}
function saveProject(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(S,null,2)],{type:'application/json'}));a.download='aloe_lsf360_projeto.json';a.click()}
function openProject(file){if(!file)return;const r=new FileReader();r.onload=()=>{try{Object.assign(S,JSON.parse(r.result));importPrefs();if(S.image&&!S.image.originalSrc)S.image.originalSrc=S.image.src;render();panel();msg('Projeto aberto.')}catch{msg('Ficheiro inválido.')}};r.readAsText(file)}
function lineLength(o){return Math.hypot((o.b.x-o.a.x),(o.b.y-o.a.y),(o.b.z||0)-(o.a.z||0))}

function generateProfilesForSegment(a,b,panel,kStart,height,spacing,wallType='exterior',thickness=0.150,studProfile=S.calc.studProfile,trackProfile=S.calc.trackProfile,studDims=null,trackDims=null){
  const out=[];let k=kStart;
  const L=Math.hypot(b.x-a.x,b.y-a.y);
  const openings=openingsOnWallSegment(a,b,wallType).filter(o=>o.width>=0.35 && o.width<=3.0);
  const addProfile=(type,p1,p2,profile=trackProfile,dims=null)=>out.push({id:uid(type.startsWith('M')?'C':'U'),kind:'profile',type,profile,name:panel+'-'+(type.startsWith('Montante')?'M':'U')+k++,panel,wallType,thickness,profileDims:dims||defaultProfileDims(profile),a:p1,b:p2});
  const pt=(t,z)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z});
  const addStudAt=(t,z0,z1,label='Montante')=>{const p=pt(t,z0);addProfile(label,p,{...p,z:z1},studProfile,studDims||defaultProfileDims(studProfile));};

  // guias principais
  let cursor=0;
  openings.forEach(op=>{
    if(op.openingType==='door'){
      if(op.start>cursor+0.005) addProfile('Guia inferior',pt(cursor,0),pt(op.start,0),trackProfile,trackDims||defaultProfileDims(trackProfile));
      cursor=Math.max(cursor,op.end);
    }
  });
  if(cursor<1) addProfile('Guia inferior',pt(cursor,0),pt(1,0),trackProfile,trackDims||defaultProfileDims(trackProfile));
  addProfile('Guia superior',pt(0,height),pt(1,height),trackProfile,trackDims||defaultProfileDims(trackProfile));

  // montantes regulares com vãos respeitados
  const nStuds=Math.max(2,Math.floor(L/spacing)+1);
  for(let j=0;j<nStuds;j++){
    const t=j/(nStuds-1);
    const block=openings.find(op=>t>op.start+0.01 && t<op.end-0.01);
    if(block) continue;
    addStudAt(t,0,height,'Montante');
  }

  // reforços de vãos
  openings.forEach((op,oi)=>{
    const w=op.end-op.start;
    const clearHeight=op.openingType==='door'?Math.min(height-0.15, Number(op.openingHeight||2.10)) : Math.min(height-0.20, Number(op.openingHead||2.10));
    const sillHeight=op.openingType==='window'?Math.max(0.60, Number(op.sillHeight||0.90)) : 0;
    addStudAt(op.start,0,height,'Montante lateral vão');
    addStudAt(op.end,0,height,'Montante lateral vão');
    addProfile('Verga vão',pt(op.start,clearHeight),pt(op.end,clearHeight),trackProfile,trackDims||defaultProfileDims(trackProfile));
    if(op.openingType==='window'){
      addProfile('Peitoril janela',pt(op.start,sillHeight),pt(op.end,sillHeight),trackProfile,trackDims||defaultProfileDims(trackProfile));
      const localL=(op.end-op.start)*L;
      const inner=Math.max(1,Math.floor(localL/spacing)-1);
      for(let i=1;i<=inner;i++){
        const t=op.start+(w*i/(inner+1));
        addStudAt(t,0,sillHeight,'Montante abaixo peitoril');
        addStudAt(t,clearHeight,height,'Montante acima verga');
      }
    }else{
      const localL=(op.end-op.start)*L;
      const inner=Math.max(1,Math.floor(localL/spacing)-1);
      for(let i=1;i<=inner;i++){
        const t=op.start+(w*i/(inner+1));
        addStudAt(t,clearHeight,height,'Montante acima verga');
      }
    }
  });
  return {profiles:out,next:k};
}



function defaultProfileDims(profile){
  const s=String(profile||'').toUpperCase();
  const fam=s.startsWith('U')?'U':'C';
  const nums=(s.match(/\d+(?:\.\d+)?/g)||[]).map(Number);
  return {
    family:fam,
    web:nums[0]||S.calc.profileDims[fam].web,
    flange:nums[1]||S.calc.profileDims[fam].flange,
    lip:fam==='C'?(S.calc.profileDims.C.lip||12):0,
    thickness:nums[2]||S.calc.profileDims[fam].thickness,
    kgm:S.calc.profileDims[fam].kgm
  };
}
function profileDimsOf(o){
  if(o?.profileDims)return o.profileDims;
  return defaultProfileDims(o?.profile || (o?.type==='Montante'?S.calc.studProfile:S.calc.trackProfile));
}
function profileRefFromDims(family,d){
  const f=family||d.family||'C';
  const lip=f==='C'&&Number(d.lip)>0?`x${Number(d.lip).toFixed(0)}`:'';
  return `${f}${Number(d.web).toFixed(0)}x${Number(d.flange).toFixed(0)}${lip}x${Number(d.thickness).toFixed(2)}`;
}
function applyProfileDimsToSelection(data){
  const selected=S.selected.map(item).filter(Boolean);
  if(!selected.length){msg('Selecione primeiro perfis ou paredes.');return}
  selected.forEach(o=>{
    const fam=data.family || (String(o.profile||'C').startsWith('U')?'U':'C');
    const dims={family:fam,web:Number(data.web)||90,flange:Number(data.flange)||40,lip:fam==='C'?(Number(data.lip)||0):0,thickness:Number(data.thickness)||0.95,kgm:Number(data.kgm)||1.25};
    o.profileDims=dims;
    o.profile=profileRefFromDims(fam,dims);
    if(o.kind!=='profile'){
      if(fam==='C'){o.studProfile=o.profile;o.studDims=dims}
      else {o.trackProfile=o.profile;o.trackDims=dims}
    }
  });
  render();panel();msg('Medidas dos perfis aplicadas à seleção.')
}

function wallHeightOf(o){return Number(o?.wallHeight || o?.height || S.calc.height) || 2.70}
function wallSpacingOf(o){return Number(o?.spacing || S.calc.spacing) || 0.60}
function wallStudDimsOf(o){return o?.studDims || defaultProfileDims(wallStudProfileOf(o))}
function wallTrackDimsOf(o){return o?.trackDims || defaultProfileDims(wallTrackProfileOf(o))}
function wallStudProfileOf(o){return o?.studProfile || S.calc.studProfile}
function wallTrackProfileOf(o){return o?.trackProfile || S.calc.trackProfile}
function applyWallMeasuresToSelection(data){
  const selected=S.selected.map(item).filter(Boolean);
  if(!selected.length){msg('Selecione primeiro uma ou várias paredes/linhas/perfis.');return}
  selected.forEach(o=>{
    if(data.wallType){o.wallType=data.wallType;o.thickness=wallThickness(data.wallType)}
    if(Number(data.thickness)>0)o.thickness=Number(data.thickness)
    if(Number(data.height)>0){o.wallHeight=Number(data.height); if(isClosed(o))o.height=Number(data.height)}
    if(Number(data.spacing)>0)o.spacing=Number(data.spacing)
    if(data.studProfile)o.studProfile=data.studProfile
    if(data.trackProfile)o.trackProfile=data.trackProfile
    if(o.kind==='profile'){
      o.profile=o.type==='Montante'?(data.studProfile||o.profile):(data.trackProfile||o.profile)
      if(Number(data.thickness)>0)o.thickness=Number(data.thickness)
    }
  });
  render();panel();msg('Medidas personalizadas aplicadas à seleção.')
}

function classifySegmentWall(a,b,closedIndex=-1){
  // Regra simples:
  // - primeiro volume fechado = exterior;
  // - linhas junto aos limites exteriores = exterior;
  // - restantes linhas = interior.
  if(closedIndex===0)return 'exterior';
  if(closedIndex>0)return 'interior';
  const closed=S.shapes.filter(isClosed);
  if(!closed.length)return 'interior';
  const pts=pointsOf(closed[0]);
  const minX=Math.min(...pts.map(p=>p.x)), maxX=Math.max(...pts.map(p=>p.x));
  const minY=Math.min(...pts.map(p=>p.y)), maxY=Math.max(...pts.map(p=>p.y));
  const tol=0.25;
  const nearExt=(Math.abs(a.x-minX)<tol&&Math.abs(b.x-minX)<tol)||(Math.abs(a.x-maxX)<tol&&Math.abs(b.x-maxX)<tol)||(Math.abs(a.y-minY)<tol&&Math.abs(b.y-minY)<tol)||(Math.abs(a.y-maxY)<tol&&Math.abs(b.y-maxY)<tol);
  return nearExt?'exterior':'interior';
}
function wallThickness(type){
  return type==='exterior'?(Number(S.calc.externalWall)||0.150):(Number(S.calc.internalWall)||0.100);
}

function generateLSF(){
  const height=Number(S.calc.height)||2.70, spacing=Number(S.calc.spacing)||0.60;
  S.profiles=[];let k=1;

  const closed=S.shapes.filter(isClosed);
  const allLines=S.shapes.filter(o=>o.kind==='line'&&!o.openingType);
  const selectedLines=S.selected.map(item).filter(o=>o&&o.kind==='line'&&!o.openingType);
  const lines=selectedLines.length?selectedLines:allLines;

  let generatedClosed=0, generatedLines=0;

  associateOpeningsToPanels(closed,lines);
  numberOpeningsByPanel();

  // 1) contornos fechados: normalmente exterior
  closed.forEach((s,si)=>{
    if(!s.height||s.height<0.1)s.height=wallHeightOf?wallHeightOf(s):height;
    const base=pointsOf(s), panel='P'+String(si+1).padStart(2,'0');
    for(let i=0;i<base.length;i++){
      const a=base[i], b=base[(i+1)%base.length];
      const wt=s.wallType||classifySegmentWall(a,b,si);
      const h=typeof wallHeightOf==='function'?wallHeightOf(s):s.height;
      const sp=typeof wallSpacingOf==='function'?wallSpacingOf(s):spacing;
      const th=Number(s.thickness)||(typeof wallThickness==='function'?wallThickness(wt):(wt==='exterior'?0.15:0.10));
      const stud=typeof wallStudProfileOf==='function'?wallStudProfileOf(s):S.calc.studProfile;
      const track=typeof wallTrackProfileOf==='function'?wallTrackProfileOf(s):S.calc.trackProfile;
      const sd=typeof wallStudDimsOf==='function'?wallStudDimsOf(s):null;
      const td=typeof wallTrackDimsOf==='function'?wallTrackDimsOf(s):null;
      const r=generateProfilesForSegment(a,b,panel,k,h,sp,wt,th,stud,track,sd,td);
      S.profiles.push(...r.profiles);k=r.next;generatedClosed++;
    }
  });

  // 2) linhas: sempre consideradas como paredes interiores/exteriores adicionais.
  // Isto corrige o erro em que as divisórias interiores eram ignoradas quando existia retângulo exterior.
  lines.forEach((ln,idx)=>{
    const L=lineLength(ln);
    if(L<0.20)return;
    const panel=(ln.wallType==='exterior'?'E':'I')+String(idx+1).padStart(2,'0');
    const wt=ln.wallType||classifySegmentWall(ln.a,ln.b,-1);
    ln.wallType=wt;
    ln.thickness=Number(ln.thickness)||(typeof wallThickness==='function'?wallThickness(wt):(wt==='exterior'?0.15:0.10));
    const h=typeof wallHeightOf==='function'?wallHeightOf(ln):height;
    const sp=typeof wallSpacingOf==='function'?wallSpacingOf(ln):spacing;
    const stud=typeof wallStudProfileOf==='function'?wallStudProfileOf(ln):S.calc.studProfile;
    const track=typeof wallTrackProfileOf==='function'?wallTrackProfileOf(ln):S.calc.trackProfile;
    const sd=typeof wallStudDimsOf==='function'?wallStudDimsOf(ln):null;
    const td=typeof wallTrackDimsOf==='function'?wallTrackDimsOf(ln):null;
    const r=generateProfilesForSegment(ln.a,ln.b,panel,k,h,sp,wt,ln.thickness,stud,track,sd,td);
    S.profiles.push(...r.profiles);k=r.next;generatedLines++;
  });

  if(!generatedClosed&&!generatedLines)return msg('Desenhe/importa paredes exteriores ou interiores para gerar LSF.');
  setMode('3d');panel();
  msg(S.profiles.length+' perfis LSF gerados com vãos de portas/janelas aplicados nas paredes.');
}
function runCalc(){
  const panels=S.shapes.filter(isClosed);
  const lines=S.shapes.filter(o=>o.kind==='line'&&!o.openingType&&lineLength(o)>=0.20);
  let areaTotal=0, wallLength=0, externalLength=0, internalLength=0, studs=0, tracks=0, source='';

  if(S.profiles.length){
    S.profiles.forEach(p=>{
      if(p.type==='Montante')studs++;
      if(p.type&&p.type.startsWith('Guia'))tracks++;
    });
    const guideProfiles=S.profiles.filter(p=>p.type&&p.type.startsWith('Guia'));
    const totalGuide=guideProfiles.reduce((a,p)=>a+lineLength(p),0);
    wallLength=totalGuide/2;
    externalLength=guideProfiles.filter(p=>p.wallType==='exterior').reduce((a,p)=>a+lineLength(p),0)/2;
    internalLength=guideProfiles.filter(p=>p.wallType!=='exterior').reduce((a,p)=>a+lineLength(p),0)/2;
    source='perfis LSF gerados';
  }else{
    panels.forEach((s,i)=>{
      areaTotal+=area(s);
      const per=perimeter(s);
      wallLength+=per;
      const wt=s.wallType||'exterior';
      if(wt==='exterior')externalLength+=per;else internalLength+=per;
    });
    lines.forEach(l=>{
      const L=lineLength(l), wt=l.wallType||classifySegmentWall(l.a,l.b,-1);
      wallLength+=L;
      if(wt==='exterior')externalLength+=L;else internalLength+=L;
    });
    source=panels.length&&lines.length?'contornos + paredes interiores':(panels.length?'volumes/painéis fechados':'linhas/DXF importadas');
  }

  const spacing=Number(S.calc.spacing)||0.6, height=Number(S.calc.height)||2.7;
  const wind=Number(S.calc.wind)||0.5, load=(Number(S.calc.dead)||0)+(Number(S.calc.live)||0);

  if(!studs){
    const lineStuds=lines.reduce((a,l)=>a+Math.max(2,Math.floor(lineLength(l)/(typeof wallSpacingOf==='function'?wallSpacingOf(l):spacing))+1),0);
    const panelStuds=panels.reduce((a,p)=>a+Math.ceil(perimeter(p)/(typeof wallSpacingOf==='function'?wallSpacingOf(p):spacing)),0);
    studs=lineStuds+panelStuds;
  }
  if(!tracks)tracks=wallLength>0?Math.max(2,Math.ceil(wallLength/3)*2):0;
  const linStud=studs*height;
  const linTrack=wallLength*2;
  const mass=S.profiles.length?S.profiles.reduce((a,p)=>a+lineLength(p)*(typeof profileDimsOf==='function'?(Number(profileDimsOf(p).kgm)||1.25):1.25),0):(linStud*1.35+linTrack*1.15);
  const warn=[];
  if(wallLength<=0)warn.push('Não existem paredes/linhas/volumes para calcular.');
  if(internalLength<=0 && lines.length===0)warn.push('Não existem paredes interiores desenhadas/detetadas. Desenhe ou selecione linhas interiores.');
  if(spacing>0.6)warn.push('Espaçamento superior a 600 mm: rever estabilidade e placas.');
  if(height>3.0)warn.push('Altura superior a 3,00 m: verificar flambagem e reforços.');
  if(wind>0.75)warn.push('Pressão de vento elevada: exigir verificação estrutural detalhada.');
  if(!S.profiles.length && wallLength>0)warn.push('Pré-cálculo feito sem perfis gerados. Clique em Gerar LSF para criar peças individuais.');

  S.calc.results={source,panels:panels.length,lines:lines.length,areaTotal,wallLength,externalLength,internalLength,externalWall:Number(S.calc.externalWall)||0.150,internalWall:Number(S.calc.internalWall)||0.100,studs,tracks,linStud,linTrack,mass,load,wind,warn};
  S.tab='structure';$$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab==='structure'));panel();
  msg(wallLength>0?'Pré-cálculo estrutural gerado com exteriores e interiores.':'Não há elementos para calcular.');
}
function exportCSV(){
  const rows=[['PROJETO','PAINEL','REFERENCIA','TIPO','TIPO_PAREDE','LARGURA_PAREDE_MM','PERFIL','ALMA_MM','ABA_MM','LABIO_MM','ESPESSURA_MM','KG_M','COMPRIMENTO_MM','OBS']];
  if(S.profiles.length){
    S.profiles.forEach(p=>{const d=profileDimsOf(p);rows.push(['Aloe LSF 360',p.panel,p.name,p.type,p.wallType||'interior',((p.thickness||wallThickness(p.wallType))*1000).toFixed(0),p.profile,d.web,d.flange,d.lip,d.thickness,d.kgm,(lineLength(p)*1000).toFixed(1),'Perfil LSF individual selecionável']);});
  } else {
    const closed=S.shapes.filter(isClosed), lines=S.shapes.filter(o=>o.kind==='line'&&!o.openingType);
    if(closed.length) closed.forEach((s,i)=>rows.push(['Aloe LSF 360','P'+(i+1),s.name,shapeName(s.kind),s.wallType||'exterior',((s.thickness||wallThickness(s.wallType||'exterior'))*1000).toFixed(0),'—','','','','','','',((s.height||0)*1000).toFixed(1),'Volume/base para estrutura']));
    if(lines.length) lines.forEach((l,i)=>rows.push(['Aloe LSF 360','L'+(i+1),l.name||('Linha '+(i+1)),'Linha/DXF',l.wallType||classifySegmentWall(l.a,l.b,-1),((l.thickness||wallThickness(l.wallType||classifySegmentWall(l.a,l.b,-1)))*1000).toFixed(0),'—','','','','','','',(lineLength(l)*1000).toFixed(1),'Linha usada como eixo de parede; altura '+n(wallHeightOf(l))+' m; espaçamento '+n(wallSpacingOf(l))+' m']));
  }
  const openings=openingMapRows();
  if(openings.length){
    rows.push([]);
    rows.push(['MAPA DE VÃOS','CODIGO_VAO','PAINEL','PAREDE_REF','REFERENCIA','TIPO','TIPO_PAREDE','LARGURA_MM','ALTURA_MM','PEITORIL_MM','CABEÇA_VÃO_MM','LADO_ABERTURA','ORIGEM']);
    openings.forEach(r=>rows.push(r));
  }
  if(S.calc.results){
    rows.push([]);
    rows.push(['PRE-CALCULO','','Origem',S.calc.results.source,'—','—','—','—','Estimativo']);
    rows.push(['PRE-CALCULO','','Comprimento paredes','m','total','—','—',n(S.calc.results.wallLength),'Estimativo']);
    rows.push(['PRE-CALCULO','','Paredes exteriores','m','exterior',((S.calc.results.externalWall||S.calc.externalWall)*1000).toFixed(0),'—',n(S.calc.results.externalLength),'Estimativo']);
    rows.push(['PRE-CALCULO','','Paredes interiores','m','interior',((S.calc.results.internalWall||S.calc.internalWall)*1000).toFixed(0),'—',n(S.calc.results.internalLength),'Estimativo']);
    rows.push(['PRE-CALCULO','','Montantes','un','—','—',S.calc.studProfile,S.calc.results.studs,'Estimativo']);
    rows.push(['PRE-CALCULO','','Guias','un','—','—',S.calc.trackProfile,S.calc.results.tracks,'Estimativo']);
    rows.push(['PRE-CALCULO','','Massa estimada','kg','—','—','—',n(S.calc.results.mass),'Indicativo']);
  }
  if(rows.length===1)return msg('Sem dados para CSV.');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n')],{type:'text/csv;charset=utf-8'}));
  a.download='aloe_lsf360_fabrico.csv';a.click();msg('CSV gerado com mapa de vãos.');
}

function signedData(){
  return S.signed || {};
}
function syncSignedFromCalc(){
  S.signed.wallHeight=Number(S.signed.wallHeight||S.calc.height||2.36);
  S.signed.totalHeight=Number(S.signed.wallHeight||2.36)+Number(S.signed.roofRise||1.25);
}
function signedDossierText(){
  syncSignedFromCalc();
  const d=signedData(), r=S.calc.results;
  const lines=[];
  lines.push('ALOe LSF 360 — DOSSIER PARA PROJETO ESTRUTURAL ASSINADO');
  lines.push('');
  lines.push('1. IDENTIFICAÇÃO');
  lines.push('Técnico responsável: '+(d.title||'Eng.º')+' '+(d.engineer||'Joaquim Diniz'));
  lines.push('N.º Ordem/Associação: '+(d.orderNo||'A preencher'));
  lines.push('Seguro profissional: '+(d.insurance||'A preencher'));
  lines.push('Código de verificação: '+(d.verificationCode||'A preencher'));
  lines.push('Requerente/Dono da obra: '+(d.client||'Jorge Simões'));
  lines.push('Local da obra: '+(d.workLocation||'Granja do Ulmeiro'));
  lines.push('Processo: '+(d.process||'PJD012'));
  lines.push('Data: '+(d.date||'Jun.2026'));
  lines.push('');
  lines.push('2. BASE DE ARQUITETURA');
  lines.push('Projeto: '+(d.projectName||'Bungalow T2 em LSF'));
  lines.push('Escala: '+(d.scale||'1/100'));
  lines.push('Dimensão exterior: '+n(d.length)+' m x '+n(d.width)+' m');
  lines.push('Altura parede/alçado: '+n(d.wallHeight)+' m');
  lines.push('Elevação de cobertura/cume: '+n(d.roofRise)+' m');
  lines.push('Altura total estimada: '+n(d.totalHeight)+' m');
  lines.push('Tipo de cobertura: '+(d.roofType||'Duas águas'));
  lines.push('');
  lines.push('3. SOLUÇÃO ESTRUTURAL');
  lines.push('Sistema estrutural: '+(d.structuralSystem||'LSF'));
  lines.push('Aço/perfis: '+(d.steel||S.calc.steel));
  lines.push('Parede exterior: '+n(S.calc.externalWall)+' m');
  lines.push('Parede interior: '+n(S.calc.internalWall)+' m');
  lines.push('Espaçamento de montantes: '+n(S.calc.spacing)+' m');
  lines.push('Altura padrão: '+n(S.calc.height)+' m');
  lines.push('');
  lines.push('4. AÇÕES INDICATIVAS');
  lines.push('Vento indicativo: '+n(S.calc.wind)+' kN/m²');
  lines.push('Carga permanente: '+n(S.calc.dead)+' kN/m²');
  lines.push('Sobrecarga: '+n(S.calc.live)+' kN/m²');
  lines.push('');
  lines.push('5. RESULTADOS DO PRÉ-CÁLCULO');
  if(r){
    lines.push('Origem: '+r.source);
    lines.push('Comprimento total de paredes: '+n(r.wallLength)+' m');
    lines.push('Paredes exteriores: '+n(r.externalLength)+' m');
    lines.push('Paredes interiores: '+n(r.internalLength)+' m');
    lines.push('Montantes estimados: '+r.studs);
    lines.push('Guias estimadas: '+r.tracks);
    lines.push('Massa estimada de aço: '+n(r.mass)+' kg');
    if(r.warn?.length)lines.push('Avisos: '+r.warn.join(' | '));
  }else{
    lines.push('Executar pré-cálculo antes da emissão final.');
  }
  lines.push('');
  lines.push('6. VERIFICAÇÕES A VALIDAR PELO ENGENHEIRO');
  lines.push('- estabilidade global;');
  lines.push('- ações de vento, sismo e eventuais ações locais;');
  lines.push('- paredes exteriores e interiores;');
  lines.push('- cobertura e transmissão de cargas;');
  lines.push('- aberturas, reforços e lintéis;');
  lines.push('- ligações à fundação e ancoragens;');
  lines.push('- contraventamento e deformações;');
  lines.push('- compatibilidade dos perfis com ficha técnica do fabricante;');
  lines.push('- peças desenhadas e mapa final de fabrico.');
  lines.push('');
  lines.push('7. TERMO DE RESPONSABILIDADE');
  lines.push('O presente documento constitui dossier técnico base para revisão, validação, complementação e assinatura pelo técnico responsável.');
  lines.push('');
  lines.push('Assinatura do técnico responsável: ______________________________');
  lines.push((d.title||'Eng.º')+' '+(d.engineer||'Joaquim Diniz'));
  return lines.join('\n');
}
function downloadSignedDossier(){
  const text=signedDossierText();
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
  a.download='dossier_projeto_estrutural_assinado_aloe_lsf360.txt';
  a.click();
  msg('Dossier para assinatura descarregado.');
}
function printSignedDossier(){
  const w=window.open('','_blank');
  w.document.write('<html><head><title>Dossier Projeto Estrutural</title><style>body{font-family:Arial,sans-serif;line-height:1.45;padding:28px;color:#123} h1{font-size:22px} pre{white-space:pre-wrap;font-family:Arial,sans-serif}.box{border:1px solid #999;padding:18px;margin-top:20px;height:90px}</style></head><body><h1>Aloe LSF 360 — Dossier para Projeto Estrutural Assinado</h1><pre>'+signedDossierText().replace(/[&<>]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]))+'</pre><div class="box">Assinatura e vinheta/código profissional</div></body></html>');
  w.document.close();w.focus();w.print();
}

function renderEntityPanel(p,sel){
  const first=sel[0];
  let html='<div class="card"><h3>Propriedades</h3>';
  if(sel.length){
    html+='<p><b>'+sel.length+' elemento(s) selecionado(s)</b></p>';
    html+='<p>Referência: '+first.name+'</p>';
    html+='<p>Tipo: '+(first.kind==='profile'?first.type:shapeName(first.kind))+'</p>';
    html+='<p>Perfil: '+(first.profile||'—')+'</p>';
    html+='<p>Tipo de parede: '+(first.wallType||'—')+' · largura: '+(first.thickness?((first.thickness*1000).toFixed(0)+' mm'):'—')+'</p>';
    if(first.openingType){
      html+='<p>Abertura: '+(first.openingType==='door'?'Porta':'Janela')+' · Código: '+(first.openingCode||'por gerar')+'</p>';
      html+='<p>Largura do vão: '+n(openingWidthOf(first),2)+' m · Altura: '+n(openingHeightOf(first),2)+' m</p>';
      if(first.openingType==='window') html+='<p>Peitoril: '+n(sillHeightOf(first),2)+' m · Cabeça do vão: '+n(headHeightOf(first),2)+' m</p>';
      else html+='<p>Lado de abertura: '+(first.doorHinge==='end'?'Direita':'Esquerda')+' · Arco '+(Number(first.doorSwingSign||1)>0?'normal':'invertido')+'</p>';
    }
    html+='<p>Altura personalizada: '+wallHeightOf(first)+' m · Espaçamento: '+wallSpacingOf(first)+' m</p>';
    html+='<p>Perfis: '+wallStudProfileOf(first)+' / '+wallTrackProfileOf(first)+'</p>';
    const d=profileDimsOf(first); html+='<p>Medidas perfil: alma '+d.web+' mm · aba '+d.flange+' mm · lábio '+d.lip+' mm · esp. '+d.thickness+' mm</p>';
    html+='<p>Altura: '+(first.height?n(first.height)+' m':'—')+'</p>';
  }else html+='<p>Selecione um objeto no desenho ou na lista.</p>';
  html+='</div>';
  if(first&&first.openingType){
    html+='<div class="card"><h3>Editar vão</h3><p>Ajuste manualmente largura/altura do vão e, no caso das portas, o lado de abertura.</p><div class="wall-editor-grid">';
    html+='<div class="field"><label>Largura do vão (m)</label><input id="openWidth" type="number" step="0.01" value="'+n(openingWidthOf(first),2)+'"></div>';
    html+='<div class="field"><label>Altura do vão (m)</label><input id="openHeight" type="number" step="0.01" value="'+n(openingHeightOf(first),2)+'"></div>';
    if(first.openingType==='window'){
      html+='<div class="field"><label>Peitoril (m)</label><input id="openSill" type="number" step="0.01" value="'+n(sillHeightOf(first),2)+'"></div>';
      html+='<div class="field"><label>Cabeça do vão (m)</label><input id="openHead" type="number" step="0.01" value="'+n(headHeightOf(first),2)+'" readonly></div>';
    } else {
      html+='<div class="field"><label>Lado de abertura</label><select id="doorHinge"><option value="start">Esquerda</option><option value="end">Direita</option></select></div>';
      html+='<div class="field"><label>Sentido do arco</label><select id="doorSwing"><option value="1">Normal</option><option value="-1">Invertido</option></select></div>';
    }
    html+='</div><div class="btns"><button class="btn green" id="applyOpeningEdit">Aplicar ao vão</button></div><div class="wall-editor-note">Depois de alterar o vão, clique em <b>Gerar LSF</b> para atualizar os perfis e reforços em torno da abertura.</div></div>';
  }
  html+='<div class="card"><h3>Objetos do projeto</h3><div class="list">';
  html += items().map(o=>'<div class="row '+(S.selected.includes(o.id)?'active':'')+'"><div><b>'+o.name+'</b><small>'+(o.kind==='profile'?o.type:shapeName(o.kind))+' · '+(o.wallType||'—')+' · '+(o.thickness?((o.thickness*1000).toFixed(0)+' mm'):'')+' · '+(o.profile||'—')+(o.openingType?(' · '+(o.openingType==='door'?'porta':'janela')):'')+'</small></div><button data-pick="'+o.id+'">Selecionar</button></div>').join('') || '<p>Nenhum objeto criado.</p>';
  html+='</div></div>';
  p.innerHTML=html;
  $$('[data-pick]').forEach(b=>b.onclick=()=>select(item(b.dataset.pick),S.multi));
  if(first&&first.openingType&&$('#applyOpeningEdit')){
    if(first.openingType==='door'){$('#doorHinge').value=first.doorHinge||'start';$('#doorSwing').value=String(Number(first.doorSwingSign||1));}
    const syncHead=()=>{if($('#openSill')&&$('#openHeight')&&$('#openHead'))$('#openHead').value=(Number($('#openSill').value||0)+Number($('#openHeight').value||0)).toFixed(2)};
    if($('#openSill')) $('#openSill').oninput=syncHead;
    if($('#openHeight')) $('#openHeight').oninput=syncHead;
    $('#applyOpeningEdit').onclick=()=>{const targets=S.selected.map(item).filter(o=>o&&o.openingType); if(!targets.length)return msg('Selecione uma porta ou janela.'); const w=Number($('#openWidth').value)||openingWidthOf(first); const h=Number($('#openHeight').value)||openingHeightOf(first); const sh=$('#openSill')?Number($('#openSill').value||0):null; targets.forEach(o=>{setOpeningWidth(o,w); setOpeningHeights(o,h,sh); if(o.openingType==='door'){o.doorHinge=$('#doorHinge').value; o.doorSwingSign=Number($('#doorSwing').value)||1;}}); numberOpeningsByPanel(); render(); panel(); msg('Vão atualizado manualmente e renumerado por painel.');};
  }
}

function panel(){const p=$('#panelBody'),sel=S.selected.map(item).filter(Boolean);if(S.tab==='entity'){renderEntityPanel(p,sel)}
if(S.tab==='image'){
  const prefs=importPrefs();
  p.innerHTML=`<div class="card"><h3>Importar imagem / PDF / DXF / DWG</h3><p>A deteção V3 reconhece a rede ortogonal de paredes, distingue paredes exteriores e interiores e mantém abertos os intervalos correspondentes a portas e janelas. A máscara escura permanece separada da imagem original.</p><div class="btns"><button class="btn green" id="importImg">Importar imagem</button><button class="btn" id="calibImg">Calibrar por 2 pontos</button><button class="btn" id="autoImg">Auto desenho V3</button><button class="btn" id="redarkenImg">Refazer deteção</button><button class="btn" id="hideImg">Ocultar imagem</button><button class="btn danger" id="deleteImg">Apagar imagem</button></div>${S.image?`<p><b>Imagem carregada.</b> ${S.image.wallDarkened?'<span class="calc-ok">Máscara ativa: '+(S.image.wallRuns||S.image.wallZones||0)+' troços de parede; '+(S.image.detectedOpenings||0)+' vãos preservados.</span>':'Imagem original sem máscara.'} ${S.image.calibrated?'Escala definida por 2 pontos.':'Ainda sem calibração manual.'}</p>`:'<p>Nenhuma imagem carregada.</p>'}<div class="import-enhance-box"><label class="enhance-check"><input id="autoDarkWalls" type="checkbox" ${prefs.autoDarkenWalls?'checked':''}> Escurecer automaticamente as paredes estruturais, sem tapar portas e janelas</label><div class="field"><label>Intensidade: <b id="darknessValue">${Math.round((Number(prefs.wallDarkness)||0.78)*100)}%</b></label><input id="wallDarkness" type="range" min="0.05" max="1" step="0.01" value="${Number(prefs.wallDarkness)||0.78}"></div><div class="field"><label>Sensibilidade da deteção</label><select id="wallSensitivity"><option value="165">Baixa</option><option value="185">Normal</option><option value="205">Alta</option></select></div></div><div class="image-action-note">A intensidade é atualizada em tempo real. Ao mudar a sensibilidade, a aplicação volta a analisar paredes, portas e janelas.</div></div><div class="card"><h3>Fluxo V3</h3><p>1. Importar imagem/PDF<br>2. Confirmar o escurecimento e os vãos<br>3. Calibrar por 2 pontos<br>4. Executar Auto desenho V3<br>5. Corrigir manualmente algum elemento excecional<br>6. Gerar LSF e CSV</p></div>`;
  $('#wallSensitivity').value=String(Number(prefs.darkThreshold)||185);
  $('#importImg').onclick=()=>$('#imageInput').click();$('#calibImg').onclick=startCalib;$('#autoImg').onclick=autoDetectScaleAndDrawing;$('#redarkenImg').onclick=refreshImportedWallDarkening;$('#hideImg').onclick=hideImportedImage;$('#deleteImg').onclick=deleteImportedImage;
  $('#autoDarkWalls').onchange=async e=>{prefs.autoDarkenWalls=e.target.checked;render();if(e.target.checked&&!S.image?.wallMaskSrc)await refreshImportedWallDarkening();};
  $('#wallDarkness').oninput=e=>{$('#darknessValue').textContent=Math.round(Number(e.target.value)*100)+'%';updateImportedWallDarkness(e.target.value);};
  $('#wallSensitivity').onchange=async e=>{prefs.darkThreshold=Number(e.target.value);await refreshImportedWallDarkening();};
}
if(S.tab==='selection'){const profiles=[...new Set(items().map(o=>o.profile).filter(Boolean))];p.innerHTML=`<div class="card"><h3>Seleção</h3><div class="btns"><button class="btn" id="multiBtn">${S.multi?'Desativar':'Ativar'} seleção múltipla</button><button class="btn" id="clearBtn">Limpar</button><button class="btn" id="makeExt">Exterior</button><button class="btn" id="makeInt">Interior</button></div><div class="field"><label>Tipo</label><select id="filterType"><option value="all">Todos</option><option value="rect">Retângulos</option><option value="circle">Círculos</option><option value="polygon">Polígonos</option><option value="profile">Perfis LSF</option></select></div><div class="field"><label>Perfil</label><select id="filterProfile"><option value="all">Todos</option>${profiles.map(x=>`<option>${x}</option>`).join('')}</select></div><button class="btn green" id="filterGo">Selecionar filtrados</button></div>`;$('#multiBtn').onclick=()=>{S.multi=!S.multi;panel()};$('#clearBtn').onclick=()=>select(null);$('#makeExt').onclick=()=>{S.selected.map(item).filter(Boolean).forEach(o=>{o.wallType='exterior';o.thickness=wallThickness('exterior')});render();panel();msg('Seleção marcada como parede exterior.')};$('#makeInt').onclick=()=>{S.selected.map(item).filter(Boolean).forEach(o=>{o.wallType='interior';o.thickness=wallThickness('interior')});render();panel();msg('Seleção marcada como parede interior.')};$('#filterGo').onclick=()=>{const t=$('#filterType').value,pr=$('#filterProfile').value;S.selected=items().filter(o=>(t==='all'||(t==='profile'?o.kind==='profile':o.kind===t))&&(pr==='all'||o.profile===pr)).map(o=>o.id);render();panel();$('#selLabel').textContent=S.selected.length+' elemento(s) selecionado(s).'}}
if(S.tab==='structure'){const r=S.calc.results;p.innerHTML=`<div class="card"><h3>Pré-cálculo estrutural LSF</h3><p>Estimativa técnica para preparação de fabrico. Não substitui projeto estrutural assinado.</p><div class="field"><label>Altura padrão das paredes (m)</label><input id="calcHeight" type="number" step="0.05" value="${S.calc.height}"></div><div class="field"><label>Largura parede exterior (m)</label><input id="extWall" type="number" step="0.01" value="${S.calc.externalWall||0.150}"></div><div class="field"><label>Largura parede interior (m)</label><input id="intWall" type="number" step="0.01" value="${S.calc.internalWall||0.100}"></div><div class="field"><label>Espaçamento montantes (m)</label><select id="calcSpacing"><option value="0.40">0,40</option><option value="0.60">0,60</option></select></div><div class="field"><label>Vento indicativo kN/m²</label><input id="calcWind" type="number" step="0.05" value="${S.calc.wind}"></div><div class="field"><label>Carga permanente kN/m²</label><input id="calcDead" type="number" step="0.05" value="${S.calc.dead}"></div><div class="field"><label>Sobrecarga kN/m²</label><input id="calcLive" type="number" step="0.05" value="${S.calc.live}"></div><button class="btn green" id="runCalc">Executar pré-cálculo</button></div>${r?`<div class="card"><h3>Resultados</h3><div class="kpi"><div><b>${r.panels}</b><span>painéis/volumes</span></div><div><b>${n(r.wallLength)} m</b><span>perímetro total</span></div><div><b>${n(r.externalLength)} m</b><span>paredes exteriores · ${((r.externalWall||S.calc.externalWall)*1000).toFixed(0)} mm</span></div><div><b>${n(r.internalLength)} m</b><span>paredes interiores · ${((r.internalWall||S.calc.internalWall)*1000).toFixed(0)} mm</span></div><div><b>${r.studs}</b><span>montantes estimados</span></div><div><b>${n(r.mass)} kg</b><span>aço estimado</span></div></div>${r.warn.length?`<p class="calc-warn">${r.warn.join('<br>')}</p>`:'<p class="calc-ok">Pré-verificação sem avisos críticos.</p>'}<p>Confirme cargas, vãos, aberturas, ligações, contraventamento e normas aplicáveis com técnico responsável.</p></div>`:''}`;$('#calcSpacing').value=S.calc.spacing;$('#runCalc').onclick=()=>{S.calc.height=Number($('#calcHeight').value)||2.7;S.calc.externalWall=Number($('#extWall').value)||0.150;S.calc.internalWall=Number($('#intWall').value)||0.100;S.calc.spacing=Number($('#calcSpacing').value)||0.6;S.calc.wind=Number($('#calcWind').value)||0.5;S.calc.dead=Number($('#calcDead').value)||0.4;S.calc.live=Number($('#calcLive').value)||0.75;runCalc()}}
if(S.tab==='profiles'){p.innerHTML=`<div class="card"><h3>Perfis LSF</h3><div class="profile-gallery"><figure><img src="assets/lsf-profile-c.svg"><figcaption>Montante C</figcaption></figure><figure><img src="assets/lsf-profile-u.svg"><figcaption>Guia U</figcaption></figure><figure><img src="assets/lsf-profile-l.svg"><figcaption>Cantoneira L</figcaption></figure></div><div class="field"><label>Montante</label><select id="stud"><option>C90x40x0.95</option><option>C100x40x0.95</option><option>C140x40x1.20</option><option>C200x50x1.50</option><option>C300x50x2.00</option></select></div><div class="field"><label>Guia</label><select id="track"><option>U90x40x0.95</option><option>U100x40x0.95</option><option>U140x40x1.20</option><option>U200x50x1.50</option><option>U300x50x2.00</option></select></div><div class="btns"><button class="btn green" id="applyProfiles">Aplicar à seleção</button><button class="btn" id="selStuds">Selecionar montantes</button><button class="btn" id="selTracks">Selecionar guias</button><button class="btn" id="selAllProfiles">Selecionar todos perfis</button></div></div><div class="card"><h3>Perfis gerados</h3><div class="list">${S.profiles.map(o=>`<div class="row ${S.selected.includes(o.id)?'active':''}"><div><b>${o.name}</b><small>${o.type} · ${o.profile} · ${n(lineLength(o))} m</small></div><button data-profilepick="${o.id}">Selecionar</button></div>`).join('')||'<p>Ainda não existem perfis. Clique em Gerar LSF.</p>'}</div></div>`;$('#stud').value=S.calc.studProfile;$('#track').value=S.calc.trackProfile;$('#applyProfiles').onclick=()=>{S.calc.studProfile=$('#stud').value;S.calc.trackProfile=$('#track').value;S.selected.map(item).filter(o=>o?.kind==='profile').forEach(o=>o.profile=o.type==='Montante'?S.calc.studProfile:S.calc.trackProfile);render();panel();msg('Perfis aplicados.')};$('#selStuds').onclick=()=>{S.selected=S.profiles.filter(p=>p.type==='Montante').map(p=>p.id);render();panel();$('#selLabel').textContent=S.selected.length+' montantes selecionados.'};$('#selTracks').onclick=()=>{S.selected=S.profiles.filter(p=>p.type&&p.type.startsWith('Guia')).map(p=>p.id);render();panel();$('#selLabel').textContent=S.selected.length+' guias selecionadas.'};$('#selAllProfiles').onclick=()=>{S.selected=S.profiles.map(p=>p.id);render();panel();$('#selLabel').textContent=S.selected.length+' perfis selecionados.'};$$('[data-profilepick]').forEach(b=>b.onclick=()=>select(item(b.dataset.profilepick),S.multi))}
if(S.tab==='profileDims'){
  const selected=S.selected.map(item).filter(Boolean);
  const first=selected[0]||{};
  const d=profileDimsOf(first);
  p.innerHTML=`<div class="card"><h3>Personalizar medidas dos perfis</h3><p>Selecione perfis ou paredes e aplique medidas próprias ao perfil C ou U.</p><div class="field"><label>Família</label><select id="pdFamily"><option value="C">Perfil C / montante</option><option value="U">Perfil U / guia</option></select></div><div class="profile-dim-grid"><div class="field"><label>Alma / largura principal (mm)</label><input id="pdWeb" type="number" step="1" value="${d.web}"></div><div class="field"><label>Aba (mm)</label><input id="pdFlange" type="number" step="1" value="${d.flange}"></div><div class="field"><label>Lábio / retorno (mm)</label><input id="pdLip" type="number" step="1" value="${d.lip||0}"></div><div class="field"><label>Espessura aço (mm)</label><input id="pdThick" type="number" step="0.05" value="${d.thickness}"></div><div class="field"><label>Peso kg/m</label><input id="pdKgm" type="number" step="0.01" value="${d.kgm}"></div><div class="field"><label>N.º selecionados</label><input readonly value="${selected.length}"></div></div><div class="btns"><button class="btn green" id="applyProfileDims">Aplicar medidas do perfil</button><button class="btn" id="presetC90">C90</button><button class="btn" id="presetC140">C140</button><button class="btn" id="presetU90">U90</button></div><div class="profile-dim-note">Estas medidas passam para a referência do perfil, geração LSF, massa estimada e CSV.</div></div><div class="card"><h3>Perfis selecionáveis</h3><div class="list">${items().filter(o=>o.kind==='profile'||isClosed(o)||o.kind==='line').map(o=>{const x=profileDimsOf(o);return `<div class="row ${S.selected.includes(o.id)?'active':''}"><div><b>${o.name}</b><small>${o.profile||wallStudProfileOf(o)} · alma ${x.web} · aba ${x.flange} · lábio ${x.lip} · ${x.thickness} mm · ${x.kgm} kg/m</small></div><button data-pdselect="${o.id}">Selecionar</button></div>`}).join('')||'<p>Sem elementos.</p>'}</div></div>`;
  $('#pdFamily').value=d.family||'C';
  $('#applyProfileDims').onclick=()=>applyProfileDimsToSelection({family:$('#pdFamily').value,web:Number($('#pdWeb').value),flange:Number($('#pdFlange').value),lip:Number($('#pdLip').value),thickness:Number($('#pdThick').value),kgm:Number($('#pdKgm').value)});
  $('#presetC90').onclick=()=>{S.selected.length||msg('Selecione primeiro.');applyProfileDimsToSelection({family:'C',web:90,flange:40,lip:12,thickness:0.95,kgm:1.35})};
  $('#presetC140').onclick=()=>{S.selected.length||msg('Selecione primeiro.');applyProfileDimsToSelection({family:'C',web:140,flange:40,lip:12,thickness:1.20,kgm:1.95})};
  $('#presetU90').onclick=()=>{S.selected.length||msg('Selecione primeiro.');applyProfileDimsToSelection({family:'U',web:90,flange:40,lip:0,thickness:0.95,kgm:1.15})};
  $$('[data-pdselect]').forEach(b=>b.onclick=()=>select(item(b.dataset.pdselect),S.multi));
}

if(S.tab==='wallEditor'){
  const selected=S.selected.map(item).filter(Boolean);
  const first=selected[0]||{};
  p.innerHTML=`<div class="card"><h3>Personalizar medidas das paredes</h3><p>Selecione uma ou várias linhas, paredes ou perfis e aplique medidas próprias.</p><div class="field"><label>Tipo de parede</label><select id="wallTypeEdit"><option value="exterior">Exterior</option><option value="interior">Interior</option></select></div><div class="wall-editor-grid"><div class="field"><label>Largura / espessura (m)</label><input id="wallThicknessEdit" type="number" step="0.01" value="${first.thickness||wallThickness(first.wallType||'exterior')}"></div><div class="field"><label>Altura da parede (m)</label><input id="wallHeightEdit" type="number" step="0.05" value="${wallHeightOf(first)}"></div><div class="field"><label>Espaçamento montantes (m)</label><input id="wallSpacingEdit" type="number" step="0.05" value="${wallSpacingOf(first)}"></div><div class="field"><label>N.º selecionados</label><input readonly value="${selected.length}"></div></div><div class="field"><label>Perfil montante</label><select id="wallStudEdit"><option>C90x40x0.95</option><option>C100x40x0.95</option><option>C140x40x1.20</option><option>C200x50x1.50</option><option>C300x50x2.00</option></select></div><div class="field"><label>Perfil guia</label><select id="wallTrackEdit"><option>U90x40x0.95</option><option>U100x40x0.95</option><option>U140x40x1.20</option><option>U200x50x1.50</option><option>U300x50x2.00</option></select></div><div class="btns"><button class="btn green" id="applyWallMeasures">Aplicar medidas à seleção</button><button class="btn" id="selectExteriorWalls">Selecionar exteriores</button><button class="btn" id="selectInteriorWalls">Selecionar interiores</button></div><div class="wall-editor-note">Depois de aplicar medidas, clique novamente em <b>Gerar LSF</b> para reconstruir os perfis com as novas dimensões.</div></div><div class="card"><h3>Paredes/linhas selecionáveis</h3><div class="list">${S.shapes.filter(o=>isClosed(o)||(o.kind==='line'&&!o.openingType)).map(o=>`<div class="row ${S.selected.includes(o.id)?'active':''}"><div><b>${o.name}</b><small>${o.wallType||'—'} · ${(Number(o.thickness||wallThickness(o.wallType||'exterior'))*1000).toFixed(0)} mm · H ${n(wallHeightOf(o))} m · ${wallStudProfileOf(o)}</small></div><button data-wallpick="${o.id}">Selecionar</button></div>`).join('')||'<p>Sem paredes ou linhas.</p>'}</div></div>`;
  $('#wallTypeEdit').value=first.wallType||'exterior';
  $('#wallStudEdit').value=wallStudProfileOf(first);
  $('#wallTrackEdit').value=wallTrackProfileOf(first);
  $('#applyWallMeasures').onclick=()=>applyWallMeasuresToSelection({wallType:$('#wallTypeEdit').value,thickness:Number($('#wallThicknessEdit').value),height:Number($('#wallHeightEdit').value),spacing:Number($('#wallSpacingEdit').value),studProfile:$('#wallStudEdit').value,trackProfile:$('#wallTrackEdit').value});
  $('#selectExteriorWalls').onclick=()=>{S.selected=S.shapes.filter(o=>(isClosed(o)||(o.kind==='line'&&!o.openingType))&&(o.wallType||classifySegmentWall(pointsOf(o)[0],pointsOf(o)[1],S.shapes.filter(isClosed).indexOf(o)))==='exterior').map(o=>o.id);render();panel();};
  $('#selectInteriorWalls').onclick=()=>{S.selected=S.shapes.filter(o=>(isClosed(o)||(o.kind==='line'&&!o.openingType))&&(o.wallType||classifySegmentWall(pointsOf(o)[0],pointsOf(o)[1],S.shapes.filter(isClosed).indexOf(o)))!=='exterior').map(o=>o.id);render();panel();};
  $$('[data-wallpick]').forEach(b=>b.onclick=()=>select(item(b.dataset.wallpick),S.multi));
}

if(S.tab==='geo'){p.innerHTML=`<div class="card"><h3>Geolocalização</h3><p>Rua, número, código postal e localidade para preparar o terreno do projeto.</p><div class="field"><label>Rua e número</label><input placeholder="Rua das Acácias, 123"></div><div class="field"><label>Código postal</label><input placeholder="3080-123"></div><div class="field"><label>Localidade</label><input placeholder="Figueira da Foz"></div><button class="btn green" onclick="alert('Localização guardada no projeto de teste.')">Guardar localização</button></div>`}
if(S.tab==='signedProject'){
  const d=signedData();
  p.innerHTML=`<div class="card"><h3>Projeto estrutural para assinatura</h3><div class="signed-warning"><b>Aviso:</b> este módulo gera o dossier técnico base. A assinatura e responsabilidade técnica pertencem ao engenheiro civil habilitado, após revisão e validação.</div><div class="signed-section"><h4>Técnico responsável</h4><div class="field"><label>Nome</label><input id="sgEngineer" value="${d.engineer||'Joaquim Diniz'}"></div><div class="field"><label>Título / especialidade</label><input id="sgTitle" value="${d.title||'Engenheiro Civil'}"></div><div class="field"><label>N.º Ordem / Associação</label><input id="sgOrder" placeholder="A preencher" value="${d.orderNo||''}"></div><div class="field"><label>Seguro profissional</label><input id="sgInsurance" placeholder="A preencher" value="${d.insurance||''}"></div><div class="field"><label>Código de verificação</label><input id="sgCode" placeholder="A preencher" value="${d.verificationCode||''}"></div></div><div class="signed-section"><h4>Obra</h4><div class="field"><label>Dono da obra / requerente</label><input id="sgClient" value="${d.client||'Jorge Simões'}"></div><div class="field"><label>Local da obra</label><input id="sgLocation" value="${d.workLocation||'Granja do Ulmeiro'}"></div><div class="field"><label>Processo</label><input id="sgProcess" value="${d.process||'PJD012'}"></div><div class="field"><label>Data</label><input id="sgDate" value="${d.date||'Jun.2026'}"></div></div><div class="signed-section"><h4>Dados geométricos do PDF</h4><div class="field"><label>Comprimento exterior (m)</label><input id="sgLength" type="number" step="0.01" value="${d.length||10.00}"></div><div class="field"><label>Largura exterior (m)</label><input id="sgWidth" type="number" step="0.01" value="${d.width||7.00}"></div><div class="field"><label>Altura parede/alçado (m)</label><input id="sgWallH" type="number" step="0.01" value="${d.wallHeight||2.36}"></div><div class="field"><label>Elevação cobertura/cume (m)</label><input id="sgRoof" type="number" step="0.01" value="${d.roofRise||1.25}"></div></div><div class="signed-section"><h4>Solução estrutural</h4><div class="field"><label>Sistema estrutural</label><input id="sgSystem" value="${d.structuralSystem||'LSF — Light Steel Framing'}"></div><div class="field"><label>Aço / perfis</label><input id="sgSteel" value="${d.steel||S.calc.steel}"></div><div class="field"><label>Tipo de cobertura</label><input id="sgRoofType" value="${d.roofType||'Cobertura de duas águas'}"></div></div><div class="btns"><button class="btn green" id="saveSigned">Guardar dados</button><button class="btn" id="runSignedCalc">Pré-cálculo</button><button class="btn" id="downloadSigned">Descarregar dossier TXT</button><button class="btn" id="printSigned">Imprimir/PDF</button></div><div class="signature-box">Assinatura do Eng.º Joaquim Diniz / código profissional</div></div>`;
  const save=()=>{S.signed.engineer=$('#sgEngineer').value;S.signed.title=$('#sgTitle').value;S.signed.orderNo=$('#sgOrder').value;S.signed.insurance=$('#sgInsurance').value;S.signed.verificationCode=$('#sgCode').value;S.signed.client=$('#sgClient').value;S.signed.workLocation=$('#sgLocation').value;S.signed.process=$('#sgProcess').value;S.signed.date=$('#sgDate').value;S.signed.length=Number($('#sgLength').value)||10;S.signed.width=Number($('#sgWidth').value)||7;S.signed.wallHeight=Number($('#sgWallH').value)||2.36;S.signed.roofRise=Number($('#sgRoof').value)||1.25;S.signed.totalHeight=S.signed.wallHeight+S.signed.roofRise;S.signed.structuralSystem=$('#sgSystem').value;S.signed.steel=$('#sgSteel').value;S.signed.roofType=$('#sgRoofType').value;S.calc.height=S.signed.wallHeight;msg('Dados do projeto assinado guardados.');};
  $('#saveSigned').onclick=save;
  $('#runSignedCalc').onclick=()=>{save();runCalc();};
  $('#downloadSigned').onclick=()=>{save();downloadSignedDossier();};
  $('#printSigned').onclick=()=>{save();printSignedDossier();};
}

if(S.tab==='csv'){p.innerHTML=`<div class="card"><h3>CSV de fabrico</h3><p>Exporta volumes, perfis LSF individuais e resumo de pré-cálculo.</p><button class="btn green" id="panelCSV">Gerar CSV</button></div>`;$('#panelCSV').onclick=exportCSV}}
function bind(){svg.setAttribute('viewBox','0 0 1200 760');$$('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));$('#v2').onclick=()=>setMode('2d');$('#v3').onclick=()=>setMode('3d');$('#viewToggle').onclick=()=>setMode(S.mode==='2d'?'3d':'2d');$('#panelToggle').onclick=()=>$('#panel').classList.toggle('hidden');$('#panelClose').onclick=()=>$('#panel').classList.add('hidden');$('#lsfBtn').onclick=generateLSF;$('#calcBtn').onclick=runCalc;$('#csvBtn').onclick=exportCSV;$('#signedBtn').onclick=()=>{S.tab='signedProject';$$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab==='signedProject'));panel();};$('#calibrateBtn').onclick=startCalib;$('#autoDetectBtn').onclick=autoDetectScaleAndDrawing;const darkBtn=$('#darkenWallsBtn');if(darkBtn)darkBtn.onclick=refreshImportedWallDarkening;$('#hideImageBtn').onclick=hideImportedImage;$('#deleteImageBtn').onclick=deleteImportedImage;$('#fitBtn').onclick=()=>{S.cam={yaw:-0.72,pitch:0.56,zoom:1,panX:0,panY:0};S.view2d={panX:0,panY:0};render();msg('Vista ajustada.')};$$('.tab').forEach(b=>b.onclick=()=>{$$('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');S.tab=b.dataset.tab;panel()});$$('[data-layer]').forEach(b=>b.onchange=()=>{S.layers[b.dataset.layer]=b.checked;render()});svg.addEventListener('pointerdown',pointerDown);svg.addEventListener('pointermove',pointerMove);svg.addEventListener('pointerup',pointerUp);svg.addEventListener('wheel',e=>{if(S.mode==='3d'){e.preventDefault();S.cam.zoom=Math.max(0.3,Math.min(3,S.cam.zoom*(e.deltaY<0?1.12:0.89)));render()}},{passive:false});$('#menu').onclick=e=>{const b=e.target.closest('button');if(!b)return;const a=b.dataset.action;if(a==='new'){if(confirm('Criar projeto novo?')){S.shapes=[];S.profiles=[];S.selected=[];S.image=null;S.calibration=null;S.calc.results=null;render();panel()}}else if(a==='open')$('#projectInput').click();else if(a==='save')saveProject();else if(a==='import')$('#imageInput').click();else if(a==='export')exportCSV();else if(a==='location'){S.tab='geo';$$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab==='geo'));panel()}else if(a==='print')window.print()};$('#projectInput').onchange=e=>openProject(e.target.files[0]);$('#imageInput').onchange=e=>importPlanFile(e.target.files[0]);window.addEventListener('keydown',e=>{if(e.key==='Escape'){S.draft=null;S.polygon=[];S.drag=null;S.calibration=null;render()}if(e.key==='Enter'&&S.polygon.length>=3){finish({kind:'polygon',points:[...S.polygon]});S.polygon=[]}if((e.key==='Delete'||e.key==='Backspace')&&document.activeElement.tagName!=='INPUT')removeSelected()})}
function demo(){const r={kind:'rect',a:{x:-2.4,y:-1.4,z:0},b:{x:2.4,y:1.4,z:0},height:2.7};finish(r);S.selected=[r.id];render();panel()}
bind();setTool('select');render();panel();
})();