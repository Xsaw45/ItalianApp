/**
 * Translation learning module — sentence-level IT↔FR translation with spaced repetition.
 * Phrases unlock when all their vocabTags reach phase ≥ 2 in the vocab module.
 */
import { el, clearElement } from '../utils/dom.js';
import { checkAnswer } from '../utils/normalize.js';
import {
  getSettings,
  saveTranslationResult, getTranslationState,
  getTranslationPhase, isTranslationOnCooldown, isTranslationDue,
  isTranslationMastered, getVocabState
} from '../state.js';
import { t } from '../i18n.js';

const QUIZ_SIZE = 10;

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

let _data = null;

async function loadData() {
  if (_data) return _data;
  const res = await fetch('./data/translations.json');
  if (!res.ok) throw new Error(t('transl.error') + res.status);
  _data = await res.json();
  return _data;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isPhraseUnlocked(phrase, vocabState) {
  if (!phrase.vocabTags || phrase.vocabTags.length === 0) return true;
  return phrase.vocabTags.every(id => (vocabState[id]?.phase ?? 0) >= 2);
}

function cooldownDaysLeft(phraseId) {
  const entry = getTranslationState()[phraseId];
  if (!entry || !entry.cooldownUntil) return 0;
  const diff = new Date(entry.cooldownUntil) - new Date();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function buildQuizPool(phrases, vocabState) {
  const due = [];
  const fresh = [];

  for (const phrase of phrases) {
    if (!isPhraseUnlocked(phrase, vocabState)) continue;
    const phase = getTranslationPhase(phrase.id);
    if (phase >= 3) continue;
    if (isTranslationOnCooldown(phrase.id)) continue;

    if (isTranslationDue(phrase.id)) {
      due.push(phrase);
    } else {
      fresh.push(phrase);
    }
  }

  return [
    ...due.sort(() => Math.random() - 0.5),
    ...fresh.sort(() => Math.random() - 0.5)
  ].slice(0, QUIZ_SIZE);
}

function getStatusInfo(phraseId) {
  const phase = getTranslationPhase(phraseId);
  const onCooldown = isTranslationOnCooldown(phraseId);
  const due = isTranslationDue(phraseId);
  const entry = getTranslationState()[phraseId];
  const seen = entry && entry.attempts > 0;

  if (phase >= 3) return { text: t('transl.status.archived'), color: 'var(--color-correct)' };
  if (onCooldown) return { text: t('transl.status.cooldown', { n: cooldownDaysLeft(phraseId) }), color: 'var(--color-accent)' };
  if (due) return { text: t('transl.status.due'), color: 'var(--color-primary)' };
  if (seen) return { text: t('transl.status.learning'), color: 'var(--color-accent)' };
  return { text: t('transl.status.new'), color: 'var(--color-text-muted)' };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function renderTranslationView(tab = 'list') {
  const app = document.getElementById('app');
  clearElement(app);

  try {
    const data = await loadData();
    const vocabState = getVocabState();

    app.appendChild(el('h2', {
      style: { fontFamily: 'var(--font-heading)', color: 'var(--color-text)', marginBottom: 'var(--space-lg)' }
    }, t('transl.title')));

    const tabs = el('div', { className: 'tabs', style: { marginBottom: 'var(--space-xl)' } });
    tabs.appendChild(el('button', {
      className: `tab ${tab === 'list' ? 'active' : ''}`,
      onClick: () => renderTranslationView('list')
    }, t('transl.tab.list')));
    tabs.appendChild(el('button', {
      className: `tab ${tab === 'quiz' ? 'active' : ''}`,
      onClick: () => renderTranslationView('quiz')
    }, t('transl.tab.quiz')));
    app.appendChild(tabs);

    const content = el('div', { className: 'tab-content' });
    app.appendChild(content);

    if (tab === 'list') {
      renderPhraseList(data.phrases, vocabState, content);
    } else {
      renderQuizStart(data.phrases, vocabState, content);
    }
  } catch (err) {
    clearElement(app);
    app.appendChild(el('p', { style: { color: 'var(--color-incorrect)' } }, `${t('transl.error')}${err.message}`));
  }
}

// ---------------------------------------------------------------------------
// Tab 1 — Phrase list
// ---------------------------------------------------------------------------

function renderPhraseList(phrases, vocabState, container) {
  const unlocked = phrases.filter(p => isPhraseUnlocked(p, vocabState));
  const locked = phrases.filter(p => !isPhraseUnlocked(p, vocabState));

  // Sort: due → new/learning → cooldown → archived
  unlocked.sort((a, b) => {
    function key(id) {
      if (isTranslationDue(id)) return 0;
      const phase = getTranslationPhase(id);
      const entry = getTranslationState()[id];
      if (phase === 0 && !(entry?.attempts > 0)) return 1;
      if (phase === 0) return 2;
      if (isTranslationOnCooldown(id)) return 3;
      if (phase >= 3) return 4;
      return 2;
    }
    return key(a.id) - key(b.id);
  });

  for (const phrase of unlocked) {
    const { text, color } = getStatusInfo(phrase.id);
    container.appendChild(buildPhraseCard(phrase, text, color, false));
  }

  if (locked.length > 0) {
    container.appendChild(el('h3', {
      style: {
        fontFamily: 'var(--font-heading)',
        color: 'var(--color-text-muted)',
        margin: 'var(--space-xl) 0 var(--space-sm)',
        fontSize: 'var(--text-md)'
      }
    }, `🔒 ${t('transl.locked')} (${locked.length})`));

    const lockedWrap = el('div', { style: { opacity: '0.6' } });
    for (const phrase of locked) {
      const missing = (phrase.vocabTags || []).filter(id => (vocabState[id]?.phase ?? 0) < 2);
      const card = el('div', {
        style: {
          padding: 'var(--space-sm) var(--space-md)',
          marginBottom: '4px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--color-bg)',
          border: '1px dashed var(--color-border)'
        }
      });
      const top = el('div', {
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-sm)' }
      });
      top.appendChild(el('span', { style: { fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' } }, phrase.it));
      top.appendChild(el('span', { style: { fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' } }, '🔒'));
      card.appendChild(top);
      if (missing.length > 0) {
        card.appendChild(el('div', {
          style: { fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '2px', fontStyle: 'italic' }
        }, t('transl.locked.hint', { words: missing.join(', ') })));
      }
      lockedWrap.appendChild(card);
    }
    container.appendChild(lockedWrap);
  }

  if (phrases.length === 0) {
    container.appendChild(el('p', {
      style: { color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center' }
    }, t('transl.pool.empty')));
  }
}

function buildPhraseCard(phrase, statusText, statusColor) {
  const card = el('div', {
    style: {
      padding: 'var(--space-sm) var(--space-md)',
      marginBottom: '4px',
      borderRadius: 'var(--radius-sm)',
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border-light)'
    }
  });
  const top = el('div', {
    style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-sm)' }
  });
  top.appendChild(el('span', { style: { fontWeight: '500', fontSize: 'var(--text-sm)' } }, phrase.it));
  top.appendChild(el('span', { style: { fontSize: 'var(--text-xs)', color: statusColor, whiteSpace: 'nowrap', flexShrink: '0' } }, statusText));
  card.appendChild(top);
  card.appendChild(el('div', { style: { fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '2px' } }, phrase.fr));
  return card;
}

// ---------------------------------------------------------------------------
// Tab 2 — Quiz: start screen
// ---------------------------------------------------------------------------

function renderQuizStart(phrases, vocabState, container) {
  const unlocked = phrases.filter(p => isPhraseUnlocked(p, vocabState));
  const translState = getTranslationState();

  const mastered = unlocked.filter(p => isTranslationMastered(p.id)).length;
  const seen = unlocked.filter(p => translState[p.id]?.attempts > 0).length;
  const total = unlocked.length;
  const dueCount = unlocked.filter(p => isTranslationDue(p.id)).length;

  const statsGrid = el('div', { className: 'stats-grid', style: { marginBottom: 'var(--space-xl)' } });
  statsGrid.appendChild(createStat(String(mastered), t('transl.stat.mastered')));
  statsGrid.appendChild(createStat(`${seen}/${total}`, t('transl.stat.seen')));
  statsGrid.appendChild(createStat(String(total - mastered), t('transl.stat.learn')));
  container.appendChild(statsGrid);

  if (dueCount > 0) {
    container.appendChild(el('div', {
      style: {
        marginBottom: 'var(--space-lg)',
        padding: 'var(--space-sm) var(--space-md)',
        background: 'var(--color-primary-bg)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--color-primary)',
        fontWeight: '600',
        fontSize: 'var(--text-sm)'
      }
    }, `🔄 ${t('transl.due.badge', { n: dueCount })}`));
  }

  const pool = buildQuizPool(phrases, vocabState);

  container.appendChild(el('p', {
    style: { color: 'var(--color-text-muted)', margin: 'var(--space-lg) 0', fontSize: 'var(--text-sm)' }
  }, t('transl.quiz.desc', { n: Math.min(QUIZ_SIZE, pool.length) })));

  if (pool.length === 0) {
    container.appendChild(el('p', {
      style: { color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center', marginBottom: 'var(--space-lg)' }
    }, t('transl.pool.empty')));
    container.appendChild(el('a', {
      href: '#/vocab',
      className: 'btn btn-secondary',
      style: { display: 'inline-block' }
    }, t('transl.go.vocab')));
    return;
  }

  container.appendChild(el('button', {
    className: 'btn btn-primary btn-lg',
    onClick: () => startQuiz(pool, container)
  }, t('transl.quiz.start')));
}

// ---------------------------------------------------------------------------
// Tab 2 — Quiz: engine
// ---------------------------------------------------------------------------

function startQuiz(pool, container) {
  clearElement(container);

  const questions = pool.map(phrase => ({
    phrase,
    direction: Math.random() < 0.5 ? 'it-fr' : 'fr-it'
  }));

  const results = [];

  function showQuestion(index) {
    clearElement(container);
    if (index >= questions.length) {
      renderQuizResults(results, container);
      return;
    }

    const { phrase, direction } = questions[index];
    const prompt = direction === 'it-fr' ? phrase.it : phrase.fr;
    const expected = direction === 'it-fr' ? phrase.fr : phrase.it;
    const langLabel = direction === 'it-fr' ? t('transl.dir.itfr') : t('transl.dir.frit');

    const progressWrap = el('div', { className: 'progress-bar', style: { marginBottom: 'var(--space-lg)' } });
    progressWrap.appendChild(el('div', {
      className: 'progress-bar-fill',
      style: { width: `${Math.round((index / questions.length) * 100)}%` }
    }));
    container.appendChild(progressWrap);

    container.appendChild(el('p', {
      style: { fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-lg)' }
    }, `${t('transl.question', { i: index + 1, n: questions.length })} • ${langLabel}`));

    const card = el('div', { className: 'exercise-card', style: { marginBottom: 'var(--space-lg)' } });

    card.appendChild(el('p', {
      style: {
        fontSize: 'var(--text-md)',
        fontFamily: 'var(--font-heading)',
        color: 'var(--color-text)',
        marginBottom: 'var(--space-lg)',
        lineHeight: '1.6'
      }
    }, prompt));

    const input = el('input', {
      type: 'text',
      className: 'exercise-input',
      placeholder: t('transl.placeholder'),
      style: { width: '100%', fontSize: 'var(--text-md)', padding: 'var(--space-sm)' }
    });
    card.appendChild(input);

    const correctionArea = el('div', { style: { marginTop: 'var(--space-md)', minHeight: '24px' } });
    card.appendChild(correctionArea);
    container.appendChild(card);

    const confirmBtn = el('button', {
      className: 'btn btn-primary',
      style: { width: '100%' }
    }, t('transl.confirm'));
    container.appendChild(confirmBtn);

    let answered = false;

    function submitAnswer() {
      if (answered) { showQuestion(index + 1); return; }
      answered = true;

      const { strictAccents } = getSettings();
      const expectedAlts = expected.split(' / ').map(s => s.trim());
      const isCorrect = checkAnswer(input.value, expectedAlts, strictAccents);

      input.disabled = true;
      input.classList.add(isCorrect ? 'correct' : 'incorrect');

      if (!isCorrect) {
        correctionArea.appendChild(el('div', {
          style: { color: 'var(--color-incorrect)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-xs)' }
        }, `${t('transl.wrong')}${expected}`));
      } else {
        correctionArea.appendChild(el('div', {
          style: { color: 'var(--color-correct)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-xs)' }
        }, t('transl.correct')));
      }

      saveTranslationResult(phrase.id, isCorrect);
      results.push({ phrase, direction, isCorrect, userAnswer: input.value, expected });

      confirmBtn.textContent = t('transl.next');
      confirmBtn.className = 'btn btn-secondary';
      confirmBtn.style.width = '100%';
    }

    confirmBtn.addEventListener('click', submitAnswer);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submitAnswer(); });
    input.focus();
  }

  showQuestion(0);
}

// ---------------------------------------------------------------------------
// Tab 2 — Quiz: results screen
// ---------------------------------------------------------------------------

function renderQuizResults(results, container) {
  clearElement(container);

  const score = results.filter(r => r.isCorrect).length;
  const total = results.length;
  const pct = Math.round((score / total) * 100);

  const scoreColor = pct >= 80 ? 'var(--color-correct)'
    : pct >= 50 ? 'var(--color-accent)'
    : 'var(--color-incorrect)';

  const scoreCard = el('div', {
    className: 'stat-card',
    style: { textAlign: 'center', marginBottom: 'var(--space-xl)', padding: 'var(--space-xl)' }
  });
  scoreCard.appendChild(el('div', {
    style: { fontFamily: 'var(--font-heading)', fontSize: '3rem', color: scoreColor, fontWeight: '700' }
  }, `${score}/${total}`));
  scoreCard.appendChild(el('div', {
    className: 'stat-label',
    style: { fontSize: 'var(--text-md)', marginTop: 'var(--space-sm)' }
  }, `${pct}${t('transl.result.pct')}`));
  container.appendChild(scoreCard);

  const wrong = results.filter(r => !r.isCorrect);
  if (wrong.length > 0) {
    container.appendChild(el('h3', {
      style: { fontFamily: 'var(--font-heading)', color: 'var(--color-text)', marginBottom: 'var(--space-md)' }
    }, t('transl.to.review')));

    const wrongList = el('div', {
      style: { display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', marginBottom: 'var(--space-xl)' }
    });
    for (const r of wrong) {
      const item = el('div', {
        style: {
          padding: 'var(--space-sm) var(--space-md)',
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border-light)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 'var(--text-sm)'
        }
      });
      item.appendChild(el('div', { style: { fontWeight: '500' } }, r.phrase.it));
      item.appendChild(el('div', { style: { color: 'var(--color-text-muted)', marginTop: '2px' } }, r.phrase.fr));
      wrongList.appendChild(item);
    }
    container.appendChild(wrongList);
  } else {
    container.appendChild(el('p', {
      style: { color: 'var(--color-correct)', marginBottom: 'var(--space-xl)', fontWeight: '600' }
    }, t('transl.perfect')));
  }

  container.appendChild(el('button', {
    className: 'btn btn-primary btn-lg',
    style: { width: '100%' },
    onClick: () => renderTranslationView('quiz')
  }, t('transl.retry')));
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function createStat(value, label) {
  return el('div', { className: 'stat-card' },
    el('div', { className: 'stat-value' }, value),
    el('div', { className: 'stat-label' }, label)
  );
}
