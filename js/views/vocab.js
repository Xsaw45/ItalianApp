/**
 * Vocabulary learning module — 3 levels with spaced repetition.
 */
import { el, clearElement } from '../utils/dom.js';
import { checkAnswer } from '../utils/normalize.js';
import {
  getSettings, saveVocabResult, getVocabState,
  isWordMastered, isWordOnCooldown, isWordDue, getWordPhase, getUnlockedLevels
} from '../state.js';
import { t, getLanguage } from '../i18n.js';

const QUIZ_SIZE = 20;

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

let _vocabData = null;

async function loadVocab() {
  if (_vocabData) return _vocabData;
  const res = await fetch('./data/vocab.json');
  if (!res.ok) throw new Error(t('vocab.error') + res.status);
  _vocabData = await res.json();
  return _vocabData;
}

function getAllWords(vocabData) {
  return vocabData.levels.flatMap(level => level.categories.flatMap(cat => cat.words));
}

function getLevelWords(level) {
  return level.categories.flatMap(cat => cat.words);
}

function getLevelName(level) {
  return getLanguage() === 'fr' ? (level.name_fr || level.name) : level.name;
}

// Days remaining on cooldown (0 if expired or none)
function cooldownDaysLeft(wordId) {
  const vocabState = getVocabState();
  const entry = vocabState[wordId];
  if (!entry || !entry.cooldownUntil) return 0;
  const diff = new Date(entry.cooldownUntil) - new Date();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function renderVocabView(tab = 'list', selectedLevelId = null) {
  const app = document.getElementById('app');
  clearElement(app);

  try {
    const vocabData = await loadVocab();
    const unlockedLevels = getUnlockedLevels(vocabData);

    // Header
    app.appendChild(el('h2', {
      style: { fontFamily: 'var(--font-heading)', color: 'var(--color-text)', marginBottom: 'var(--space-lg)' }
    }, t('vocab.title')));

    // Tabs
    const tabs = el('div', { className: 'tabs', style: { marginBottom: 'var(--space-xl)' } });
    const listTab = el('button', {
      className: `tab ${tab === 'list' ? 'active' : ''}`,
      onClick: () => renderVocabView('list', selectedLevelId)
    }, t('vocab.tab.list'));
    const quizTab = el('button', {
      className: `tab ${tab === 'quiz' ? 'active' : ''}`,
      onClick: () => renderVocabView('quiz')
    }, t('vocab.tab.quiz'));
    tabs.appendChild(listTab);
    tabs.appendChild(quizTab);
    app.appendChild(tabs);

    const content = el('div', { className: 'tab-content' });
    app.appendChild(content);

    if (tab === 'list') {
      renderWordList(vocabData, unlockedLevels, selectedLevelId, content);
    } else {
      renderQuizStart(vocabData, unlockedLevels, content);
    }
  } catch (err) {
    clearElement(app);
    app.appendChild(el('p', { style: { color: 'var(--color-incorrect)' } }, `${t('vocab.error')}${err.message}`));
  }
}

// ---------------------------------------------------------------------------
// Tab 1 — Word list
// ---------------------------------------------------------------------------

function renderWordList(vocabData, unlockedLevels, selectedLevelId, container) {
  const vocabState = getVocabState();

  // Level selector
  const selectorRow = el('div', {
    style: { display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }
  });

  const select = el('select', {
    style: {
      padding: 'var(--space-xs) var(--space-md)',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--color-border)',
      background: 'var(--color-bg-card)',
      color: 'var(--color-text)',
      fontSize: 'var(--text-sm)',
      cursor: 'pointer'
    }
  });

  // "All levels" option
  const allOption = el('option', { value: 'all' }, t('vocab.level.all'));
  if (!selectedLevelId || selectedLevelId === 'all') allOption.selected = true;
  select.appendChild(allOption);

  for (const level of vocabData.levels) {
    if (!unlockedLevels.includes(level.id)) continue;
    const opt = el('option', { value: String(level.id) }, getLevelName(level));
    if (selectedLevelId === String(level.id)) opt.selected = true;
    select.appendChild(opt);
  }

  select.addEventListener('change', () => {
    renderVocabView('list', select.value);
  });

  selectorRow.appendChild(select);
  container.appendChild(selectorRow);

  // Determine which levels to show
  const levelsToShow = vocabData.levels.filter(level => {
    if (!unlockedLevels.includes(level.id)) return false;
    if (!selectedLevelId || selectedLevelId === 'all') return true;
    return String(level.id) === selectedLevelId;
  });

  // Render each unlocked level
  for (const level of levelsToShow) {
    const levelHeader = el('div', {
      style: {
        display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
        margin: 'var(--space-lg) 0 var(--space-md)',
        padding: 'var(--space-sm) var(--space-md)',
        background: 'var(--color-primary-bg)',
        borderRadius: 'var(--radius-sm)',
        borderLeft: '3px solid var(--color-primary)'
      }
    });
    const levelWords = getLevelWords(level);
    const masteredCount = levelWords.filter(w => isWordMastered(w.id)).length;
    const pct = levelWords.length > 0 ? Math.round((masteredCount / levelWords.length) * 100) : 0;

    levelHeader.appendChild(el('strong', { style: { color: 'var(--color-primary)' } }, getLevelName(level)));
    levelHeader.appendChild(el('span', {
      style: { marginLeft: 'auto', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }
    }, t('vocab.level.progress', { done: masteredCount, total: levelWords.length, pct })));
    container.appendChild(levelHeader);

    for (const cat of level.categories) {
      container.appendChild(el('h3', {
        style: {
          fontFamily: 'var(--font-heading)',
          color: 'var(--color-text)',
          margin: 'var(--space-md) 0 var(--space-xs)',
          fontSize: 'var(--text-md)'
        }
      }, cat.name));

      const table = el('div', {
        style: { display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: 'var(--space-md)' }
      });

      for (const word of cat.words) {
        const phase = getWordPhase(word.id);
        const onCooldown = isWordOnCooldown(word.id);
        const due = isWordDue(word.id);
        const ws = vocabState[word.id];
        const seen = ws && ws.attempts > 0;

        // Status badge
        let statusText = '';
        let statusColor = 'var(--color-text-muted)';
        if (phase >= 3) {
          statusText = t('vocab.status.archived');
          statusColor = 'var(--color-correct)';
        } else if (onCooldown) {
          const days = cooldownDaysLeft(word.id);
          statusText = t('vocab.status.cooldown', { n: days });
          statusColor = 'var(--color-accent)';
        } else if (due) {
          statusText = t('vocab.status.due');
          statusColor = 'var(--color-primary)';
        } else if (seen) {
          statusText = t('vocab.status.learning');
          statusColor = 'var(--color-accent)';
        } else {
          statusText = t('vocab.status.new');
          statusColor = 'var(--color-text-muted)';
        }

        const row = el('div', {
          style: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr auto',
            alignItems: 'center',
            gap: 'var(--space-md)',
            padding: 'var(--space-xs) var(--space-sm)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-sm)'
          }
        });

        row.appendChild(el('span', { style: { fontWeight: '500' } }, word.it));
        row.appendChild(el('span', { style: { color: 'var(--color-text-muted)' } }, word.fr));
        row.appendChild(el('span', {
          style: { fontSize: 'var(--text-xs)', color: statusColor, whiteSpace: 'nowrap' }
        }, statusText));

        table.appendChild(row);
      }

      container.appendChild(table);
    }
  }

  // Locked levels teaser
  for (const level of vocabData.levels) {
    if (unlockedLevels.includes(level.id)) continue;

    // Find previous level to compute progress
    const levelIdx = vocabData.levels.findIndex(l => l.id === level.id);
    const prevLevel = vocabData.levels[levelIdx - 1];
    const prevWords = prevLevel ? getLevelWords(prevLevel) : [];
    const masteredCount = prevWords.filter(w => isWordMastered(w.id)).length;
    const needed = Math.ceil(prevWords.length * 0.75) - masteredCount;
    const pct = prevWords.length > 0 ? Math.round((masteredCount / prevWords.length) * 100) : 0;

    const lockedCard = el('div', {
      style: {
        margin: 'var(--space-xl) 0',
        padding: 'var(--space-lg)',
        borderRadius: 'var(--radius-md)',
        border: '1px dashed var(--color-border)',
        textAlign: 'center',
        opacity: '0.7'
      }
    });
    lockedCard.appendChild(el('div', {
      style: { fontSize: '2rem', marginBottom: 'var(--space-sm)' }
    }, '\uD83D\uDD12'));
    lockedCard.appendChild(el('div', {
      style: { fontWeight: '600', color: 'var(--color-text)', marginBottom: 'var(--space-xs)' }
    }, getLevelName(level)));
    lockedCard.appendChild(el('div', {
      style: { fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)' }
    }, t('vocab.unlock.need', { n: Math.max(0, needed), l: level.id })));

    const barWrap = el('div', { className: 'progress-bar' });
    barWrap.appendChild(el('div', {
      className: 'progress-bar-fill',
      style: { width: `${pct}%` }
    }));
    lockedCard.appendChild(barWrap);
    lockedCard.appendChild(el('div', {
      style: { fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-xs)' }
    }, `${pct}% / 75%`));

    container.appendChild(lockedCard);
  }
}

// ---------------------------------------------------------------------------
// Tab 2 — Quiz: start screen
// ---------------------------------------------------------------------------

function renderQuizStart(vocabData, unlockedLevels, container) {
  const allUnlockedWords = vocabData.levels
    .filter(l => unlockedLevels.includes(l.id))
    .flatMap(l => getLevelWords(l));

  const vocabState = getVocabState();
  const masteredCount = allUnlockedWords.filter(w => isWordMastered(w.id)).length;
  const seenCount = allUnlockedWords.filter(w => vocabState[w.id]?.attempts > 0).length;
  const total = allUnlockedWords.length;

  // Stats
  const statsGrid = el('div', { className: 'stats-grid', style: { marginBottom: 'var(--space-xl)' } });
  statsGrid.appendChild(createStat(String(masteredCount), t('vocab.stat.mastered')));
  statsGrid.appendChild(createStat(`${seenCount}/${total}`, t('vocab.stat.seen')));
  statsGrid.appendChild(createStat(String(total - masteredCount), t('vocab.stat.learn')));
  container.appendChild(statsGrid);

  // Level progress bars
  for (const level of vocabData.levels) {
    const words = getLevelWords(level);
    const levelMastered = words.filter(w => isWordMastered(w.id)).length;
    const pct = words.length > 0 ? Math.round((levelMastered / words.length) * 100) : 0;
    const isUnlocked = unlockedLevels.includes(level.id);

    const row = el('div', { style: { marginBottom: 'var(--space-sm)' } });
    const rowHeader = el('div', {
      style: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: 'var(--text-sm)' }
    });
    rowHeader.appendChild(el('span', {
      style: { color: isUnlocked ? 'var(--color-text)' : 'var(--color-text-muted)' }
    }, `${isUnlocked ? '' : '\uD83D\uDD12 '}${getLevelName(level)}`));
    rowHeader.appendChild(el('span', {
      style: { color: 'var(--color-text-muted)' }
    }, t('vocab.level.progress', { done: levelMastered, total: words.length, pct })));
    row.appendChild(rowHeader);

    const barWrap = el('div', { className: 'progress-bar' });
    const fillColor = isUnlocked ? 'var(--color-primary)' : 'var(--color-border)';
    barWrap.appendChild(el('div', {
      className: 'progress-bar-fill',
      style: { width: `${pct}%`, background: fillColor }
    }));
    // 75% marker line
    const marker = el('div', {
      style: {
        position: 'absolute', left: '75%', top: 0, bottom: 0,
        width: '2px', background: 'var(--color-accent)', opacity: '0.6'
      }
    });
    barWrap.style.position = 'relative';
    barWrap.appendChild(marker);
    row.appendChild(barWrap);
    container.appendChild(row);
  }

  // Pool info
  const pool = buildQuizPool(vocabData, unlockedLevels);
  const dueCount = allUnlockedWords.filter(w => isWordDue(w.id)).length;

  if (dueCount > 0) {
    container.appendChild(el('div', {
      style: {
        marginTop: 'var(--space-lg)',
        padding: 'var(--space-sm) var(--space-md)',
        background: 'var(--color-primary-bg)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--color-primary)',
        fontWeight: '600',
        fontSize: 'var(--text-sm)'
      }
    }, `\uD83D\uDD04 ${t('vocab.due.badge', { n: dueCount })}`));
  }

  container.appendChild(el('p', {
    style: { color: 'var(--color-text-muted)', margin: 'var(--space-lg) 0', fontSize: 'var(--text-sm)' }
  }, t('vocab.quiz.desc', { n: Math.min(QUIZ_SIZE, pool.length) })));

  if (pool.length === 0) {
    container.appendChild(el('p', {
      style: { color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center' }
    }, t('vocab.pool.empty')));
    return;
  }

  const startBtn = el('button', {
    className: 'btn btn-primary btn-lg',
    onClick: () => startQuiz(pool, container)
  }, t('vocab.quiz.start'));
  container.appendChild(startBtn);
}

// ---------------------------------------------------------------------------
// Build quiz pool (all unlocked levels, exclude cooldown & archived)
// ---------------------------------------------------------------------------

function buildQuizPool(vocabData, unlockedLevels) {
  const due = [];
  const fresh = [];

  for (const level of vocabData.levels) {
    if (!unlockedLevels.includes(level.id)) continue;
    for (const cat of level.categories) {
      for (const word of cat.words) {
        const phase = getWordPhase(word.id);
        if (phase >= 3) continue;          // archived
        if (isWordOnCooldown(word.id)) continue; // on cooldown

        const wordWithLevel = { ...word, levelId: level.id };
        if (isWordDue(word.id)) {
          due.push(wordWithLevel);          // prioritize "due" words
        } else {
          fresh.push(wordWithLevel);
        }
      }
    }
  }

  // Shuffle each group, then put due words first
  const shuffleDue = due.sort(() => Math.random() - 0.5);
  const shuffleFresh = fresh.sort(() => Math.random() - 0.5);
  const combined = [...shuffleDue, ...shuffleFresh];
  return combined.slice(0, QUIZ_SIZE);
}

// ---------------------------------------------------------------------------
// Tab 2 — Quiz: engine
// ---------------------------------------------------------------------------

function startQuiz(pool, container) {
  clearElement(container);

  const questions = pool.map(word => ({
    word,
    direction: Math.random() < 0.5 ? 'it-fr' : 'fr-it'
  }));

  const results = [];

  function showQuestion(index) {
    clearElement(container);
    if (index >= questions.length) {
      renderQuizResults(results, container);
      return;
    }

    const { word, direction } = questions[index];
    const prompt = direction === 'it-fr' ? word.it : word.fr;
    const expected = direction === 'it-fr' ? word.fr : word.it;
    const langLabel = direction === 'it-fr' ? t('vocab.dir.itfr') : t('vocab.dir.frit');
    const levelBadge = t('vocab.quiz.level.badge', { n: word.levelId });

    // Progress bar
    const progressWrap = el('div', { className: 'progress-bar', style: { marginBottom: 'var(--space-lg)' } });
    progressWrap.appendChild(el('div', {
      className: 'progress-bar-fill',
      style: { width: `${Math.round((index / questions.length) * 100)}%` }
    }));
    container.appendChild(progressWrap);

    // Counter + level badge
    const counterRow = el('div', {
      style: { display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }
    });
    counterRow.appendChild(el('p', {
      style: { fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', flex: '1', margin: 0 }
    }, `${t('vocab.question', { i: index + 1, n: questions.length })} \u2022 ${langLabel}`));
    counterRow.appendChild(el('span', {
      style: {
        fontSize: 'var(--text-xs)', fontWeight: '700',
        padding: '2px 6px', borderRadius: 'var(--radius-sm)',
        background: 'var(--color-primary-bg)', color: 'var(--color-primary)'
      }
    }, levelBadge));
    container.appendChild(counterRow);

    // Question card
    const card = el('div', { className: 'exercise-card', style: { marginBottom: 'var(--space-lg)' } });

    card.appendChild(el('p', {
      style: {
        fontSize: 'var(--text-xl)', fontFamily: 'var(--font-heading)',
        color: 'var(--color-text)', marginBottom: 'var(--space-lg)', textAlign: 'center'
      }
    }, prompt));

    const input = el('input', {
      type: 'text',
      className: 'exercise-input',
      placeholder: t('vocab.placeholder'),
      style: { width: '100%', fontSize: 'var(--text-md)', padding: 'var(--space-sm)' }
    });
    card.appendChild(input);

    const correctionArea = el('div', { style: { marginTop: 'var(--space-md)', minHeight: '24px' } });
    card.appendChild(correctionArea);
    container.appendChild(card);

    const confirmBtn = el('button', {
      className: 'btn btn-primary',
      style: { width: '100%' }
    }, t('vocab.confirm'));
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
        }, `${t('vocab.wrong')}${expected}`));
      } else {
        correctionArea.appendChild(el('div', {
          style: { color: 'var(--color-correct)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-xs)' }
        }, t('vocab.correct')));
      }

      saveVocabResult(word.id, isCorrect);
      results.push({ word, direction, isCorrect, userAnswer: input.value, expected });

      confirmBtn.textContent = t('vocab.next');
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

  const scoreColor = score >= 16 ? 'var(--color-correct)'
    : score >= 10 ? 'var(--color-accent)'
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
  }, `${pct}${t('vocab.result.pct')}`));
  container.appendChild(scoreCard);

  const wrong = results.filter(r => !r.isCorrect);
  if (wrong.length > 0) {
    container.appendChild(el('h3', {
      style: { fontFamily: 'var(--font-heading)', color: 'var(--color-text)', marginBottom: 'var(--space-md)' }
    }, t('vocab.to.review')));

    const wrongList = el('div', {
      style: { display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', marginBottom: 'var(--space-xl)' }
    });
    for (const r of wrong) {
      const row = el('div', {
        style: {
          display: 'grid', gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center', gap: 'var(--space-md)',
          padding: 'var(--space-sm) var(--space-md)',
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border-light)',
          borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-sm)'
        }
      });
      row.appendChild(el('span', { style: { fontWeight: '500' } }, r.word.it));
      row.appendChild(el('span', { style: { color: 'var(--color-text-muted)' } }, '\u2194'));
      row.appendChild(el('span', { style: { color: 'var(--color-text-muted)' } }, r.word.fr));
      wrongList.appendChild(row);
    }
    container.appendChild(wrongList);
  } else {
    container.appendChild(el('p', {
      style: { color: 'var(--color-correct)', marginBottom: 'var(--space-xl)', fontWeight: '600' }
    }, t('vocab.perfect')));
  }

  const retryBtn = el('button', {
    className: 'btn btn-primary btn-lg',
    style: { width: '100%' },
    onClick: () => renderVocabView('quiz')
  }, t('vocab.retry'));
  container.appendChild(retryBtn);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createStat(value, label) {
  return el('div', { className: 'stat-card' },
    el('div', { className: 'stat-value' }, value),
    el('div', { className: 'stat-label' }, label)
  );
}
