(() => {
  'use strict';
  const cards = [...document.querySelectorAll('article[data-complete]')];
  const layout = document.querySelector('#comparison-layout');
  layout.addEventListener('change', () => document.body.classList.toggle('layout-rows', layout.value === 'rows'));
  const complete = document.querySelector('#complete-only');
  const search = document.querySelector('#scene-search');
  function filter() {
    const term = search.value.trim().toLowerCase();
    let count = 0;
    for (const card of cards) {
      card.hidden = (complete.checked && card.dataset.complete !== 'true') || !card.textContent.toLowerCase().includes(term);
      if (card.hidden) card.querySelectorAll('video').forEach(v => v.pause());
      else count++;
    }
    for (const category of document.querySelectorAll('section[id^="category-"]')) {
      category.hidden = ![...category.querySelectorAll('article')].some(card => !card.hidden);
    }
    document.querySelector('#filter-count').textContent = `显示 ${count} / ${cards.length} 个场景`;
  }
  complete.addEventListener('change', filter);
  search.addEventListener('input', filter);
  filter();
  function loaded(video) {
    if (video.readyState >= 1) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error('视频加载超时')), 30000);
      const ready = () => finish();
      const failed = () => finish(new Error('视频加载失败'));
      function finish(error) {
        clearTimeout(timer);
        video.removeEventListener('loadedmetadata', ready);
        video.removeEventListener('error', failed);
        error ? reject(error) : resolve();
      }
      video.addEventListener('loadedmetadata', ready);
      video.addEventListener('error', failed);
      video.load();
    });
  }
  for (const card of cards) {
    const videos = [...card.querySelectorAll('.four-models video')];
    const status = card.querySelector('.frame-status');
    let operation = 0;
    card.querySelector('.scene-actions').addEventListener('click', async event => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      const token = ++operation;
      videos.forEach(v => v.pause());
      if (action === 'pause') { status.textContent = '已暂停'; return; }
      status.textContent = '加载对应视频…';
      try {
        await Promise.all(videos.map(loaded));
        if (token !== operation) return;
        const frame = action === 'play' ? 0 : Math.max(0, Math.min(28, Math.round(videos[0].currentTime * 10) + (action === 'next' ? 1 : -1)));
        videos.forEach(v => { v.currentTime = (frame + .02) / 10; });
        if (action === 'play') {
          videos.forEach(v => { v.muted = true; v.playbackRate = 1; });
          await Promise.all(videos.map(v => v.play()));
          status.textContent = '同步播放 · 按展示帧序比较';
        } else status.textContent = `第 ${frame + 1} / 29 帧`;
      } catch (error) {
        videos.forEach(v => v.pause());
        status.textContent = `${error.message}，可用原生播放按钮重试`;
      }
    });
    card.querySelector('.example-toggle').addEventListener('toggle', event => {
      if (!event.target.open) { operation++; videos.forEach(v => v.pause()); }
    });
  }
})();
