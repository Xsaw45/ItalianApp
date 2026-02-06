/**
 * Exercise renderer - dispatches to per-type renderers.
 */
import { el } from '../utils/dom.js';
import { renderFillInBlank, checkFillInBlank } from './exercises/fill-in-blank.js';
import { renderMultipleChoice, checkMultipleChoice } from './exercises/multiple-choice.js';
import { renderTransformation, checkTransformation } from './exercises/transformation.js';
import { renderSentenceCompletion, checkSentenceCompletion } from './exercises/sentence-completion.js';
import { renderSentenceRewriting, checkSentenceRewriting } from './exercises/sentence-rewriting.js';
import { renderTableCompletion, checkTableCompletion } from './exercises/table-completion.js';
import { renderMatching, checkMatching } from './exercises/matching.js';
import { renderOpenEnded } from './exercises/open-ended.js';
import { saveExerciseResult } from '../state.js';

const renderers = {
  'fill-in-blank':       { render: renderFillInBlank,       check: checkFillInBlank },
  'multiple-choice':     { render: renderMultipleChoice,    check: checkMultipleChoice },
  'transformation':      { render: renderTransformation,    check: checkTransformation },
  'sentence-completion': { render: renderSentenceCompletion, check: checkSentenceCompletion },
  'sentence-rewriting':  { render: renderSentenceRewriting, check: checkSentenceRewriting },
  'table-completion':    { render: renderTableCompletion,   check: checkTableCompletion },
  'matching':            { render: renderMatching,           check: checkMatching },
  'open-ended':          { render: renderOpenEnded,          check: null },
};

/**
 * Render all exercises for a scheda.
 * @param {Object} schedaData - The full scheda data
 * @param {HTMLElement} container
 */
export function renderExercises(schedaData, container) {
  const schedaId = schedaData.meta.id;

  for (const exercise of schedaData.exercises) {
    const card = el('div', { className: 'exercise-card', dataset: { exerciseId: exercise.id } });

    // Header
    const header = el('div', { className: 'exercise-header' });
    header.appendChild(el('span', { className: 'exercise-number' }, String(exercise.number)));
    header.appendChild(el('span', { className: 'exercise-instruction' }, exercise.instruction));
    card.appendChild(header);

    // Body
    const body = el('div', { className: 'exercise-body' });
    const renderer = renderers[exercise.type];
    if (renderer) {
      renderer.render(exercise, body);
    } else {
      body.appendChild(el('p', { style: { color: 'var(--color-text-muted)' } },
        `Tipo di esercizio non supportato: ${exercise.type}`));
    }
    card.appendChild(body);

    // Actions
    const actions = el('div', { className: 'exercise-actions' });

    if (renderer && renderer.check) {
      const checkBtn = el('button', {
        className: 'btn btn-primary',
        onClick: () => handleCheck(schedaId, exercise, body, actions, checkBtn, retryBtn)
      }, 'Controlla');

      const retryBtn = el('button', {
        className: 'btn btn-outline',
        style: { display: 'none' },
        onClick: () => handleRetry(exercise, body, actions, checkBtn, retryBtn)
      }, 'Riprova');

      const showBtn = el('button', {
        className: 'btn btn-ghost',
        onClick: () => handleShowSolutions(exercise, body, showBtn)
      }, 'Mostra soluzioni');

      actions.appendChild(checkBtn);
      actions.appendChild(retryBtn);
      actions.appendChild(showBtn);
    }

    card.appendChild(actions);
    container.appendChild(card);
  }
}

function handleCheck(schedaId, exercise, body, actions, checkBtn, retryBtn) {
  const renderer = renderers[exercise.type];
  if (!renderer || !renderer.check) return;

  const result = renderer.check(exercise, body);

  // Display score
  const existingScore = actions.querySelector('.exercise-score');
  if (existingScore) existingScore.remove();

  const scoreEl = el('span', {
    className: `exercise-score ${result.score / result.total >= 0.8 ? 'good' : 'needs-work'}`
  }, `${result.score}/${result.total} corrette`);
  actions.appendChild(scoreEl);

  // Show retry, hide check
  checkBtn.style.display = 'none';
  retryBtn.style.display = '';

  // Save progress
  saveExerciseResult(schedaId, exercise.id, result.score, result.total);
}

function handleRetry(exercise, body, actions, checkBtn, retryBtn) {
  const renderer = renderers[exercise.type];
  if (!renderer) return;

  // Clear the exercise body and re-render
  body.innerHTML = '';
  renderer.render(exercise, body);

  // Reset buttons
  checkBtn.style.display = '';
  retryBtn.style.display = 'none';

  const existingScore = actions.querySelector('.exercise-score');
  if (existingScore) existingScore.remove();
}

function handleShowSolutions(exercise, body, showBtn) {
  const renderer = renderers[exercise.type];
  if (!renderer || !renderer.check) return;

  // Fill in all answers and check
  fillAnswers(exercise, body);
  renderer.check(exercise, body);
  showBtn.style.display = 'none';
}

/**
 * Fill all inputs with correct answers.
 */
function fillAnswers(exercise, body) {
  const inputs = body.querySelectorAll('input.exercise-input, input.table-input, input.sc-blank');
  const items = exercise.items || [];

  if (exercise.type === 'fill-in-blank' || exercise.type === 'transformation' || exercise.type === 'sentence-rewriting') {
    inputs.forEach((input, i) => {
      if (items[i]) {
        const answer = Array.isArray(items[i].answer) ? items[i].answer[0] : items[i].answer;
        input.value = answer;
      }
    });
  } else if (exercise.type === 'sentence-completion') {
    let blankIdx = 0;
    for (const item of items) {
      if (item.segments) {
        for (const seg of item.segments) {
          if (seg.blank) {
            const answer = Array.isArray(seg.answer) ? seg.answer[0] : seg.answer;
            if (inputs[blankIdx]) inputs[blankIdx].value = answer;
            blankIdx++;
          }
        }
      }
    }
  } else if (exercise.type === 'table-completion') {
    let inputIdx = 0;
    for (const row of exercise.rows) {
      for (const cell of row.cells) {
        if (cell.editable) {
          const answer = Array.isArray(cell.answer) ? cell.answer[0] : cell.answer;
          if (inputs[inputIdx]) inputs[inputIdx].value = answer;
          inputIdx++;
        }
      }
    }
  } else if (exercise.type === 'multiple-choice') {
    items.forEach((item, i) => {
      const options = body.querySelectorAll(`.mc-item[data-index="${i}"] .mc-option`);
      options.forEach(opt => {
        opt.classList.remove('selected');
        if (opt.textContent === item.answer) {
          opt.classList.add('selected');
        }
      });
    });
  } else if (exercise.type === 'matching') {
    const selects = body.querySelectorAll('.match-select');
    if (exercise.items && exercise.items.pairs) {
      exercise.items.pairs.forEach(([leftIdx, rightIdx]) => {
        if (selects[leftIdx]) {
          selects[leftIdx].value = String(rightIdx);
        }
      });
    }
  }
}
