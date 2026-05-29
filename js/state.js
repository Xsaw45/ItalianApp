/**
 * Progress and state management using localStorage.
 */

const STORAGE_KEY = 'italienapp-progress';

function createDefaultState() {
  return {
    version: 1,
    lastActive: null,
    settings: {
      strictAccents: false,
      darkMode: false,
      language: 'it'
    },
    schede: {}
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const state = JSON.parse(raw);
    if (!state.version) return createDefaultState();
    return state;
  } catch {
    return createDefaultState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    console.warn('Could not save state to localStorage');
  }
}

export function getSchedaState(schedaId) {
  const state = loadState();
  return state.schede[schedaId] || null;
}

export function markTheoryViewed(schedaId) {
  const state = loadState();
  if (!state.schede[schedaId]) {
    state.schede[schedaId] = { theoryViewed: false, exercises: {} };
  }
  state.schede[schedaId].theoryViewed = true;
  state.lastActive = schedaId;
  saveState(state);
}

export function saveExerciseResult(schedaId, exerciseId, score, total) {
  const state = loadState();
  if (!state.schede[schedaId]) {
    state.schede[schedaId] = { theoryViewed: false, exercises: {} };
  }

  const prev = state.schede[schedaId].exercises[exerciseId];
  const attempts = prev && prev.attempts ? prev.attempts + 1 : 1;

  state.schede[schedaId].exercises[exerciseId] = {
    score,
    total,
    attempts,
    lastAttempt: new Date().toISOString()
  };

  state.lastActive = schedaId;
  saveState(state);
}

export function markOpenEndedDone(schedaId, exerciseId) {
  const state = loadState();
  if (!state.schede[schedaId]) {
    state.schede[schedaId] = { theoryViewed: false, exercises: {} };
  }
  state.schede[schedaId].exercises[exerciseId] = {
    attempted: true,
    lastAttempt: new Date().toISOString()
  };
  state.lastActive = schedaId;
  saveState(state);
}

export function getSettings() {
  return loadState().settings;
}

export function updateSettings(newSettings) {
  const state = loadState();
  state.settings = { ...state.settings, ...newSettings };
  saveState(state);
  return state.settings;
}

/**
 * Calculate overall progress stats.
 * @param {Object} manifest - The manifest data
 * @returns {{ completed: number, total: number, percentage: number }}
 */
export function getOverallProgress(manifest) {
  const state = loadState();
  let completed = 0;
  const schedeIds = Object.keys(manifest.schede);
  const total = schedeIds.length;

  for (const id of schedeIds) {
    const schedaState = state.schede[id];
    if (schedaState && schedaState.exercises) {
      const exerciseCount = manifest.schede[id].exerciseCount || 0;
      const attemptedCount = Object.keys(schedaState.exercises).length;
      if (attemptedCount >= exerciseCount && exerciseCount > 0) {
        completed++;
      }
    }
  }

  return {
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0
  };
}

/**
 * Get progress for a single scheda.
 * @param {string} schedaId
 * @param {number} exerciseCount
 * @returns {'not-started'|'in-progress'|'completed'}
 */
export function getSchedaProgress(schedaId, exerciseCount) {
  const state = loadState();
  const schedaState = state.schede[schedaId];

  if (!schedaState || !schedaState.exercises || Object.keys(schedaState.exercises).length === 0) {
    if (schedaState && schedaState.theoryViewed) return 'in-progress';
    return 'not-started';
  }

  const attemptedCount = Object.keys(schedaState.exercises).length;
  if (attemptedCount >= exerciseCount && exerciseCount > 0) {
    return 'completed';
  }

  return 'in-progress';
}

/**
 * Get the last active scheda ID.
 */
export function getLastActive() {
  return loadState().lastActive;
}

// -------------------------------------------------------------------------
// Spaced-repetition constants
// -------------------------------------------------------------------------
// Phase transitions:
//   0 → 1 : cycleAttempts ≥ 3 AND cycleCorrect/cycleAttempts ≥ 80%  → cooldown 2 days
//   1 → 2 : cycleAttempts ≥ 2 AND cycleCorrect/cycleAttempts ≥ 80%  → cooldown 7 days
//   2 → 3 : cycleAttempts ≥ 1 AND isCorrect                          → archived (no more quiz)
const PHASE_COOLDOWN_DAYS = [0, 2, 7];
const PHASE_MIN_ATTEMPTS   = [3, 2, 1];
const UNLOCK_THRESHOLD = 0.75; // 75% of level mastered to unlock next level

/**
 * Get a normalized vocab entry with all phase fields defaulted.
 * Handles backward compat with old entries that only have attempts/correct.
 */
function normalizeVocabEntry(raw) {
  const entry = raw || { attempts: 0, correct: 0 };
  // Backward compat: infer phase 1 from old mastery if phase missing
  let phase = entry.phase ?? (
    (entry.attempts >= 3 && entry.attempts > 0 && (entry.correct / entry.attempts) >= 0.8)
      ? 1
      : 0
  );
  return {
    attempts: entry.attempts || 0,
    correct: entry.correct || 0,
    lastAttempt: entry.lastAttempt || null,
    phase,
    cooldownUntil: entry.cooldownUntil || null,
    cycleAttempts: entry.cycleAttempts || 0,
    cycleCorrect: entry.cycleCorrect || 0
  };
}

/**
 * Save the result of a vocabulary word attempt.
 * Handles phase transitions and cooldown scheduling.
 * @param {string} wordId
 * @param {boolean} isCorrect
 */
export function saveVocabResult(wordId, isCorrect) {
  const state = loadState();
  if (!state.vocab) state.vocab = {};

  const entry = normalizeVocabEntry(state.vocab[wordId]);

  // If cooldown just expired, reset the cycle counters
  if (entry.cooldownUntil && new Date(entry.cooldownUntil) <= new Date()) {
    entry.cooldownUntil = null;
    entry.cycleAttempts = 0;
    entry.cycleCorrect = 0;
  }

  // Don't update archived words
  if (entry.phase >= 3) {
    state.vocab[wordId] = entry;
    saveState(state);
    return;
  }

  // Record this attempt in current cycle
  entry.attempts += 1;
  entry.correct += isCorrect ? 1 : 0;
  entry.lastAttempt = new Date().toISOString();
  entry.cycleAttempts += 1;
  entry.cycleCorrect += isCorrect ? 1 : 0;

  // Check if current cycle meets the mastery threshold for current phase
  const minAttempts = PHASE_MIN_ATTEMPTS[entry.phase] || 1;
  const accuracy = entry.cycleAttempts > 0 ? entry.cycleCorrect / entry.cycleAttempts : 0;
  const meetsThreshold = entry.cycleAttempts >= minAttempts && accuracy >= 0.8;

  if (meetsThreshold) {
    entry.phase += 1;
    if (entry.phase < 3) {
      // Set cooldown
      const daysAhead = PHASE_COOLDOWN_DAYS[entry.phase - 1] || 2;
      const until = new Date();
      until.setDate(until.getDate() + daysAhead);
      entry.cooldownUntil = until.toISOString();
    }
    // Reset cycle for next round
    entry.cycleAttempts = 0;
    entry.cycleCorrect = 0;
  }

  state.vocab[wordId] = entry;
  saveState(state);
}

/**
 * Get the full vocabulary progress state.
 * @returns {Object} Map of wordId → normalized entry
 */
export function getVocabState() {
  return loadState().vocab || {};
}

/**
 * Get the current phase of a word (0–3).
 * @param {string} wordId
 * @returns {number}
 */
export function getWordPhase(wordId) {
  const state = loadState();
  return normalizeVocabEntry(state.vocab?.[wordId]).phase;
}

/**
 * Check if a word's cooldown is still active (not yet expired).
 * @param {string} wordId
 * @returns {boolean}
 */
export function isWordOnCooldown(wordId) {
  const state = loadState();
  const entry = normalizeVocabEntry(state.vocab?.[wordId]);
  if (!entry.cooldownUntil) return false;
  return new Date(entry.cooldownUntil) > new Date();
}

/**
 * Check if a word's cooldown has expired and it needs re-learning.
 * (phase > 0, phase < 3, cooldown expired)
 * @param {string} wordId
 * @returns {boolean}
 */
export function isWordDue(wordId) {
  const entry = normalizeVocabEntry(getVocabState()[wordId]);
  if (entry.phase === 0 || entry.phase >= 3) return false;
  if (!entry.cooldownUntil) return false;
  return new Date(entry.cooldownUntil) <= new Date();
}

/**
 * Check if a word is mastered (phase >= 1).
 * @param {string} wordId
 * @returns {boolean}
 */
export function isWordMastered(wordId) {
  return getWordPhase(wordId) >= 1;
}

/**
 * Get the unlocked level IDs based on mastery progress.
 * @param {Object} vocabData - The vocab.json data (levels format)
 * @returns {number[]} e.g. [1], [1, 2], or [1, 2, 3]
 */
export function getUnlockedLevels(vocabData) {
  const levels = vocabData.levels || [];
  const unlocked = [];

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    const prevLevel = levels[i - 1];

    if (i === 0) {
      unlocked.push(level.id);
      continue;
    }

    // Check if previous level has 75%+ words mastered
    const prevWords = prevLevel.categories.flatMap(cat => cat.words);
    const masteredCount = prevWords.filter(w => isWordMastered(w.id)).length;
    if (prevWords.length > 0 && masteredCount / prevWords.length >= UNLOCK_THRESHOLD) {
      unlocked.push(level.id);
    }
  }

  return unlocked;
}

// -------------------------------------------------------------------------
// Conjugation spaced-repetition
// (reuses PHASE_COOLDOWN_DAYS, PHASE_MIN_ATTEMPTS, UNLOCK_THRESHOLD)
// Card ID format: "${verbId}_${tenseId}_${person}" e.g. "parlare_presente_io"
// -------------------------------------------------------------------------

const CONJ_PERSONS = ['io', 'tu', 'lui/lei', 'noi', 'voi', 'loro'];

/** All card IDs for a conjugation level */
function getConjLevelCardIds(level) {
  const ids = [];
  for (const verb of level.verbs) {
    for (const tense of level.tenses) {
      for (const person of CONJ_PERSONS) {
        ids.push(`${verb.id}_${tense.id}_${person}`);
      }
    }
  }
  return ids;
}

function normalizeConjEntry(raw) {
  const entry = raw || { attempts: 0, correct: 0 };
  return {
    attempts: entry.attempts || 0,
    correct: entry.correct || 0,
    lastAttempt: entry.lastAttempt || null,
    phase: entry.phase || 0,
    cooldownUntil: entry.cooldownUntil || null,
    cycleAttempts: entry.cycleAttempts || 0,
    cycleCorrect: entry.cycleCorrect || 0
  };
}

/**
 * Save the result of a conjugation card attempt.
 * @param {string} cardId  e.g. "parlare_presente_io"
 * @param {boolean} isCorrect
 */
export function saveConjugationResult(cardId, isCorrect) {
  const state = loadState();
  if (!state.conjugation) state.conjugation = {};

  const entry = normalizeConjEntry(state.conjugation[cardId]);

  if (entry.cooldownUntil && new Date(entry.cooldownUntil) <= new Date()) {
    entry.cooldownUntil = null;
    entry.cycleAttempts = 0;
    entry.cycleCorrect = 0;
  }

  if (entry.phase >= 3) {
    state.conjugation[cardId] = entry;
    saveState(state);
    return;
  }

  entry.attempts += 1;
  entry.correct += isCorrect ? 1 : 0;
  entry.lastAttempt = new Date().toISOString();
  entry.cycleAttempts += 1;
  entry.cycleCorrect += isCorrect ? 1 : 0;

  const minAttempts = PHASE_MIN_ATTEMPTS[entry.phase] || 1;
  const accuracy = entry.cycleAttempts > 0 ? entry.cycleCorrect / entry.cycleAttempts : 0;
  const meetsThreshold = entry.cycleAttempts >= minAttempts && accuracy >= 0.8;

  if (meetsThreshold) {
    entry.phase += 1;
    if (entry.phase < 3) {
      const daysAhead = PHASE_COOLDOWN_DAYS[entry.phase - 1] || 2;
      const until = new Date();
      until.setDate(until.getDate() + daysAhead);
      entry.cooldownUntil = until.toISOString();
    }
    entry.cycleAttempts = 0;
    entry.cycleCorrect = 0;
  }

  state.conjugation[cardId] = entry;
  saveState(state);
}

/** Get the full conjugation progress state. */
export function getConjugationState() {
  return loadState().conjugation || {};
}

/** Get current phase (0–3) of a conjugation card. */
export function getConjugationPhase(cardId) {
  const state = loadState();
  return normalizeConjEntry(state.conjugation?.[cardId]).phase;
}

/** True if cooldown is still active. */
export function isConjugationOnCooldown(cardId) {
  const state = loadState();
  const entry = normalizeConjEntry(state.conjugation?.[cardId]);
  if (!entry.cooldownUntil) return false;
  return new Date(entry.cooldownUntil) > new Date();
}

/** True if cooldown expired and card needs review (phase 1–2). */
export function isConjugationDue(cardId) {
  const entry = normalizeConjEntry(getConjugationState()[cardId]);
  if (entry.phase === 0 || entry.phase >= 3) return false;
  if (!entry.cooldownUntil) return false;
  return new Date(entry.cooldownUntil) <= new Date();
}

/** True if card has been mastered at least once (phase >= 1). */
export function isConjugationMastered(cardId) {
  return getConjugationPhase(cardId) >= 1;
}

/**
 * Get unlocked conjugation level IDs based on mastery progress.
 * @param {Object} conjData - conjugation.json data
 * @returns {number[]}
 */
export function getUnlockedConjugationLevels(conjData) {
  const levels = conjData.levels || [];
  const unlocked = [];

  for (let i = 0; i < levels.length; i++) {
    if (i === 0) { unlocked.push(levels[i].id); continue; }

    const prevCardIds = getConjLevelCardIds(levels[i - 1]);
    const masteredCount = prevCardIds.filter(id => isConjugationMastered(id)).length;
    if (prevCardIds.length > 0 && masteredCount / prevCardIds.length >= UNLOCK_THRESHOLD) {
      unlocked.push(levels[i].id);
    }
  }

  return unlocked;
}

// -------------------------------------------------------------------------
// Translation spaced-repetition
// (reuses PHASE_COOLDOWN_DAYS, PHASE_MIN_ATTEMPTS)
// Phrase ID format: "ph001", "ph002", etc.
// -------------------------------------------------------------------------

function normalizeTranslEntry(raw) {
  const entry = raw || { attempts: 0, correct: 0 };
  return {
    attempts: entry.attempts || 0,
    correct: entry.correct || 0,
    lastAttempt: entry.lastAttempt || null,
    phase: entry.phase || 0,
    cooldownUntil: entry.cooldownUntil || null,
    cycleAttempts: entry.cycleAttempts || 0,
    cycleCorrect: entry.cycleCorrect || 0
  };
}

/**
 * Save the result of a translation phrase attempt.
 * @param {string} phraseId  e.g. "ph001"
 * @param {boolean} isCorrect
 */
export function saveTranslationResult(phraseId, isCorrect) {
  const state = loadState();
  if (!state.translation) state.translation = {};

  const entry = normalizeTranslEntry(state.translation[phraseId]);

  if (entry.cooldownUntil && new Date(entry.cooldownUntil) <= new Date()) {
    entry.cooldownUntil = null;
    entry.cycleAttempts = 0;
    entry.cycleCorrect = 0;
  }

  if (entry.phase >= 3) {
    state.translation[phraseId] = entry;
    saveState(state);
    return;
  }

  entry.attempts += 1;
  entry.correct += isCorrect ? 1 : 0;
  entry.lastAttempt = new Date().toISOString();
  entry.cycleAttempts += 1;
  entry.cycleCorrect += isCorrect ? 1 : 0;

  const minAttempts = PHASE_MIN_ATTEMPTS[entry.phase] || 1;
  const accuracy = entry.cycleAttempts > 0 ? entry.cycleCorrect / entry.cycleAttempts : 0;
  const meetsThreshold = entry.cycleAttempts >= minAttempts && accuracy >= 0.8;

  if (meetsThreshold) {
    entry.phase += 1;
    if (entry.phase < 3) {
      const daysAhead = PHASE_COOLDOWN_DAYS[entry.phase - 1] || 2;
      const until = new Date();
      until.setDate(until.getDate() + daysAhead);
      entry.cooldownUntil = until.toISOString();
    }
    entry.cycleAttempts = 0;
    entry.cycleCorrect = 0;
  }

  state.translation[phraseId] = entry;
  saveState(state);
}

/** Get the full translation progress state. */
export function getTranslationState() {
  return loadState().translation || {};
}

/** Get current phase (0–3) of a translation phrase. */
export function getTranslationPhase(phraseId) {
  const state = loadState();
  return normalizeTranslEntry(state.translation?.[phraseId]).phase;
}

/** True if cooldown is still active. */
export function isTranslationOnCooldown(phraseId) {
  const state = loadState();
  const entry = normalizeTranslEntry(state.translation?.[phraseId]);
  if (!entry.cooldownUntil) return false;
  return new Date(entry.cooldownUntil) > new Date();
}

/** True if cooldown expired and phrase needs review (phase 1–2). */
export function isTranslationDue(phraseId) {
  const entry = normalizeTranslEntry(getTranslationState()[phraseId]);
  if (entry.phase === 0 || entry.phase >= 3) return false;
  if (!entry.cooldownUntil) return false;
  return new Date(entry.cooldownUntil) <= new Date();
}

/** True if phrase has been mastered at least once (phase >= 1). */
export function isTranslationMastered(phraseId) {
  return getTranslationPhase(phraseId) >= 1;
}
