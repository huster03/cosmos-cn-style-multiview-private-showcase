"use strict";
const $ = id => document.getElementById(id);
const cameras = ["前视","右侧","右后","后视","左后","左侧"];
const params = new URLSearchParams(location.search);
function readInt(key, fallback, min, max) {
  const raw = params.get(key);
  if (!raw || !/^-?\d+$/.test(raw)) return fallback;
  return Math.max(min, Math.min(max, Number(raw)));
}
const state = {
  c:readInt("case",1,1,5), v:readInt("cam",-1,-1,5), t:readInt("frame",15,1,29)-1,
  ref:readInt("ref",-1,-1,11), mark:readInt("mark",-1,-1,5), running:false
};
let check, marks, seq=0, timer;
const histories=new Map(), loaded=new Map();
const figures=new Map();
const displayOrder=[5,0,1,4,3,2];
function json(url) {
  return fetch(url).then(r=>{if(!r.ok) throw new Error(url+" "+r.status);return r.json()});
}
function geometry(c) {
  if (!histories.has(c)) histories.set(c,json("geometry-"+c+".json").catch(e=>{histories.delete(c);throw e}));
  return histories.get(c);
}
const offsetIndex=json("frame-offsets.json");
async function readPicture(c,v,t) {
  const index=await offsetIndex, offsets=index[c-1][v];
  const start=offsets[t], end=offsets[t+1];
  const response=await fetch("frames/"+c+"-"+v+".bin?frame="+t,{headers:{Range:"bytes="+start+"-"+(end-1)}});
  if(!response.ok) throw new Error("无法读取样本 "+c+" 的 RGB");
  let blob=await response.blob();
  if(response.status===200 && blob.size===offsets[29]) blob=blob.slice(start,end);
  if(blob.size!==end-start) throw new Error("原帧长度不符");
  const url=URL.createObjectURL(new Blob([blob],{type:"image/webp"}));
  try {
    const image=new Image();image.src=url;await image.decode();return image;
  } finally { URL.revokeObjectURL(url) }
}
function picture(c,v,t) {
  const key=c+"/"+v+"/"+t;
  if(!loaded.has(key)) {
    loaded.set(key,readPicture(c,v,t).catch(e=>{loaded.delete(key);throw e}));
    if(loaded.size>54) loaded.delete(loaded.keys().next().value);
  }
  return loaded.get(key);
}
function strokes(ctx,coords,color,width) {
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();
  for(let i=0;i<coords.length;i+=4) {ctx.moveTo(coords[i],coords[i+1]);ctx.lineTo(coords[i+2],coords[i+3])}
  ctx.stroke();
}
function plus(ctx,x,y) {
  strokes(ctx,[x-9,y,x+9,y,x,y-9,x,y+9],"#fff",3);
  strokes(ctx,[x-9,y,x+9,y,x,y-9,x,y+9],"#951551",1.4);
}
function chooseCamera(v) {
  stop();state.v=v;state.ref=-1;state.mark=-1;render();
}
for(const v of displayOrder) {
  const fig=document.createElement("figure"),canvas=document.createElement("canvas"),cap=document.createElement("figcaption");
  canvas.width=832;canvas.height=480;cap.textContent=cameras[v];
  const zoom=document.createElement("button");
  zoom.type="button";zoom.textContent="放大";zoom.onclick=()=>chooseCamera(state.v===v?-1:v);
  cap.appendChild(zoom);fig.append(cap,canvas);$("screen").appendChild(fig);
  figures.set(v,{fig,canvas,zoom});
}
function syncURL() {
  const q=new URLSearchParams({case:state.c,cam:state.v,frame:state.t+1});
  if(state.ref>=0) q.set("ref",state.ref);
  if(state.mark>=0) q.set("mark",state.mark);
  history.replaceState(null,"","?"+q);
}
function stop() {
  clearTimeout(timer);state.running=false;$("play").textContent="播放";
}
async function render() {
  const renderStarted=performance.now();
  const token=++seq, {c,v,t,ref,mark}=state, visible=v===-1?displayOrder:[v];
  $("case").value=c;$("camera").value=v;$("frame").value=t+1;$("counter").value=(t+1)+" / 29";
  $("screen").classList.toggle("single",v!==-1);
  $("status").textContent="正在读取原帧…";
  syncURL();
  try {
    const [data,images]=await Promise.all([geometry(c),Promise.all(visible.map(i=>picture(c,i,t)))]);
    if(token!==seq)return;
    const refItem=check.references[ref], landmark=marks[mark];
    const exactRef=refItem && refItem.case===c && refItem.frame===t && visible.includes(refItem.camera);
    const exactMark=landmark && landmark.case===c && visible.includes(landmark.camera) && (t===0 || t===28);
    $("note").textContent=exactRef ? refItem.target+" · 模型槽位 "+refItem.slot+" · 投影中心相对 RGB 横向 "+refItem.dx+" px，纵向 "+refItem.dy+" px" : exactMark ? landmark.name+" · "+(t===0?"第一帧人工读点":"末帧人工读点与首帧预测的极线")+" · 末帧点到线 "+landmark.distance_px+" px" : "";
    $("ends").hidden=!landmark;
    figures.forEach(({fig},i)=>{fig.hidden=!visible.includes(i)});
    const viewNames=data.cameras;
    for(const [j,i] of visible.entries()) {
      const {canvas,zoom}=figures.get(i),ctx=canvas.getContext("2d");
      zoom.textContent=v===i?"返回六视角":"放大";canvas.title=viewNames[i];
      ctx.drawImage(images[j],0,0);
      const frame=data.frames[t][i], active=exactRef && refItem.camera===i ? refItem.slot : -1;
      if ($("boxes").checked) {
        for(const [slot,,lines] of frame.boxes) if(slot!==active) strokes(ctx,lines,"rgba(255,190,58,0.87)",1.4);
        if(active>=0) for(const [slot,,lines] of frame.boxes) if(slot===active) strokes(ctx,lines,"#39ffc4",2.3);
      }
      if ($("trail").checked) strokes(ctx,frame.trail.flat(),"#25e7ff",3);
      if ($("reference").checked && exactRef && refItem.camera===i) {
        const [x0,y0,x1,y1]=refItem.rgb;ctx.save();ctx.setLineDash([6,4]);ctx.lineWidth=2;ctx.strokeStyle="#ff88c6";
        ctx.strokeRect(x0,y0,x1-x0,y1-y0);ctx.restore();
      }
      if ($("reference").checked && exactMark && landmark.camera===i) {
        if(t===28) {
          const [a,b,d]=landmark.line_in_last_frame;
          const line=Math.abs(b)>Math.abs(a)?[0,-d/b,831,-(831*a+d)/b]:[-d/a,0,-(479*b+d)/a,479];
          ctx.save();ctx.setLineDash([6,4]);strokes(ctx,line,"#5bffbf",2);ctx.restore();
        }
        plus(ctx,...(t===0?landmark.start:landmark.end));
      }
    }
    $("sample").textContent=data.sample;
    const count=visible.reduce((n,i)=>n+data.frames[t][i].boxes.length,0);
    $("status").textContent="当前显示 "+count+" 个可见框投影";
    if(state.running) timer=setTimeout(()=>{state.t=(state.t+1)%29;render()}, Math.max(0,100-(performance.now()-renderStarted)));
  } catch(err) {
    if(token===seq) {stop();$("status").textContent="资源读取失败 · "+err.message}
  }
}
function move(t) {stop();state.t=Math.max(0,Math.min(28,t));render()}
$("prev").onclick=()=>move(state.t-1);$("next").onclick=()=>move(state.t+1);
$("startpoint").onclick=()=>move(0);$("endpoint").onclick=()=>move(28);
$("play").onclick=()=>{if(state.running){stop();return}state.running=true;$("play").textContent="暂停";render()};
$("frame").oninput=e=>move(Number(e.target.value)-1);
$("case").onchange=e=>{stop();state.c=Number(e.target.value);state.ref=state.mark=-1;render()};
$("camera").onchange=e=>chooseCamera(Number(e.target.value));
for(const id of ["boxes","trail","reference"]) $(id).onchange=()=>{stop();render()};
$("raw").onclick=()=>{
  stop();const show=!["boxes","trail","reference"].some(id=>$(id).checked);
  for(const id of ["boxes","trail","reference"]) $(id).checked=show;
  render();
};
Promise.all([json("checks.json"),json("motion.json")]).then(([c,m])=>{check=c;marks=m;render()}).catch(e=>{$("status").textContent="无法加载核对记录 · "+e.message});
