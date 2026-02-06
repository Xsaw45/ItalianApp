import { el } from '../../utils/dom.js';
import { markOpenEndedDone } from '../../state.js';

export function renderOpenEnded(exercise, container) {
  const textarea = el('textarea', {
    className: 'oe-textarea',
    placeholder: 'Scrivi la tua risposta qui...',
    rows: '5'
  });
  container.appendChild(textarea);

  const actions = el('div', { className: 'exercise-actions' });

  // "Ho finito" button
  const doneBtn = el('button', {
    className: 'btn btn-secondary',
    onClick: () => {
      doneBtn.textContent = 'Completato!';
      doneBtn.disabled = true;
      const schedaId = container.closest('.exercise-card')?.closest('[data-scheda-id]')?.dataset.schedaId;
      if (schedaId) {
        markOpenEndedDone(schedaId, exercise.id);
      }
    }
  }, 'Ho finito');

  // Show suggested answer
  if (exercise.suggestedAnswer) {
    const showBtn = el('button', {
      className: 'btn btn-ghost',
      onClick: () => {
        let sugBox = container.querySelector('.oe-suggested');
        if (!sugBox) {
          sugBox = el('div', { className: 'oe-suggested' },
            el('span', { className: 'oe-suggested-label' }, 'Esempio di risposta:'),
            exercise.suggestedAnswer
          );
          container.appendChild(sugBox);
        }
        showBtn.style.display = 'none';
      }
    }, 'Mostra esempio');
    actions.appendChild(doneBtn);
    actions.appendChild(showBtn);
  } else {
    actions.appendChild(doneBtn);
  }

  container.appendChild(actions);
}
