// Resume Reading — localStorage
(function () {
  const STORAGE_KEY = 'schaden-resume';

  function getResumeData() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  // Save current chapter if on a chapter page
  const article = document.querySelector('article.chapter');
  if (article) {
    const novel = article.dataset.novel;
    const data = getResumeData();
    data[novel] = {
      title: article.dataset.novelTitle,
      chapter: article.dataset.chapterTitle,
      url: article.dataset.chapterUrl,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // Populate resume dropdown
  const menu = document.getElementById('resume-menu');
  const toggle = document.querySelector('.dropdown-toggle');
  if (menu && toggle) {
    const data = getResumeData();
    const entries = Object.values(data);

    if (entries.length === 0) {
      menu.innerHTML = '<li class="empty">Nessun capitolo salvato</li>';
    } else {
      entries.sort((a, b) => a.title.localeCompare(b.title));
      menu.innerHTML = entries
        .map((e) => `<li><a href="${e.url}">${e.title} — ${e.chapter}</a></li>`)
        .join('');
    }

    toggle.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const isOpen = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen);
    });

    document.addEventListener('click', () => {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  }

  // Keyboard navigation: Cmd+Arrow on chapter pages
  if (article) {
    document.addEventListener('keydown', (e) => {
      if (!e.metaKey) return;
      if (e.key === 'ArrowLeft') {
        const prev = document.getElementById('prev-chapter');
        if (prev) { e.preventDefault(); window.location.href = prev.href; }
      } else if (e.key === 'ArrowRight') {
        const next = document.getElementById('next-chapter');
        if (next) { e.preventDefault(); window.location.href = next.href; }
      }
    });
  }
})();

// Reader Settings
(function () {
  var SETTINGS_KEY = 'schaden-settings';
  var SYSTEM_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  var DEFAULTS = {
    theme: 'auto',
    font: 'System',
    fontSize: 18,
    lineHeight: 1.8,
    maxWidth: 720,
  };

  var FONT_MAP = {
    'System': SYSTEM_FONT,
    'Literata': '"Literata", serif',
    'Merriweather': '"Merriweather", serif',
    'Lora': '"Lora", serif',
    'Source Serif 4': '"Source Serif 4", serif',
    'Atkinson Hyperlegible Next': '"Atkinson Hyperlegible Next", sans-serif',
  };

  function getSettings() {
    try {
      var stored = JSON.parse(localStorage.getItem(SETTINGS_KEY));
      return Object.assign({}, DEFAULTS, stored);
    } catch (e) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function saveSettings(s) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  }

  function applySettings(s) {
    var root = document.documentElement;

    // Theme
    root.setAttribute('data-theme', s.theme);

    // Reader CSS variables
    root.style.setProperty('--reader-font-size', s.fontSize + 'px');
    root.style.setProperty('--reader-line-height', String(s.lineHeight));
    root.style.setProperty('--reader-font', FONT_MAP[s.font] || SYSTEM_FONT);
    root.style.setProperty('--reader-max-width', s.maxWidth + 'px');
  }

  function updateUI(s) {
    // Theme swatches
    document.querySelectorAll('.theme-swatch').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.theme === s.theme);
    });

    // Font select
    var fontSelect = document.getElementById('setting-font');
    if (fontSelect) fontSelect.value = s.font;

    // Size value
    var sizeVal = document.getElementById('size-value');
    if (sizeVal) sizeVal.textContent = s.fontSize;

    // Line height value
    var lhVal = document.getElementById('lh-value');
    if (lhVal) lhVal.textContent = s.lineHeight.toFixed(1);

    // Width buttons
    document.querySelectorAll('.width-btn').forEach(function (btn) {
      btn.classList.toggle('active', Number(btn.dataset.width) === s.maxWidth);
    });
  }

  function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }

  // Apply immediately (before DOM ready) for theme to avoid flash
  var settings = getSettings();
  applySettings(settings);

  // Init UI once DOM is ready
  document.addEventListener('DOMContentLoaded', function () {
    var s = getSettings();
    updateUI(s);

    function update(changes) {
      Object.assign(s, changes);
      applySettings(s);
      updateUI(s);
      saveSettings(s);
    }

    // Settings panel toggle
    var panelToggle = document.getElementById('settings-toggle');
    var panel = document.getElementById('settings-panel');
    if (panelToggle && panel) {
      panelToggle.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var isOpen = panel.classList.toggle('open');
        panelToggle.setAttribute('aria-expanded', isOpen);
      });

      panel.addEventListener('click', function (ev) {
        ev.stopPropagation();
      });

      document.addEventListener('click', function () {
        panel.classList.remove('open');
        panelToggle.setAttribute('aria-expanded', 'false');
      });
    }

    // Theme swatches
    document.querySelectorAll('.theme-swatch').forEach(function (btn) {
      btn.addEventListener('click', function () {
        update({ theme: btn.dataset.theme });
      });
    });

    // Font select
    var fontSelect = document.getElementById('setting-font');
    if (fontSelect) {
      fontSelect.addEventListener('change', function () {
        update({ font: fontSelect.value });
      });
    }

    // Font size stepper
    var sizeDown = document.getElementById('size-down');
    var sizeUp = document.getElementById('size-up');
    if (sizeDown) sizeDown.addEventListener('click', function () {
      update({ fontSize: clamp(s.fontSize - 2, 14, 28) });
    });
    if (sizeUp) sizeUp.addEventListener('click', function () {
      update({ fontSize: clamp(s.fontSize + 2, 14, 28) });
    });

    // Line height stepper
    var lhDown = document.getElementById('lh-down');
    var lhUp = document.getElementById('lh-up');
    if (lhDown) lhDown.addEventListener('click', function () {
      update({ lineHeight: clamp(Math.round((s.lineHeight - 0.2) * 10) / 10, 1.4, 2.6) });
    });
    if (lhUp) lhUp.addEventListener('click', function () {
      update({ lineHeight: clamp(Math.round((s.lineHeight + 0.2) * 10) / 10, 1.4, 2.6) });
    });

    // Width presets
    document.querySelectorAll('.width-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        update({ maxWidth: Number(btn.dataset.width) });
      });
    });
  });
})();
