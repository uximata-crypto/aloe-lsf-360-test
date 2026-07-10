(() => {
'use strict';
const svg=document.getElementById('board'), $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)], NS='http://www.w3.org/2000/svg';
const SCALE=70, ORIGIN={x:600,y:430};
const S={tool:'select',mode:'2d',tab:'entity',shapes:[],profiles:[],selected:[],draft:null,polygon:[],next:1,multi:false,layers:{image:true,architecture:true,lsf:true,labels:true,terrain:true},cam:{yaw:-0.72,pitch:0.56,zoom:1,panX:0,panY:0},drag:null,view2d:{panX:0,panY:0},image:null,calibration:null,calc:{spacing:0.60,studProfile:'C90x40x0.95',trackProfile:'U90x40x0.95',height:2.70,wind:0.50,dead:0.40,live:0.75,steel:'S280GD Z275',externalWall:0.150,internalWall:0.100,profileDims:{C:{web:90,flange:40,lip:12,thickness:0.95,kgm:1.35},U:{web:90,flange:40,lip:0,thickness:0.95,kgm:1.15}},results:null,signed:{engineer:'Joaquim Diniz',title:'Engenheiro Civil',orderNo:'',insurance:'',verificationCode:'',client:'Jorge Simões',workLocation:'Granja do Ulmeiro',process:'PJD012',date:'Jun.2026',projectName:'Bungalow T2 em LSF',scale:'1/100',length:10.00,width:7.00,wallHeight:2.36,roofRise:1.25,totalHeight:3.61,roofType:'Cobertura de duas águas',structuralSystem:'LSF — Light Steel Framing',steel:'S280GD/S350GD galvanizado, a confirmar por ficha técnica',notes:'Dossier técnico para validação e assinatura do engenheiro responsável.'}}};
function uid(p='O'){return p+(S.next++).toString().padStart(3,'0')}
function n(v,d=2){return Number(v||0).toFixed(d)}
function el(t,a={}){const e=document.createElementNS(NS,t);Object.entries(a).forEach(([k,v])=>e.setAttribute(k,v));return e}
function clear(){while(svg.firstChild)svg.removeChild(svg.firstChild)}
function msg(m){const t=$('#toast');t.textContent=m;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),2400)}
function item(id){return S.shapes.find(x=>x.id===id)||S.profiles.find(x=>x.id===id)}
function items(){return [...S.shapes,...S.profiles]}
function toolName(t){return({select:'Selecionar',line:'Linha',rect:'Retângulo',circle:'Círculo',polygon:'Polígono',push:'Empurrar/Puxar',pan:'Mão / mover tela',move:'Mover',orbit:'Órbita',delete:'Apagar',calibrate:'Calibrar por 2 pontos'})[t]||t}
function shapeName(k){return({line:'Linha',rect:'Retângulo',circle:'Círculo',polygon:'Polígono',profile:'Perfil LSF'})[k]||k}
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
function addText(P,text,selected=false){if(!S.layers.labels)return;const p=S.mode==='2d'?world2D(P):project(P);const t=el('text',{x:p.x+7,y:p.y-7,class:'label'+(selected?' selected':'')});t.textContent=text;svg.append(t)}
function addPoly(points,cls,id){const e=el('polygon',{points:points.map(p=>p.x+','+p.y).join(' '),class:cls,'data-id':id||''});svg.append(e);return e}
function addLine(a,b,cls,id){const e=el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:cls,'data-id':id||''});svg.append(e);return e}
function grid2D(){for(let x=0;x<=1200;x+=44)svg.append(el('line',{x1:x,y1:0,x2:x,y2:760,class:'grid-line'}));for(let y=0;y<=760;y+=44)svg.append(el('line',{x1:0,y1:y,x2:1200,y2:y,class:'grid-line'}));svg.append(el('line',{x1:ORIGIN.x,y1:0,x2:ORIGIN.x,y2:760,class:'axis-x'}));svg.append(el('line',{x1:0,y1:ORIGIN.y,x2:1200,y2:ORIGIN.y,class:'axis-y'}))}
function grid3D(){if(!S.layers.terrain)return;svg.append(el('rect',{x:0,y:0,width:1200,height:385,fill:'#bce4f1'}));svg.append(el('rect',{x:0,y:385,width:1200,height:375,fill:'#bfd9ad'}));for(let i=-10;i<=10;i++){addLine(project({x:-10,y:i,z:0}),project({x:10,y:i,z:0}),'grid-line','');addLine(project({x:i,y:-10,z:0}),project({x:i,y:10,z:0}),'grid-line','')}addLine(project({x:-6,y:0,z:0}),project({x:6,y:0,z:0}),'axis-x','');addLine(project({x:0,y:-6,z:0}),project({x:0,y:6,z:0}),'axis-y','');addLine(project({x:0,y:0,z:0}),project({x:0,y:0,z:4}),'axis-z','')}
function renderImage(){if(!S.image||!S.layers.image||S.mode!=='2d')return;const x=ORIGIN.x+S.view2d.panX+S.image.x*SCALE,y=ORIGIN.y+S.view2d.panY-S.image.y*SCALE,w=S.image.w*S.image.scale,h=S.image.h*S.image.scale;svg.append(el('image',{href:S.image.src,x,y,width:w,height:h,class:'imported-image'}));if(S.calibration?.points?.length){const pts=S.calibration.points.map(world2D);if(pts.length===2)addLine(pts[0],pts[1],'calib-line','');pts.forEach(p=>svg.append(el('circle',{cx:p.x,cy:p.y,r:7,class:'calib-point'})))}}
function drawShape2D(s,preview=false){const sel=S.selected.includes(s.id),cls=preview?'shape-preview':('shape-base'+(sel?' selected':''));if(s.kind==='line'){addLine(world2D(s.a),world2D(s.b),sel?'edge selected':'edge',s.id);return}addPoly(pointsOf(s).map(world2D),cls,s.id);if(!preview)addText(centroid(pointsOf(s)),s.name,sel)}
function facesOf(s){const base=pointsOf(s),h=s.height||0;if(!isClosed(s)||h<=0.001)return[];const top=base.map(p=>({...p,z:h})),faces=[];for(let i=0;i<base.length;i++){const j=(i+1)%base.length;faces.push({type:'side',pts:[base[i],base[j],top[j],top[i]]})}faces.push({type:'top',pts:top});return faces}
function avgDepth(f){return f.pts.reduce((a,p)=>a+project(p).depth,0)/f.pts.length}
function drawShape3D(s,preview=false){const sel=S.selected.includes(s.id);if(s.kind==='line'){addLine(project(s.a),project(s.b),sel?'edge selected':'edge',s.id);return}if(!s.height||s.height<=0.001){addPoly(pointsOf(s).map(project),preview?'shape-preview':('shape-base'+(sel?' selected':'')),s.id);if(!preview)addText(centroid(pointsOf(s)),s.name,sel);return}facesOf(s).sort((a,b)=>avgDepth(a)-avgDepth(b)).forEach(f=>addPoly(f.pts.map(project),'face '+(f.type==='top'?'top':'side')+(sel?' selected':''),s.id));addText({...centroid(pointsOf(s)),z:s.height},s.name+' · '+n(s.height)+' m',sel)}
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
    S.image={src,x:-3.4,y:2.5,w:Math.min(720,viewport.width),h:Math.min(520,viewport.height),scale:1,source:'PDF página 1'};
    setMode('2d');msg('PDF importado como imagem de fundo. Calibre a escala por dois pontos.');panel();render();
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
      imported.forEach(s=>{s.id=uid('D');s.name='DXF '+(S.shapes.length+1);s.height=0;S.shapes.push(s)});
      setMode('2d');render();panel();msg(imported.length+' entidades DXF importadas. Calibre/ajuste escala se necessário.');
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
function groupRuns(values,threshold,minWidth=1){
  const groups=[];let start=-1;
  for(let i=0;i<values.length;i++){
    if(values[i]>=threshold){if(start<0)start=i}
    else if(start>=0){if(i-start>=minWidth)groups.push({a:start,b:i-1,mid:(start+i-1)/2,max:Math.max(...values.slice(start,i))});start=-1}
  }
  if(start>=0&&values.length-start>=minWidth)groups.push({a:start,b:values.length-1,mid:(start+values.length-1)/2,max:Math.max(...values.slice(start))});
  return groups;
}
function getDarkMap(canvas){
  const ctx=canvas.getContext('2d'), w=canvas.width, h=canvas.height, data=ctx.getImageData(0,0,w,h).data;
  const dark=new Uint8Array(w*h);
  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++){
      const i=(y*w+x)*4, r=data[i],g=data[i+1],b=data[i+2],a=data[i+3];
      const gray=(r+g+b)/3;
      if(a>20 && gray<115)dark[y*w+x]=1;
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
function detectWallSegments(map,box,widthM,heightM){
  const {dark,w,h}=map;
  const x1=Math.max(0,Math.floor(box.x1)),x2=Math.min(w-1,Math.ceil(box.x2));
  const y1=Math.max(0,Math.floor(box.y1)),y2=Math.min(h-1,Math.ceil(box.y2));
  const bw=x2-x1,bh=y2-y1;
  const col=new Array(bw).fill(0), row=new Array(bh).fill(0);
  for(let y=y1;y<=y2;y++){
    for(let x=x1;x<=x2;x++){
      if(dark[y*w+x]){col[x-x1]++;row[y-y1]++}
    }
  }
  const vGroups=groupRuns(col,bh*0.09,2).filter(g=>g.max>bh*0.14);
  const hGroups=groupRuns(row,bw*0.09,2).filter(g=>g.max>bw*0.14);
  const segs=[];
  function pxToWorld(px,py){
    return {x:(px-x1)/bw*widthM-widthM/2, y:heightM/2-(py-y1)/bh*heightM, z:0};
  }
  vGroups.forEach(g=>{
    const x=Math.round(x1+g.mid), bandA=Math.max(x1,Math.floor(x1+g.a-2)), bandB=Math.min(x2,Math.ceil(x1+g.b+2));
    let start=-1;
    for(let y=y1;y<=y2;y++){
      let cnt=0;for(let xx=bandA;xx<=bandB;xx++)cnt+=dark[y*w+xx];
      if(cnt>=Math.max(1,(bandB-bandA+1)*0.25)){if(start<0)start=y}
      else if(start>=0){if(y-start>bh*0.08){const a=pxToWorld(x,start),b=pxToWorld(x,y-1);segs.push({a,b})}start=-1}
    }
    if(start>=0&&y2-start>bh*0.08){const a=pxToWorld(x,start),b=pxToWorld(x,y2);segs.push({a,b})}
  });
  hGroups.forEach(g=>{
    const y=Math.round(y1+g.mid), bandA=Math.max(y1,Math.floor(y1+g.a-2)), bandB=Math.min(y2,Math.ceil(y1+g.b+2));
    let start=-1;
    for(let x=x1;x<=x2;x++){
      let cnt=0;for(let yy=bandA;yy<=bandB;yy++)cnt+=dark[yy*w+x];
      if(cnt>=Math.max(1,(bandB-bandA+1)*0.25)){if(start<0)start=x}
      else if(start>=0){if(x-start>bw*0.08){const a=pxToWorld(start,y),b=pxToWorld(x-1,y);segs.push({a,b})}start=-1}
    }
    if(start>=0&&x2-start>bw*0.08){const a=pxToWorld(start,y),b=pxToWorld(x2,y);segs.push({a,b})}
  });
  // remove tiny/duplicate segments
  const clean=[];
  segs.forEach(s=>{
    const L=Math.hypot(s.b.x-s.a.x,s.b.y-s.a.y);
    if(L<0.75)return;
    const key=[n(s.a.x,1),n(s.a.y,1),n(s.b.x,1),n(s.b.y,1)].join('|');
    if(!clean.some(c=>c.key===key))clean.push({...s,key});
  });
  return clean.slice(0,80);
}
async function detectDimensionsOCR(){
  if(!S.image || !window.Tesseract)return {};
  try{
    msg(S.image?.calibrated?'Escala manual já definida. A detetar paredes...':'A ler cotas da planta com OCR...');
    const res=await Tesseract.recognize(S.image.src,'eng',{logger:m=>{}});
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
    const im=await loadImageElement(S.image.src);
    const maxW=1400, scale=Math.min(1,maxW/im.width);
    const canvas=document.createElement('canvas');
    canvas.width=Math.round(im.width*scale);canvas.height=Math.round(im.height*scale);
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(im,0,0,canvas.width,canvas.height);
    const map=getDarkMap(canvas);
    const box=detectBuildingBox(map);
    let dims=await detectDimensionsOCR();
    const manualDims=dimensionsFromManualCalibration(box,canvas);
    let widthM=manualDims?manualDims.widthM:(Number(dims.width)||0);
    let heightM=manualDims?manualDims.heightM:(Number(dims.height)||0);
    if(manualDims){
      // A escala manual manda. Só perguntamos se quiser corrigir visualmente o retângulo exterior.
      const ok=confirm('Escala por 2 pontos aplicada. Dimensão exterior estimada: '+n(widthM)+' x '+n(heightM)+' m.\n\nUsar esta dimensão?');
      if(!ok){
        widthM=Number(prompt('Largura exterior correta em metros:', n(widthM)))||widthM;
        heightM=Number(prompt('Profundidade exterior correta em metros:', n(heightM)))||heightM;
      }
    } else if(!widthM || !heightM || Math.abs(widthM-heightM)<0.01){
      widthM=Number(prompt('Largura exterior da planta em metros:', widthM||'10.00'))||10;
      heightM=Number(prompt('Profundidade exterior em metros:', heightM||'7.00'))||7;
    }
    // Remove previous auto-detected lines and rectangle
    S.shapes=S.shapes.filter(s=>!s.autoDetected);
    const rect={kind:'rect',a:{x:-widthM/2,y:-heightM/2,z:0},b:{x:widthM/2,y:heightM/2,z:0},height:Number(S.calc?.height)||2.7,wallType:'exterior',thickness:Number(S.calc.externalWall)||0.150,autoDetected:true};
    rect.id=uid('A');rect.name='Planta exterior auto '+n(widthM)+'x'+n(heightM)+' m';
    S.shapes.push(rect);
    let segs=detectWallSegments(map,box,widthM,heightM);segs=segs.filter(s=>Math.hypot(s.b.x-s.a.x,s.b.y-s.a.y)<=Math.max(widthM,heightM)*1.05).slice(0,45);
    segs.forEach((s,i)=>{
      const wt=classifySegmentWall(s.a,s.b,-1);const line={kind:'line',a:s.a,b:s.b,height:0,wallType:wt,thickness:wallThickness(wt),autoDetected:true,imported:true};
      line.id=uid('W');line.name='Parede auto '+(i+1);
      S.shapes.push(line);
    });
    S.selected=S.shapes.filter(s=>s.autoDetected).map(s=>s.id);
    setMode('2d');render();panel();
    msg('Desenho detetado pela escala 2 pontos: '+n(widthM)+' x '+n(heightM)+' m, '+segs.length+' linhas de parede.');
  }catch(e){
    console.error(e);
    msg('Não foi possível detetar automaticamente. Use calibrar por dois pontos.');
  }
}

function importImage(file){if(!file)return;const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{S.image={src:r.result,x:-3.4,y:2.5,w:Math.min(620,img.width),h:Math.min(430,img.height),scale:1};setMode('2d');msg('Imagem importada. Use Calibrar por 2 pontos.');panel();render()};img.src=r.result};r.readAsDataURL(file)}
function startCalib(){if(!S.image)return msg('Importe primeiro uma imagem.');S.calibration={points:[]};setTool('calibrate');msg('Clique em dois pontos conhecidos na imagem.')}
function calibClick(w){if(!S.calibration)return;S.calibration.points.push(w);if(S.calibration.points.length===2){render();const meters=Number(prompt('Distância real entre os pontos, em metros:', '5.00'));if(meters>0){const [a,b]=S.calibration.points,cur=Math.hypot(b.x-a.x,b.y-a.y);if(cur>0.001){S.image.calibrated=true;S.image.calibrationMeters=meters;S.image.calibrationWorldDistance=cur;S.image.calibrationPoints=[a,b];S.image.calibrationDirection=Math.abs(b.x-a.x)>=Math.abs(b.y-a.y)?'horizontal':'vertical';msg('Escala definida por 2 pontos: '+n(meters)+' m. O Auto desenho vai usar esta medida.')}}S.calibration=null;setTool('select');render();panel()}else{render();msg('Clique no segundo ponto conhecido.')}}
function saveProject(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(S,null,2)],{type:'application/json'}));a.download='aloe_lsf360_projeto.json';a.click()}
function openProject(file){if(!file)return;const r=new FileReader();r.onload=()=>{try{Object.assign(S,JSON.parse(r.result));render();panel();msg('Projeto aberto.')}catch{msg('Ficheiro inválido.')}};r.readAsText(file)}
function lineLength(o){return Math.hypot((o.b.x-o.a.x),(o.b.y-o.a.y),(o.b.z||0)-(o.a.z||0))}
function generateProfilesForSegment(a,b,panel,kStart,height,spacing,wallType='exterior',thickness=0.150,studProfile=S.calc.studProfile,trackProfile=S.calc.trackProfile,studDims=null,trackDims=null){
  const out=[];let k=kStart;
  out.push({id:uid('U'),kind:'profile',type:'Guia inferior',profile:trackProfile,name:panel+'-U'+k++,panel,wallType,thickness,profileDims:trackDims||defaultProfileDims(trackProfile),a:{...a,z:0},b:{...b,z:0}});
  out.push({id:uid('U'),kind:'profile',type:'Guia superior',profile:trackProfile,name:panel+'-U'+k++,panel,wallType,thickness,profileDims:trackDims||defaultProfileDims(trackProfile),a:{...a,z:height},b:{...b,z:height}});
  const L=Math.hypot(b.x-a.x,b.y-a.y), nStuds=Math.max(2,Math.floor(L/spacing)+1);
  for(let j=0;j<nStuds;j++){
    const t=j/(nStuds-1);
    const p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:0};
    out.push({id:uid('C'),kind:'profile',type:'Montante',profile:studProfile,name:panel+'-M'+k++,panel,wallType,thickness,profileDims:studDims||defaultProfileDims(studProfile),a:p,b:{...p,z:height}});
  }
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
  if(closed.length){
    closed.forEach((s,si)=>{
      if(!s.height||s.height<0.1)s.height=height;
      const base=pointsOf(s), panel='P'+String(si+1).padStart(2,'0');
      for(let i=0;i<base.length;i++){
        const a=base[i], b=base[(i+1)%base.length];
        const wt=s.wallType||classifySegmentWall(a,b,si);const h=wallHeightOf(s);s.height=h;const sp=wallSpacingOf(s);const th=Number(s.thickness)||wallThickness(wt);const r=generateProfilesForSegment(a,b,panel,k,h,sp,wt,th,wallStudProfileOf(s),wallTrackProfileOf(s),wallStudDimsOf(s),wallTrackDimsOf(s));
        S.profiles.push(...r.profiles); k=r.next;
      }
    });
    setMode('3d');panel();msg(S.profiles.length+' perfis LSF gerados a partir de volumes fechados.');return;
  }

  // Fallback importante: linhas importadas de DXF ou desenhadas em planta geram paredes lineares.
  const selectedLines=S.selected.map(item).filter(o=>o&&o.kind==='line');
  const lines=(selectedLines.length?selectedLines:S.shapes.filter(o=>o.kind==='line'));
  if(lines.length){
    lines.forEach((ln,idx)=>{
      const panel='L'+String(idx+1).padStart(2,'0');
      const wt=ln.wallType||classifySegmentWall(ln.a,ln.b,-1);ln.wallType=wt;ln.thickness=Number(ln.thickness)||wallThickness(wt);const h=wallHeightOf(ln);const sp=wallSpacingOf(ln);const r=generateProfilesForSegment(ln.a,ln.b,panel,k,h,sp,wt,ln.thickness,wallStudProfileOf(ln),wallTrackProfileOf(ln),wallStudDimsOf(ln),wallTrackDimsOf(ln));
      S.profiles.push(...r.profiles); k=r.next;
    });
    setMode('3d');panel();msg(S.profiles.length+' perfis LSF gerados a partir das linhas/DXF.');return;
  }

  msg('Desenhe uma forma fechada ou importe/desenhe linhas para gerar LSF.');
}
function runCalc(){
  const panels=S.shapes.filter(isClosed);
  const lines=S.shapes.filter(o=>o.kind==='line');
  let areaTotal=0, wallLength=0, externalLength=0, internalLength=0, studs=0, tracks=0, source='';

  if(S.profiles.length){
    S.profiles.forEach(p=>{
      if(p.type==='Montante')studs++;
      if(p.type&&p.type.startsWith('Guia'))tracks++;
    });
    const trackLen=S.profiles.filter(p=>p.type&&p.type.startsWith('Guia')).reduce((a,p)=>a+lineLength(p),0);
    wallLength=trackLen/2;externalLength=S.profiles.filter(p=>p.wallType==='exterior'&&p.type&&p.type.startsWith('Guia')).reduce((a,p)=>a+lineLength(p),0)/2;internalLength=S.profiles.filter(p=>p.wallType!=='exterior'&&p.type&&p.type.startsWith('Guia')).reduce((a,p)=>a+lineLength(p),0)/2;
    source='perfis LSF gerados';
  } else if(panels.length){
    panels.forEach((s,i)=>{areaTotal+=area(s);wallLength+=perimeter(s);if((s.wallType||classifySegmentWall(pointsOf(s)[0],pointsOf(s)[1],i))==='exterior')externalLength+=perimeter(s);else internalLength+=perimeter(s);});
    source='volumes/painéis fechados';
  } else if(lines.length){
    wallLength=lines.reduce((a,l)=>a+lineLength(l),0);externalLength=lines.filter(l=>(l.wallType||classifySegmentWall(l.a,l.b,-1))==='exterior').reduce((a,l)=>a+lineLength(l),0);internalLength=wallLength-externalLength;
    source='linhas/DXF importadas';
  }

  const spacing=Number(S.calc.spacing)||0.6, height=Number(S.calc.height)||2.7;
  const wind=Number(S.calc.wind)||0.5, load=(Number(S.calc.dead)||0)+(Number(S.calc.live)||0);

  if(!studs){const ls=S.shapes.filter(o=>o.kind==='line');studs=ls.length?ls.reduce((a,l)=>a+Math.max(2,Math.floor(lineLength(l)/wallSpacingOf(l))+1),0):(Math.ceil(wallLength/spacing)+Math.max(0,Math.ceil(wallLength>0?1:0)));}
  if(!tracks) tracks=wallLength>0?Math.max(2,Math.ceil(wallLength/3)*2):0;
  const linStud=studs*height;
  const linTrack=wallLength*2;
  const mass=S.profiles.length?S.profiles.reduce((a,p)=>a+lineLength(p)*(Number(profileDimsOf(p).kgm)||1.25),0):(linStud*1.35+linTrack*1.15);
  const warn=[];
  if(wallLength<=0)warn.push('Não existem paredes/linhas/volumes para calcular.');
  if(spacing>0.6)warn.push('Espaçamento superior a 600 mm: rever estabilidade e placas.');
  if(height>3.0)warn.push('Altura superior a 3,00 m: verificar flambagem e reforços.');
  if(wind>0.75)warn.push('Pressão de vento elevada: exigir verificação estrutural detalhada.');
  if(!S.profiles.length && wallLength>0)warn.push('Pré-cálculo feito sem perfis gerados. Clique em Gerar LSF para criar peças individuais.');

  S.calc.results={source,panels:panels.length,lines:lines.length,areaTotal,wallLength,externalLength,internalLength,externalWall:Number(S.calc.externalWall)||0.150,internalWall:Number(S.calc.internalWall)||0.100,studs,tracks,linStud,linTrack,mass,load,wind,warn};
  S.tab='structure';$$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab==='structure'));panel();
  msg(wallLength>0?'Pré-cálculo estrutural gerado.':'Não há elementos para calcular.');
}
function exportCSV(){
  const rows=[['PROJETO','PAINEL','REFERENCIA','TIPO','TIPO_PAREDE','LARGURA_PAREDE_MM','PERFIL','ALMA_MM','ABA_MM','LABIO_MM','ESPESSURA_MM','KG_M','COMPRIMENTO_MM','OBS']];
  if(S.profiles.length){
    S.profiles.forEach(p=>{const d=profileDimsOf(p);rows.push(['Aloe LSF 360',p.panel,p.name,p.type,p.wallType||'interior',((p.thickness||wallThickness(p.wallType))*1000).toFixed(0),p.profile,d.web,d.flange,d.lip,d.thickness,d.kgm,(lineLength(p)*1000).toFixed(1),'Perfil LSF individual selecionável']);});
  } else {
    const closed=S.shapes.filter(isClosed);
    const lines=S.shapes.filter(o=>o.kind==='line');
    if(closed.length) closed.forEach((s,i)=>rows.push(['Aloe LSF 360','P'+(i+1),s.name,shapeName(s.kind),s.wallType||'exterior',((s.thickness||wallThickness(s.wallType||'exterior'))*1000).toFixed(0),'—','','','','','','',((s.height||0)*1000).toFixed(1),'Volume/base para estrutura']));
    if(lines.length) lines.forEach((l,i)=>rows.push(['Aloe LSF 360','L'+(i+1),l.name||('Linha '+(i+1)),'Linha/DXF',l.wallType||classifySegmentWall(l.a,l.b,-1),((l.thickness||wallThickness(l.wallType||classifySegmentWall(l.a,l.b,-1)))*1000).toFixed(0),'—','','','','','','',(lineLength(l)*1000).toFixed(1),'Linha usada como eixo de parede; altura '+n(wallHeightOf(l))+' m; espaçamento '+n(wallSpacingOf(l))+' m']));
  }
  if(S.calc.results){
    rows.push([]);
    rows.push(['PRE-CALCULO','','Origem',S.calc.results.source,'—','—','—','—','Estimativo']);
    rows.push(['PRE-CALCULO','','Comprimento paredes','m','total','—','—',n(S.calc.results.wallLength),'Estimativo']);rows.push(['PRE-CALCULO','','Paredes exteriores','m','exterior',((S.calc.results.externalWall||S.calc.externalWall)*1000).toFixed(0),'—',n(S.calc.results.externalLength),'Estimativo']);rows.push(['PRE-CALCULO','','Paredes interiores','m','interior',((S.calc.results.internalWall||S.calc.internalWall)*1000).toFixed(0),'—',n(S.calc.results.internalLength),'Estimativo']);
    rows.push(['PRE-CALCULO','','Montantes','un','—','—',S.calc.studProfile,S.calc.results.studs,'Estimativo']);
    rows.push(['PRE-CALCULO','','Guias','un','—','—',S.calc.trackProfile,S.calc.results.tracks,'Estimativo']);
    rows.push(['PRE-CALCULO','','Massa estimada','kg','—','—','—',n(S.calc.results.mass),'Indicativo']);
  }
  if(rows.length===1)return msg('Sem dados para CSV.');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n')],{type:'text/csv;charset=utf-8'}));
  a.download='aloe_lsf360_fabrico.csv';a.click();msg('CSV gerado.');
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

function panel(){const p=$('#panelBody'),sel=S.selected.map(item).filter(Boolean);if(S.tab==='entity'){p.innerHTML=`<div class="card"><h3>Propriedades</h3>${sel.length?`<p><b>${sel.length} elemento(s) selecionado(s)</b></p><p>Referência: ${sel[0].name}</p><p>Tipo: ${sel[0].kind==='profile'?sel[0].type:shapeName(sel[0].kind)}</p><p>Perfil: ${sel[0].profile||'—'}</p><p>Tipo de parede: ${sel[0].wallType||'—'} · largura: ${sel[0].thickness?((sel[0].thickness*1000).toFixed(0)+' mm'):'—'}</p><p>Altura personalizada: ${wallHeightOf(sel[0])} m · Espaçamento: ${wallSpacingOf(sel[0])} m</p><p>Perfis: ${wallStudProfileOf(sel[0])} / ${wallTrackProfileOf(sel[0])}</p><p>Medidas perfil: alma ${profileDimsOf(sel[0]).web} mm · aba ${profileDimsOf(sel[0]).flange} mm · lábio ${profileDimsOf(sel[0]).lip} mm · esp. ${profileDimsOf(sel[0]).thickness} mm</p><p>Altura: ${sel[0].height?n(sel[0].height)+' m':'—'}</p>`:'<p>Selecione um objeto no desenho ou na lista.</p>'}</div><div class="card"><h3>Objetos do projeto</h3><div class="list">${items().map(o=>`<div class="row ${S.selected.includes(o.id)?'active':''}"><div><b>${o.name}</b><small>${o.kind==='profile'?o.type:shapeName(o.kind)} · ${o.wallType||'—'} · ${o.thickness?((o.thickness*1000).toFixed(0)+' mm'):''} · ${o.profile||'—'}</small></div><button data-pick="${o.id}">Selecionar</button></div>`).join('')||'<p>Nenhum objeto criado.</p>'}</div></div>`;$$('[data-pick]').forEach(b=>b.onclick=()=>select(item(b.dataset.pick),S.multi))}
if(S.tab==='image'){p.innerHTML=`<div class="card"><h3>Importar imagem / PDF / DXF / DWG</h3><p>Importa imagem, PDF ou DXF. DWG é indicado para conversão, pois o navegador não lê DWG nativo. Depois calibre a escala e desenhe por cima.</p><div class="btns"><button class="btn green" id="importImg">Importar imagem</button><button class="btn" id="calibImg">Calibrar por 2 pontos</button><button class="btn" id="autoImg">Auto desenho</button></div>${S.image?`<p><b>Imagem carregada.</b> ${S.image.calibrated?'Escala definida por 2 pontos.':'Ainda sem calibração manual.'} Escala visual: ${n(S.image.scale,3)}</p>`:'<p>Nenhuma imagem carregada.</p>'}</div><div class="card"><h3>Fluxo</h3><p>1. Importar imagem/PDF<br>2. Calibrar por 2 pontos com medida real<br>3. Usar Auto desenho ou desenhar manualmente<br>4. Gerar LSF<br>5. Selecionar perfis<br>6. Pré-cálculo<br>7. CSV</p></div>`;$('#importImg').onclick=()=>$('#imageInput').click();$('#calibImg').onclick=startCalib;$('#autoImg').onclick=autoDetectScaleAndDrawing}
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
  p.innerHTML=`<div class="card"><h3>Personalizar medidas das paredes</h3><p>Selecione uma ou várias linhas, paredes ou perfis e aplique medidas próprias.</p><div class="field"><label>Tipo de parede</label><select id="wallTypeEdit"><option value="exterior">Exterior</option><option value="interior">Interior</option></select></div><div class="wall-editor-grid"><div class="field"><label>Largura / espessura (m)</label><input id="wallThicknessEdit" type="number" step="0.01" value="${first.thickness||wallThickness(first.wallType||'exterior')}"></div><div class="field"><label>Altura da parede (m)</label><input id="wallHeightEdit" type="number" step="0.05" value="${wallHeightOf(first)}"></div><div class="field"><label>Espaçamento montantes (m)</label><input id="wallSpacingEdit" type="number" step="0.05" value="${wallSpacingOf(first)}"></div><div class="field"><label>N.º selecionados</label><input readonly value="${selected.length}"></div></div><div class="field"><label>Perfil montante</label><select id="wallStudEdit"><option>C90x40x0.95</option><option>C100x40x0.95</option><option>C140x40x1.20</option><option>C200x50x1.50</option><option>C300x50x2.00</option></select></div><div class="field"><label>Perfil guia</label><select id="wallTrackEdit"><option>U90x40x0.95</option><option>U100x40x0.95</option><option>U140x40x1.20</option><option>U200x50x1.50</option><option>U300x50x2.00</option></select></div><div class="btns"><button class="btn green" id="applyWallMeasures">Aplicar medidas à seleção</button><button class="btn" id="selectExteriorWalls">Selecionar exteriores</button><button class="btn" id="selectInteriorWalls">Selecionar interiores</button></div><div class="wall-editor-note">Depois de aplicar medidas, clique novamente em <b>Gerar LSF</b> para reconstruir os perfis com as novas dimensões.</div></div><div class="card"><h3>Paredes/linhas selecionáveis</h3><div class="list">${S.shapes.filter(o=>isClosed(o)||o.kind==='line').map(o=>`<div class="row ${S.selected.includes(o.id)?'active':''}"><div><b>${o.name}</b><small>${o.wallType||'—'} · ${(Number(o.thickness||wallThickness(o.wallType||'exterior'))*1000).toFixed(0)} mm · H ${n(wallHeightOf(o))} m · ${wallStudProfileOf(o)}</small></div><button data-wallpick="${o.id}">Selecionar</button></div>`).join('')||'<p>Sem paredes ou linhas.</p>'}</div></div>`;
  $('#wallTypeEdit').value=first.wallType||'exterior';
  $('#wallStudEdit').value=wallStudProfileOf(first);
  $('#wallTrackEdit').value=wallTrackProfileOf(first);
  $('#applyWallMeasures').onclick=()=>applyWallMeasuresToSelection({wallType:$('#wallTypeEdit').value,thickness:Number($('#wallThicknessEdit').value),height:Number($('#wallHeightEdit').value),spacing:Number($('#wallSpacingEdit').value),studProfile:$('#wallStudEdit').value,trackProfile:$('#wallTrackEdit').value});
  $('#selectExteriorWalls').onclick=()=>{S.selected=S.shapes.filter(o=>(isClosed(o)||o.kind==='line')&&(o.wallType||classifySegmentWall(pointsOf(o)[0],pointsOf(o)[1],S.shapes.filter(isClosed).indexOf(o)))==='exterior').map(o=>o.id);render();panel();};
  $('#selectInteriorWalls').onclick=()=>{S.selected=S.shapes.filter(o=>(isClosed(o)||o.kind==='line')&&(o.wallType||classifySegmentWall(pointsOf(o)[0],pointsOf(o)[1],S.shapes.filter(isClosed).indexOf(o)))!=='exterior').map(o=>o.id);render();panel();};
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
function bind(){svg.setAttribute('viewBox','0 0 1200 760');$$('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));$('#v2').onclick=()=>setMode('2d');$('#v3').onclick=()=>setMode('3d');$('#viewToggle').onclick=()=>setMode(S.mode==='2d'?'3d':'2d');$('#panelToggle').onclick=()=>$('#panel').classList.toggle('hidden');$('#panelClose').onclick=()=>$('#panel').classList.add('hidden');$('#lsfBtn').onclick=generateLSF;$('#calcBtn').onclick=runCalc;$('#csvBtn').onclick=exportCSV;$('#signedBtn').onclick=()=>{S.tab='signedProject';$$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab==='signedProject'));panel();};$('#calibrateBtn').onclick=startCalib;$('#autoDetectBtn').onclick=autoDetectScaleAndDrawing;$('#fitBtn').onclick=()=>{S.cam={yaw:-0.72,pitch:0.56,zoom:1,panX:0,panY:0};S.view2d={panX:0,panY:0};render();msg('Vista ajustada.')};$$('.tab').forEach(b=>b.onclick=()=>{$$('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');S.tab=b.dataset.tab;panel()});$$('[data-layer]').forEach(b=>b.onchange=()=>{S.layers[b.dataset.layer]=b.checked;render()});svg.addEventListener('pointerdown',pointerDown);svg.addEventListener('pointermove',pointerMove);svg.addEventListener('pointerup',pointerUp);svg.addEventListener('wheel',e=>{if(S.mode==='3d'){e.preventDefault();S.cam.zoom=Math.max(0.3,Math.min(3,S.cam.zoom*(e.deltaY<0?1.12:0.89)));render()}},{passive:false});$('#menu').onclick=e=>{const b=e.target.closest('button');if(!b)return;const a=b.dataset.action;if(a==='new'){if(confirm('Criar projeto novo?')){S.shapes=[];S.profiles=[];S.selected=[];S.image=null;S.calibration=null;S.calc.results=null;render();panel()}}else if(a==='open')$('#projectInput').click();else if(a==='save')saveProject();else if(a==='import')$('#imageInput').click();else if(a==='export')exportCSV();else if(a==='location'){S.tab='geo';$$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab==='geo'));panel()}else if(a==='print')window.print()};$('#projectInput').onchange=e=>openProject(e.target.files[0]);$('#imageInput').onchange=e=>importPlanFile(e.target.files[0]);window.addEventListener('keydown',e=>{if(e.key==='Escape'){S.draft=null;S.polygon=[];S.drag=null;S.calibration=null;render()}if(e.key==='Enter'&&S.polygon.length>=3){finish({kind:'polygon',points:[...S.polygon]});S.polygon=[]}if((e.key==='Delete'||e.key==='Backspace')&&document.activeElement.tagName!=='INPUT')removeSelected()})}
function demo(){const r={kind:'rect',a:{x:-2.4,y:-1.4,z:0},b:{x:2.4,y:1.4,z:0},height:2.7};finish(r);S.selected=[r.id];render();panel()}
bind();setTool('select');demo();
})();