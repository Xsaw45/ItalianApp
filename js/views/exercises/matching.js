import { el } from '../../utils/dom.js';

export function renderMatching(exercise, container) {
  const data = exercise.items;
  const items = el('div', { className: 'match-items' });

  data.left.forEach((leftText, i) => {
    const row = el('div', { className: 'match-item' });
    row.appendChild(el('div', { className: 'match-left' }, leftText));

    const select = el('select', { className: 'match-select', dataset: { leftIndex: String(i) } });
    select.appendChild(el('option', { value: '' }, '-- Scegli --'));
    data.right.forEach((rightText, j) => {
      select.appendChild(el('option', { value: String(j) }, rightText));
    });

    row.appendChild(select);
    items.appendChild(row);
  });

  container.appendChild(items);
}

export function checkMatching(exercise, container) {
  const data = exercise.items;
  const selects = container.querySelectorAll('.match-select');
  let score = 0;
  const total = data.pairs.length;

  // Build correct mapping: leftIndex -> rightIndex
  const correctMap = {};
  for (const [leftIdx, rightIdx] of data.pairs) {
    correctMap[leftIdx] = rightIdx;
  }

  selects.forEach((select) => {
    const leftIdx = parseInt(select.dataset.leftIndex);
    const selectedRight = select.value;
    select.disabled = true;

    select.classList.remove('correct', 'incorrect');

    if (selectedRight === '') {
      select.classList.add('incorrect');
    } else if (parseInt(selectedRight) === correctMap[leftIdx]) {
      score++;
      select.classList.add('correct');
    } else {
      select.classList.add('incorrect');
      // Show correct answer
      const correctText = data.right[correctMap[leftIdx]];
      const corr = el('span', { className: 'correction' }, ` ${correctText}`);
      select.parentNode.appendChild(corr);
    }
  });

  return { score, total };
}
