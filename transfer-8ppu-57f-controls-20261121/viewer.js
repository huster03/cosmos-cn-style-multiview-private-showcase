(() => {
  const el = id => document.getElementById(id);
  const rows = JSON.parse(el('rows').textContent);
  const entries = new Map(rows.map(r => [r.arm+'-'+r.id,r]));
  const movie = el('movie');
  function render() {
    const row = entries.get(location.hash.slice(1)) || rows[0];
    const before = movie.getAttribute('src');
    if (before !== row.src) {
      movie.pause();
      movie.poster = row.poster;
      movie.src = row.src;
      movie.load();
    }
    el('case').value = row.arm+'-'+row.id;
    el('download').href = row.src;
    el('title').textContent = row.title;
    el('prompt').textContent = row.prompt;
    el('sample').textContent = row.sample+' · 两段种子 '+row.seed+' / '+(row.seed+1);
  }
  function choose(key) { history.replaceState(null,'','#'+key); render(); }
  el('case').onchange = () => choose(el('case').value);
  document.querySelectorAll('.pick').forEach(a => a.onclick = e => {
    e.preventDefault(); choose(a.dataset.key); el('viewer').scrollIntoView();
  });
  const index=()=>Math.max(0,Math.min(56,Math.floor(movie.currentTime*10+0.00001)));
  function seek(t) {
    if (movie.readyState < 1) return;
    movie.pause();
    movie.currentTime = (Math.max(0,Math.min(56,t)) + 0.5) / 10;
  }
  el('prev').onclick=()=>seek(index()-1);
  el('next').onclick=()=>seek(index()+1);
  el('seam').onclick=()=>seek(28);
  for (const e of ['loadeddata','timeupdate','seeked','ended']) movie.addEventListener(e,()=>{
    const t=index(); el('counter').textContent='第 '+(t+1)+' / 57 帧 · '+(t<29?'A'+(t+1):'B'+(t-27));
  });
  window.addEventListener('hashchange',render);
  render();
})();
