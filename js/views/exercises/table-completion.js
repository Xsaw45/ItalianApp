import { el } from '../../utils/dom.js';
import { checkAnswer, getDisplayAnswer } from '../../utils/normalize.js';
import { getSettings } from '../../state.js';

export function renderTableCompletion(exercise, container) {
  const wrapper = el('div', { className: 'table-scroll' });
  const table = el('table', { className: 'completion-table' });

  // Headers
  if (exercise.headers) {
    const thead = el('thead');
    const tr = el('tr');
    for (const h of exercise.headers) {
      tr.appendChild(el('th', {}, h));
    }
    thead.appendChild(tr);
    table.appendChild(thead);
  }

  // Rows
  const tbody = el('tbody');
  for (const row of exercise.rows) {
    const tr = el('tr');
    for (const cell of row.cells) {
      const td = el('td');
      if (cell.editable) {
        const input = el('input', {
          type: 'text',
          className: 'table-input',
          autocomplete: 'off',
          spellcheck: 'false',
          placeholder: '...'
        });
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            const checkBtn = container.closest('.exercise-card')?.querySelector('.btn-primary');
            if (checkBtn && checkBtn.style.display !== 'none') checkBtn.click();
          }
        });
        td.appendChild(input);
      } else {
        td.textContent = cell.value || '';
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrapper.appendChild(table);
  container.appendChild(wrapper);
}

export function checkTableCompletion(exercise, container) {
  const { strictAccents } = getSettings();
  const inputs = container.querySelectorAll('.table-input');
  let score = 0;
  let total = 0;
  let inputIdx = 0;

  for (const row of exercise.rows) {
    for (const cell of row.cells) {
      if (cell.editable) {
        total++;
        const input = inputs[inputIdx];
        const td = input?.closest('td');
        if (input && td) {
          const isCorrect = checkAnswer(input.value, cell.answer, strictAccents);
          td.classList.remove('correct-cell', 'incorrect-cell');
          input.disabled = true;

          if (isCorrect) {
            score++;
            td.classList.add('correct-cell');
          } else {
            td.classList.add('incorrect-cell');
            td.title = `Risposta corretta: ${getDisplayAnswer(cell.answer)}`;
            // Show correction inline
            let corr = td.querySelector('.correction');
            if (!corr) {
              corr = el('div', { className: 'correction' }, getDisplayAnswer(cell.answer));
              td.appendChild(corr);
            }
          }
        }
        inputIdx++;
      }
    }
  }

  return { score, total };
}
