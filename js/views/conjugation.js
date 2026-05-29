/**
 * Conjugation learning module — 3 levels with spaced repetition.
 * Cards: verbId_tenseId_person (e.g. "parlare_presente_io")
 */
import { el, clearElement } from '../utils/dom.js';
import { checkAnswer } from '../utils/normalize.js';
import {
  getSettings, saveConjugationResult, getConjugationState,
  isConjugationMastered, isConjugationOnCooldown, isConjugationDue,
  getConjugationPhase, getUnlockedConjugationLevels
} from '../state.js';
import { t, getLanguage } from '../i18n.js';

const QUIZ_SIZE = 20;
const PERSONS = ['io', 'tu', 'lui/lei', 'noi', 'voi', 'loro'];

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

let _conjData = null;

async function loadConj() {
  if (_conjData) return _conjData;
  const res = await fetch('./data/conjugation.json');
  if (!res.ok) throw new Error(t('conj.error') + res.status);
  _conjData = await res.json();
  return _conjData;
}

/** All cards [{verbId, tenseId, person, answer, levelId}] for a level */
function getLevelCards(level) {
  const cards = [];
  for (const verb of level.verbs) {
    for (const tense of level.tenses) {
      for (const person of PERSONS) {
        const answer = verb.forms?.[tense.id]?.[person];
        if (answer) {
          cards.push({ verbId: verb.id, tenseId: tense.id, person, answer, levelId: level.id });
        }
      }
    }
  }
  return cards;
}

function getAllCards(conjData) {
  return conjData.levels.flatMap(level => getLevelCards(level));
}

function getLevelName(level) {
  return getLanguage() === 'fr' ? (level.name_fr || level.name) : level.name;
}

function getTenseName(tense) {
  return getLanguage() === 'fr' ? (tense.name_fr || tense.name) : tense.name;
}

/** cardId from components */
function cardId(verbId, tenseId, person) {
  return `${verbId}_${tenseId}_${person}`;
}

/** Days remaining on cooldown */
function cooldownDaysLeft(cid) {
  const entry = getConjugationState()[cid];
  if (!entry || !entry.cooldownUntil) return 0;
  const diff = new Date(entry.cooldownUntil) - new Date();
  return diff <= 0 ? 0 : Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function renderConjugationView(tab = 'list', selectedLevelId = null) {
  const app = document.getElementById('app');
  clearElement(app);

  try {
    const conjData = await loadConj();
    const unlockedLevels = getUnlockedConjugationLevels(conjData);

    const container = el('div', { className: 'vocab-container' });

    // Title
    container.appendChild(el('h1', { className: 'vocab-title' }, t('conj.title')));

    // Tabs
    const tabs = el('div', { className: 'tabs' });
    const tabList = el('button', {
      className: `tab${tab === 'list' ? ' active' : ''}`,
      onclick: () => renderConjugationView('list', selectedLevelId)
    }, t('conj.tab.list'));
    const tabQuiz = el('button', {
      className: `tab${tab === 'quiz' ? ' active' : ''}`,
      onclick: () => renderConjugationView('quiz', selectedLevelId)
    }, t('conj.tab.quiz'));
    tabs.appendChild(tabList);
    tabs.appendChild(tabQuiz);
    container.appendChild(tabs);

    const content = el('div', { className: 'vocab-content' });
    container.appendChild(content);
    app.appendChild(container);

    if (tab === 'list') {
      renderVerbList(content, conjData, unlockedLevels, selectedLevelId);
    } else {
      renderQuizStart(content, conjData, unlockedLevels);
    }
  } catch (err) {
    app.appendChild(el('p', { className: 'error' }, t('conj.error') + err.message));
  }
}

// ---------------------------------------------------------------------------
// Tab 1: Verb list
// ---------------------------------------------------------------------------

function renderVerbList(container, conjData, unlockedLevels, selectedLevelId) {
  const levels = conjData.levels;
  const allUnlockedCards = levels
    .filter(lv => unlockedLevels.includes(lv.id))
    .flatMap(lv => getLevelCards(lv));

  // Level selector
  const selectorRow = el('div', { className: 'vocab-level-selector' });
  const select = el('select', { className: 'vocab-select' });

  const allOpt = el('option', { value: 'all' }, t('conj.level.all'));
  select.appendChild(allOpt);

  for (const lv of levels) {
    if (!unlockedLevels.includes(lv.id)) continue;
    const opt = el('option', { value: String(lv.id) }, getLevelName(lv));
    select.appendChild(opt);
  }

  const currentVal = selectedLevelId != null ? String(selectedLevelId) : 'all';
  select.value = currentVal;
  select.onchange = () => renderConjugationView('list', select.value === 'all' ? null : Number(select.value));
  selectorRow.appendChild(select);
  container.appendChild(selectorRow);

  // Determine which levels to display
  const displayLevels = selectedLevelId && selectedLevelId !== 'all'
    ? levels.filter(lv => lv.id === Number(selectedLevelId))
    : levels;

  for (const level of displayLevels) {
    const isUnlocked = unlockedLevels.includes(level.id);

    const levelSection = el('div', { className: 'vocab-level-section' });

    // Level header
    const levelCards = getLevelCards(level);
    const masteredCount = levelCards.filter(c => isConjugationMastered(cardId(c.verbId, c.tenseId, c.person))).length;
    const pct = levelCards.length > 0 ? Math.round(masteredCount / levelCards.length * 100) : 0;

    const levelHeader = el('div', { className: 'vocab-level-header' });
    levelHeader.appendChild(el('span', { className: 'vocab-level-name' }, getLevelName(level)));
    if (isUnlocked) {
      levelHeader.appendChild(el('span', { className: 'vocab-level-pct' },
        t('conj.level.progress', { done: masteredCount, total: levelCards.length, pct })));
    }
    levelSection.appendChild(levelHeader);

    if (!isUnlocked) {
      // Locked teaser
      const prevLevel = levels[levels.indexOf(level) - 1];
      const prevCards = prevLevel ? getLevelCards(prevLevel) : [];
      const prevMastered = prevCards.filter(c => isConjugationMastered(cardId(c.verbId, c.tenseId, c.person))).length;
      const needed = Math.ceil(prevCards.length * 0.75) - prevMastered;
      const prevPct = prevCards.length > 0 ? Math.round(prevMastered / prevCards.length * 100) : 0;

      const teaser = el('div', { className: 'vocab-locked-teaser' });
      teaser.appendChild(el('div', { className: 'vocab-locked-icon' }, '🔒'));
      teaser.appendChild(el('div', { className: 'vocab-locked-label' },
        needed > 0 ? t('conj.unlock.need', { n: needed, l: level.id }) : getLevelName(level)));

      const barWrap = el('div', { className: 'vocab-progress-bar-wrap' });
      const barTrack = el('div', { className: 'vocab-progress-track' });
      const barFill = el('div', { className: 'vocab-progress-fill', style: { width: `${prevPct}%` } });
      const marker = el('div', { className: 'vocab-progress-marker', style: { left: '75%' } });
      barTrack.appendChild(barFill);
      barTrack.appendChild(marker);
      barWrap.appendChild(barTrack);
      const pctLabel = el('span', { className: 'vocab-unlock-pct' }, t('conj.unlock.pct'));
      barWrap.appendChild(pctLabel);
      teaser.appendChild(barWrap);
      levelSection.appendChild(teaser);
      container.appendChild(levelSection);
      continue;
    }

    // Tense tabs for this level (only if multiple tenses)
    const conjState = getConjugationState();

    for (const verb of level.verbs) {
      const verbCard = el('div', { className: 'conj-verb-card' });

      // Verb header
      const verbHeader = el('div', { className: 'conj-verb-header' });
      const verbTitle = el('span', { className: 'conj-verb-infinitive' }, verb.it);
      const verbTrans = el('span', { className: 'conj-verb-translation' }, verb.fr);
      const verbGroup = el('span', { className: 'conj-verb-group' }, verb.group);
      verbHeader.appendChild(verbTitle);
      verbHeader.appendChild(verbTrans);
      verbHeader.appendChild(verbGroup);
      verbCard.appendChild(verbHeader);

      // Conjugation table: rows=persons, columns=tenses
      const table = el('table', { className: 'conj-table' });
      const thead = el('thead');
      const headerRow = el('tr');
      headerRow.appendChild(el('th', {}, ''));
      for (const tense of level.tenses) {
        headerRow.appendChild(el('th', {}, getTenseName(tense)));
      }
      thead.appendChild(headerRow);
      table.appendChild(thead);

      const tbody = el('tbody');
      for (const person of PERSONS) {
        const tr = el('tr');
        tr.appendChild(el('td', { className: 'conj-person' }, person));
        for (const tense of level.tenses) {
          const cid = cardId(verb.id, tense.id, person);
          const form = verb.forms?.[tense.id]?.[person] || '—';
          const phase = getConjugationPhase(cid);
          const onCooldown = isConjugationOnCooldown(cid);
          const due = isConjugationDue(cid);
          const entry = conjState[cid];
          const attempts = entry?.attempts || 0;

          let statusClass = 'conj-cell-new';
          let statusBadge = t('conj.status.new');
          if (phase >= 3) {
            statusClass = 'conj-cell-archived';
            statusBadge = t('conj.status.archived');
          } else if (onCooldown) {
            statusClass = 'conj-cell-cooldown';
            const days = cooldownDaysLeft(cid);
            statusBadge = t('conj.status.cooldown', { n: days });
          } else if (due) {
            statusClass = 'conj-cell-due';
            statusBadge = t('conj.status.due');
          } else if (attempts > 0) {
            statusClass = 'conj-cell-learning';
            statusBadge = t('conj.status.learning');
          }

          const td = el('td', { className: `conj-cell ${statusClass}` });
          td.appendChild(el('span', { className: 'conj-form' }, form));
          td.appendChild(el('span', { className: 'conj-status-badge' }, statusBadge));
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      verbCard.appendChild(table);
      levelSection.appendChild(verbCard);
    }

    container.appendChild(levelSection);
  }
}

// ---------------------------------------------------------------------------
// Tab 2: Quiz start screen
// ---------------------------------------------------------------------------

function renderQuizStart(container, conjData, unlockedLevels) {
  const allCards = conjData.levels
    .filter(lv => unlockedLevels.includes(lv.id))
    .flatMap(lv => getLevelCards(lv));

  const masteredCards = allCards.filter(c => isConjugationMastered(cardId(c.verbId, c.tenseId, c.person)));
  const seenCards     = allCards.filter(c => (getConjugationState()[cardId(c.verbId, c.tenseId, c.person)]?.attempts || 0) > 0);
  const toLearn       = allCards.length - masteredCards.length;

  // Stats row
  const statsRow = el('div', { className: 'vocab-stats-row' });
  statsRow.appendChild(createStat(masteredCards.length, t('conj.stat.mastered')));
  statsRow.appendChild(createStat(seenCards.length, t('conj.stat.seen')));
  statsRow.appendChild(createStat(toLearn, t('conj.stat.learn')));
  container.appendChild(statsRow);

  // Level progress bars
  const levelsSection = el('div', { className: 'vocab-levels-progress' });
  for (const level of conjData.levels) {
    const isUnlocked = unlockedLevels.includes(level.id);
    const levelCards = getLevelCards(level);
    const mastered = levelCards.filter(c => isConjugationMastered(cardId(c.verbId, c.tenseId, c.person))).length;
    const pct = levelCards.length > 0 ? Math.round(mastered / levelCards.length * 100) : 0;

    const row = el('div', { className: `vocab-level-progress-row${isUnlocked ? '' : ' locked'}` });
    const label = el('div', { className: 'vocab-level-progress-label' });
    label.appendChild(el('span', {}, getLevelName(level)));
    if (!isUnlocked) label.appendChild(el('span', { className: 'vocab-locked-badge' }, t('conj.locked')));
    label.appendChild(el('span', { className: 'vocab-level-pct-label' },
      t('conj.level.progress', { done: mastered, total: levelCards.length, pct })));
    row.appendChild(label);

    const barTrack = el('div', { className: 'vocab-progress-track' });
    const barFill = el('div', { className: `vocab-progress-fill${isUnlocked ? '' : ' locked'}`, style: { width: `${pct}%` } });
    const marker = el('div', { className: 'vocab-progress-marker', style: { left: '75%' } });
    barTrack.appendChild(barFill);
    barTrack.appendChild(marker);
    row.appendChild(barTrack);
    levelsSection.appendChild(row);
  }
  container.appendChild(levelsSection);

  // Quiz pool
  const pool = buildQuizPool(conjData, unlockedLevels);
  const dueCount = pool.filter(c => isConjugationDue(cardId(c.verbId, c.tenseId, c.person))).length;

  const quizBox = el('div', { className: 'vocab-quiz-box' });
  if (dueCount > 0) {
    quizBox.appendChild(el('div', { className: 'vocab-due-badge' }, t('conj.due.badge', { n: dueCount })));
  }
  quizBox.appendChild(el('p', { className: 'vocab-quiz-desc' },
    t('conj.quiz.desc', { n: Math.min(QUIZ_SIZE, pool.length) })));

  if (pool.length === 0) {
    quizBox.appendChild(el('p', { className: 'vocab-pool-empty' }, t('conj.pool.empty')));
  } else {
    const startBtn = el('button', {
      className: 'btn btn-primary vocab-start-btn',
      onclick: () => startQuiz(pool, container.parentElement)
    }, t('conj.quiz.start'));
    quizBox.appendChild(startBtn);
  }

  container.appendChild(quizBox);
}

function createStat(value, label) {
  const stat = el('div', { className: 'vocab-stat' });
  stat.appendChild(el('div', { className: 'vocab-stat-value' }, String(value)));
  const labelEl = el('div', { className: 'vocab-stat-label' });
  labelEl.innerHTML = label.replace('\n', '<br>');
  stat.appendChild(labelEl);
  return stat;
}

// ---------------------------------------------------------------------------
// Quiz pool builder
// ---------------------------------------------------------------------------

function buildQuizPool(conjData, unlockedLevels) {
  const due = [];
  const fresh = [];

  for (const level of conjData.levels) {
    if (!unlockedLevels.includes(level.id)) continue;
    for (const card of getLevelCards(level)) {
      const cid = cardId(card.verbId, card.tenseId, card.person);
      if (getConjugationPhase(cid) >= 3) continue;     // archived
      if (isConjugationOnCooldown(cid)) continue;      // on cooldown

      if (isConjugationDue(cid)) {
        due.push({ ...card, cardId: cid });
      } else {
        fresh.push({ ...card, cardId: cid });
      }
    }
  }

  const shuffleDue   = due.sort(() => Math.random() - 0.5);
  const shuffleFresh = fresh.sort(() => Math.random() - 0.5);
  return [...shuffleDue, ...shuffleFresh].slice(0, QUIZ_SIZE);
}

// ---------------------------------------------------------------------------
// Quiz engine
// ---------------------------------------------------------------------------

function startQuiz(pool, container) {
  clearElement(container);

  // Look up verb and tense display info from conjData
  const questions = pool.map(card => ({
    ...card,
    cid: card.cardId || cardId(card.verbId, card.tenseId, card.person)
  }));

  const results = [];
  showQuestion(0, questions, results, container);
}

function getTenseDisplayName(tenseId) {
  const key = `conj.tense.${tenseId}`;
  return t(key);
}

function showQuestion(index, questions, results, container) {
  clearElement(container);

  const card = questions[index];
  const total = questions.length;
  const { strictAccents } = getSettings();

  // Progress bar
  const progressWrap = el('div', { className: 'vocab-quiz-progress' });
  const progressBar = el('div', { className: 'vocab-quiz-progress-bar' });
  const progressFill = el('div', {
    className: 'vocab-quiz-progress-fill',
    style: { width: `${(index / total) * 100}%` }
  });
  progressBar.appendChild(progressFill);
  progressWrap.appendChild(el('span', { className: 'vocab-quiz-counter' }, t('conj.question', { i: index + 1, n: total })));
  progressWrap.appendChild(progressBar);
  container.appendChild(progressWrap);

  // Question card
  const questionCard = el('div', { className: 'vocab-question-card' });

  // Level badge + tense label
  const meta = el('div', { className: 'vocab-question-meta' });
  meta.appendChild(el('span', { className: 'vocab-level-badge' }, t('conj.quiz.level.badge', { n: card.levelId })));
  meta.appendChild(el('span', { className: 'vocab-tense-label' }, getTenseDisplayName(card.tenseId)));
  questionCard.appendChild(meta);

  // Prompt: verb — person
  const prompt = el('div', { className: 'vocab-question-prompt' });
  prompt.appendChild(el('span', { className: 'conj-prompt-verb' }, card.verbId));
  prompt.appendChild(el('span', { className: 'conj-prompt-dash' }, ' — '));
  prompt.appendChild(el('span', { className: 'conj-prompt-person' }, card.person));
  questionCard.appendChild(prompt);

  // Input
  const input = el('input', {
    type: 'text',
    className: 'vocab-input',
    placeholder: t('conj.placeholder'),
    autocomplete: 'off',
    spellcheck: false
  });
  questionCard.appendChild(input);

  // Correction area (hidden until answer submitted)
  const correction = el('div', { className: 'vocab-correction hidden' });
  questionCard.appendChild(correction);

  // Confirm / Next button
  let answered = false;
  const btn = el('button', { className: 'btn btn-primary' }, t('conj.confirm'));

  btn.onclick = () => {
    if (!answered) {
      answered = true;
      // Accepted answers: split by " / " for essere verb variants
      const expectedAlts = card.answer.split(' / ').map(s => s.trim());
      const isCorrect = expectedAlts.some(alt => checkAnswer(input.value, alt, strictAccents));

      saveConjugationResult(card.cid, isCorrect);
      results.push({ card, correct: isCorrect, given: input.value });

      input.disabled = true;
      correction.classList.remove('hidden');
      if (isCorrect) {
        correction.textContent = t('conj.correct');
        correction.className = 'vocab-correction correct';
      } else {
        correction.textContent = t('conj.wrong') + card.answer;
        correction.className = 'vocab-correction wrong';
      }
      btn.textContent = index + 1 < total ? t('conj.next') : t('conj.confirm');
    } else {
      if (index + 1 < total) {
        showQuestion(index + 1, questions, results, container);
      } else {
        showResults(results, container);
      }
    }
  };

  input.addEventListener('keydown', e => { if (e.key === 'Enter') btn.click(); });

  questionCard.appendChild(btn);
  container.appendChild(questionCard);

  // Auto-focus input
  setTimeout(() => input.focus(), 50);
}

function showResults(results, container) {
  clearElement(container);

  const correct = results.filter(r => r.correct).length;
  const total = results.length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  const resultCard = el('div', { className: 'vocab-result-card' });

  // Score
  const scoreEl = el('div', {
    className: 'vocab-score',
    style: { color: pct >= 80 ? 'var(--color-correct)' : pct >= 50 ? 'var(--color-accent)' : 'var(--color-incorrect)' }
  }, `${correct} / ${total}`);
  resultCard.appendChild(scoreEl);
  resultCard.appendChild(el('div', { className: 'vocab-score-pct' }, `${pct} ${t('conj.result.pct')}`));

  if (pct === 100) {
    resultCard.appendChild(el('p', { className: 'vocab-perfect' }, t('conj.perfect')));
  }

  // Wrong answers
  const wrong = results.filter(r => !r.correct);
  if (wrong.length > 0) {
    resultCard.appendChild(el('h3', { className: 'vocab-review-title' }, t('conj.to.review')));
    const reviewList = el('div', { className: 'vocab-review-list' });
    for (const r of wrong) {
      const row = el('div', { className: 'vocab-review-row' });
      row.appendChild(el('span', { className: 'vocab-review-prompt' },
        `${r.card.verbId} — ${r.card.person} (${getTenseDisplayName(r.card.tenseId)})`));
      row.appendChild(el('span', { className: 'vocab-review-arrow' }, '→'));
      row.appendChild(el('span', { className: 'vocab-review-answer' }, r.card.answer));
      if (r.given.trim()) {
        row.appendChild(el('span', { className: 'vocab-review-given' }, `(${r.given})`));
      }
      reviewList.appendChild(row);
    }
    resultCard.appendChild(reviewList);
  }

  // Retry button
  const retryBtn = el('button', {
    className: 'btn btn-secondary vocab-retry-btn',
    onclick: () => renderConjugationView('quiz')
  }, t('conj.retry'));
  resultCard.appendChild(retryBtn);

  container.appendChild(resultCard);
}
