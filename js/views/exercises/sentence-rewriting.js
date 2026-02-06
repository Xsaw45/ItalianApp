import { el } from '../../utils/dom.js';
import { checkAnswer, getDisplayAnswer } from '../../utils/normalize.js';
import { getSettings } from '../../state.js';

export function renderSentenceRewriting(exercise, container) {
  const items = el('div', { className: 'sr-items' });

  exercise.items.forEach((item, i) => {
    const block = el('div', { className: 'sr-item' });
    block.appendChild(el('div', { className: 'sr-given' }, item.given));

    if (item.hint) {
      block.appendChild(el('div', { className: 'sr-hint' }, item.hint));
    }

    const wrapper = el('div', { className: 'sr-item-wrapper' });
    const input = el('input', {
      type: 'text',
      className: 'exercise-input sr-input',
      autocomplete: 'off',
      spellcheck: 'false',
      dataset: { index: String(i) },
      placeholder: 'Riscrivi la frase...'
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const checkBtn = container.closest('.exercise-card')?.querySelector('.btn-primary');
        if (checkBtn && checkBtn.style.display !== 'none') checkBtn.click();
      }
    });

    wrapper.appendChild(input);
    block.appendChild(wrapper);
    items.appendChild(block);
  });

  container.appendChild(items);
}

export function checkSentenceRewriting(exercise, container) {
  const { strictAccents } = getSettings();
  let score = 0;
  const total = exercise.items.length;

  exercise.items.forEach((item, i) => {
    const block = container.querySelectorAll('.sr-item')[i];
    const wrapper = block?.querySelector('.sr-item-wrapper');
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
