/**
 * Scheda view - displays theory and exercises for a single scheda.
 */
import { el, clearElement } from '../utils/dom.js';
import { loadScheda, loadManifest } from '../data-loader.js';
import { renderTheory } from './theory-renderer.js';
import { renderExercises } from './exercise-renderer.js';
import { markTheoryViewed } from '../state.js';
import { navigate } from '../router.js';

/**
 * Render the scheda view.
 * @param {string} schedaId
 * @param {string} activeTab - 'theory' or 'exercises'
 */
export async function renderSchedaView(schedaId, activeTab = 'theory') {
  const app = document.getElementById('app');
  clearElement(app);

  // Loading state
  app.appendChild(el('div', { className: 'loading-spinner' },
    el('div', { className: 'spinner' }),
    el('p', {}, 'Caricamento...')
  ));

  try {
    const [manifest, schedaData] = await Promise.all([
      loadManifest(),
      loadScheda(schedaId)
    ]);

    clearElement(app);

    const manifestScheda = manifest.schede[schedaId];
    if (!manifestScheda) {
      app.appendChild(el('p', {}, `Scheda "${schedaId}" non trovata.`));
      return;
    }

    // Scheda header
    const header = el('div', { className: 'scheda-header' });
    header.appendChild(el('div', { className: 'scheda-number' }, `Scheda ${schedaId}`));
    header.appendChild(el('h2', { className: 'scheda-title' }, schedaData.meta.title));
    if (schedaData.meta.subtitle) {
      header.appendChild(el('p', { style: { color: 'var(--color-text-light)', marginTop: 'var(--space-xs)' } },
        schedaData.meta.subtitle));
    }
    app.appendChild(header);

    // Tabs
    const tabs = el('div', { className: 'tabs' });

    const theoryTab = el('button', {
      className: `tab ${activeTab === 'theory' ? 'active' : ''}`,
      onClick: () => navigate(`/scheda/${schedaId}`)
    }, 'Teoria');

    const exercisesTab = el('button', {
      className: `tab ${activeTab === 'exercises' ? 'active' : ''}`,
      onClick: () => navigate(`/scheda/${schedaId}/exercises`)
    }, 'Esercizi');

    tabs.appendChild(theoryTab);
    tabs.appendChild(exercisesTab);
    app.appendChild(tabs);

    // Tab content
    const content = el('div', { className: 'tab-content', dataset: { schedaId: schedaId } });

    if (activeTab === 'theory') {
      renderTheory(schedaData.theory, content);
      markTheoryViewed(schedaId);
    } else {
      renderExercises(schedaData, content);
    }

    app.appendChild(content);

    // Navigation between schede
    const nav = el('div', {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: 'var(--space-2xl)',
        paddingTop: 'var(--space-lg)',
        borderTop: '1px solid var(--color-border-light)'
      }
    });

    const schedeIds = Object.keys(manifest.schede);
    const currentIdx = schedeIds.indexOf(schedaId);

    if (currentIdx > 0) {
      const prevId = schedeIds[currentIdx - 1];
      nav.appendChild(el('a', {
        href: `#/scheda/${prevId}`,
        className: 'btn btn-ghost',
        style: { textDecoration: 'none' }
      }, `\u2190 Scheda ${prevId}`));
    } else {
      nav.appendChild(el('span'));
    }

    if (activeTab === 'theory') {
      nav.appendChild(el('button', {
        className: 'btn btn-primary btn-lg',
        onClick: () => navigate(`/scheda/${schedaId}/exercises`)
      }, 'Vai agli esercizi \u2192'));
    } else if (currentIdx < schedeIds.length - 1) {
      const nextId = schedeIds[currentIdx + 1];
      nav.appendChild(el('a', {
        href: `#/scheda/${nextId}`,
        className: 'btn btn-ghost',
        style: { textDecoration: 'none' }
      }, `Scheda ${nextId} \u2192`));
    }

    app.appendChild(nav);

    // Update sidebar active state
    updateSidebarActive(schedaId);

  } catch (err) {
    clearElement(app);
    app.appendChild(el('div', { className: 'card', style: { textAlign: 'center', padding: 'var(--space-2xl)' } },
      el('h3', { style: { marginBottom: 'var(--space-md)' } }, 'Scheda non ancora disponibile'),
      el('p', { style: { color: 'var(--color-text-muted)' } },
        `Il contenuto della Scheda ${schedaId} non è ancora stato digitalizzato.`),
      el('button', {
        className: 'btn btn-primary',
        onClick: () => navigate('/home'),
        style: { marginTop: 'var(--space-lg)' }
      }, 'Torna alla home')
    ));
  }
}

function updateSidebarActive(schedaId) {
  document.querySelectorAll('.sidebar-scheda-link').forEach(link => {
    link.classList.toggle('active', link.dataset.schedaId === schedaId);
  });
}
