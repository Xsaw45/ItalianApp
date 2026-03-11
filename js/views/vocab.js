/**
 * Vocabulary learning module.
 * Two tabs: word list (with mastery indicators) and quiz mode (20 random questions).
 */
import { el, clearElement } from '../utils/dom.js';
import { checkAnswer } from '../utils/normalize.js';
import { getSettings, saveVocabResult, getVocabState, isWordMastered } from '../state.js';

const QUIZ_SIZE = 20;

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

let _vocabData = null;

async function loadVocab() {
  if (_vocabData) return _vocabData;
  const res = await fetch('./data/vocab.json');
  if (!res.ok) throw new Error('Impossibile caricare il vocabolario.');
  _vocabData = await res.json();
  return _vocabData;
}

function getAllWords(vocabData) {
  return vocabData.categories.flatMap(cat => cat.words);
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function renderVocabView(tab = 'list') {
  const app = document.getElementById('app');
  clearElement(app);

  try {
    const vocabData = await loadVocab();

    // Header
    app.appendChild(el('h2', {
      style: { fontFamily: 'var(--font-heading)', color: 'var(--color-text)', marginBottom: 'var(--space-lg)' }
    }, 'Vocabolario'));

    // Tabs
    const tabs = el('div', { className: 'tabs', style: { marginBottom: 'var(--space-xl)' } });
    const listTab = el('button', {
      className: `tab ${tab === 'list' ? 'active' : ''}`,
      onClick: () => renderVocabView('list')
    }, 'Lista');
    const quizTab = el('button', {
      className: `tab ${tab === 'quiz' ? 'active' : ''}`,
      onClick: () => renderVocabView('quiz')
    }, 'Pratica');
    tabs.appendChild(listTab);
    tabs.appendChild(quizTab);
    app.appendChild(tabs);

    const content = el('div', { className: 'tab-content' });
    app.appendChild(content);

    if (tab === 'list') {
      renderWordList(vocabData, content);
    } else {
      renderQuizStart(vocabData, content);
    }
  } catch (err) {
    clearElement(app);
    app.appendChild(el('p', { style: { color: 'var(--color-incorrect)' } }, `Errore: ${err.message}`));
  }
}

// ---------------------------------------------------------------------------
// Tab 1 — Word list
// ---------------------------------------------------------------------------

function renderWordList(vocabData, container) {
  const vocabState = getVocabState();

  for (const cat of vocabData.categories) {
    container.appendChild(el('h3', {
      style: {
        fontFamily: 'var(--font-heading)',
        color: 'var(--color-text)',
        margin: 'var(--space-lg) 0 var(--space-sm)'
      }
    }, cat.name));

    const table = el('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        marginBottom: 'var(--space-md)'
      }
    });

    for (const word of cat.words) {
      const ws = vocabState[word.id];
      const mastered = isWordMastered(word.id);
      const seen = ws && ws.attempts > 0;

      let dotClass = '';
      if (mastered) dotClass = 'completed';
      else if (seen) dotClass = 'started';

      const row = el('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: '20px 1fr 1fr',
          alignItems: 'center',
          gap: 'var(--space-md)',
          padding: 'var(--space-xs) var(--space-sm)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 'var(--text-sm)'
        }
      });

      row.appendChild(el('span', { className: `progress-dot ${dotClass}` }));
      row.appendChild(el('span', { style: { fontWeight: '500' } }, word.it));
      row.appendChild(el('span', { style: { color: 'var(--color-text-muted)' } }, word.fr));

      table.appendChild(row);
    }

    container.appendChild(table);
  }
}

// ---------------------------------------------------------------------------
// Tab 2 — Quiz: start screen
// ---------------------------------------------------------------------------

function renderQuizStart(vocabData, container) {
  const allWords = getAllWords(vocabData);
  const vocabState = getVocabState();

  const masteredCount = allWords.filter(w => isWordMastered(w.id)).length;
  const seenCount = allWords.filter(w => vocabState[w.id]?.attempts > 0).length;
  const total = allWords.length;

  // Stats
  const statsGrid = el('div', { className: 'stats-grid', style: { marginBottom: 'var(--space-xl)' } });
  statsGrid.appendChild(createStat(String(masteredCount), 'Parole\nmaîtrisées'));
  statsGrid.appendChild(createStat(`${seenCount}/${total}`, 'Parole\nviste'));
  statsGrid.appendChild(createStat(String(total - masteredCount), 'Da\nimparare'));
  container.appendChild(statsGrid);

  // Description
  container.appendChild(el('p', {
    style: { color: 'var(--color-text-muted)', marginBottom: 'var(--space-xl)', fontSize: 'var(--text-sm)' }
  }, `Il test comprende ${Math.min(QUIZ_SIZE, total)} domande casuali. Per ogni parola devi scrivere la traduzione (italiano \u2194 francese). Ogni risposta corretta vale 1 punto.`));

  // Start button
  const startBtn = el('button', {
    className: 'btn btn-primary btn-lg',
    onClick: () => startQuiz(vocabData, container)
  }, 'Inizia il test');
  container.appendChild(startBtn);
}

// ---------------------------------------------------------------------------
// Tab 2 — Quiz: engine
// ---------------------------------------------------------------------------

function startQuiz(vocabData, container) {
  clearElement(container);

  const allWords = getAllWords(vocabData);
  // Pick random words
  const shuffled = [...allWords].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(QUIZ_SIZE, shuffled.length));

  // Assign random direction to each question
  const questions = selected.map(word => ({
    word,
    direction: Math.random() < 0.5 ? 'it-fr' : 'fr-it'
  }));

  const results = [];

  function showQuestion(index) {
    clearElement(container);
    if (index >= questions.length) {
      renderQuizResults(results, container, vocabData);
      return;
    }

    const { word, direction } = questions[index];
    const prompt = direction === 'it-fr' ? word.it : word.fr;
    const expected = direction === 'it-fr' ? word.fr : word.it;
    const langLabel = direction === 'it-fr' ? 'Italiano \u2192 Francese' : 'Francese \u2192 Italiano';

    // Progress bar
    const progressWrap = el('div', { className: 'progress-bar', style: { marginBottom: 'var(--space-lg)' } });
    progressWrap.appendChild(el('div', {
      className: 'progress-bar-fill',
      style: { width: `${Math.round((index / questions.length) * 100)}%` }
    }));
    container.appendChild(progressWrap);

    // Counter
    container.appendChild(el('p', {
      style: { fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-lg)' }
    }, `Domanda ${index + 1} / ${questions.length} \u2022 ${langLabel}`));

    // Question card
    const card = el('div', {
      className: 'exercise-card',
      style: { marginBottom: 'var(--space-lg)' }
    });

    card.appendChild(el('p', {
      style: {
        fontSize: 'var(--text-xl)',
        fontFamily: 'var(--font-heading)',
        color: 'var(--color-text)',
        marginBottom: 'var(--space-lg)',
        textAlign: 'center'
      }
    }, prompt));

    const input = el('input', {
      type: 'text',
      className: 'exercise-input',
      placeholder: 'Scrivi la traduzione...',
      style: { width: '100%', fontSize: 'var(--text-md)', padding: 'var(--space-sm)' }
    });
    card.appendChild(input);

    // Correction area (hidden initially)
    const correctionArea = el('div', {
      style: { marginTop: 'var(--space-md)', minHeight: '24px' }
    });
    card.appendChild(correctionArea);

    container.appendChild(card);

    // Confirm button
    const confirmBtn = el('button', {
      className: 'btn btn-primary',
      style: { width: '100%' }
    }, 'Conferma');
    container.appendChild(confirmBtn);

    let answered = false;

    function submitAnswer() {
      if (answered) {
        showQuestion(index + 1);
        return;
      }
      answered = true;

      const { strictAccents } = getSettings();
      // For FR translations that have slashes (multiple acceptable forms), split them
      const expectedAlts = expected.split(' / ').map(s => s.trim());
      const isCorrect = checkAnswer(input.value, expectedAlts, strictAccents);

      input.disabled = true;
      input.classList.add(isCorrect ? 'correct' : 'incorrect');

      if (!isCorrect) {
        correctionArea.appendChild(el('div', {
          style: {
            color: 'var(--color-incorrect)',
            fontSize: 'var(--text-sm)',
            marginTop: 'var(--space-xs)'
          }
        }, `\u2716 Risposta corretta: ${expected}`));
      } else {
        correctionArea.appendChild(el('div', {
          style: { color: 'var(--color-correct)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-xs)' }
        }, '\u2714 Corretto!'));
      }

      saveVocabResult(word.id, isCorrect);
      results.push({ word, direction, isCorrect, userAnswer: input.value, expected });

      confirmBtn.textContent = 'Avanti \u2192';
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

function renderQuizResults(results, container, vocabData) {
  clearElement(container);

  const score = results.filter(r => r.isCorrect).length;
  const total = results.length;
  const pct = Math.round((score / total) * 100);

  const scoreColor = score >= 16
    ? 'var(--color-correct)'
    : score >= 10
      ? 'var(--color-accent)'
      : 'var(--color-incorrect)';

  // Score display
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
  }, `${pct}% di risposte corrette`));
  container.appendChild(scoreCard);

  // Wrong answers
  const wrong = results.filter(r => !r.isCorrect);
  if (wrong.length > 0) {
    container.appendChild(el('h3', {
      style: { fontFamily: 'var(--font-heading)', color: 'var(--color-text)', marginBottom: 'var(--space-md)' }
    }, 'Da rivedere'));

    const wrongList = el('div', { style: { display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', marginBottom: 'var(--space-xl)' } });
    for (const r of wrong) {
      const row = el('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: 'var(--space-md)',
          padding: 'var(--space-sm) var(--space-md)',
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border-light)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 'var(--text-sm)'
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
    }, 'Perfetto! Tutte le risposte sono corrette!'));
  }

  // Retry button
  const retryBtn = el('button', {
    className: 'btn btn-primary btn-lg',
    style: { width: '100%' },
    onClick: () => renderVocabView('quiz')
  }, 'Riprova');
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
