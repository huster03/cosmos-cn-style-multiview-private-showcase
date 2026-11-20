(async () => {
  const el = id => document.getElementById(id);
  const response = await fetch('results.json');
  if (!response.ok) throw Error('无法载入场景清单');
  const {scenes} = await response.json();
  const rows = new Map(scenes.map(r => [r.id, r]));
  function render() {
    const [id, clip] = location.hash.slice(1).split('/');
    const row = rows.get(id) || scenes[0];
    const frames = clip === '29' ? '29' : '57';
    const movie = el('movie');
    const file = row.media[frames].src;
    if (movie.getAttribute('src') !== file) {
      movie.pause();
      movie.poster = row.poster;
      movie.src = file;
      movie.load();
    }
    el('scene').value = row.id;
    el('frames').value = frames;
    el('download').href = file;
    el('prompt').textContent = row.prompt;
    el('cap').textContent = '增强文本 · seed ' + row.seed;
  }
  function choose(id,frames) {
    history.replaceState(null,'','#'+id+'/'+frames);
    render();
  }
  el('scene').onchange = el('frames').onchange = () => choose(el('scene').value,el('frames').value);
  document.querySelectorAll('.pick').forEach(link => link.onclick = event => {
    event.preventDefault();
    choose(link.dataset.id,el('frames').value);
    el('viewer').scrollIntoView({block:'start'});
  });
  window.addEventListener('hashchange',render);
  render();
})().catch(error => {document.getElementById('cap').textContent = error.message;});
