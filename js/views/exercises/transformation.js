import { el } from '../../utils/dom.js';
import { checkAnswer, getDisplayAnswer } from '../../utils/normalize.js';
import { getSettings } from '../../state.js';

export function renderTransformation(exercise, container) {
  const items = el('div', { className: 'transform-items' });

  exercise.items.forEach((item, i) => {
    const row = el('div', { className: 'transform-item' });
    row.appendChild(el('span', { className: 'transform-given' }, item.given));
    row.appendChild(el('span', { className: 'transform-arrow' }, '\u2192'));

    const wrapper = el('div', { className: 'transform-item-wrapper' });
    const input = el('input', {
      type: 'text',
      className: 'exercise-input transform-input',
      autocomplete: 'off',
      spellcheck: 'false',
      dataset: { index: String(i) },
      placeholder: '...'
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const checkBtn = container.closest('.exercise-card')?.querySelector('.btn-primary');
        if (checkBtn && checkBtn.style.display !== 'none') checkBtn.click();
      }
    });

    wrapper.appendChild(input);
    row.appendChild(wrapper);
    items.appendChild(row);
  });

  container.appendChild(items);
}

export function checkTransformation(exercise, container) {
  const { strictAccents } = getSettings();
  let score = 0;
  const total = exercise.items.length;

  exercise.items.forEach((item, i) => {
    const row = container.querySelectorAll('.transform-item')[i];
    const wrapper = row?.querySelector('.transform-item-wrapper');
    const input = wrapper?.querySelector('.exercise-input');
    if (!input) return;

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
