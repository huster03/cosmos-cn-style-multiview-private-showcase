'use strict';

(() => {
  const $ = id => document.getElementById(id);
  const arms = ['baseline', 'global'];
  const videos = Object.fromEntries(arms.map(a => [a, $(`video-${a}`)]));
  const canvases = Object.fromEntries(arms.map(a => [a, $(`canvas-${a}`)]));
  const coords = {CAM_L0:[0,0,832,480], CAM_F0:[832,0,832,480], CAM_R0:[1664,0,832,480],
    CAM_L2:[0,480,832,480], CAM_B0:[832,480,832,480], CAM_R2:[1664,480,832,480]};
  const names = {CAM_L0:'左前',CAM_F0:'前方',CAM_R0:'右前',CAM_L2:'左后',CAM_B0:'正后方',CAM_R2:'右后'};
  const gridOrder = ['CAM_L0','CAM_F0','CAM_R0','CAM_L2','CAM_B0','CAM_R2'];
  let manifest, current, caseIndex = 0, duration = 29, frameIndex = 0;
  let playing = false, raf = null, version = 0, zoomCamera = 'CAM_B0';
  let seeking = false, requestedFrame = null, seekTask = null;
  let loading = false, loadAgain = false, loadTask = null;
  const status = text => { $('status').textContent = text; };

  function fail(error) {
    stop(); $('error').hidden = false;
    $('error').textContent = `读取失败：${error.message || error}\n请刷新页面重试，或通过下载链接获取拼接 MP4。`;
    status('未能完成显示');
  }

  function setCanvasSize(canvas, width, height) {
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
  }

  function paintCrop(canvas, video, crop) {
    const [x,y,width,height] = crop;
    setCanvasSize(canvas, width, height * 2);
    const context = canvas.getContext('2d');
    if (video.readyState >= 2) {
      context.drawImage(video, x,y,width,height, 0,0,width,height);
      context.drawImage(video, x,y + 960,width,height, 0,height,width,height);
    }
  }

  function paint() {
    const view = $('view').value;
    const crop = view === 'grid' ? [0,0,2496,960] : view === 'rear' ? [0,480,2496,480] : coords[view];
    for (const arm of arms) {
      paintCrop(canvases[arm], videos[arm], crop);
      if ($('zoom-dialog').open) paintCrop($(`zoom-${arm}`), videos[arm], coords[zoomCamera]);
    }
    $('frame').value = String(frameIndex);
    $('frame-label').textContent = `${String(frameIndex + 1).padStart(2,'0')} / ${duration}`;
    $('time-label').textContent = `${(frameIndex / 10).toFixed(1)} s${duration === 57 && frameIndex >= 29 ? ' · 续段' : ' · 首段'}`;
    $('zoom-frame').textContent = `${frameIndex + 1} / ${duration} · ${(frameIndex / 10).toFixed(1)} s`;
  }

  function stop() {
    playing = false; for (const video of Object.values(videos)) video.pause();
    if (raf !== null) cancelAnimationFrame(raf); raf = null;
    $('play').textContent = '▶ 同步播放'; $('play').setAttribute('aria-label','同步播放');
  }

  function onceReady(video, target) {
    return new Promise((resolve, reject) => {
      let timer;
      const clean = () => { clearTimeout(timer); video.removeEventListener('seeked',done); video.removeEventListener('error',bad); };
      const done = () => {
        clean();
        if (Math.abs(video.currentTime - target) > .055) return reject(new Error('视频未定位到请求帧，请刷新页面后重试。'));
        resolve();
      };
      const bad = () => { clean(); reject(new Error('视频定位失败')); };
      if (Math.abs(video.currentTime - target) < .001 && video.readyState >= 2 && !video.seeking) return resolve();
      video.addEventListener('seeked',done,{once:true}); video.addEventListener('error',bad,{once:true});
      timer = setTimeout(() => { clean(); reject(new Error('等待视频定位超时')); },20000);
      video.currentTime = target;
    });
  }

  async function seek(frame, pause = true, fromLoad = false) {
    if (!current || (loading && !fromLoad)) return;
    if (pause) stop();
    requestedFrame = Math.max(0,Math.min(duration - 1,Math.round(frame)));
    if (seeking) return seekTask;
    seeking = true;
    seekTask = (async () => {
      try {
        while (requestedFrame !== null) {
          const requested = requestedFrame, ownVersion = version; requestedFrame = null;
          status('同步定位…');
          // Position inside a frame, not on an encoder timestamp boundary.
          await Promise.all(arms.map(arm => onceReady(videos[arm], (requested + .25) / 10)));
          if (ownVersion !== version) return;
          frameIndex = requested; paint(); status('两组同帧显示');
        }
      } catch (error) { fail(error); }
      finally { seeking = false; seekTask = null; }
    })();
    return seekTask;
  }

  function animate() {
    if (!playing) return;
    const master = videos.baseline, slave = videos.global;
    if (master.ended || master.currentTime >= duration / 10 - .02) {
      stop();
      if ($('loop').checked) seek(0).then(play);
      else { frameIndex = duration - 1; paint(); status('播放完成'); }
      return;
    }
    if (!slave.seeking && Math.abs(slave.currentTime - master.currentTime) > .055) slave.currentTime = master.currentTime;
    frameIndex = Math.min(duration - 1,Math.floor(master.currentTime * 10 + .0001));
    paint(); status('同步播放中'); raf = requestAnimationFrame(animate);
  }

  async function play() {
    if (!current || playing || loading) return;
    try {
      if (seeking) await seekTask;
      if (frameIndex === duration - 1) await seek(0);
      await Promise.all(arms.map(arm => videos[arm].play()));
      playing = true; $('play').textContent = 'Ⅱ 暂停'; $('play').setAttribute('aria-label','暂停');
      animate();
    } catch (error) { fail(error); }
  }

  function setSource(video, source) {
    return new Promise((resolve, reject) => {
      let timer;
      const clean = () => { clearTimeout(timer); video.removeEventListener('loadeddata',done); video.removeEventListener('error',bad); };
      const done = () => {
        clean();
        if (video.videoWidth !== 2496 || video.videoHeight !== 1920) return reject(new Error('生成与控制拼接视频尺寸异常'));
        resolve();
      };
      const bad = () => { clean(); reject(new Error(`无法解码视频：${source}`)); };
      video.addEventListener('loadeddata',done,{once:true}); video.addEventListener('error',bad,{once:true});
      timer = setTimeout(() => { clean(); reject(new Error(`视频加载超时：${source}`)); },30000);
      video.src = source; video.load();
    });
  }

  async function loadVideos() {
    stop(); loadAgain = true;
    if (loading) return loadTask;
    loading = true;
    for (const id of ['play','frame','previous-frame','next-frame','zoom-previous','zoom-next']) $(id).disabled = true;
    loadTask = (async () => {
      try {
        // Finish any seek on the old sources before replacing them. Repeated
        // navigation requests coalesce into the latest selected case/duration.
        if (seeking) await seekTask;
        do {
          loadAgain = false; $('error').hidden = true; requestedFrame = null;
          ++version; status('加载两组视频…');
          const selected = current, framesNow = duration;
          $('frame').max = String(framesNow - 1); $('frame').value = '0'; frameIndex = 0;
          $('boundary-note').hidden = framesNow !== 57;
          for (const frames of [29,57]) {
            $(`duration${frames}`).classList.toggle('active',framesNow === frames);
            $(`duration${frames}`).setAttribute('aria-pressed',String(framesNow === frames));
          }
          await Promise.all(arms.map(arm => {
            const asset = selected.variants[arm][String(framesNow)];
            const link = $(`download-${arm}`); link.href = asset.src; link.download = `${selected.id}__${arm}-${framesNow}f-with-control.mp4`;
            return setSource(videos[arm],asset.src);
          }));
          if (loadAgain) continue;
          await seek(0,true,true);
          if (!loadAgain) updateHash();
        } while (loadAgain);
      } catch (error) { fail(error); }
      finally {
        loading = false; loadTask = null;
        for (const id of ['play','frame','previous-frame','next-frame','zoom-previous','zoom-next']) $(id).disabled = false;
      }
    })();
    return loadTask;
  }

  function updateHash() {
    history.replaceState(null,'',`#${current.id}/${duration}/${$('view').value}`);
  }

  async function restoreHash() {
    if (!manifest) return;
    const parts = decodeURIComponent(location.hash.slice(1)).split('/');
    const index = manifest.cases.findIndex(row => row.id === parts[0]);
    duration = parts[1] === '57' ? 57 : 29;
    $('view').value = ['grid','rear',...Object.keys(coords)].includes(parts[2]) ? parts[2] : 'grid';
    await selectCase(index < 0 ? 0 : index);
  }

  async function selectCase(index) {
    if (!manifest || index < 0 || index >= manifest.cases.length) return;
    caseIndex = index; current = manifest.cases[index];
    [...$('case-list').children].forEach((button,i) => { button.classList.toggle('active',i === index); button.setAttribute('aria-pressed',String(i === index)); });
    $('previous-case').disabled = index === 0; $('next-case').disabled = index === manifest.cases.length - 1;
    $('case-number').textContent = `场景 ${String(index + 1).padStart(2,'0')} / ${manifest.cases.length}`;
    $('case-title').textContent = current.title; $('case-meta').textContent = `${current.id} · Seed ${current.seed} · EMA 7000`;
    $('prompt-original').textContent = current.original_prompt; $('prompt-global').textContent = current.global_prompt;
    $('change-summary').textContent = current.change_summary_zh;
    $('case-source').textContent = JSON.stringify({source_front:current.source_front,source_control:current.source_control,
      input_provenance:manifest.input_provenance,front_policy:manifest.front_policy,continuation_policy:manifest.continuation_policy,
      validation_summary:manifest.validation_summary},null,2);
    await loadVideos();
  }

  function openZoom(event,canvas) {
    if (!current) return;
    const view = $('view').value;
    if (view === 'grid' || view === 'rear') {
      const rect = canvas.getBoundingClientRect();
      const col = Math.min(2,Math.max(0,Math.floor((event.clientX - rect.left) / rect.width * 3)));
      // Both the generated half and the control half use the same camera grid.
      const vertical = Math.min(.999999,Math.max(0,(event.clientY - rect.top) / rect.height));
      const withinHalf = (vertical * 2) % 1;
      const row = view === 'rear' ? 1 : Math.min(1,Math.floor(withinHalf * 2));
      zoomCamera = gridOrder[row * 3 + col];
    } else zoomCamera = view;
    $('zoom-title').textContent = `${names[zoomCamera]} · ${zoomCamera} · 上生成 / 下控制`;
    $('zoom-dialog').showModal(); paint();
  }

  async function init() {
    try {
      const response = await fetch('manifest.json'); if (!response.ok) throw new Error(`清单读取失败：HTTP ${response.status}`);
      manifest = await response.json();
      if (manifest.cases.length !== 10 || manifest.videos !== 40) throw new Error('应有十例、四十段对照视频');
      $('fixture-banner').hidden = !manifest.fixture;
      if (manifest.fixture) document.title = '测试夹具 · 非本次实验结果';
      manifest.cases.forEach((row,i) => {
        const button = document.createElement('button'); button.className = 'case-card'; button.type = 'button';
        button.setAttribute('aria-label',`场景 ${i + 1}：${row.title}`); button.setAttribute('aria-pressed','false');
        const image = document.createElement('img'); image.src = row.poster; image.alt = ''; image.loading = 'lazy';
        const title = document.createElement('span'); title.textContent = `${String(i + 1).padStart(2,'0')} · ${row.title}`;
        button.append(image,title); button.addEventListener('click',() => selectCase(i)); $('case-list').append(button);
      });
      await restoreHash();
    } catch (error) { fail(error); }
  }

  $('play').addEventListener('click',() => playing ? (stop(),seek(frameIndex)) : play());
  $('frame').addEventListener('input',event => seek(Number(event.target.value)));
  $('previous-frame').addEventListener('click',() => seek(frameIndex - 1));
  $('next-frame').addEventListener('click',() => seek(frameIndex + 1));
  $('zoom-previous').addEventListener('click',() => seek(frameIndex - 1));
  $('zoom-next').addEventListener('click',() => seek(frameIndex + 1));
  $('previous-case').addEventListener('click',() => selectCase(caseIndex - 1));
  $('next-case').addEventListener('click',() => selectCase(caseIndex + 1));
  for (const frames of [29,57]) $(`duration${frames}`).addEventListener('click',() => { if (duration !== frames) { duration = frames; loadVideos(); } });
  $('view').addEventListener('change',() => { paint(); if (current) updateHash(); });
  $('rear-focus').addEventListener('click',() => { $('view').value = 'rear'; paint(); if (current) updateHash(); });
  for (const arm of arms) $(`open-${arm}`).addEventListener('click',event => openZoom(event,canvases[arm]));
  $('close-zoom').addEventListener('click',() => $('zoom-dialog').close());
  document.addEventListener('keydown',event => {
    if (['INPUT','SELECT','TEXTAREA','BUTTON'].includes(event.target.tagName)) return;
    if (event.code === 'Space') { event.preventDefault(); playing ? (stop(),seek(frameIndex)) : play(); }
    if (event.code === 'ArrowRight') { event.preventDefault(); seek(frameIndex + 1); }
    if (event.code === 'ArrowLeft') { event.preventDefault(); seek(frameIndex - 1); }
  });
  window.addEventListener('hashchange',() => restoreHash().catch(fail));
  init();
})();
