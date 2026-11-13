'use strict';
(async()=>{
 const $=id=>document.getElementById(id),response=await fetch('manifest.json');
 if(!response.ok)throw new Error('视频目录加载失败');
 const manifest=await response.json();let index=0,generation=0;
 const active=()=>[...document.querySelectorAll('.player video')];
 function pause(){active().forEach(v=>v.pause());}
 function ready(v){if(v.readyState>=2)return Promise.resolve();return new Promise((resolve,reject)=>{let timer;const clean=()=>{clearTimeout(timer);v.removeEventListener('loadeddata',ok);v.removeEventListener('error',bad)};const ok=()=>{clean();resolve()},bad=()=>{clean();reject(new Error('视频加载失败'))};timer=setTimeout(bad,30000);v.addEventListener('loadeddata',ok);v.addEventListener('error',bad);v.preload='auto';v.load();});}
 async function seek(frame){pause();const id=generation,vs=active();await Promise.all(vs.map(ready));if(id!==generation)return;vs.forEach(v=>v.currentTime=frame/10+.001);$('seek').value=frame;$('frame-label').textContent=`第 ${frame+1} / 29 帧`;}
 async function play(){const id=generation,vs=active();$('status').textContent='正在加载…';await Promise.all(vs.map(ready));if(id!==generation)return;const time=vs[0].currentTime>=2.8?0:vs[0].currentTime;vs.forEach(v=>{v.currentTime=time;v.playbackRate=Number($('speed').value)});await Promise.all(vs.map(v=>v.play()));$('status').textContent='';}
 function guarded(fn){return(...args)=>Promise.resolve().then(()=>fn(...args)).catch(e=>{$('status').textContent=e.message;pause()});}
 function render(){pause();generation++;const c=manifest.cases[index];$('case').value=String(index);$('case-title').textContent=c.title;$('case-count').textContent=`${index+1} / 5`;$('sample-id').textContent=c.sample_id;$('prompt').textContent=c.prompt;$('status').textContent='';$('seek').value=0;$('frame-label').textContent='第 1 / 29 帧';$('players').replaceChildren();
   for(const step of manifest.checkpoint_steps){const m=manifest.media.find(x=>x.sample_id===c.sample_id&&x.step===step),card=document.createElement('article');card.className='player';card.dataset.step=step;const title=document.createElement('h3');title.textContent=`${step.toLocaleString()} 步 · EMA · 上排生成 / 下排2D控制（地图＋框）`;const v=document.createElement('video');v.controls=true;v.muted=true;v.playsInline=true;v.preload='none';v.poster=m.poster;v.src=m.path;v.addEventListener('ended',pause);if(step===1000)v.addEventListener('timeupdate',()=>{const frame=Math.min(28,Math.floor(v.currentTime*10));$('seek').value=frame;$('frame-label').textContent=`第 ${frame+1} / 29 帧`;});const link=document.createElement('a');link.href=m.path;link.target='_blank';link.rel='noopener';link.textContent='单独打开视频 ↗';card.append(title,v,link);$('players').append(card);}
   history.replaceState(null,'','#case='+encodeURIComponent(c.sample_id));
 }
 manifest.cases.forEach((c,i)=>$('case').add(new Option(c.title,i)));
 const initial=new URLSearchParams(location.hash.slice(1)).get('case');const found=manifest.cases.findIndex(c=>c.sample_id===initial);if(found>=0)index=found;
 window.addEventListener('hashchange',()=>{const sid=new URLSearchParams(location.hash.slice(1)).get('case'),next=manifest.cases.findIndex(c=>c.sample_id===sid);if(next>=0&&next!==index){index=next;render()}});
 $('case').addEventListener('change',()=>{index=Number($('case').value);render()});
 $('previous').onclick=()=>{index=(index+4)%5;render()};$('next').onclick=()=>{index=(index+1)%5;render()};
 $('play').onclick=guarded(play);$('pause').onclick=pause;$('restart').onclick=guarded(()=>seek(0));$('seek').oninput=guarded(()=>seek(Number($('seek').value)));
 $('speed').onchange=()=>active().forEach(v=>v.playbackRate=Number($('speed').value));
 render();
})().catch(e=>{document.getElementById('status').textContent=e.message;});
