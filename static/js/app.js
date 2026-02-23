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
