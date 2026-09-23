(() => {
  'use strict';
  const cards = Array.from(document.querySelectorAll('article > details.example-toggle'));
  const toolbar = document.getElementById('example-display-controls');
  if (!cards.length || !toolbar) return;
  const key = 'cosmos-example-collapse-v1:' + location.pathname;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch (_) {}
  for (const card of cards) {
    const id = card.parentElement.id;
    if (typeof saved[id] === 'boolean') card.open = saved[id];
  }
  function update() {
    const state = {};
    let expanded = 0;
    for (const card of cards) {
      state[card.parentElement.id] = card.open;
      if (card.open) expanded++;
    }
    document.getElementById('example-display-count').textContent = `已展开 ${expanded} / ${cards.length}`;
    try { localStorage.setItem(key, JSON.stringify(state)); } catch (_) {}
  }
  for (const card of cards) {
    card.addEventListener('toggle', () => {
      if (!card.open) card.querySelectorAll('video').forEach(video => video.pause());
      update();
    });
  }
  function setAll(open) {
    for (const card of cards) {
      card.open = open;
      if (!open) card.querySelectorAll('video').forEach(video => video.pause());
    }
    update();
  }
  document.getElementById('collapse-all-examples').addEventListener('click', () => setAll(false));
  document.getElementById('expand-all-examples').addEventListener('click', () => setAll(true));
  function revealHash() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
    const card = cards.find(item => item.parentElement.id === id);
    if (card) card.open = true;
    update();
  }
  window.addEventListener('hashchange', revealHash);
  toolbar.hidden = false;
  revealHash();
})();
