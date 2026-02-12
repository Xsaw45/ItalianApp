/**
 * Main application entry point.
 */
import { registerRoutes, initRouter, navigate } from './router.js';
import { loadManifest } from './data-loader.js';
import { renderHomeView } from './views/home.js';
import { renderSchedaView } from './views/scheda.js';
import { getSettings, updateSettings, getSchedaProgress } from './state.js';
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

// Initialize
async function init() {
  // Apply saved settings
  const settings = getSettings();
  if (settings.darkMode) {
    document.body.classList.add('dark');
  }

  // Setup sidebar
  await buildSidebar();

  // Setup hamburger menu
  setupMobileMenu();

  // Setup settings
  setupSettings();

  // Register routes
  registerRoutes({
    '/home': handleHome,
    '/scheda/:id': handleScheda,
    '/scheda/:id/exercises': handleSchedaExercises,
  });

  // Start router
  initRouter();
}

async function buildSidebar() {
  const nav = document.getElementById('sidebarNav');
  if (!nav) return;

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
    }, '\u2302 Home');
    nav.appendChild(homeLink);

    // Categories
    for (const category of manifest.categories) {
      const cat = el('div', { className: 'sidebar-category' });

      const header = el('button', {
        className: 'sidebar-category-header',
        onClick: () => cat.classList.toggle('open')
      });
      header.appendChild(el('span', {}, category.name));
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
        link.appendChild(el('span', {}, `${schedaId}. ${info.title}`));
        li.appendChild(link);
        list.appendChild(li);
      }

      cat.appendChild(list);
      nav.appendChild(cat);
    }
  } catch (err) {
    nav.textContent = 'Errore nel caricamento del menu.';
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

function showSettingsModal() {
  // Remove existing
  const existing = document.querySelector('.modal-overlay');
  if (existing) existing.remove();

  const settings = getSettings();

  const overlay = el('div', { className: 'modal-overlay active' });
  const modal = el('div', { className: 'modal' });

  modal.appendChild(el('h3', { className: 'modal-title' }, 'Impostazioni'));

  // Dark mode toggle
  const darkRow = el('div', { className: 'toggle-row' });
  darkRow.appendChild(el('span', { className: 'toggle-label' }, 'Modalità scura'));
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
  accentRow.appendChild(el('span', { className: 'toggle-label' }, 'Accenti rigorosi'));
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
  }, 'Se attivo, "è" e "e" sono considerati diversi nelle risposte.'));

  // Close button
  const closeBtn = el('button', {
    className: 'btn btn-primary',
    style: { marginTop: 'var(--space-lg)', width: '100%' },
    onClick: () => overlay.remove()
  }, 'Chiudi');
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
      Errore nell'inizializzazione dell'app: ${err.message}
    </p>`;
  }
});
