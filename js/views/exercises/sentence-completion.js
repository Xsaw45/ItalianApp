import { el } from '../../utils/dom.js';
import { checkAnswer, getDisplayAnswer } from '../../utils/normalize.js';
import { getSettings } from '../../state.js';

export function renderSentenceCompletion(exercise, container) {
  exercise.items.forEach((item, itemIdx) => {
    const line = el('div', { className: 'sc-item' });
    line.appendChild(el('span', { className: 'sc-number' }, `${itemIdx + 1}.`));

    if (item.segments) {
      for (const seg of item.segments) {
        if (seg.blank) {
          const input = el('input', {
            type: 'text',
            className: 'exercise-input sc-blank',
            autocomplete: 'off',
            spellcheck: 'false',
            autocapitalize: 'off',
            placeholder: '...'
          });
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              const checkBtn = container.closest('.exercise-card')?.querySelector('.btn-primary');
              if (checkBtn && checkBtn.style.display !== 'none') checkBtn.click();
            }
          });
          line.appendChild(input);
        } else {
          line.appendChild(el('span', {}, seg.text));
        }
      }
    }

    container.appendChild(line);
  });
}

export function checkSentenceCompletion(exercise, container) {
  const { strictAccents } = getSettings();
  const inputs = container.querySelectorAll('.sc-blank');
  let score = 0;
  let total = 0;
  let inputIdx = 0;

  for (const item of exercise.items) {
    if (!item.segments) continue;
    for (const seg of item.segments) {
      if (seg.blank) {
        total++;
        const input = inputs[inputIdx];
        if (input) {
          // Remove old correction
          const nextSib = input.nextElementSibling;
          if (nextSib && nextSib.classList.contains('correction')) {
            nextSib.remove();
          }

          const isCorrect = checkAnswer(input.value, seg.answer, strictAccents);
          input.classList.remove('correct', 'incorrect', 'animate-correct', 'animate-incorrect');
          input.disabled = true;

          if (isCorrect) {
            score++;
            input.classList.add('correct', 'animate-correct');
          } else {
            input.classList.add('incorrect', 'animate-incorrect');
            const corr = el('span', { className: 'correction' }, ` ${getDisplayAnswer(seg.answer)}`);
            input.parentNode.insertBefore(corr, input.nextSibling);
          }
        }
        inputIdx++;
      }
    }
  }

  return { score, total };
}
