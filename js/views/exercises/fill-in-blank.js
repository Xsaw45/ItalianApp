import { el } from '../../utils/dom.js';
import { checkAnswer, getDisplayAnswer } from '../../utils/normalize.js';
import { getSettings } from '../../state.js';

export function renderFillInBlank(exercise, container) {
  const items = el('div', { className: 'fib-items' });

  exercise.items.forEach((item, i) => {
    const wrapper = el('div', { className: 'fib-item-wrapper' });
    const row = el('div', { className: 'fib-item' });

    if (item.before) {
      row.appendChild(el('span', { className: 'fib-word' }, item.before));
    }

    const input = el('input', {
      type: 'text',
      className: 'exercise-input fib-input',
      autocomplete: 'off',
      spellcheck: 'false',
      autocapitalize: 'off',
      dataset: { index: String(i) },
      placeholder: '...'
    });

    // Enter key triggers check
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const checkBtn = container.closest('.exercise-card')?.querySelector('.btn-primary');
        if (checkBtn && checkBtn.style.display !== 'none') checkBtn.click();
      }
    });

    row.appendChild(input);

    if (item.after) {
      row.appendChild(el('span', { className: 'fib-word' }, item.after));
    }

    wrapper.appendChild(row);
    items.appendChild(wrapper);
  });

  container.appendChild(items);
}

export function checkFillInBlank(exercise, container) {
  const { strictAccents } = getSettings();
  let score = 0;
  const total = exercise.items.length;

  exercise.items.forEach((item, i) => {
    const wrapper = container.querySelectorAll('.fib-item-wrapper')[i];
    const input = wrapper?.querySelector('.exercise-input');
    if (!input) return;

    // Remove old corrections
    const oldCorr = wrapper.querySelector('.correction');
    if (oldCorr) oldCorr.remove();

    const isCorrect = checkAnswer(input.value, item.answer, strictAccents);
    input.classList.remove('correct', 'incorrect', 'animate-correct', 'animate-incorrect');
    input.disabled = true;

    if (isCorrect) {
      score++;
      input.classList.add('correct', 'animate-correct');
    } else {
      input.classList.add('incorrect', 'animate-incorrect');
      wrapper.appendChild(el('div', { className: 'correction' }, getDisplayAnswer(item.answer)));
    }
  });

  return { score, total };
}
