(function () {
  'use strict';
  const CACHE_VERSION = '20260902-181700';
  const modules = ['js/app-01.js', 'js/app-02.js', 'js/app-03.js', 'js/app-04.js', 'js/app-05.js'];
  Promise.all(modules.map(async (path) => {
    const response = await fetch(path + '?v=' + CACHE_VERSION, { cache: 'no-store' });
    if (!response.ok) throw new Error('Не удалось загрузить ' + path);
    return response.text();
  }))
    .then((sources) => {
      // Chunks reconstruct the original IIFE, preserving its private state.
      (new Function(sources.join('\n') + '\n//# sourceURL=ashes-of-nations-runtime.js'))();
    })
    .catch((error) => {
      console.error('Не удалось запустить игру.', error);
      document.body.insertAdjacentHTML('beforeend', '<p style="position:fixed;inset:auto 16px 16px;z-index:9999;padding:12px;background:#401b1b;color:#fff;border:1px solid #e99">Ошибка загрузки модулей игры. Обновите страницу.</p>');
    });
})();


