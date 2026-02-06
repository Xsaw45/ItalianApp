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
      darkMode: false
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
