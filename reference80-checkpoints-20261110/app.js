'use strict';
const $ = s => document.querySelector(s);
let data, group='longtail', frames=57, caseIndex=0, generation=0, syncing=false, playGeneration=0;
let videos=[];
const caseSelect=$('#case'), frameSelect=$('#frames'), seek=$('#seek'), control=$('#control');
function active(){return $('#control-panel').open && control.src ? [...videos,control] : videos;}
function pause(){playGeneration++;syncing=false;active().forEach(v=>v.pause());$('#play').disabled=false;}
function setFrame(n){pause();n=Math.max(0,Math.min(frames-1,n));active().forEach(v=>{if(v.readyState>=1)v.currentTime=n/10+.001;});seek.value=n;$('#frame-label').textContent=`第 ${n+1} / ${frames} 帧`;}
function clearVideo(v){v.pause();v.removeAttribute('src');v.load();}
function updateTimeline(){const n=Math.min(frames-1,Math.floor((videos[0]?.currentTime||0)*10));seek.value=n;$('#frame-label').textContent=`第 ${n+1} / ${frames} 帧`;}
async function ready(v){if(v.readyState>=2)return;await new Promise((resolve,reject)=>{let t;const clean=()=>{clearTimeout(t);v.removeEventListener('loadeddata',ok);v.removeEventListener('error',fail);};const ok=()=>{clean();resolve();},fail=()=>{clean();reject(new Error('视频加载失败'));};v.addEventListener('loadeddata',ok);v.addEventListener('error',fail);t=setTimeout(()=>{clean();reject(new Error('加载超时，请单独打开视频或重试'));},45000);v.preload='auto';if(v.readyState>=2)ok();});}
async function play(){const token=generation,request=++playGeneration;$('#play').disabled=true;$('#status').textContent='正在准备同步播放…';try{await Promise.all(active().map(ready));if(token!==generation||request!==playGeneration)return;const at=videos[0].ended?0:Number(seek.value)/10;active().forEach(v=>{v.currentTime=at;v.playbackRate=Number($('#speed').value);});await Promise.all(active().map(v=>v.play()));if(token!==generation||request!==playGeneration)return;syncing=true;$('#status').textContent='同步播放中';}catch(e){if(token===generation&&request===playGeneration){pause();$('#status').textContent=e.message;}}finally{if(token===generation&&request===playGeneration)$('#play').disabled=false;}}
function populateCases(){caseSelect.replaceChildren();data.groups[group].cases.forEach((c,i)=>{const o=document.createElement('option');o.value=i;o.textContent=c.title;caseSelect.append(o);});caseSelect.value=caseIndex;}
function render(){
  pause();generation++;videos.forEach(clearVideo);clearVideo(control);videos=[];
  const config=data.groups[group],c=config.cases[caseIndex];
  $('#players').replaceChildren();caseSelect.value=caseIndex;
  $('#case-title').textContent=c.title;$('#sample-id').textContent=c.sample_id;
  $('#case-count').textContent=`${caseIndex+1} / ${config.cases.length}`;
  $('#group-note').textContent=group==='longtail'?'同一组十例，1000 / 2000 / 5000 步。'+(frames===57?'完整 57 帧；后段从各自生成的第 29 帧续推。':'首段 29 帧；可先排除续推误差的影响。'):'同一组五个固定验证场景，3000 / 4000 / 5000 步。来自训练保存的 29 帧预览，单视角约 340 × 196。';
  $('#prompt-panel').hidden=group==='fixed';$('#prompt').textContent=c.prompt||'';
  $('#case-notes').textContent=(c.seed!=null?`Seed ${c.seed}。 `:'')+(c.notes||'');
  frameSelect.querySelector('[value="57"]').disabled=group==='fixed';frameSelect.value=frames;
  $('#tail').hidden=frames!==57;seek.max=frames-1;seek.value=0;
  document.querySelectorAll('[data-group]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.group===group)));
  for(const step of config.steps){
    const rec=data.media.find(x=>x.group===group&&x.step===step&&x.sample_id===c.sample_id&&x.frames===frames&&x.kind==='generated');
    if(!rec)throw new Error('缺少视频清单记录');
    const article=document.createElement('article');article.className='player';article.dataset.step=step;
    const h=document.createElement('h3');h.textContent=`${step.toLocaleString()} 步`;const badge=document.createElement('span');badge.textContent=`EMA · ${frames} 帧`;h.append(badge);
    const v=document.createElement('video');v.src=rec.path;v.poster=rec.poster;v.muted=true;v.playsInline=true;v.controls=true;v.preload='metadata';v.setAttribute('aria-label',`${c.title} ${step}步 ${frames}帧`);
    const error=document.createElement('p');error.className='error';error.hidden=true;v.addEventListener('error',()=>{error.hidden=false;error.textContent='此浏览器加载失败，可单独打开或下载 MP4。';});
    const links=document.createElement('div');links.className='links';const open=document.createElement('a');open.href=rec.path;open.target='_blank';open.rel='noopener';open.textContent='单独打开 / 放大 ↗';const download=document.createElement('a');download.href=rec.path;download.download=`${c.sample_id}-${step}-${frames}f.mp4`;download.textContent='下载 MP4';links.append(open,download);
    article.append(h,v,error,links);$('#players').append(article);videos.push(v);
  }
  const ctrl=data.media.find(x=>x.group===group&&x.sample_id===c.sample_id&&x.kind==='control');
  control.dataset.path=ctrl.path;control.poster=ctrl.poster;$('#control-link').href=ctrl.path;
  if($('#control-panel').open)control.src=ctrl.path;
  videos[0].addEventListener('timeupdate',updateTimeline);
  videos[0].addEventListener('ended',()=>{pause();$('#status').textContent='播放结束';});
  $('#status').textContent='';updateTimeline();
  history.replaceState(null,'',`#group=${group}&case=${encodeURIComponent(c.sample_id)}&frames=${frames}`);
}
$('#play').onclick=play;$('#pause').onclick=()=>{pause();$('#status').textContent='已暂停';};$('#restart').onclick=()=>setFrame(0);
seek.oninput=()=>setFrame(Number(seek.value));$('#tail').onclick=()=>setFrame(42);
$('#speed').onchange=()=>active().forEach(v=>{v.playbackRate=Number($('#speed').value);});
caseSelect.onchange=()=>{caseIndex=Number(caseSelect.value);render();};
$('#previous').onclick=()=>{caseIndex=(caseIndex+data.groups[group].cases.length-1)%data.groups[group].cases.length;render();};
$('#next').onclick=()=>{caseIndex=(caseIndex+1)%data.groups[group].cases.length;render();};
frameSelect.onchange=()=>{frames=Number(frameSelect.value);render();};
document.querySelectorAll('[data-group]').forEach(b=>b.onclick=()=>{group=b.dataset.group;caseIndex=0;if(group==='fixed')frames=29;populateCases();render();});
$('#control-panel').addEventListener('toggle',async()=>{pause();const token=generation;if($('#control-panel').open){control.src=control.dataset.path;try{await ready(control);if(token===generation&&$('#control-panel').open)control.currentTime=Number(seek.value)/10;}catch(e){if(token===generation&&$('#control-panel').open)$('#status').textContent=e.message;}}else{clearVideo(control);}});
setInterval(()=>{if(!syncing||!videos.length)return;const master=videos[0];if(master.paused||master.ended){pause();return;}active().slice(1).forEach(v=>{if(v.readyState>=2&&Math.abs(v.currentTime-master.currentTime)>.14)v.currentTime=master.currentTime;});},200);
function readLocation(){const q=new URLSearchParams(location.hash.slice(1));group=['longtail','fixed'].includes(q.get('group'))?q.get('group'):'longtail';frames=group==='fixed'?29:(q.get('frames')==='29'?29:57);const found=data.groups[group].cases.findIndex(c=>c.sample_id===q.get('case'));caseIndex=Math.max(0,found);populateCases();render();}
window.addEventListener('hashchange',()=>{if(data)readLocation();});
fetch('manifest.json').then(r=>{if(!r.ok)throw new Error('视频清单加载失败');return r.json();}).then(m=>{data=m;readLocation();}).catch(e=>{$('#case-title').textContent='页面加载失败';$('#status').textContent=e.message;});
