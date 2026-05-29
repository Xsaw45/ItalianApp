/**
 * Detailed statistics view.
 */
import { el, clearElement } from '../utils/dom.js';
import { loadManifest } from '../data-loader.js';
import { loadState, getSchedaProgress } from '../state.js';
import { t, localName } from '../i18n.js';

export async function renderStatsView() {
  const app = document.getElementById('app');
  clearElement(app);

  try {
    const manifest = await loadManifest();
    const state = loadState();

    app.appendChild(el('h2', {
      style: { fontFamily: 'var(--font-heading)', color: 'var(--color-text)', marginBottom: 'var(--space-xl)' }
    }, t('stats.title')));

    // --- Global stats ---
    let totalScore = 0, totalQuestions = 0, totalAttempts = 0;
    for (const schedaState of Object.values(state.schede || {})) {
      if (!schedaState?.exercises) continue;
      for (const ex of Object.values(schedaState.exercises)) {
        if (ex.score !== undefined && ex.total > 0) {
          totalScore += ex.score;
          totalQuestions += ex.total;
        }
        totalAttempts += ex.attempts || 1;
      }
    }

    const schedeIds = Object.keys(manifest.schede);
    let completedCount = 0;
    for (const id of schedeIds) {
      if (getSchedaProgress(id, manifest.schede[id].exerciseCount) === 'completed') completedCount++;
    }

    const globalPct = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;

    const statsGrid = el('div', { className: 'stats-grid' });
    statsGrid.appendChild(createStat(`${globalPct}%`, t('stats.global.score')));
    statsGrid.appendChild(createStat(String(totalQuestions), t('stats.questions')));
    statsGrid.appendChild(createStat(`${completedCount}/${schedeIds.length}`, t('stats.completed')));
    statsGrid.appendChild(createStat(String(totalAttempts), t('stats.attempts')));
    app.appendChild(statsGrid);

    // --- Per category ---
    app.appendChild(el('h3', {
      style: { fontFamily: 'var(--font-heading)', margin: 'var(--space-xl) 0 var(--space-lg)', color: 'var(--color-text)' }
    }, t('stats.per.topic')));

    const catList = el('div', { style: { display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' } });

    for (const cat of manifest.categories) {
      let catScore = 0, catTotal = 0, catCompleted = 0;
      for (const schedaId of cat.schede) {
        const schedaState = state.schede?.[schedaId];
        if (schedaState?.exercises) {
          for (const ex of Object.values(schedaState.exercises)) {
            if (ex.score !== undefined && ex.total > 0) {
              catScore += ex.score;
              catTotal += ex.total;
            }
          }
        }
        const info = manifest.schede[schedaId];
        if (info && getSchedaProgress(String(schedaId), info.exerciseCount) === 'completed') catCompleted++;
      }

      const pct = catTotal > 0 ? Math.round((catScore / catTotal) * 100) : 0;
      const barColor = pct >= 80
        ? 'var(--color-correct)'
        : pct >= 50
          ? 'var(--color-accent)'
          : pct > 0
            ? 'var(--color-incorrect)'
            : 'var(--color-border)';

      const card = el('div', { className: 'stat-card', style: { textAlign: 'left' } });

      const header = el('div', {
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }
      });
      header.appendChild(el('span', { style: { fontWeight: '600' } }, `${cat.icon}  ${localName(cat, 'name')}`));
      const right = el('span', { style: { fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' } });
      right.textContent = catTotal > 0
        ? `${pct}% \u2022 ${t('stats.cat.count', { c: catCompleted, n: cat.schede.length })}`
        : t('stats.cat.count', { c: catCompleted, n: cat.schede.length });
      header.appendChild(right);
      card.appendChild(header);

      const barWrap = el('div', { className: 'progress-bar' });
      barWrap.appendChild(el('div', {
        className: 'progress-bar-fill',
        style: { width: `${pct}%`, background: barColor }
      }));
      card.appendChild(barWrap);
      catList.appendChild(card);
    }

    app.appendChild(catList);

    // --- Schede da rivedere ---
    const weakSchede = [];
    for (const [schedaId, schedaState] of Object.entries(state.schede || {})) {
      if (!schedaState?.exercises) continue;
      let s = 0, t2 = 0;
      for (const ex of Object.values(schedaState.exercises)) {
        if (ex.score !== undefined && ex.total > 0) { s += ex.score; t2 += ex.total; }
      }
      if (t2 > 0 && manifest.schede[schedaId]) {
        const pct = Math.round((s / t2) * 100);
        if (pct < 80) weakSchede.push({ id: schedaId, title: localName(manifest.schede[schedaId], 'title'), pct });
      }
    }
    weakSchede.sort((a, b) => a.pct - b.pct);

    if (weakSchede.length > 0) {
      app.appendChild(el('h3', {
        style: { fontFamily: 'var(--font-heading)', margin: 'var(--space-xl) 0 var(--space-lg)', color: 'var(--color-text)' }
      }, t('stats.to.review')));

      const weakList = el('div', { style: { display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' } });
      for (const s of weakSchede.slice(0, 8)) {
        const item = el('div', {
          style: {
            display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
            padding: 'var(--space-sm) var(--space-md)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border-light)',
            cursor: 'pointer'
          },
          onClick: () => { window.location.hash = `#/scheda/${s.id}/exercises`; }
        });
        item.appendChild(el('span', {
          style: {
            minWidth: '44px', textAlign: 'center', fontWeight: '700',
            color: s.pct < 50 ? 'var(--color-incorrect)' : 'var(--color-accent)',
            fontSize: 'var(--text-sm)'
          }
        }, `${s.pct}%`));
        item.appendChild(el('span', { style: { flex: '1' } }, `${s.id}. ${s.title}`));
        item.appendChild(el('span', { style: { fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' } }, t('stats.retry')));
        weakList.appendChild(item);
      }
      app.appendChild(weakList);
    }

    if (totalQuestions === 0) {
      app.appendChild(el('p', {
        style: { color: 'var(--color-text-muted)', marginTop: 'var(--space-xl)', textAlign: 'center' }
      }, t('stats.empty')));
    }

  } catch (err) {
    clearElement(app);
    app.appendChild(el('p', { style: { color: 'var(--color-incorrect)' } }, `${t('stats.error')}${err.message}`));
  }
}

function createStat(value, label) {
  return el('div', { className: 'stat-card' },
    el('div', { className: 'stat-value' }, value),
    el('div', { className: 'stat-label' }, label)
  );
}
