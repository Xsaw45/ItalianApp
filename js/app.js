/**
 * Main application entry point.
 */
import { registerRoutes, initRouter, navigate } from './router.js';
import { loadManifest } from './data-loader.js';
import { renderHomeView } from './views/home.js';
import { renderSchedaView } from './views/scheda.js';
import { renderStatsView } from './views/stats.js';
import { renderVocabView } from './views/vocab.js';
import { renderConjugationView } from './views/conjugation.js';
import { renderTranslationView } from './views/translation.js';
import { getSettings, updateSettings, getSchedaProgress, loadState, saveState } from './state.js';
import { t, getLanguage, setLanguage, localName } from './i18n.js';
import { el, clearElement } from './utils/dom.js';

// Route handlers
function handleHome() {
  renderHomeView();
}

function handleScheda(params) {
  renderSchedaView(params.id, 'theory');
}

function handleSchedaExercises(params) {
  renderSchedaView(params.id, 'exercises');
}

function handleStats() {
  renderStatsView();
}

function handleVocab() {
  renderVocabView('list');
}

function handleConj() {
  renderConjugationView('list');
}

function handleTranslation() {
  renderTranslationView('list');
}

// Re-render the current view based on hash
function renderCurrentView() {
  const hash = window.location.hash.replace('#', '') || '/home';
  const schedaMatch = hash.match(/^\/scheda\/([^/]+)\/exercises$/);
  const schedaMatchTheory = hash.match(/^\/scheda\/([^/]+)$/);
  if (hash === '/home' || hash === '') {
    renderHomeView();
  } else if (hash === '/stats') {
    renderStatsView();
  } else if (hash === '/vocab') {
    renderVocabView('list');
  } else if (hash === '/conjugation') {
    renderConjugationView('list');
  } else if (hash === '/translation') {
    renderTranslationView('list');
  } else if (schedaMatch) {
    renderSchedaView(schedaMatch[1], 'exercises');
  } else if (schedaMatchTheory) {
    renderSchedaView(schedaMatchTheory[1], 'theory');
  } else {
    renderHomeView();
  }
}

// Initialize
async function init() {
  // Apply saved settings
  const settings = getSettings();
  if (settings.darkMode) {
    document.body.classList.add('dark');
  }

  // Apply saved language
  document.documentElement.lang = getLanguage();

  // Setup sidebar
  await buildSidebar();

  // Setup hamburger menu
  setupMobileMenu();

  // Setup settings
  setupSettings();

  // Setup language toggle
  setupLangToggle();

  // Register routes
  registerRoutes({
    '/home': handleHome,
    '/stats': handleStats,
    '/vocab': handleVocab,
    '/conjugation': handleConj,
    '/translation': handleTranslation,
    '/scheda/:id': handleScheda,
    '/scheda/:id/exercises': handleSchedaExercises,
  });

  // Start router
  initRouter();

  // Re-render on language change
  window.addEventListener('languagechange', async () => {
    document.documentElement.lang = getLanguage();
    updateLangToggleBtn();
    await buildSidebar();
    renderCurrentView();
  });
}

async function buildSidebar() {
  const nav = document.getElementById('sidebarNav');
  if (!nav) return;
  clearElement(nav);

  try {
    const manifest = await loadManifest();

    // Home link
    const homeLink = el('a', {
      href: '#/home',
      className: 'sidebar-scheda-link',
      style: {
        paddingLeft: 'var(--space-sm)',
        fontWeight: '600',
        marginBottom: 'var(--space-md)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)'
      }
    }, `\u2302 ${t('nav.home')}`);
    nav.appendChild(homeLink);

    // Stats link
    const statsLink = el('a', {
      href: '#/stats',
      className: 'sidebar-scheda-link',
      style: {
        paddingLeft: 'var(--space-sm)',
        fontWeight: '600',
        marginBottom: 'var(--space-md)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)'
      }
    }, `\u2211 ${t('nav.stats')}`);
    nav.appendChild(statsLink);

    // Vocab link
    const vocabLink = el('a', {
      href: '#/vocab',
      className: 'sidebar-scheda-link',
      style: {
        paddingLeft: 'var(--space-sm)',
        fontWeight: '600',
        marginBottom: 'var(--space-md)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)'
      }
    }, t('nav.vocab'));
    nav.appendChild(vocabLink);

    // Conjugation link
    const conjLink = el('a', {
      href: '#/conjugation',
      className: 'sidebar-scheda-link',
      style: {
        paddingLeft: 'var(--space-sm)',
        fontWeight: '600',
        marginBottom: 'var(--space-md)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)'
      }
    }, t('nav.conj'));
    nav.appendChild(conjLink);

    // Translation link
    const translLink = el('a', {
      href: '#/translation',
      className: 'sidebar-scheda-link',
      style: {
        paddingLeft: 'var(--space-sm)',
        fontWeight: '600',
        marginBottom: 'var(--space-xl)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)'
      }
    }, t('nav.translation'));
    nav.appendChild(translLink);

    // Categories
    for (const category of manifest.categories) {
      const cat = el('div', { className: 'sidebar-category' });

      const header = el('button', {
        className: 'sidebar-category-header',
        onClick: () => cat.classList.toggle('open')
      });
      header.appendChild(el('span', {}, localName(category, 'name')));
      header.appendChild(el('span', { className: 'chevron' }, '\u25B6'));
      cat.appendChild(header);

      const list = el('ul', { className: 'sidebar-scheda-list' });
      for (const schedaId of category.schede) {
        const info = manifest.schede[schedaId];
        if (!info) continue;

        const status = getSchedaProgress(String(schedaId), info.exerciseCount);
        const dotClass = status === 'completed' ? 'completed' : status === 'in-progress' ? 'started' : '';

        const li = el('li', { className: 'sidebar-scheda-item' });
        const link = el('a', {
          href: `#/scheda/${schedaId}`,
          className: 'sidebar-scheda-link',
          dataset: { schedaId: String(schedaId) }
        });
        link.appendChild(el('span', { className: `progress-dot ${dotClass}` }));
        link.appendChild(el('span', {}, `${schedaId}. ${localName(info, 'title')}`));
        li.appendChild(link);
        list.appendChild(li);
      }

      cat.appendChild(list);
      nav.appendChild(cat);
    }
  } catch (err) {
    nav.textContent = t('sidebar.error');
  }
}

function setupMobileMenu() {
  const hamburger = document.getElementById('hamburgerBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  if (!hamburger || !sidebar || !overlay) return;

  function toggleMenu() {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  }

  function closeMenu() {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  }

  hamburger.addEventListener('click', toggleMenu);
  overlay.addEventListener('click', closeMenu);

  // Close menu when clicking any sidebar link
  sidebar.addEventListener('click', (e) => {
    if (e.target.closest('a')) closeMenu();
  });

  // Close menu on navigation
  window.addEventListener('hashchange', closeMenu);
}

function setupSettings() {
  const settingsBtn = document.getElementById('settingsBtn');
  if (!settingsBtn) return;

  settingsBtn.addEventListener('click', () => {
    showSettingsModal();
  });
}

function setupLangToggle() {
  const btn = document.getElementById('langToggleBtn');
  if (!btn) return;
  updateLangToggleBtn();
  btn.addEventListener('click', () => {
    const current = getLanguage();
    setLanguage(current === 'it' ? 'fr' : 'it');
  });
}

function updateLangToggleBtn() {
  const btn = document.getElementById('langToggleBtn');
  if (!btn) return;
  // Show the flag of the OTHER language (the one you'd switch to)
  btn.textContent = getLanguage() === 'it' ? '🇫🇷' : '🇮🇹';
}

function showSettingsModal() {
  // Remove existing
  const existing = document.querySelector('.modal-overlay');
  if (existing) existing.remove();

  const settings = getSettings();

  const overlay = el('div', { className: 'modal-overlay active' });
  const modal = el('div', { className: 'modal' });

  modal.appendChild(el('h3', { className: 'modal-title' }, t('settings.title')));

  // Dark mode toggle
  const darkRow = el('div', { className: 'toggle-row' });
  darkRow.appendChild(el('span', { className: 'toggle-label' }, t('settings.dark')));
  const darkToggle = el('label', { className: 'toggle' });
  const darkInput = el('input', {
    type: 'checkbox',
    ...(settings.darkMode ? { checked: 'checked' } : {})
  });
  if (settings.darkMode) darkInput.checked = true;
  darkInput.addEventListener('change', () => {
    const dark = darkInput.checked;
    document.body.classList.toggle('dark', dark);
    updateSettings({ darkMode: dark });
  });
  const darkSlider = el('span', { className: 'toggle-slider' });
  darkToggle.appendChild(darkInput);
  darkToggle.appendChild(darkSlider);
  darkRow.appendChild(darkToggle);
  modal.appendChild(darkRow);

  // Strict accents toggle
  const accentRow = el('div', { className: 'toggle-row' });
  accentRow.appendChild(el('span', { className: 'toggle-label' }, t('settings.accents')));
  const accentToggle = el('label', { className: 'toggle' });
  const accentInput = el('input', { type: 'checkbox' });
  if (settings.strictAccents) accentInput.checked = true;
  accentInput.addEventListener('change', () => {
    updateSettings({ strictAccents: accentInput.checked });
  });
  const accentSlider = el('span', { className: 'toggle-slider' });
  accentToggle.appendChild(accentInput);
  accentToggle.appendChild(accentSlider);
  accentRow.appendChild(accentToggle);
  modal.appendChild(accentRow);

  // Accent explanation
  modal.appendChild(el('p', {
    style: {
      fontSize: 'var(--text-xs)',
      color: 'var(--color-text-muted)',
      marginTop: 'var(--space-sm)'
    }
  }, t('settings.accents.desc')));

  // Divider
  modal.appendChild(el('hr', { style: { margin: 'var(--space-lg) 0', border: 'none', borderTop: '1px solid var(--color-border-light)' } }));

  // Export progress button
  modal.appendChild(el('button', {
    className: 'btn btn-outline',
    style: { width: '100%', marginBottom: 'var(--space-sm)' },
    onClick: () => {
      const state = loadState();
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `italienapp-progressione-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, t('settings.export')));

  // Import progress button
  const importInput = el('input', { type: 'file', accept: '.json', style: { display: 'none' } });
  importInput.addEventListener('change', () => {
    const file = importInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (!imported.version || !imported.schede) {
          alert(t('settings.invalid.file'));
          return;
        }
        saveState(imported);
        overlay.remove();
        window.location.reload();
      } catch {
        alert(t('settings.import.error'));
      }
    };
    reader.readAsText(file);
  });
  modal.appendChild(importInput);

  modal.appendChild(el('button', {
    className: 'btn btn-outline',
    style: { width: '100%', marginBottom: 'var(--space-lg)' },
    onClick: () => importInput.click()
  }, t('settings.import')));

  // Close button
  const closeBtn = el('button', {
    className: 'btn btn-primary',
    style: { width: '100%' },
    onClick: () => overlay.remove()
  }, t('settings.close'));
  modal.appendChild(closeBtn);

  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}

// Start the app
init().catch(err => {
  console.error('App initialization error:', err);
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<p style="color:var(--color-incorrect);padding:2rem;">
      ${t('app.init.error')}${err.message}
    </p>`;
  }
});
