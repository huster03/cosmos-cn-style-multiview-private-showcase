(async () => {
  const el = id => document.getElementById(id);
  const response = await fetch('overlay-results.json');
  if (!response.ok) throw Error('无法载入场景清单');
  const {scenes} = await response.json();
  const rows = new Map(scenes.map(scene => [scene.id, scene]));
  const movie = el('movie');
  let selected;

  function render() {
    const [id, length, display] = location.hash.slice(1).split('/');
    const row = rows.get(id) || scenes[0];
    const frames = length === '29' ? '29' : '57';
    const mode = display === 'original' ? 'original' : 'overlay';
    const file = (mode === 'overlay' ? row.overlay : row.media)[frames].src;
    if (movie.getAttribute('src') !== file) {
      const keepTime = selected?.id === row.id && selected.frames === frames;
      const time = keepTime ? movie.currentTime : 0;
      const playing = keepTime && !movie.paused && !movie.ended;
      movie.pause();
      if (mode === 'overlay') movie.poster = row.overlay_poster;
      else movie.removeAttribute('poster');
      movie.onloadedmetadata = () => {
        if (time > 0) movie.currentTime = Math.min(time, (Number(frames) - 1) / 10);
        if (playing) movie.play().catch(() => {});
      };
      movie.src = file;
      movie.load();
    }
    selected = {id: row.id, frames};
    el('scene').value = row.id;
    el('frames').value = frames;
    el('display').value = mode;
    el('download').href = file;
    el('prompt').textContent = row.prompt;
    el('cap').textContent = '增强文本 · seed ' + row.seed;
  }

  function choose(id, frames, mode) {
    history.replaceState(null, '', '#' + [id, frames, mode].join('/'));
    render();
  }
  for (const id of ['scene', 'frames', 'display']) {
    el(id).onchange = () => choose(el('scene').value, el('frames').value, el('display').value);
  }
  document.querySelectorAll('.pick').forEach(link => link.onclick = event => {
    event.preventDefault();
    choose(link.dataset.id, el('frames').value, el('display').value);
    el('viewer').scrollIntoView({block: 'start'});
  });
  window.addEventListener('hashchange', render);
  render();
})().catch(error => {document.getElementById('cap').textContent = error.message;});
