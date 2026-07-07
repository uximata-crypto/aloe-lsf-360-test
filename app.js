(() => {
"use strict";
const svg=document.getElementById('viewport'), $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)], ns='http://www.w3.org/2000/svg';
const S={
  tool:'select', mode:'3d', tab:'entity', activePlane:'XY', planeOffset:0,
  shapes:[], profiles:[], selected:[], next:1, draft:null, polygon:[], lasso:null,
  multi:false, layers:{grid:true,shapes:true,lsf:true,labels:true},
  cam:{yaw:-0.72,pitch:0.58,zoom:1.0,panX:0,panY:0}, drag:null
};
function uid(p='O'){return p+(S.next++).toString().padStart(3,'0')}
function n(v,d=2){return Number(v).toFixed(d)}
function toast(m){const t=$('#toast');t.textContent=m;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),2500)}
function toolName(t){return({select:'Selecionar',line:'Linha',rect:'Retângulo',circle:'Círculo',polygon:'Polígono',push:'Empurrar/Puxar',move:'Mover',orbit:'Órbita',delete:'Apagar'})[t]||t}
function shapeName(k){return({line:'Linha',rect:'Retângulo',circle:'Círculo',polygon:'Polígono'})[k]||k}
function item(id){return S.shapes.find(s=>s.id===id)||S.profiles.find(p=>p.id===id)}
function items(){return [...S.shapes,...S.profiles]}
function isClosed(s){return ['rect','circle','polygon'].includes(s.kind)}
function viewportRect(){return svg.getBoundingClientRect()}
function svgEl(type,attrs={}){const e=document.createElementNS(ns,type);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);return e}
function clear(){while(svg.firstChild)svg.removeChild(svg.firstChild)}
function center(){const r=viewportRect();return{x:r.width/2+S.cam.panX,y:r.height*.58+S.cam.panY}}
function project(P){const c=center(),cy=Math.cos(S.cam.yaw),sy=Math.sin(S.cam.yaw),cp=Math.cos(S.cam.pitch),sp=Math.sin(S.cam.pitch);const X=P.x*cy-P.y*sy,Y=P.x*sy+P.y*cy;return{x:c.x+X*72*S.cam.zoom,y:c.y-(P.z*cp-Y*sp)*72*S.cam.zoom,depth:Y*cp+P.z*sp}}
function planeCoordsFromScreen(pt,plane=S.activePlane,offset=S.planeOffset){
  const c=center(),scale=72*S.cam.zoom,cy=Math.cos(S.cam.yaw),sy=Math.sin(S.cam.yaw),cp=Math.cos(S.cam.pitch),sp=Math.sin(S.cam.pitch);
  const X=(pt.x-c.x)/scale, D=(c.y-pt.y)/scale;
  const safe=(v)=>Math.abs(v)<.001?(v<0?-.001:.001):v;
  if(plane==='XY'){
    const Y=(cp*offset-D)/safe(sp); return {x:X*cy+Y*sy,y:-X*sy+Y*cy,z:offset};
  }
  if(plane==='XZ'){
    const y=offset,x=(X+sy*y)/safe(cy),Y=x*sy+y*cy,z=(D+sp*Y)/safe(cp);return{x,y,z};
  }
  if(plane==='YZ'){
    const x=offset,y=(cy*x-X)/safe(sy),Y=x*sy+y*cy,z=(D+sp*Y)/safe(cp);return{x,y,z};
  }
  return {x:0,y:0,z:0};
}
function localToWorld(plane,u,v,offset){
  if(plane==='XY')return{x:u,y:v,z:offset};
  if(plane==='XZ')return{x:u,y:offset,z:v};
  if(plane==='YZ')return{x:offset,y:u,z:v};
  return{x:u,y:v,z:offset};
}
function worldToLocal(plane,P){
  if(plane==='XY')return{u:P.x,v:P.y};
  if(plane==='XZ')return{u:P.x,v:P.z};
  return{u:P.y,v:P.z};
}
function pointsOf(s){
  if(s.kind==='rect'){
    const {u1,v1,u2,v2,plane,offset}=s;
    return [localToWorld(plane,u1,v1,offset),localToWorld(plane,u2,v1,offset),localToWorld(plane,u2,v2,offset),localToWorld(plane,u1,v2,offset)];
  }
  if(s.kind==='circle'){
    const pts=[];for(let i=0;i<48;i++){const a=i/48*Math.PI*2;pts.push(localToWorld(s.plane,s.u+Math.cos(a)*s.r,s.v+Math.sin(a)*s.r,s.offset))}return pts;
  }
  if(s.kind==='polygon')return s.points;
  if(s.kind==='line')return [s.a,s.b];
  return [];
}
function normalOf(s){
  const sign=s.normalSign||1;
  return s.plane==='XY'?{x:0,y:0,z:sign}:s.plane==='XZ'?{x:0,y:sign,z:0}:{x:sign,y:0,z:0};
}
function extrudedFaces(s){
  const base=pointsOf(s),h=s.height||0;if(!isClosed(s)||h<=.001)return[];
  const no=normalOf(s),top=base.map(p=>({x:p.x+no.x*h,y:p.y+no.y*h,z:p.z+no.z*h}));
  const faces=[];for(let i=0;i<base.length;i++){const j=(i+1)%base.length;faces.push({pts:[base[i],base[j],top[j],top[i]],type:'side'})}faces.push({pts:top,type:'top'});return faces;
}
function depth(face){return face.pts.reduce((a,p)=>a+project(p).depth,0)/face.pts.length}
function addPolygon(pts,cls,id){const q=pts.map(project),e=svgEl('polygon',{points:q.map(p=>p.x+','+p.y).join(' '),class:cls,'data-id':id});svg.append(e);return e}
function addLine(a,b,cls,id){const A=project(a),B=project(b),e=svgEl('line',{x1:A.x,y1:A.y,x2:B.x,y2:B.y,class:cls,'data-id':id});svg.append(e);return e}
function addText(P,text,selected=false){if(!S.layers.labels)return;const q=project(P),t=svgEl('text',{x:q.x+7,y:q.y-7,class:'shape-label'+(selected?' selected':'')});t.textContent=text;svg.append(t)}
function gridPlane(){
  if(!S.layers.grid)return;
  const size=11,step=.5,off=S.planeOffset,plane=S.activePlane;
  for(let i=-size;i<=size;i+=step){
    const major=Math.abs(i%2)<.001;
    const a=localToWorld(plane,-size,i,off),b=localToWorld(plane,size,i,off),c=localToWorld(plane,i,-size,off),d=localToWorld(plane,i,size,off);
    addLine(a,b,'grid-line','');addLine(c,d,'grid-line','');
  }
  addLine({x:-7,y:0,z:0},{x:7,y:0,z:0},'axis-x','');
  addLine({x:0,y:-7,z:0},{x:0,y:7,z:0},'axis-y','');
  addLine({x:0,y:0,z:0},{x:0,y:0,z:5},'axis-z','');
}
function drawShape(s,preview=false){
  const selected=S.selected.includes(s.id), cls=preview?'draw-preview':(selected?'shape-face selected':'shape-face');
  const base=pointsOf(s);
  if(S.mode==='2d'){
    const map=(p)=>{const l=worldToLocal('XY',p);return{x:l.u*72+560,y:430-l.v*72}};
    if(s.kind==='line'){const a=map(base[0]),b=map(base[1]);const e=svgEl('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:selected?'shape-edge selected':'shape-edge','data-id':s.id||''});svg.append(e);return}
    const pts=base.map(map);const e=svgEl(s.kind==='circle'?'polygon':'polygon',{points:pts.map(p=>p.x+','+p.y).join(' '),class:cls,'data-id':s.id||''});svg.append(e);return;
  }
  if(!s.height||s.height<=.001){
    if(s.kind==='line')addLine(base[0],base[1],selected?'shape-edge selected':'shape-edge',s.id||'');
    else addPolygon(base,preview?'draw-preview':(selected?'shape-face selected':'shape-face'),s.id||'');
  }else{
    extrudedFaces(s).sort((a,b)=>depth(a)-depth(b)).forEach(f=>addPolygon(f.pts,selected?'shape-face selected':'shape-face',s.id||''));
  }
  if(!preview&&base.length)addText(base.reduce((a,p)=>({x:a.x+p.x/base.length,y:a.y+p.y/base.length,z:a.z+p.z/base.length}),{x:0,y:0,z:0}),s.name+(s.height?` · ${n(s.height)} m`:''),selected);
}

function vAdd(a,b){return{x:a.x+b.x,y:a.y+b.y,z:a.z+b.z}}
function vSub(a,b){return{x:a.x-b.x,y:a.y-b.y,z:a.z-b.z}}
function vMul(a,k){return{x:a.x*k,y:a.y*k,z:a.z*k}}
function vLen(a){return Math.hypot(a.x,a.y,a.z)}
function vNorm(a){const l=vLen(a)||1;return{x:a.x/l,y:a.y/l,z:a.z/l}}
function vCross(a,b){return{x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x}}
function vPoint(a,axis,side,normal,t,s,n){return vAdd(a,vAdd(vMul(axis,t),vAdd(vMul(side,s),vMul(normal,n))))}
function profileMidpoint(p){return{x:(p.a.x+p.b.x)/2,y:(p.a.y+p.b.y)/2,z:(p.a.z+p.b.z)/2}}
function profileFaces(p){
  const axis=vNorm(vSub(p.b,p.a));
  let normal=vNorm(p.normal||{x:0,y:1,z:0});
  let side=vNorm(vCross(axis,normal));
  // Fallback for profiles parallel to the supplied normal.
  if(vLen(side)<0.1){normal={x:0,y:0,z:1};side=vNorm(vCross(axis,normal))}
  const width=p.width||0.090, depth=p.depth||0.040, lip=p.lip||0.014;
  const a=p.a,b=p.b, faces=[];
  const strip=(s1,n1,s2,n2,style)=>{
    const q1=vPoint(a,axis,side,normal,0,s1,n1);
    const q2=vPoint(a,axis,side,normal,0,s2,n2);
    const q3=vPoint(b,axis,side,normal,0,s2,n2);
    const q4=vPoint(b,axis,side,normal,0,s1,n1);
    faces.push({pts:[q1,q2,q3,q4],style});
  };
  // Web and flanges: true open section rather than a simple visual line.
  strip(-width/2,-depth/2,width/2,-depth/2,'web');
  strip(-width/2,-depth/2,-width/2,depth/2,'flange');
  strip(width/2,-depth/2,width/2,depth/2,'flange');
  // C profiles have return lips. U profiles remain open.
  if((p.section||'C')==='C'){
    strip(-width/2,depth/2,-width/2+lip,depth/2,'lip');
    strip(width/2,depth/2,width/2-lip,depth/2,'lip');
  }
  return faces;
}
function drawProfiles2D(){
  if(!S.layers.lsf)return;
  S.profiles.forEach(p=>{
    const a=worldTo2D(p.a),b=worldTo2D(p.b),selected=S.selected.includes(p.id);
    const line=svgEl('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,
      class:selected?'profile selected':'profile','data-id':p.id});
    line.setAttribute('stroke-width',p.section==='U'?7:6);
    svg.append(line);
    // small section marker indicates actual C or U family in plan.
    const m={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
    const marker=svgEl('text',{x:m.x+4,y:m.y-5,class:'profile-section-label'});
    marker.textContent=p.section==='U'?'U':'C';
    svg.append(marker);
  });
}
function drawProfiles(){
  if(!S.layers.lsf)return;
  if(S.mode==='2d'){drawProfiles2D();return}
  S.profiles.forEach(p=>{
    const selected=S.selected.includes(p.id);
    profileFaces(p)
      .sort((a,b)=>depth(a)-depth(b))
      .forEach(f=>addPolygon(f.pts,`profile-face ${f.style}${selected?' selected':''}`,p.id));
    if(selected)addText(profileMidpoint(p),`${p.name} · ${p.profile}`,true);
  });
}
function render(){
  clear();
  const defs=svgEl('defs');const marker=svgEl('marker',{id:'arrow',markerWidth:9,markerHeight:9,refX:7,refY:3,orient:'auto'});marker.append(svgEl('path',{d:'M0,0 L0,6 L8,3 z',fill:'#159447'}));defs.append(marker);svg.append(defs);
  if(S.mode==='2d'){render2D();return}
  gridPlane();
  if(S.layers.shapes)S.shapes.forEach(s=>drawShape(s));
  drawProfiles();
  if(S.draft)drawShape(S.draft,true);
  if(S.polygon.length){for(let i=0;i<S.polygon.length-1;i++)addLine(S.polygon[i],S.polygon[i+1],'draw-preview','')}
  if(S.selected.length===1 && S.tool==='push'){const s=item(S.selected[0]);if(s&&isClosed(s)){const b=pointsOf(s);const c=b.reduce((a,p)=>({x:a.x+p.x/b.length,y:a.y+p.y/b.length,z:a.z+p.z/b.length}),{x:0,y:0,z:0}),no=normalOf(s);const tip={x:c.x+no.x*1.3,y:c.y+no.y*1.3,z:c.z+no.z*1.3};const q1=project(c),q2=project(tip);svg.append(svgEl('line',{x1:q1.x,y1:q1.y,x2:q2.x,y2:q2.y,class:'normal-arrow'}));addText(tip,'Arraste para extrudir',false)}}
}
function render2D(){
  const r=viewportRect();svg.append(svgEl('rect',{width:r.width,height:r.height,fill:'#f5fbfb'}));
  for(let x=0;x<r.width;x+=44)svg.append(svgEl('line',{x1:x,y1:0,x2:x,y2:r.height,class:'grid-line'}));
  for(let y=0;y<r.height;y+=44)svg.append(svgEl('line',{x1:0,y1:y,x2:r.width,y2:y,class:'grid-line'}));
  svg.append(svgEl('line',{x1:r.width*.17,y1:0,x2:r.width*.17,y2:r.height,class:'axis-x'}));svg.append(svgEl('line',{x1:0,y1:r.height*.72,x2:r.width,y2:r.height*.72,class:'axis-y'}));
  if(S.layers.shapes)S.shapes.forEach(s=>drawShape(s));drawProfiles2D();
}
function worldTo2D(P){return{x:560+P.x*72,y:430-P.y*72}}
function screenPoint(e){const r=viewportRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
function updateCoords(P){$('#coords').textContent=`X: ${n(P.x,3)} · Y: ${n(P.y,3)} · Z: ${n(P.z,3)}`}
function hitId(target){let t=target;while(t&&t!==svg){if(t.dataset&&t.dataset.id!==undefined&&t.dataset.id)return t.dataset.id;t=t.parentNode}return null}
function select(it,add=false){if(!it){if(!add)S.selected=[];$('#selectionLabel').textContent='Nenhum objeto selecionado.';render();panel();return}if(add||S.multi){S.selected.includes(it.id)?S.selected=S.selected.filter(x=>x!==it.id):S.selected.push(it.id)}else S.selected=[it.id];$('#selectionLabel').textContent=`${S.selected.length} elemento(s) selecionado(s): ${it.name}`;render();panel()}
function setTool(t){S.tool=t;$$('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===t));$('#toolLabel').textContent='Ferramenta: '+toolName(t);$('#hint').textContent=t==='orbit'?'Órbita ativa: arraste no espaço 3D. A rotação horizontal é contínua.' : t==='push'?'Empurrar/Puxar: clique numa face fechada e arraste verticalmente com o rato.' : `Plano ${S.activePlane} ativo. Escolha uma ferramenta e desenhe diretamente no espaço 3D.`}
function setPlane(p){if(p==='FACE'){const it=S.selected.map(item).find(s=>s&&isClosed(s));if(!it)return toast('Selecione uma face fechada primeiro.');S.activePlane=it.plane;S.planeOffset=it.offset;$('#planeOffset').value=S.planeOffset;toast('Plano da face selecionada ativado.')}else{S.activePlane=p}$$('[data-plane]').forEach(b=>b.classList.toggle('active',b.dataset.plane===p));$('#planeLabel').textContent=p==='XY'?'XY · Chão':p==='XZ'?'XZ · Frontal':p==='YZ'?'YZ · Lateral':'Face selecionada';render()}
function localPt(screen){if(S.mode==='2d'){return{x:(screen.x-560)/72,y:(430-screen.y)/72,z:0}}return planeCoordsFromScreen(screen)}
function planeCoordsFromScreen(pt){
  const c=center(),scale=72*S.cam.zoom,cy=Math.cos(S.cam.yaw),sy=Math.sin(S.cam.yaw),cp=Math.cos(S.cam.pitch),sp=Math.sin(S.cam.pitch);
  const X=(pt.x-c.x)/scale,D=(c.y-pt.y)/scale,eps=v=>Math.abs(v)<.001?(v<0?-.001:.001):v,o=S.planeOffset;
  if(S.activePlane==='XY'){const Y=(cp*o-D)/eps(sp);return{x:X*cy+Y*sy,y:-X*sy+Y*cy,z:o}}
  if(S.activePlane==='XZ'){const y=o,x=(X+sy*y)/eps(cy),Y=x*sy+y*cy,z=(D+sp*Y)/eps(cp);return{x,y,z}}
  const x=o,y=(cy*x-X)/eps(sy),Y=x*sy+y*cy,z=(D+sp*Y)/eps(cp);return{x,y,z}
}
function finish(s){s.id=uid();s.name=shapeName(s.kind)+' '+(S.shapes.length+1);s.height=s.height||0;S.shapes.push(s);S.draft=null;render();panel();toast(s.name+' fixado.')}
function start(e){
  const p=screenPoint(e),w=localPt(p);updateCoords(w);
  if(S.tool==='orbit'){S.drag={kind:'orbit',x:p.x,y:p.y,yaw:S.cam.yaw,pitch:S.cam.pitch};return}
  const it=item(hitId(e.target));
  if(S.tool==='select'){select(it,e.ctrlKey||e.metaKey);return}
  if(S.tool==='delete'){if(it){select(it);removeSelected()}return}
  if(S.tool==='move'){if(!it)return toast('Clique primeiro no objeto a mover.');select(it,e.ctrlKey||e.metaKey);S.drag={kind:'move',x:p.x,y:p.y,last:w};return}
  if(S.tool==='push'){if(!it||!isClosed(it))return toast('Selecione um retângulo, círculo ou polígono fechado.');select(it);S.drag={kind:'push',id:it.id,y:p.y,h:it.height||0};return}
  if(S.tool==='line'){S.draft={kind:'line',plane:S.activePlane,a:w,b:w,offset:S.planeOffset};return}
  if(S.tool==='rect'){const L=worldToLocal(S.activePlane,w);S.draft={kind:'rect',plane:S.activePlane,offset:S.planeOffset,u1:L.u,v1:L.v,u2:L.u,v2:L.v};return}
  if(S.tool==='circle'){const L=worldToLocal(S.activePlane,w);S.draft={kind:'circle',plane:S.activePlane,offset:S.planeOffset,u:L.u,v:L.v,r:0};return}
  if(S.tool==='polygon'){S.polygon.push(w);render();return}
}
function move(e){
  const p=screenPoint(e),w=localPt(p);updateCoords(w);
  if(!S.drag)return;
  if(S.drag.kind==='orbit'){S.cam.yaw=S.drag.yaw+(p.x-S.drag.x)*.010;S.cam.pitch=Math.max(-1.20,Math.min(1.20,S.drag.pitch+(p.y-S.drag.y)*.008));render();return}
  if(S.drag.kind==='push'){const it=item(S.drag.id);if(it){it.height=Math.max(0,(S.drag.h+(S.drag.y-p.y)/85));render()}return}
  if(S.drag.kind==='move'){const du=w.x-S.drag.last.x,dv=w.y-S.drag.last.y,dz=w.z-S.drag.last.z;shiftSelected(du,dv,dz);S.drag.last=w;render();return}
  if(S.draft){if(S.draft.kind==='line')S.draft.b=w;if(S.draft.kind==='rect'){const L=worldToLocal(S.activePlane,w);S.draft.u2=L.u;S.draft.v2=L.v}if(S.draft.kind==='circle'){const L=worldToLocal(S.activePlane,w);S.draft.r=Math.hypot(L.u-S.draft.u,L.v-S.draft.v)}render()}
}
function end(e){
  if(S.drag){const was=S.drag.kind;S.drag=null;if(was==='push')toast('Extrusão fixada.');return}
  if(S.draft){if(S.draft.kind==='circle'){if(S.draft.r>.03)finish(S.draft)}else {const ps=pointsOf(S.draft);if(ps.length===2?Math.hypot(ps[1].x-ps[0].x,ps[1].y-ps[0].y,ps[1].z-ps[0].z)>.03:true)finish(S.draft)}S.draft=null}
}
function shiftSelected(dx,dy,dz){S.selected.map(item).filter(Boolean).forEach(o=>{if(o.kind==='profile'){o.a.x+=dx;o.a.y+=dy;o.a.z+=dz;o.b.x+=dx;o.b.y+=dy;o.b.z+=dz}else if(o.kind==='line'){o.a.x+=dx;o.a.y+=dy;o.a.z+=dz;o.b.x+=dx;o.b.y+=dy;o.b.z+=dz}else if(o.kind==='polygon'){o.points.forEach(p=>{p.x+=dx;p.y+=dy;p.z+=dz})}else{const no=normalOf(o);o.offset+=dx*no.x+dy*no.y+dz*no.z}})}
function removeSelected(){if(!S.selected.length)return toast('Selecione objetos antes de apagar.');if(!confirm('Apagar '+S.selected.length+' elemento(s) selecionado(s)?'))return;const ids=new Set(S.selected);S.shapes=S.shapes.filter(s=>!ids.has(s.id));S.profiles=S.profiles.filter(s=>!ids.has(s.id));S.selected=[];render();panel();toast('Elementos apagados.')}
function generateLSF(){
  const ss=S.shapes.filter(isClosed);if(!ss.length)return toast('Desenhe primeiro um retângulo, círculo ou polígono fechado.');
  S.profiles=[];let k=1;
  ss.forEach((s,idx)=>{if(!s.height||s.height<.1)s.height=2.70;const base=pointsOf(s),no=normalOf(s),panel='P'+String(idx+1).padStart(2,'0');for(let i=0;i<base.length;i++){const a=base[i],b=base[(i+1)%base.length],ta={x:a.x+no.x*s.height,y:a.y+no.y*s.height,z:a.z+no.z*s.height},tb={x:b.x+no.x*s.height,y:b.y+no.y*s.height,z:b.z+no.z*s.height};S.profiles.push({id:uid('U'),kind:'profile',type:'Guia inferior',profile:'U90x40x0.95',name:panel+'-U'+k++,panel,a,b,normal:no,section:'U',width:0.090,depth:0.040});S.profiles.push({id:uid('U'),kind:'profile',type:'Guia superior',profile:'U90x40x0.95',name:panel+'-U'+k++,panel,a:ta,b:tb,normal:no,section:'U',width:0.090,depth:0.040});const L=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z),n=Math.max(2,Math.floor(L/.6)+1);for(let j=0;j<n;j++){const t=j/(n-1),p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t},q={x:p.x+no.x*s.height,y:p.y+no.y*s.height,z:p.z+no.z*s.height};S.profiles.push({id:uid('C'),kind:'profile',type:'Montante',profile:'C90x40x0.95',name:panel+'-M'+k++,panel,a:p,b:q,normal:no,section:'C',width:0.090,depth:0.040,lip:0.014})}}});
  render();panel();toast(S.profiles.length+' perfis LSF individuais gerados.');
}
function exportCSV(){
  const rows=[['PROJETO','PAINEL','REFERENCIA','TIPO','PERFIL','COMPRIMENTO_MM']];
  if(S.profiles.length)S.profiles.forEach(p=>rows.push(['Aloe LSF 360',p.panel,p.name,p.type,p.profile,(Math.hypot(p.b.x-p.a.x,p.b.y-p.a.y,p.b.z-p.a.z)*1000).toFixed(1)]));else S.shapes.filter(isClosed).forEach((s,i)=>rows.push(['Aloe LSF 360','P'+(i+1),s.name,shapeName(s.kind),'—',((s.height||0)*1000).toFixed(1)]));
  if(rows.length===1)return toast('Não existem dados para exportar.');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n')],{type:'text/csv'}));a.download='aloe_lsf360_fabrico.csv';a.click();toast('CSV de fabrico gerado.');
}
function panel(){
  const el=$('#panelBody'),sel=S.selected.map(item).filter(Boolean);
  if(S.tab==='entity'){el.innerHTML=`<div class="card"><h3>Propriedades</h3>${sel.length?`<p><b>${sel.length} elemento(s) selecionado(s)</b></p><p>Referência: ${sel[0].name}</p><p>Tipo: ${sel[0].kind==='profile'?sel[0].type:shapeName(sel[0].kind)}</p><p>Plano: ${sel[0].plane||'3D'}</p><p>Altura: ${sel[0].height? n(sel[0].height)+' m':'—'}</p>`:'<p>Selecione um objeto no modelo 3D ou na lista abaixo.</p>'}</div><div class="card"><h3>Objetos do projeto</h3><div class="list">${items().map(o=>`<div class="row ${S.selected.includes(o.id)?'active':''}"><div><b>${o.name}</b><small>${o.kind==='profile'?o.type:shapeName(o.kind)} · ${o.profile||o.plane||'—'}</small></div><button data-pick="${o.id}">Selecionar</button></div>`).join('')||'<p>Nenhum objeto criado.</p>'}</div></div>`;$$('[data-pick]').forEach(b=>b.onclick=()=>select(item(b.dataset.pick),S.multi))}
  if(S.tab==='selection'){const p=[...new Set(items().map(o=>o.profile).filter(Boolean))];el.innerHTML=`<div class="card"><h3>Seleção individual e múltipla</h3><div class="btns"><button class="btn" id="multi">${S.multi?'Desativar':'Ativar'} múltipla</button><button class="btn" id="clear">Limpar seleção</button></div><div class="field"><label>Tipo</label><select id="filterType"><option value="all">Todos</option><option value="rect">Retângulos</option><option value="circle">Círculos</option><option value="polygon">Polígonos</option><option value="profile">Perfis LSF</option></select></div><div class="field"><label>Perfil</label><select id="filterProfile"><option value="all">Todos</option>${p.map(x=>`<option>${x}</option>`).join('')}</select></div><button class="btn green" id="applyFilter">Selecionar filtrados</button></div><div class="card"><h3>Peças individuais</h3><div class="list">${items().map(o=>`<div class="row ${S.selected.includes(o.id)?'active':''}"><div><b>${o.name}</b><small>${o.kind==='profile'?o.type:shapeName(o.kind)} · ${o.profile||o.plane||'—'}</small></div><button data-pick2="${o.id}">Selecionar</button></div>`).join('')||'<p>Desenhe objetos para começar.</p>'}</div></div>`;$('#multi').onclick=()=>{S.multi=!S.multi;panel()};$('#clear').onclick=()=>select(null);$('#applyFilter').onclick=()=>{const t=$('#filterType').value,pf=$('#filterProfile').value;S.selected=items().filter(o=>(t==='all'||(t==='profile'?o.kind==='profile':o.kind===t))&&(pf==='all'||o.profile===pf)).map(o=>o.id);render();panel();$('#selectionLabel').textContent=S.selected.length+' elemento(s) selecionado(s) pelo filtro.'};$$('[data-pick2]').forEach(b=>b.onclick=()=>select(item(b.dataset.pick2),S.multi))}
  if(S.tab==='profiles'){el.innerHTML=`<div class="card"><h3>Perfis LSF</h3><p>Perfis representados por secções abertas C e U, com alma, abas e lábios no modelo 3D.</p><div class="profile-gallery"><figure><img src="assets/lsf-profile-c.svg" alt="Perfil C"><figcaption>Montante C</figcaption></figure><figure><img src="assets/lsf-profile-u.svg" alt="Perfil U"><figcaption>Guia U</figcaption></figure><figure><img src="assets/lsf-profile-l.svg" alt="Perfil L"><figcaption>Cantoneira L</figcaption></figure></div><div class="field"><label>Montante</label><select id="stud"><option>C90x40x0.95</option><option>C100x40x0.95</option><option>C140x40x1.20</option><option>C150x50x1.50</option><option>C200x50x1.50</option><option>C300x50x2.00</option></select></div><div class="field"><label>Guia</label><select id="track"><option>U90x40x0.95</option><option>U100x40x0.95</option><option>U140x40x1.20</option><option>U150x50x1.50</option><option>U200x50x1.50</option><option>U300x50x2.00</option></select></div><button class="btn green" id="applyProfiles">Aplicar à seleção</button></div>`;$('#applyProfiles').onclick=()=>{const a=$('#stud').value,b=$('#track').value;S.selected.map(item).filter(x=>x?.kind==='profile').forEach(x=>x.profile=x.type==='Montante'?a:b);render();panel();toast('Perfis aplicados.')}}
  if(S.tab==='geo'){el.innerHTML=`<div class="card"><h3>Geolocalização</h3><p>Planeie o terreno por rua, número, código postal e localidade.</p><div class="field"><label>Rua e número</label><input placeholder="Rua das Acácias, 123"></div><div class="field"><label>Código postal</label><input placeholder="3080-123"></div><div class="field"><label>Localidade</label><input placeholder="Figueira da Foz"></div><button class="btn green" id="saveGeo">Guardar localização</button></div>`;$('#saveGeo').onclick=()=>toast('Localização guardada no projeto.')}
  if(S.tab==='csv'){el.innerHTML=`<div class="card"><h3>CSV de fabrico</h3><p>Exporta a lista de perfis LSF individuais e comprimentos.</p><button class="btn green" id="panelCSV">Gerar CSV de fabrico</button></div>`;$('#panelCSV').onclick=exportCSV}
}
function fit(){S.cam={yaw:-.72,pitch:.58,zoom:1,panX:0,panY:0};render();toast('Vista ajustada ao modelo.')}
function setMode(m){S.mode=m;$('#b2').classList.toggle('active',m==='2d');$('#b3').classList.toggle('active',m==='3d');$('#badge').textContent=m==='2d'?'Vista 2D — Planta':'Vista 3D — Desenho em planos';render()}
function init(){
  svg.setAttribute('viewBox','0 0 1200 760');
  $$('.tool[data-tool],.side[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
  $$('#toolstrip .tool').forEach(()=>{});
  $('#genLSF').onclick=generateLSF;$('#genCSV').onclick=exportCSV;$('#fitView').onclick=fit;
  $('#b2').onclick=()=>setMode('2d');$('#b3').onclick=()=>setMode('3d');$('#toggleMode').onclick=()=>setMode(S.mode==='2d'?'3d':'2d');
  $$('[data-plane]').forEach(b=>b.onclick=()=>setPlane(b.dataset.plane));$('#planeOffset').oninput=e=>{S.planeOffset=Number(e.target.value)||0;render()};
  $$('.tab').forEach(b=>b.onclick=()=>{$$('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');S.tab=b.dataset.tab;panel()});
  $$('[data-layer]').forEach(b=>b.onchange=()=>{S.layers[b.dataset.layer]=b.checked;render()});
  $('#togglePanel').onclick=()=>$('#rightpanel').classList.toggle('hidden');$('#closePanel').onclick=()=>$('#rightpanel').classList.add('hidden');
  $('#mainMenu').onclick=e=>{const b=e.target.closest('button');if(!b)return;const a=b.dataset.action;if(a==='new'){if(confirm('Criar um projeto novo?')){S.shapes=[];S.profiles=[];S.selected=[];render();panel()}}else if(a==='export')exportCSV();else if(a==='print')window.print();else toast('Função preparada: '+b.textContent)};
  svg.addEventListener('pointerdown',start);svg.addEventListener('pointermove',move);svg.addEventListener('pointerup',end);svg.addEventListener('wheel',e=>{if(S.mode==='3d'){e.preventDefault();S.cam.zoom=Math.max(.25,Math.min(3,S.cam.zoom*(e.deltaY<0?1.12:.89)));render()}},{passive:false});
  window.addEventListener('keydown',e=>{if(e.key==='Escape'){S.draft=null;S.polygon=[];S.drag=null;render()}if(e.key==='Enter'&&S.polygon.length>=3){finish({kind:'polygon',plane:S.activePlane,offset:S.planeOffset,points:[...S.polygon]});S.polygon=[]}if((e.key==='Delete'||e.key==='Backspace')&&document.activeElement.tagName!=='INPUT')removeSelected()});
  // Demo 3D base volume
  const demo={kind:'rect',plane:'XY',offset:0,u1:-2.8,v1:-1.6,u2:2.8,v2:1.6,height:2.7};finish(demo);S.selected=[demo.id];setTool('select');render();panel();
}
init();
})();