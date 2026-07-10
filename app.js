(() => {
'use strict';
const svg=document.getElementById('board'), $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)], NS='http://www.w3.org/2000/svg';
const SCALE=70, ORIGIN={x:600,y:430};
const S={tool:'select',mode:'2d',tab:'entity',shapes:[],profiles:[],selected:[],draft:null,polygon:[],next:1,multi:false,layers:{image:true,architecture:true,lsf:true,labels:true,terrain:true},cam:{yaw:-0.72,pitch:0.56,zoom:1,panX:0,panY:0},drag:null,image:null,calibration:null,calc:{spacing:0.60,studProfile:'C90x40x0.95',trackProfile:'U90x40x0.95',height:2.70,wind:0.50,dead:0.40,live:0.75,steel:'S280GD Z275',results:null}};
function uid(p='O'){return p+(S.next++).toString().padStart(3,'0')}
function n(v,d=2){return Number(v||0).toFixed(d)}
function el(t,a={}){const e=document.createElementNS(NS,t);Object.entries(a).forEach(([k,v])=>e.setAttribute(k,v));return e}
function clear(){while(svg.firstChild)svg.removeChild(svg.firstChild)}
function msg(m){const t=$('#toast');t.textContent=m;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),2400)}
function item(id){return S.shapes.find(x=>x.id===id)||S.profiles.find(x=>x.id===id)}
function items(){return [...S.shapes,...S.profiles]}
function toolName(t){return({select:'Selecionar',line:'Linha',rect:'Retângulo',circle:'Círculo',polygon:'Polígono',push:'Empurrar/Puxar',move:'Mover',orbit:'Órbita',delete:'Apagar',calibrate:'Calibrar imagem'})[t]||t}
function shapeName(k){return({line:'Linha',rect:'Retângulo',circle:'Círculo',polygon:'Polígono',profile:'Perfil LSF'})[k]||k}
function isClosed(s){return ['rect','circle','polygon'].includes(s.kind)}
function screenPt(e){const r=svg.getBoundingClientRect();return{x:(e.clientX-r.left)*1200/r.width,y:(e.clientY-r.top)*760/r.height}}
function world2D(P){return{x:ORIGIN.x+P.x*SCALE,y:ORIGIN.y-P.y*SCALE}}
function screenToWorld2D(p){return{x:(p.x-ORIGIN.x)/SCALE,y:(ORIGIN.y-p.y)/SCALE,z:0}}
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
function renderImage(){if(!S.image||!S.layers.image||S.mode!=='2d')return;const x=ORIGIN.x+S.image.x*SCALE,y=ORIGIN.y-S.image.y*SCALE,w=S.image.w*S.image.scale,h=S.image.h*S.image.scale;svg.append(el('image',{href:S.image.src,x,y,width:w,height:h,class:'imported-image'}));if(S.calibration?.points?.length){const pts=S.calibration.points.map(world2D);if(pts.length===2)addLine(pts[0],pts[1],'calib-line','');pts.forEach(p=>svg.append(el('circle',{cx:p.x,cy:p.y,r:7,class:'calib-point'})))}}
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
function setTool(t){S.tool=t;$$('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===t));$('#toolLabel').textContent='Ferramenta: '+toolName(t);$('#hint').textContent=t==='push'?'Empurrar/Puxar: clique numa forma fechada e arraste para cima/baixo.':t==='calibrate'?'Calibração: clique em dois pontos conhecidos na imagem.':t==='orbit'?'Órbita: arraste em 3D. Roda do rato = zoom.':'Importe uma imagem, calibre, desenhe por cima, gere LSF, pré-calcule e exporte CSV.'}
function finish(s){s.id=uid();s.name=shapeName(s.kind)+' '+(S.shapes.length+1);s.height=s.height||0;S.shapes.push(s);S.draft=null;render();panel();msg(s.name+' fixado.')}
function pointerDown(e){const p=screenPt(e),w=snap(screenToWorld2D(p));$('#coords').textContent=`X: ${n(w.x,3)} · Y: ${n(w.y,3)} · Z: 0.000`;if(S.tool==='calibrate'){calibClick(w);return}if(S.tool==='orbit'&&S.mode==='3d'){S.drag={kind:'orbit',x:p.x,y:p.y,yaw:S.cam.yaw,pitch:S.cam.pitch};return}const it=item(idFrom(e.target));if(S.tool==='select'){select(it,e.ctrlKey||e.metaKey);return}if(S.tool==='delete'){if(it){select(it);removeSelected()}return}if(S.tool==='move'){if(!it&&!S.selected.length)return msg('Selecione primeiro um objeto.');if(it)select(it,e.ctrlKey||e.metaKey);S.drag={kind:'move',last:w};return}if(S.tool==='push'){if(!it||!isClosed(it))return msg('Selecione uma forma fechada.');select(it);if(S.mode!=='3d')setMode('3d');S.drag={kind:'push',id:it.id,startY:p.y,h:it.height||0};return}if(S.tool==='line'){S.draft={kind:'line',a:w,b:w};return}if(S.tool==='rect'){S.draft={kind:'rect',a:w,b:w};return}if(S.tool==='circle'){S.draft={kind:'circle',c:w,r:0};return}if(S.tool==='polygon'){S.polygon.push(w);render();return}}
function pointerMove(e){const p=screenPt(e),w=snap(screenToWorld2D(p));$('#coords').textContent=`X: ${n(w.x,3)} · Y: ${n(w.y,3)} · Z: 0.000`;if(S.drag?.kind==='orbit'){S.cam.yaw=S.drag.yaw+(p.x-S.drag.x)*0.010;S.cam.pitch=Math.max(-1.2,Math.min(1.2,S.drag.pitch+(p.y-S.drag.y)*0.008));render();return}if(S.drag?.kind==='push'){const it=item(S.drag.id);if(it){it.height=Math.max(0,S.drag.h+(S.drag.startY-p.y)/85);render()}return}if(S.drag?.kind==='move'){const dx=w.x-S.drag.last.x,dy=w.y-S.drag.last.y;moveSelected(dx,dy,0);S.drag.last=w;render();return}if(S.draft){if(S.draft.kind==='line')S.draft.b=w;if(S.draft.kind==='rect')S.draft.b=w;if(S.draft.kind==='circle')S.draft.r=Math.hypot(w.x-S.draft.c.x,w.y-S.draft.c.y);render()}}
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

function importImage(file){if(!file)return;const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{S.image={src:r.result,x:-3.4,y:2.5,w:Math.min(620,img.width),h:Math.min(430,img.height),scale:1};setMode('2d');msg('Imagem importada. Use Calibrar imagem.');panel();render()};img.src=r.result};r.readAsDataURL(file)}
function startCalib(){if(!S.image)return msg('Importe primeiro uma imagem.');S.calibration={points:[]};setTool('calibrate');msg('Clique em dois pontos conhecidos na imagem.')}
function calibClick(w){if(!S.calibration)return;S.calibration.points.push(w);if(S.calibration.points.length===2){render();const meters=Number(prompt('Distância real entre os pontos, em metros:', '5.00'));if(meters>0){const [a,b]=S.calibration.points,cur=Math.hypot(b.x-a.x,b.y-a.y);if(cur>0.001){S.image.scale*=meters/cur;msg('Imagem calibrada para '+n(meters)+' m.')}}S.calibration=null;setTool('select');render();panel()}else{render();msg('Clique no segundo ponto conhecido.')}}
function saveProject(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(S,null,2)],{type:'application/json'}));a.download='aloe_lsf360_projeto.json';a.click()}
function openProject(file){if(!file)return;const r=new FileReader();r.onload=()=>{try{Object.assign(S,JSON.parse(r.result));render();panel();msg('Projeto aberto.')}catch{msg('Ficheiro inválido.')}};r.readAsText(file)}
function lineLength(o){return Math.hypot((o.b.x-o.a.x),(o.b.y-o.a.y),(o.b.z||0)-(o.a.z||0))}
function generateProfilesForSegment(a,b,panel,kStart,height,spacing){
  const out=[];let k=kStart;
  out.push({id:uid('U'),kind:'profile',type:'Guia inferior',profile:S.calc.trackProfile,name:panel+'-U'+k++,panel,a:{...a,z:0},b:{...b,z:0}});
  out.push({id:uid('U'),kind:'profile',type:'Guia superior',profile:S.calc.trackProfile,name:panel+'-U'+k++,panel,a:{...a,z:height},b:{...b,z:height}});
  const L=Math.hypot(b.x-a.x,b.y-a.y), nStuds=Math.max(2,Math.floor(L/spacing)+1);
  for(let j=0;j<nStuds;j++){
    const t=j/(nStuds-1);
    const p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:0};
    out.push({id:uid('C'),kind:'profile',type:'Montante',profile:S.calc.studProfile,name:panel+'-M'+k++,panel,a:p,b:{...p,z:height}});
  }
  return {profiles:out,next:k};
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
        const r=generateProfilesForSegment(a,b,panel,k,s.height,spacing);
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
      const r=generateProfilesForSegment(ln.a,ln.b,panel,k,height,spacing);
      S.profiles.push(...r.profiles); k=r.next;
    });
    setMode('3d');panel();msg(S.profiles.length+' perfis LSF gerados a partir das linhas/DXF.');return;
  }

  msg('Desenhe uma forma fechada ou importe/desenhe linhas para gerar LSF.');
}
function runCalc(){
  const panels=S.shapes.filter(isClosed);
  const lines=S.shapes.filter(o=>o.kind==='line');
  let areaTotal=0, wallLength=0, studs=0, tracks=0, source='';

  if(S.profiles.length){
    S.profiles.forEach(p=>{
      if(p.type==='Montante')studs++;
      if(p.type&&p.type.startsWith('Guia'))tracks++;
    });
    const trackLen=S.profiles.filter(p=>p.type&&p.type.startsWith('Guia')).reduce((a,p)=>a+lineLength(p),0);
    wallLength=trackLen/2;
    source='perfis LSF gerados';
  } else if(panels.length){
    panels.forEach(s=>{areaTotal+=area(s);wallLength+=perimeter(s);});
    source='volumes/painéis fechados';
  } else if(lines.length){
    wallLength=lines.reduce((a,l)=>a+lineLength(l),0);
    source='linhas/DXF importadas';
  }

  const spacing=Number(S.calc.spacing)||0.6, height=Number(S.calc.height)||2.7;
  const wind=Number(S.calc.wind)||0.5, load=(Number(S.calc.dead)||0)+(Number(S.calc.live)||0);

  if(!studs) studs=Math.ceil(wallLength/spacing)+Math.max(0,Math.ceil(wallLength>0?1:0));
  if(!tracks) tracks=wallLength>0?Math.max(2,Math.ceil(wallLength/3)*2):0;
  const linStud=studs*height;
  const linTrack=wallLength*2;
  const mass=(linStud*1.35+linTrack*1.15);
  const warn=[];
  if(wallLength<=0)warn.push('Não existem paredes/linhas/volumes para calcular.');
  if(spacing>0.6)warn.push('Espaçamento superior a 600 mm: rever estabilidade e placas.');
  if(height>3.0)warn.push('Altura superior a 3,00 m: verificar flambagem e reforços.');
  if(wind>0.75)warn.push('Pressão de vento elevada: exigir verificação estrutural detalhada.');
  if(!S.profiles.length && wallLength>0)warn.push('Pré-cálculo feito sem perfis gerados. Clique em Gerar LSF para criar peças individuais.');

  S.calc.results={source,panels:panels.length,lines:lines.length,areaTotal,wallLength,studs,tracks,linStud,linTrack,mass,load,wind,warn};
  S.tab='structure';$$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab==='structure'));panel();
  msg(wallLength>0?'Pré-cálculo estrutural gerado.':'Não há elementos para calcular.');
}
function exportCSV(){
  const rows=[['PROJETO','PAINEL','REFERENCIA','TIPO','PERFIL','COMPRIMENTO_MM','OBS']];
  if(S.profiles.length){
    S.profiles.forEach(p=>rows.push(['Aloe LSF 360',p.panel,p.name,p.type,p.profile,(lineLength(p)*1000).toFixed(1),'Perfil LSF individual selecionável']));
  } else {
    const closed=S.shapes.filter(isClosed);
    const lines=S.shapes.filter(o=>o.kind==='line');
    if(closed.length) closed.forEach((s,i)=>rows.push(['Aloe LSF 360','P'+(i+1),s.name,shapeName(s.kind),'—',((s.height||0)*1000).toFixed(1),'Volume/base para estrutura']));
    if(lines.length) lines.forEach((l,i)=>rows.push(['Aloe LSF 360','L'+(i+1),l.name||('Linha '+(i+1)),'Linha/DXF','—',(lineLength(l)*1000).toFixed(1),'Linha usada como eixo de parede']));
  }
  if(S.calc.results){
    rows.push([]);
    rows.push(['PRE-CALCULO','','Origem',S.calc.results.source,'—','—','Estimativo']);
    rows.push(['PRE-CALCULO','','Comprimento paredes','m','—',n(S.calc.results.wallLength),'Estimativo']);
    rows.push(['PRE-CALCULO','','Montantes','un',S.calc.studProfile,S.calc.results.studs,'Estimativo']);
    rows.push(['PRE-CALCULO','','Guias','un',S.calc.trackProfile,S.calc.results.tracks,'Estimativo']);
    rows.push(['PRE-CALCULO','','Massa estimada','kg','—',n(S.calc.results.mass),'Indicativo']);
  }
  if(rows.length===1)return msg('Sem dados para CSV.');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n')],{type:'text/csv;charset=utf-8'}));
  a.download='aloe_lsf360_fabrico.csv';a.click();msg('CSV gerado.');
}
function panel(){const p=$('#panelBody'),sel=S.selected.map(item).filter(Boolean);if(S.tab==='entity'){p.innerHTML=`<div class="card"><h3>Propriedades</h3>${sel.length?`<p><b>${sel.length} elemento(s) selecionado(s)</b></p><p>Referência: ${sel[0].name}</p><p>Tipo: ${sel[0].kind==='profile'?sel[0].type:shapeName(sel[0].kind)}</p><p>Perfil: ${sel[0].profile||'—'}</p><p>Altura: ${sel[0].height?n(sel[0].height)+' m':'—'}</p>`:'<p>Selecione um objeto no desenho ou na lista.</p>'}</div><div class="card"><h3>Objetos do projeto</h3><div class="list">${items().map(o=>`<div class="row ${S.selected.includes(o.id)?'active':''}"><div><b>${o.name}</b><small>${o.kind==='profile'?o.type:shapeName(o.kind)} · ${o.profile||'—'}</small></div><button data-pick="${o.id}">Selecionar</button></div>`).join('')||'<p>Nenhum objeto criado.</p>'}</div></div>`;$$('[data-pick]').forEach(b=>b.onclick=()=>select(item(b.dataset.pick),S.multi))}
if(S.tab==='image'){p.innerHTML=`<div class="card"><h3>Importar imagem / PDF / DXF / DWG</h3><p>Importa imagem, PDF ou DXF. DWG é indicado para conversão, pois o navegador não lê DWG nativo. Depois calibre a escala e desenhe por cima.</p><div class="btns"><button class="btn green" id="importImg">Importar imagem</button><button class="btn" id="calibImg">Calibrar escala</button></div>${S.image?`<p><b>Imagem carregada.</b> Escala visual: ${n(S.image.scale,3)}</p>`:'<p>Nenhuma imagem carregada.</p>'}</div><div class="card"><h3>Fluxo</h3><p>1. Importar imagem<br>2. Calibrar por 2 pontos<br>3. Desenhar paredes/volumes<br>4. Empurrar/Puxar<br>5. Gerar LSF<br>6. Pré-cálculo<br>7. CSV</p></div>`;$('#importImg').onclick=()=>$('#imageInput').click();$('#calibImg').onclick=startCalib}
if(S.tab==='selection'){const profiles=[...new Set(items().map(o=>o.profile).filter(Boolean))];p.innerHTML=`<div class="card"><h3>Seleção</h3><div class="btns"><button class="btn" id="multiBtn">${S.multi?'Desativar':'Ativar'} seleção múltipla</button><button class="btn" id="clearBtn">Limpar</button></div><div class="field"><label>Tipo</label><select id="filterType"><option value="all">Todos</option><option value="rect">Retângulos</option><option value="circle">Círculos</option><option value="polygon">Polígonos</option><option value="profile">Perfis LSF</option></select></div><div class="field"><label>Perfil</label><select id="filterProfile"><option value="all">Todos</option>${profiles.map(x=>`<option>${x}</option>`).join('')}</select></div><button class="btn green" id="filterGo">Selecionar filtrados</button></div>`;$('#multiBtn').onclick=()=>{S.multi=!S.multi;panel()};$('#clearBtn').onclick=()=>select(null);$('#filterGo').onclick=()=>{const t=$('#filterType').value,pr=$('#filterProfile').value;S.selected=items().filter(o=>(t==='all'||(t==='profile'?o.kind==='profile':o.kind===t))&&(pr==='all'||o.profile===pr)).map(o=>o.id);render();panel();$('#selLabel').textContent=S.selected.length+' elemento(s) selecionado(s).'}}
if(S.tab==='structure'){const r=S.calc.results;p.innerHTML=`<div class="card"><h3>Pré-cálculo estrutural LSF</h3><p>Estimativa técnica para preparação de fabrico. Não substitui projeto estrutural assinado.</p><div class="field"><label>Altura padrão das paredes (m)</label><input id="calcHeight" type="number" step="0.05" value="${S.calc.height}"></div><div class="field"><label>Espaçamento montantes (m)</label><select id="calcSpacing"><option value="0.40">0,40</option><option value="0.60">0,60</option></select></div><div class="field"><label>Vento indicativo kN/m²</label><input id="calcWind" type="number" step="0.05" value="${S.calc.wind}"></div><div class="field"><label>Carga permanente kN/m²</label><input id="calcDead" type="number" step="0.05" value="${S.calc.dead}"></div><div class="field"><label>Sobrecarga kN/m²</label><input id="calcLive" type="number" step="0.05" value="${S.calc.live}"></div><button class="btn green" id="runCalc">Executar pré-cálculo</button></div>${r?`<div class="card"><h3>Resultados</h3><div class="kpi"><div><b>${r.panels}</b><span>painéis/volumes</span></div><div><b>${n(r.wallLength)} m</b><span>perímetro total</span></div><div><b>${r.studs}</b><span>montantes estimados</span></div><div><b>${n(r.mass)} kg</b><span>aço estimado</span></div></div>${r.warn.length?`<p class="calc-warn">${r.warn.join('<br>')}</p>`:'<p class="calc-ok">Pré-verificação sem avisos críticos.</p>'}<p>Confirme cargas, vãos, aberturas, ligações, contraventamento e normas aplicáveis com técnico responsável.</p></div>`:''}`;$('#calcSpacing').value=S.calc.spacing;$('#runCalc').onclick=()=>{S.calc.height=Number($('#calcHeight').value)||2.7;S.calc.spacing=Number($('#calcSpacing').value)||0.6;S.calc.wind=Number($('#calcWind').value)||0.5;S.calc.dead=Number($('#calcDead').value)||0.4;S.calc.live=Number($('#calcLive').value)||0.75;runCalc()}}
if(S.tab==='profiles'){p.innerHTML=`<div class="card"><h3>Perfis LSF</h3><div class="profile-gallery"><figure><img src="assets/lsf-profile-c.svg"><figcaption>Montante C</figcaption></figure><figure><img src="assets/lsf-profile-u.svg"><figcaption>Guia U</figcaption></figure><figure><img src="assets/lsf-profile-l.svg"><figcaption>Cantoneira L</figcaption></figure></div><div class="field"><label>Montante</label><select id="stud"><option>C90x40x0.95</option><option>C100x40x0.95</option><option>C140x40x1.20</option><option>C200x50x1.50</option><option>C300x50x2.00</option></select></div><div class="field"><label>Guia</label><select id="track"><option>U90x40x0.95</option><option>U100x40x0.95</option><option>U140x40x1.20</option><option>U200x50x1.50</option><option>U300x50x2.00</option></select></div><div class="btns"><button class="btn green" id="applyProfiles">Aplicar à seleção</button><button class="btn" id="selStuds">Selecionar montantes</button><button class="btn" id="selTracks">Selecionar guias</button><button class="btn" id="selAllProfiles">Selecionar todos perfis</button></div></div><div class="card"><h3>Perfis gerados</h3><div class="list">${S.profiles.map(o=>`<div class="row ${S.selected.includes(o.id)?'active':''}"><div><b>${o.name}</b><small>${o.type} · ${o.profile} · ${n(lineLength(o))} m</small></div><button data-profilepick="${o.id}">Selecionar</button></div>`).join('')||'<p>Ainda não existem perfis. Clique em Gerar LSF.</p>'}</div></div>`;$('#stud').value=S.calc.studProfile;$('#track').value=S.calc.trackProfile;$('#applyProfiles').onclick=()=>{S.calc.studProfile=$('#stud').value;S.calc.trackProfile=$('#track').value;S.selected.map(item).filter(o=>o?.kind==='profile').forEach(o=>o.profile=o.type==='Montante'?S.calc.studProfile:S.calc.trackProfile);render();panel();msg('Perfis aplicados.')};$('#selStuds').onclick=()=>{S.selected=S.profiles.filter(p=>p.type==='Montante').map(p=>p.id);render();panel();$('#selLabel').textContent=S.selected.length+' montantes selecionados.'};$('#selTracks').onclick=()=>{S.selected=S.profiles.filter(p=>p.type&&p.type.startsWith('Guia')).map(p=>p.id);render();panel();$('#selLabel').textContent=S.selected.length+' guias selecionadas.'};$('#selAllProfiles').onclick=()=>{S.selected=S.profiles.map(p=>p.id);render();panel();$('#selLabel').textContent=S.selected.length+' perfis selecionados.'};$$('[data-profilepick]').forEach(b=>b.onclick=()=>select(item(b.dataset.profilepick),S.multi))}
if(S.tab==='geo'){p.innerHTML=`<div class="card"><h3>Geolocalização</h3><p>Rua, número, código postal e localidade para preparar o terreno do projeto.</p><div class="field"><label>Rua e número</label><input placeholder="Rua das Acácias, 123"></div><div class="field"><label>Código postal</label><input placeholder="3080-123"></div><div class="field"><label>Localidade</label><input placeholder="Figueira da Foz"></div><button class="btn green" onclick="alert('Localização guardada no projeto de teste.')">Guardar localização</button></div>`}
if(S.tab==='csv'){p.innerHTML=`<div class="card"><h3>CSV de fabrico</h3><p>Exporta volumes, perfis LSF individuais e resumo de pré-cálculo.</p><button class="btn green" id="panelCSV">Gerar CSV</button></div>`;$('#panelCSV').onclick=exportCSV}}
function bind(){svg.setAttribute('viewBox','0 0 1200 760');$$('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));$('#v2').onclick=()=>setMode('2d');$('#v3').onclick=()=>setMode('3d');$('#viewToggle').onclick=()=>setMode(S.mode==='2d'?'3d':'2d');$('#panelToggle').onclick=()=>$('#panel').classList.toggle('hidden');$('#panelClose').onclick=()=>$('#panel').classList.add('hidden');$('#lsfBtn').onclick=generateLSF;$('#calcBtn').onclick=runCalc;$('#csvBtn').onclick=exportCSV;$('#calibrateBtn').onclick=startCalib;$('#fitBtn').onclick=()=>{S.cam={yaw:-0.72,pitch:0.56,zoom:1,panX:0,panY:0};render();msg('Vista ajustada.')};$$('.tab').forEach(b=>b.onclick=()=>{$$('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');S.tab=b.dataset.tab;panel()});$$('[data-layer]').forEach(b=>b.onchange=()=>{S.layers[b.dataset.layer]=b.checked;render()});svg.addEventListener('pointerdown',pointerDown);svg.addEventListener('pointermove',pointerMove);svg.addEventListener('pointerup',pointerUp);svg.addEventListener('wheel',e=>{if(S.mode==='3d'){e.preventDefault();S.cam.zoom=Math.max(0.3,Math.min(3,S.cam.zoom*(e.deltaY<0?1.12:0.89)));render()}},{passive:false});$('#menu').onclick=e=>{const b=e.target.closest('button');if(!b)return;const a=b.dataset.action;if(a==='new'){if(confirm('Criar projeto novo?')){S.shapes=[];S.profiles=[];S.selected=[];S.image=null;S.calibration=null;S.calc.results=null;render();panel()}}else if(a==='open')$('#projectInput').click();else if(a==='save')saveProject();else if(a==='import')$('#imageInput').click();else if(a==='export')exportCSV();else if(a==='location'){S.tab='geo';$$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab==='geo'));panel()}else if(a==='print')window.print()};$('#projectInput').onchange=e=>openProject(e.target.files[0]);$('#imageInput').onchange=e=>importPlanFile(e.target.files[0]);window.addEventListener('keydown',e=>{if(e.key==='Escape'){S.draft=null;S.polygon=[];S.drag=null;S.calibration=null;render()}if(e.key==='Enter'&&S.polygon.length>=3){finish({kind:'polygon',points:[...S.polygon]});S.polygon=[]}if((e.key==='Delete'||e.key==='Backspace')&&document.activeElement.tagName!=='INPUT')removeSelected()})}
function demo(){const r={kind:'rect',a:{x:-2.4,y:-1.4,z:0},b:{x:2.4,y:1.4,z:0},height:2.7};finish(r);S.selected=[r.id];render();panel()}
bind();setTool('select');demo();
})();