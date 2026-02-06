import { el } from '../../utils/dom.js';
import { checkAnswer } from '../../utils/normalize.js';
import { getSettings } from '../../state.js';

export function renderMultipleChoice(exercise, container) {
  const items = el('div', { className: 'mc-items' });

  exercise.items.forEach((item, i) => {
    const row = el('div', { className: 'mc-item', dataset: { index: String(i) } });

    if (item.prompt) {
      row.appendChild(el('span', { className: 'mc-prompt' }, item.prompt));
    }

    const options = el('div', { className: 'mc-options' });

    for (const option of item.options) {
      const btn = el('button', {
        className: 'mc-option',
        onClick: () => {
          // Deselect siblings
          options.querySelectorAll('.mc-option').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
        }
      }, option);
      options.appendChild(btn);
    }

    row.appendChild(options);
    items.appendChild(row);
  });

  container.appendChild(items);
}

export function checkMultipleChoice(exercise, container) {
  const { strictAccents } = getSettings();
  let score = 0;
  const total = exercise.items.length;

  exercise.items.forEach((item, i) => {
    const row = container.querySelector(`.mc-item[data-index="${i}"]`);
    if (!row) return;

    const options = row.querySelectorAll('.mc-option');
    const selected = row.querySelector('.mc-option.selected');
    const selectedText = selected ? selected.textContent : '';
    const isCorrect = checkAnswer(selectedText, item.answer, strictAccents);

    options.forEach(opt => {
      opt.disabled = true;
      opt.classList.remove('correct', 'incorrect', 'correct-answer');

      if (checkAnswer(opt.textContent, item.answer, strictAccents)) {
        if (isCorrect && opt === selected) {
          opt.classList.add('correct');
        } else if (!isCorrect) {
          opt.classList.add('correct-answer');
        }
      }

      if (opt === selected && !isCorrect) {
        opt.classList.add('incorrect');
      }
    });

    if (isCorrect) score++;
  });

  return { score, total };
}
