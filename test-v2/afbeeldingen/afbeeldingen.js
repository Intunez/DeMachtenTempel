(()=>{'use strict';
const files=['01_Brug_der_Machten_goedgekeurd.png','02_Waterval_vergeten_machten_goedgekeurd.png','03_Drakenproef_brandende_exponenten_goedgekeurd.png','04_Portaal_van_de_oneindigheid_goedgekeurd.png','05_Exponentiele_Kristalgrot_goedgekeurd.png','06_Schatkamer_der_Machten_goedgekeurd.png','07_Finale_race_visuele_referentie.png','08_Startscherm_goedgekeurd.png'];
const portraits=Array.from({length:13},(_,i)=>'held_'+String(i+1).padStart(2,'0')+'.png');
const assets=new Map(),urls=new Map();let audio=null,enabled=false,view='',lastSignature='';
const $=id=>document.getElementById(id);
function db(){return new Promise((resolve,reject)=>{const r=indexedDB.open('machtentempel-goedgekeurde-beelden',1);r.onupgradeneeded=()=>r.result.createObjectStore('files');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function store(name,blob){const d=await db();await new Promise((resolve,reject)=>{const tx=d.transaction('files','readwrite');tx.objectStore('files').put(blob,name);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});d.close()}
async function restore(){const d=await db();const names=await new Promise((resolve,reject)=>{const tx=d.transaction('files');const r=tx.objectStore('files').getAllKeys();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});for(const name of names){const blob=await new Promise((resolve,reject)=>{const r=d.transaction('files').objectStore('files').get(name);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});if(blob)add(name,blob)}d.close()}
function add(name,blob){if(urls.has(name))URL.revokeObjectURL(urls.get(name));urls.set(name,URL.createObjectURL(blob));assets.set(name,blob)}
function fallback(index){const colors=[['#6a9ab3','#152c45'],['#74a9be','#142c46'],['#d7855b','#30192c'],['#9279c5','#1b244b'],['#4db4ae','#132d4a'],['#e6a35b','#2d223e'],['#d5a15b','#1a2540'],['#8ac7d6','#12273d']][index];const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 680"><defs><linearGradient id="s" x2="0" y2="1"><stop stop-color="'+colors[1]+'"/><stop offset="1" stop-color="'+colors[0]+'"/></linearGradient><linearGradient id="w"><stop stop-color="#a6e9f2" stop-opacity=".7"/><stop offset="1" stop-color="#d4f6ff" stop-opacity=".12"/></linearGradient></defs><rect width="1200" height="680" fill="url(#s)"/><circle cx="880" cy="130" r="78" fill="#ffe4aa" opacity=".55"/><path d="M0 360L130 130 260 350 410 100 560 365 740 125 930 375 1100 120 1200 350V680H0" fill="#152737" opacity=".72"/><path d="M0 460L160 240 350 460 530 215 730 460 910 255 1200 470V680H0" fill="#172f38"/><path d="M545 180h110v390H545z" fill="#9a927f"/><path d="M520 175l80-90 80 90z" fill="#d8bc83"/><path d="M510 570V280h35v290zm145 0V280h35v290z" fill="#b8aa8d"/><path d="M570 570V370q30-55 60 0v200z" fill="#11212c"/><path d="M0 580q280-100 540-15t660-30v145H0z" fill="#10212a"/><path d="M380 290q65 100 0 380h-70q65-230 0-380z" fill="url(#w)"/><path d="M0 630q250-95 510-40t690 10" stroke="#e3b96c" stroke-width="9" fill="none" opacity=".65"/></svg>';return 'url("data:image/svg+xml,'+encodeURIComponent(svg)+'")'}
function stage(){if(!$('welcome').classList.contains('hidden'))return 7;const text=($('studentStatus')?.textContent||'')+' '+($('myPosition')?.textContent||'')+' '+($('phaseLabel')?.textContent||'');if(/finale|vak \d+\/16|race|spel afgelopen/i.test(text))return 6;const names=['brug','waterval','draak','portaal','kristal','schatkamer'];const body=($('questTitle')?.textContent||'')+' '+($('eventLabel')?.textContent||'');let idx=names.findIndex(x=>body.toLowerCase().includes(x));if(idx>=0)return idx;const chapter=text.match(/hoofdstuk\s*(\d+)/i);return chapter?Math.max(0,Math.min(5,+chapter[1]-1)):0}
function setArt(){const st=stage();const file=files[st];const url=urls.get(file);const scene=url?'url("'+url+'")':fallback(st);document.querySelectorAll('.image-stage').forEach(el=>{el.style.setProperty('--fantasy-scene',scene);const selected=document.querySelector('.avatar-option.selected, .avatar-card.selected');const avatar=selected?Number(selected.dataset.avatar):0;const hero=urls.get(portraits[Number.isFinite(avatar)?avatar:0]);if(hero){el.dataset.avatar='1';el.style.setProperty('--fantasy-hero','url("'+hero+'")')}else delete el.dataset.avatar});const n=files.filter(x=>urls.has(x)).length;const p=portraits.filter(x=>urls.has(x)).length;$('artStatus').textContent=n===8&&p===13?'✓ Alle goedgekeurde beelden geladen':n+' van 8 decors · '+p+' van 13 helden';$('artUpload').classList.toggle('ready',n===8&&p===13)}
function audioControl(){if(!audio)return;const teacher=!$('teacher').classList.contains('hidden');const solo=/alleen oefenen|SOLO/i.test($('connection')?.textContent||'');if(!teacher&&!solo){audio.pause();return}if(enabled&&audio.paused)audio.play().catch(()=>{});}
async function loadFiles(ev){
 let n=0;
 for(const file of ev.target.files){
  if(file.name.toLowerCase().endsWith('.zip') && window.JSZip){
   const archive=await window.JSZip.loadAsync(file);
   for(const path of Object.keys(archive.files)){
    const entry=archive.files[path];if(entry.dir)continue;
    const name=path.split('/').pop();
    if(!files.includes(name)&&!portraits.includes(name)&&name!=='muziek spel.mp3')continue;
    const blob=await entry.async('blob');
    add(name,blob);await store(name,blob);n++;
   }
  }else if(files.includes(file.name)||portraits.includes(file.name)||file.name==='muziek spel.mp3'){
   add(file.name,file);await store(file.name,file);n++;
  }
 }
 setArt();
 if(urls.has('muziek spel.mp3')){if(audio)audio.pause();audio=new Audio(urls.get('muziek spel.mp3'));audio.loop=true;audio.volume=.65;audioControl()}
 $('artStatus').textContent=n+' bestanden opgeslagen. Volgende keer automatisch geladen.';
}
function start(){const input=$('artFiles');if(input)input.addEventListener('change',loadFiles);const bar=$('artUpload');const b=document.createElement('button');b.textContent='♫ Muziek aan/uit';b.onclick=()=>{enabled=!enabled;audioControl();b.textContent=enabled?'♫ Muziek uit':'♫ Muziek aan'};bar.appendChild(b);restore().then(()=>{setArt();if(urls.has('muziek spel.mp3')){audio=new Audio(urls.get('muziek spel.mp3'));audio.loop=true;audio.volume=.65}}).catch(e=>{$('artStatus').textContent='Beeldenopslag niet beschikbaar: '+e.message});setInterval(()=>{const sig=stage()+'|'+$('studentStatus')?.textContent+'|'+$('phaseLabel')?.textContent;if(sig!==lastSignature){lastSignature=sig;setArt()}audioControl()},1400)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();