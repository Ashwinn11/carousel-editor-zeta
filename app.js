import JSZip from 'jszip';
import { upload } from '@vercel/blob/client';

(() => {
  const $ = (id) => document.getElementById(id);
  const canvas = $('preview'), ctx = canvas.getContext('2d');
  const ratios={'4:5':{w:1080,h:1350,label:'portrait'},'1:1':{w:1080,h:1080,label:'square'},'9:16':{w:1080,h:1920,label:'story'},'16:9':{w:1920,h:1080,label:'landscape'}};
  let aspect='9:16';
  const colors = ['#ffffff','#101010','#ff3b5c','#ff6a00','#ffd84d','#b8f34a','#43d7b5','#28a9ff','#6655ff','#ed49d4'];
  const OUTLINE_WIDTH = 6;
  const BACKGROUND_OPACITY = 88;
  const TITLE_SIZE = 46;
  const SUBTITLE_SIZE = 36;
  const TEXT_ZOOM = 90;
  const fonts = [
    {id:'classic',name:'Classic',css:'700 {size}px "TikTok Sans",sans-serif'},
    {id:'serif',name:'Serif',css:'{size}px "Instrument Serif",Georgia,serif'},
    {id:'typewriter',name:'Typewriter',css:'700 {size}px "Courier New",monospace'},
    {id:'handwriting',name:'Handwriting',css:'{size}px "Permanent Marker",cursive'},
    {id:'bold',name:'Bold',css:'900 {size}px "TikTok Sans",sans-serif'},
    {id:'elegant',name:'Elegance',css:'italic {size}px "Instrument Serif",Georgia,serif'}
  ];
  let slides = [], active = -1, selectedLayer = null, drag = null, toastTimer, dragDepth = 0, hasUnsavedChanges = false, pendingExport = null;
  const uid = () => Math.random().toString(36).slice(2,10);
  const current = () => slides[active];
  const layer = () => current()?.layers.find(x => x.id === selectedLayer) || null;
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function toast(message) { const el=$('toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),2200); }
  function updateRange(el) { const pct=(+el.value - +el.min)/(+el.max - +el.min)*100; el.style.setProperty('--range-progress',`${pct}%`); }
  function markDirty(){hasUnsavedChanges=true;$('saveStatus').textContent='Unsaved edits';}
  function markSaved(message='Project ZIP exported') {hasUnsavedChanges=false;$('saveStatus').textContent=message;}
  function fontCss(item, size) { const f=fonts.find(x=>x.id===item.font)||fonts[0]; return f.css.replace('{size}',size); }
  function addFiles(files) {
    [...files].filter(f=>f.type.startsWith('image/')).forEach(file=>{
      const src=URL.createObjectURL(file), img=new Image(), slide={id:uid(),name:file.name,file,image:null,src,layers:[],zoom:100};
      slides.push(slide);if(active<0)active=0;markDirty();
      img.onload=()=>{slide.image=img;if(slides.includes(slide))renderAll();};
      img.onerror=()=>{URL.revokeObjectURL(src);slides=slides.filter(x=>x!==slide);if(active>=slides.length)active=slides.length-1;toast(`Couldn't open ${file.name}`);renderAll();};img.src=src;
    });
    renderAll();
  }
  function addText() {
    const slide=current();if(!slide){toast('Add a photo before adding text.');return;}
    const source=layer()||slide.layers.at(-1)||{};
    const role=slide.layers.length===0?'title':slide.layers.length===1&&slide.layers[0].role==='title'?'subtitle':'body';
    const defaults=role==='title'
      ?{x:50,y:50,size:TITLE_SIZE,zoom:TEXT_ZOOM,style:'outline',color:'#000000'}
      :role==='subtitle'
        ?{x:50,y:51,size:SUBTITLE_SIZE,zoom:TEXT_ZOOM,style:'background',color:'#ffffff'}
        :{x:50,y:70,size:source.size??TITLE_SIZE,zoom:source.zoom??TEXT_ZOOM,style:source.style??'plain',color:source.color??'#ffffff'};
    const item={id:uid(),role,text:role==='title'?'Your title here':role==='subtitle'?'Your subtitle here':'Your text here',...defaults,rotation:role==='body'?source.rotation??0:0,font:role==='body'?source.font??'classic':'classic',align:role==='body'?source.align??'center':'center',outline:OUTLINE_WIDTH,opacity:BACKGROUND_OPACITY};
    if(role==='subtitle'){slide.layers[0].x=50;slide.layers[0].y=34;}
    slide.layers.push(item);selectedLayer=item.id;markDirty();renderAll();$('textValue').focus();$('textValue').select();
  }
  function normalizeAfterLayerRemoval(slide){
    if(slide.layers.length!==1)return;
    const only=slide.layers[0];
    if(only.role==='subtitle'){only.role='title';only.style='outline';only.color='#000000';only.size=TITLE_SIZE;only.zoom=TEXT_ZOOM;only.outline=OUTLINE_WIDTH;only.opacity=BACKGROUND_OPACITY;}
    if(only.role==='title'){only.x=50;only.y=50;}
  }
  function updateLinkedProperty(key,value){const item=layer();if(item){item[key]=value;markDirty();}}
  function deleteSlide(index=active) {
    if(index<0||!slides[index])return;
    slides.splice(index,1);markDirty();active=slides.length?Math.min(index,slides.length-1):-1;selectedLayer=current()?.layers.at(-1)?.id||null;renderAll();
  }
  function roundedRect(c,x,y,w,h,r) { const rr=Math.max(0,Math.min(r,w/2,h/2));c.beginPath();c.moveTo(x+rr,y);c.arcTo(x+w,y,x+w,y+h,rr);c.arcTo(x+w,y+h,x,y+h,rr);c.arcTo(x,y+h,x,y,rr);c.arcTo(x,y,x+w,y,rr);c.closePath(); }
  function drawConnectedHighlight(widths,lineHeight,top,blockH,padX,padY,align,radius){
    if(!widths.length)return;
    const lefts=widths.map(w=>(align==='left'?0:align==='right'?-w:-w/2)-padX),rights=widths.map((w,i)=>lefts[i]+w+padX*2);
    const yTop=top-padY,yBottom=top+blockH+padY;
    const outerRadius=Math.max(0,Math.min(radius,(yBottom-yTop)/2,...rights.map((right,i)=>(right-lefts[i])/2)));
    ctx.beginPath();ctx.moveTo(lefts[0]+outerRadius,yTop);ctx.lineTo(rights[0]-outerRadius,yTop);ctx.arcTo(rights[0],yTop,rights[0],yTop+outerRadius,outerRadius);
    let x=rights[0];
    for(let i=0;i<widths.length-1;i++){
      const edge=top+lineHeight*(i+1),next=rights[i+1],delta=next-x,sign=Math.sign(delta),step=Math.min(outerRadius,Math.abs(delta)/2,lineHeight*.22);
      if(step){ctx.lineTo(x,edge-step);ctx.quadraticCurveTo(x,edge,x+sign*step,edge);ctx.lineTo(next-sign*step,edge);ctx.quadraticCurveTo(next,edge,next,edge+step);}else{ctx.lineTo(x,edge);ctx.lineTo(next,edge);}
      x=next;
    }
    ctx.lineTo(x,yBottom-outerRadius);ctx.arcTo(x,yBottom,x-outerRadius,yBottom,outerRadius);x=lefts.at(-1);
    ctx.lineTo(x+outerRadius,yBottom);ctx.arcTo(x,yBottom,x,yBottom-outerRadius,outerRadius);
    for(let i=widths.length-1;i>0;i--){
      const edge=top+lineHeight*i,next=lefts[i-1],delta=next-x,sign=Math.sign(delta),step=Math.min(outerRadius,Math.abs(delta)/2,lineHeight*.22);
      if(step){ctx.lineTo(x,edge+step);ctx.quadraticCurveTo(x,edge,x+sign*step,edge);ctx.lineTo(next-sign*step,edge);ctx.quadraticCurveTo(next,edge,next,edge-step);}else{ctx.lineTo(x,edge);ctx.lineTo(next,edge);}
      x=next;
    }
    ctx.lineTo(x,yTop+outerRadius);ctx.arcTo(x,yTop,x+outerRadius,yTop,outerRadius);ctx.closePath();ctx.fill();
  }
  function wrapText(text,maxWidth,size,font) {
    ctx.font=font;const out=[];
    String(text||'').split('\n').forEach(paragraph=>{if(!paragraph){out.push('');return;}let line='';paragraph.split(/\s+/).forEach(word=>{const test=line?`${line} ${word}`:word;if(line&&ctx.measureText(test).width>maxWidth){out.push(line);line=word;}else line=test;});out.push(line);});
    return out;
  }
  function drawText(item, showSelection=false) {
    const size=item.size*1.65,font=fontCss(item,size),objectScale=(item.zoom||100)/100,maxWidth=canvas.width*.84,lines=wrapText(item.text,maxWidth,size,font),lineHeight=size*1.16;
    const blockH=Math.max(lineHeight,lines.length*lineHeight),centerX=canvas.width*(item.x??50)/100,centerY=canvas.height*(item.y??70)/100,top=-blockH/2;
    const widths=lines.map(t=>{ctx.font=font;return ctx.measureText(t).width;}),maxLine=Math.max(1,...widths),padX=size*.28,padY=size*.15;
    const left=item.align==='left'?0:item.align==='right'?-maxLine:-maxLine/2,right=left+maxLine,angle=(item.rotation||0)*Math.PI/180;
    const corners=[[left-padX,top-padY],[right+padX,top-padY],[right+padX,top+blockH+padY],[left-padX,top+blockH+padY]].map(([x,y])=>{x*=objectScale;y*=objectScale;return[centerX+x*Math.cos(angle)-y*Math.sin(angle),centerY+x*Math.sin(angle)+y*Math.cos(angle)];});
    const bounds={left:Math.min(...corners.map(p=>p[0])),right:Math.max(...corners.map(p=>p[0])),top:Math.min(...corners.map(p=>p[1])),bottom:Math.max(...corners.map(p=>p[1]))};item._bounds=bounds;
    ctx.save();ctx.translate(centerX,centerY);ctx.rotate(angle);ctx.scale(objectScale,objectScale);
    ctx.font=font;ctx.textBaseline='middle';ctx.textAlign=item.align;ctx.lineJoin='round';ctx.lineCap='round';
    const contrast=(hex)=>{const h=hex.replace('#','');const n=parseInt(h.length===3?h.split('').map(x=>x+x).join(''):h,16);return ((n>>16)*299+((n>>8)&255)*587+(n&255)*114)/1000>145?'#171717':'#ffffff';};
    const fill=item.style==='background'?contrast(item.color):(item.style==='outline'?'#ffffff':item.color);
    if(item.style==='background'){ctx.save();ctx.globalAlpha=BACKGROUND_OPACITY/100;ctx.fillStyle=item.color;drawConnectedHighlight(widths,lineHeight,top,blockH,padX,padY,item.align,Math.min(lineHeight*.28,size*.34));ctx.restore();}
    lines.forEach((line,i)=>{const y=top+lineHeight*(i+.5),x=0;if(item.style==='neon'){ctx.shadowColor=item.color;ctx.shadowBlur=size*.24;ctx.fillStyle=item.color;ctx.fillText(line,x,y,maxWidth);ctx.shadowBlur=size*.42;ctx.fillText(line,x,y,maxWidth);ctx.shadowBlur=0;}else if(item.style==='outline'){ctx.strokeStyle=item.color;ctx.lineWidth=OUTLINE_WIDTH;ctx.strokeText(line,x,y,maxWidth);ctx.fillStyle=fill;ctx.fillText(line,x,y,maxWidth);}else{ctx.fillStyle=fill;ctx.fillText(line,x,y,maxWidth);}});
    if(showSelection&&item.id===selectedLayer){const box={x:left-padX-10,y:top-padY-8,w:maxLine+padX*2+20,h:blockH+padY*2+16};ctx.setLineDash([9,7]);ctx.lineWidth=3;ctx.strokeStyle='#d5ff58';ctx.strokeRect(box.x,box.y,box.w,box.h);ctx.setLineDash([]);ctx.fillStyle='#d5ff58';[[box.x,box.y],[box.x+box.w,box.y],[box.x,box.y+box.h],[box.x+box.w,box.y+box.h]].forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();});}
    ctx.restore();
  }
  function paint(includeSelection=true) {
    ctx.clearRect(0,0,canvas.width,canvas.height);const s=current();
    if(!s){ctx.fillStyle='#171719';ctx.fillRect(0,0,canvas.width,canvas.height);return;}
    if(s.image){const img=s.image,scale=Math.max(canvas.width/img.width,canvas.height/img.height)*(s.zoom||100)/100,w=img.width*scale,h=img.height*scale;ctx.drawImage(img,(canvas.width-w)/2,(canvas.height-h)/2,w,h);}else{ctx.fillStyle='#202022';ctx.fillRect(0,0,canvas.width,canvas.height);}
    s.layers.forEach(t=>drawText(t,includeSelection));
  }
  function previewExport(s) {
    const old=active;active=slides.indexOf(s);paint(false);return new Promise(resolve=>canvas.toBlob(blob=>{active=old;paint(true);resolve(blob)},'image/png'));
  }
  function renderCanvas() {const s=current(),r=ratios[aspect];canvas.width=r.w;canvas.height=r.h;$('previewFrame').style.aspectRatio=`${r.w} / ${r.h}`;const frameWidth=Math.max(180,Math.min(402,$('dropZone').clientWidth-40,(window.innerHeight-300)*r.w/r.h));$('previewFrame').style.width=`${frameWidth}px`;$('previewFrame').style.height=`${frameWidth*r.h/r.w}px`;$('exportDimensions').textContent=`${aspect} ${r.label} · ${r.w} × ${r.h} px`;$('emptyPreview').classList.toggle('hidden',!!s);$('previewFrame').classList.toggle('has-text',!!s?.layers.length);$('dragHint').classList.toggle('hidden',!s?.layers.length);$('stageLabel').textContent=s?`${String(active+1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')} · ${s.name}`:'Add photos to begin';$('deleteSlide').classList.toggle('hidden',!s);paint(true);}
  function renderLists() {
    $('slideCount').textContent=slides.length;
    $('slideList').innerHTML=slides.map((s,i)=>`<div class="slide-card ${i===active?'active':''}" draggable="true" data-index="${i}"><div class="slide-thumb"><img src="${s.src}" alt=""><span class="thumb-label">${esc(s.layers.map(t=>t.text).join(' '))}</span></div><div class="slide-meta"><b>Slide ${String(i+1).padStart(2,'0')}</b><span>${esc(s.name)}</span></div><button class="slide-remove" data-remove="${i}" aria-label="Delete slide">×</button></div>`).join('');
    $('filmstrip').innerHTML=slides.map((s,i)=>`<button class="film-card ${i===active?'active':''}" data-film="${i}" aria-label="Select slide ${i+1}"><img src="${s.src}" alt=""><span class="film-index">${String(i+1).padStart(2,'0')}</span></button>`).join('')+`<button class="film-add" id="filmAdd" aria-label="Add slides">+</button>`;
    $('slideList').querySelectorAll('.slide-card').forEach(el=>{el.addEventListener('click',e=>{if(e.target.closest('[data-remove]'))return;selectSlide(+el.dataset.index);});el.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',el.dataset.index);e.dataTransfer.effectAllowed='move';});el.addEventListener('dragover',e=>e.preventDefault());el.addEventListener('drop',e=>{e.preventDefault();const from=+e.dataTransfer.getData('text/plain'),to=+el.dataset.index;if(Number.isInteger(from)&&from!==to){const [x]=slides.splice(from,1);slides.splice(to,0,x);active=to;markDirty();renderAll();}});});
    $('slideList').querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();deleteSlide(+b.dataset.remove);}));
    $('filmstrip').querySelectorAll('[data-film]').forEach(b=>b.addEventListener('click',()=>selectSlide(+b.dataset.film)));
    $('filmAdd')?.addEventListener('click',openPicker);
  }
  function selectSlide(i){active=i;selectedLayer=current()?.layers.at(-1)?.id||null;renderAll();}
  function renderLayerList(){const list=$('layerList'),items=current()?.layers||[];list.innerHTML=items.map((item,i)=>`<button type="button" class="layer-choice ${item.id===selectedLayer?'active':''}" data-layer="${esc(item.id)}" aria-label="Select text layer ${i+1}: ${esc(item.text||'Empty text')}"><span class="layer-order">${String(i+1).padStart(2,'0')}</span><span class="layer-preview">${esc(item.text||'Empty text')}</span></button>`).join('');list.querySelectorAll('[data-layer]').forEach(b=>b.addEventListener('click',()=>{selectedLayer=b.dataset.layer;renderAll();}));}
  function renderControls(){renderLayerList();const item=layer(),has=!!item;$('noSelection').classList.toggle('hidden',has);$('textControls').classList.toggle('hidden',!has);$('clearText').classList.toggle('hidden',!current()?.layers.length);if(!item)return;
    $('textValue').value=item.text;$('charCount').textContent=`${item.text.length} / 200`;$('fontName').textContent=(fonts.find(f=>f.id===item.font)?.name||'Classic').toUpperCase();
    $('fontOptions').innerHTML=fonts.map(f=>`<button type="button" class="font-option ${item.font===f.id?'active':''}" data-font="${f.id}"><span class="font-sample" style="font-family:${f.id==='serif'||f.id==='elegant'?'Instrument Serif,Georgia,serif':f.id==='typewriter'?'Courier New,monospace':f.id==='handwriting'?'Permanent Marker,cursive':f.id==='bold'||f.id==='classic'?'TikTok Sans,sans-serif':'DM Sans,sans-serif'}">Aa</span><small>${f.name}</small></button>`).join('');
    $('fontOptions').querySelectorAll('[data-font]').forEach(b=>b.onclick=()=>{updateLinkedProperty('font',b.dataset.font);renderAll();});
    $('alignOptions').querySelectorAll('[data-align]').forEach(b=>b.classList.toggle('active',b.dataset.align===item.align));$('styleOptions').querySelectorAll('[data-style]').forEach(b=>b.classList.toggle('active',b.dataset.style===item.style));
    $('colorOptions').innerHTML=colors.map(c=>`<button type="button" class="swatch ${item.color.toLowerCase()===c?'active':''}" data-color="${c}" style="background:${c}" aria-label="${c}"></button>`).join('');$('colorOptions').querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>setColor(b.dataset.color));$('customColor').value=item.color;
    $('sizeRange').value=item.size;$('sizeValue').textContent=item.size;$('textZoom').value=item.zoom||TEXT_ZOOM;$('textZoomValue').textContent=`${item.zoom||TEXT_ZOOM}%`;$('textRotation').value=item.rotation||0;$('textRotationValue').textContent=`${item.rotation||0}°`;
    $('alignOptions').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.align===item.align));
    [$('sizeRange'),$('textZoom'),$('textRotation')].forEach(updateRange);
  }
  function setColor(c){if(layer()){updateLinkedProperty('color',c);renderAll();}}
  function renderImageControls(){const s=current(),enabled=!!s;$('imageControls').classList.toggle('hidden',!enabled);if(!s)return;$('imageZoom').value=s.zoom||100;$('imageZoomValue').textContent=`${s.zoom||100}%`;updateRange($('imageZoom'));}
  function renderAll(){renderLists();renderCanvas();renderControls();renderImageControls();$('ratioSelect').value=aspect;}
  function openPicker(){$('imageInput').click();}
  function download(blob,name){if(!blob)return;const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);}
  function projectSlug(){return ($('projectName').textContent||'carousel').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'carousel';}
  async function buildSlidesZip(onProgress=()=>{}){
    if(!slides.length)throw new Error('Add photos before exporting.');
    await document.fonts.ready;const zip=new JSZip();
    for(let i=0;i<slides.length;i++){
      const index=String(i+1).padStart(2,'0'),png=await previewExport(slides[i]);
      if(!png)throw new Error(`Could not render slide ${index}.`);
      zip.file(`slide-${index}.png`,png);onProgress(Math.round((i+1)/slides.length*72));
    }
    return zip.generateAsync({type:'blob',compression:'STORE'},meta=>onProgress(72+Math.round(meta.percent*.28)));
  }
  async function exportAll(){
    const button=$('exportAll');button.disabled=true;
    try{
      pendingExport=await buildSlidesZip(p=>{button.textContent=p<72?`Rendering ${p}%`:`Building ZIP ${p}%`;});
      $('exportDialog').classList.remove('hidden');$('exportDialog').setAttribute('aria-hidden','false');
    }catch(error){toast(`Export failed: ${error.message||error}`);}
    finally{button.disabled=false;button.innerHTML='↥ Export ZIP';}
  }
  function closeExportDialog(){$('exportDialog').classList.add('hidden');$('exportDialog').setAttribute('aria-hidden','true');}
  function downloadReadyZip(){if(!pendingExport)return;download(pendingExport,`${projectSlug()}.zip`);markSaved();toast(`Exported ${slides.length} PNG slides.`);closeExportDialog();}
  async function shareZip(){
    const button=$('shareReadyZip');button.disabled=true;
    try{
      button.textContent='Uploading…';
      const pathname=`carousel-shares/${Date.now()}-${projectSlug()}-${uid()}.zip`;
      await upload(pathname,pendingExport,{access:'public',handleUploadUrl:'/api/share-upload',contentType:'application/zip',multipart:true,onUploadProgress:({percentage})=>{button.textContent=`Uploading ${Math.round(percentage)}%`;}});
      const downloadUrl=shareDownloadUrl(pathname);
      await loadSharedZips();
      try{await navigator.clipboard.writeText(downloadUrl);}catch{}
      localStorage.setItem('carouselShareUrl',downloadUrl);markSaved('Share link ready');closeExportDialog();openStorage();toast('iPhone download link copied. ZIP saved in storage.');
    }catch(error){toast(`Share failed: ${error.message||error}`);}
    finally{button.disabled=false;button.innerHTML='↗ Create iPhone link';}
  }
  function shareDownloadUrl(pathname){return `${location.origin}/api/share-download?path=${encodeURIComponent(pathname)}`;}
  function formatBytes(bytes){return bytes<1024*1024?`${Math.ceil(bytes/1024)} KB`:`${(bytes/1024/1024).toFixed(1)} MB`;}
  function openStorage(){$('storageDialog').classList.remove('hidden');$('storageDialog').setAttribute('aria-hidden','false');loadSharedZips();}
  function closeStorage(){$('storageDialog').classList.add('hidden');$('storageDialog').setAttribute('aria-hidden','true');}
  async function loadSharedZips(){
    try{
      const response=await fetch('/api/share-upload');if(!response.ok)throw new Error('Could not load storage.');
      const {blobs=[]}=await response.json();
      const total=blobs.reduce((sum,blob)=>sum+blob.size,0);
      $('zipCount').textContent=blobs.length;$('storageSummary').textContent=`${blobs.length} ZIP${blobs.length===1?'':'s'} · ${formatBytes(total)} total`;
      $('storageEmpty').classList.toggle('hidden',blobs.length>0);$('clearStorage').disabled=blobs.length===0;
      $('shareList').innerHTML=blobs.map(blob=>{const name=blob.pathname.split('/').pop(),date=new Date(blob.uploadedAt).toLocaleString(),path=encodeURIComponent(blob.pathname),link=shareDownloadUrl(blob.pathname);return `<article class="share-item" role="listitem"><div class="share-file"><strong title="${esc(name)}">${esc(name)}</strong><span>${formatBytes(blob.size)} · ${esc(date)}</span></div><div class="share-item-actions"><button class="button button-quiet" data-copy-path="${path}">Copy link</button><a class="button button-quiet" href="${link}" target="_blank" rel="noopener">Download</a><button class="button button-quiet danger-text" data-delete-path="${path}">Delete</button></div></article>`;}).join('');
    }catch(error){$('storageSummary').textContent=error.message||'Could not load ZIP storage.';$('zipCount').textContent='!';}
  }
  async function deleteSharedZip(pathname){
    const button=$('shareList').querySelector(`[data-delete-path="${encodeURIComponent(pathname)}"]`);if(button){button.disabled=true;button.textContent='Deleting…';}
    try{
      const response=await fetch('/api/share-upload',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({pathname})});
      if(!response.ok)throw new Error('ZIP could not be deleted.');
      await loadSharedZips();toast('ZIP deleted from storage.');
    }catch(error){toast(error.message||'Could not delete the shared ZIP.');}
  }
  async function deleteAllSharedZips(){
    if(!confirm('Delete every stored ZIP? This cannot be undone.'))return;
    const button=$('clearStorage');button.disabled=true;button.textContent='Deleting…';
    try{const response=await fetch('/api/share-upload',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({all:true})});if(!response.ok)throw new Error('ZIP storage could not be cleared.');await loadSharedZips();toast('All stored ZIPs deleted.');}
    catch(error){toast(error.message||'Could not clear ZIP storage.');}
    finally{button.textContent='Delete all';}
  }
  const clamp=(value,min,max,fallback)=>Math.max(min,Math.min(max,Number.isFinite(+value)?+value:fallback));
  async function openProjectArchive(file){
    if(hasUnsavedChanges&&!confirm('Replace the current carousel and discard its unsaved edits?'))return;
    const button=$('openProject');button.disabled=true;button.textContent='Opening…';
    try{
      const zip=await JSZip.loadAsync(file),entry=zip.file('project.json');if(!entry)throw new Error('This ZIP has no project.json file.');
      const manifest=JSON.parse(await entry.async('string'));if(manifest.format!=='still-carousel'||!Array.isArray(manifest.slides))throw new Error('This is not a Still Carousel Studio project.');
      const nextSlides=[];
      for(const [i,data] of manifest.slides.entries()){
        const asset=data.image?.file&&zip.file(data.image.file);if(!asset)throw new Error(`Missing source image for slide ${i+1}.`);
        const blob=await asset.async('blob'),mime=data.image.mimeType||blob.type||'image/jpeg',name=data.image.originalName||data.name||`slide-${i+1}.jpg`,sourceFile=new File([blob],name,{type:mime}),src=URL.createObjectURL(sourceFile),image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error(`Could not open ${name}.`));img.src=src;});
        const layers=(Array.isArray(data.layers)?data.layers:[]).map((t,index)=>({id:String(t.id||uid()),role:['title','subtitle','body'].includes(t.role)?t.role:index===0?'title':index===1?'subtitle':'body',text:String(t.text||'').slice(0,200),x:clamp(t.x,4,96,50),y:clamp(t.y,4,96,70),size:clamp(t.size,24,150,72),zoom:clamp(t.zoom,50,200,100),rotation:clamp(t.rotation,-180,180,0),font:fonts.some(f=>f.id===t.font)?t.font:'classic',align:['left','center','right'].includes(t.align)?t.align:'center',style:['plain','outline','background','neon'].includes(t.style)?t.style:'plain',color:/^#[0-9a-f]{6}$/i.test(t.color||'')?t.color:'#ffffff',outline:OUTLINE_WIDTH,opacity:BACKGROUND_OPACITY}));
        nextSlides.push({id:String(data.id||uid()),name:String(data.name||name),file:sourceFile,image,src,layers,zoom:clamp(data.image?.zoom,100,300,100)});
      }
      if(!nextSlides.length)throw new Error('The project has no slides.');
      slides.forEach(s=>URL.revokeObjectURL(s.src));slides=nextSlides;active=0;selectedLayer=current().layers.at(-1)?.id||null;aspect=ratios[manifest.aspectRatio]?manifest.aspectRatio:'9:16';$('projectName').textContent=String(manifest.projectName||'Untitled carousel');renderAll();markSaved('Project opened');toast(`Opened ${slides.length} slides. You can edit and export the ZIP.`);
    }catch(error){toast(`Could not open project: ${error.message||error}`);}
    finally{button.disabled=false;button.textContent='Open project';}
  }
  const agentGuide=`# Agent workflow for Still Carousel Studio\n\nUpload one image per slide in order, add the title first and subtitle second, then export. Text layers belong only to their slide. The exported ZIP contains only rendered PNG slides.\n\n## Defaults\nThe first text layer is a centered title: TikTok Sans Classic, black 6 px outline, font size 46, paragraph zoom 90%. It is vertically centered when alone. The second layer is a centered subtitle with white background at fixed 88% opacity, font size 36, and paragraph zoom 90%. Adding it positions the title above the subtitle. Opacity and outline width are fixed; there are no controls for them. Keep title larger than subtitle. Natural wrapping is allowed; adjust sizes for a clear hierarchy.\n\n## Browser workflow\n1. Upload images in slide order with #imageInput or the visible upload controls.\n2. Select slides using the accessible “Select slide N” filmstrip buttons.\n3. Click “Add text” once for title and again for subtitle; defaults apply automatically. Replace each placeholder in “Your words”.\n4. Adjust font, color, size, paragraph zoom, rotation, or placement when needed.\n5. Choose an output ratio in #ratioSelect. Default is 9:16 at 1080 × 1920.\n6. Click “Export ZIP” for a ZIP containing only slide PNGs. Click “Share ZIP” to upload those PNGs to Vercel Blob and copy a public download link.\n\nThe app warns before refresh/navigation when edits are unsaved.`;
  window.addEventListener('beforeunload',e=>{if(!hasUnsavedChanges)return;e.preventDefault();e.returnValue='';});
  $('imageInput').addEventListener('change',e=>{if(e.target.files?.length)addFiles(e.target.files);e.target.value='';});
  $('projectInput').addEventListener('change',e=>{const file=e.target.files?.[0];if(file)openProjectArchive(file);e.target.value='';});
  $('openProject').addEventListener('click',()=>$('projectInput').click());
  ['uploadButton','addSlides','emptyUpload'].forEach(id=>$(id).addEventListener('click',openPicker));$('addTextTop').addEventListener('click',addText);$('addTextEmpty').addEventListener('click',addText);$('addLayerAgain').addEventListener('click',addText);$('exportAll').addEventListener('click',exportAll);$('downloadReadyZip').addEventListener('click',downloadReadyZip);$('shareReadyZip').addEventListener('click',shareZip);$('closeExport').addEventListener('click',closeExportDialog);$('exportDialog').addEventListener('click',e=>{if(e.target===$('exportDialog'))closeExportDialog();});$('openStorage').addEventListener('click',openStorage);$('closeStorage').addEventListener('click',closeStorage);$('clearStorage').addEventListener('click',deleteAllSharedZips);$('storageDialog').addEventListener('click',e=>{if(e.target===$('storageDialog'))closeStorage();});$('shareList').addEventListener('click',async e=>{const copy=e.target.closest('[data-copy-path]'),remove=e.target.closest('[data-delete-path]');if(copy){const pathname=decodeURIComponent(copy.dataset.copyPath),link=shareDownloadUrl(pathname);try{await navigator.clipboard.writeText(link);toast('Link copied.');}catch{prompt('Copy this ZIP link:',link);}}if(remove)deleteSharedZip(decodeURIComponent(remove.dataset.deletePath));});$('deleteSlide').addEventListener('click',()=>deleteSlide());
  $('textValue').addEventListener('input',e=>{const item=layer();if(!item)return;item.text=e.target.value;markDirty();$('charCount').textContent=`${item.text.length} / 200`;renderCanvas();renderLists();});
  $('alignOptions').addEventListener('click',e=>{const b=e.target.closest('[data-align]');if(b&&layer()){updateLinkedProperty('align',b.dataset.align);renderAll();}});
  $('styleOptions').addEventListener('click',e=>{const b=e.target.closest('[data-style]');if(b&&layer()){updateLinkedProperty('style',b.dataset.style);renderAll();}});
  $('customColor').addEventListener('input',e=>setColor(e.target.value));
  [['sizeRange','size','sizeValue',v=>v],['textZoom','zoom','textZoomValue',v=>`${v}%`],['textRotation','rotation','textRotationValue',v=>`${v}°`]].forEach(([id,key,out,fmt])=>$(id).addEventListener('input',e=>{const item=layer();if(!item)return;updateLinkedProperty(key,+e.target.value);$(out).textContent=fmt(e.target.value);updateRange(e.target);renderCanvas();}));
  $('deleteLayer').addEventListener('click',()=>{const s=current();if(!s||!selectedLayer)return;const slide=current();slide.layers=slide.layers.filter(x=>x.id!==selectedLayer);normalizeAfterLayerRemoval(slide);selectedLayer=slide.layers.at(-1)?.id||null;markDirty();renderAll();});
  $('clearText').addEventListener('click',()=>{const slide=current();if(!slide)return;slide.layers=[];selectedLayer=null;markDirty();renderAll();});
  canvas.addEventListener('pointerdown',e=>{const s=current();if(!s)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*canvas.width,y=(e.clientY-r.top)/r.height*canvas.height;let hit=null;for(let i=s.layers.length-1;i>=0;i--){const b=s.layers[i]._bounds;if(b&&x>=b.left-12&&x<=b.right+12&&y>=b.top-12&&y<=b.bottom+12){hit=s.layers[i];break;}}selectedLayer=hit?.id||null;if(hit){drag={x,y,ox:hit.x??50,oy:hit.y??70};canvas.setPointerCapture(e.pointerId);}else drag=null;renderAll();});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;const item=layer();if(!item)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*canvas.width,y=(e.clientY-r.top)/r.height*canvas.height;item.x=Math.max(4,Math.min(96,drag.ox+(x-drag.x)/canvas.width*100));item.y=Math.max(4,Math.min(96,drag.oy+(y-drag.y)/canvas.height*100));markDirty();paint(true);});canvas.addEventListener('pointerup',()=>{drag=null;});canvas.addEventListener('pointercancel',()=>{drag=null;});
  $('slideList').addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault();});
  window.addEventListener('dragenter',e=>{if([...e.dataTransfer.types].includes('Files')){dragDepth++;$('dropOverlay').classList.add('show');}});window.addEventListener('dragleave',e=>{if([...e.dataTransfer.types].includes('Files')){dragDepth=Math.max(0,dragDepth-1);if(!dragDepth)$('dropOverlay').classList.remove('show');}});window.addEventListener('dragover',e=>{if([...e.dataTransfer.types].includes('Files'))e.preventDefault();});window.addEventListener('drop',e=>{if([...e.dataTransfer.types].includes('Files')){e.preventDefault();dragDepth=0;$('dropOverlay').classList.remove('show');addFiles(e.dataTransfer.files);}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('exportDialog').classList.contains('hidden')){closeExportDialog();return;}if(e.key==='Escape'&&!$('storageDialog').classList.contains('hidden')){closeStorage();return;}if(e.target.matches('textarea,input'))return;if(e.key==='ArrowRight'&&slides.length)selectSlide(Math.min(slides.length-1,active+1));if(e.key==='ArrowLeft'&&slides.length)selectSlide(Math.max(0,active-1));if((e.key==='Delete'||e.key==='Backspace')&&layer()){e.preventDefault();$('deleteLayer').click();}if(e.key==='Escape'){selectedLayer=null;renderAll();}});
  $('ratioSelect').addEventListener('change',e=>{aspect=e.target.value;markDirty();renderCanvas();});
  window.addEventListener('resize',()=>renderCanvas());
  $('imageZoom').addEventListener('input',e=>{const s=current();if(!s)return;s.zoom=+e.target.value;markDirty();$('imageZoomValue').textContent=`${s.zoom}%`;updateRange(e.target);renderCanvas();});
  $('resetImage').addEventListener('click',()=>{const s=current();if(!s)return;s.zoom=100;markDirty();renderAll();});
  $('projectName').addEventListener('click',()=>{const name=prompt('Name this carousel',$('projectName').textContent);if(name?.trim()){$('projectName').textContent=name.trim();markDirty();}});
  $('fitButton').addEventListener('click',()=>toast(`Preview fitted to ${aspect} export canvas.`));
  renderAll();
  localStorage.removeItem('carouselShareKey');
  loadSharedZips();
})();
