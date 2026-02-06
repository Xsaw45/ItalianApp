/**
 * Home/dashboard view.
 */
import { el, clearElement } from '../utils/dom.js';
import { loadManifest } from '../data-loader.js';
import { getOverallProgress, getSchedaProgress, getLastActive } from '../state.js';
import { navigate } from '../router.js';

export async function renderHomeView() {
  const app = document.getElementById('app');
  clearElement(app);

  try {
    const manifest = await loadManifest();
    const progress = getOverallProgress(manifest);
    const lastActive = getLastActive();

    // Welcome section
    const welcome = el('div', { style: { marginBottom: 'var(--space-xl)' } });
    welcome.appendChild(el('h2', {
      style: { fontFamily: 'var(--font-heading)', color: 'var(--color-text)', marginBottom: 'var(--space-sm)' }
    }, 'Benvenuto!'));
    welcome.appendChild(el('p', { style: { color: 'var(--color-text-light)' } },
      'Studia la grammatica italiana con esercizi interattivi.'));
    app.appendChild(welcome);

    // Continue section
    if (lastActive && manifest.schede[lastActive]) {
      const cont = el('div', { className: 'continue-section' });
      const text = el('div', { className: 'continue-text' });
      text.appendChild(el('div', { className: 'continue-title' }, 'Continua dove eri rimasto'));
      text.appendChild(el('div', { className: 'continue-subtitle' },
        `Scheda ${lastActive}: ${manifest.schede[lastActive].title}`));
      cont.appendChild(text);
      cont.appendChild(el('button', {
        className: 'btn btn-primary btn-lg',
        onClick: () => navigate(`/scheda/${lastActive}`)
      }, 'Continua'));
      app.appendChild(cont);
    }

    // Stats
    const stats = el('div', { className: 'stats-grid' });
    stats.appendChild(createStat(String(progress.completed), 'Schede completate'));
    stats.appendChild(createStat(String(progress.total), 'Schede totali'));
    stats.appendChild(createStat(`${progress.percentage}%`, 'Progresso'));
    app.appendChild(stats);

    // Categories
    app.appendChild(el('h3', {
      style: {
        fontFamily: 'var(--font-heading)',
        marginBottom: 'var(--space-lg)',
        color: 'var(--color-text)'
      }
    }, 'Argomenti'));

    const grid = el('div', { className: 'categories-grid' });

    for (const category of manifest.categories) {
      const card = el('div', {
        className: 'category-card',
        onClick: () => {
          // Navigate to first scheda in category
          if (category.schede.length > 0) {
            navigate(`/scheda/${category.schede[0]}`);
          }
        }
      });

      card.appendChild(el('div', { className: 'category-icon' }, category.icon));
      card.appendChild(el('div', { className: 'category-name' }, category.name));

      // Category progress
      let categoryCompleted = 0;
      for (const sid of category.schede) {
        const schedaInfo = manifest.schede[sid];
        if (schedaInfo) {
          const p = getSchedaProgress(String(sid), schedaInfo.exerciseCount);
          if (p === 'completed') categoryCompleted++;
        }
      }

      card.appendChild(el('div', { className: 'category-count' },
        `${category.schede.length} schede \u2022 ${categoryCompleted} completate`));

      // Progress bar
      const barWrap = el('div', {
        className: 'progress-bar',
        style: { marginTop: 'var(--space-sm)' }
      });
      const pct = category.schede.length > 0
        ? Math.round((categoryCompleted / category.schede.length) * 100) : 0;
      barWrap.appendChild(el('div', {
        className: 'progress-bar-fill',
        style: { width: `${pct}%` }
      }));
      card.appendChild(barWrap);

      grid.appendChild(card);
    }

    app.appendChild(grid);

    // Quick list of all schede
    app.appendChild(el('h3', {
      style: {
        fontFamily: 'var(--font-heading)',
        margin: 'var(--space-xl) 0 var(--space-lg)',
        color: 'var(--color-text)'
      }
    }, 'Tutte le schede'));

    const list = el('div', { style: { display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' } });
    for (const [id, info] of Object.entries(manifest.schede)) {
      const status = getSchedaProgress(id, info.exerciseCount);
      const dotClass = status === 'completed' ? 'completed' : status === 'in-progress' ? 'started' : '';

      const item = el('a', {
        href: `#/scheda/${id}`,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          padding: 'var(--space-sm) var(--space-md)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--color-text)',
          textDecoration: 'none',
          fontSize: 'var(--text-sm)',
          transition: 'background var(--transition-fast)'
        }
      });
      item.addEventListener('mouseenter', () => item.style.background = 'var(--color-bg-sidebar)');
      item.addEventListener('mouseleave', () => item.style.background = '');

      item.appendChild(el('span', { className: `progress-dot ${dotClass}` }));
      item.appendChild(el('strong', { style: { minWidth: '48px' } }, `${id}.`));
      item.appendChild(el('span', {}, info.title));

      list.appendChild(item);
    }
    app.appendChild(list);

  } catch (err) {
    clearElement(app);
    app.appendChild(el('p', { style: { color: 'var(--color-incorrect)' } },
      `Errore nel caricamento: ${err.message}`));
  }
}

function createStat(value, label) {
  return el('div', { className: 'stat-card' },
    el('div', { className: 'stat-value' }, value),
    el('div', { className: 'stat-label' }, label)
  );
}
