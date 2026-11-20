(async () => {
  const byId = id => document.getElementById(id);
  const movie = byId('movie'), scene = byId('scene'), view = byId('view');
  const response = await fetch('videos.json');
  if (!response.ok) throw Error('场景清单加载失败');
  const {scenes, fps, frames} = await response.json();
  const rows = new Map(scenes.map(row => [row.id, row]));
  const clamp = n => Math.min(frames - 1, Math.max(0, n));
  const index = () => clamp(Math.floor(movie.currentTime * fps + 0.0001));
  let selection;
  function counter() {
    const n = index();
    byId('counter').textContent = '第 ' + (n+1) + ' / ' + frames + ' 帧 · ' + (n < 29 ? 'A' + (n+1) : 'B' + (n-27));
  }
  function seek(n) {
    if (movie.readyState < 1) return;
    movie.pause();
    movie.currentTime = (clamp(n) + 0.5) / fps;
  }
  function render() {
    const [id, key] = location.hash.slice(1).split('/');
    const row = rows.get(id) || scenes[0];
    const mode = key === 'six' ? 'six' : 'rear';
    const clip = row.media[mode];
    if (movie.getAttribute('src') !== clip.src) {
      const same = selection?.id === row.id;
      const time = same ? movie.currentTime : 0;
      const resume = same && !movie.paused && !movie.ended;
      movie.pause();
      movie.onloadedmetadata = () => {
        if (time > 0) movie.currentTime = Math.min(time, (frames - 0.5)/fps);
        if (resume) movie.play().catch(() => {});
      };
      movie.poster = clip.poster;
      movie.src = clip.src;
      movie.load();
    }
    selection = row;
    movie.className = mode;
    scene.value = row.id;
    view.value = mode;
    byId('download').href = clip.src;
    byId('seed').textContent = '种子 ' + row.seed;
    counter();
  }
  function choose(id,mode) {
    history.replaceState(null, '', '#' + id + '/' + mode);
    render();
  }
  for (const control of [scene,view]) control.onchange = () => choose(scene.value,view.value);
  document.querySelectorAll('.pick').forEach(a => a.onclick = ev => {
    ev.preventDefault(); choose(a.dataset.scene,view.value); byId('viewer').scrollIntoView();
  });
  byId('prev').onclick = () => seek(index()-1);
  byId('next').onclick = () => seek(index()+1);
  byId('junction').onclick = () => seek(28);
  for (const event of ['loadeddata','timeupdate','seeked','ended']) movie.addEventListener(event,counter);
  window.addEventListener('hashchange',render);
  render();
})().catch(err => {document.getElementById('counter').textContent=err.message});
